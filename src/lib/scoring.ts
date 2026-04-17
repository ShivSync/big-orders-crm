export interface ScoringInput {
  distanceKm: number;
  category: string;
  estimatedSize?: number;
  competitorCount: number;
}

const CATEGORY_WEIGHTS: Record<string, number> = {
  school: 25,
  university: 25,
  hotel: 22,
  event_venue: 20,
  company: 18,
  hospital: 15,
  government: 12,
  club: 10,
  restaurant: 5,
  other: 5,
};

export function calculateLeadScore(input: ScoringInput): number {
  let score = 0;

  // Distance score (0-30): closer = higher
  if (input.distanceKm <= 0.5) score += 30;
  else if (input.distanceKm <= 1) score += 25;
  else if (input.distanceKm <= 2) score += 20;
  else if (input.distanceKm <= 3) score += 15;
  else if (input.distanceKm <= 5) score += 10;
  else score += 5;

  // Category score (0-25)
  score += CATEGORY_WEIGHTS[input.category] || 5;

  // Size score (0-25): larger orgs = higher
  const size = input.estimatedSize || 0;
  if (size >= 500) score += 25;
  else if (size >= 200) score += 20;
  else if (size >= 100) score += 15;
  else if (size >= 50) score += 10;
  else if (size >= 20) score += 5;

  // Competitor penalty (0 to -20): more competitors nearby = lower score
  if (input.competitorCount === 0) score += 20;
  else if (input.competitorCount === 1) score += 10;
  else if (input.competitorCount === 2) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
