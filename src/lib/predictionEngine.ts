export type LinearInputs = Record<string, number>;

export const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

export function linearScore(inputs: LinearInputs, weights: LinearInputs, bias = 0): number {
  return Object.entries(inputs).reduce((score, [key, value]) => score + value * (weights[key] ?? 0), bias);
}

export function predictProbability(inputs: LinearInputs, weights: LinearInputs, bias = 0): number {
  return sigmoid(linearScore(inputs, weights, bias));
}

export function footballWinProbability(inputs: { possession: number; shotQuality: number; fitness: number; recentForm: number }) {
  return predictProbability(inputs, { possession: 0.018, shotQuality: 1.4, fitness: 0.012, recentForm: 0.85 }, -2.1);
}

export function f1WinProbability(inputs: { paceDelta: number; tyreLife: number; trackPosition: number; consistency: number }) {
  return predictProbability(inputs, { paceDelta: 1.65, tyreLife: 0.018, trackPosition: 0.72, consistency: 0.015 }, -2.35);
}

export type FixturePredictionInputs = {
  homeForm: number;
  awayForm: number;
  homeAdvantage: number;
  squadStrengthDelta: number;
  goalDifferenceDelta?: number;
};

export const FOOTBALL_MODEL_WEIGHTS = {
  home: { homeForm: 1.15, awayForm: -0.72, homeAdvantage: 0.62, squadStrengthDelta: 1.05, goalDifferenceDelta: 0.66 },
  draw: { homeForm: -0.18, awayForm: -0.18, homeAdvantage: -0.12, squadStrengthDelta: -0.42, goalDifferenceDelta: -0.16 },
  away: { homeForm: -0.72, awayForm: 1.15, homeAdvantage: -0.52, squadStrengthDelta: -1.05, goalDifferenceDelta: -0.66 },
} as const;

export function fixturePrediction(inputs: FixturePredictionInputs) {
  const completeInputs = { ...inputs, goalDifferenceDelta: inputs.goalDifferenceDelta ?? 0 };
  const homeScore = linearScore(completeInputs, FOOTBALL_MODEL_WEIGHTS.home, -0.08);
  const drawScore = linearScore(completeInputs, FOOTBALL_MODEL_WEIGHTS.draw, 0.42);
  const awayScore = linearScore(completeInputs, FOOTBALL_MODEL_WEIGHTS.away, -0.02);
  const raw = [sigmoid(homeScore), sigmoid(drawScore), sigmoid(awayScore)];
  const total = raw.reduce((sum, value) => sum + value, 0);
  return { home: raw[0] / total, draw: raw[1] / total, away: raw[2] / total, inputs: completeInputs };
}
