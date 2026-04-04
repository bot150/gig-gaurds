import { WeatherData, Claim, DisruptionEvent } from '../types';

export interface MLRiskInput {
  rainProbability: number; // 0 to 1
  floodCycloneRisk: number; // 0 to 1
  aqiValue: number; // Normalized AQI (0 to 1, where 1 is very poor)
  disruptionProbability: number; // 0 to 1
  extremeTempRisk: number; // 0 to 1
  previousClaimsCount: number; // Number of claims
  pandemicRisk?: number; // 0 to 1
  lockdownProbability?: number; // 0 to 1
}

export interface MLRiskOutput {
  riskScore: number;
  riskLevel: 'Safe' | 'Medium' | 'High';
  basePremium: number;
  adjustment: number;
  finalPremium: number;
}

/**
 * Predicts risk score using a simple Logistic Regression inference model.
 * Weights are pre-defined to simulate a trained model.
 */
export const predictRiskScore = (input: MLRiskInput, planType: 'Standard' | 'Pro'): number => {
  // Weights (Simulated from a Logistic Regression model)
  const weights = {
    rain: 2.5,
    flood: 3.0,
    aqi: 1.5,
    disruption: 2.0,
    temp: 1.8,
    claims: planType === 'Pro' ? 2.2 : 0, // Only Pro considers claims history
    pandemic: planType === 'Pro' ? 3.5 : 0, // Only Pro considers pandemic
    lockdown: planType === 'Pro' ? 3.0 : 0, // Only Pro considers lockdown
  };
  
  const bias = planType === 'Pro' ? -6.0 : -4.5; // Adjusted bias for Pro to account for more features

  // Linear combination: z = w1*x1 + w2*x2 + ... + b
  const z = 
    (input.rainProbability * weights.rain) +
    (input.floodCycloneRisk * weights.flood) +
    (input.aqiValue * weights.aqi) +
    (input.disruptionProbability * weights.disruption) +
    (input.extremeTempRisk * weights.temp) +
    (Math.min(input.previousClaimsCount, 5) / 5 * weights.claims) +
    ((input.pandemicRisk || 0) * weights.pandemic) +
    ((input.lockdownProbability || 0) * weights.lockdown) +
    bias;

  // Sigmoid function: 1 / (1 + exp(-z))
  const riskScore = 1 / (1 + Math.exp(-z));
  
  return riskScore;
};

export const calculateMLPremium = (riskScore: number, planType: 'Standard' | 'Pro'): MLRiskOutput => {
  const basePremium = planType === 'Pro' ? 70 : 50;
  let adjustment = 0;
  let riskLevel: 'Safe' | 'Medium' | 'High' = 'Medium';

  if (planType === 'Pro') {
    if (riskScore < 0.3) {
      adjustment = -3;
      riskLevel = 'Safe';
    } else if (riskScore > 0.6) {
      adjustment = 5;
      riskLevel = 'High';
    } else {
      adjustment = 0;
      riskLevel = 'Medium';
    }
  } else {
    // Standard Plan
    if (riskScore < 0.3) {
      adjustment = -2;
      riskLevel = 'Safe';
    } else if (riskScore > 0.6) {
      adjustment = 3;
      riskLevel = 'High';
    } else {
      adjustment = 0;
      riskLevel = 'Medium';
    }
  }

  return {
    riskScore,
    riskLevel,
    basePremium,
    adjustment,
    finalPremium: basePremium + adjustment
  };
};
