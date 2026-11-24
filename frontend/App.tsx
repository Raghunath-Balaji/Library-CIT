import './global.css';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StudentMapScreen } from './src/screens/StudentMapScreen';
import { AdminCatalogScreen } from './src/screens/AdminCatalogScreen';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'student' | 'admin'>('student');

  return (
    <SafeAreaProvider>
      <View className="flex-1 min-h-screen w-full bg-slate-100">
        <StatusBar style="dark" />
        {activeScreen === 'student' ? (
          <StudentMapScreen onSwitchToAdmin={() => setActiveScreen('admin')} />
        ) : (
          <AdminCatalogScreen onBack={() => setActiveScreen('student')} />
        )}
      </View>
    </SafeAreaProvider>
  );
}
