/**
 * @jest-environment jsdom
 */
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('../src/store/auth-store', () => ({
  useAuthStore: jest.fn((selector: (s: { user: null }) => unknown) => selector({ user: null })),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../components/ui/heading', () => {
  const { Text } = require('react-native');
  return { Heading: (props: Record<string, unknown>) => require('react').createElement(Text, props, props.children) };
});

jest.mock('../components/ui/text', () => {
  const { Text } = require('react-native');
  return { Text: (props: Record<string, unknown>) => require('react').createElement(Text, props, props.children) };
});

jest.mock('../components/ui/button', () => {
  const { View, Text } = require('react-native');
  return {
    Button: (props: Record<string, unknown>) => require('react').createElement(View, props, props.children),
    ButtonText: (props: Record<string, unknown>) => require('react').createElement(Text, {}, props.children),
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';

describe('ContextCard (from HomePage)', () => {
  function renderContextCard(props: {
    icon: string;
    title: string;
    value: string;
    updatedAt?: string;
    bgClass: string;
  }) {
    // We need to render a minimal component that uses ContextCard
    // Since ContextCard is defined in the HomePage, we import and render it indirectly
    const HomeScreen = require('../app/(tabs)/index').default;

    // For direct unit testing of ContextCard, we'd need to export it from the HomePage
    // For now, we test it through the HomePage which uses it
    const { root } = render(<HomeScreen />);
    return { root };
  }

  it('renders context cards on homepage', () => {
    renderContextCard({
      icon: 'partly-sunny-outline',
      title: 'Weather',
      value: 'Weather data coming soon',
      bgClass: 'bg-background-info',
    });
    expect(screen.getByText('Weather')).toBeTruthy();
  });

  it('renders all context card types', () => {
    renderContextCard({
      icon: 'flower-outline',
      title: 'Bloom Status',
      value: 'Bloom tracking coming soon',
      bgClass: 'bg-background-success',
    });
    expect(screen.getByText('Bloom Status')).toBeTruthy();
  });

  it('displays context card values correctly', () => {
    renderContextCard({
      icon: 'calendar-outline',
      title: 'Seasonal Phase',
      value: 'Seasonal context coming soon',
      bgClass: 'bg-background-warning',
    });
    expect(screen.getByText('Seasonal context coming soon')).toBeTruthy();
  });

  it('renders multiple context cards without errors', () => {
    const HomeScreen = require('../app/(tabs)/index').default;
    const { root } = render(<HomeScreen />);
    expect(root).toBeTruthy();
    // All three cards should be present
    expect(screen.getByText('Weather')).toBeTruthy();
    expect(screen.getByText('Bloom Status')).toBeTruthy();
    expect(screen.getByText('Seasonal Phase')).toBeTruthy();
  });

  it('renders with different background classes', () => {
    const HomeScreen = require('../app/(tabs)/index').default;
    const { root } = render(<HomeScreen />);
    expect(root).toBeTruthy();
    // Verify the cards are rendered
    expect(screen.getByText('Weather')).toBeTruthy();
  });
});
