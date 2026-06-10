import type { BoardSpace, Player, SpaceType } from '../lib/types';
import { ALL_SPACES } from '../lib/gameLogic';

export const C = {
  bg:        '#0a0d18',
  tile:      '#13182a',
  corner:    '#1a1f2e',
  text:      '#f4f5fb',
  textDim:   'rgba(244,245,251,0.55)',
  textFaint: 'rgba(244,245,251,0.32)',
  accent:    '#FF4655',                  // logo red — primary accent
  accentDim: 'rgba(255,70,85,0.30)',
  accentInk: '#FFFFFF',                  // text on red surfaces
  amber:     '#FFC300',                  // logo gold — money, titles, CTAs
  amberInk:  '#2B1A00',                  // text on gold surfaces
  danger:    '#FF4655',
  border:    'rgba(255,255,255,0.06)',
  green:     '#39FF8B',
};

// Loaded in app/_layout.tsx; referenced by name everywhere else.
export const FONTS = {
  display:   'BebasNeue_400Regular',
  body:      'Nunito_600SemiBold',
  bodyBold:  'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
};

// Body color of each character below — used for rings, dots and highlights
export const PLAYER_COLORS = ['#FF4655', '#FFC300', '#39D98A', '#4FC3F7', '#FF6BD0', '#FF8A3D', '#00E5C0', '#E8ECF5'];

// Original full-color party characters drawn in scripts/gen-art.js
export const TOKEN_IMAGES = [
  require('../assets/art/char_1.png'),
  require('../assets/art/char_2.png'),
  require('../assets/art/char_3.png'),
  require('../assets/art/char_4.png'),
  require('../assets/art/char_5.png'),
  require('../assets/art/char_6.png'),
  require('../assets/art/char_7.png'),
  require('../assets/art/char_8.png'),
];

export const ART = {
  go:      require('../assets/art/icon_go.png'),
  jail:    require('../assets/art/icon_jail.png'),
  siren:   require('../assets/art/icon_siren.png'),
  martini: require('../assets/art/icon_martini.png'),
  spark:   require('../assets/art/icon_spark.png'),
  coins:   require('../assets/art/icon_coins.png'),
  shot:    require('../assets/art/icon_shot.png'),
  die:     require('../assets/art/icon_die.png'),
  crown:   require('../assets/art/icon_crown.png'),
  trophy:  require('../assets/art/icon_trophy.png'),
};

export const SPACE_ICONS: Partial<Record<SpaceType, any>> = {
  go:           ART.go,
  jail:         ART.jail,
  go_to_jail:   ART.siren,
  free_parking: ART.martini,
  event:        ART.spark,
  tax:          ART.coins,
};

export const CORNER_TYPES  = new Set(['go', 'jail', 'free_parking', 'go_to_jail']);
export const UPGRADE_COST  = [0, 200000, 400000]; // cost to reach level 2, level 3

// Average seconds one turn takes in a real group (roll + animation + decision
// + drinking). Used to convert a target game duration into a turn budget.
export const SECONDS_PER_TURN = 35;

export const GAME_DURATIONS = [
  { key: 'fast',     minutes: 20 },
  { key: 'classic',  minutes: 35 },
  { key: 'marathon', minutes: 50 },
] as const;

// Turn budget for a target duration: total turns ≈ duration / avg turn time,
// rounded to a multiple of the player count so everyone plays the same
// number of rounds. This is what guarantees the 30–45 minute game.
export function calcMaxTurns(minutes: number, playerCount: number): number {
  const totalTurns = Math.round((minutes * 60) / SECONDS_PER_TURN);
  const rounds = Math.max(4, Math.round(totalTurns / Math.max(1, playerCount)));
  return rounds * Math.max(1, playerCount);
}

export function formatMoney(v: number): string {
  if (Math.abs(v) >= 1000000) {
    const m = v / 1000000;
    return `€${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  return `€${Math.floor(v / 1000)}k`;
}

export function getBandColor(space: BoardSpace): string | undefined {
  if (space.type === 'property') return space.color;
  if (space.type === 'event')    return '#00C2D1';
  if (space.type === 'tax')      return '#5A6378';
  return undefined;
}

export function hasMonopoly(owner: Player, space: BoardSpace): boolean {
  if (!space.color) return false;
  const colorTiles = ALL_SPACES.filter(s => s.type === 'property' && s.color === space.color);
  const owned = owner.properties as number[];
  return colorTiles.every(s => owned.includes(s.position));
}

export function getLeveledRent(space: BoardSpace, propLevels: Record<string, number>, owner?: Player): number {
  const level = propLevels[String(space.position)] ?? 1;
  const monopoly = owner ? hasMonopoly(owner, space) : false;
  return (space.rent ?? 0) * level * (monopoly ? 2 : 1);
}

// Ranking value: cash + what was invested in properties (price + upgrades)
export function netWorth(p: Player, propLevels: Record<string, number>): number {
  const props = (p.properties as number[]) ?? [];
  return props.reduce((sum, pos) => {
    const space = ALL_SPACES.find(s => s.position === pos);
    const level = propLevels[String(pos)] ?? 1;
    const upgrades = UPGRADE_COST.slice(1, level).reduce((a, b) => a + b, 0);
    return sum + (space?.price ?? 0) + upgrades;
  }, p.money);
}

export function getLeveledSips(space: BoardSpace, propLevels: Record<string, number>): number {
  const level = propLevels[String(space.position)] ?? 1;
  const match = space.sub?.match(/×(\d)/);
  const base = match ? parseInt(match[1]) : 1;
  return base * level;
}
