/**
 * Colors used across the app. Each variant defines both light and dark values.
 * Semantic keys (surface, border, brand, success, warning, danger) keep the UI
 * consistent and easy to re-theme.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1220',
    textSecondary: '#5B6472',
    background: '#F4F6FA',
    backgroundElement: '#EDEFF4',
    backgroundSelected: '#E1E5EC',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F3F8',
    border: '#E3E7EF',
    brand: '#1E6BFF',
    brandSoft: '#E8F0FF',
    brandText: '#FFFFFF',
    success: '#16A34A',
    successSoft: '#E7F6EC',
    warning: '#C2740B',
    warningSoft: '#FBEFDD',
    danger: '#DC2626',
    dangerSoft: '#FBE9E9',
  },
  dark: {
    text: '#F2F5F9',
    textSecondary: '#9AA4B2',
    background: '#0A0E16',
    backgroundElement: '#151B25',
    backgroundSelected: '#1E2632',
    surface: '#131923',
    surfaceSecondary: '#1A212D',
    border: '#26303D',
    brand: '#3B82F6',
    brandSoft: '#16233B',
    brandText: '#FFFFFF',
    success: '#22C55E',
    successSoft: '#11261A',
    warning: '#F59E0B',
    warningSoft: '#2A2110',
    danger: '#EF4444',
    dangerSoft: '#2A1517',
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
  arrived: { label: 'Arrived', tone: 'brand' },
  in_progress: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  missed: { label: 'Missed', tone: 'danger' },
};
