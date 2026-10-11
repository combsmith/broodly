// babel-preset-expo inlines EXPO_PUBLIC_* values present at transform time, so a CI-level
// emulator flag would override tests that unset it at runtime. Tests set it explicitly.
delete process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATOR;

module.exports = {
  preset: 'jest-expo',
  testMatch: [
    '**/__tests__/**/*.{test,spec}.{ts,tsx}',
    '**/*.{test,spec}.{ts,tsx}',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@gluestack-ui/.*|nativewind|react-native-css-interop|tailwind-variants|@gluestack-style/.*))',
  ],
  moduleNameMapper: {
    '\\.(css)$': '<rootDir>/__mocks__/css.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!app/**/*.test.{ts,tsx}',
    '!app/**/*.spec.{ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text-summary'],
  testEnvironment: 'node',
  collectCoverage: true,
};
