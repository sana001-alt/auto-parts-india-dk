import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import { auth, onAuthStateChanged } from './src/services/firebase';
import { navigationRef } from './src/navigation/navigationRef';
import { 
  saveFcmTokenToFirestore, 
  removeFcmTokenFromFirestore, 
  setupFcmListeners 
} from './src/services/fcm';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Configure StatusBar for high-quality Android system accommodation
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(true);
      StatusBar.setBackgroundColor('transparent');
    }
  }, []);

  useEffect(() => {
    let cleanupFcm: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (cleanupFcm) {
        cleanupFcm();
        cleanupFcm = null;
      }

      if (user) {
        setCurrentUser(user);
        previousUserIdRef.current = user.uid;

        // Save/Update FCM token in Firestore & attach FCM listeners
        try {
          await saveFcmTokenToFirestore(user.uid);
        } catch (err) {
          console.warn('[App] Error saving FCM token:', err);
        }
        try {
          cleanupFcm = setupFcmListeners(user.uid);
        } catch (err) {
          console.warn('[App] Error setting up FCM listeners:', err);
        }
      } else {
        if (previousUserIdRef.current) {
          try {
            await removeFcmTokenFromFirestore(previousUserIdRef.current);
          } catch (err) {
            console.warn('[App] Error removing FCM token:', err);
          }
          previousUserIdRef.current = null;
        }
        setCurrentUser(null);
        try {
          cleanupFcm = setupFcmListeners();
        } catch (err) {
          console.warn('[App] Error setting up FCM listeners:', err);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (cleanupFcm) cleanupFcm();
    };
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator user={currentUser} />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
