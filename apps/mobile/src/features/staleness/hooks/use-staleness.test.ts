import { renderHook } from '@testing-library/react-native';
import { useStaleness } from './use-staleness';

describe('useStaleness', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-10T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns fresh state when dataUpdatedAt is undefined', () => {
    const { result } = renderHook(() => useStaleness(undefined));

    expect(result.current).toEqual({
      level: 'fresh',
      label: '',
      isStale: false,
    });
  });

  it('returns fresh state for recent data', () => {
    // 3 minutes ago
    const recentTime = new Date('2024-01-10T11:57:00Z').getTime();
    const { result } = renderHook(() => useStaleness(recentTime));

    expect(result.current.level).toBe('fresh');
    expect(result.current.isStale).toBe(false);
  });

  it('returns stale state for old data', () => {
    // 2 days ago
    const oldTime = new Date('2024-01-08T12:00:00Z').getTime();
    const { result } = renderHook(() => useStaleness(oldTime));

    expect(result.current.level).not.toBe('fresh');
    expect(result.current.isStale).toBe(true);
    expect(result.current.label).toBeTruthy();
  });

  it('recalculates when dataUpdatedAt changes', () => {
    const recentTime = new Date('2024-01-10T11:57:00Z').getTime();
    const { result, rerender } = renderHook(
      (time) => useStaleness(time),
      { initialProps: recentTime }
    );

    expect(result.current.level).toBe('fresh');

    const oldTime = new Date('2024-01-08T12:00:00Z').getTime();
    rerender(oldTime);

    expect(result.current.level).not.toBe('fresh');
    expect(result.current.isStale).toBe(true);
  });

  it('handles null dataUpdatedAt like undefined', () => {
    const { result } = renderHook(() => useStaleness(null as any));

    expect(result.current).toEqual({
      level: 'fresh',
      label: '',
      isStale: false,
    });
  });
});
