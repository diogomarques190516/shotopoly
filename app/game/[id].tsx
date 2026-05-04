import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { Player, GameState, BoardSpace } from '../../lib/types';
import { getBoardSpace, BOARD_SIZE, drawEventCard } from '../../lib/gameLogic';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { Board } from '../../components/Board';
import { DiceRollModal } from '../../components/DiceRollModal';
import { PropertiesPanel } from '../../components/PropertiesPanel';
import {
  C,
  PLAYER_EMOJIS,
  UPGRADE_COST,
  formatMoney,
  getLeveledRent,
  getLeveledSips,
} from '../../constants/gameConstants';
import { initSounds, playSound } from '../../lib/sounds';

// ── modal union ───────────────────────────────────────────────────────────────

type ModalType =
  | { kind: 'buy';        space: BoardSpace }
  | { kind: 'upgrade';    space: BoardSpace }
  | { kind: 'pay_rent';   space: BoardSpace; ownerName: string; ownerId: string; ownerMoney: number; leveledRent: number; leveledSips: number }
  | { kind: 'event';      message: string; effect: string; currentMoney: number }
  | { kind: 'notification'; title: string; message: string; accentColor: string }
  | { kind: 'jail_choice' }
  | { kind: 'winner'; winnerName: string; winnerEmoji: string; finalStandings: Array<{ name: string; money: number; shots: number; emoji: string }> }
  | null;

