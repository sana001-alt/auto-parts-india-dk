import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Path, G, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

interface BrandLogoProps {
  size?: number;
  style?: ViewStyle;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 48, style }) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Defs>
          <LinearGradient id="navyBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0F172A" />
            <Stop offset="100%" stopColor="#0B1220" />
          </LinearGradient>
          <LinearGradient id="orangeGearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF7A00" />
            <Stop offset="100%" stopColor="#E65100" />
          </LinearGradient>
        </Defs>

        {/* Outer Rounded Container Background */}
        <Rect width="100" height="100" rx="22" fill="url(#navyBgGrad)" />
        <Rect x="2" y="2" width="96" height="96" rx="20" stroke="#1E293B" strokeWidth="1.5" fill="none" />

        {/* 1. Precision Outer Gear (Orange) */}
        <Circle cx="50" cy="50" r="28" stroke="url(#orangeGearGrad)" strokeWidth="7" strokeDasharray="14 7" fill="none" />
        <Circle cx="50" cy="50" r="23" stroke="#0B1220" strokeWidth="2" fill="none" />

        {/* 2. Crossed Mechanic Wrench (White) */}
        <Path
          d="M 32 68 L 68 32 M 63 27 L 73 37 M 67 25 L 75 33"
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <Circle cx="70" cy="30" r="7" stroke="#FFFFFF" strokeWidth="4" fill="none" />
        <Circle cx="30" cy="70" r="5" fill="#FFFFFF" />

        {/* 3. Automotive Car Silhouette (White & Orange) */}
        <Path
          d="M 40 44 C 42 36 58 36 60 44 L 66 49 C 69 51 70 55 68 60 L 66 65 L 34 65 L 32 60 C 30 55 31 51 34 49 Z"
          fill="#FFFFFF"
        />
        <Path
          d="M 43 45 C 45 40 55 40 57 45 L 60 49 L 40 49 Z"
          fill="#0B1220"
        />

        {/* Headlights (Vivid Orange) */}
        <Circle cx="38" cy="56" r="2.5" fill="#FF7A00" />
        <Circle cx="62" cy="56" r="2.5" fill="#FF7A00" />

        {/* Front Radiator Grille */}
        <Rect x="44" y="54" width="12" height="5" rx="1.5" fill="#0B1220" />
        <Rect x="46" y="55.5" width="8" height="1" fill="#FF7A00" />
      </Svg>
    </View>
  );
};

export default BrandLogo;

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
