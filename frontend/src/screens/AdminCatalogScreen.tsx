import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { LibraryApiService } from '../services/api';
import { LendingService } from '../services/lendingService';
import { AuthService } from '../services/authService';
import { APP_CONFIG } from '../config/env';
import { QRCodeModal } from '../components/QRCodeModal';
import { Book, Category, LayoutConfig, ShelfItem, ActiveRequest } from '../types';

interface AdminCatalogScreenProps {
  onBack: () => void;
  onSignOut?: () => void;
}

// Clean SVG Icons (Zero emojis)
const HistoryIcon: React.FC<{ color?: string }> = ({ color = '#0284c7' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const UserCheckIcon: React.FC<{ color?: string }> = ({ color = '#10b981' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={2} />
    <Path d="M17 11l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const AdminCatalogScreen: React.FC<AdminCatalogScreenProps> = ({ onBack, onSignOut }) => {
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [layout, setLayout] = useState<LayoutConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'approvals'>('catalog');
  const [approvalsSubTab, setApprovalsSubTab] = useState<'borrows' | 'returns'>('borrows');

  const [pendingBorrows, setPendingBorrows] = useState<ActiveRequest[]>([]);
  const [pendingReturns, setPendingReturns] = useState<ActiveRequest[]>([]);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedBookForQR, setSelectedBookForQR] = useState<Book | null>(null);

  // Book Audit History Modal
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [auditBook, setAuditBook] = useState<Book | null>(null);

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
    const [bRes, cRes, lRes, pBorrows, pReturns] = await Promise.all([
      LibraryApiService.getBooks(),
      LibraryApiService.getCategories(),
      LibraryApiService.getLayout(),
      LendingService.getPendingBorrowRequests(),
      LendingService.getPendingReturnRequests()
    ]);
    setBooks(bRes);
    setCategories(cRes);
    setLayout(lRes);
    setPendingBorrows(pBorrows);
    setPendingReturns(pReturns);
  };

  const handleApproveBorrow = async (requestId: string) => {
    setActionError(null);
    setBusyRequestId(requestId);
    try {
      await LendingService.approveBorrowRequest(requestId);
      await loadCatalog();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to approve borrow request.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleDeclineBorrow = async (requestId: string) => {
    setActionError(null);
    setBusyRequestId(requestId);
    try {
      await LendingService.declineBorrowRequest(requestId);
      await loadCatalog();
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleConfirmReturn = async (requestId: string) => {
    setActionError(null);
    setBusyRequestId(requestId);
    try {
      await LendingService.confirmReturnRequest(requestId);
      await loadCatalog();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to confirm return.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleDeclineReturn = async (requestId: string) => {
    setActionError(null);
    setBusyRequestId(requestId);
    try {
      await LendingService.declineReturnRequest(requestId);
      await loadCatalog();
    } finally {
      setBusyRequestId(null);
    }
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
    await loadCatalog();

    setSelectedBookForQR(newBook);
    setQrModalVisible(true);
  };

  const handleDeleteBook = async (id: string) => {
    await LibraryApiService.deleteBook(id);
    await loadCatalog();
  };

  const currentAdmin = AuthService.getCurrentUser();
  const liveAuditBook = auditBook
    ? books.find((b) => b.id === auditBook.id) || auditBook
    : null;

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.shelfId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableShelvesForCategory =
    layout?.items.filter(
      (it): it is ShelfItem => it.type === 'shelf' && it.category === category
    ) || [];

  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 16);
  const safeBottomPadding = Math.max(insets.bottom, 12);
  const totalPending = pendingBorrows.length + pendingReturns.length;

  return (
    <View style={{ paddingBottom: safeBottomPadding }} className="flex-1 bg-appBg">
      {/* Light Header */}
      <View
        style={{ paddingTop: safeTopPadding }}
        className="px-5 pb-3.5 bg-white border-b border-slate-200 flex-row items-center justify-between shadow-xs"
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={onSignOut || onBack}
            className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 mr-2"
          >
            <Text className="text-xs font-bold text-rose-700">Sign Out</Text>
          </Pressable>
          {APP_CONFIG.ALLOW_DEV_QUICK_LOGIN && (
            <Pressable
              onPress={onBack}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200"
            >
              <Text className="text-xs font-bold text-slate-700">Student</Text>
            </Pressable>
          )}
        </View>
        <View className="items-center">
          <Text className="text-base font-bold text-slate-900">Admin Console</Text>
          {currentAdmin && (
            <Text className="text-[10px] text-slate-500 font-medium" numberOfLines={1}>
              {currentAdmin.name}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => setModalVisible(true)}
          className="px-3.5 py-1.5 bg-slate-900 rounded-lg items-center justify-center shadow-xs"
        >
          <Text className="text-xs font-bold text-white">+ Add Book</Text>
        </Pressable>
      </View>

      {/* Primary Admin Tabs: Catalog vs Approvals */}
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
            Desk Approvals
          </Text>
          {totalPending > 0 && (
            <View className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500">
              <Text className="text-[10px] font-bold text-white font-mono">{totalPending}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {activeTab === 'catalog' ? (
        <>
          {/* Search Input */}
          <View className="p-4 bg-white border-b border-slate-200">
            <TextInput
              placeholder="Search by title, author, shelf, or copy ID..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 rounded-xl text-sm"
            />
          </View>

          {/* Book List with Owner & History Audit Button */}
          <FlatList
            data={filteredBooks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => {
              const isBorrowed = item.status === 'borrowed';
              const isPendingReturn = item.status === 'return_pending';

              return (
                <View className="bg-white border border-slate-200 p-4 rounded-xl mb-3 shadow-xs">
                  <View className="flex-row items-start justify-between">
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

                      {/* Current Ownership / Status Indicator */}
                      {isPendingReturn ? (
                        <View className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 flex-row items-center">
                          <View className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
                          <Text className="text-[11px] font-bold text-amber-900">
                            Return Pending Verification at Desk
                          </Text>
                        </View>
                      ) : isBorrowed ? (
                        <View className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200">
                          <View className="flex-row items-center">
                            <View className="w-2 h-2 rounded-full bg-rose-500 mr-1.5" />
                            <Text className="text-[11px] font-bold text-rose-800">
                              Borrowed by: {item.currentOwner?.studentName || 'Student'}
                            </Text>
                          </View>
                          <Text className="text-[10px] text-rose-700 mt-0.5 font-mono">
                            Due Date: {item.currentOwner?.dueDate || item.unavailableUntil || 'Return'}
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center mt-2.5">
                          <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                          <Text className="text-[11px] font-bold text-emerald-700">
                            Available on Shelf
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Action Buttons: History, QR, Delete */}
                    <View className="flex-row items-center space-x-1.5">
                      <Pressable
                        onPress={() => {
                          setAuditBook(item);
                          setAuditModalVisible(true);
                        }}
                        className="px-2.5 py-1.5 bg-sky-50 border border-sky-200 rounded-lg mr-1.5"
                      >
                        <Text className="text-xs font-bold text-sky-700">Audit</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setSelectedBookForQR(item);
                          setQrModalVisible(true);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg mr-1.5"
                      >
                        <Text className="text-xs font-semibold text-slate-700">QR</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeleteBook(item.id)}
                        className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg"
                      >
                        <Text className="text-xs font-semibold text-rose-700">Del</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </>
      ) : (
        /* Desk Approvals Tab (Subdivided into Borrows vs Returns) */
        <View className="flex-1">
          {/* Subtabs */}
          <View className="flex-row bg-slate-50 border-b border-slate-200 px-4 py-2">
            <Pressable
              onPress={() => setApprovalsSubTab('borrows')}
              className={`py-1.5 px-3 rounded-lg mr-2 border ${
                approvalsSubTab === 'borrows'
                  ? 'bg-slate-900 border-slate-900'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  approvalsSubTab === 'borrows' ? 'text-white' : 'text-slate-600'
                }`}
              >
                Borrow Requests ({pendingBorrows.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setApprovalsSubTab('returns')}
              className={`py-1.5 px-3 rounded-lg border ${
                approvalsSubTab === 'returns'
                  ? 'bg-slate-900 border-slate-900'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  approvalsSubTab === 'returns' ? 'text-white' : 'text-slate-600'
                }`}
              >
                Return Verifications ({pendingReturns.length})
              </Text>
            </Pressable>
          </View>

          {actionError && (
            <View className="mx-4 mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3 flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-rose-700 flex-1 mr-2">{actionError}</Text>
              <Pressable onPress={() => setActionError(null)}>
                <Text className="text-xs font-bold text-rose-900">Dismiss</Text>
              </Pressable>
            </View>
          )}

          {approvalsSubTab === 'borrows' ? (
            /* Queue 1: Pending Borrow Requests */
            <FlatList
              data={pendingBorrows}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isBusy = busyRequestId === item.id;
                return (
                  <View className="bg-white border border-sky-200 rounded-2xl p-4 mb-3 shadow-xs">
                    <View className="flex-row items-center justify-between pb-2 border-b border-slate-100">
                      <Text className="text-xs font-mono font-bold text-sky-700">{item.id}</Text>
                      <Text className="text-xs text-slate-400">{item.requestDate}</Text>
                    </View>

                    <Text className="text-base font-bold text-slate-900 mt-2">{item.bookTitle}</Text>
                    <Text className="text-xs text-slate-500">
                      Student: <Text className="font-bold text-slate-700">{item.studentName}</Text>
                    </Text>
                    <Text className="text-xs text-slate-600 mt-0.5">
                      Category: {item.category} • Copy ID:{' '}
                      <Text className="font-mono font-bold text-slate-800">{item.bookId}</Text>
                    </Text>

                    <View className="flex-row items-center mt-4">
                      <Pressable
                        onPress={() => handleApproveBorrow(item.id)}
                        disabled={isBusy}
                        className="flex-1 py-2.5 rounded-xl bg-slate-900 items-center justify-center mr-2 shadow-xs"
                      >
                        <Text className="text-xs font-bold text-white">
                          {isBusy ? 'Approving...' : 'Approve Loan (14 Days)'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeclineBorrow(item.id)}
                        disabled={isBusy}
                        className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center"
                      >
                        <Text className="text-xs font-bold text-rose-700">Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View className="py-20 items-center">
                  <Text className="text-sm font-bold text-slate-600">No pending borrow requests</Text>
                  <Text className="text-xs text-slate-400 mt-1 text-center max-w-xs">
                    When students scan book QR codes and click "Send Borrow Request", they appear here for authorization.
                  </Text>
                </View>
              }
            />
          ) : (
            /* Queue 2: Pending Return Verifications */
            <FlatList
              data={pendingReturns}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isBusy = busyRequestId === item.id;
                return (
                  <View className="bg-white border border-amber-300 rounded-2xl p-4 mb-3 shadow-xs">
                    <View className="flex-row items-center justify-between pb-2 border-b border-slate-100">
                      <Text className="text-xs font-mono font-bold text-amber-700">{item.id}</Text>
                      <Text className="text-xs text-slate-400">Due: {item.dueDate}</Text>
                    </View>

                    <Text className="text-base font-bold text-slate-900 mt-2">{item.bookTitle}</Text>
                    <Text className="text-xs text-slate-500">
                      Returning Student:{' '}
                      <Text className="font-bold text-slate-700">{item.studentName}</Text>
                    </Text>
                    <Text className="text-xs text-slate-600 mt-0.5">
                      Copy ID: <Text className="font-mono font-bold text-slate-800">{item.bookId}</Text> • Pass: {item.loanId}
                    </Text>

                    <View className="flex-row items-center mt-4">
                      <Pressable
                        onPress={() => handleConfirmReturn(item.id)}
                        disabled={isBusy}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-700 items-center justify-center mr-2 shadow-xs"
                      >
                        <Text className="text-xs font-bold text-white">
                          {isBusy ? 'Reshelving...' : 'Confirm Return & Reshelve'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeclineReturn(item.id)}
                        disabled={isBusy}
                        className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center"
                      >
                        <Text className="text-xs font-bold text-rose-700">Reject Return</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View className="py-20 items-center">
                  <Text className="text-sm font-bold text-slate-600">No pending return verifications</Text>
                  <Text className="text-xs text-slate-400 mt-1 text-center max-w-xs">
                    When students submit a book for return, librarians confirm physical handover and condition here.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* =================================================================== */}
      {/* BOOK AUDIT & OWNERSHIP HISTORY MODAL                                */}
      {/* =================================================================== */}
      <Modal
        visible={auditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAuditModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 pb-10 max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-center pb-3 border-b border-slate-200">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 items-center justify-center mr-2">
                  <HistoryIcon color="#0284c7" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
                    {liveAuditBook?.title}
                  </Text>
                  <Text className="text-xs font-mono text-slate-500 font-bold">
                    Primary Key: {liveAuditBook?.id}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setAuditModalVisible(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200"
              >
                <Text className="text-xs font-bold text-slate-600">Close</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
              {/* Current Ownership Card */}
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Current Custody & Status
              </Text>
              <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
                {liveAuditBook?.status === 'borrowed' ? (
                  <View>
                    <View className="flex-row items-center mb-1">
                      <View className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2" />
                      <Text className="text-xs font-bold text-rose-800">
                        Currently Held by Student
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-slate-900 mt-1">
                      {liveAuditBook.currentOwner?.studentName}
                    </Text>
                    <Text className="text-xs text-slate-500 font-mono mt-0.5">
                      Student ID: {liveAuditBook.currentOwner?.studentId} • Pass: {liveAuditBook.currentOwner?.loanId}
                    </Text>
                    <Text className="text-xs text-rose-600 font-bold mt-1">
                      Issued: {liveAuditBook.currentOwner?.borrowedDate} • Due: {liveAuditBook.currentOwner?.dueDate}
                    </Text>
                  </View>
                ) : liveAuditBook?.status === 'return_pending' ? (
                  <View>
                    <View className="flex-row items-center">
                      <View className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2" />
                      <Text className="text-xs font-bold text-amber-800">
                        Return Pending Desk Verification
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-600 mt-1">
                      Student has initiated return. Awaiting physical inspection at circulation desk.
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
                    <Text className="text-xs font-bold text-emerald-800">
                      Available on Shelf ({liveAuditBook?.shelfId}, Row {liveAuditBook?.row})
                    </Text>
                  </View>
                )}
              </View>

              {/* Complete Chronological History Audit Trail */}
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Lifetime Borrower Audit Trail
              </Text>

              {(!liveAuditBook?.history || liveAuditBook.history.length === 0) ? (
                <View className="p-6 items-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Text className="text-xs text-slate-500 font-medium">No past borrowing history recorded for this copy.</Text>
                </View>
              ) : (
                liveAuditBook.history.map((hist, hIdx) => (
                  <View
                    key={`${hist.loanId}-${hIdx}`}
                    className="bg-white border border-slate-200 rounded-xl p-3.5 mb-2.5 shadow-xs"
                  >
                    <View className="flex-row items-center justify-between pb-1.5 border-b border-slate-100">
                      <Text className="text-xs font-mono font-bold text-sky-800">{hist.loanId}</Text>
                      <Text className="text-[10px] text-slate-400">
                        {hist.returnedDate ? `Returned: ${hist.returnedDate}` : 'In Progress'}
                      </Text>
                    </View>
                    <Text className="text-xs font-bold text-slate-900 mt-1">
                      {hist.studentName} ({hist.studentId})
                    </Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">
                      Issued: {hist.borrowedDate} • Due: {hist.dueDate}
                    </Text>
                    {hist.returnApprovedBy && (
                      <Text className="text-[10px] text-emerald-700 font-semibold mt-1">
                        Verified by: {hist.returnApprovedBy}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                className="w-full py-3.5 bg-slate-900 rounded-xl items-center shadow-xs"
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
