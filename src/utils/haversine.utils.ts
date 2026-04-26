// src/utils/haversine.util.ts

/**
 * Haversine formula untuk menghitung jarak antara dua titik koordinat
 * @returns Jarak dalam meter
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Radius bumi dalam meter
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance); // Jarak dalam meter (dibulatkan)
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Validasi apakah user berada dalam radius lokasi
 */
export function isWithinRadius(
  userLat: number,
  userLon: number,
  locationLat: number,
  locationLon: number,
  radiusMeters: number,
): boolean {
  const distance = calculateDistance(
    userLat,
    userLon,
    locationLat,
    locationLon,
  );
  return distance <= radiusMeters;
}

/**
 * Mendapatkan informasi jarak dan status
 */
export function getDistanceInfo(
  userLat: number,
  userLon: number,
  locationLat: number,
  locationLon: number,
  radiusMeters: number,
) {
  const distance = calculateDistance(
    userLat,
    userLon,
    locationLat,
    locationLon,
  );

  return {
    distance,
    isWithinRadius: distance <= radiusMeters,
    radius: radiusMeters,
    difference: distance - radiusMeters,
  };
}
