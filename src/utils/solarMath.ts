import SunCalc from 'suncalc';

export interface SunPosition {
  azimuth: number; // in degrees
  altitude: number; // in degrees
}

export function getSunPosition(date: Date, lat: number, lng: number): SunPosition {
  const pos = SunCalc.getPosition(date, lat, lng);
  
  // SunCalc returns azimuth in radians, measured from south to west.
  // We want degrees from North (0) clockwise.
  // SunCalc azimuth: 0 is south, -pi/2 is east, pi/2 is west, pi/-pi is north.
  let azimuthDeg = (pos.azimuth * 180) / Math.PI + 180;
  azimuthDeg = (azimuthDeg + 180) % 360;

  return {
    azimuth: azimuthDeg,
    altitude: (pos.altitude * 180) / Math.PI,
  };
}

/**
 * Calculates the bearing between two points in degrees.
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  
  return ((θ * 180) / Math.PI + 360) % 360;
}

export function getSeatRecommendation(busHeading: number, sunAzimuth: number, sunAltitude: number) {
  if (sunAltitude < 0) return 'NIGHT';
  if (sunAltitude < 5) return 'LOW_SUN'; // Sun is very low, maybe blocked by buildings/trees

  // Relative angle of sun to bus heading
  // 0 is front, 90 is right, 180 is back, 270 is left
  const relativeAngle = (sunAzimuth - busHeading + 360) % 360;

  if (relativeAngle > 10 && relativeAngle < 170) {
    return 'RIGHT';
  } else if (relativeAngle > 190 && relativeAngle < 350) {
    return 'LEFT';
  } else {
    return 'NONE'; // Sun is directly in front or behind
  }
}
