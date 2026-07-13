
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { Colors } from '@/constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';
type ResolvedScheme = 'light' | 'dark';
type ThemeColors = (typeof Colors)[ResolvedScheme];

interface ThemeModeValue {
  mode: ThemeMode;
  resolvedScheme: ResolvedScheme;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const DEFAULT: ThemeModeValue = {
  mode: 'system',
  resolvedScheme: 'light',
  colors: Colors.light,
  setMode: () => {},
};

const ThemeModeContext = createContext<ThemeModeValue | null>(null);
const STORAGE_KEY = 'theme_mode';

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (active && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        setModeState(saved);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const resolvedScheme: ResolvedScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = Colors[resolvedScheme];

  const value = useMemo<ThemeModeValue>(
    () => ({ mode, resolvedScheme, colors, setMode }),
    [mode, resolvedScheme, colors, setMode]
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode(): ThemeModeValue {
  return useContext(ThemeModeContext) ?? DEFAULT;
}
