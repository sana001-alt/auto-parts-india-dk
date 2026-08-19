import { PermissionsAndroid, Platform, Alert } from 'react-native';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { db, doc, setDoc, updateDoc, serverTimestamp } from './firebase';
import { navigate } from '../navigation/navigationRef';

/**
 * Request notification permissions safely on Android (including Android 13+ POST_NOTIFICATIONS) and iOS
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('[FCM] Android 13+ POST_NOTIFICATIONS permission denied');
        return false;
      }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('[FCM] Notification authorization status:', authStatus);
    } else {
      console.warn('[FCM] Notification permission not granted');
    }

    return enabled;
  } catch (error) {
    console.error('[FCM] Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Fetches current FCM Registration Token and saves it to Firestore under the authenticated user's profile
 */
export async function saveFcmTokenToFirestore(userId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('[FCM] Cannot get token without notification permission');
      return null;
    }

    if (!messaging().isDeviceRegisteredForRemoteMessages) {
      await messaging().registerDeviceForRemoteMessages();
    }

    const token = await messaging().getToken();
    if (!token) {
      console.warn('[FCM] No token returned from messaging().getToken()');
      return null;
    }

    console.log('[FCM] Generated FCM Token:', token.substring(0, 15) + '...');

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
      fcmTokenLastUpdated: serverTimestamp(),
      platform: Platform.OS,
    }).catch(async () => {
      await setDoc(userRef, {
        fcmToken: token,
        fcmTokenLastUpdated: serverTimestamp(),
        platform: Platform.OS,
      }, { merge: true });
    });

    const safeDocId = token.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const tokenRef = doc(db, 'users', userId, 'fcmTokens', safeDocId);
    await setDoc(tokenRef, {
      token: token,
      createdAt: serverTimestamp(),
      platform: Platform.OS,
    }, { merge: true });

    return token;
  } catch (error) {
    console.error('[FCM] Failed to retrieve or store FCM token:', error);
    return null;
  }
}

/**
 * Removes the FCM token from Firestore when user logs out
 */
export async function removeFcmTokenFromFirestore(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const token = await messaging().getToken().catch(() => null);
    if (token) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: null,
        fcmTokenLastUpdated: serverTimestamp(),
      }).catch(() => null);

      const safeDocId = token.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const tokenRef = doc(db, 'users', userId, 'fcmTokens', safeDocId);
      await setDoc(tokenRef, {
        revoked: true,
        revokedAt: serverTimestamp(),
      }, { merge: true }).catch(() => null);
    }

    await messaging().deleteToken().catch(() => null);
    console.log('[FCM] FCM Token removed on logout');
  } catch (error) {
    console.error('[FCM] Error removing FCM token on logout:', error);
  }
}

/**
 * Deep-link / navigation helper based on notification data payload
 */
export function handleNotificationPayload(remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) {
  if (!remoteMessage || !remoteMessage.data) return;

  console.log('[FCM] Handling notification tap data:', remoteMessage.data);
  const { screen, chatRoomId, partId, sellerId } = remoteMessage.data;

  if (screen === 'ChatRoom' && chatRoomId) {
    navigate('ChatRoom', { chatRoomId });
  } else if (screen === 'ProductDetail' && partId) {
    navigate('ProductDetail', { partId });
  } else if (screen === 'SellerProfile' && sellerId) {
    navigate('SellerProfile', { sellerId });
  } else if (screen === 'ChatsTab') {
    navigate('MainTabs', { screen: 'ChatsTab' });
  } else if (screen === 'HomeTab') {
    navigate('MainTabs', { screen: 'HomeTab' });
  } else if (screen) {
    navigate(screen, remoteMessage.data);
  }
}

/**
 * Initializes listeners for foreground, background, and initial (terminated) notification taps
 */
export function setupFcmListeners(userId?: string): () => void {
  console.log('[FCM] Setting up FCM listeners');

  const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken: string) => {
    console.log('[FCM] Token refreshed:', newToken.substring(0, 15) + '...');
    if (userId) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: newToken,
        fcmTokenLastUpdated: serverTimestamp(),
      }).catch(() => null);
    }
  });

  const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    console.log('[FCM] Foreground notification received:', remoteMessage);

    const title = remoteMessage.notification?.title || (remoteMessage.data?.title as string) || 'Auto Parts India';
    const body = remoteMessage.notification?.body || (remoteMessage.data?.body as string) || 'You have a new message';

    Alert.alert(
      title,
      body,
      [
        {
          text: 'View',
          onPress: () => handleNotificationPayload(remoteMessage),
        },
        { text: 'Dismiss', style: 'cancel' },
      ],
      { cancelable: true }
    );
  });

  const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp((remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    console.log('[FCM] Notification opened from background state:', remoteMessage);
    handleNotificationPayload(remoteMessage);
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
      if (remoteMessage) {
        console.log('[FCM] App launched from terminated state via notification:', remoteMessage);
        setTimeout(() => {
          handleNotificationPayload(remoteMessage);
        }, 800);
      }
    })
    .catch((err: any) => console.error('[FCM] Error checking initial notification:', err));

  return () => {
    console.log('[FCM] Cleaning up FCM listeners');
    unsubscribeTokenRefresh();
    unsubscribeOnMessage();
    unsubscribeOnNotificationOpened();
  };
}
