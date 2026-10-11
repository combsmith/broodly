import { mmkvStorage } from '../src/store/mmkv-storage.web';

describe('mmkvStorage (web fallback using localStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('getItem', () => {
    it('returns stored value from localStorage', () => {
      const testKey = 'test-key';
      const testValue = 'test-value';
      localStorage.setItem(testKey, testValue);

      const result = mmkvStorage.getItem(testKey);
      expect(result).toBe(testValue);
    });

    it('returns null for non-existent keys', () => {
      const result = mmkvStorage.getItem('non-existent-key');
      expect(result).toBeNull();
    });

    it('returns null when localStorage throws', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const result = mmkvStorage.getItem('any-key');
      expect(result).toBeNull();
    });

    it('handles JSON serialized values', () => {
      const testKey = 'json-key';
      const testObject = { state: { user: 'john' } };
      localStorage.setItem(testKey, JSON.stringify(testObject));

      const result = mmkvStorage.getItem(testKey);
      expect(result).toBe(JSON.stringify(testObject));
    });

    it('returns empty string when stored', () => {
      localStorage.setItem('empty-key', '');
      const result = mmkvStorage.getItem('empty-key');
      expect(result).toBe('');
    });
  });

  describe('setItem', () => {
    it('stores value in localStorage', () => {
      mmkvStorage.setItem('test-key', 'test-value');
      const stored = localStorage.getItem('test-key');
      expect(stored).toBe('test-value');
    });

    it('overwrites existing values', () => {
      mmkvStorage.setItem('key', 'value1');
      mmkvStorage.setItem('key', 'value2');
      const stored = localStorage.getItem('key');
      expect(stored).toBe('value2');
    });

    it('handles empty strings', () => {
      mmkvStorage.setItem('empty', '');
      const stored = localStorage.getItem('empty');
      expect(stored).toBe('');
    });

    it('handles JSON strings', () => {
      const jsonValue = JSON.stringify({ state: 'test' });
      mmkvStorage.setItem('json-key', jsonValue);
      const stored = localStorage.getItem('json-key');
      expect(stored).toBe(jsonValue);
    });

    it('silently fails when localStorage quota exceeded', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        mmkvStorage.setItem('key', 'value');
      }).not.toThrow();
    });

    it('silently fails when localStorage is unavailable', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(() => {
        mmkvStorage.setItem('key', 'value');
      }).not.toThrow();
    });

    it('stores multiple key-value pairs independently', () => {
      mmkvStorage.setItem('key1', 'value1');
      mmkvStorage.setItem('key2', 'value2');
      mmkvStorage.setItem('key3', 'value3');

      expect(localStorage.getItem('key1')).toBe('value1');
      expect(localStorage.getItem('key2')).toBe('value2');
      expect(localStorage.getItem('key3')).toBe('value3');
    });
  });

  describe('removeItem', () => {
    it('removes item from localStorage', () => {
      localStorage.setItem('test-key', 'test-value');
      mmkvStorage.removeItem('test-key');
      const stored = localStorage.getItem('test-key');
      expect(stored).toBeNull();
    });

    it('handles removing non-existent keys without error', () => {
      expect(() => {
        mmkvStorage.removeItem('non-existent');
      }).not.toThrow();
    });

    it('silently fails when localStorage throws', () => {
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Access denied');
      });

      expect(() => {
        mmkvStorage.removeItem('key');
      }).not.toThrow();
    });

    it('removes only the specified item', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      localStorage.setItem('key3', 'value3');

      mmkvStorage.removeItem('key2');

      expect(localStorage.getItem('key1')).toBe('value1');
      expect(localStorage.getItem('key2')).toBeNull();
      expect(localStorage.getItem('key3')).toBe('value3');
    });

    it('is idempotent', () => {
      localStorage.setItem('key', 'value');
      mmkvStorage.removeItem('key');
      expect(() => {
        mmkvStorage.removeItem('key');
      }).not.toThrow();
    });
  });

  describe('integration', () => {
    it('handles complete get-set-remove cycle', () => {
      const key = 'integration-test';
      const value = 'integration-value';

      mmkvStorage.setItem(key, value);
      expect(mmkvStorage.getItem(key)).toBe(value);

      mmkvStorage.removeItem(key);
      expect(mmkvStorage.getItem(key)).toBeNull();
    });

    it('can be used as StateStorage for Zustand', () => {
      const testState = { user: 'john', role: 'admin' };
      const stateKey = 'app-state';

      mmkvStorage.setItem(stateKey, JSON.stringify(testState));
      const retrieved = mmkvStorage.getItem(stateKey);
      const parsedState = retrieved ? JSON.parse(retrieved) : null;

      expect(parsedState).toEqual(testState);
    });
  });
});
