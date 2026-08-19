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
          <LinearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1565FF" />
            <Stop offset="100%" stopColor="#0B1220" />
          </LinearGradient>
          <LinearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="100%" stopColor="#2563EB" />
          </LinearGradient>
        </Defs>

        {/* Outer Rounded Container Background */}
        <Rect width="100" height="100" rx="22" fill="url(#logoGrad)" />

        {/* Automotive Piston / Gear Graphic */}
        <G>
          {/* Inner Accent Ring */}
          <Circle cx="50" cy="50" r="32" stroke="#38BDF8" strokeWidth="3" strokeDasharray="6 4" opacity="0.6" />

          {/* Central Car / Spare Gear Emblem */}
          <Path
            d="M50 24L53 32H61L55 37L57 45L50 40L43 45L45 37L39 32H47L50 24Z"
            fill="#FFFFFF"
          />

          {/* Stylized Auto Chassis / Speed Wing */}
          <Path
            d="M26 62C32 54 68 54 74 62C72 68 28 68 26 62Z"
            fill="url(#gearGrad)"
          />

          {/* Twin Headlight / Piston Spark Dots */}
          <Circle cx="35" cy="62" r="3.5" fill="#FFFFFF" />
          <Circle cx="65" cy="62" r="3.5" fill="#FFFFFF" />

          {/* Lower Speed Lines */}
          <Path
            d="M32 72H68"
            stroke="#94A3B8"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </G>
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
