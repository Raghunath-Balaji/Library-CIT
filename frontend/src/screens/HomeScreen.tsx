import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HomeScreenProps {
  onSelectRole: (role: 'student' | 'admin') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectRole }) => {
  const insets = useSafeAreaInsets();
  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 24 : 16);
  const safeBottomPadding = Math.max(insets.bottom, 16);

  return (
    <View
      style={{ paddingTop: safeTopPadding, paddingBottom: safeBottomPadding }}
      className="flex-1 bg-appBg justify-between p-6"
    >
      {/* App Branding */}
      <View className="items-center mt-12">
        <View className="w-16 h-16 rounded-2xl bg-white border border-slate-200 items-center justify-center mb-4 shadow-sm">
          <View className="w-8 h-8 rounded-lg bg-sky-600 items-center justify-center">
            <Text className="text-white font-black text-sm tracking-widest">LN</Text>
          </View>
        </View>
        <Text className="text-3xl font-black text-slate-900 tracking-tight">Library Navigator</Text>
        <Text className="text-sm text-slate-500 mt-2 text-center max-w-xs leading-5">
          Interactive 3D isometric floor layout and shelf catalog for university libraries.
        </Text>
        <View className="px-3.5 py-1 bg-sky-50 border border-sky-200 rounded-full mt-4">
          <Text className="text-xs font-semibold text-sky-700">Phase 1 Direct Role Access</Text>
        </View>
      </View>

      {/* Role Selection Buttons */}
      <View className="space-y-4 mb-6">
        <Pressable
          onPress={() => onSelectRole('student')}
          className="p-5 bg-white border border-slate-200 rounded-2xl active:bg-slate-50 flex-row items-center justify-between shadow-sm"
        >
          <View className="flex-1 mr-3">
            <View className="flex-row items-center">
              <View className="px-2 py-0.5 rounded bg-sky-100 border border-sky-200 mr-2.5">
                <Text className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Student</Text>
              </View>
              <Text className="text-lg font-bold text-slate-900">Student Mode</Text>
            </View>
            <Text className="text-xs text-slate-500 mt-1.5 leading-4">
              Explore the 3D library floor, tap wall-pinned shelves, and browse eye-level books.
            </Text>
          </View>
          <View className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center">
            <Text className="text-slate-700 font-bold text-sm">Open</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => onSelectRole('admin')}
          className="p-5 bg-white border border-slate-200 rounded-2xl active:bg-slate-50 flex-row items-center justify-between shadow-sm mt-3"
        >
          <View className="flex-1 mr-3">
            <View className="flex-row items-center">
              <View className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 mr-2.5">
                <Text className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Admin</Text>
              </View>
              <Text className="text-lg font-bold text-slate-900">Admin Mode</Text>
            </View>
            <Text className="text-xs text-slate-500 mt-1.5 leading-4">
              Add books to specific wall bays, manage inventory, and generate shelf QR codes.
            </Text>
          </View>
          <View className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center">
            <Text className="text-slate-700 font-bold text-sm">Open</Text>
          </View>
        </Pressable>
      </View>

      {/* Footer Info */}
      <View className="items-center pb-2">
        <Text className="text-[11px] text-slate-400 font-mono">
          Phase 1 • React Native + NativeWind + Three.js Isometric Engine
        </Text>
      </View>
    </View>
  );
};
