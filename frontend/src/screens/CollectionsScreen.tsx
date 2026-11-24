import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BillReceipt, LendingService } from '../services/lendingService';

export const CollectionsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [bills, setBills] = useState<BillReceipt[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillReceipt | null>(null);

  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 16);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = () => {
    setBills(LendingService.getUserCollections());
  };

  const handleReturnBook = (billId: string) => {
    LendingService.returnBook(billId);
    loadBills();
    if (selectedBill?.billId === billId) {
      setSelectedBill(null);
    }
  };

  return (
    <View className="flex-1 bg-slate-100 pb-24">
      {/* Header */}
      <View
        style={{ paddingTop: safeTopPadding }}
        className="px-6 pb-4 bg-white border-b border-slate-200 shadow-xs"
      >
        <Text className="text-xl font-black text-slate-900 tracking-tight">Your Collections</Text>
        <Text className="text-xs text-slate-500 mt-0.5">
          Books borrowed with verified digital receipt and return schedules.
        </Text>
      </View>

      <FlatList
        data={bills}
        keyExtractor={(item) => item.billId}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isReturned = item.status === 'returned';

          return (
            <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-3.5 shadow-xs">
              {/* Receipt Header Badge */}
              <View className="flex-row items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                <View className="flex-row items-center">
                  <View className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 mr-2">
                    <Text className="text-[10px] font-mono font-bold text-slate-700">
                      {item.billId}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-400 font-medium">{item.category}</Text>
                </View>

                <View
                  className={`px-2.5 py-0.5 rounded-full ${
                    isReturned ? 'bg-slate-100' : 'bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isReturned ? 'text-slate-500' : 'text-emerald-700'
                    }`}
                  >
                    {isReturned ? 'Returned' : 'Active Loan'}
                  </Text>
                </View>
              </View>

              {/* Book Details */}
              <Text className="text-base font-bold text-slate-900">{item.bookTitle}</Text>
              <Text className="text-xs text-slate-500 mt-0.5">by {item.bookAuthor}</Text>
              <Text className="text-[10px] text-sky-700 font-mono mt-1">Copy ID: {item.bookId}</Text>

              {/* Bill Schedule Specs */}
              <View className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 my-3 flex-row justify-between">
                <View>
                  <Text className="text-[10px] text-slate-400 font-medium">Issued Date</Text>
                  <Text className="text-xs font-bold text-slate-800">{item.issueDate}</Text>
                </View>
                <View>
                  <Text className="text-[10px] text-slate-400 font-medium">Return Due Date</Text>
                  <Text className="text-xs font-bold text-rose-600">{item.dueDate}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] text-slate-400 font-medium">Overdue Rate</Text>
                  <Text className="text-xs font-bold text-slate-700">{item.lateFeePerDay}</Text>
                </View>
              </View>

              {/* Return Book Action */}
              {!isReturned && (
                <Pressable
                  onPress={() => handleReturnBook(item.billId)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  className="w-full py-2.5 rounded-xl bg-slate-900 items-center justify-center"
                >
                  <Text className="text-xs font-bold text-white">Return to Circulation Desk</Text>
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="py-20 items-center">
            <View className="w-16 h-16 rounded-2xl bg-white border border-slate-200 items-center justify-center mb-3 shadow-xs">
              <Text className="text-xs font-mono font-bold text-slate-400">EMPTY</Text>
            </View>
            <Text className="text-sm font-bold text-slate-700">No books in your collection</Text>
            <Text className="text-xs text-slate-400 mt-1 max-w-xs text-center">
              Scan a book QR code inside the library to checkout and generate your digital bill.
            </Text>
          </View>
        }
      />
    </View>
  );
};
