import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LibraryApiService } from '../services/api';
import { LendingService, LendingRequest } from '../services/lendingService';
import { QRCodeModal } from '../components/QRCodeModal';
import { Book, Category, LayoutConfig, ShelfItem } from '../types';

interface AdminCatalogScreenProps {
  onBack: () => void;
}

export const AdminCatalogScreen: React.FC<AdminCatalogScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [layout, setLayout] = useState<LayoutConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'approvals'>('catalog');
  const [pendingRequests, setPendingRequests] = useState<LendingRequest[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedBookForQR, setSelectedBookForQR] = useState<Book | null>(null);

  // Form State for Add Book
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Computer Science');
  const [shelfId, setShelfId] = useState('SH-CS-1');
  const [row, setRow] = useState('1');

  useEffect(() => {
    loadCatalog();

    const unsubBooks = LibraryApiService.subscribeToBooks(() => loadCatalog());
    const unsubLending = LendingService.subscribe(() => loadCatalog());
    return () => {
      unsubBooks();
      unsubLending();
    };
  }, []);

  const loadCatalog = async () => {
    const [bRes, cRes, lRes] = await Promise.all([
      LibraryApiService.getBooks(),
      LibraryApiService.getCategories(),
      LibraryApiService.getLayout()
    ]);
    setBooks(bRes);
    setCategories(cRes);
    setLayout(lRes);
    setPendingRequests(LendingService.getPendingRequests());
  };

  const handleApproveLoan = (requestId: string) => {
    const bill = LendingService.approveLendingRequest(requestId);
    if (bill) {
      loadCatalog();
    }
  };

  const handleDeclineLoan = (requestId: string) => {
    LendingService.declineLendingRequest(requestId);
    loadCatalog();
  };

  const handleSaveBook = async () => {
    if (!title.trim() || !author.trim()) return;

    const newBook = await LibraryApiService.addBook({
      title: title.trim(),
      author: author.trim(),
      category,
      shelfId,
      row: parseInt(row, 10) || 1
    });

    setTitle('');
    setAuthor('');
    setModalVisible(false);
    loadCatalog();

    // Instantly preview and offer the generated QR code to the admin
    setSelectedBookForQR(newBook);
    setQrModalVisible(true);
  };

  const handleDeleteBook = async (id: string) => {
    await LibraryApiService.deleteBook(id);
    loadCatalog();
  };

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.shelfId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableShelvesForCategory = layout?.items.filter(
    (it): it is ShelfItem => it.type === 'shelf' && it.category === category
  ) || [];

  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 16);
  const safeBottomPadding = Math.max(insets.bottom, 12);

  return (
    <View style={{ paddingBottom: safeBottomPadding }} className="flex-1 bg-slate-100">
      {/* Light Header */}
      <View
        style={{ paddingTop: safeTopPadding }}
        className="px-5 pb-3.5 bg-white border-b border-slate-200 flex-row items-center justify-between shadow-xs"
      >
        <Pressable
          onPress={onBack}
          className="px-3.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 active:bg-slate-200"
        >
          <Text className="text-xs font-bold text-slate-700">Back</Text>
        </Pressable>
        <Text className="text-base font-bold text-slate-900">Admin Console</Text>
        <Pressable
          onPress={() => setModalVisible(true)}
          className="px-3.5 py-1.5 bg-slate-900 rounded-lg items-center justify-center active:bg-slate-800 shadow-xs"
        >
          <Text className="text-xs font-bold text-white">+ Add Book</Text>
        </Pressable>
      </View>

      {/* Admin Subtabs: Catalog vs Approvals */}
      <View className="flex-row bg-white border-b border-slate-200 px-4 pt-2">
        <Pressable
          onPress={() => setActiveTab('catalog')}
          className={`py-2 px-4 border-b-2 mr-3 ${
            activeTab === 'catalog' ? 'border-sky-600' : 'border-transparent'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeTab === 'catalog' ? 'text-sky-700' : 'text-slate-500'
            }`}
          >
            Catalog Inventory ({books.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('approvals')}
          className={`py-2 px-4 border-b-2 flex-row items-center ${
            activeTab === 'approvals' ? 'border-sky-600' : 'border-transparent'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeTab === 'approvals' ? 'text-sky-700' : 'text-slate-500'
            }`}
          >
            Scan Approvals
          </Text>
          {pendingRequests.length > 0 && (
            <View className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500">
              <Text className="text-[10px] font-bold text-white font-mono">
                {pendingRequests.length}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {activeTab === 'catalog' ? (
        <>
          {/* Search Input */}
          <View className="p-4 bg-white border-b border-slate-200">
            <TextInput
              placeholder="Search by title, author, shelf, or category..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 rounded-xl text-sm"
            />
          </View>

          {/* Book List */}
          <FlatList
            data={filteredBooks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <View className="bg-white border border-slate-200 p-4 rounded-xl mb-3 flex-row items-center justify-between shadow-xs">
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-bold text-slate-900">{item.title}</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">{item.author}</Text>
                  <View className="flex-row items-center mt-2 flex-wrap">
                    <Text className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold mr-2 border border-slate-200">
                      {item.id}
                    </Text>
                    <Text className="text-[11px] text-slate-500">
                      {item.category} • Shelf {item.shelfId} (Row {item.row})
                    </Text>
                  </View>

                  {/* Status Indicator */}
                  {item.status === 'borrowed' ? (
                    <View className="flex-row items-center mt-2">
                      <View className="w-2 h-2 rounded-full bg-rose-500 mr-1.5" />
                      <Text className="text-[11px] font-bold text-rose-600">
                        Unavailable until {item.unavailableUntil || 'Return'}
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center mt-2">
                      <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                      <Text className="text-[11px] font-bold text-emerald-700">
                        Available on Shelf
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => {
                      setSelectedBookForQR(item);
                      setQrModalVisible(true);
                    }}
                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg mr-2 active:bg-slate-200"
                  >
                    <Text className="text-xs font-semibold text-slate-700">QR</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteBook(item.id)}
                    className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg active:bg-rose-100"
                  >
                    <Text className="text-xs font-semibold text-rose-700">Del</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </>
      ) : (
        /* Lending Approvals Tab */
        <FlatList
          data={pendingRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View className="bg-white border border-sky-200 rounded-2xl p-4 mb-3 shadow-xs">
              <View className="flex-row items-center justify-between pb-2 border-b border-slate-100">
                <Text className="text-xs font-mono font-bold text-sky-700">{item.id}</Text>
                <Text className="text-xs text-slate-400">{item.requestDate}</Text>
              </View>

              <Text className="text-base font-bold text-slate-900 mt-2">{item.bookTitle}</Text>
              <Text className="text-xs text-slate-500">Student: {item.studentName}</Text>
              <Text className="text-xs text-slate-600 mt-0.5">
                Category: {item.category} • Copy: <Text className="font-mono font-bold">{item.bookId}</Text>
              </Text>

              <View className="flex-row items-center mt-4">
                <Pressable
                  onPress={() => handleApproveLoan(item.id)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 items-center justify-center mr-2 active:bg-slate-800"
                >
                  <Text className="text-xs font-bold text-white">Approve (14 Days)</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleDeclineLoan(item.id)}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center active:bg-rose-100"
                >
                  <Text className="text-xs font-bold text-rose-700">Decline</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View className="py-20 items-center">
              <Text className="text-sm font-bold text-slate-600">No pending scan requests</Text>
              <Text className="text-xs text-slate-400 mt-1">
                When students scan physical book QRs in the library, loan requests will show here.
              </Text>
            </View>
          }
        />
      )}

      {/* Add Book Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white border-t border-slate-200 rounded-t-3xl p-6 pb-10 max-h-[90%] shadow-2xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-slate-900">Add New Book to Shelf</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200"
              >
                <Text className="text-slate-600 font-bold text-xs">Close</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                placeholder="Book Title"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
                className="bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 rounded-xl text-sm mb-3"
              />

              <TextInput
                placeholder="Author"
                placeholderTextColor="#94a3b8"
                value={author}
                onChangeText={setAuthor}
                className="bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 rounded-xl text-sm mb-3"
              />

              <Text className="text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                1. Select Department
              </Text>
              <View className="flex-row flex-wrap mb-3">
                {categories.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setCategory(c.name);
                      setShelfId(c.shelfId);
                    }}
                    className={`px-3 py-1.5 rounded-xl mr-2 mb-2 border flex-row items-center ${
                      category === c.name
                        ? 'bg-sky-50 border-sky-400'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <View
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: c.color }}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        category === c.name ? 'text-sky-800' : 'text-slate-700'
                      }`}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                2. Select Specific Bay in North Wall
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                {availableShelvesForCategory.map((sh) => (
                  <Pressable
                    key={sh.id}
                    onPress={() => setShelfId(sh.shelfId || sh.id)}
                    className={`px-3 py-2 rounded-xl mr-2 border ${
                      shelfId === (sh.shelfId || sh.id)
                        ? 'bg-sky-50 border-sky-400'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-mono font-bold ${
                        shelfId === (sh.shelfId || sh.id) ? 'text-sky-800' : 'text-slate-700'
                      }`}
                    >
                      {sh.shelfId}
                    </Text>
                    <Text className="text-[10px] text-slate-500 max-w-[120px]" numberOfLines={1}>
                      {sh.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View className="flex-row space-x-3 mb-6">
                <View className="flex-1 mr-2">
                  <Text className="text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">
                    Assigned Bay
                  </Text>
                  <View className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl">
                    <Text className="text-xs font-mono text-sky-800 font-bold">{shelfId}</Text>
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-600 mb-1 uppercase tracking-wide">
                    Row Number (1-3)
                  </Text>
                  <TextInput
                    value={row}
                    onChangeText={setRow}
                    keyboardType="numeric"
                    className="bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2.5 rounded-xl text-xs"
                  />
                </View>
              </View>

              <Pressable
                onPress={handleSaveBook}
                className="w-full py-3.5 bg-slate-900 rounded-xl items-center shadow-xs active:bg-slate-800"
              >
                <Text className="text-sm font-bold text-white">Save Book & Assign QR</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <QRCodeModal
        visible={qrModalVisible}
        book={selectedBookForQR}
        onClose={() => setQrModalVisible(false)}
      />
    </View>
  );
};
