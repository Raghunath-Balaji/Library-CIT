import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map3DView } from '../components/Map3DView';
import { ShelfBooksModal } from '../components/ShelfBooksModal';
import { LibrarianModal } from '../components/LibrarianModal';
import { BottomNavBar, NavTab } from '../components/BottomNavBar';
import { CollectionsScreen } from './CollectionsScreen';
import { QRScannerScreen } from './QRScannerScreen';
import { ProfileScreen } from './ProfileScreen';
import { BookDetailModal } from '../components/BookDetailModal';
import { LibraryApiService } from '../services/api';
import { Book, LayoutConfig, ShelfItem } from '../types';

interface StudentMapScreenProps {
  onSwitchToAdmin: () => void;
}

export const StudentMapScreen: React.FC<StudentMapScreenProps> = ({ onSwitchToAdmin }) => {
  const insets = useSafeAreaInsets();
  const [layout, setLayout] = useState<LayoutConfig | null>(null);
  const [books, setBooks] = useState<Book[]>([]);

  // Navigation Tabs State
  const [currentTab, setCurrentTab] = useState<NavTab>('home');

  // Shelf Modal State
  const [selectedShelf, setSelectedShelf] = useState<ShelfItem | null>(null);
  const [shelfModalVisible, setShelfModalVisible] = useState(false);

  // Virtual Librarian Modal State
  const [librarianModalVisible, setLibrarianModalVisible] = useState(false);

  // QR Modal for single book inspection
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedBookForQR, setSelectedBookForQR] = useState<Book | null>(null);

  useEffect(() => {
    async function loadData() {
      const [layoutRes, bookRes] = await Promise.all([
        LibraryApiService.getLayout(),
        LibraryApiService.getBooks()
      ]);
      setLayout(layoutRes);
      setBooks(bookRes);
    }
    loadData();

    // Subscribe to real-time updates (e.g. loan approvals, status changes)
    const unsub = LibraryApiService.subscribeToBooks((updatedBooks) => {
      setBooks(updatedBooks);
    });
    return () => unsub();
  }, []);

  // When a shelf bay in 3D is tapped -> opens 90% screen bottom sheet
  const handleShelfSelect = (shelfItem: ShelfItem) => {
    setSelectedShelf(shelfItem);
    setShelfModalVisible(true);
  };

  const booksForSelectedShelf = selectedShelf
    ? books.filter((b) => b.shelfId === selectedShelf.shelfId)
    : [];

  return (
    <View className="flex-1 bg-appBg relative">
      <View className="flex-1">
        {/* ========================================================= */}
        {/* TAB 1: HOME (3D MAP WITH GRADIENT OPTICAL FROST BLUR)    */}
        {/* ========================================================= */}
        {currentTab === 'home' && (
          <View className="flex-1 bg-slate-200">
            <Map3DView
              layout={layout}
              selectedShelfId={selectedShelf?.shelfId || null}
              onSelectShelf={handleShelfSelect}
              onSelectLibrarian={() => setLibrarianModalVisible(true)}
            />
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 2: COLLECTIONS (BORROWED BOOKS & BILLS)               */}
        {/* ========================================================= */}
        {currentTab === 'collections' && (
          <CollectionsScreen onBack={() => setCurrentTab('home')} />
        )}

        {/* ========================================================= */}
        {/* TAB 3: QR SCANNER (IN-LIBRARY BORROWING WORKFLOW)         */}
        {/* ========================================================= */}
        {currentTab === 'scanner' && (
          <QRScannerScreen onSuccessCheckout={() => setCurrentTab('collections')} />
        )}

        {/* ========================================================= */}
        {/* TAB 4: PROFILE (STUDENT ID & SWITCH TO ADMIN)            */}
        {/* ========================================================= */}
        {currentTab === 'profile' && (
          <ProfileScreen
            onBack={() => setCurrentTab('home')}
            onSwitchToAdmin={onSwitchToAdmin}
          />
        )}
      </View>

      {/* ========================================================= */}
      {/* FLOATING CIRCULAR WHITE BOTTOM NAV BAR                    */}
      {/* ========================================================= */}
      <BottomNavBar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

      {/* ========================================================= */}
      {/* 90% SCREEN FILLING SHELF BOOKS MODAL                      */}
      {/* ========================================================= */}
      <ShelfBooksModal
        visible={shelfModalVisible}
        shelf={selectedShelf}
        books={booksForSelectedShelf}
        onClose={() => setShelfModalVisible(false)}
        onSelectBook={(book) => {
          setSelectedBookForQR(book);
          setQrModalVisible(true);
        }}
      />

      {/* ========================================================= */}
      {/* 90% SCREEN FILLING VIRTUAL LIBRARIAN MODAL               */}
      {/* ========================================================= */}
      <LibrarianModal
        visible={librarianModalVisible}
        books={books}
        layout={layout}
        onClose={() => setLibrarianModalVisible(false)}
        onSelectBook={(book) => {
          setSelectedBookForQR(book);
          setQrModalVisible(true);
        }}
        onSelectShelfBay={(bay) => {
          setSelectedShelf(bay);
          setLibrarianModalVisible(false);
          setShelfModalVisible(true);
        }}
      />

      {/* Book Details Modal (includes nested QR Pop-up & Ratings) */}
      <BookDetailModal
        visible={qrModalVisible}
        book={
          selectedBookForQR
            ? books.find((b) => b.id === selectedBookForQR.id) || selectedBookForQR
            : null
        }
        onClose={() => setQrModalVisible(false)}
      />
    </View>
  );
};
