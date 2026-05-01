import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore, auth } from '../services/firebase';

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

/**
 * Hook for requesting and tracking user location
 */
export const useLocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    try {
      setLoading(true);

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Location permission denied');
        setPermissionGranted(false);
        setLoading(false);
        return;
      }

      setPermissionGranted(true);

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      // Reverse geocode to get city name
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        });

        if (geocode && geocode.length > 0) {
          locationData.city = geocode[0].city || geocode[0].region || 'Unknown';
        }
      } catch (geocodeError) {
        console.warn('Geocoding failed:', geocodeError);
      }

      setLocation(locationData);

      // Save to user preferences
      await saveLocationToPreferences(locationData);

      setLoading(false);
    } catch (err: any) {
      console.error('Error getting location:', err);
      setError(err.message || 'Failed to get location');
      setLoading(false);
    }
  };

  const saveLocationToPreferences = async (locationData: LocationData) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const prefsRef = doc(firestore, `userPreferences/${userId}`);
      await updateDoc(prefsRef, {
        currentLocation: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          city: locationData.city || 'Unknown',
        },
        lastUpdated: serverTimestamp(),
      });

      console.log('Location saved to preferences:', locationData.city);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const refreshLocation = () => {
    requestLocation();
  };

  return {
    location,
    loading,
    error,
    permissionGranted,
    refreshLocation,
  };
};

/**
 * Hook for watching location changes (optional, for real-time updates)
 */
export const useLocationWatcher = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          return;
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 60000, // Update every 60 seconds
            distanceInterval: 1000, // Update every 1km
          },
          (newLocation) => {
            setLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            });
          }
        );

        setWatching(true);
      } catch (error) {
        console.error('Error watching location:', error);
      }
    };

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  return { location, watching };
};
