import './global.css';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StudentMapScreen } from './src/screens/StudentMapScreen';
import { AdminCatalogScreen } from './src/screens/AdminCatalogScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { AuthService } from './src/services/authService';
import { UserProfile } from './src/types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    AuthService.getCurrentUser()
  );

  useEffect(() => {
    const unsub = AuthService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  const handleSwitchToAdmin = () => {
    AuthService.switchRoleForDev?.('admin');
  };

  const handleBackFromAdmin = () => {
    AuthService.switchRoleForDev?.('student');
  };

  const handleSignOut = () => {
    AuthService.signOut();
  };

  return (
    <SafeAreaProvider>
      <View className="flex-1 min-h-screen w-full bg-appBg">
        <StatusBar style="dark" />
        {!currentUser ? (
          <AuthScreen />
        ) : currentUser.role === 'admin' ? (
          <AdminCatalogScreen onBack={handleBackFromAdmin} onSignOut={handleSignOut} />
        ) : (
          <StudentMapScreen onSwitchToAdmin={handleSwitchToAdmin} />
        )}
      </View>
    </SafeAreaProvider>
  );
}
