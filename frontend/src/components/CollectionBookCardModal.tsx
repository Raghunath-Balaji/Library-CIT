import React from 'react';
import { View, Text, Modal, Pressable, Platform } from 'react-native';
import Svg, { Path, Rect, Line } from 'react-native-svg';
import { StudentLoan } from '../types';
import { formatDisplayDate, getLoanTimingInfo } from '../utils/dateUtils';

export interface PastelTheme {
  bg: string;
  spine: string;
  border: string;
  letter: string;
}

const PASTEL_PALETTE: PastelTheme[] = [
  // Pastel Red
  { bg: '#fecaca', spine: '#ef4444', border: '#fca5a5', letter: '#991b1b' },
  // Pastel Blue
  { bg: '#bae6fd', spine: '#0284c7', border: '#7dd3fc', letter: '#075985' },
  // Pastel Green
  { bg: '#bbf7d0', spine: '#059669', border: '#86efac', letter: '#065f46' }
];

export function getPastelBookTheme(index: number): PastelTheme {
  return PASTEL_PALETTE[index % PASTEL_PALETTE.length];
}

interface PastelBookCoverIconProps {
  title: string;
  theme: PastelTheme;
  size?: 'lg' | 'md';
  daysRemaining?: number;
  daysLate?: number;
  showBadge?: boolean;
  isPending?: boolean;
}

