export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type GamePhase = 'rolling' | 'ended';

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  money: number;
  shots_owed: number;
  position: number;
  properties: number[];
  is_host: boolean;
  jail_turns: number;
  created_at: string;
}

export interface GameState {
  id: string;
  room_id: string;
  current_player_id: string;
  turn_number: number;
  max_turns: number;
  dice_result: number | null;
  phase: GamePhase;
  property_levels: Record<string, number>;
}

export type SpaceType =
  | 'go'
  | 'property'
  | 'event'
  | 'tax'
  | 'jail'
  | 'free_parking'
  | 'go_to_jail';

export interface BoardSpace {
  position: number;
  name: string;
  type: SpaceType;
  price?: number;
  rent?: number;
  color?: string;
  taxAmount?: number;
  emoji?: string;
  sub?: string;
}