// ── GameScreen ────────────────────────────────────────────────────────────────

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: sw, height: sh } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const DICE_H    = 58 + 16 + insets.bottom;
  const PANEL_H   = 130;
  const HEADER_H  = 44;
  const PADDING_V = 8;
  const availH    = sh - HEADER_H - PANEL_H - DICE_H - PADDING_V;
  const boardWidth = Math.min(sw - 8, availH);

  const [gameState,     setGameState]     = useState<GameState | null>(null);
  const [players,       setPlayers]       = useState<Player[]>([]);
  const [myPlayer,      setMyPlayer]      = useState<Player | null>(null);
  const [roomCode,      setRoomCode]      = useState('----');
  const [modal,         setModal]         = useState<ModalType>(null);
  const [diceVisible,   setDiceVisible]   = useState(false);
  const [rolling,       setRolling]       = useState(false);
  const [lastRoll,      setLastRoll]      = useState<number | null>(null);
  const [landedSpace,   setLandedSpace]   = useState<BoardSpace | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [animPositions, setAnimPositions] = useState<Record<string, number>>({});

  const channelsRef            = useRef<RealtimeChannel[]>([]);
  const myPlayerIdRef          = useRef<string | null>(null);
  const roomIdRef              = useRef<string | null>(null);
  const notifContinuationRef   = useRef<(() => void) | null>(null);
  const processedJailTurnRef   = useRef<number | null>(null);

  useEffect(() => {
    initSounds();
    loadGame();
    return () => {
      channelsRef.current.forEach(c => supabase.removeChannel(c));
      channelsRef.current = [];
    };
  }, [id]);

  // Show jail choice modal when it becomes this player's turn while jailed
  useEffect(() => {
    if (!gameState || !myPlayer) return;
    const myTurn = gameState.current_player_id === myPlayer.id && gameState.phase === 'rolling';
    if (!myTurn || (myPlayer.jail_turns ?? 0) <= 0) return;
    if (processedJailTurnRef.current === gameState.turn_number) return;
    processedJailTurnRef.current = gameState.turn_number;
    setModal({ kind: 'jail_choice' });
  }, [gameState, myPlayer]);

  async function loadGame() {
    try {
      // ── game state ────────────────────────────────────────────────────────────
      const { data: gs, error: gsErr } = await supabase
        .from('game_states').select().eq('id', id).single();
      if (gsErr) { console.error('[loadGame] game_states query failed:', gsErr.message, gsErr.details); }
      if (!gs) { router.replace('/'); return; }
      setGameState(gs);

      // ── room code ─────────────────────────────────────────────────────────────
      const { data: room, error: roomErr } = await supabase
        .from('rooms').select('code').eq('id', gs.room_id).single();
      if (roomErr) { console.error('[loadGame] rooms query failed:', roomErr.message); }
      if (room) setRoomCode(room.code);
      roomIdRef.current = gs.room_id;

      // ── players ───────────────────────────────────────────────────────────────
      const { data: ps, error: psErr } = await supabase
        .from('players').select().eq('room_id', gs.room_id).order('created_at', { ascending: true });
      if (psErr) { console.error('[loadGame] players query failed:', psErr.message, psErr.details); }
      const all: Player[] = ps ?? [];
      setPlayers(all);

      // ── identity resolution ───────────────────────────────────────────────────
      let savedId: string | null = null;
      try {
        savedId = await AsyncStorage.getItem(`player_id_${gs.room_id}`);
      } catch (e) {
        console.warn('[identity] AsyncStorage read failed:', e);
      }

      const savedPlayer = savedId ? all.find(p => p.id === savedId) : null;
      let me: Player | null = null;
      if (savedPlayer)        { me = savedPlayer; }
      else if (all.length === 1) { me = all[0]; }
      else if (all.length > 1)   { me = all[all.length - 1]; }

      if (me) {
        setMyPlayer(me);
        myPlayerIdRef.current = me.id;
        try {
          await AsyncStorage.setItem(`player_id_${gs.room_id}`, me.id);
          // Persist session for restore on next app open
          await AsyncStorage.setItem('last_session', JSON.stringify({
            gameStateId: id,
            roomId: gs.room_id,
            playerId: me.id,
          }));
        } catch (e) {
          console.warn('[identity] AsyncStorage write failed:', e);
        }
      }

      console.log('[identity]', {
        savedId,
        resolvedId: me?.id ?? null,
        currentPlayerId: gs.current_player_id,
        isMyTurn: me?.id === gs.current_player_id,
        playerCount: all.length,
      });

      subscribeGS(id);
      subscribePlayers(gs.room_id);
    } finally {
      setLoading(false);
    }
  }

  function subscribeGS(gsId: string) {
    const ch = supabase.channel(`gs:${gsId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_states', filter: `id=eq.${gsId}` },
        async (payload) => {
          const gs = payload.new as GameState;
          console.log('[realtime] game_states UPDATE', { turn: gs.turn_number, currentPlayerId: gs.current_player_id });
          setGameState(gs);
          // Also refresh players so board stays in sync without waiting for players subscription
          const rid = roomIdRef.current;
          if (rid) {
            const { data } = await supabase.from('players').select().eq('room_id', rid).order('created_at', { ascending: true });
            const all = data ?? [];
            setPlayers(all);
            setMyPlayer(all.find(p => p.id === myPlayerIdRef.current) ?? null);
          }
        })
      .subscribe((status) => {
        console.log('[realtime] gs channel status:', status);
      });
    channelsRef.current.push(ch);
  }

  function subscribePlayers(roomId: string) {
    const ch = supabase.channel(`gp:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          console.log('[realtime] players', payload.eventType, { id: (payload.new as any)?.id, pos: (payload.new as any)?.position });
          const { data } = await supabase.from('players').select().eq('room_id', roomId).order('created_at', { ascending: true });
          const all = data ?? [];
          setPlayers(all);
          setMyPlayer(all.find(p => p.id === myPlayerIdRef.current) ?? null);
        })
      .subscribe((status) => {
        console.log('[realtime] players channel status:', status);
      });
    channelsRef.current.push(ch);
  }

  // ── dice / hop animation ──────────────────────────────────────────────────────

  const handleDiceComplete = useCallback(async (dice: number) => {
    setDiceVisible(false);
    if (!gameState || !myPlayer) return;
    setRolling(true);

    const startPos = myPlayer.position;
    const rawNew   = startPos + dice;
    const newPos   = rawNew % BOARD_SIZE;
    const passedGo = rawNew >= BOARD_SIZE;

    setLastRoll(dice);
    const space = getBoardSpace(newPos);
    setLandedSpace(space);

    try {
      playSound('dice');
      // Hop animation — step through each tile
      for (let step = 1; step <= dice; step++) {
        setAnimPositions({ [myPlayer.id]: (startPos + step) % BOARD_SIZE });
        playSound('hop');
        await new Promise<void>(res => setTimeout(res, 180));
      }
      // Hold token at final position in animPositions while we update local state
      setAnimPositions({ [myPlayer.id]: newPos });

      // Persist final position
      const updates: any = { position: newPos };
      if (passedGo) updates.money = myPlayer.money + 200000;
      await supabase.from('players').update(updates).eq('id', myPlayer.id);

      // Update local players state with new position so clearing animPositions
      // won't snap the token back to the old position
      const freshMoney = passedGo ? myPlayer.money + 200000 : myPlayer.money;
      const updatedPlayers = players.map(p =>
        p.id === myPlayer.id ? { ...p, position: newPos, money: freshMoney } : p
      );
      setPlayers(updatedPlayers);
      setMyPlayer(updatedPlayers.find(p => p.id === myPlayer.id) ?? myPlayer);

      // Now safe to clear — token is already at newPos in local state
      setAnimPositions({});

      if (passedGo) {
        playSound('go');
        notifContinuationRef.current = () => resolveSpace(space, newPos, freshMoney);
        setModal({ kind: 'notification', title: '🎯 GO!', message: `Passaste pelo GO!\nRecebes €200k.`, accentColor: C.gold });
      } else {
        await resolveSpace(space, newPos, freshMoney);
      }
    } catch (err: any) {
      showNotification('Erro', err.message, '#E94560');
    } finally {
      setRolling(false);
      setAnimPositions({});
    }
  }, [gameState, myPlayer, players]);

  async function resolveSpace(space: BoardSpace, newPos: number, currentMoney: number) {
    if (!gameState || !myPlayer) return;

    if (space.type === 'go' || space.type === 'free_parking' || space.type === 'jail') {
      await advanceTurn(); return;
    }
    if (space.type === 'go_to_jail') {
      await supabase.from('players').update({ position: 7, jail_turns: 3 }).eq('id', myPlayer.id);
      playSound('jail');
      showNotification('🚔 Preso!', 'Foste direto para a Cadeia.\nSaltas as próximas 3 rondas.', '#FF6BD0');
      notifContinuationRef.current = advanceTurn;
      return;
    }
    if (space.type === 'tax') {
      const tax = space.taxAmount ?? 100000;
      await supabase.from('players').update({ money: Math.max(0, currentMoney - tax) }).eq('id', myPlayer.id);
      showNotification('Imposto', `Pagaste ${formatMoney(tax)} de imposto.`, '#5A6378');
      notifContinuationRef.current = advanceTurn;
      return;
    }
    if (space.type === 'event') {
      const card = drawEventCard();
      playSound('card');
      setModal({ kind: 'event', message: card.message, effect: card.effect, currentMoney });
      return;
    }
    if (space.type === 'property') {
      const propLevels = gameState.property_levels ?? {};
      // Use Number() coercion so JSONB strings or numbers both match
      const owner = players.find(p =>
        Array.isArray(p.properties) &&
        (p.properties as any[]).some((pos: any) => Number(pos) === newPos)
      );
      if (!owner) { setModal({ kind: 'buy', space }); return; }
      if (owner.id === myPlayer.id) { setModal({ kind: 'upgrade', space }); return; }
      // Someone else owns it — lander picks how to pay (owner collects passively)
      const levRent = getLeveledRent(space, propLevels, owner);
      const levSips = getLeveledSips(space, propLevels);
      setModal({ kind: 'pay_rent', space, ownerName: owner.name, ownerId: owner.id, ownerMoney: owner.money, leveledRent: levRent, leveledSips: levSips });
    }
  }

  // ── event effects ─────────────────────────────────────────────────────────────

  async function applyEventEffect(effect: string, currentMoney: number) {
    if (!myPlayer || !gameState) return;
    const myIdx = players.findIndex(p => p.id === myPlayer.id);
    const left  = players[(myIdx + 1) % players.length];
    const right = players[((myIdx - 1) + players.length) % players.length];

    switch (effect) {
      case 'collect_20_all':
        for (const p of players) if (p.id !== myPlayer.id) await supabase.from('players').update({ money: Math.max(0, p.money - 20000) }).eq('id', p.id);
        await supabase.from('players').update({ money: currentMoney + 20000 * (players.length - 1) }).eq('id', myPlayer.id);
        break;
      case 'collect_30_all':
        for (const p of players) if (p.id !== myPlayer.id) await supabase.from('players').update({ money: Math.max(0, p.money - 30000) }).eq('id', p.id);
        await supabase.from('players').update({ money: currentMoney + 30000 * (players.length - 1) }).eq('id', myPlayer.id);
        break;
      case 'collect_50_all':
        for (const p of players) if (p.id !== myPlayer.id) await supabase.from('players').update({ money: Math.max(0, p.money - 50000) }).eq('id', p.id);
        await supabase.from('players').update({ money: currentMoney + 50000 * (players.length - 1) }).eq('id', myPlayer.id);
        break;
      case 'collect_100_all':
        for (const p of players) if (p.id !== myPlayer.id) await supabase.from('players').update({ money: Math.max(0, p.money - 100000) }).eq('id', p.id);
        await supabase.from('players').update({ money: currentMoney + 100000 * (players.length - 1) }).eq('id', myPlayer.id);
        break;
      case 'collect_bank_50':
        await supabase.from('players').update({ money: currentMoney + 50000 }).eq('id', myPlayer.id); break;
      case 'collect_bank_100':
        await supabase.from('players').update({ money: currentMoney + 100000 }).eq('id', myPlayer.id); break;
      case 'collect_bank_150':
        await supabase.from('players').update({ money: currentMoney + 150000 }).eq('id', myPlayer.id); break;
      case 'collect_bank_200':
        await supabase.from('players').update({ money: currentMoney + 200000 }).eq('id', myPlayer.id); break;
      case 'pay_bank_50':
        await supabase.from('players').update({ money: Math.max(0, currentMoney - 50000) }).eq('id', myPlayer.id); break;
      case 'pay_bank_100':
        await supabase.from('players').update({ money: Math.max(0, currentMoney - 100000) }).eq('id', myPlayer.id); break;
      case 'pay_bank_200':
        await supabase.from('players').update({ money: Math.max(0, currentMoney - 200000) }).eq('id', myPlayer.id); break;
      case 'all_drink_1':
        for (const p of players) await supabase.from('players').update({ shots_owed: p.shots_owed + 1 }).eq('id', p.id); break;
      case 'all_drink_2':
        for (const p of players) await supabase.from('players').update({ shots_owed: p.shots_owed + 2 }).eq('id', p.id); break;
      case 'others_drink_1':
        for (const p of players) if (p.id !== myPlayer.id) await supabase.from('players').update({ shots_owed: p.shots_owed + 1 }).eq('id', p.id); break;
      case 'self_drink_1':
        await supabase.from('players').update({ shots_owed: myPlayer.shots_owed + 1 }).eq('id', myPlayer.id); break;
      case 'self_drink_2':
        await supabase.from('players').update({ shots_owed: myPlayer.shots_owed + 2 }).eq('id', myPlayer.id); break;
      case 'self_drink_3':
        await supabase.from('players').update({ shots_owed: myPlayer.shots_owed + 3 }).eq('id', myPlayer.id); break;
      case 'remove_1_shot':
        await supabase.from('players').update({ shots_owed: Math.max(0, myPlayer.shots_owed - 1) }).eq('id', myPlayer.id); break;
      case 'give_1_shot':
        await supabase.from('players').update({ shots_owed: left.shots_owed + 1 }).eq('id', left.id); break;
      case 'give_2_shots':
        await supabase.from('players').update({ shots_owed: left.shots_owed + 2 }).eq('id', left.id); break;
      case 'give_3_shots':
        await supabase.from('players').update({ shots_owed: left.shots_owed + 3 }).eq('id', left.id); break;
      case 'give_shots_right':
        await supabase.from('players').update({ shots_owed: right.shots_owed + 2 }).eq('id', right.id); break;
      case 'advance_go':
        await supabase.from('players').update({ position: 0, money: currentMoney + 200000 }).eq('id', myPlayer.id); break;
      case 'go_to_jail_effect':
        await supabase.from('players').update({ position: 7 }).eq('id', myPlayer.id); break;
      case 'advance_3': {
        const np = (myPlayer.position + 3) % BOARD_SIZE;
        await supabase.from('players').update({ position: np }).eq('id', myPlayer.id); break;
      }
      case 'advance_5': {
        const np = (myPlayer.position + 5) % BOARD_SIZE;
        await supabase.from('players').update({ position: np }).eq('id', myPlayer.id); break;
      }
      case 'back_2': {
        const np = ((myPlayer.position - 2) + BOARD_SIZE) % BOARD_SIZE;
        await supabase.from('players').update({ position: np }).eq('id', myPlayer.id); break;
      }
      case 'back_3': {
        const np = ((myPlayer.position - 3) + BOARD_SIZE) % BOARD_SIZE;
        await supabase.from('players').update({ position: np }).eq('id', myPlayer.id); break;
      }
      case 'swap_left': {
        if (players.length < 2) break;
        await supabase.from('players').update({ position: left.position }).eq('id', myPlayer.id);
        await supabase.from('players').update({ position: myPlayer.position }).eq('id', left.id); break;
      }
      case 'rotate_positions': {
        if (players.length < 2) break;
        const positions = players.map(p => p.position);
        for (let i = 0; i < players.length; i++) {
          await supabase.from('players').update({ position: positions[(i + 1) % players.length] }).eq('id', players[i].id);
        }
        break;
      }
      case 'collect_bank_300_drink_3':
        await supabase.from('players').update({ money: currentMoney + 300000, shots_owed: myPlayer.shots_owed + 3 }).eq('id', myPlayer.id); break;
      case 'collect_bank_100_drink_2':
        await supabase.from('players').update({ money: currentMoney + 100000, shots_owed: myPlayer.shots_owed + 2 }).eq('id', myPlayer.id); break;
      case 'pay_advance_3': {
        const np = (myPlayer.position + 3) % BOARD_SIZE;
        await supabase.from('players').update({ money: Math.max(0, currentMoney - 100000), position: np }).eq('id', myPlayer.id); break;
      }
      case 'advance_3_collect_50': {
        const np = (myPlayer.position + 3) % BOARD_SIZE;
        await supabase.from('players').update({ position: np, money: currentMoney + 50000 }).eq('id', myPlayer.id); break;
      }
      case 'drink_back_2': {
        const np = ((myPlayer.position - 2) + BOARD_SIZE) % BOARD_SIZE;
        await supabase.from('players').update({ shots_owed: myPlayer.shots_owed + 1, position: np }).eq('id', myPlayer.id); break;
      }
      case 'others_pay_bank_50':
        for (const p of players) if (p.id !== myPlayer.id) await supabase.from('players').update({ money: Math.max(0, p.money - 50000) }).eq('id', p.id); break;
      case 'poorest_collects': {
        const poorest = players.reduce((a, b) => a.money <= b.money ? a : b);
        for (const p of players) if (p.id !== poorest.id) await supabase.from('players').update({ money: Math.max(0, p.money - 100000) }).eq('id', p.id);
        await supabase.from('players').update({ money: poorest.money + 100000 * (players.length - 1) }).eq('id', poorest.id); break;
      }
      case 'richest_drinks_per_player': {
        const richest = players.reduce((a, b) => a.money >= b.money ? a : b);
        await supabase.from('players').update({ shots_owed: richest.shots_owed + (players.length - 1) }).eq('id', richest.id); break;
      }
      case 'all_except_poorest_drink': {
        const poorest = players.reduce((a, b) => a.money <= b.money ? a : b);
        for (const p of players) if (p.id !== poorest.id) await supabase.from('players').update({ shots_owed: p.shots_owed + 1 }).eq('id', p.id); break;
      }
      case 'roll_again':
        await supabase.from('game_states').update({ phase: 'rolling' }).eq('id', gameState.id);
        setModal(null);
        return;
    }
    await advanceTurn();
  }

  // ── jail bail ────────────────────────────────────────────────────────────────

  async function handleJailChoice(bail: boolean) {
    if (!myPlayer || !gameState) return;
    setModal(null);
    if (bail) {
      if (myPlayer.money < 50000) {
        showNotification('Sem fundos', 'Não tens €50k para pagar a caução.', '#5A6378');
        return;
      }
      await supabase.from('players').update({ money: myPlayer.money - 50000, jail_turns: 0 }).eq('id', myPlayer.id);
      // Keep current player — they roll this turn
      await supabase.from('game_states').update({ phase: 'rolling' }).eq('id', gameState.id);
      setGameState(prev => prev ? { ...prev, phase: 'rolling' } : prev);
    } else {
      const { data: fresh } = await supabase.from('players').select('jail_turns').eq('id', myPlayer.id).single();
      const remaining = Math.max(0, (fresh?.jail_turns ?? 0) - 1);
      await supabase.from('players').update({ jail_turns: remaining }).eq('id', myPlayer.id);
      const msg = remaining > 0
        ? `Ainda ${remaining} ronda${remaining !== 1 ? 's' : ''} na cadeia.`
        : 'Liberto! Podes jogar na próxima ronda.';
      playSound('jail');
      showNotification('🔒 Na Cadeia', msg, '#FF6BD0');
      notifContinuationRef.current = advanceTurn;
    }
  }

  // ── sell property ─────────────────────────────────────────────────────────────

  async function handleSell(position: number) {
    if (!myPlayer) return;
    const space = getBoardSpace(position);
    const salePrice = Math.floor((space.price ?? 0) * 0.5);
    const { data: fresh } = await supabase.from('players').select('money, properties').eq('id', myPlayer.id).single();
    const currentMoney = fresh?.money ?? myPlayer.money;
    const currentProps = (fresh?.properties as number[] ?? []);
    await supabase.from('players').update({
      money: currentMoney + salePrice,
      properties: currentProps.filter(p => p !== position),
    }).eq('id', myPlayer.id);
    await advanceTurn();
  }

  // ── shot tracker ──────────────────────────────────────────────────────────────

  async function handleDrinkShot(playerId: string) {
    const p = players.find(pl => pl.id === playerId);
    if (!p || p.shots_owed <= 0) return;
    await supabase.from('players').update({ shots_owed: p.shots_owed - 1 }).eq('id', p.id);
  }

  // ── winner detection ──────────────────────────────────────────────────────────

  function checkWinner(all: Player[]): boolean {
    if (all.length < 2) return false;
    const solvent = all.filter(p => p.money > 0);
    if (solvent.length !== 1) return false;
    const w    = solvent[0];
    const wIdx = all.findIndex(p => p.id === w.id);
    const standings = [...all]
      .sort((a, b) => b.money - a.money)
      .map(p => ({
        name:  p.name,
        money: p.money,
        shots: p.shots_owed,
        emoji: PLAYER_EMOJIS[all.findIndex(pl => pl.id === p.id) % PLAYER_EMOJIS.length],
      }));
    setModal({
      kind: 'winner',
      winnerName:     w.name,
      winnerEmoji:    PLAYER_EMOJIS[wIdx >= 0 ? wIdx % PLAYER_EMOJIS.length : 0],
      finalStandings: standings,
    });
    return true;
  }

  // ── exit game ────────────────────────────────────────────────────────────────

  async function exitGame() {
    try { await AsyncStorage.removeItem('last_session'); } catch {}
    channelsRef.current.forEach(c => supabase.removeChannel(c));
    channelsRef.current = [];
    router.replace('/');
  }

  // ── notification helpers ──────────────────────────────────────────────────────

  function showNotification(title: string, message: string, accentColor: string) {
    setModal({ kind: 'notification', title, message, accentColor });
  }

  function handleNotificationDismiss() {
    const fn = notifContinuationRef.current;
    notifContinuationRef.current = null;
    setModal(null);
    fn?.();
  }

  // ── pay rent (lander decides: full money or reduced + shots) ─────────────────

  async function handlePayRent(choice: 'full' | 'discount') {
    if (!modal || modal.kind !== 'pay_rent' || !myPlayer) return;
    const { ownerId, ownerMoney, leveledRent, leveledSips } = modal;
    const discountedRent = Math.max(0, Math.round(leveledRent * 0.5 / 10000) * 10000);
    playSound('rent');
    if (choice === 'full') {
      await supabase.from('players').update({ money: Math.max(0, myPlayer.money - leveledRent) }).eq('id', myPlayer.id);
      await supabase.from('players').update({ money: ownerMoney + leveledRent }).eq('id', ownerId);
    } else {
      await supabase.from('players').update({
        money: Math.max(0, myPlayer.money - discountedRent),
        shots_owed: myPlayer.shots_owed + leveledSips,
      }).eq('id', myPlayer.id);
      await supabase.from('players').update({ money: ownerMoney + discountedRent }).eq('id', ownerId);
    }
    await advanceTurn();
  }

  // ── turn / buy / upgrade ──────────────────────────────────────────────────────

  async function advanceTurn() {
    if (!gameState) return;
    const rid = roomIdRef.current ?? gameState.room_id;
    const { data: freshPs } = await supabase
      .from('players').select().eq('room_id', rid).order('created_at', { ascending: true });
    const all = freshPs ?? players;

    if (checkWinner(all)) return;

    // Skip bankrupt players (money <= 0)
    const ci = all.findIndex(p => p.id === gameState.current_player_id);
    let nextIdx = (ci + 1) % all.length;
    for (let attempts = 0; attempts < all.length && all[nextIdx].money <= 0; attempts++) {
      nextIdx = (nextIdx + 1) % all.length;
    }
    const next = all[nextIdx];
    const nextGs: GameState = {
      ...gameState,
      current_player_id: next.id,
      turn_number: gameState.turn_number + 1,
      dice_result: null,
      phase: 'rolling',
    };
    await supabase.from('game_states').update({
      current_player_id: nextGs.current_player_id,
      turn_number: nextGs.turn_number,
      dice_result: null, phase: 'rolling',
    }).eq('id', gameState.id);
    // ← critical: update gameState locally so the writer's isMyTurn flips immediately
    setGameState(nextGs);
    setPlayers(all);
    setMyPlayer(all.find(p => p.id === myPlayerIdRef.current) ?? null);
    setModal(null); setLastRoll(null); setLandedSpace(null);
  }

  function calcBuyOptions(fullPrice: number) {
    const discountedPrice = Math.round(fullPrice * 0.6 / 10000) * 10000;
    const sips = Math.max(1, Math.round((fullPrice - discountedPrice) / 25000));
    return { discountedPrice, sips };
  }

  async function handleBuyOption(option: 'discount' | 'full' | 'pass') {
    if (!modal || modal.kind !== 'buy' || !myPlayer) return;
    const space = modal.space;
    const fullPrice = space.price ?? 0;
    const { discountedPrice, sips } = calcBuyOptions(fullPrice);

    if (option === 'pass') { await advanceTurn(); return; }

    // Fetch fresh balance — position/GO update may not yet be in local state
    const { data: fresh } = await supabase
      .from('players').select('money, shots_owed, properties').eq('id', myPlayer.id).single();
    const currentMoney = fresh?.money ?? myPlayer.money;
    const currentShots = fresh?.shots_owed ?? myPlayer.shots_owed;
    const currentProps = (fresh?.properties as number[] | null) ?? (myPlayer.properties as number[] ?? []);

    if (option === 'full') {
      if (currentMoney < fullPrice) { showNotification('Sem fundos', 'Não tens saldo suficiente.', '#5A6378'); return; }
      await supabase.from('players').update({
        money: currentMoney - fullPrice,
        properties: [...currentProps, space.position],
      }).eq('id', myPlayer.id);
    } else {
      if (currentMoney < discountedPrice) { showNotification('Sem fundos', 'Não tens saldo suficiente.', '#5A6378'); return; }
      await supabase.from('players').update({
        money: currentMoney - discountedPrice,
        shots_owed: currentShots + sips,
        properties: [...currentProps, space.position],
      }).eq('id', myPlayer.id);
    }
    playSound('buy');
    await advanceTurn();
  }

  async function handleUpgrade(position: number) {
    if (!gameState || !myPlayer) return;
    const propLevels = gameState.property_levels ?? {};
    const currentLevel = propLevels[String(position)] ?? 1;
    if (currentLevel >= 3) return;
    const cost = UPGRADE_COST[currentLevel];
    if (myPlayer.money < cost) { showNotification('Sem fundos', 'Não tens saldo suficiente para fazer upgrade.', '#5A6378'); return; }
    const newLevels = { ...propLevels, [String(position)]: currentLevel + 1 };
    await supabase.from('game_states').update({ property_levels: newLevels }).eq('id', gameState.id);
    await supabase.from('players').update({ money: myPlayer.money - cost }).eq('id', myPlayer.id);
    // Update locally so UI reflects new level without waiting for Realtime
    setGameState({ ...gameState, property_levels: newLevels });
    await advanceTurn();
  }


  // ── render ────────────────────────────────────────────────────────────────────

  if (loading || !gameState) {
    return <View style={gs.center}><ActivityIndicator size="large" color={C.gold} /></View>;
  }

  const isMyTurn      = gameState.current_player_id === myPlayer?.id && gameState.phase === 'rolling';
  const currentPlayer = players.find(p => p.id === gameState.current_player_id);
  const propLevels    = gameState.property_levels ?? {};
  const myJailTurns   = myPlayer?.jail_turns ?? 0;
  const isJailed      = isMyTurn && myJailTurns > 0;

  console.log('[dice]', {
    myPlayerId:      myPlayer?.id ?? null,
    currentPlayerId: gameState.current_player_id,
    isMyTurn,
    isHost:          myPlayer?.is_host ?? false,
  });

  const myPlayerIdx   = players.findIndex(p => p.id === myPlayer?.id);
  const myPlayerEmoji = PLAYER_EMOJIS[myPlayerIdx >= 0 ? myPlayerIdx % PLAYER_EMOJIS.length : 0];

  return (
    <View style={gs.screen}>
      <View style={gs.header}>
        <Text style={gs.headerSub}>Sala #{roomCode} · Rodada {gameState.turn_number}</Text>
        <Text style={gs.headerTitle}>SHOTOPOLY</Text>
        <TouchableOpacity style={gs.exitBtn} onPress={exitGame}>
          <Text style={gs.exitTxt}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={{ alignItems: 'center', paddingTop: 4 }}>
        <Board
          players={players}
          boardWidth={boardWidth}
          turnNumber={gameState.turn_number}
          propLevels={propLevels}
          animPositions={animPositions}
        />
      </View>

      {lastRoll !== null && (
        <View style={gs.rollStrip}>
          <Text style={gs.rollNum}>{lastRoll}</Text>
          {landedSpace && <Text style={gs.rollSpace} numberOfLines={1}>{landedSpace.name}</Text>}
        </View>
      )}

      <PropertiesPanel
        players={players}
        currentPlayerId={gameState.current_player_id}
        myPlayerId={myPlayer?.id ?? null}
        propLevels={propLevels}
        onDrink={handleDrinkShot}
      />

      <View style={{ height: DICE_H }} />

      <View style={[gs.diceWrap, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[gs.diceBtn, (!isMyTurn || isJailed) && gs.diceDim]}
          onPress={() => {
            if (!isMyTurn || rolling || isJailed) return;
            setDiceVisible(true);
          }}
          disabled={!isMyTurn || rolling}
          activeOpacity={0.85}
        >
          {rolling
            ? <ActivityIndicator color={isMyTurn && !isJailed ? '#1a1409' : C.textFaint} />
            : isJailed
              ? <Text style={[gs.diceTxt, { color: C.textFaint }]}>
                  🔒 Na cadeia — {myJailTurns} ronda{myJailTurns !== 1 ? 's' : ''} restante{myJailTurns !== 1 ? 's' : ''}
                </Text>
              : <Text style={[gs.diceTxt, !isMyTurn && { color: C.textFaint }]}>
                  {isMyTurn ? '🎲 Lançar Dados' : `Vez de ${currentPlayer?.name ?? '…'}`}
                </Text>
          }
        </TouchableOpacity>
      </View>

      <DiceRollModal
        visible={diceVisible}
        playerName={myPlayer?.name ?? ''}
        playerEmoji={myPlayerEmoji}
        onComplete={handleDiceComplete}
      />

      {/* ── BUY ── */}
      <Modal visible={modal?.kind === 'buy'} transparent animationType="slide">
        {modal?.kind === 'buy' && (() => {
          const fullPrice = modal.space.price ?? 0;
          const { discountedPrice, sips } = calcBuyOptions(fullPrice);
          return (
            <View style={gs.overlay}>
              <View style={gs.mCard}>
                <Text style={gs.mTitle}>Propriedade à Venda</Text>
                {modal.space.color && <View style={[gs.colorBar, { backgroundColor: modal.space.color }]} />}
                <Text style={gs.mName}>{modal.space.name}</Text>
                <Text style={gs.mDetail}>Renda base: {formatMoney(modal.space.rent ?? 0)}</Text>
                <View style={gs.mRow}>
                  <TouchableOpacity style={gs.btnShots} onPress={() => handleBuyOption('discount')}>
                    <Text style={gs.btnTxt}>💸 {formatMoney(discountedPrice)}{'\n'}+ {sips} shots</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={gs.btnMoney} onPress={() => handleBuyOption('full')}>
                    <Text style={gs.btnTxt}>💰 {formatMoney(fullPrice)}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[gs.btnGhost, { marginTop: 12 }]} onPress={() => handleBuyOption('pass')}>
                  <Text style={gs.btnGhostTxt}>Passar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* ── PAY RENT ── */}
      <Modal visible={modal?.kind === 'pay_rent'} transparent animationType="slide">
        {modal?.kind === 'pay_rent' && (() => {
          const discountedRent = Math.max(0, Math.round(modal.leveledRent * 0.5 / 10000) * 10000);
          return (
            <View style={gs.overlay}>
              <View style={gs.mCard}>
                <Text style={gs.mTitle}>Propriedade Ocupada</Text>
                {modal.space.color && <View style={[gs.colorBar, { backgroundColor: modal.space.color }]} />}
                <Text style={gs.mName}>{modal.space.name}</Text>
                <Text style={gs.mSub}>Pertence a {modal.ownerName}</Text>
                <Text style={gs.mDetail}>Como queres pagar a renda?</Text>
                <View style={gs.mRow}>
                  <TouchableOpacity style={gs.btnMoney} onPress={() => handlePayRent('full')}>
                    <Text style={gs.btnTxt}>💰 Pagar renda{'\n'}{formatMoney(modal.leveledRent)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={gs.btnShots} onPress={() => handlePayRent('discount')}>
                    <Text style={gs.btnTxt}>🥃 {formatMoney(discountedRent)}{'\n'}+ {modal.leveledSips} shot{modal.leveledSips !== 1 ? 's' : ''}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* ── UPGRADE ── */}
      <Modal visible={modal?.kind === 'upgrade'} transparent animationType="slide">
        {modal?.kind === 'upgrade' && (() => {
          const space = modal.space;
          const level = propLevels[String(space.position)] ?? 1;
          const cost  = UPGRADE_COST[level] ?? 0;
          const newRent = (space.rent ?? 0) * (level + 1);
          const canUpgrade = level < 3 && (myPlayer?.money ?? 0) >= cost;
          return (
            <View style={gs.overlay}>
              <View style={gs.mCard}>
                <Text style={gs.mTitle}>A tua propriedade</Text>
                {space.color && <View style={[gs.colorBar, { backgroundColor: space.color }]} />}
                <Text style={gs.mName}>{space.name}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                  {[1, 2, 3].map(l => (
                    <View key={l} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: l <= level ? (space.color ?? C.gold) : 'rgba(255,255,255,0.12)' }} />
                  ))}
                </View>
                {level >= 3 ? (
                  <>
                    <Text style={[gs.mDetail, { color: C.green }]}>Nível máximo!</Text>
                    <Text style={gs.mDetail}>Renda: {formatMoney((space.rent ?? 0) * level)}</Text>
                  </>
                ) : (
                  <>
                    <Text style={gs.mDetail}>Renda atual: {formatMoney((space.rent ?? 0) * level)}</Text>
                    <Text style={gs.mDetail}>Após upgrade: {formatMoney(newRent)}</Text>
                    <View style={gs.mRow}>
                      <TouchableOpacity
                        style={canUpgrade ? gs.btnMoney : [gs.btnGhost, { flex: 1, opacity: 0.5 }]}
                        onPress={canUpgrade ? () => handleUpgrade(space.position) : undefined}
                      >
                        <Text style={canUpgrade ? gs.btnTxt : gs.btnGhostTxt}>
                          {canUpgrade ? `Upgrade — ${formatMoney(cost)}` : 'Sem fundos'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                <TouchableOpacity
                  style={[gs.btnGhost, { marginTop: 12, borderColor: '#E94560' }]}
                  onPress={() => handleSell(space.position)}
                >
                  <Text style={[gs.btnGhostTxt, { color: '#E94560' }]}>
                    Vender — {formatMoney(Math.floor((space.price ?? 0) * 0.5))}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[gs.btnGhost, { marginTop: 8 }]} onPress={advanceTurn}>
                  <Text style={gs.btnGhostTxt}>Continuar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </Modal>


      {/* ── EVENT ── */}
      <Modal visible={modal?.kind === 'event'} transparent animationType="slide">
        {modal?.kind === 'event' && (
          <View style={gs.overlay}>
            <View style={gs.mCard}>
              <Text style={gs.mTitle}>Carta de Evento</Text>
              <Text style={gs.eventMsg}>{modal.message}</Text>
              <TouchableOpacity style={gs.btnGold} onPress={() => {
                const { effect, currentMoney } = modal;
                setModal(null);
                applyEventEffect(effect, currentMoney);
              }}>
                <Text style={gs.btnGoldTxt}>Ok, entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* ── JAIL CHOICE ── */}
      <Modal visible={modal?.kind === 'jail_choice'} transparent animationType="slide">
        {modal?.kind === 'jail_choice' && (
          <View style={gs.overlay}>
            <View style={gs.mCard}>
              <Text style={gs.mTitle}>🔒 Estás na Cadeia</Text>
              <Text style={gs.mDetail}>
                {myPlayer ? `${myPlayer.jail_turns ?? 0} ronda${(myPlayer.jail_turns ?? 0) !== 1 ? 's' : ''} restante${(myPlayer.jail_turns ?? 0) !== 1 ? 's' : ''}` : ''}
              </Text>
              <View style={gs.mRow}>
                <TouchableOpacity style={gs.btnMoney} onPress={() => handleJailChoice(true)}>
                  <Text style={gs.btnTxt}>💸 Pagar Caução{'\n'}€50k e jogar agora</Text>
                </TouchableOpacity>
                <TouchableOpacity style={gs.btnShots} onPress={() => handleJailChoice(false)}>
                  <Text style={gs.btnTxt}>⏭ Saltar{'\n'}esta ronda</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* ── WINNER ── */}
      <Modal visible={modal?.kind === 'winner'} transparent animationType="fade">
        {modal?.kind === 'winner' && (
          <View style={gs.notifOverlay}>
            <View style={[gs.notifCard, { borderColor: C.gold + '88' }]}>
              <View style={[gs.notifAccent, { backgroundColor: C.gold }]} />
              <View style={gs.notifBody}>
                <Text style={{ fontSize: 48, textAlign: 'center' }}>{modal.winnerEmoji}</Text>
                <Text style={[gs.notifTitle, { color: C.gold, fontSize: 18 }]}>🏆 {modal.winnerName} ganhou!</Text>
                {modal.finalStandings.map((s, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                    <Text style={{ color: i === 0 ? C.gold : C.textDim, fontSize: 14 }}>{s.emoji} {s.name}</Text>
                    <Text style={{ color: C.textDim, fontSize: 13 }}>{formatMoney(s.money)}  🥃×{s.shots}</Text>
                  </View>
                ))}
                <TouchableOpacity style={[gs.notifBtn, { backgroundColor: C.gold, marginTop: 24 }]} onPress={exitGame}>
                  <Text style={[gs.notifBtnTxt, { color: '#1a1409' }]}>Voltar ao Início</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* ── NOTIFICATION (tax, jail, GO, errors) ── */}
      <Modal visible={modal?.kind === 'notification'} transparent animationType="fade">
        {modal?.kind === 'notification' && (
          <View style={gs.notifOverlay}>
            <View style={[gs.notifCard, { borderColor: modal.accentColor + '55' }]}>
              <View style={[gs.notifAccent, { backgroundColor: modal.accentColor }]} />
              <View style={gs.notifBody}>
                <Text style={[gs.notifTitle, { color: modal.accentColor }]}>{modal.title}</Text>
                <Text style={gs.notifMsg}>{modal.message}</Text>
                <TouchableOpacity
                  style={[gs.notifBtn, { backgroundColor: modal.accentColor }]}
                  onPress={handleNotificationDismiss}
                >
                  <Text style={[gs.notifBtnTxt, { color: modal.accentColor === C.gold ? '#1a1409' : '#fff' }]}>Ok</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const gs = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  header:      { alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerSub:   { fontSize: 9, color: C.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: C.gold, letterSpacing: 0.3 },
  exitBtn:     { position: 'absolute', right: 16, top: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  exitTxt:     { fontSize: 11, color: C.textFaint, fontWeight: '600' },

  rollStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 4 },
  rollNum:   { color: '#fff', fontSize: 17, fontWeight: '800' },
  rollSpace: { color: C.gold, fontSize: 12, maxWidth: '55%' },

  diceWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 8, paddingTop: 8, backgroundColor: C.bg },
  diceBtn:  { height: 58, borderRadius: 16, backgroundColor: C.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  diceDim:  { backgroundColor: 'rgba(255,255,255,0.06)' },
  diceTxt:  { fontSize: 17, fontWeight: '700', color: '#1a1409' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  mCard:   { backgroundColor: '#1a1f35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 44, borderTopWidth: 1, borderTopColor: 'rgba(255,210,63,0.3)' },
  mTitle:   { color: C.gold, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  colorBar: { height: 6, borderRadius: 3, marginBottom: 12 },
  mName:    { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  mSub:     { color: C.textDim, fontSize: 15, textAlign: 'center', marginBottom: 8 },
  mDetail:  { color: C.textDim, fontSize: 16, textAlign: 'center', marginBottom: 4 },
  mInfo:    { color: C.textDim, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  mRow:     { flexDirection: 'row', gap: 12, marginTop: 20 },
  eventMsg: { color: '#fff', fontSize: 18, textAlign: 'center', lineHeight: 26, marginVertical: 20 },

  btnGold:     { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnGoldTxt:  { color: '#1a1409', fontSize: 16, fontWeight: '800' },
  btnGhost:    { borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  btnGhostTxt: { color: C.textDim, fontSize: 16, fontWeight: '700' },
  btnMoney:    { flex: 1, backgroundColor: '#2BB573', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  btnShots:    { flex: 1, backgroundColor: '#E94560', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  btnTxt:      { color: '#fff', fontSize: 15, fontWeight: '800', textAlign: 'center' },

  notifOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  notifCard:    { backgroundColor: '#151b30', borderRadius: 20, overflow: 'hidden', width: '100%', borderWidth: 1 },
  notifAccent:  { height: 5 },
  notifBody:    { padding: 28 },
  notifTitle:   { fontSize: 13, fontWeight: '800', textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  notifMsg:     { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', lineHeight: 30, marginBottom: 28 },
  notifBtn:     { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  notifBtnTxt:  { fontSize: 16, fontWeight: '800' },
});
