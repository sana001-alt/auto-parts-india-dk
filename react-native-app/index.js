import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './package.json';

// Register FCM background message handler (triggers when app is in background or terminated)
try {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[FCM] Background/Quit message received:', remoteMessage?.messageId);
  });
} catch (err) {
  console.warn('[FCM] Unable to register background message handler:', err);
}

AppRegistry.registerComponent(appName, () => App);
