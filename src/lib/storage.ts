import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'brisk_api_token';
const USER_KEY = 'brisk_api_user';

function isWeb() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function webGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function webSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function webRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export async function saveToken(token: string): Promise<void> {
  if (isWeb()) {
    webSet(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (isWeb()) {
    return webGet(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  if (isWeb()) {
    webRemove(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveUser(user: unknown): Promise<void> {
  if (isWeb()) {
    webSet(USER_KEY, JSON.stringify(user));
    return;
  }
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser<T = unknown>(): Promise<T | null> {
  if (isWeb()) {
    const raw = webGet(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function clearUser(): Promise<void> {
  if (isWeb()) {
    webRemove(USER_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(USER_KEY);
}
