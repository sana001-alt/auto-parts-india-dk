import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, StatusBar } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import BrandLogo from '../components/BrandLogo';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <BrandLogo size={110} style={styles.logoImage} />
        <Text variant="headlineMedium" style={styles.title}>
          AUTO PARTS <Text style={styles.accent}>INDIA</Text>
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Direct Spare Parts Marketplace
        </Text>
        <ActivityIndicator animating size="large" color="#1565FF" style={styles.loader} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1,
  },
  accent: {
    color: '#1565FF',
  },
  subtitle: {
    color: '#94A3B8',
    marginTop: 8,
  },
  loader: {
    marginTop: 32,
  },
});
