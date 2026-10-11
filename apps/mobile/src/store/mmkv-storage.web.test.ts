/**
 * @jest-environment jsdom
 */
import { mmkvStorage } from './mmkv-storage.web';

describe('mmkvStorage (web localStorage fallback)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('setItem / getItem', () => {
    it('stores and retrieves a value', () => {
      mmkvStorage.setItem('test-key', 'test-value');
      expect(mmkvStorage.getItem('test-key')).toBe('test-value');
    });

    it('returns null for a key that does not exist', () => {
      expect(mmkvStorage.getItem('missing-key')).toBeNull();
    });

    it('overwrites an existing value', () => {
      mmkvStorage.setItem('key', 'first');
      mmkvStorage.setItem('key', 'second');
      expect(mmkvStorage.getItem('key')).toBe('second');
    });
  });

  describe('removeItem', () => {
    it('removes a stored value', () => {
      mmkvStorage.setItem('to-remove', 'value');
      mmkvStorage.removeItem('to-remove');
      expect(mmkvStorage.getItem('to-remove')).toBeNull();
    });

    it('does not throw when removing a key that does not exist', () => {
      expect(() => mmkvStorage.removeItem('nonexistent')).not.toThrow();
    });
  });

  describe('localStorage unavailable', () => {
    it('getItem returns null when localStorage throws', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
      expect(mmkvStorage.getItem('key')).toBeNull();
      jest.restoreAllMocks();
    });

    it('setItem does not throw when localStorage throws', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => mmkvStorage.setItem('key', 'value')).not.toThrow();
      jest.restoreAllMocks();
    });

    it('removeItem does not throw when localStorage throws', () => {
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
      expect(() => mmkvStorage.removeItem('key')).not.toThrow();
      jest.restoreAllMocks();
    });
  });
});
