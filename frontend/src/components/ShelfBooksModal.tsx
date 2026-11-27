import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Keyboard,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Book, ShelfItem } from '../types';
import { searchBooksBySimilarity } from '../services/searchService';
import { ReadLaterService } from '../services/readLaterService';

const ROWS_PER_SHELF = 7;

interface ShelfBooksModalProps {
  visible: boolean;
  shelf: ShelfItem | null;
  books: Book[];
  onClose: () => void;
  onSelectBook: (book: Book) => void;
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

// Clean SVG Book Vector Icon with dynamic color fill (Zero Emojis)
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

// Clean SVG Butterfly Icon - solid saturated category color, no outline (Zero Emojis)
const ButterflyIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={40} height={46} viewBox="0 -4 24 28" fill="none">
    <Path
      d="M12 7c-1.5-3.2-5.5-4.5-7.5-2.5S3 10.5 6 12c-2.5 1.5-2.5 5-.5 6.5S10.5 18 12 15"
      fill={color}
    />
    <Path
      d="M12 7c1.5-3.2 5.5-4.5 7.5-2.5S21 10.5 18 12c2.5 1.5 2.5 5 .5 6.5S13.5 18 12 15"
      fill={color}
    />
    <Path
      d="M12 6v12"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M12 6.5L7.5 -2.5M12 6.5L16.5 -2.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

// Magnifying glass icon for focused search action button
const SearchGlassIcon: React.FC<{ color?: string }> = ({ color = '#64748b' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2.2} />
    <Path
      d="M20 20l-3.5-3.5"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  </Svg>
);

const BookmarkIcon: React.FC<{ saved: boolean }> = ({ saved }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill={saved ? '#0284c7' : 'none'}>
    <Path
      d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
      stroke={saved ? '#0284c7' : '#94a3b8'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRightIcon: React.FC<{ color?: string }> = ({ color = '#94a3b8' }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18l6-6-6-6"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

function splitShelfNameTwoLines(rawName: string): { line1: string; line2: string } {
  const trimmed = rawName.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx === -1) {
    return { line1: trimmed, line2: '' };
  }
  return {
    line1: trimmed.slice(0, spaceIdx),
    line2: trimmed.slice(spaceIdx + 1)
  };
}

export const ShelfBooksModal: React.FC<ShelfBooksModalProps> = ({
  visible,
  shelf,
  books,
  onClose,
  onSelectBook
}) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [savedBookIds, setSavedBookIds] = useState<string[]>(() => ReadLaterService.getBookIds());

  useEffect(() => {
    const unsub = ReadLaterService.subscribe(setSavedBookIds);
    return () => unsub();
  }, []);

  const translateY = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      scrollOffsetY.current = 0;
      translateY.setValue(520);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 22,
        stiffness: 220,
        useNativeDriver: true
      }).start();
    } else {
      setSearchQuery('');
      setIsSearchFocused(false);
    }
  }, [visible, translateY]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardOpen(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handlePanRelease = useRef((dy: number, vy: number) => {
    if (dy > 55 || vy > 0.35) {
      Keyboard.dismiss();
      Animated.timing(translateY, {
        toValue: 750,
        duration: 190,
        useNativeDriver: true
      }).start(() => {
        onCloseRef.current();
      });
    } else {
      Animated.spring(translateY, {
        toValue: 0,
        bounciness: 6,
        useNativeDriver: true
      }).start();
    }
  }).current;

  // Header & top-line pan responder: claims touch immediately so swiping from the top line always works
  const headerPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        handlePanRelease(gestureState.dy, gestureState.vy);
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          bounciness: 6,
          useNativeDriver: true
        }).start();
      }
    })
  ).current;

  // Card-level pan responder: lets user swipe down from anywhere on the card when list is at top
  const cardPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        scrollOffsetY.current <= 2 &&
        gestureState.dy > 8 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        handlePanRelease(gestureState.dy, gestureState.vy);
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          bounciness: 6,
          useNativeDriver: true
        }).start();
      }
    })
  ).current;

  const iconColors = ['#0284c7', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#ea580c', '#0d9488'];

  const filteredBooks = useMemo(() => {
    return searchBooksBySimilarity(books, searchQuery, 0.28);
  }, [books, searchQuery]);

  const rowGroups = useMemo(() => {
    const map = new Map<number, Book[]>();
    for (let r = 1; r <= ROWS_PER_SHELF; r++) {
      map.set(r, []);
    }
    for (const book of filteredBooks) {
      const r = book.row >= 1 && book.row <= ROWS_PER_SHELF ? book.row : 1;
      const arr = map.get(r) || [];
      arr.push(book);
      map.set(r, arr);
    }
    const hasQuery = searchQuery.trim().length > 0;
    const rows: { rowNum: number; items: Book[] }[] = [];
    for (let r = 1; r <= ROWS_PER_SHELF; r++) {
      const items = map.get(r) || [];
      if (!hasQuery || items.length > 0) {
        rows.push({ rowNum: r, items });
      }
    }
    return rows;
  }, [filteredBooks, searchQuery]);

  if (!shelf) return null;

  const displayShelfName = shelf.aisle || shelf.title || 'North Shelf 1';
  const { line1, line2 } = splitShelfNameTwoLines(displayShelfName);
  const accentColor = shelf.color || '#0284c7';
  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 16 : 12);
  const safeBottomPadding = isKeyboardOpen ? 10 : Math.max(insets.bottom, 12);
  const hasTypedQuery = searchQuery.trim().length > 0;
  const showFocusedSearchButton = isSearchFocused || hasTypedQuery;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/40"
      >
        {/* Top Screen Area: Explicit '<' Back Button on Far Top-Left + Tap Backdrop to Close */}
        <View className="flex-1 justify-between">
          <View
            style={{ paddingTop: safeTopPadding }}
            className="px-4 flex-row items-center"
          >
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              hitSlop={12}
              style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
              className="w-9 h-9 rounded-full bg-slate-200/85 items-center justify-center"
            >
              <ChevronLeftIcon color="#0f172a" />
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
            className="flex-1"
          />
        </View>

        {/* Pop-up Sheet Card: Pure White Background, Subtle Corner Rounding (No 24px), Swipe-Down to Close */}
        <Animated.View
          {...cardPanResponder.panHandlers}
          style={{ transform: [{ translateY }] }}
          className="h-[88%] bg-white rounded-t-lg flex-col justify-between overflow-hidden"
        >
          {/* Swipeable Top Handle + Shelf Header */}
          <View {...headerPanResponder.panHandlers} className="px-5 pt-3 pb-6 bg-white">
            <View className="py-1 mb-4 items-center">
              <View className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  {shelf.category}
                </Text>
                <Text className="text-4xl font-black text-slate-600 leading-10 tracking-tight">
                  {line1}
                  {line2 ? `\n${line2}` : ''}
                </Text>
              </View>

              <View className="items-center justify-center pl-2">
                <ButterflyIcon color={accentColor} />
              </View>
            </View>
          </View>

          {/* Books Separated by Row (Row 1..7) */}
          <View className="flex-1 relative bg-white">
            <ScrollView
              className="flex-1 bg-white"
              contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 36 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => {
                scrollOffsetY.current = e.nativeEvent.contentOffset.y;
              }}
            >
              {filteredBooks.length === 0 && hasTypedQuery ? (
                <View className="py-14 items-center">
                  <Text className="text-sm font-bold text-slate-600">
                    No books found matching query
                  </Text>
                  <Text className="text-xs text-slate-400 mt-1">
                    Try another search term or clear search
                  </Text>
                </View>
              ) : (
                rowGroups.map((group, groupIdx) => (
                  <View key={group.rowNum} className={groupIdx === 0 ? 'mb-4' : 'mt-3 mb-4'}>
                    {/* Row Heading + Solid Line (with visible padding before container edges) */}
                    <View className="flex-row items-center px-1 mb-1.5">
                      <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-3">
                        Row {group.rowNum}
                      </Text>
                      <View className="flex-1 h-[1px] bg-slate-200 mr-1" />
                    </View>

                    {group.items.length === 0 ? (
                      <Text className="text-xs text-slate-400 py-1.5 px-2">
                        No books on this row
                      </Text>
                    ) : (
                      group.items.map((item) => {
                        const isAvailable = item.status === 'on_shelf';
                        const isSaved = savedBookIds.includes(item.id);

                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => onSelectBook(item)}
                            className={`py-2 px-2 flex-row items-center justify-between active:bg-slate-50 ${
                              isAvailable ? '' : 'opacity-50'
                            }`}
                          >
                            <View className="w-8 h-8 items-center justify-center mr-3">
                              <BookVectorIcon color={isAvailable ? '#16a34a' : '#94a3b8'} />
                            </View>

                            <View className="flex-1 mr-3">
                              <Text
                                numberOfLines={1}
                                className={`text-sm font-bold leading-5 ${
                                  isAvailable ? 'text-slate-900' : 'text-slate-400'
                                }`}
                              >
                                {item.title}
                              </Text>
                              <Text numberOfLines={1} className="text-xs text-slate-500">
                                by {item.author}
                              </Text>
                            </View>

                            <View className="flex-row items-center pl-1">
                              <Pressable
                                onPress={(e) => {
                                  e.stopPropagation();
                                  ReadLaterService.toggle(item.id);
                                }}
                                hitSlop={10}
                                style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
                                className="p-1.5 mr-1"
                              >
                                <BookmarkIcon saved={isSaved} />
                              </Pressable>
                              <Pressable
                                onPress={() => onSelectBook(item)}
                                hitSlop={8}
                                className="p-1"
                              >
                                <ChevronRightIcon color="#94a3b8" />
                              </Pressable>
                            </View>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            {/* Soft Bottom Gradient Fade to White Above Search Bar */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 34
              }}
            >
              <Svg width="100%" height="100%" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="shelfBottomFade" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                    <Stop offset="0.7" stopColor="#ffffff" stopOpacity="0.85" />
                    <Stop offset="1" stopColor="#ffffff" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#shelfBottomFade)" />
              </Svg>
            </View>
          </View>

          {/* Bottom Search Bar: Thicker Pill Fill-Only (No Outline), Inside Safe Area & Anchored Above Keyboard */}
          <View
            style={{ paddingBottom: safeBottomPadding }}
            className="px-4 pt-2 bg-white flex-row items-center"
          >
            <View className="flex-1 rounded-full bg-slate-100 px-5 min-h-[48px] justify-center">
              <TextInput
                placeholder={`Search from ${books.length} books`}
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                returnKeyType="search"
                onSubmitEditing={() => Keyboard.dismiss()}
                className="text-sm text-slate-900 py-3 px-0"
              />
            </View>

            {showFocusedSearchButton && (
              <Pressable
                onPress={() => {
                  if (hasTypedQuery) {
                    Keyboard.dismiss();
                  }
                }}
                disabled={!hasTypedQuery}
                className={`ml-2.5 w-12 h-12 rounded-full items-center justify-center ${
                  hasTypedQuery ? 'bg-sky-500 active:bg-sky-600' : 'bg-slate-200'
                }`}
              >
                <SearchGlassIcon color={hasTypedQuery ? '#ffffff' : '#94a3b8'} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
