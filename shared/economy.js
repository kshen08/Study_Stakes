// Fixed stakes per difficulty tier. The stake is taken when a question is drawn
// (so abandoning a question forfeits it). A correct answer refunds the stake and
// adds the win amount; a wrong answer keeps the stake lost.
export const TIERS = {
  easy: { label: 'Easy', stake: 10, win: 15 },
  medium: { label: 'Medium', stake: 25, win: 50 },
  hard: { label: 'Hard', stake: 50, win: 125 },
};

// True/False can be guessed 50% of the time, so it pays less than the stake.
// This keeps blind guessing at negative expected value on every tier.
export const TF_WIN_MULTIPLIER = 0.8;

export const STARTING_COINS = 200;
export const DAILY_ALLOWANCE = 100;

export function winAmount(difficulty, type) {
  const tier = TIERS[difficulty];
  if (!tier) throw new Error(`Unknown difficulty: ${difficulty}`);
  return type === 'tf' ? Math.round(tier.stake * TF_WIN_MULTIPLIER) : tier.win;
}
