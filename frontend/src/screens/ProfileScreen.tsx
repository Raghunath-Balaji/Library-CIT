import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, ClipPath, Rect } from 'react-native-svg';
import { AuthService } from '../services/authService';
import { LendingService } from '../services/lendingService';
import { LibraryApiService } from '../services/api';
import { ReadLaterService } from '../services/readLaterService';
import { Book, BookReview, UserProfile } from '../types';
import { BookDetailModal } from '../components/BookDetailModal';
import { formatShortSlashDate } from '../utils/dateUtils';

interface ProfileScreenProps {
  onBack?: () => void;
  onSwitchToAdmin?: () => void;
}

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

// Clean Apple-style solid silhouette avatar clipped inside a circle
const ProfileAvatar: React.FC<{ size?: number }> = ({ size = 110 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <ClipPath id="avatarCircleClip">
        <Circle cx="50" cy="50" r="50" />
      </ClipPath>
    </Defs>
    <Rect x="0" y="0" width="100" height="100" rx="50" fill="#cbd5e1" />
    <Circle cx="50" cy="36" r="17" fill="#64748b" clipPath="url(#avatarCircleClip)" />
    <Path
      d="M16 96c2-20 16-32 34-32s32 12 34 32"
      fill="#64748b"
      clipPath="url(#avatarCircleClip)"
    />
  </Svg>
);

const ChevronRightIcon: React.FC<{ color?: string }> = ({ color = '#64748b' }) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseXIcon: React.FC<{ color?: string }> = ({ color = '#ffffff' }) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BookmarkOutlineIcon: React.FC<{ color?: string }> = ({ color = '#334155' }) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HistoryClockIcon: React.FC<{ color?: string }> = ({ color = '#334155' }) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 12a9 9 0 1 0 3-6.7L3 8"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 3v5h5"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 7v5l3 2"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TermsDocIcon: React.FC<{ color?: string }> = ({ color = '#334155' }) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6M8 13h8M8 17h6"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LogoutArrowCircleIcon: React.FC<{ color?: string }> = ({ color = '#dc2626' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth={1.9} />
    <Path
      d="M8.5 12h7M12.5 9l3 3-3 3"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BookmarkFilledIcon: React.FC<{ color?: string }> = ({ color = '#0284c7' }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
    <Path
      d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const StarIcon: React.FC<{ filled: boolean; size?: number }> = ({ filled, size = 13 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'}>
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke={filled ? '#f59e0b' : '#cbd5e1'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 16);

  const [user, setUser] = useState<UserProfile | null>(() => AuthService.getCurrentUser());
  const [activeLoansCount, setActiveLoansCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [readLaterIds, setReadLaterIds] = useState<string[]>(() => ReadLaterService.getBookIds());
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const [readLaterModalVisible, setReadLaterModalVisible] = useState(false);
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  useEffect(() => {
    const syncStats = async (targetUser: UserProfile | null) => {
      const sId = targetUser?.studentId;
      const [active, hist, pendBor, pendRet] = await Promise.all([
        LendingService.getUserActiveLoans(sId),
        LendingService.getUserBorrowingHistory(sId),
        LendingService.getUserPendingBorrowRequests(sId),
        LendingService.getUserPendingReturns(sId)
      ]);
      setActiveLoansCount(active.length);
      setHistoryCount(hist.length);
      setPendingCount(pendBor.length + pendRet.length);
    };

    syncStats(AuthService.getCurrentUser());
    LibraryApiService.getBooks().then(setAllBooks).catch(() => {});

    const unsubAuth = AuthService.subscribe((updatedUser) => {
      setUser(updatedUser);
      syncStats(updatedUser);
    });
    const unsubLending = LendingService.subscribe(() => {
      syncStats(AuthService.getCurrentUser());
    });
    const unsubBooks = LibraryApiService.subscribeToBooks(setAllBooks);
    const unsubReadLater = ReadLaterService.subscribe(setReadLaterIds);

    return () => {
      unsubAuth();
      unsubLending();
      unsubBooks();
      unsubReadLater();
    };
  }, []);

  const readLaterBooks = useMemo(() => {
    const byId = new Map(allBooks.map((b) => [b.id, b]));
    return readLaterIds.map((id) => byId.get(id)).filter((b): b is Book => !!b);
  }, [allBooks, readLaterIds]);

  const userReviews = useMemo(() => {
    const sid = user?.studentId || 'STU-9921';
    const list: { book: Book; review: BookReview }[] = [];
    for (const book of allBooks) {
      for (const rev of book.ratings || []) {
        if (rev.studentId === sid) {
          list.push({ book, review: rev });
        }
      }
    }
    return list.sort(
      (a, b) => new Date(b.review.createdAt).getTime() - new Date(a.review.createdAt).getTime()
    );
  }, [allBooks, user?.studentId]);

  return (
    <View className="flex-1 bg-appBg">
      <ScrollView
        className="flex-1 bg-appBg"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: safeTopPadding + 8,
          paddingHorizontal: 20,
          paddingBottom: 130
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header: Translucent Round iPhone '<' Button + "Profile" */}
        <View className="flex-row items-center mb-8">
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
            className="w-9 h-9 rounded-full bg-slate-400/25 items-center justify-center mr-3"
          >
            <ChevronLeftIcon color="#0f172a" />
          </Pressable>
          <Text className="text-xl font-black text-slate-900 tracking-tight">
            Profile
          </Text>
        </View>

        {/* Identity Section: Large Avatar (~32% width) + Generous Gap + Heavy Name (~15 chars/line) */}
        <View className="flex-row items-center mb-9">
          <View className="mr-6">
            <ProfileAvatar size={112} />
          </View>

          <View className="flex-1">
            <Text
              style={{ fontWeight: '900' }}
              className="text-[26px] font-black text-slate-900 leading-8 tracking-tight"
              numberOfLines={2}
            >
              {user?.name || 'Guest Student'}
            </Text>
            <Text
              className="text-sm font-normal text-slate-400 mt-2"
              numberOfLines={1}
            >
              {user?.email || 'student@campus.edu'}
            </Text>
            <Text
              className="text-sm font-semibold text-slate-600 mt-1"
              numberOfLines={1}
            >
              {user?.department || 'Computer Science'} • {user?.studentId || 'STU-9921'}
            </Text>
          </View>
        </View>

        {/* Stats Row: No Rectangle Box, Large Heavy Numbers Matching Name Weight/Size */}
        <View className="py-2 flex-row items-center mb-5">
          <View className="flex-1 flex-row items-baseline justify-center">
            <Text style={{ fontWeight: '900' }} className="text-[26px] font-black text-slate-900">
              {activeLoansCount}
            </Text>
            <Text className="text-xs font-semibold text-slate-500 ml-1.5">Active</Text>
          </View>

          <View className="w-[1px] h-6 bg-slate-300/50" />

          <View className="flex-1 flex-row items-baseline justify-center">
            <Text style={{ fontWeight: '900' }} className="text-[26px] font-black text-slate-900">
              {pendingCount}
            </Text>
            <Text className="text-xs font-semibold text-slate-500 ml-1.5">Pending</Text>
          </View>

          <View className="w-[1px] h-6 bg-slate-300/50" />

          <View className="flex-1 flex-row items-baseline justify-center">
            <Text style={{ fontWeight: '900' }} className="text-[26px] font-black text-slate-900">
              {historyCount}
            </Text>
            <Text className="text-xs font-semibold text-slate-500 ml-1.5">Returned</Text>
          </View>
        </View>

        {/* Divider Line 1 (Inset, Narrower than Stats Ends) */}
        <View className="mx-5 h-[1px] bg-slate-300/60 mb-3" />

        {/* Menu Rows with Extra Horizontal Padding & Icons */}
        <View className="px-4">
          <Pressable
            onPress={() => setReadLaterModalVisible(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
            className="flex-row items-center justify-between py-3.5"
          >
            <View className="flex-row items-center">
              <BookmarkOutlineIcon color="#334155" />
              <Text className="text-sm font-bold text-slate-800 ml-3">Read Later</Text>
            </View>
            <ChevronRightIcon color="#64748b" />
          </Pressable>

          <Pressable
            onPress={() => setReviewsModalVisible(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
            className="flex-row items-center justify-between py-3.5"
          >
            <View className="flex-row items-center">
              <HistoryClockIcon color="#334155" />
              <Text className="text-sm font-bold text-slate-800 ml-3">Reviews History</Text>
            </View>
            <ChevronRightIcon color="#64748b" />
          </Pressable>
        </View>

        {/* Divider Line 2 (Exact Same Length as Divider Line 1) */}
        <View className="mx-5 h-[1px] bg-slate-300/60 my-3" />

        {/* Terms & Conditions + Log Out */}
        <View className="px-4">
          <Pressable
            onPress={() => setTermsModalVisible(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
            className="flex-row items-center justify-between py-3.5"
          >
            <View className="flex-row items-center">
              <TermsDocIcon color="#334155" />
              <Text className="text-sm font-bold text-slate-800 ml-3">
                Terms and Conditions
              </Text>
            </View>
            <ChevronRightIcon color="#64748b" />
          </Pressable>

          <Pressable
            onPress={() => AuthService.signOut()}
            style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
            className="flex-row items-center py-3.5"
          >
            <LogoutArrowCircleIcon color="#dc2626" />
            <Text className="text-sm font-bold text-rose-600 ml-3">Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Read Later Modal */}
      <Modal
        visible={readLaterModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setReadLaterModalVisible(false)}
      >
        <Pressable
          onPress={() => setReadLaterModalVisible(false)}
          className="flex-1 bg-slate-900/50 items-center justify-center px-5"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <View className="mb-3 items-start">
              <Pressable
                onPress={() => setReadLaterModalVisible(false)}
                className="w-9 h-9 rounded-full bg-slate-400/40 items-center justify-center"
              >
                <CloseXIcon color="#ffffff" />
              </Pressable>
            </View>

            <View className="bg-white rounded-xl p-5 max-h-[75%] shadow-2xl">
              <Text className="text-lg font-black text-slate-900 mb-3">
                Read Later ({readLaterBooks.length})
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {readLaterBooks.length === 0 ? (
                  <Text className="text-xs text-slate-400 py-8 text-center">
                    No books saved yet. Tap the bookmark icon on any shelf book to save it.
                  </Text>
                ) : (
                  readLaterBooks.map((book, idx) => {
                    const isAvailable = book.status === 'on_shelf';
                    return (
                      <Pressable
                        key={book.id}
                        onPress={() => {
                          setReadLaterModalVisible(false);
                          setSelectedBook(book);
                        }}
                        className={`flex-row items-center justify-between py-3 ${
                          idx > 0 ? 'border-t border-slate-100' : ''
                        } ${isAvailable ? '' : 'opacity-55'}`}
                      >
                        <View
                          className={`w-2.5 h-2.5 rounded-full mr-3 ${
                            isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <View className="flex-1 mr-3">
                          <Text
                            numberOfLines={1}
                            className={`text-sm font-bold ${
                              isAvailable ? 'text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            {book.title}
                          </Text>
                          <Text numberOfLines={1} className="text-xs text-slate-500">
                            by {book.author} • {book.category}
                          </Text>
                        </View>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            ReadLaterService.toggle(book.id);
                          }}
                          hitSlop={8}
                          className="p-1.5 mr-1"
                        >
                          <BookmarkFilledIcon color="#0284c7" />
                        </Pressable>
                        <ChevronRightIcon color="#94a3b8" />
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reviews History Modal */}
      <Modal
        visible={reviewsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setReviewsModalVisible(false)}
      >
        <Pressable
          onPress={() => setReviewsModalVisible(false)}
          className="flex-1 bg-slate-900/50 items-center justify-center px-5"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <View className="mb-3 items-start">
              <Pressable
                onPress={() => setReviewsModalVisible(false)}
                className="w-9 h-9 rounded-full bg-slate-400/40 items-center justify-center"
              >
                <CloseXIcon color="#ffffff" />
              </Pressable>
            </View>

            <View className="bg-white rounded-xl p-5 max-h-[75%] shadow-2xl">
              <Text className="text-lg font-black text-slate-900 mb-3">
                Reviews History ({userReviews.length})
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {userReviews.length === 0 ? (
                  <Text className="text-xs text-slate-400 py-8 text-center">
                    No reviews submitted yet. Rate any book from your Collections timeline.
                  </Text>
                ) : (
                  userReviews.map(({ book, review }, idx) => (
                    <Pressable
                      key={`${book.id}-${review.id}`}
                      onPress={() => {
                        setReviewsModalVisible(false);
                        setSelectedBook(book);
                      }}
                      className={`py-3 ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-bold text-slate-900 flex-1 pr-2" numberOfLines={1}>
                          {book.title}
                        </Text>
                        <Text className="text-[11px] font-mono text-slate-400">
                          {formatShortSlashDate(review.createdAt)}
                        </Text>
                      </View>
                      <View className="flex-row items-center mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <View key={star} className="mr-0.5">
                            <StarIcon filled={star <= review.rating} />
                          </View>
                        ))}
                        <Text className="text-[11px] text-slate-500 ml-1.5">
                          {review.rating}/5
                        </Text>
                      </View>
                      {review.comment ? (
                        <Text className="text-xs text-slate-600 mt-1.5 leading-4">
                          {review.comment}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Terms and Conditions Modal */}
      <Modal
        visible={termsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <Pressable
          onPress={() => setTermsModalVisible(false)}
          className="flex-1 bg-slate-900/50 items-center justify-center px-5"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <View className="mb-3 items-start">
              <Pressable
                onPress={() => setTermsModalVisible(false)}
                className="w-9 h-9 rounded-full bg-slate-400/40 items-center justify-center"
              >
                <CloseXIcon color="#ffffff" />
              </Pressable>
            </View>

            <View className="bg-white rounded-xl p-5 shadow-2xl">
              <Text className="text-lg font-black text-slate-900 mb-3">
                Terms and Conditions
              </Text>
              <Text className="text-xs text-slate-600 leading-5 mb-2">
                1. Borrowed books are issued for a standard 21-day lending window and must be returned at the circulation desk.
              </Text>
              <Text className="text-xs text-slate-600 leading-5 mb-2">
                2. QR borrow and return requests require physical verification and librarian approval before status updates finalize.
              </Text>
              <Text className="text-xs text-slate-600 leading-5">
                3. Reviews and comments submitted by students are subject to campus library moderation guidelines.
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Book Details Modal */}
      <BookDetailModal
        visible={!!selectedBook}
        book={
          selectedBook
            ? allBooks.find((b) => b.id === selectedBook.id) || selectedBook
            : null
        }
        onClose={() => setSelectedBook(null)}
      />
    </View>
  );
};
