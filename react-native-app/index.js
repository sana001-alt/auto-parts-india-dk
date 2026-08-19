import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './package.json';

// Register FCM background message handler (triggers when app is in background or terminated)
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Background/Quit message received:', remoteMessage.messageId);
});

AppRegistry.registerComponent(appName, () => App);
