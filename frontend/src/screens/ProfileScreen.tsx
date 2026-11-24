import React from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Path } from 'react-native-svg';

interface ProfileScreenProps {
  onSwitchToAdmin: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onSwitchToAdmin }) => {
  const insets = useSafeAreaInsets();
  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 16);

  return (
    <ScrollView
      className="flex-1 bg-slate-100"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View
        style={{ paddingTop: safeTopPadding }}
        className="px-6 pb-4 bg-white border-b border-slate-200 shadow-xs"
      >
        <Text className="text-xl font-black text-slate-900 tracking-tight">Your Profile</Text>
        <Text className="text-xs text-slate-500 mt-0.5">
          Student library membership and academic credentials.
        </Text>
      </View>

      <View className="p-6">
        {/* Student ID Card Badge */}
        <View className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 shadow-xs">
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <View>
              <Text className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                University Campus Pass
              </Text>
              <Text className="text-base font-black text-slate-900 mt-0.5">Raghu</Text>
            </View>
            <View className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
              <Text className="text-[10px] font-bold text-emerald-700">Active Member</Text>
            </View>
          </View>

          <View className="mt-3 flex-row justify-between">
            <View>
              <Text className="text-[10px] text-slate-400 font-medium">Department</Text>
              <Text className="text-xs font-bold text-slate-800">Computer Science & Eng</Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] text-slate-400 font-medium">Student ID</Text>
              <Text className="text-xs font-mono font-bold text-slate-800">STU-9921</Text>
            </View>
          </View>
        </View>

        {/* Library Activity Metrics */}
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          Borrowing Statistics
        </Text>
        <View className="flex-row space-x-3 mb-6">
          <View className="flex-1 mr-2 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
            <Text className="text-2xl font-black text-slate-900">1</Text>
            <Text className="text-xs text-slate-500 mt-1 font-medium">Active Book Loan</Text>
          </View>
          <View className="flex-1 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
            <Text className="text-2xl font-black text-slate-900">12</Text>
            <Text className="text-xs text-slate-500 mt-1 font-medium">Lifetime Returns</Text>
          </View>
        </View>

        {/* Administration Section */}
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          System Administration
        </Text>
        <View className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <Text className="text-sm font-bold text-slate-900">Librarian & Staff Console</Text>
          <Text className="text-xs text-slate-500 mt-0.5 leading-4">
            Manage catalog, process pending QR scan lending approvals, and print book barcodes.
          </Text>

          <Pressable
            onPress={onSwitchToAdmin}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="w-full mt-3.5 py-2.5 bg-slate-900 rounded-xl items-center justify-center"
          >
            <Text className="text-xs font-bold text-white">Switch to Admin Console</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
};
