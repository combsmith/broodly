import React from 'react';
import { render, screen } from '@testing-library/react-native';

/**
 * Navigation shell tests for Story 5.1.
 *
 * Expo Router renders via file-system conventions so we cannot unit-test
 * the real navigator in Jest. Instead we verify:
 *   1. Each screen stub renders its expected content.
 *   2. The tabs layout module exports a default component.
 *   3. The route file structure matches the spec (filesystem test).
 *
 * Full integration (deep links, tab switching, stack pop) is validated
 * manually on iOS/Android/web per AC #3, #5, #6.
 */

// Mock expo-router for all screen tests
jest.mock('expo-router', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Stack: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Slot: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'test-apiary-123' }),
}));

// Mock apiary hooks (used by apiaries/index.tsx)
jest.mock('../src/features/apiary/hooks/use-apiaries', () => ({
  useApiaries: () => ({ data: undefined, isLoading: true, refetch: jest.fn(), isRefetching: false }),
  useApiary: () => ({ data: undefined, isLoading: true }),
  useDeleteApiary: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

// Mock planning hooks (used by plan/index.tsx)
jest.mock('../src/features/planning/hooks/use-weekly-queue', () => ({
  useWeeklyQueue: () => ({ data: undefined, isLoading: true, refetch: jest.fn(), isRefetching: false }),
  useCompleteTask: () => ({ mutate: jest.fn() }),
  useDeferTask: () => ({ mutate: jest.fn() }),
}));

// Mock auth store (used by homepage)
jest.mock('../src/store/auth-store', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: null, isLoading: false }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock @gluestack-ui/core modules to avoid react-dom@18 / React 19 conflict
jest.mock('@gluestack-ui/core/overlay/creator', () => {
  const ReactMock = require('react');
  return {
    OverlayProvider: ({ children }: { children: React.ReactNode }) =>
      ReactMock.createElement(ReactMock.Fragment, null, children),
  };
});
jest.mock('@gluestack-ui/core/toast/creator', () => {
  const ReactMock = require('react');
  return {
    ToastProvider: ({ children }: { children: React.ReactNode }) =>
      ReactMock.createElement(ReactMock.Fragment, null, children),
  };
});
jest.mock('@gluestack-ui/core/button/creator', () => {
  const ReactMock = require('react');
  const { Text, View, ActivityIndicator } = require('react-native');
  function createButton({ Root }: { Root: React.ComponentType<unknown> }) {
    const Btn = Root as unknown as Record<string, unknown>;
    Btn.Text = ReactMock.forwardRef(function MockButtonText(
      props: Record<string, unknown>,
      ref: unknown
    ) {
      return ReactMock.createElement(Text, { ...props, ref });
    });
    Btn.Group = View;
    Btn.Spinner = ActivityIndicator;
    Btn.Icon = View;
    return Btn;
  }
  return { createButton };
});
jest.mock('@gluestack-ui/core/icon/creator', () => {
  const { View } = require('react-native');
  return { PrimitiveIcon: View, UIIcon: View };
});

// Screen stubs ----------------------------------------------------------

describe('Screen stubs render correctly', () => {
  it('Home screen renders greeting', () => {
    const HomeScreen =
      require('../app/(tabs)/index').default;
    render(<HomeScreen />);
    expect(screen.getByText(/welcome back/i)).toBeTruthy();
  });

  it('Apiaries list screen renders loading state', () => {
    const ApiariesScreen =
      require('../app/(tabs)/apiaries/index').default;
    render(<ApiariesScreen />);
    expect(screen.getByText(/loading apiaries/i)).toBeTruthy();
  });

  it('Plan screen renders loading state', () => {
    const PlanScreen =
      require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText(/loading your plan/i)).toBeTruthy();
  });

  it('Settings screen renders title', () => {
    const SettingsScreen =
      require('../app/(tabs)/settings/index').default;
    render(<SettingsScreen />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('Sign-in screen renders title', () => {
    const SignInScreen =
      require('../app/(auth)/sign-in').default;
    render(<SignInScreen />);
    expect(screen.getByText('Welcome to Broodly')).toBeTruthy();
  });
});

// Apiary detail stub with route param -----------------------------------

describe('Apiary detail screen', () => {
  it('renders loading state with route params', () => {
    const ApiaryDetailScreen =
      require('../app/(tabs)/apiaries/[id]').default;
    render(<ApiaryDetailScreen />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });
});

// Layout modules export default components ------------------------------

describe('Layout modules export correctly', () => {
  it('root layout exports a default component', () => {
    const RootLayout = require('../app/_layout').default;
    expect(typeof RootLayout).toBe('function');
  });

  it('tabs layout exports a default component', () => {
    const TabsLayout =
      require('../app/(tabs)/_layout').default;
    expect(typeof TabsLayout).toBe('function');
  });

  it('apiaries stack layout exports a default component', () => {
    const ApiariesLayout =
      require('../app/(tabs)/apiaries/_layout').default;
    expect(typeof ApiariesLayout).toBe('function');
  });

  it('auth layout exports a default component', () => {
    const AuthLayout =
      require('../app/(auth)/_layout').default;
    expect(typeof AuthLayout).toBe('function');
  });
});

// Route file structure matches spec (AC #1) -----------------------------

describe('Route file structure', () => {
  const fs = require('fs');
  const path = require('path');
  const appDir = path.resolve(__dirname, '../app');

  const expectedFiles = [
    '_layout.tsx',
    '(tabs)/_layout.tsx',
    '(tabs)/index.tsx',
    '(tabs)/apiaries/_layout.tsx',
    '(tabs)/apiaries/index.tsx',
    '(tabs)/apiaries/[id].tsx',
    '(tabs)/plan/index.tsx',
    '(tabs)/settings/index.tsx',
    '(auth)/_layout.tsx',
    '(auth)/sign-in.tsx',
  ];

  it.each(expectedFiles)('app/%s exists', (file) => {
    const filePath = path.join(appDir, file);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
