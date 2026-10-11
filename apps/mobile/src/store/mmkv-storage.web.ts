import type { StateStorage } from 'zustand/middleware';

/**
 * Web fallback for MMKV storage using localStorage.
 * MMKV is native-only; web uses localStorage for Zustand persistence.
 */
export const mmkvStorage: StateStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // localStorage quota exceeded or unavailable
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};
