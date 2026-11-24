import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Book, ShelfItem } from '../types';

interface ShelfElevationViewProps {
  shelf: ShelfItem;
  books: Book[];
  onBackToMap: () => void;
  onViewQR: (book: Book) => void;
}

export const ShelfElevationView: React.FC<ShelfElevationViewProps> = ({
  shelf,
  books,
  onBackToMap,
  onViewQR
}) => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const rows = [1, 2, 3];

  const dotColor = shelf.color || '#0284c7';

  return (
    <View className="flex-1 bg-slate-100 flex-col justify-between p-4">
      {/* Top Banner / Return to Map Bar */}
      <View className="flex-row items-center justify-between pb-3 border-b border-slate-200 bg-white p-3 rounded-xl border shadow-xs mb-2">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            className="w-3 h-3 rounded-full mr-2.5"
            style={{ backgroundColor: dotColor }}
          />
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-900 tracking-tight" numberOfLines={1}>
              {shelf.title}
            </Text>
            <Text className="text-[11px] text-slate-500 font-medium">
              {shelf.aisle || shelf.category} • ID: {shelf.shelfId}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onBackToMap}
          className="px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-300 active:bg-sky-100"
        >
          <Text className="text-xs font-bold text-sky-700">3D Map</Text>
        </Pressable>
      </View>

      {/* Bookshelf Visual Slots (3 Tiers) */}
      <ScrollView className="flex-1 my-1" showsVerticalScrollIndicator={false}>
        {rows.map((rowNum) => {
          const rowBooks = books.filter((b) => b.row === rowNum);
          return (
            <View
              key={rowNum}
              className="bg-white p-3 rounded-2xl border border-slate-200 mb-3 shadow-xs"
            >
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Tier {rowNum}
                </Text>
                <Text className="text-[11px] text-slate-400 font-medium">
                  {rowBooks.length} book{rowBooks.length === 1 ? '' : 's'}
                </Text>
              </View>

              {/* Horizontal Book Spines */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row py-1.5"
              >
                {rowBooks.length === 0 ? (
                  <View className="h-20 justify-center px-4">
                    <Text className="text-xs text-slate-400 italic">Empty Shelf Space</Text>
                  </View>
                ) : (
                  rowBooks.map((b) => {
                    const isSelected = selectedBook?.id === b.id;
                    return (
                      <Pressable
                        key={b.id}
                        onPress={() => setSelectedBook(isSelected ? null : b)}
                        className={`h-22 w-14 mr-2.5 rounded-t-lg p-1.5 justify-between border ${
                          isSelected
                            ? 'bg-sky-50 border-sky-500 shadow-xs'
                            : 'bg-slate-50 border-slate-200 active:bg-slate-100'
                        }`}
                      >
                        <View
                          className="w-2 h-2 rounded-full mx-auto"
                          style={{ backgroundColor: dotColor }}
                        />
                        <Text
                          numberOfLines={3}
                          className="text-[9px] font-bold text-slate-800 text-center leading-3"
                        >
                          {b.title}
                        </Text>
                        <View className="w-full h-1 bg-amber-400 rounded-xs" />
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>

              {/* Clean Shelf Plank */}
              <View className="h-1.5 bg-slate-200 rounded-full w-full mt-1.5" />
            </View>
          );
        })}
      </ScrollView>

      {/* Selected Book Mini Card */}
      {selectedBook && (
        <View className="p-3 bg-white rounded-2xl border border-sky-300 shadow-sm mb-1">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-3">
              <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
                {selectedBook.title}
              </Text>
              <Text className="text-[11px] text-slate-500">by {selectedBook.author}</Text>
              <Text className="text-[10px] text-sky-700 font-mono mt-0.5">{selectedBook.id}</Text>
            </View>
            <Pressable
              onPress={() => onViewQR(selectedBook)}
              className="bg-slate-900 px-3 py-1.5 rounded-lg items-center justify-center active:bg-slate-800"
            >
              <Text className="text-xs font-bold text-white">View QR</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};
