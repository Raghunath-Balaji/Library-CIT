const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Keep Expo SDK 58 package exports enabled (required by React Native 0.88),
// while supporting Firebase .cjs modules.
if (!config.resolver.sourceExts.includes("cjs")) {
  config.resolver.sourceExts.push("cjs");
}

module.exports = withNativeWind(config, { input: "./global.css" });
