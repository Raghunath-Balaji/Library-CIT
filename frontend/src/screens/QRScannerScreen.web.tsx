import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
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

const SearchGlassIcon: React.FC<{ color?: string }> = ({ color = '#1e293b' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={1.6} />
    <Path d="M20 20l-3.5-3.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const ShutterIcon: React.FC<{ color?: string }> = ({ color = '#ffffff' }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    <Circle cx="12" cy="12" r="4" fill={color} />
  </Svg>
);

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({ onSuccessCheckout }) => {
  const [detectedBook, setDetectedBook] = useState<Book | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [typedId, setTypedId] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [lightLevel, setLightLevel] = useState<'good' | 'dim' | 'dark'>('good');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Bulk Borrow Session Bill State
  const [sessionRequests, setSessionRequests] = useState<ActiveRequest[]>([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (!isLiveActive || typeof document === 'undefined') {
      setLightLevel('good');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    const interval = setInterval(() => {
      const video = videoElementRef.current;
      if (!ctx || !video || video.readyState < 2) return;
      try {
        ctx.drawImage(video, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        const avg = sum / (data.length / 4);
        if (avg < 25) {
          setLightLevel('dark');
        } else if (avg < 70) {
          setLightLevel('dim');
        } else {
          setLightLevel('good');
        }
      } catch {}
    }, 1000);

    return () => clearInterval(interval);
  }, [isLiveActive]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      stopCamera();
    };
  }, []);

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
      setStatusMessage('Live camera requires HTTPS or localhost. Use Enter ID instead.');
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

  const processBarcode = async (rawData: string) => {
    setStatusMessage(null);
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
      setStatusMessage(`No book copy found for ID "${clean}".`);
      return;
    }

    setDetectedBook(matched);
  };

  const handleBorrowBook = async () => {
    if (!detectedBook || isSubmitting) return;
    setStatusMessage(null);
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
      setStatusMessage(err?.message || 'Unable to submit borrow request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRescan = () => {
    setDetectedBook(null);
    setStatusMessage(null);
    setTypedId('');
  };

  const handleAddMoreBooks = () => {
    setShowBillModal(false);
    setDetectedBook(null);
    setStatusMessage(null);
    setTypedId('');
  };

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

      {/* Top Floating Control Row */}
      <View className="absolute top-6 left-5 right-5 z-20 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View
            style={
              lightLevel === 'good'
                ? undefined
                : ({
                    filter: `drop-shadow(0 0 8px ${
                      lightLevel === 'dark' ? '#ef4444' : '#facc15'
                    })`
                  } as any)
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
        onChange={() => {
          processBarcode('LIB1:CS01-1');
        }}
        style={{ display: 'none' }}
      />

      {/* Minimalist Grey Textbox + Light-Blue Magnifying Glass Button */}
      {manualInputOpen && (
        <View className="absolute top-16 left-5 right-5 z-30 flex-row items-center">
          <TextInput
            placeholder="Enter Book Copy ID"
            placeholderTextColor="#cbd5e1"
            value={typedId}
            onChangeText={setTypedId}
            className="flex-1 bg-slate-700/90 border border-slate-600/70 text-white font-mono px-3.5 py-2.5 rounded-lg text-xs mr-2 shadow-lg"
          />
          <Pressable
            onPress={() => {
              setManualInputOpen(false);
              processBarcode(typedId);
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            className="w-10 h-10 bg-sky-300/80 rounded-lg items-center justify-center shadow-lg"
          >
            <SearchGlassIcon color="#1e293b" />
          </Pressable>
        </View>
      )}

      {/* Bigger Corner-Only Translucent Light-Blue Viewfinder (No Tint, No Text, No Animation) */}
      {!detectedBook && (
        <View className="absolute inset-0 items-center justify-center pb-16">
          <View className="w-72 h-72 relative">
            <View className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-sky-300/80 rounded-tl-md" />
            <View className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-sky-300/80 rounded-tr-md" />
            <View className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-sky-300/80 rounded-bl-md" />
            <View className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-sky-300/80 rounded-br-md" />
          </View>

          {!isLiveActive && (
            <Pressable
              onPress={startLiveCamera}
              className="mt-5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700"
            >
              <Text className="text-xs font-bold text-slate-300">Start Live Webcam Stream</Text>
            </Pressable>
          )}

          {statusMessage && (
            <Text className="text-[11px] text-amber-300 mt-3 px-6 text-center">{statusMessage}</Text>
          )}
        </View>
      )}

      {/* Scanned Book Bottom Card */}
      {detectedBook && (
        <ScannedBookBottomCard
          book={detectedBook}
          errorMessage={statusMessage}
          isSubmitting={isSubmitting}
          onBorrow={handleBorrowBook}
          onRescan={handleRescan}
        />
      )}

      {/* Compact Pending Approval Bottom Bar */}
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
