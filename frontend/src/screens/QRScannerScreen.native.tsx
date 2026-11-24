import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, Animated, Easing, ActivityIndicator, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { LibraryApiService } from '../services/api';
import { LendingService, LendingRequest } from '../services/lendingService';
import { Book } from '../types';

interface QRScannerScreenProps {
  onSuccessCheckout: () => void;
}

const BARCODE_SETTINGS = {
  barcodeTypes: ['qr' as const]
};

// SVG Icons (Zero emojis)
const CameraIcon: React.FC<{ color?: string }> = ({ color = '#38bdf8' }) => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
  </Svg>
);

const TorchIcon: React.FC<{ on: boolean }> = ({ on }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
      stroke={on ? '#fde047' : '#94a3b8'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={on ? '#fde047' : 'none'}
    />
  </Svg>
);

const KeyboardIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="3"
      stroke={active ? '#38bdf8' : '#94a3b8'}
      strokeWidth={2}
    />
    <Path
      d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8"
      stroke={active ? '#38bdf8' : '#94a3b8'}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const CheckCircleIcon: React.FC<{ color?: string }> = ({ color = '#10b981' }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M8 12l2.5 2.5L16 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({ onSuccessCheckout }) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [detectedBook, setDetectedBook] = useState<Book | null>(null);
  const [activeRequest, setActiveRequest] = useState<LendingRequest | null>(null);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [typedId, setTypedId] = useState('');

  // Laser beam sweep animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    LibraryApiService.getBooks().then((res) => {
      setBooks(res);
    });

    const unsubBooks = LibraryApiService.subscribeToBooks((updated) => {
      setBooks(updated);
    });

    return () => unsubBooks();
  }, []);

  useEffect(() => {
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ])
    );
    sweep.start();
    return () => sweep.stop();
  }, [laserAnim]);

  const processBarcode = (rawData: string) => {
    let clean = rawData.trim();
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        if (parsed.id) clean = parsed.id;
      } catch {}
    }

    const matched = books.find((b) => b.id.toLowerCase() === clean.toLowerCase()) || null;
    setDetectedBook(matched);
    if (matched) {
      const req = LendingService.getRequestForBook(matched.id) || null;
      setActiveRequest(req);
    }
  };

  const handleBarcodeScanned = (event: { data: string }) => {
    if (scanned || !event?.data) return;
    setScanned(true);
    processBarcode(event.data);
  };

  const handleManualSubmit = () => {
    if (!typedId.trim()) return;
    setScanned(true);
    setManualInputOpen(false);
    processBarcode(typedId);
  };

  const handleBorrowBook = () => {
    if (!detectedBook) return;
    const req = LendingService.submitLendingRequest(detectedBook);
    // Instant approval for streamlined in-library student checkout
    LendingService.approveLendingRequest(req.id);
    const updatedReq = LendingService.getRequestForBook(detectedBook.id) || null;
    setActiveRequest(updatedReq);
  };

  const handleScanAnother = () => {
    setScanned(false);
    setDetectedBook(null);
    setActiveRequest(null);
    setTypedId('');
  };

  const translateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200]
  });

  // State 1: Permission loading
  if (!permission) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text className="text-xs text-slate-400 mt-3 font-medium">Initializing camera...</Text>
      </View>
    );
  }

  // State 2: Permission not granted
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center p-8">
        <View className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 items-center justify-center mb-5 shadow-lg">
          <CameraIcon color="#38bdf8" />
        </View>
        <Text className="text-xl font-black text-white text-center">Camera Access Needed</Text>
        <Text className="text-xs text-slate-400 text-center mt-2 max-w-xs leading-5">
          Allow camera access to point your phone directly at book QR labels on the library shelves.
        </Text>

        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          className="mt-6 w-full max-w-xs py-3.5 bg-sky-600 rounded-2xl items-center justify-center shadow-lg"
        >
          <Text className="text-sm font-bold text-white">Enable Camera Access</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setManualInputOpen(true);
            setScanned(true);
          }}
          className="mt-4 py-2 px-4 rounded-xl"
        >
          <Text className="text-xs font-semibold text-slate-400">Or enter book ID manually</Text>
        </Pressable>
      </View>
    );
  }

  // State 3: Direct Fullscreen Camera Viewfinder
  return (
    <View className="flex-1 bg-black relative">
      {/* Direct Camera Surface */}
      <CameraView
        style={{ width: '100%', height: '100%' }}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={BARCODE_SETTINGS}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Floating Top Header Bar */}
      <View
        style={{ paddingTop: Math.max(insets.top, 20) }}
        className="absolute top-0 left-0 right-0 px-5 pb-3 flex-row items-center justify-between z-20"
      >
        <View className="flex-row items-center bg-slate-900/80 border border-slate-700/60 px-3.5 py-1.5 rounded-full backdrop-blur-md">
          <View className={`w-2 h-2 rounded-full mr-2 ${scanned ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <Text className="text-xs font-bold text-white tracking-wide">
            {scanned ? 'QR Code Detected' : 'Live Camera Active'}
          </Text>
        </View>

        <View className="flex-row items-center space-x-2">
          {/* Torch Toggle */}
          <Pressable
            onPress={() => setTorch(!torch)}
            hitSlop={8}
            className={`w-10 h-10 rounded-full items-center justify-center border mr-2 ${
              torch ? 'bg-amber-500/20 border-amber-400' : 'bg-slate-900/80 border-slate-700'
            }`}
          >
            <TorchIcon on={torch} />
          </Pressable>

          {/* Manual ID Input Toggle */}
          <Pressable
            onPress={() => setManualInputOpen(!manualInputOpen)}
            hitSlop={8}
            className={`w-10 h-10 rounded-full items-center justify-center border ${
              manualInputOpen ? 'bg-sky-500/20 border-sky-400' : 'bg-slate-900/80 border-slate-700'
            }`}
          >
            <KeyboardIcon active={manualInputOpen} />
          </Pressable>
        </View>
      </View>

      {/* Manual ID Input Drawer (If toggled) */}
      {manualInputOpen && (
        <View
          style={{ top: Math.max(insets.top, 20) + 52 }}
          className="absolute left-5 right-5 z-30 bg-slate-900/95 border border-slate-700 p-4 rounded-2xl shadow-2xl"
        >
          <Text className="text-xs font-bold text-slate-300 mb-2">Enter Book Copy ID</Text>
          <View className="flex-row items-center">
            <TextInput
              placeholder="e.g. LIB1:CS01-1"
              placeholderTextColor="#64748b"
              value={typedId}
              onChangeText={setTypedId}
              autoCapitalize="characters"
              className="flex-1 bg-slate-800 border border-slate-700 text-white font-mono px-3 py-2 rounded-xl text-xs mr-2"
            />
            <Pressable
              onPress={handleManualSubmit}
              className="py-2 px-3.5 bg-sky-600 rounded-xl items-center justify-center"
            >
              <Text className="text-xs font-bold text-white">Find</Text>
            </Pressable>
          </View>

          {/* Quick Book ID Chips */}
          <View className="flex-row items-center mt-3 flex-wrap">
            {['LIB1:CS01-1', 'LIB1:EC01-1', 'LIB1:ME01-1'].map((chipId) => (
              <Pressable
                key={chipId}
                onPress={() => {
                  setTypedId(chipId);
                  setScanned(true);
                  setManualInputOpen(false);
                  processBarcode(chipId);
                }}
                className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg mr-2 mb-1"
              >
                <Text className="text-[10px] font-mono text-slate-300 font-bold">{chipId}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Center Camera Reticle */}
      {!detectedBook && (
        <View pointerEvents="box-none" className="flex-1 items-center justify-center">
          {/* Target Reticle 220x220 */}
          <View className="w-56 h-56 relative items-center justify-center">
            {/* 4 Corner Markers */}
            <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-400 rounded-tl-xl" />
            <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-400 rounded-tr-xl" />
            <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-400 rounded-bl-xl" />
            <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-400 rounded-br-xl" />

            {/* Animated Laser Beam */}
            <Animated.View
              pointerEvents="none"
              style={{
                transform: [{ translateY }],
                position: 'absolute',
                left: 10,
                right: 10,
                top: 10,
                height: 2,
                backgroundColor: '#38bdf8',
                shadowColor: '#38bdf8',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 8
              }}
            />

            {/* Quick Emulator Test Tap Target */}
            <Pressable
              onPress={() => {
                setScanned(true);
                processBarcode('LIB1:CS01-1');
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 0.4 }]}
              className="px-3 py-1.5 rounded-full bg-slate-900/60 border border-sky-400/40"
            >
              <Text className="text-[10px] font-mono font-bold text-sky-300">
                Tap to Test (LIB1:CS01-1)
              </Text>
            </Pressable>
          </View>

          <Text className="text-xs font-semibold text-slate-300 mt-4 tracking-wide text-center">
            Align book QR label inside viewfinder
          </Text>
        </View>
      )}

      {/* Detected Book Result Card (Bottom Floating Sheet) */}
      {detectedBook && (
        <View
          style={{ bottom: 100 }}
          className="absolute left-4 right-4 z-40 bg-white/95 border border-slate-200 p-5 rounded-3xl shadow-2xl backdrop-blur-md"
        >
          {/* Header Row */}
          <View className="flex-row items-center justify-between pb-2 border-b border-slate-100">
            <View className="flex-row items-center flex-1 mr-2">
              <CheckCircleIcon color="#0284c7" />
              <Text className="text-xs font-bold text-sky-800 ml-1.5 uppercase tracking-wide">
                Book Verified
              </Text>
            </View>
            <View className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
              <Text className="text-[10px] font-mono font-bold text-slate-700">{detectedBook.id}</Text>
            </View>
          </View>

          {/* Book Details */}
          <Text className="text-base font-black text-slate-900 mt-2.5" numberOfLines={1}>
            {detectedBook.title}
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
            by {detectedBook.author}
          </Text>
          <Text className="text-xs text-slate-600 mt-1">
            Shelf: <Text className="font-bold text-slate-800">{detectedBook.shelfId}</Text> (Row {detectedBook.row}) • {detectedBook.category}
          </Text>

          {/* Status & Actions */}
          {activeRequest?.status === 'approved' ? (
            <View className="mt-3.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <Text className="text-xs font-bold text-emerald-800">Borrowing Pass Approved!</Text>
              <Text className="text-[11px] text-emerald-700 mt-0.5">
                Pass: <Text className="font-mono font-bold">{activeRequest.billId}</Text> • Return by {activeRequest.dueDate}
              </Text>
              <Pressable
                onPress={onSuccessCheckout}
                className="w-full mt-2.5 py-2.5 bg-emerald-700 rounded-xl items-center justify-center"
              >
                <Text className="text-xs font-bold text-white">View in Collections</Text>
              </Pressable>
            </View>
          ) : detectedBook.status === 'borrowed' ? (
            <View className="mt-3.5 p-3 rounded-2xl bg-rose-50 border border-rose-200">
              <Text className="text-xs font-bold text-rose-800">Copy Unavailable</Text>
              <Text className="text-[11px] text-rose-700 mt-0.5">
                On loan until {detectedBook.unavailableUntil || 'return'}.
              </Text>
              <Pressable
                onPress={handleScanAnother}
                className="w-full mt-2 py-2 bg-slate-800 rounded-xl items-center"
              >
                <Text className="text-xs font-bold text-white">Scan Another</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row items-center mt-4">
              <Pressable
                onPress={handleBorrowBook}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="flex-1 py-3 bg-slate-900 rounded-xl items-center justify-center mr-2 shadow-xs"
              >
                <Text className="text-xs font-bold text-white">Borrow This Book</Text>
              </Pressable>

              <Pressable
                onPress={handleScanAnother}
                className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl items-center"
              >
                <Text className="text-xs font-bold text-slate-700">Rescan</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
};
