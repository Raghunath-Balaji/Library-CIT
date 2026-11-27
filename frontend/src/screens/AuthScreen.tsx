import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { AuthService } from '../services/authService';

// Filled Mail Icon
const MailFilledIcon: React.FC<{ color?: string }> = ({ color = '#64748b' }) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="4" width="20" height="16" rx="3" fill={color} />
    <Path
      d="M4 6.5l8 5.5 8-5.5"
      stroke="#ffffff"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Filled Lock Icon
const LockFilledIcon: React.FC<{ color?: string }> = ({ color = '#64748b' }) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
    <Path
      d="M7 11V7a5 5 0 0 1 10 0v4"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
    <Rect x="3" y="10" width="18" height="11" rx="3" fill={color} />
    <Circle cx="12" cy="15.5" r="1.5" fill="#ffffff" />
  </Svg>
);

// Eye Open Icon
const EyeOpenIcon: React.FC<{ color?: string }> = ({ color = '#64748b' }) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
  </Svg>
);

// Eye Closed Icon
const EyeClosedIcon: React.FC<{ color?: string }> = ({ color = '#64748b' }) => (
  <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a21.8 21.8 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M1 1l22 22" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// Clean Google "G" Icon for dummy button
const GoogleIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21.8 12.23c0-.7-.06-1.37-.18-2.02H12v3.83h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.45z"
      fill="#4285F4"
    />
    <Path
      d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.97-3.45.97-2.65 0-4.9-1.79-5.7-4.2H2.89v2.64A10 10 0 0 0 12 22z"
      fill="#34A853"
    />
    <Path
      d="M6.3 13.74A6.01 6.01 0 0 1 5.98 12c0-.6.11-1.19.32-1.74V7.62H2.89A10 10 0 0 0 2 12c0 1.61.39 3.14 1.09 4.38l3.21-2.64z"
      fill="#FBBC05"
    />
    <Path
      d="M12 6.06c1.5 0 2.84.51 3.9 1.52l2.92-2.92C17.05 3.01 14.74 2 12 2a10 10 0 0 0-9.11 5.62l3.41 2.64c.8-2.41 3.05-4.2 5.7-4.2z"
      fill="#EA4335"
    />
  </Svg>
);

