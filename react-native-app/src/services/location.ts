import { PermissionsAndroid, Platform } from 'react-native';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  city: string;
  state: string;
  country: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

/**
 * Requests location permission on Android devices
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const permissionsToRequest: any[] = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ];

    const result = await PermissionsAndroid.requestMultiple(permissionsToRequest);
    const fineGranted = result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
    const coarseGranted = result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

    return fineGranted || coarseGranted;
  } catch (err) {
    console.warn('Location permission error:', err);
    return false;
  }
}

/**
 * Gets current device GPS coordinates with timeout and error fallback
 */
export async function getCurrentLocation(): Promise<LocationCoords | null> {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    console.warn('Location permission denied.');
    return null;
  }

  return new Promise((resolve) => {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav && nav.geolocation) {
      nav.geolocation.getCurrentPosition(
        (position: any) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error: any) => {
          console.warn('GPS location fetch error:', error);
          // Default to Mumbai coordinates if GPS fails or offline
          resolve({ latitude: 19.0760, longitude: 72.8777 });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      // Fallback coordinates (Mumbai, India)
      resolve({ latitude: 19.0760, longitude: 72.8777 });
    }
  });
}

/**
 * Reverse geocodes coordinates to city/location name using OpenStreetMap Nominatim REST API
 */
export async function reverseGeocodeOSM(lat: number, lon: number): Promise<GeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AutoPartsIndiaApp/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OSM HTTP error: ${response.status}`);
    }

    const data: any = await response.json();
    const address = data.address || {};
    const city = address.city || address.town || address.village || address.state_district || 'Mumbai';
    const state = address.state || 'Maharashtra';
    const country = address.country || 'India';

    return {
      city,
      state,
      country,
      displayName: `${city}, ${state}`,
      latitude: lat,
      longitude: lon,
    };
  } catch (err) {
    console.warn('Reverse geocoding error, defaulting:', err);
    return {
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      displayName: 'Mumbai, Maharashtra',
      latitude: lat,
      longitude: lon,
    };
  }
}

/**
 * Searches for city locations in India using OpenStreetMap Nominatim Search API
 */
export async function searchLocationsOSM(query: string): Promise<GeocodeResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const encoded = encodeURIComponent(`${query}, India`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=in&limit=5&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AutoPartsIndiaApp/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const results: any = await response.json();
    if (!Array.isArray(results)) return [];

    return results.map((item: any) => {
      const addr = item.address || {};
      const city = addr.city || addr.town || addr.village || item.display_name.split(',')[0];
      const state = addr.state || '';
      return {
        city,
        state,
        country: 'India',
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };
    });
  } catch (err) {
    console.warn('OSM location search error:', err);
    return [];
  }
}

/**
 * Returns OpenStreetMap / MapLibre tile URL template for map rendering
 */
export function getOSMTileUrl(): string {
  return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
}
