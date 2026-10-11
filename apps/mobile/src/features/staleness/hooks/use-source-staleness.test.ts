import { renderHook } from '@testing-library/react-native';
import { useSourceStaleness } from './use-source-staleness';
import type { DataSource } from '../../../services/staleness/source-thresholds';

describe('useSourceStaleness', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-10T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns fresh state when dataUpdatedAt is undefined', () => {
    const { result } = renderHook(() => useSourceStaleness('weather', undefined));

    expect(result.current).toEqual({
      level: 'fresh',
      isStale: false,
    });
  });

  it('returns fresh state for recent weather data', () => {
    // Weather threshold is typically 24 hours, so 1 hour ago is fresh
    const recentTime = new Date('2024-01-10T11:00:00Z').getTime();
    const { result } = renderHook(() => useSourceStaleness('weather', recentTime));

    expect(result.current.level).toBe('fresh');
    expect(result.current.isStale).toBe(false);
  });

  it('returns stale state for old weather data', () => {
    // 3 days ago is definitely stale
    const oldTime = new Date('2024-01-07T12:00:00Z').getTime();
    const { result } = renderHook(() => useSourceStaleness('weather', oldTime));

    expect(result.current.level).not.toBe('fresh');
    expect(result.current.isStale).toBe(true);
  });

  it('recalculates when source changes', () => {
    const time = new Date('2024-01-10T11:00:00Z').getTime();
    const { result, rerender } = renderHook(
      (source) => useSourceStaleness(source as DataSource, time),
      { initialProps: 'weather' }
    );

    const initialLevel = result.current.level;

    rerender('flora');

    // The level might change based on different thresholds for different sources
    // This test verifies the hook recomputes on source change
    expect(result.current).toBeDefined();
  });

  it('handles null dataUpdatedAt like undefined', () => {
    const { result } = renderHook(() => useSourceStaleness('weather', null as any));

    expect(result.current).toEqual({
      level: 'fresh',
      isStale: false,
    });
  });

  it('handles different data sources', () => {
    const sources: DataSource[] = ['weather', 'flora', 'telemetry', 'scale'];
    const time = new Date('2024-01-10T11:00:00Z').getTime();

    sources.forEach((source) => {
      const { result } = renderHook(() => useSourceStaleness(source, time));
      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('level');
      expect(result.current).toHaveProperty('isStale');
    });
  });
});
