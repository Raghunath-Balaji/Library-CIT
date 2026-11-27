import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface BookReviewModalProps {
  visible: boolean;
  bookTitle: string;
  initialRating: number;
  initialComment?: string;
  isSubmitting?: boolean;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
}

const StarIcon: React.FC<{ filled: boolean; size?: number }> = ({ filled, size = 24 }) => (
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

const PaperPlaneIcon: React.FC<{ color?: string }> = ({ color = '#ffffff' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
      stroke={color}
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const BookReviewModal: React.FC<BookReviewModalProps> = ({
  visible,
  bookTitle,
  initialRating,
  initialComment = '',
  isSubmitting = false,
  onSubmit,
  onClose
}) => {
  const [rating, setRating] = useState(initialRating || 5);
  const [comment, setComment] = useState(initialComment);

  useEffect(() => {
    if (visible) {
      setRating(initialRating || 5);
      setComment(initialComment || '');
    }
  }, [visible, initialRating, initialComment]);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Pressable
          onPress={onClose}
          style={
            Platform.OS === 'web'
              ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any)
              : undefined
          }
          className="flex-1 bg-slate-900/50 items-center justify-center px-5"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-lg p-5 shadow-2xl"
          >
            <Text className="text-sm font-black text-slate-900 mb-3" numberOfLines={2}>
              {bookTitle}
            </Text>

            {/* Star Rating Row + "X out of 5 stars" */}
            <View className="flex-row items-center mb-4">
              <View className="flex-row items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    hitSlop={6}
                    className="mr-1.5"
                  >
                    <StarIcon filled={star <= rating} size={22} />
                  </Pressable>
                ))}
              </View>
              <Text className="text-xs font-bold text-slate-600 ml-2.5">
                {rating} out of 5 stars
              </Text>
            </View>

            {/* Squared Review Text Box + Paper Plane Send Button at Bottom-Right */}
            <View className="flex-row items-end">
              <TextInput
                placeholder="Write a short review..."
                placeholderTextColor="#94a3b8"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="flex-1 bg-slate-100 rounded-md px-3.5 py-2.5 text-sm text-slate-900 min-h-[88px]"
              />

              <Pressable
                onPress={() => onSubmit(rating, comment)}
                disabled={isSubmitting}
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                className="ml-2.5 w-11 h-11 rounded-md bg-sky-600 items-center justify-center"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <PaperPlaneIcon color="#ffffff" />
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
