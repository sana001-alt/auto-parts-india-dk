const path = require('path');

let getDefaultConfig, mergeConfig;
try {
  ({ getDefaultConfig, mergeConfig } = require('@react-native/metro-config'));
} catch (e) {
  try {
    ({ getDefaultConfig, mergeConfig } = require('./react-native-app/node_modules/@react-native/metro-config'));
  } catch (err) {
    getDefaultConfig = () => ({ resolver: { assetExts: [], sourceExts: [] } });
    mergeConfig = (a, b) => ({ ...a, ...b });
  }
}

const appDir = path.resolve(__dirname, 'react-native-app');
const defaultConfig = getDefaultConfig ? getDefaultConfig(appDir) : {};

const config = {
  projectRoot: appDir,
  watchFolders: [appDir],
};

module.exports = mergeConfig ? mergeConfig(defaultConfig, config) : config;