const TimerCoverIcon: React.FC<{ color?: string }> = ({ color = '#64748b' }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 8v5l3 2"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 22a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z"
      stroke={color}
      strokeWidth={2.2}
    />
    <Path d="M9.5 2h5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

/**
 * Pastel book icon with full pastel cover, dashed vertical binding seam,
 * first letter printed on cover (or timer icon when pending), and green/red badge.
 */
export const PastelBookCoverIcon: React.FC<PastelBookCoverIconProps> = ({
  title,
  theme,
  size = 'lg',
  daysRemaining = 0,
  daysLate = 0,
  showBadge = false,
  isPending = false
}) => {
  const firstLetter = (title.trim().charAt(0) || 'B').toUpperCase();
  const isLarge = size === 'lg';
  const width = isLarge ? 76 : 58;
  const height = isLarge ? 88 : 68;
  const seamX = isLarge ? 14 : 11;

  const isOverdue = daysLate > 0;
  const badgeNumber = isOverdue ? daysLate : Math.max(0, daysRemaining);

  const bgColor = isPending ? 'rgba(226, 232, 240, 0.45)' : theme.bg;
  const borderColor = isPending ? 'rgba(203, 213, 225, 0.55)' : theme.border;
  const seamColor = isPending ? '#cbd5e1' : theme.spine;

  return (
    <View className="relative" style={{ opacity: isPending ? 0.42 : 1 }}>
      <View
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          width,
          height
        }}
        className={`border overflow-hidden flex-row items-center ${
          isPending ? '' : 'shadow-sm'
        } ${isLarge ? 'rounded-lg' : 'rounded-md'}`}
      >
        {/* Dashed vertical binding seam running where binding & cover meet */}
        <View
          style={{ left: seamX, top: 0, bottom: 0 }}
          className="absolute justify-center"
        >
          <Svg width={2} height={height}>
            <Line
              x1="1"
              y1="4"
              x2="1"
              y2={height - 4}
              stroke={seamColor}
              strokeWidth={1.75}
              strokeDasharray="4,3"
              strokeLinecap="round"
            />
          </Svg>
        </View>

        {/* Cover Area: Timer icon when pending approval, otherwise First Letter */}
        <View style={{ paddingLeft: seamX }} className="flex-1 items-center justify-center">
          {isPending ? (
            <TimerCoverIcon color="#94a3b8" />
          ) : (
            <Text
              style={{ color: theme.letter }}
              className={isLarge ? 'text-3xl font-black' : 'text-2xl font-black'}
            >
              {firstLetter}
            </Text>
          )}
        </View>
      </View>

      {/* Green Circle (Days Left) or Red Circle (Overdue Days) */}
      {showBadge && !isPending && (
        <View
          className={`absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full border-2 border-white items-center justify-center shadow-sm ${
            isOverdue ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          <Text className="text-[10px] font-black text-white">{badgeNumber}</Text>
        </View>
      )}
    </View>
  );
};

const CalendarIcon: React.FC<{ color?: string }> = ({ color = '#475569' }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth={2} />
    <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const CloseXIcon: React.FC<{ color?: string }> = ({ color = '#ffffff' }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface CollectionBookCardModalProps {
  visible: boolean;
  loan: StudentLoan | null;
  theme: PastelTheme;
  description?: string;
  isBusy: boolean;
  onReturnBook: (loanId: string) => void;
  onClose: () => void;
}

export const CollectionBookCardModal: React.FC<CollectionBookCardModalProps> = ({
  visible,
  loan,
  theme,
  description,
  isBusy,
  onReturnBook,
  onClose
}) => {
  if (!loan) return null;

  const timing = getLoanTimingInfo(loan.issueDate, loan.dueDate);
  const statusHex =
    timing.statusColor === 'red'
      ? '#ef4444'
      : timing.statusColor === 'yellow'
      ? '#f59e0b'
      : '#10b981';

  const displayDescription =
    description?.trim() ||
    `Copy ${loan.bookId} shelved in ${loan.shelfId} (${loan.category}). Present this copy at the circulation desk when completing your return.`;

  const isReturnPending = loan.status === 'return_pending';
  const progressPercent = Math.round(timing.progressRatio * 100);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      {/* Blurred & slightly darkened background visible on all 4 sides */}
      <View
        style={
          Platform.OS === 'web'
            ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any)
            : undefined
        }
        className="flex-1 bg-slate-950/55 items-center justify-center p-6"
      >
        <View className="w-full max-w-sm">
          {/* Translucent Grey Circle X Close Button on Top-Left Right Above the Card */}
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
            className="w-9 h-9 rounded-full bg-slate-500/45 border border-white/25 items-center justify-center mb-3 self-start"
          >
            <CloseXIcon color="#ffffff" />
          </Pressable>

          {/* Main Floating Island Card (reduced corner rounding, taller vertical rhythm) */}
          <View className="w-full bg-white rounded-xl px-6 py-7 shadow-2xl border border-slate-200">
            {/* Top Row: Medium Book Icon (Top-Left) + Large Bold Black Title (2 lines max, no ellipsis) */}
            <View className="flex-row items-start">
              <View className="mr-4 mt-0.5">
                <PastelBookCoverIcon title={loan.bookTitle} theme={theme} size="md" />
              </View>

              <View className="flex-1">
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  className="text-lg font-black text-slate-950 leading-6"
                >
                  {loan.bookTitle}
                </Text>
                <Text className="text-xs font-medium text-slate-500 mt-1.5">
                  {loan.bookAuthor} • {loan.category}
                </Text>
              </View>
            </View>

            {/* Description: LESS horizontal padding than the divider line */}
            <Text className="px-0 pt-6 pb-2 text-xs text-slate-600 leading-5">
              {displayDescription}
            </Text>

            {/* Inset Divider Line: MORE side gap on both edges than description */}
            <View className="mx-8 h-[1px] bg-slate-200 my-5" />

            {/* Calendar + Start Date --[YouTube-style progress line + single dot]--> Due Date */}
            <View className="flex-row items-center my-2">
              <View className="flex-row items-center">
                <CalendarIcon color="#475569" />
                <Text className="text-[11px] font-bold text-slate-800 ml-1">
                  {formatDisplayDate(loan.issueDate)}
                </Text>
              </View>

              {/* Progress Track Between Start & End Dates with Single Scrubber Dot */}
              <View className="flex-1 mx-2.5 h-4 justify-center relative">
                <View className="h-1 bg-slate-200 rounded-full w-full overflow-hidden">
                  <View
                    style={{
                      backgroundColor: statusHex,
                      width: `${progressPercent}%`
                    }}
                    className="h-full rounded-full"
                  />
                </View>
                {/* Single YouTube-style scrubber dot */}
                <View
                  style={{
                    backgroundColor: statusHex,
                    left: `${Math.min(92, Math.max(4, progressPercent))}%`,
                    marginLeft: -6
                  }}
                  className="w-3 h-3 rounded-full absolute border border-white shadow-xs"
                />
              </View>

              <Text style={{ color: statusHex }} className="text-[11px] font-bold">
                {formatDisplayDate(loan.dueDate)}
              </Text>
            </View>

            {/* Generous space between calendar timeline and greyed-out fine bill */}
            <View className="mt-8 pt-5 border-t border-dashed border-slate-200">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text
                  numberOfLines={1}
                  className="text-[11px] font-mono text-slate-400 flex-1 mr-2"
                >
                  {loan.bookTitle}
                </Text>
                <Text className="text-[11px] font-mono text-slate-400">
                  ---------- {timing.daysLate} {timing.daysLate === 1 ? 'day' : 'days'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] font-mono text-slate-400">Total fine</Text>
                <Text className="text-[11px] font-mono font-bold text-slate-400">
                  ---------------- {timing.fineRupees} Rupees
                </Text>
              </View>
            </View>
          </View>

          {/* Return Book Button OUTSIDE the Main White Box (Red with White Text) */}
          <View className="mt-3.5 w-full">
            {isReturnPending ? (
              <View className="w-full py-3.5 rounded-xl bg-amber-500 items-center justify-center shadow-md">
                <Text className="text-xs font-bold text-white uppercase tracking-wider">
                  Return Pending Desk Verification
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => onReturnBook(loan.loanId)}
                disabled={isBusy}
                style={({ pressed }) => [{ opacity: pressed || isBusy ? 0.8 : 1 }]}
                className="w-full py-3.5 rounded-xl bg-rose-600 items-center justify-center shadow-md"
              >
                <Text className="text-xs font-bold text-white uppercase tracking-wider">
                  {isBusy ? 'Submitting Return...' : 'Return Book'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
