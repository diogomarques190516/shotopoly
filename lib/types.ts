export type RoomStatus = 'waiting' | 'playing' | 'finished';
export type GamePhase = 'rolling' | 'decision' | 'card' | 'ended';

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
  shots_drunk?: number;
  position: number;
  properties: number[];
  is_host: boolean;
  jail_turns: number;
}

export interface GameState {
  id: string;
  room_id: string;
  current_player_id: string;
  turn_number: number;
  dice_result: number | null;
  phase: GamePhase;
  property_levels: Record<string, number>;
}

export interface Event {
  id: string;
  room_id: string;
  type: string;
  message: string;
  payload: any;
  requires_action: boolean;
  resolved: boolean;
  created_at: string;
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
