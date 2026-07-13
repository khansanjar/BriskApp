import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  clearToken,
  clearUser,
  getToken,
  getUser,
  saveToken,
  saveUser,
} from '@/lib/storage';
import {
  login as apiLogin,
  setUnauthorizedHandler,
  type LoginResponse,
  type User,
} from '@/lib/api';

interface Session {
  user: User;
  token: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithResponse: (data: LoginResponse) => Promise<void>;
  signOut: () => Promise<void>;
  updateLocalUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [token, user] = await Promise.all([getToken(), getUser<User>()]);
        if (active && token && user) {
          setSession({ token, user });
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signInWithResponse = useCallback(async (data: LoginResponse) => {
    await Promise.all([saveToken(data.token), saveUser(data.user)]);
    setSession({ token: data.token, user: data.user });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    await signInWithResponse(data);
  }, [signInWithResponse]);

  const signOut = useCallback(async () => {
    await Promise.all([clearToken(), clearUser()]);
    setSession(null);
  }, []);

  const updateLocalUser = useCallback(async (user: User) => {
    await saveUser(user);
    setSession((prev) => (prev ? { ...prev, user } : prev));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await Promise.all([clearToken(), clearUser()]);
      setSession(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      token: session?.token ?? null,
      isLoading,
      signIn,
      signInWithResponse,
      signOut,
      updateLocalUser,
    }),
    [session, isLoading, signIn, signOut, updateLocalUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
