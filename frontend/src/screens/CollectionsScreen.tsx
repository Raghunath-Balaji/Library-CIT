import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { LendingService } from '../services/lendingService';
import { LibraryApiService } from '../services/api';
import { AuthService } from '../services/authService';
import { Book, StudentLoan, ActiveRequest, UserProfile } from '../types';
import {
  CollectionBookCardModal,
  PastelBookCoverIcon,
  getPastelBookTheme
} from '../components/CollectionBookCardModal';
import { BookReviewModal } from '../components/BookReviewModal';
import {
  formatShortSlashDate,
  getLoanTimingInfo,
  parseLibraryDate
} from '../utils/dateUtils';

interface CollectionsScreenProps {
  onBack?: () => void;
}

interface TimelineCheckpoint {
  key: string;
  kind: 'borrow' | 'return';
  isReturned: boolean;
  dateStr: string;
  timestamp: number;
  loan: StudentLoan;
}

// Small 5-star vector icon for timeline rating
const TimelineStarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'}>
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke={filled ? '#f59e0b' : '#cbd5e1'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// iPhone-style chevron only (<, no line shaft)
const ChevronLeftIcon: React.FC<{ color?: string }> = ({ color = '#0f172a' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TickMarkIcon: React.FC<{ color?: string }> = ({ color = '#ffffff' }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 13l4 4L19 7"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

function truncateTo25(text: string): string {
  const clean = text.trim();
  if (clean.length <= 25) return clean;
  return `${clean.slice(0, 22)}...`;
}

export const CollectionsScreen: React.FC<CollectionsScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<UserProfile | null>(() => AuthService.getCurrentUser());
  const [activeLoans, setActiveLoans] = useState<StudentLoan[]>([]);
  const [pendingReturns, setPendingReturns] = useState<StudentLoan[]>([]);
  const [pendingBorrows, setPendingBorrows] = useState<ActiveRequest[]>([]);
  const [history, setHistory] = useState<StudentLoan[]>([]);
  const [booksById, setBooksById] = useState<Record<string, Book>>({});
  const [busyLoanId, setBusyLoanId] = useState<string | null>(null);

  // Selected book card modal state
  const [selectedLoan, setSelectedLoan] = useState<StudentLoan | null>(null);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);

  // Star review pop-up island state
  const [reviewTarget, setReviewTarget] = useState<{
    bookId: string;
    bookTitle: string;
    rating: number;
    existingComment: string;
  } | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 16);

  const loadData = useCallback(async (studentId?: string) => {
    const activeStudentId = studentId || AuthService.getCurrentUser()?.studentId;
    const [loans, pendRet, pendBor, hist, allBooks] = await Promise.all([
      LendingService.getUserActiveLoans(activeStudentId),
      LendingService.getUserPendingReturns(activeStudentId),
      LendingService.getUserPendingBorrowRequests(activeStudentId),
      LendingService.getUserBorrowingHistory(activeStudentId),
      LibraryApiService.getBooks()
    ]);

    const map: Record<string, Book> = {};
    for (const b of allBooks) {
      map[b.id] = b;
    }

    setActiveLoans(loans);
    setPendingReturns(pendRet);
    setPendingBorrows(pendBor);
    setHistory(hist);
    setBooksById(map);
  }, []);

  useEffect(() => {
    loadData(user?.studentId);
    const unsubLending = LendingService.subscribe(() => loadData());
    const unsubBooks = LibraryApiService.subscribeToBooks(() => loadData());
    const unsubAuth = AuthService.subscribe((updatedUser) => {
      setUser(updatedUser);
      loadData(updatedUser?.studentId);
    });
    return () => {
      unsubLending();
      unsubBooks();
      unsubAuth();
    };
  }, [loadData, user?.studentId]);

  const handleReturnBook = async (loanId: string) => {
    if (busyLoanId) return;
    setBusyLoanId(loanId);
    try {
      await LendingService.submitReturnRequest(loanId);
      setSelectedLoan((prev) =>
        prev && prev.loanId === loanId ? { ...prev, status: 'return_pending' } : prev
      );
    } finally {
      setBusyLoanId(null);
    }
  };

  // All currently owned books (active + awaiting desk return check)
  const currentOwnedLoans = useMemo(
    () => [...activeLoans, ...pendingReturns],
    [activeLoans, pendingReturns]
  );

  // Unified chronological timeline: one entry per loan (reading vs returned)
  const timelineCheckpoints = useMemo(() => {
    const allLoans = [...activeLoans, ...pendingReturns, ...history];
    const events: TimelineCheckpoint[] = allLoans.map((loan) => {
      const isReturned = loan.status === 'returned';
      const issueDateObj = parseLibraryDate(loan.issueDate);
      return {
        key: loan.loanId,
        kind: isReturned ? 'return' : 'borrow',
        isReturned,
        dateStr: loan.issueDate,
        timestamp: issueDateObj.getTime(),
        loan
      };
    });

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }, [activeLoans, pendingReturns, history]);

  const handleOpenStarReview = (loan: StudentLoan, chosenStar: number) => {
    const currentSid = user?.studentId || 'STU-9921';
    const existingRev = booksById[loan.bookId]?.ratings?.find(
      (r) => r.studentId === currentSid
    );
    setReviewTarget({
      bookId: loan.bookId,
      bookTitle: loan.bookTitle,
      rating: chosenStar,
      existingComment: existingRev?.comment || ''
    });
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!reviewTarget) return;
    setIsSubmittingReview(true);
    try {
      const currentSid = user?.studentId || 'STU-9921';
      const currentName = user?.name || 'Student';
      const updated = await LibraryApiService.addOrUpdateBookReview(reviewTarget.bookId, {
        studentId: currentSid,
        studentName: currentName,
        rating,
        comment
      });
      setBooksById((prev) => ({ ...prev, [updated.id]: updated }));
      setReviewTarget(null);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <View className="flex-1 bg-appBg">
      <ScrollView
        className="flex-1 bg-appBg"
        contentContainerStyle={{
          paddingTop: safeTopPadding + 8,
          paddingHorizontal: 10,
          paddingBottom: 130
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Clean Ribbon-Free Header: Translucent Round iPhone '<' Button + "Your Collections" */}
        <View className="flex-row items-center px-2.5 mb-6">
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
            className="w-9 h-9 rounded-full bg-slate-400/25 items-center justify-center mr-3"
          >
            <ChevronLeftIcon color="#0f172a" />
          </Pressable>
          <Text className="text-xl font-black text-slate-900 tracking-tight">
            Your Collections
          </Text>
        </View>

        {/* ================================================================= */}
        {/* SECTION 1 (TOP): CURRENT COLLECTIONS - 3-COLUMN HOMESCREEN GRID   */}
        {/* ================================================================= */}
        {currentOwnedLoans.length === 0 && pendingBorrows.length === 0 ? (
          <View className="mx-2.5 rounded-lg p-5 mb-7 bg-white">
            <Text className="text-sm font-bold text-slate-800 mb-4">
              No books borrowed
            </Text>

            {[
              'Check for book availability through the virtual librarian',
              'Go to the library',
              'Scan the QR code'
            ].map((stepText, sIdx, arr) => {
              const isLastStep = sIdx === arr.length - 1;
              return (
                <View key={stepText} className="flex-row">
                  <View className="w-6 items-center">
                    <View className="w-5 h-5 rounded-full bg-sky-100 items-center justify-center">
                      <Text className="text-[11px] font-bold text-sky-700">{sIdx + 1}</Text>
                    </View>
                    {!isLastStep && <View className="w-[1.5px] h-5 bg-slate-200 my-1" />}
                  </View>
                  <Text className="flex-1 ml-3 text-xs font-medium text-slate-600 leading-5">
                    {stepText}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="flex-row flex-wrap mb-6">
            {currentOwnedLoans.map((loan, index) => {
              const theme = getPastelBookTheme(index);
              const timing = getLoanTimingInfo(loan.issueDate, loan.dueDate);

              return (
                <Pressable
                  key={loan.loanId}
                  onPress={() => {
                    setSelectedThemeIndex(index);
                    setSelectedLoan(loan);
                  }}
                  style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}
                  className="w-[33.333%] items-center mb-6 px-1"
                >
                  <PastelBookCoverIcon
                    title={loan.bookTitle}
                    theme={theme}
                    size="lg"
                    daysRemaining={timing.daysRemaining}
                    daysLate={timing.daysLate}
                    showBadge={true}
                  />

                  <Text
                    numberOfLines={2}
                    className="text-xs font-bold text-slate-800 text-center mt-2.5 leading-4"
                  >
                    {truncateTo25(loan.bookTitle)}
                  </Text>

                  {loan.status === 'return_pending' && (
                    <Text className="text-[10px] font-semibold text-amber-700 mt-0.5">
                      Return Pending
                    </Text>
                  )}
                </Pressable>
              );
            })}

            {/* Pending Borrow Requests: Grey Translucent Book with Timer Icon */}
            {pendingBorrows.map((req, pIdx) => (
              <View key={req.id} className="w-[33.333%] items-center mb-6 px-1">
                <PastelBookCoverIcon
                  title={req.bookTitle}
                  theme={getPastelBookTheme(pIdx)}
                  size="lg"
                  isPending={true}
                />

                <Text
                  numberOfLines={2}
                  className="text-xs font-medium text-slate-400/80 text-center mt-2.5 leading-4"
                >
                  {truncateTo25(req.bookTitle)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ================================================================= */}
        {/* SECTION 2 (BOTTOM): BORROWING TIMELINE (NO WHITE BOX)             */}
        {/* ================================================================= */}
        <View className="pt-2 px-2.5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              History
            </Text>
          </View>

          {timelineCheckpoints.length === 0 ? (
            <View className="py-6 items-center">
              <Text className="text-xs text-slate-400">No borrowing activity recorded yet</Text>
            </View>
          ) : (
            <View className="px-1">
              {timelineCheckpoints.map((cp, idx) => {
                const isLast = idx === timelineCheckpoints.length - 1;
                const currentSid = user?.studentId || 'STU-9921';
                const userReview = booksById[cp.loan.bookId]?.ratings?.find(
                  (r) => r.studentId === currentSid
                );
                const userRating = userReview?.rating || 0;
                const endDateStr = cp.isReturned
                  ? cp.loan.returnedDate || cp.loan.dueDate
                  : cp.loan.dueDate;

                return (
                  <View key={cp.key} className="flex-row">
                    {/* Left Vertical Line & Checkpoint Node (Yellow Dot = Reading, Grey + Green Tick = Returned) */}
                    <View className="w-8 items-center">
                      <View
                        className={`w-0.5 h-2 ${idx === 0 ? 'bg-transparent' : 'bg-slate-300'}`}
                      />

                      {!cp.isReturned ? (
                        <View className="w-6 h-6 rounded-full bg-amber-100 border-2 border-amber-400 items-center justify-center">
                          <View className="w-3 h-3 rounded-full bg-amber-400" />
                        </View>
                      ) : (
                        <View className="w-6 h-6 rounded-full bg-slate-200 items-center justify-center">
                          <TickMarkIcon color="#16a34a" />
                        </View>
                      )}

                      {!isLast && <View className="w-0.5 flex-1 bg-slate-300 min-h-[28px]" />}
                    </View>

                    {/* Right Content: 3 Rows on Left + 5 Clickable Stars on Right */}
                    <View
                      className={`flex-1 ml-3 flex-row items-center justify-between ${
                        isLast ? 'pb-1' : 'pb-5'
                      }`}
                    >
                      <View className="flex-1 pr-2">
                        <Text
                          numberOfLines={1}
                          className={`text-sm font-bold ${
                            cp.isReturned ? 'text-emerald-800/80' : 'text-slate-900'
                          }`}
                        >
                          {cp.loan.bookTitle}
                        </Text>
                        <Text numberOfLines={1} className="text-[11px] text-slate-500 mt-0.5">
                          {cp.loan.bookAuthor} • {cp.loan.bookId}
                        </Text>
                        <Text className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {formatShortSlashDate(cp.loan.issueDate)} to{' '}
                          {formatShortSlashDate(endDateStr)}
                        </Text>
                      </View>

                      {/* 5 Clickable Stars */}
                      <View className="flex-row items-center pl-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Pressable
                            key={star}
                            onPress={() => handleOpenStarReview(cp.loan, star)}
                            hitSlop={4}
                            className="p-0.5"
                          >
                            <TimelineStarIcon filled={star <= userRating} />
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Centered Floating Island Detail Modal */}
      <CollectionBookCardModal
        visible={!!selectedLoan}
        loan={selectedLoan}
        theme={getPastelBookTheme(selectedThemeIndex)}
        description={selectedLoan ? booksById[selectedLoan.bookId]?.description : undefined}
        isBusy={busyLoanId === selectedLoan?.loanId}
        onReturnBook={handleReturnBook}
        onClose={() => setSelectedLoan(null)}
      />

      <BookReviewModal
        visible={!!reviewTarget}
        bookTitle={reviewTarget?.bookTitle || ''}
        initialRating={reviewTarget?.rating || 5}
        initialComment={reviewTarget?.existingComment || ''}
        isSubmitting={isSubmittingReview}
        onSubmit={handleSubmitReview}
        onClose={() => setReviewTarget(null)}
      />
    </View>
  );
};
