import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { Book, ShelfItem } from '../types';

interface ShelfElevationModalProps {
  visible: boolean;
  shelf: ShelfItem | null;
  books: Book[];
  onClose: () => void;
  onViewQR: (book: Book) => void;
}

export const ShelfElevationModal: React.FC<ShelfElevationModalProps> = ({
  visible,
  shelf,
  books,
  onClose,
  onViewQR
}) => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  if (!shelf) return null;

  const rows = [1, 2, 3];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white border-t border-slate-200 rounded-t-3xl max-h-[85%] p-5 pb-8 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-200">
            <View>
              <Text className="text-xl font-bold text-slate-900">{shelf.title}</Text>
              <Text className="text-xs text-sky-700 font-semibold tracking-wider uppercase">
                {shelf.category} • Shelf ID: {shelf.shelfId}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200"
            >
              <Text className="text-slate-600 font-bold text-xs">Close</Text>
            </Pressable>
          </View>

          {/* Shelf Specs */}
          <View className="flex-row justify-between py-2.5 px-3 bg-slate-50 rounded-xl my-3 border border-slate-200">
            <Text className="text-xs text-slate-600">
              Capacity: <Text className="font-bold text-slate-900">{shelf.maxBooks || 50} books</Text>
            </Text>
            <Text className="text-xs text-slate-600">
              Placed: <Text className="font-bold text-emerald-700">{books.length} books</Text>
            </Text>
            <Text className="text-xs text-slate-600">
              Facing: <Text className="font-bold text-sky-700 uppercase">{shelf.facing || 'South'}</Text>
            </Text>
          </View>

          {/* Eye-Level Bookshelf Elevation */}
          <Text className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
            Eye-Level Shelf Elevation View
          </Text>

          <ScrollView className="space-y-4 mb-4">
            {rows.map((rowNum) => {
              const rowBooks = books.filter((b) => b.row === rowNum);
              return (
                <View key={rowNum} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xs font-semibold text-slate-600">Row {rowNum}</Text>
                    <Text className="text-xs text-slate-400">{rowBooks.length} books</Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-2">
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
                            className={`h-24 w-12 mr-2 rounded-t-md p-1 justify-between border ${
                              isSelected
                                ? 'bg-sky-50 border-sky-500'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mx-auto" />
                            <Text
                              numberOfLines={4}
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
                  <View className="h-1.5 bg-slate-300 rounded-full w-full mt-1" />
                </View>
              );
            })}
          </ScrollView>

          {/* Selected Book Detail Card */}
          {selectedBook && (
            <View className="p-3 bg-slate-50 rounded-xl border border-sky-300 mb-3">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-bold text-slate-900">{selectedBook.title}</Text>
                  <Text className="text-xs text-slate-500">Author: {selectedBook.author}</Text>
                  <Text className="text-[10px] text-sky-700 mt-1 font-mono">{selectedBook.id}</Text>
                </View>
                <Pressable
                  onPress={() => onViewQR(selectedBook)}
                  className="bg-slate-900 px-3 py-1.5 rounded-lg items-center justify-center"
                >
                  <Text className="text-xs font-bold text-white">View QR</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Footer close */}
          <Pressable
            onPress={onClose}
            className="w-full py-3 bg-slate-100 rounded-xl items-center border border-slate-200"
          >
            <Text className="text-sm font-semibold text-slate-700">Close Shelf View</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
