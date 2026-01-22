import { useState, useEffect } from "react";

interface UserLocation {
  latitude: number;
  longitude: number;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return { location, error, loading };
}

// Haversine formula to calculate distance between two points
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Simple geocoding approximation using location string
// In production, you'd use a geocoding API
const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  // Add common locations if needed
};

export function estimateLocationCoords(locationStr: string): { lat: number; lng: number } | null {
  const normalized = locationStr.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (normalized.includes(key.toLowerCase())) {
      return coords;
    }
  }
  return null;
}
