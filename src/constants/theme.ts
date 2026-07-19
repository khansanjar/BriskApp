/**
 * Colors used across the app. Each variant defines both light and dark values.
 * Semantic keys (surface, border, brand, success, warning, danger) keep the UI
 * consistent and easy to re-theme.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2A2653',
    textSecondary: '#6B6790',
    background: '#F5F4FC',
    backgroundElement: '#EDEAFB',
    backgroundSelected: '#E0E7FF',
    surface: '#FFFFFF',
    surfaceSecondary: '#F2F0FD',
    border: '#E4E1F5',
    brand: '#3D3796',
    brandSoft: '#E0E7FF',
    brandText: '#FFFFFF',
    primaryLight: '#6B62C7',
    success: '#22C55E',
    successSoft: '#E3F9EC',
    warning: '#F59E0B',
    warningSoft: '#FDF0DA',
    danger: '#EF4444',
    dangerSoft: '#FCE4E4',
  },
  dark: {
    text: '#EDEBFA',
    textSecondary: '#A39DC9',
    background: '#15132B',
    backgroundElement: '#211D44',
    backgroundSelected: '#2A2656',
    surface: '#1E1B3D',
    surfaceSecondary: '#262347',
    border: '#2E2A54',
    brand: '#7C74E0',
    brandSoft: '#2A2656',
    brandText: '#FFFFFF',
    primaryLight: '#9D96EA',
    success: '#34D399',
    successSoft: '#16281F',
    warning: '#FBBF24',
    warningSoft: '#2E2713',
    danger: '#F87171',
    dangerSoft: '#2E1B1F',
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
  missed: { label: 'Missed', tone: 'danger' },
};
