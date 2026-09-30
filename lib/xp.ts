export const LEVEL_UP_COINS = 500;
export const requiredXP = (level: number) => 1000 + level * 250;

export function applyXP(level: number, xp: number, gain: number) {
  let l = level, x = xp + gain, levelsGained = 0;
  while (x >= requiredXP(l)) { x -= requiredXP(l); l++; levelsGained++; }
  return { level: l, xp: x, levelsGained };
}
