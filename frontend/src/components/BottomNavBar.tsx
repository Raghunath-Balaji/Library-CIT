import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

export type NavTab = 'home' | 'collections' | 'scanner' | 'profile';

interface BottomNavBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

// Clean Vector SVG Icons (Zero Emojis) - Outlined when inactive, filled when active
const HomeIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z"
      stroke={active ? '#0284c7' : '#475569'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? '#0284c7' : 'none'}
    />
    {active && (
      <Path
        d="M9 21v-6h6v6"
        stroke="#ffffff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </Svg>
);

const CollectionsIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
      stroke={active ? '#0284c7' : '#475569'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? '#0284c7' : 'none'}
    />
    <Path
      d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
      stroke={active ? '#ffffff' : '#475569'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8.5 7h7M8.5 11h5"
      stroke={active ? '#ffffff' : '#475569'}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);

const ScannerIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"
      stroke={active ? '#0284c7' : '#475569'}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Rect
      x="7"
      y="7"
      width="10"
      height="10"
      rx="2"
      stroke={active ? '#0284c7' : '#475569'}
      strokeWidth={2}
      fill={active ? '#0284c7' : 'none'}
    />
  </Svg>
);

const ProfileIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2z"
      stroke={active ? '#0284c7' : '#475569'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? '#0284c7' : 'none'}
    />
    <Path
      d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
      stroke={active ? '#0284c7' : '#475569'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? '#0284c7' : 'none'}
    />
  </Svg>
);

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: NavTab; label: string; icon: React.FC<{ active: boolean }> }[] = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'collections', label: 'Collections', icon: CollectionsIcon },
    { id: 'scanner', label: 'Scan QR', icon: ScannerIcon },
    { id: 'profile', label: 'Profile', icon: ProfileIcon }
  ];

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 1000
      }}
    >
      <View
        pointerEvents="auto"
        style={{
          elevation: 10,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 16
        }}
        className="flex-row items-center justify-around bg-white px-3 py-2 rounded-full border border-slate-300 w-full max-w-md"
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              hitSlop={16}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              className="flex-col items-center justify-center py-1.5 px-3 bg-transparent"
            >
              <Icon active={isActive} />
              <Text
                className={`text-[10px] mt-1 font-bold ${
                  isActive ? 'text-sky-800' : 'text-slate-600'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};
