import { RiskZone, CityTier, UserProfile, WeatherData, RiskPrediction } from '../types';

/**
 * Calculates a worker trust score based on claim history and reliability
 */
export const calculateTrustScore = (claims: any[]): number => {
  if (claims.length === 0) return 90; // Default high trust for new users
  
  const suspiciousClaims = claims.filter(c => c.fraudScore > 0.5).length;
  const rejectedClaims = claims.filter(c => c.status === 'rejected').length;
  const totalClaims = claims.length;
  
  let score = 100;
  score -= (suspiciousClaims / totalClaims) * 50;
  score -= (rejectedClaims / totalClaims) * 30;
  
  return Math.max(Math.min(Math.round(score), 100), 0);
};

/**
 * Generates mock risk predictions for the next week
 */
export const getRiskPredictions = (): RiskPrediction[] => {
  return [
    {
      city: 'Mangalagiri',
      prediction: 'Medium Rain Risk',
      riskLevel: 'medium',
      probability: 65,
      expectedClaims: 12,
      timestamp: new Date().toISOString()
    },
    {
      city: 'Vizag',
      prediction: 'High Cyclone Risk',
      riskLevel: 'high',
      probability: 82,
      expectedClaims: 45,
      timestamp: new Date().toISOString()
    },
    {
      city: 'Delhi',
      prediction: 'High AQI Risk',
      riskLevel: 'high',
      probability: 90,
      expectedClaims: 120,
      timestamp: new Date().toISOString()
    }
  ];
};

/**
 * Calculates mock platform health metrics
 */
export const getPlatformHealthMetrics = (claims: any[]) => {
  const total = claims.length || 1;
  const approved = claims.filter(c => c.status === 'approved' || c.status === 'processed').length;
  const suspicious = claims.filter(c => c.fraudScore > 0.5).length;
  
  return {
    fraudRate: Math.round((suspicious / total) * 100),
    approvalRate: Math.round((approved / total) * 100),
    avgPayoutTime: 1.8, // hours
    suspiciousCount: suspicious
  };
};

/**
 * Calculates a basic risk score (0-100) based on user profile and weather
 */
export const calculateRiskScore = (profile: UserProfile, weather: WeatherData | null): number => {
  let score = 50; // Base score

  // Category risk
  if (profile.category === 'food') score += 10;
  if (profile.category === 'quick_commerce') score += 15;

  // Location risk
  if (profile.riskZone === 'coastal') score += 20;
  if (profile.riskZone === 'urban') score += 5;

  // Weather risk
  if (weather?.isRisk) score += 25;

  return Math.min(score, 100);
};

export const CITY_RISK_DATA: Record<string, { zone: RiskZone; tier: CityTier }> = {
  'Mumbai': { zone: 'coastal', tier: 'tier1' },
  'Delhi': { zone: 'urban', tier: 'tier1' },
  'Bangalore': { zone: 'urban', tier: 'tier1' },
  'Chennai': { zone: 'coastal', tier: 'coastal' },
  'Vizag': { zone: 'coastal', tier: 'coastal' },
  'Vijayawada': { zone: 'inland', tier: 'tier2' },
  'Guntur': { zone: 'inland', tier: 'tier2' },
  'Hyderabad': { zone: 'urban', tier: 'tier1' },
  'Kochi': { zone: 'coastal', tier: 'coastal' },
  'Kolkata': { zone: 'coastal', tier: 'tier1' },
};

export const getRiskDataForCity = (city: string) => {
  return CITY_RISK_DATA[city] || { zone: 'inland', tier: 'tier2' };
};

export const calculateDynamicPremium = (basePremium: number, zone: RiskZone, tier: CityTier) => {
  let premium = basePremium;

  // Zone adjustments
  if (zone === 'coastal') premium += 5;
  if (zone === 'inland') premium -= 2;

  // Tier adjustments
  if (tier === 'coastal') premium += 3;
  if (tier === 'tier1') premium += 2;
  
  return premium;
};

export const getFraudScore = (
  workerLocation: { lat: number; lng: number },
  eventLocation: { lat: number; lng: number },
  weatherConfirmed: boolean,
  workerActivityHistory: number, // hours lost
  claimFrequency: number, // claims in last 30 days
  locationIntegrity: {
    mockLocation: boolean;
    rootDetected: boolean;
    vpnActive: boolean;
  } = { mockLocation: false, rootDetected: false, vpnActive: false }
) => {
  let score = 0;
  const flags: string[] = [];

  // 1. Precise Location Mismatch Tiers
  const distance = calculateDistance(
    workerLocation.lat,
    workerLocation.lng,
    eventLocation.lat,
    eventLocation.lng
  );
  
  if (distance > 15) {
    score += 0.9;
    flags.push('Critical Location Mismatch (>15km)');
  } else if (distance > 5) {
    score += 0.5;
    flags.push('Significant Location Mismatch (>5km)');
  } else if (distance > 2) {
    score += 0.2;
    flags.push('Minor Location Mismatch (>2km)');
  }

  // 2. Hardware/OS Level Spoofing Detection (Signals from Mobile SDK)
  if (locationIntegrity.mockLocation) {
    score += 0.8;
    flags.push('Mock Location Provider Detected');
  }
  if (locationIntegrity.rootDetected) {
    score += 0.4;
    flags.push('Device Rooted/Jailbroken');
  }
  if (locationIntegrity.vpnActive) {
    score += 0.3;
    flags.push('VPN/Proxy Active');
  }

  // 3. Weather Confirmation
  if (!weatherConfirmed) {
    score += 0.4;
    flags.push('Weather Event Not Confirmed');
  }

  // 3. Worker Inactivity
  if (workerActivityHistory === 0) {
    score += 0.3;
    flags.push('No Activity During Event');
  }

  // 4. Claim Frequency
  if (claimFrequency > 3) {
    score += 0.2;
    flags.push('High Claim Frequency');
  }

  return {
    score: Math.min(score, 1),
    flags
  };
};

// Helper to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
