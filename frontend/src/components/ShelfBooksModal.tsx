import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Animated,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Book, ShelfItem } from '../types';
import { searchBooksBySimilarity } from '../services/searchService';

interface ShelfBooksModalProps {
  visible: boolean;
  shelf: ShelfItem | null;
  books: Book[];
  onClose: () => void;
  onSelectBook: (book: Book) => void;
}

// Clean SVG Book Vector Icon with dynamic color fill (Zero Emojis)
const BookVectorIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 7h8M8 11h6"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

export const ShelfBooksModal: React.FC<ShelfBooksModalProps> = ({
  visible,
  shelf,
  books,
  onClose,
  onSelectBook
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Palette for colored book icons based on book title/hash
  const iconColors = ['#0284c7', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#ea580c', '#0d9488'];

  // Similarity Search - word order is completely obsolete
  const filteredBooks = useMemo(() => {
    return searchBooksBySimilarity(books, searchQuery, 0.28);
  }, [books, searchQuery]);

  if (!shelf) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        {/* Backdrop tap to close */}
        <Pressable
          onPress={onClose}
          className="flex-1"
        />

        {/* 90% Screen Filling Bottom Sheet */}
        <View className="h-[90%] bg-slate-100 rounded-t-3xl border-t border-slate-300 shadow-2xl p-5 pb-8 flex-col justify-between">
          {/* Sheet Header Handle & Title */}
          <View>
            <View className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
            <View className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-3">
              <View className="flex-row items-center justify-between pb-2 border-b border-slate-100">
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center">
                    <View
                      className="w-2.5 h-2.5 rounded-full mr-2"
                      style={{ backgroundColor: shelf.color || '#0284c7' }}
                    />
                    <Text className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                      {shelf.aisle || shelf.category}
                    </Text>
                  </View>
                  <Text className="text-lg font-black text-slate-900 mt-0.5" numberOfLines={1}>
                    {shelf.title}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Shelf ID: {shelf.shelfId} • {books.length} Books Registered
                  </Text>
                </View>

                <Pressable
                  onPress={onClose}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 active:bg-slate-200"
                >
                  <Text className="text-xs font-bold text-slate-700">Close</Text>
                </Pressable>
              </View>

              {/* Similarity Search Input */}
              <View className="mt-3">
                <TextInput
                  placeholder="Search books by title, author, or keyword..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="bg-slate-50 border border-slate-300 text-slate-900 px-4 py-2.5 rounded-xl text-sm"
                />
                {searchQuery.trim().length > 0 && (
                  <Text className="text-[10px] text-slate-500 mt-1.5 ml-1">
                    Showing {filteredBooks.length} similarity match{filteredBooks.length === 1 ? '' : 'es'} (word order independent)
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Traditional List View with One Book Per Row */}
          <FlatList
            data={filteredBooks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 2 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => {
              const isAvailable = item.status === 'on_shelf';
              const iconColor = iconColors[index % iconColors.length];

              return (
                <Pressable
                  onPress={() => onSelectBook(item)}
                  className={`py-3 px-3.5 mb-2.5 border rounded-xl flex-row items-center justify-between shadow-xs ${
                    isAvailable
                      ? 'bg-white border-slate-200 active:bg-slate-50'
                      : 'bg-slate-100/90 border-slate-300 opacity-60'
                  }`}
                >
                  {/* Left: Colored Book Icon */}
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center mr-3 shadow-xs ${
                      isAvailable
                        ? 'bg-slate-50 border border-slate-200'
                        : 'bg-slate-200 border border-slate-300'
                    }`}
                  >
                    <BookVectorIcon color={isAvailable ? iconColor : '#94a3b8'} />
                  </View>

                  {/* Adjacent: Title & Category Hierarchy */}
                  <View className="flex-1 mr-3">
                    <Text
                      numberOfLines={1}
                      className={`text-sm font-bold leading-5 ${
                        isAvailable ? 'text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {item.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="text-xs text-slate-500 mt-0.5"
                    >
                      {item.category} • Row {item.row} • by {item.author}
                    </Text>
                    {!isAvailable && item.unavailableUntil && (
                      <Text className="text-[11px] font-semibold text-rose-600 mt-0.5">
                        Unavailable until {item.unavailableUntil}
                      </Text>
                    )}
                  </View>

                  {/* Far Right: Availability Dot */}
                  <View className="items-end pl-1">
                    <View className="flex-row items-center">
                      <View
                        className={`w-2.5 h-2.5 rounded-full mr-1.5 ${
                          isAvailable ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <Text
                        className={`text-[11px] font-bold ${
                          isAvailable ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {isAvailable ? 'Available' : 'Unavailable'}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {!isAvailable && item.unavailableUntil
                        ? `Due ${item.unavailableUntil.split(',')[0]}`
                        : item.id}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="py-12 items-center">
                <Text className="text-sm font-bold text-slate-600">No books found matching query</Text>
                <Text className="text-xs text-slate-500 mt-1">Try another search term or clear filters</Text>
              </View>
            }
          />

          {/* Footer Status Bar */}
          <View className="pt-2 border-t border-slate-200 flex-row items-center justify-between">
            <Text className="text-[11px] text-slate-500">
              Tap any book to view copy details or scan QR in-library to checkout
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
