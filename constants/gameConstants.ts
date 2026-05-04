import type { BoardSpace, Player } from '../lib/types';
import { ALL_SPACES } from '../lib/gameLogic';

export const C = {
  bg:        '#0a0d18',
  tile:      '#13182a',
  corner:    '#1a1f2e',
  text:      '#f4f5fb',
  textDim:   'rgba(244,245,251,0.55)',
  textFaint: 'rgba(244,245,251,0.32)',
  gold:      '#FFD23F',
  border:    'rgba(255,255,255,0.06)',
  green:     '#39FF8B',
};

export const PLAYER_COLORS = ['#FFD23F', '#39FF8B', '#B14CFF', '#FF6BD0', '#FF7F50', '#4FC3F7', '#81C784', '#FF8A65'];
export const PLAYER_EMOJIS = ['🦊', '🐻', '🐸', '🐼', '🦁', '🐯', '🐺', '🦝'];
export const CORNER_TYPES  = new Set(['go', 'jail', 'free_parking', 'go_to_jail']);
export const UPGRADE_COST  = [0, 200000, 400000]; // cost to reach level 2, level 3

export function formatMoney(v: number): string {
  return `€${Math.floor(v / 1000)}k`;
}

export function getBandColor(space: BoardSpace): string | undefined {
  if (space.type === 'property') return space.color;
  if (space.type === 'event')    return '#7B3FE4';
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

export function getLeveledSips(space: BoardSpace, propLevels: Record<string, number>): number {
  const level = propLevels[String(space.position)] ?? 1;
  const match = space.sub?.match(/×(\d)/);
  const base = match ? parseInt(match[1]) : 1;
  return base * level;
}
