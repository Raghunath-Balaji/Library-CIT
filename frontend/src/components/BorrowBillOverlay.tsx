import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Modal, Animated, Easing, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ActiveRequest, Book } from '../types';
import { PastelBookCoverIcon, getPastelBookTheme } from './CollectionBookCardModal';
import { formatBillShortDate } from '../utils/dateUtils';

/**
 * Two circular arrows facing tail-to-head (camera-flip / rescan style).
 */
export const RescanCycleIcon: React.FC<{ color?: string }> = ({ color = '#0f172a' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 12a9 9 0 0 0-15.5-6.36L3 8"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 3v5h5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 12a9 9 0 0 0 15.5 6.36L21 16"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 21v-5h-5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PlusIcon: React.FC<{ color?: string }> = ({ color = '#0f172a' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5v14M5 12h14"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TickIcon: React.FC<{ color?: string; size?: number; strokeWidth?: number }> = ({
  color = '#ffffff',
  size = 11,
  strokeWidth = 3
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 13l4 4L19 7"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const RedXIcon: React.FC<{ color?: string }> = ({ color = '#ffffff' }) => (
  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface ScannedBookBottomCardProps {
  book: Book;
  errorMessage?: string | null;
  isSubmitting: boolean;
  onBorrow: () => void;
  onRescan: () => void;
}

export const ScannedBookBottomCard: React.FC<ScannedBookBottomCardProps> = ({
  book,
  errorMessage,
  isSubmitting,
  onBorrow,
  onRescan
}) => {
  const isUnavailable = book.status === 'borrowed' || book.status === 'return_pending';
  const theme = getPastelBookTheme(book.title.length % 3);

  return (
    <View
      style={{ bottom: 100 }}
      className="absolute left-4 right-4 z-40 bg-white/95 border border-slate-200 p-5 rounded-xl shadow-2xl"
    >
      {/* Top Row: Shelf & Row Location (No "Book Verified" or Copy ID badge) */}
      <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
        Shelf {book.shelfId} • Row {book.row}
      </Text>

      {/* Book Icon + Title & Author • Category (matching Collections popup style) */}
      <View className="flex-row items-start">
        <View className="mr-3.5 mt-0.5">
          <PastelBookCoverIcon title={book.title} theme={theme} size="md" />
        </View>

        <View className="flex-1">
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            className="text-lg font-black text-slate-950 leading-6"
          >
            {book.title}
          </Text>
          <Text className="text-xs font-medium text-slate-500 mt-1">
            {book.author} • {book.category}
          </Text>
        </View>
      </View>

      {errorMessage && (
        <View className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200">
          <Text className="text-xs font-semibold text-rose-700">{errorMessage}</Text>
        </View>
      )}

      {isUnavailable ? (
        <View className="mt-4 flex-row items-center">
          <View className="flex-1 py-3 px-3.5 rounded-xl bg-rose-50 border border-rose-200 mr-2.5">
            <Text className="text-xs font-bold text-rose-800">
              {book.status === 'return_pending' ? 'Return Pending at Desk' : 'Currently Unavailable'}
            </Text>
            <Text className="text-[11px] text-rose-700 mt-0.5">
              {book.status === 'return_pending'
                ? 'Awaiting physical inspection.'
                : `On loan until ${book.unavailableUntil || 'return'}.`}
            </Text>
          </View>
          <Pressable
            onPress={onRescan}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="w-12 h-12 rounded-full bg-slate-200 items-center justify-center"
          >
            <RescanCycleIcon color="#0f172a" />
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-center mt-5">
          <Pressable
            onPress={onBorrow}
            disabled={isSubmitting}
            style={({ pressed }) => [{ opacity: pressed || isSubmitting ? 0.8 : 1 }]}
            className="flex-1 py-3.5 bg-slate-900 rounded-xl items-center justify-center mr-3 shadow-xs"
          >
            <Text className="text-xs font-bold text-white uppercase tracking-wider">
              {isSubmitting ? 'Sending...' : 'Borrow'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onRescan}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="w-12 h-12 rounded-full bg-slate-200 items-center justify-center"
          >
            <RescanCycleIcon color="#0f172a" />
          </Pressable>
        </View>
      )}
    </View>
  );
};

interface PendingBorrowBottomBarProps {
  onAddMore: () => void;
  onOpenBill: () => void;
}

export const PendingBorrowBottomBar: React.FC<PendingBorrowBottomBarProps> = ({
  onAddMore,
  onOpenBill
}) => (
  <View
    style={{ bottom: 100 }}
    className="absolute left-4 right-4 z-40 bg-white/95 border border-slate-200 px-4 py-3.5 rounded-xl shadow-2xl flex-row items-center justify-between"
  >
    <Pressable onPress={onOpenBill} className="flex-1 pr-3">
      <Text className="text-xs font-semibold text-slate-800 leading-4">
        Once admin approves your request you can take your books
      </Text>
    </Pressable>

    <Pressable
      onPress={onAddMore}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      className="w-11 h-11 rounded-full bg-slate-200 items-center justify-center"
    >
      <PlusIcon color="#0f172a" />
    </Pressable>
  </View>
);

interface BulkBorrowBillModalProps {
  visible: boolean;
  requests: ActiveRequest[];
  showSuccessAnimation: boolean;
  onAddMore: () => void;
}

export const BulkBorrowBillModal: React.FC<BulkBorrowBillModalProps> = ({
  visible,
  requests,
  showSuccessAnimation,
  onAddMore
}) => {
  const billOpacity = useRef(new Animated.Value(1)).current;
  const billScale = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0.35)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showSuccessAnimation) {
      billOpacity.setValue(1);
      billScale.setValue(1);
      successScale.setValue(0.35);
      successOpacity.setValue(0);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(billOpacity, {
            toValue: 0,
            duration: 240,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true
          }),
          Animated.timing(billScale, {
            toValue: 0.9,
            duration: 240,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true
          })
        ]),
        Animated.parallel([
          Animated.spring(successScale, {
            toValue: 1,
            friction: 5,
            tension: 70,
            useNativeDriver: true
          }),
          Animated.timing(successOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true
          })
        ])
      ]).start();
    } else {
      billOpacity.setValue(1);
      billScale.setValue(1);
      successScale.setValue(0.35);
      successOpacity.setValue(0);
    }
  }, [showSuccessAnimation, billOpacity, billScale, successScale, successOpacity]);

  if (!visible || requests.length === 0) return null;

  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View
        style={
          Platform.OS === 'web'
            ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any)
            : undefined
        }
        className="flex-1 bg-slate-950/60 items-center justify-center p-6"
      >
        {showSuccessAnimation ? (
          /* Payment-App Style Pastel Green Big Bold Circle + Tick + Summary */
          <Animated.View
            style={{
              opacity: successOpacity,
              transform: [{ scale: successScale }]
            }}
            className="items-center justify-center px-6 py-8"
          >
            <View className="w-28 h-28 rounded-full bg-emerald-200 border-4 border-emerald-400 items-center justify-center shadow-xl">
              <TickIcon color="#065f46" size={52} strokeWidth={3.5} />
            </View>
            <Text className="text-sm font-bold text-white mt-5 text-center tracking-wide">
              {approvedCount} {approvedCount === 1 ? 'book' : 'books'} allowed
              {rejectedCount > 0 ? ` • ${rejectedCount} rejected` : ''}
            </Text>
          </Animated.View>
        ) : (
          /* Library Checkout Receipt Bill + Bottom Approval Bar (Both Visible Together) */
          <Animated.View
            style={{
              opacity: billOpacity,
              transform: [{ scale: billScale }]
            }}
            className="w-full flex-1 items-center justify-center relative"
          >
            <View className="w-full max-w-sm bg-white rounded-xl p-6 shadow-2xl border border-slate-200 mb-20">
              <Text className="text-sm font-black text-slate-900 text-center pb-3 border-b border-dashed border-slate-300">
                Chennai Institute of Technology - Library
              </Text>

              <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-4 mb-2">
                Books
              </Text>

              {/* Line Items with Yellow Dot / Green Tick / Red X */}
              <View className="my-1">
                {requests.map((req) => {
                  const startDate = formatBillShortDate(req.requestDate);
                  const endDate = req.dueDate
                    ? formatBillShortDate(req.dueDate)
                    : formatBillShortDate(req.requestDate, 14);

                  return (
                    <View
                      key={req.id}
                      className="flex-row items-center py-2 border-b border-slate-100"
                    >
                      <View className="mr-2.5 items-center justify-center">
                        {req.status === 'approved' ? (
                          <View className="w-4 h-4 rounded-full bg-emerald-500 items-center justify-center">
                            <TickIcon color="#ffffff" size={10} strokeWidth={3} />
                          </View>
                        ) : req.status === 'rejected' ? (
                          <View className="w-4 h-4 rounded-full bg-rose-500 items-center justify-center">
                            <RedXIcon color="#ffffff" />
                          </View>
                        ) : (
                          <View className="w-3.5 h-3.5 rounded-full bg-amber-400" />
                        )}
                      </View>

                      <Text
                        numberOfLines={1}
                        className="flex-1 text-xs font-mono font-bold text-slate-800 mr-2"
                      >
                        {req.bookTitle}
                      </Text>

                      <Text className="text-[11px] font-mono text-slate-500">
                        --- {startDate} --- {endDate}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View className="border-t border-dashed border-slate-300 mt-4 pt-3">
                <Text className="text-[11px] text-slate-500 text-center italic">
                  We hope you get most out of the book!
                </Text>
              </View>
            </View>

            {/* Bottom Pop-Up Bar visible below the Bill with round grey '+' button */}
            <View
              style={{ bottom: 76 }}
              className="absolute left-0 right-0 bg-white/95 border border-slate-200 px-4 py-3.5 rounded-xl shadow-2xl flex-row items-center justify-between"
            >
              <Text className="flex-1 pr-3 text-xs font-semibold text-slate-800 leading-4">
                Once admin approves your request you can take your books
              </Text>

              <Pressable
                onPress={onAddMore}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="w-11 h-11 rounded-full bg-slate-200 items-center justify-center"
              >
                <PlusIcon color="#0f172a" />
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};
