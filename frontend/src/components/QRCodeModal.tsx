import React, { useMemo } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Book } from '../types';
import { generateQRCode } from '../services/qrEngine';

interface QRCodeModalProps {
  visible: boolean;
  book: Book | null;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ visible, book, onClose }) => {
  const qrMatrix = useMemo(() => {
    if (!book) return null;
    return generateQRCode(book.id);
  }, [book]);

  if (!book || !qrMatrix) return null;

  const svgSize = 200;
  const cellSize = svgSize / (qrMatrix.size + 4); // Include 2-module quiet zone padding

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <View className="w-full max-w-sm bg-white border border-slate-300 rounded-3xl p-6 items-center shadow-2xl">
          <View className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 mb-2">
            <Text className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">
              Physical Shelf Label QR
            </Text>
          </View>

          <Text className="text-base font-black text-slate-900 text-center mb-0.5" numberOfLines={2}>
            {book.title}
          </Text>
          <Text className="text-xs text-slate-500 mb-3">{book.author}</Text>

          {/* Authentic Scannable QR Matrix Code Container */}
          <View className="p-3 bg-white border-2 border-slate-900 rounded-2xl items-center justify-center my-1 shadow-sm">
            <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
              {/* White background */}
              <Rect x="0" y="0" width={svgSize} height={svgSize} fill="#ffffff" />
              {/* QR Modules with 2-cell quiet margin */}
              {qrMatrix.modules.map((row, r) =>
                row.map((isDark, c) => {
                  if (!isDark) return null;
                  return (
                    <Rect
                      key={`${r}-${c}`}
                      x={(c + 2) * cellSize}
                      y={(r + 2) * cellSize}
                      width={cellSize + 0.1}
                      height={cellSize + 0.1}
                      fill="#0f172a"
                    />
                  );
                })
              )}
            </Svg>
          </View>

          {/* Reference payload & Shelf Details */}
          <View className="bg-slate-100 px-3.5 py-1.5 rounded-lg mt-3 mb-1 border border-slate-300 flex-row items-center">
            <Text className="text-xs font-mono text-slate-900 font-bold tracking-wider">{book.id}</Text>
          </View>
          <Text className="text-[11px] text-slate-500 text-center mb-4">
            Shelf Bay: <Text className="font-bold text-slate-700">{book.shelfId}</Text> • Tier {book.row} • {book.category}
          </Text>

          <Pressable
            onPress={onClose}
            className="w-full py-3 bg-slate-900 rounded-xl items-center shadow-xs active:bg-slate-800"
          >
            <Text className="text-xs font-bold text-white uppercase tracking-wider">Close Label</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
