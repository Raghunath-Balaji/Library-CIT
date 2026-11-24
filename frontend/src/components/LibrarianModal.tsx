import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { Book, LayoutConfig, ShelfItem } from '../types';
import { searchBooksBySimilarity } from '../services/searchService';

interface LibrarianModalProps {
  visible: boolean;
  books: Book[];
  layout: LayoutConfig | null;
  onClose: () => void;
  onSelectBook: (book: Book) => void;
  onSelectShelfBay?: (shelfItem: ShelfItem) => void;
}

// Clean SVG Book Vector Icon (Zero Emojis)
const BookVectorIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
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

// Clean SVG Librarian Desk Vector Icon
const LibrarianDeskIcon: React.FC<{ color?: string }> = ({ color = '#0284c7' }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="7" r="3.5" stroke={color} strokeWidth={2} />
    <Path
      d="M6 19v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M2 19h20"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

export const LibrarianModal: React.FC<LibrarianModalProps> = ({
  visible,
  books,
  layout,
  onClose,
  onSelectBook,
  onSelectShelfBay
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'plan'>('catalog');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  const iconColors = ['#0284c7', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#ea580c', '#0d9488'];

  // All shelf items from layout
  const shelfItems = useMemo(() => {
    if (!layout) return [];
    return layout.items.filter((it): it is ShelfItem => it.type === 'shelf');
  }, [layout]);

  // Grouped shelf bays by department
  const shelvesByCategory = useMemo(() => {
    const map: { [cat: string]: ShelfItem[] } = {};
    shelfItems.forEach((sh) => {
      const cat = sh.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(sh);
    });
    return map;
  }, [shelfItems]);

  // Similarity Search across all books
  const filteredBooks = useMemo(() => {
    let dataset = books;
    if (selectedCategoryFilter) {
      dataset = dataset.filter(
        (b) => b.category.toLowerCase() === selectedCategoryFilter.toLowerCase()
      );
    }
    return searchBooksBySimilarity(dataset, searchQuery, 0.28);
  }, [books, searchQuery, selectedCategoryFilter]);

  if (!visible) return null;

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
          <View className="flex-1">
            {/* Sheet Handle */}
            <View className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3" />

            {/* Header Card */}
            <View className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-3">
              <View className="flex-row items-center justify-between pb-2 border-b border-slate-100">
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 items-center justify-center mr-3">
                    <LibrarianDeskIcon color="#0284c7" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 rounded-full bg-rose-400 mr-1.5" />
                      <Text className="text-[10px] font-bold text-rose-600 uppercase tracking-wider font-mono">
                        Consultation Desk
                      </Text>
                    </View>
                    <Text className="text-base font-black text-slate-900 mt-0.5" numberOfLines={1}>
                      Virtual Librarian
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {books.length} Books in Library • {shelfItems.length} Shelf Bays
                    </Text>
                  </View>
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
                  placeholder="Search all books by title, author, or keywords..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="bg-slate-50 border border-slate-300 text-slate-900 px-4 py-2.5 rounded-xl text-sm"
                />
                {searchQuery.trim().length > 0 && (
                  <Text className="text-[10px] text-slate-500 mt-1.5 ml-1">
                    Found {filteredBooks.length} match{filteredBooks.length === 1 ? '' : 'es'} (word order independent)
                  </Text>
                )}
              </View>

              {/* Sub-Tabs: Global Catalog vs Shelf Plan Directory */}
              <View className="flex-row mt-3 pt-2.5 border-t border-slate-100">
                <Pressable
                  onPress={() => setActiveTab('catalog')}
                  className={`py-1 px-3 rounded-lg mr-2 border ${
                    activeTab === 'catalog'
                      ? 'bg-slate-900 border-slate-900'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'catalog' ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    All Books ({filteredBooks.length})
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab('plan')}
                  className={`py-1 px-3 rounded-lg border ${
                    activeTab === 'plan'
                      ? 'bg-slate-900 border-slate-900'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'plan' ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    Campus Shelf Plan ({shelfItems.length} Bays)
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* TAB CONTENT */}
            {activeTab === 'catalog' ? (
              /* Global Book Catalog List with Greyed-Out Unavailable States */
              <FlatList
                data={filteredBooks}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingVertical: 2, paddingBottom: 16 }}
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
                          {item.category} • Shelf {item.shelfId} (Row {item.row}) • by {item.author}
                        </Text>
                        {!isAvailable && item.unavailableUntil && (
                          <Text className="text-[11px] font-semibold text-rose-600 mt-0.5">
                            Unavailable until {item.unavailableUntil}
                          </Text>
                        )}
                      </View>

                      {/* Far Right: Availability Dot & Date */}
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
                    <Text className="text-xs text-slate-500 mt-1">Try another keyword or explore the shelf plan</Text>
                  </View>
                }
              />
            ) : (
              /* Campus Shelf Plan Directory */
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {Object.keys(shelvesByCategory).map((catName) => {
                  const bays = shelvesByCategory[catName];
                  const catColor = bays[0]?.color || '#0284c7';

                  return (
                    <View key={catName} className="mb-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                      <View className="flex-row items-center justify-between pb-2 mb-2 border-b border-slate-100">
                        <View className="flex-row items-center">
                          <View
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: catColor }}
                          />
                          <Text className="text-sm font-bold text-slate-900">{catName}</Text>
                        </View>
                        <Text className="text-xs font-mono text-slate-500 font-bold">
                          {bays.length} Bay{bays.length === 1 ? '' : 's'}
                        </Text>
                      </View>

                      <View className="flex-row flex-wrap">
                        {bays.map((bay) => {
                          const bayBooks = books.filter((b) => b.shelfId === bay.shelfId);
                          const availableCount = bayBooks.filter((b) => b.status === 'on_shelf').length;

                          return (
                            <Pressable
                              key={bay.id}
                              onPress={() => {
                                if (onSelectShelfBay) {
                                  onSelectShelfBay(bay);
                                }
                                setSelectedCategoryFilter(bay.category || null);
                                setSearchQuery(bay.shelfId || '');
                                setActiveTab('catalog');
                              }}
                              className="w-[48%] bg-slate-50 border border-slate-200 p-3 rounded-xl mr-2 mb-2 active:bg-slate-100"
                            >
                              <View className="flex-row items-center justify-between">
                                <Text className="text-xs font-mono font-bold text-slate-800">
                                  {bay.shelfId}
                                </Text>
                                <Text className="text-[10px] text-emerald-700 font-bold">
                                  {availableCount}/{bayBooks.length}
                                </Text>
                              </View>
                              <Text className="text-xs text-slate-600 mt-1 font-semibold" numberOfLines={1}>
                                {bay.title}
                              </Text>
                              <Text className="text-[10px] text-slate-400 mt-0.5">
                                {bay.aisle || 'Main Bay'}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Footer Bar */}
          <View className="pt-2 border-t border-slate-200 flex-row items-center justify-between">
            <Text className="text-[11px] text-slate-500">
              Tap any book to inspect physical label QR code or borrow in-library
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};