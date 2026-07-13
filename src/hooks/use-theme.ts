// src/hooks/use-theme.ts
// Returns the resolved color palette (light or dark) based on the user's
// theme-mode preference (system / light / dark). Components call `useTheme()`
// exactly as before — they just get the right tokens for the active mode.
import { Colors } from '@/constants/theme';
import { useThemeMode } from '@/theme/theme-context';

export function useTheme() {
  return useThemeMode().colors;
}
