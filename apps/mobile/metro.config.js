const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Prevent native-only modules from being resolved on web platform.
// @react-native-firebase/* is native-only; web uses firebase JS SDK via
// platform extensions (.web.ts / .native.ts).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    (moduleName.startsWith('@react-native-firebase/') ||
      moduleName === 'react-native-mmkv')
  ) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
