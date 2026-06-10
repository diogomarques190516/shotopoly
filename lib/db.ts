import { supabase } from './supabase';

// Atomic game operations backed by the RPCs in supabase/schema.sql.
// Each helper falls back to a plain read-modify-write if the RPC is missing,
// so the app keeps working (with the old race conditions) on a database
// where schema.sql hasn't been applied yet.

async function rpcMissing(error: { code?: string; message?: string } | null): Promise<boolean> {
  if (!error) return false;
  return error.code === 'PGRST202' || /function .* does not exist/i.test(error.message ?? '');
}

export async function adjustMoney(playerId: string, delta: number): Promise<void> {
  const { error } = await supabase.rpc('adjust_money', { p_player_id: playerId, p_delta: delta });
  if (await rpcMissing(error)) {
    const { data } = await supabase.from('players').select('money').eq('id', playerId).single();
    if (!data) return;
    await supabase.from('players').update({ money: Math.max(0, data.money + delta) }).eq('id', playerId);
  }
}

export async function adjustShots(playerId: string, delta: number): Promise<void> {
  const { error } = await supabase.rpc('adjust_shots', { p_player_id: playerId, p_delta: delta });
  if (await rpcMissing(error)) {
    const { data } = await supabase.from('players').select('shots_owed').eq('id', playerId).single();
    if (!data) return;
    await supabase.from('players').update({ shots_owed: Math.max(0, data.shots_owed + delta) }).eq('id', playerId);
  }
}

export async function transferMoney(fromId: string, toId: string, amount: number): Promise<void> {
  const { error } = await supabase.rpc('transfer_money', { p_from: fromId, p_to: toId, p_amount: amount });
  if (await rpcMissing(error)) {
    await adjustMoney(fromId, -amount);
    await adjustMoney(toId, amount);
  }
}

// Advances the turn exactly once. Returns false when another client already
// advanced this turn (the expected_turn guard rejected the call).
export async function advanceTurnGuarded(gameId: string, expectedTurn: number, roomId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('advance_turn', {
    p_game_id: gameId,
    p_expected_turn: expectedTurn,
  });
  if (!error) return data !== -1;
  if (!(await rpcMissing(error))) return false;

  // Fallback without the guard: compute next player client-side
  const { data: ps } = await supabase
    .from('players').select().eq('room_id', roomId).order('created_at', { ascending: true });
  const all = ps ?? [];
  if (all.length === 0) return false;
  const { data: gs } = await supabase.from('game_states').select().eq('id', gameId).single();
  if (!gs || gs.turn_number !== expectedTurn) return false;

  const ci = all.findIndex(p => p.id === gs.current_player_id);
  let nextIdx = ((ci >= 0 ? ci : 0) + 1) % all.length;
  for (let attempts = 0; attempts < all.length && all[nextIdx].money <= 0; attempts++) {
    nextIdx = (nextIdx + 1) % all.length;
  }
  await supabase.from('game_states').update({
    current_player_id: all[nextIdx].id,
    turn_number: expectedTurn + 1,
    dice_result: null,
    phase: 'rolling',
  }).eq('id', gameId);
  return true;
}

export async function endGame(gameId: string, roomId: string): Promise<void> {
  const { error } = await supabase.rpc('end_game', { p_game_id: gameId });
  if (await rpcMissing(error)) {
    await supabase.from('game_states').update({ phase: 'ended' }).eq('id', gameId);
    await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
  }
}
