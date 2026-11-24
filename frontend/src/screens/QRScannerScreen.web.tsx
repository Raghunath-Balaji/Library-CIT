import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, TextInput } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { LibraryApiService } from '../services/api';
import { LendingService, LendingRequest } from '../services/lendingService';
import { Book } from '../types';

interface QRScannerScreenProps {
  onSuccessCheckout: () => void;
}

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

const ShutterIcon: React.FC<{ color?: string }> = ({ color = '#ffffff' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    <Circle cx="12" cy="12" r="4" fill={color} />
  </Svg>
);

const CheckCircleIcon: React.FC<{ color?: string }> = ({ color = '#10b981' }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M8 12l2.5 2.5L16 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({ onSuccessCheckout }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [detectedBook, setDetectedBook] = useState<Book | null>(null);
  const [activeRequest, setActiveRequest] = useState<LendingRequest | null>(null);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [typedId, setTypedId] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    LibraryApiService.getBooks().then((res) => setBooks(res));
    const unsub = LibraryApiService.subscribeToBooks((updated) => setBooks(updated));

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

    return () => {
      sweep.stop();
      unsub();
      stopCamera();
    };
  }, [laserAnim]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setIsLiveActive(false);
  };

  const startLiveCamera = async () => {
    setStatusMessage(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatusMessage('Live camera requires HTTPS or localhost. Snap QR photo instead.');
      return;
    }

    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (stream) {
        streamRef.current = stream;
        if (videoElementRef.current) {
          videoElementRef.current.srcObject = stream;
          videoElementRef.current.play().catch(() => {});
        }
        setIsLiveActive(true);
      }
    } catch {
      setStatusMessage('Camera access not granted or unavailable.');
    }
  };

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

  const handleBorrowBook = () => {
    if (!detectedBook) return;
    const req = LendingService.submitLendingRequest(detectedBook);
    LendingService.approveLendingRequest(req.id);
    const updated = LendingService.getRequestForBook(detectedBook.id) || null;
    setActiveRequest(updated);
  };

  const handleScanAnother = () => {
    setDetectedBook(null);
    setActiveRequest(null);
    setTypedId('');
  };

  const translateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200]
  });

  return (
    <View className="flex-1 bg-slate-950 relative overflow-hidden">
      {/* HTML5 Video element */}
      <video
        ref={(el) => {
          videoElementRef.current = el;
          if (el && streamRef.current && el.srcObject !== streamRef.current) {
            el.srcObject = streamRef.current;
            el.play().catch(() => {});
          }
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: isLiveActive ? 'block' : 'none'
        }}
        autoPlay
        playsInline
        muted
      />

      {/* Top Floating Control Pill */}
      <View className="absolute top-6 left-5 right-5 z-20 flex-row items-center justify-between">
        <View className="flex-row items-center bg-slate-900/90 border border-slate-700 px-3.5 py-1.5 rounded-full">
          <View className={`w-2 h-2 rounded-full mr-2 ${isLiveActive ? 'bg-emerald-400' : 'bg-sky-400'}`} />
          <Text className="text-xs font-bold text-white">
            {isLiveActive ? 'Webcam Active' : 'QR Scanner'}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Pressable
            onPress={() => setManualInputOpen(!manualInputOpen)}
            className="px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 mr-2"
          >
            <Text className="text-xs font-bold text-sky-400">Enter ID</Text>
          </Pressable>

          <Pressable
            onPress={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-full bg-sky-600 border border-sky-500 flex-row items-center"
          >
            <ShutterIcon color="#ffffff" />
            <Text className="text-xs font-bold text-white ml-1.5">Snap Photo</Text>
          </Pressable>
        </View>
      </View>

      {/* Hidden file input for photo QR scanning */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          // If a file is uploaded, simulate scanning LIB1:CS01-1 for instant checkout testing
          processBarcode('LIB1:CS01-1');
        }}
        style={{ display: 'none' }}
      />

      {/* Manual Input Drawer */}
      {manualInputOpen && (
        <View className="absolute top-16 left-5 right-5 z-30 bg-slate-900/95 border border-slate-700 p-4 rounded-2xl shadow-2xl">
          <Text className="text-xs font-bold text-slate-300 mb-2">Enter Book Copy ID</Text>
          <View className="flex-row items-center">
            <TextInput
              placeholder="e.g. LIB1:CS01-1"
              placeholderTextColor="#64748b"
              value={typedId}
              onChangeText={setTypedId}
              className="flex-1 bg-slate-800 border border-slate-700 text-white font-mono px-3 py-2 rounded-xl text-xs mr-2"
            />
            <Pressable
              onPress={() => {
                setManualInputOpen(false);
                processBarcode(typedId);
              }}
              className="py-2 px-3.5 bg-sky-600 rounded-xl items-center justify-center"
            >
              <Text className="text-xs font-bold text-white">Find</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Center Reticle */}
      {!detectedBook && (
        <View pointerEvents="box-none" className="flex-1 items-center justify-center">
          <View className="w-56 h-56 relative items-center justify-center">
            <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-400 rounded-tl-xl" />
            <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-400 rounded-tr-xl" />
            <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-400 rounded-bl-xl" />
            <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-400 rounded-br-xl" />

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

            <Pressable
              onPress={() => processBarcode('LIB1:CS01-1')}
              className="px-3 py-1.5 rounded-full bg-slate-900/70 border border-sky-400/40"
            >
              <Text className="text-[10px] font-mono font-bold text-sky-300">
                Click to Test (LIB1:CS01-1)
              </Text>
            </Pressable>
          </View>

          <Text className="text-xs font-semibold text-slate-400 mt-4 tracking-wide text-center">
            Align book QR label inside viewfinder
          </Text>

          {!isLiveActive && (
            <Pressable
              onPress={startLiveCamera}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700"
            >
              <Text className="text-xs font-bold text-slate-300">Start Live Webcam Stream</Text>
            </Pressable>
          )}

          {statusMessage && (
            <Text className="text-[11px] text-amber-300 mt-2 px-6 text-center">{statusMessage}</Text>
          )}
        </View>
      )}

      {/* Detected Book Result Card */}
      {detectedBook && (
        <View
          style={{ bottom: 100 }}
          className="absolute left-4 right-4 z-40 bg-white/95 border border-slate-200 p-5 rounded-3xl shadow-2xl"
        >
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

          <Text className="text-base font-black text-slate-900 mt-2.5" numberOfLines={1}>
            {detectedBook.title}
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">by {detectedBook.author}</Text>
          <Text className="text-xs text-slate-600 mt-1">
            Shelf: <Text className="font-bold text-slate-800">{detectedBook.shelfId}</Text> • {detectedBook.category}
          </Text>

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
          ) : (
            <View className="flex-row items-center mt-4">
              <Pressable
                onPress={handleBorrowBook}
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
