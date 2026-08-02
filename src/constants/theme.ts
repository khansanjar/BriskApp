/**
 * Colors used across the app. Each variant defines both light and dark values.
 * Semantic keys (surface, border, brand, success, warning, danger) keep the UI
 * consistent and easy to re-theme.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1917',            // Deep warm dark text
    textSecondary: '#716A62',   // Muted slate gray
    background: '#F9F8F5',      // Soft off-white
    backgroundElement: '#EFECE6',
    backgroundSelected: '#FDF6E2', // Light gold tinted background
    surface: '#FFFFFF',
    surfaceSecondary: '#FAF8F5',
    border: '#E7E3DA',
    brand: '#F0C75E',          // Primary Gold
    brandSoft: '#FDF3D8',      // Soft gold container tint
    brandText: '#121110',      // Dark text for high contrast on primary gold buttons
    primaryLight: '#D1A333',   // Richer golden accent
    success: '#16A34A',
    successSoft: '#E8F5E9',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
    tabBarBackground: '#F0C75E',
    tabBarIcon: '#10375C',
  },
  dark: {
    text: '#F5F4F0',            // Off-white text
    textSecondary: '#A19B91',   // Soft warm muted gray
    background: '#121110',      // Rich dark charcoal background
    backgroundElement: '#1E1C1A',
    backgroundSelected: '#2A261D',
    surface: '#181715',
    surfaceSecondary: '#24221E',
    border: '#2E2B26',
    brand: '#F0C75E',          // Primary Gold highlight
    brandSoft: '#332B15',      // Subtle dark gold tint
    brandText: '#121110',      // Dark text for gold buttons
    primaryLight: '#F4D685',   // Soft pastel gold accent
    success: '#34D399',
    successSoft: '#122A21',
    warning: '#FBBF24',
    warningSoft: '#2C2311',
    danger: '#F87171',
    dangerSoft: '#2D1919',
    tabBarBackground: '#10375C',
    tabBarIcon: '#F0C75E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const TAB_BAR_BOTTOM_OFFSET = 8;
export const TAB_BAR_HEIGHT = 64;
export const MaxContentWidth = 800;

export const DriverStatusMeta: Record<
  string,
  { label: string; tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  assigned: { label: 'Assigned', tone: 'neutral' },
  heading_to_pickup: { label: 'On the way', tone: 'brand' },
  arrived: { label: 'Arrived', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  canceled: { label: 'Canceled', tone: 'danger' },
  missed: { label: 'Missed', tone: 'danger' },
};