import { crToXp, getXpThresholds } from './xpTable';

/**
 * Calculate encounter difficulty rating based on SRD 5.1 rules.
 * Compares total adjusted enemy XP against party thresholds.
 *
 * @param {Array<{level: number}>} party - Party members with levels
 * @param {Array<{cr: string|number}>} enemies - Enemies with CR values
 * @returns {{ rating: string, color: string, totalXp: number, adjustedXp: number, thresholds: object }}
 */
export function calculateEncounterDifficulty(party = [], enemies = []) {
  if (party.length === 0 || enemies.length === 0) {
    return { rating: 'Unknown', color: '#95a5a6', totalXp: 0, adjustedXp: 0, thresholds: {} };
  }

  // Sum raw XP from all enemies
  const totalXp = enemies.reduce((sum, e) => sum + crToXp(e.cr), 0);

  // Apply encounter multiplier based on number of monsters (DMG p.82)
  const count = enemies.length;
  let multiplier = 1;
  if (count === 2) multiplier = 1.5;
  else if (count >= 3 && count <= 6) multiplier = 2;
  else if (count >= 7 && count <= 10) multiplier = 2.5;
  else if (count >= 11 && count <= 14) multiplier = 3;
  else if (count >= 15) multiplier = 4;

  // Adjust for party size
  if (party.length < 3) multiplier += 0.5;
  else if (party.length >= 6) multiplier = Math.max(1, multiplier - 0.5);

  const adjustedXp = Math.round(totalXp * multiplier);

  // Sum party thresholds
  const thresholds = { easy: 0, medium: 0, hard: 0, deadly: 0 };
  for (const member of party) {
    const t = getXpThresholds(member.level || 1);
    thresholds.easy += t.easy;
    thresholds.medium += t.medium;
    thresholds.hard += t.hard;
    thresholds.deadly += t.deadly;
  }

  // Determine rating
  let rating, color;
  if (adjustedXp >= thresholds.deadly) {
    rating = 'Deadly';
    color = '#e74c3c';
  } else if (adjustedXp >= thresholds.hard) {
    rating = 'Hard';
    color = '#e67e22';
  } else if (adjustedXp >= thresholds.medium) {
    rating = 'Medium';
    color = '#f1c40f';
  } else {
    rating = 'Easy';
    color = '#2ecc71';
  }

  return { rating, color, totalXp, adjustedXp, thresholds };
}
