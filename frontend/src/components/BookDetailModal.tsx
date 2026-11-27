import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Platform } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Book } from '../types';
import { PastelBookCoverIcon, getPastelBookTheme } from './CollectionBookCardModal';
import { QRCodeModal } from './QRCodeModal';
import { ReadLaterService } from '../services/readLaterService';

interface BookDetailModalProps {
  visible: boolean;
  book: Book | null;
  onClose: () => void;
}

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

const BookmarkIcon: React.FC<{ saved: boolean; color?: string }> = ({
  saved,
  color = '#0284c7'
}) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill={saved ? color : 'none'}>
    <Path
      d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
      stroke={saved ? color : '#64748b'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const QrMiniIcon: React.FC<{ color?: string }> = ({ color = '#0f172a' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={2} />
    <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth={2} />
    <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={2} />
    <Path
      d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM18 18h3v3h-3z"
      fill={color}
    />
  </Svg>
);

const StarIcon: React.FC<{ filled: boolean; size?: number }> = ({ filled, size = 14 }) => (
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

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  visible,
  book,
  onClose
}) => {
  const [savedIds, setSavedIds] = useState<string[]>(() => ReadLaterService.getBookIds());
  const [qrVisible, setQrVisible] = useState(false);

  useEffect(() => {
    const unsub = ReadLaterService.subscribe(setSavedIds);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!visible) setQrVisible(false);
  }, [visible]);

  if (!book) return null;

  const isSaved = savedIds.includes(book.id);
  const themeIndex = book.title.length % 3;
  const theme = getPastelBookTheme(themeIndex);
  const reviews = Array.isArray(book.ratings) ? book.ratings : [];
  const avgRating =
    typeof book.averageRating === 'number' && reviews.length > 0
      ? book.averageRating
      : reviews.length > 0
      ? Number(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        )
      : 0;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={
          Platform.OS === 'web'
            ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any)
            : undefined
        }
        className="flex-1 bg-slate-900/50 items-center justify-center px-5"
      >
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-md">
          {/* Translucent Grey X Close Circle Above Top-Left */}
          <View className="flex-row items-center justify-between mb-3">
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
              className="w-9 h-9 rounded-full bg-slate-400/40 items-center justify-center"
            >
              <CloseXIcon color="#ffffff" />
            </Pressable>

            <Pressable
              onPress={() => ReadLaterService.toggle(book.id)}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="w-9 h-9 rounded-full bg-white/90 items-center justify-center"
            >
              <BookmarkIcon saved={isSaved} color="#0284c7" />
            </Pressable>
          </View>

          {/* Main Book Details Card (Subtle Corner Rounding, Clean White Surface) */}
          <View className="bg-white rounded-xl p-5 shadow-2xl max-h-[82%]">
            {/* Top Row: First-Letter Cover + Title / Author / Category */}
            <View className="flex-row items-start">
              <PastelBookCoverIcon title={book.title} theme={theme} size="lg" />

              <View className="flex-1 ml-4 pt-0.5">
                <Text className="text-lg font-black text-slate-900 leading-6">
                  {book.title}
                </Text>
                <Text className="text-xs font-semibold text-slate-500 mt-1">
                  by {book.author}
                </Text>
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  {book.category}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text className="text-sm text-slate-600 leading-5 mt-4">
              {book.description ||
                `${book.category} volume located on Row ${book.row}.`}
            </Text>

            {/* Horizontal Divider Line */}
            <View className="h-[1px] bg-slate-200 my-4" />

            {/* Below Line: QR Icon Button + Average Rating */}
            <View className="flex-row items-center justify-between mb-3.5">
              <Pressable
                onPress={() => setQrVisible(true)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="flex-row items-center bg-slate-100 rounded-lg px-3 py-2"
              >
                <QrMiniIcon color="#0f172a" />
                <Text className="text-xs font-bold text-slate-800 ml-2">Book QR</Text>
              </Pressable>

              <View className="flex-row items-center">
                <StarIcon filled={reviews.length > 0} size={16} />
                <Text className="text-sm font-black text-slate-900 ml-1.5">
                  {reviews.length > 0 ? avgRating.toFixed(1) : 'No ratings'}
                </Text>
                {reviews.length > 0 && (
                  <Text className="text-xs text-slate-400 ml-1">
                    ({reviews.length})
                  </Text>
                )}
              </View>
            </View>

            {/* Scrollable Ratings & Reviews Box */}
            <View className="bg-slate-50 rounded-lg p-3 max-h-56">
              <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                {reviews.length === 0 ? (
                  <View className="py-6 items-center">
                    <Text className="text-xs font-semibold text-slate-500">
                      No reviews yet
                    </Text>
                    <Text className="text-[11px] text-slate-400 mt-1 text-center">
                      Borrow and rate this book from your Collections timeline.
                    </Text>
                  </View>
                ) : (
                  reviews.map((rev, idx) => (
                    <View
                      key={rev.id || `${rev.studentId}-${idx}`}
                      className={idx === 0 ? 'pb-3' : 'py-3 border-t border-slate-200/70'}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <View key={star} className="mr-0.5">
                              <StarIcon filled={star <= rev.rating} size={12} />
                            </View>
                          ))}
                        </View>
                        <Text className="text-[11px] font-semibold text-slate-500">
                          {rev.studentName} • {rev.studentId}
                        </Text>
                      </View>
                      {rev.comment ? (
                        <Text className="text-xs text-slate-700 leading-4 mt-1">
                          {rev.comment}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Pressable>
      </Pressable>

      {/* Nested QR Code Island Pop-up */}
      <QRCodeModal visible={qrVisible} book={book} onClose={() => setQrVisible(false)} />
    </Modal>
  );
};
