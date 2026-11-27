import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, TextInput, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LightSensor } from 'expo-sensors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { LibraryApiService } from '../services/api';
import { LendingService } from '../services/lendingService';
import {
  ScannedBookBottomCard,
  PendingBorrowBottomBar,
  BulkBorrowBillModal
} from '../components/BorrowBillOverlay';
import { Book, ActiveRequest } from '../types';

interface QRScannerScreenProps {
  onSuccessCheckout: () => void;
}

const BARCODE_SETTINGS = {
  barcodeTypes: ['qr' as const]
};

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
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="3"
      stroke={active ? '#38bdf8' : '#e2e8f0'}
      strokeWidth={2}
    />
    <Path
      d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8"
      stroke={active ? '#38bdf8' : '#e2e8f0'}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const SearchGlassIcon: React.FC<{ color?: string }> = ({ color = '#1e293b' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={1.6} />
    <Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const VideoStatusIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect
      x="2"
      y="6"
      width="14"
      height="12"
      rx="2.5"
      stroke={color}
      strokeWidth={2.2}
      fill={color}
      fillOpacity={0.22}
    />
    <Path
      d="M16 10l5-3v10l-5-3v-4z"
      stroke={color}
      strokeWidth={2.2}
      strokeLinejoin="round"
      fill={color}
      fillOpacity={0.22}
    />
  </Svg>
);

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({ onSuccessCheckout }) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [lightLevel, setLightLevel] = useState<'good' | 'dim' | 'dark'>('good');
  const [scanned, setScanned] = useState(false);
  const [detectedBook, setDetectedBook] = useState<Book | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [typedId, setTypedId] = useState('');

  // Bulk Borrow Session Bill State
  const [sessionRequests, setSessionRequests] = useState<ActiveRequest[]>([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const syncSessionRequests = async () => {
      if (sessionRequests.length === 0 || showSuccessAnimation) return;
      const allReqs = await LendingService.getAllActiveRequests();
      const updatedList = sessionRequests.map(
        (sr) => allReqs.find((r) => r.id === sr.id) || sr
      );
      setSessionRequests(updatedList);

      const allResolved = updatedList.every((r) => r.status !== 'pending');
      if (allResolved) {
        setShowBillModal(true);
        setShowSuccessAnimation(true);
        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = setTimeout(() => {
          setShowSuccessAnimation(false);
          setShowBillModal(false);
          setSessionRequests([]);
          onSuccessCheckout();
        }, 1800);
      }
    };

    const unsubLending = LendingService.subscribe(() => {
      syncSessionRequests();
    });

    return () => {
      unsubLending();
    };
  }, [sessionRequests, showSuccessAnimation, onSuccessCheckout]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let subscription: { remove: () => void } | null = null;
    let mounted = true;

    LightSensor.isAvailableAsync()
      .then((available) => {
        if (!available || !mounted) return;
        LightSensor.setUpdateInterval(500);
        subscription = LightSensor.addListener(({ illuminance }) => {
          if (illuminance < 5) {
            setLightLevel('dark');
          } else if (illuminance < 30) {
            setLightLevel('dim');
          } else {
            setLightLevel('good');
          }
        });
      })
      .catch(() => {});

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const processBarcode = async (rawData: string) => {
    setScanError(null);
    let clean = rawData.trim();
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        if (parsed.id) clean = parsed.id;
      } catch {}
    }

    const matched = await LibraryApiService.getBookById(clean);
    if (!matched) {
      setDetectedBook(null);
      setScanError(`No book copy found for ID "${clean}".`);
      return;
    }

    setDetectedBook(matched);
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

  const handleBorrowBook = async () => {
    if (!detectedBook || isSubmitting) return;
    setScanError(null);
    setIsSubmitting(true);
    try {
      const req = await LendingService.submitBorrowRequest(detectedBook);
      setSessionRequests((prev) => {
        if (prev.some((r) => r.id === req.id)) return prev;
        return [...prev, req];
      });
      setDetectedBook(null);
      setTypedId('');
      setShowBillModal(true);
    } catch (err: any) {
      setScanError(err?.message || 'Unable to submit borrow request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRescan = () => {
    setScanned(false);
    setDetectedBook(null);
    setScanError(null);
    setTypedId('');
  };

  const handleAddMoreBooks = () => {
    setShowBillModal(false);
    setScanned(false);
    setDetectedBook(null);
    setScanError(null);
    setTypedId('');
  };

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
        <View className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 items-center justify-center mb-5 shadow-lg">
          <CameraIcon color="#38bdf8" />
        </View>
        <Text className="text-xl font-black text-white text-center">Camera Access Needed</Text>
        <Text className="text-xs text-slate-400 text-center mt-2 max-w-xs leading-5">
          Allow camera access to point your phone directly at book QR labels on the library shelves.
        </Text>

        <Pressable
          onPress={requestPermission}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          className="mt-6 w-full max-w-xs py-3.5 bg-sky-600 rounded-xl items-center justify-center shadow-lg"
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
        {/* Lighting / Camera Status: Automatic ambient light indicator */}
        <View className="flex-row items-center">
          <View
            style={
              lightLevel === 'good'
                ? undefined
                : {
                    shadowColor: lightLevel === 'dark' ? '#ef4444' : '#facc15',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.95,
                    shadowRadius: 10
                  }
            }
          >
            <VideoStatusIcon
              color={
                lightLevel === 'dark'
                  ? '#ef4444'
                  : lightLevel === 'dim'
                  ? '#facc15'
                  : '#22c55e'
              }
            />
          </View>
          {lightLevel !== 'good' && (
            <Text className="text-xs font-bold ml-2 text-white">
              Use torch for better visibility
            </Text>
          )}
        </View>

        {/* Bare Floating Icons (No enclosing circles) */}
        <View className="flex-row items-center">
          <Pressable
            onPress={() => setTorch(!torch)}
            hitSlop={12}
            className="p-2 mr-3"
          >
            <TorchIcon on={torch} />
          </Pressable>

          <Pressable
            onPress={() => setManualInputOpen(!manualInputOpen)}
            hitSlop={12}
            className="p-2"
          >
            <KeyboardIcon active={manualInputOpen} />
          </Pressable>
        </View>
      </View>

      {/* Minimalist Grey Textbox + Light-Blue Magnifying Glass Button */}
      {manualInputOpen && (
        <View
          style={{ top: Math.max(insets.top, 20) + 50 }}
          className="absolute left-5 right-5 z-30 flex-row items-center"
        >
          <TextInput
            placeholder="Enter Book Copy ID"
            placeholderTextColor="#cbd5e1"
            value={typedId}
            onChangeText={setTypedId}
            autoCapitalize="characters"
            className="flex-1 bg-slate-700/90 border border-slate-600/70 text-white font-mono px-3.5 py-2.5 rounded-lg text-xs mr-2 shadow-lg"
          />
          <Pressable
            onPress={handleManualSubmit}
            style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            className="w-10 h-10 bg-sky-300/80 rounded-lg items-center justify-center shadow-lg"
          >
            <SearchGlassIcon color="#1e293b" />
          </Pressable>
        </View>
      )}

      {/* Bigger Corner-Only Translucent Light-Blue Viewfinder (No Tint, No Text, No Animation) */}
      {!detectedBook && (
        <View
          pointerEvents="box-none"
          className="absolute inset-0 items-center justify-center pb-16"
        >
          <View pointerEvents="none" className="w-72 h-72 relative">
            <View className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-sky-300/80 rounded-tl-md" />
            <View className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-sky-300/80 rounded-tr-md" />
            <View className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-sky-300/80 rounded-bl-md" />
            <View className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-sky-300/80 rounded-br-md" />
          </View>

          {scanError && (
            <View className="mt-5 mx-6 px-4 py-3 rounded-xl bg-rose-950/90 border border-rose-500/50 items-center">
              <Text className="text-xs font-bold text-rose-200 text-center">{scanError}</Text>
              <Pressable onPress={handleRescan} className="mt-2 px-3 py-1 rounded-lg bg-rose-800">
                <Text className="text-[11px] font-bold text-white">Try Again</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Scanned Book Bottom Card */}
      {detectedBook && (
        <ScannedBookBottomCard
          book={detectedBook}
          errorMessage={scanError}
          isSubmitting={isSubmitting}
          onBorrow={handleBorrowBook}
          onRescan={handleRescan}
        />
      )}

      {/* Compact Pending Approval Bottom Bar (Shown when requests exist & not scanning a new card) */}
      {!detectedBook && sessionRequests.length > 0 && !showSuccessAnimation && (
        <PendingBorrowBottomBar
          onAddMore={handleAddMoreBooks}
          onOpenBill={() => setShowBillModal(true)}
        />
      )}

      {/* Center Bulk Borrow Bill + Pastel Green Payment Success Animation */}
      <BulkBorrowBillModal
        visible={showBillModal}
        requests={sessionRequests}
        showSuccessAnimation={showSuccessAnimation}
        onAddMore={handleAddMoreBooks}
      />
    </View>
  );
};
