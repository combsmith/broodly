import React from 'react';
import { render } from '@testing-library/react-native';
import { SourceStalenessIndicator } from './index';

jest.mock('../../../../services/staleness/source-thresholds', () => ({
  getSourceStalenessLevel: jest.fn((source, date) => {
    const now = new Date();
    const hoursDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (source === 'telemetry') {
      return hoursDiff > 1 ? (hoursDiff > 3 ? 'critical' : 'warning') : 'fresh';
    } else if (source === 'weather') {
      return hoursDiff > 24 ? (hoursDiff > 48 ? 'critical' : 'warning') : 'fresh';
    } else if (source === 'flora') {
      return hoursDiff > 168 ? (hoursDiff > 336 ? 'critical' : 'warning') : 'fresh';
    }
    return 'fresh';
  }),
}));

jest.mock('../../../../services/staleness/staleness-utils', () => ({
  getRelativeTimeLabel: jest.fn(() => '2 days ago'),
}));

describe('SourceStalenessIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-10T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null for fresh data', () => {
    const recentDate = new Date('2024-01-10T11:30:00Z');
    const { toJSON } = render(
      <SourceStalenessIndicator source="weather" dataUpdatedAt={recentDate} />
    );

    expect(toJSON()).toBeNull();
  });

  it('renders warning indicator for stale data', () => {
    const staleDate = new Date('2024-01-08T12:00:00Z');
    const { getByText } = render(
      <SourceStalenessIndicator source="weather" dataUpdatedAt={staleDate} />
    );

    expect(getByText(/Weather data outdated/)).toBeTruthy();
  });

  it('renders critical indicator with correct styling', () => {
    const criticalDate = new Date('2024-01-05T12:00:00Z');
    const { getByText, getByLabelText } = render(
      <SourceStalenessIndicator source="weather" dataUpdatedAt={criticalDate} />
    );

    const text = getByText(/Weather data outdated/);
    expect(text).toBeTruthy();
    expect(getByLabelText(/outdated/)).toBeTruthy();
  });

  it('renders flora data indicator', () => {
    const staleDate = new Date('2024-01-02T12:00:00Z');
    const { getByText } = render(
      <SourceStalenessIndicator source="flora" dataUpdatedAt={staleDate} />
    );

    expect(getByText(/Flora data outdated/)).toBeTruthy();
  });

  it('renders telemetry data indicator', () => {
    const staleDate = new Date('2024-01-10T10:00:00Z');
    const { getByText } = render(
      <SourceStalenessIndicator source="telemetry" dataUpdatedAt={staleDate} />
    );

    expect(getByText(/Telemetry data outdated/)).toBeTruthy();
  });

  it('includes relative time label in text', () => {
    const staleDate = new Date('2024-01-08T12:00:00Z');
    const { getByText } = render(
      <SourceStalenessIndicator source="weather" dataUpdatedAt={staleDate} />
    );

    expect(getByText(/2 days ago/)).toBeTruthy();
  });

  it('provides accessibility label for screen readers', () => {
    const staleDate = new Date('2024-01-08T12:00:00Z');
    const { getByLabelText } = render(
      <SourceStalenessIndicator source="weather" dataUpdatedAt={staleDate} />
    );

    const label = getByLabelText(/Weather data is outdated/);
    expect(label).toBeTruthy();
  });

  it('handles different sources correctly', () => {
    const staleDate = new Date('2023-12-01T12:00:00Z');

    const sources: Array<'weather' | 'flora' | 'telemetry'> = [
      'weather',
      'flora',
      'telemetry',
    ];

    sources.forEach((source) => {
      const { getByText, unmount } = render(
        <SourceStalenessIndicator source={source} dataUpdatedAt={staleDate} />
      );

      const expectedLabel =
        source === 'weather'
          ? 'Weather data'
          : source === 'flora'
            ? 'Flora data'
            : 'Telemetry data';

      expect(getByText(new RegExp(expectedLabel))).toBeTruthy();
      unmount();
    });
  });
});
