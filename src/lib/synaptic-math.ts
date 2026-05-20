export function calculateEntropy(currentEntropy: number, daysMissed: number): number {
  // Экспоненциальный рост энтропии за каждый пропущенный день
  const baseEntropyPenalty = 1.0;
  const growthFactor = 1.1; // Насколько быстрее растет сопротивление с каждым днем
  return currentEntropy + (baseEntropyPenalty * Math.pow(growthFactor, daysMissed));
}

export function checkDowngrade(entropyLevel: number, threshold = 5.0): boolean {
  return entropyLevel >= threshold;
}
