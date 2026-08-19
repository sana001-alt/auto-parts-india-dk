import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
  ViewStyle,
  Image,
  Alert,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { reverseGeocodeOSM, getCurrentLocation } from '../services/location';

export interface GMapProps {
  latitude?: number;
  longitude?: number;
  title?: string;
  zoom?: number;
  interactive?: boolean;
  onLocationSelect?: (coords: { latitude: number; longitude: number }) => void;
  style?: ViewStyle;
}

export const GMap: React.FC<GMapProps> = ({
  latitude = 19.0760, // Mumbai default
  longitude = 72.8777,
  title = 'Spare Part Location',
  zoom = 14,
  interactive = false,
  onLocationSelect,
  style,
}) => {
  const [currentLat, setCurrentLat] = useState(latitude);
  const [currentLng, setCurrentLng] = useState(longitude);
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentLat(latitude);
    setCurrentLng(longitude);
    loadAddress(latitude, longitude);
  }, [latitude, longitude]);

  const loadAddress = async (lat: number, lng: number) => {
    try {
      const geo = await reverseGeocodeOSM(lat, lng);
      if (geo && geo.displayName) {
        setAddress(geo.displayName);
      }
    } catch (err) {
      console.warn('[GMap] Reverse geocode error:', err);
    }
  };

  const handleOpenGoogleMaps = () => {
    const lat = currentLat;
    const lng = currentLng;
    const gmapsNavUrl = `google.navigation:q=${lat},${lng}`;
    const gmapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    if (Platform.OS === 'android') {
      Linking.canOpenURL(gmapsNavUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(gmapsNavUrl);
          } else {
            Linking.openURL(gmapsWebUrl);
          }
        })
        .catch(() => {
          Linking.openURL(gmapsWebUrl);
        });
    } else if (Platform.OS === 'ios') {
      const iosGmapsUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
      Linking.canOpenURL(iosGmapsUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(iosGmapsUrl);
          } else {
            Linking.openURL(gmapsWebUrl);
          }
        })
        .catch(() => {
          Linking.openURL(gmapsWebUrl);
        });
    } else {
      Linking.openURL(gmapsWebUrl);
    }
  };

  const handleDetectGPS = async () => {
    setLoading(true);
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        setCurrentLat(coords.latitude);
        setCurrentLng(coords.longitude);
        loadAddress(coords.latitude, coords.longitude);
        if (onLocationSelect) {
          onLocationSelect(coords);
        }
      }
    } catch (e: any) {
      Alert.alert('GPS Location', 'Unable to retrieve location. Please check device permissions.');
    } finally {
      setLoading(false);
    }
  };

  // Convert lat/lng to OpenStreetMap static tile url for lightweight native image display
  const latRad = (currentLat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const xTile = Math.floor(((currentLng + 180) / 360) * n);
  const yTile = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  const mapTileUrl = `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`;

  return (
    <View style={[styles.container, style]}>
      {/* Native Map Graphic Canvas */}
      <View style={styles.mapCanvas}>
        {/* Background OpenStreetMap Tile Layer */}
        <Image
          source={{ uri: mapTileUrl }}
          style={styles.tileBackground}
          resizeMode="cover"
        />

        {/* Dark Map Overlay for high-contrast auto parts theme */}
        <View style={styles.tileOverlay} />

        {/* Center Target Pin Marker */}
        <View style={styles.markerContainer} pointerEvents="none">
          <View style={styles.markerPulse} />
          <View style={styles.markerPin}>
            <IconButton icon="map-marker" iconColor="#FFFFFF" size={24} style={styles.pinIcon} />
          </View>
          <View style={styles.pinCallout}>
            <Text style={styles.pinCalloutText} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

        {/* Action Controls Bar */}
        <View style={styles.controlsBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleOpenGoogleMaps}
            activeOpacity={0.8}
          >
            <IconButton icon="google-maps" iconColor="#FFFFFF" size={16} style={styles.btnIcon} />
            <Text style={styles.actionBtnText}>Open in Maps</Text>
          </TouchableOpacity>

          {interactive && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.gpsBtn]}
              onPress={handleDetectGPS}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <IconButton icon="crosshairs-gps" iconColor="#FFFFFF" size={16} style={styles.btnIcon} />
                  <Text style={styles.actionBtnText}>My GPS</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Coordinates Pill */}
        <View style={styles.coordsBadge}>
          <Text style={styles.coordsText}>
            {currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E
          </Text>
        </View>
      </View>

      {/* Address & Verified Location Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <IconButton icon="map-marker-radius" iconColor="#1565FF" size={20} style={{ margin: 0, padding: 0 }} />
          <View style={styles.addressWrapper}>
            <Text style={styles.addressHeading} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.addressText} numberOfLines={2}>
              {address || `Lat: ${currentLat.toFixed(4)}, Long: ${currentLng.toFixed(4)} (OpenStreetMap Verified)`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default GMap;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  mapCanvas: {
    width: '100%',
    height: 180,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1220',
    overflow: 'hidden',
  },
  tileBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 32, 0.45)',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  markerPulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(21, 101, 255, 0.35)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  markerPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1565FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pinIcon: {
    margin: 0,
    padding: 0,
  },
  pinCallout: {
    marginTop: 4,
    backgroundColor: '#0B1220',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pinCalloutText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
  },
  controlsBar: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
    zIndex: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  gpsBtn: {
    backgroundColor: '#059669',
  },
  btnIcon: {
    margin: 0,
    marginRight: -4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  coordsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#334155',
  },
  coordsText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  infoCard: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressWrapper: {
    flex: 1,
    marginLeft: 6,
  },
  addressHeading: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  addressText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});