export const AuthScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'login' | 'quick'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeTopPadding = Math.max(insets.top, Platform.OS === 'android' ? 28 : 20);
  const safeBottomPadding = Math.max(insets.bottom, 24);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await AuthService.signInWithEmail(email, password);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await AuthService.signInWithEmail(demoEmail, demoPass);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Demo login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView
        className="flex-1 bg-white"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: safeTopPadding + 16,
          paddingBottom: safeBottomPadding + 16,
          paddingHorizontal: 24,
          flexGrow: 1,
          justifyContent: 'space-between'
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top: Extra-Large Hero Graphic */}
        <View className="w-full max-w-md mx-auto items-center justify-center flex-1 py-4">
          <Image
            source={require('../../assets/login-hero.png')}
            style={{ width: '100%', maxWidth: 340, height: 300 }}
            resizeMode="contain"
          />
        </View>

        {/* Bottom: Login Heading + Form Cluster */}
        <View className="w-full max-w-md mx-auto">
          <Text
            style={[
              { fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
              Platform.select({
                android: { fontFamily: 'sans-serif-black', fontWeight: '900' as const },
                default: { fontWeight: '900' as const }
              })
            ]}
            className="text-slate-900 text-center mb-5"
          >
            Login
          </Text>

          {/* Slider: Sign In | Quick Test Accounts */}
          <View className="flex-row bg-slate-100 p-1 rounded-full mb-6">
            <Pressable
              onPress={() => {
                setTab('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-full items-center ${
                tab === 'login' ? 'bg-white' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  tab === 'login' ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                Sign In
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setTab('quick');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-full items-center ${
                tab === 'quick' ? 'bg-white' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  tab === 'quick' ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                Quick Test Accounts
              </Text>
            </Pressable>
          </View>

          {tab === 'login' ? (
            <View>
              {/* Rounded Email Input (No Border, Filled Mail Icon) */}
              <View className="flex-row items-center bg-slate-100 rounded-full px-4 mb-3.5">
                <MailFilledIcon color="#64748b" />
                <TextInput
                  placeholder="College Email"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 text-slate-900 py-3.5 px-3 text-sm"
                />
              </View>

              {/* Rounded Password Input (No Border, Filled Lock Icon, Eye Open/Closed Toggle) */}
              <View className="flex-row items-center bg-slate-100 rounded-full px-4 mb-4">
                <LockFilledIcon color="#64748b" />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className="flex-1 text-slate-900 py-3.5 px-3 text-sm"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                  {showPassword ? (
                    <EyeOpenIcon color="#475569" />
                  ) : (
                    <EyeClosedIcon color="#64748b" />
                  )}
                </Pressable>
              </View>

              {/* Inline Error Banner (No Border) */}
              {errorMessage && (
                <View className="bg-rose-50 rounded-xl p-3 mb-4">
                  <Text className="text-xs font-semibold text-rose-700">{errorMessage}</Text>
                </View>
              )}

              {/* Primary Sign In Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={isLoading}
                style={({ pressed }) => [{ opacity: pressed || isLoading ? 0.8 : 1 }]}
                className="w-full py-3.5 bg-slate-900 rounded-full items-center justify-center mb-3"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-sm font-bold text-white">Sign In</Text>
                )}
              </Pressable>

              {/* Dummy Login with Google Button (No Border, Non-functional) */}
              <Pressable
                onPress={() => {}}
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                className="w-full py-3.5 bg-slate-100 rounded-full flex-row items-center justify-center"
              >
                <GoogleIcon />
                <Text className="text-sm font-bold text-slate-700 ml-2.5">
                  Login with Google
                </Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <View className="flex-row items-center justify-between mb-3 px-1">
                <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Temporary Dev Accounts
                </Text>
                <Text className="text-[10px] font-mono text-slate-400">
                  Pass: student123 / admin123
                </Text>
              </View>

              <Pressable
                onPress={() => handleQuickLogin('raghu@college.edu', 'student123')}
                disabled={isLoading}
                className="flex-row items-center justify-between bg-sky-50 rounded-xl p-3.5 mb-2.5 active:bg-sky-100"
              >
                <View>
                  <Text className="text-xs font-bold text-slate-900">Raghu (Student 1)</Text>
                  <Text className="text-[10px] font-mono text-slate-500 mt-0.5">
                    raghu@college.edu • STU-9921
                  </Text>
                </View>
                <View className="px-3 py-1.5 rounded-full bg-sky-600">
                  <Text className="text-[10px] font-bold text-white">Sign In</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => handleQuickLogin('ananya@college.edu', 'student123')}
                disabled={isLoading}
                className="flex-row items-center justify-between bg-slate-100 rounded-xl p-3.5 mb-2.5 active:bg-slate-200"
              >
                <View>
                  <Text className="text-xs font-bold text-slate-900">Ananya (Student 2)</Text>
                  <Text className="text-[10px] font-mono text-slate-500 mt-0.5">
                    ananya@college.edu • STU-9922
                  </Text>
                </View>
                <View className="px-3 py-1.5 rounded-full bg-slate-700">
                  <Text className="text-[10px] font-bold text-white">Sign In</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => handleQuickLogin('librarian@college.edu', 'admin123')}
                disabled={isLoading}
                className="flex-row items-center justify-between bg-slate-900 rounded-xl p-3.5 active:bg-slate-800"
              >
                <View>
                  <Text className="text-xs font-bold text-white">Dr. Rao (Desk Admin)</Text>
                  <Text className="text-[10px] font-mono text-slate-300 mt-0.5">
                    librarian@college.edu • STAFF-001
                  </Text>
                </View>
                <View className="px-3 py-1.5 rounded-full bg-white">
                  <Text className="text-[10px] font-bold text-slate-900">Admin</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
