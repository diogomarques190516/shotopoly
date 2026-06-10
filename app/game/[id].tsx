import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Image,
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
  FONTS,
  ART,
  UPGRADE_COST,
  formatMoney,
  getLeveledRent,
  getLeveledSips,
} from '../../constants/gameConstants';
import { Token } from '../../components/Token';
import { initSounds, playSound } from '../../lib/sounds';
import { getLocale, t, getEventMessage } from '../../lib/i18n';
import { adjustMoney, adjustShots, transferMoney, advanceTurnGuarded, endGame } from '../../lib/db';

// ── modal union ───────────────────────────────────────────────────────────────

type ModalType =
  | { kind: 'buy';        space: BoardSpace }
  | { kind: 'upgrade';    space: BoardSpace }
  | { kind: 'pay_rent';   space: BoardSpace; ownerName: string; ownerId: string; ownerMoney: number; leveledRent: number; leveledSips: number }
  | { kind: 'event';      message: string; effect: string; currentMoney: number }
  | { kind: 'notification'; title: string; message: string; accentColor: string }
  | { kind: 'jail_choice' }
  | { kind: 'claim' }
  | { kind: 'winner'; winnerName: string; winnerIdx: number; totalRounds: number; finalStandings: Array<{ name: string; worth: number; shots: number; playerIdx: number }> }
  | null;

// Final ranking value: cash + what was invested in properties (price + upgrades)
function netWorth(p: Player, propLevels: Record<string, number>): number {
  const props = (p.properties as number[]) ?? [];
  return props.reduce((sum, pos) => {
    const space = getBoardSpace(pos);
    const level = propLevels[String(pos)] ?? 1;
    const upgrades = UPGRADE_COST.slice(1, level).reduce((a, b) => a + b, 0);
    return sum + (space.price ?? 0) + upgrades;
  }, p.money);
}

// ── GameScreen ────────────────────────────────────────────────────────────────

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const locale = getLocale();
  const { width: sw, height: sh } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const DICE_H    = 58 + 16 + insets.bottom;
  const PANEL_H   = 130;
  const HEADER_H  = 44 + insets.top;
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
  const [idleSeconds,   setIdleSeconds]   = useState(0);

  const channelsRef            = useRef<RealtimeChannel[]>([]);
  const myPlayerIdRef          = useRef<string | null>(null);
  const roomIdRef              = useRef<string | null>(null);
  const notifContinuationRef   = useRef<(() => void) | null>(null);
  const processedJailTurnRef   = useRef<number | null>(null);
  const idleTimerRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRolledRef           = useRef(false);
  const endedShownRef          = useRef(false);

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

  // One roll per turn: re-arm whenever the turn changes
  useEffect(() => {
    hasRolledRef.current = false;
  }, [gameState?.turn_number]);

  // When the game ends (phase flips to 'ended' via realtime), every client
  // shows the winner screen — not just the player who triggered the end.
  useEffect(() => {
    if (gameState?.phase !== 'ended' || players.length === 0 || endedShownRef.current) return;
    endedShownRef.current = true;
    const propLevels = gameState.property_levels ?? {};
    const ranked = [...players]
      .map(p => ({ p, worth: netWorth(p, propLevels) }))
      .sort((a, b) => b.worth - a.worth);
    const winner = ranked[0];
    const wIdx = players.findIndex(p => p.id === winner.p.id);
    setModal({
      kind: 'winner',
      winnerName:  winner.p.name,
      winnerIdx:   Math.max(0, wIdx),
      totalRounds: Math.max(1, Math.round((gameState.max_turns ?? gameState.turn_number) / Math.max(1, players.length))),
      finalStandings: ranked.map(({ p, worth }) => ({
        name:  p.name,
        worth,
        shots: p.shots_owed,
        playerIdx: players.findIndex(pl => pl.id === p.id),
      })),
    });
  }, [gameState?.phase, players]);

  // Idle-turn timer: counts up while it's not my turn; resets on turn change
  useEffect(() => {
    if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    setIdleSeconds(0);
    if (!gameState || gameState.phase !== 'rolling') return;
    const isMine = gameState.current_player_id === myPlayer?.id;
    if (isMine) return; // no timer needed — it's my turn
    idleTimerRef.current = setInterval(() => setIdleSeconds(s => s + 1), 1000);
    return () => { if (idleTimerRef.current) clearInterval(idleTimerRef.current); };
  }, [gameState?.turn_number, gameState?.current_player_id, gameState?.phase, myPlayer?.id]);

  async function skipIdleTurn() {
    setIdleSeconds(0);
    await advanceTurn();
  }

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

      // Never guess identity: a wrong guess lets one phone control another
      // player. If we can't match a saved ID, ask the user who they are.
      const savedPlayer = savedId ? all.find(p => p.id === savedId) : null;
      let me: Player | null = null;
      if (savedPlayer)           { me = savedPlayer; }
      else if (all.length === 1) { me = all[0]; }

      if (me) {
        await claimIdentity(me, gs.room_id);
      } else if (all.length > 1) {
        setModal({ kind: 'claim' });
      }

      subscribeGS(id);
      subscribePlayers(gs.room_id);
    } finally {
      setLoading(false);
    }
  }

  async function claimIdentity(p: Player, roomId: string) {
    setMyPlayer(p);
    myPlayerIdRef.current = p.id;
    try {
      await AsyncStorage.setItem(`player_id_${roomId}`, p.id);
      await AsyncStorage.setItem('last_session', JSON.stringify({
        gameStateId: id,
        roomId,
        playerId: p.id,
      }));
    } catch (e) {
      console.warn('[identity] AsyncStorage write failed:', e);
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
    hasRolledRef.current = true;
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

      // Persist final position; GO bonus as an atomic increment
      await supabase.from('players').update({ position: newPos }).eq('id', myPlayer.id);
      if (passedGo) await adjustMoney(myPlayer.id, 200000);

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
        setModal({ kind: 'notification', title: t('go_title', locale), message: t('go_msg', locale), accentColor: C.accent });
      } else {
        await resolveSpace(space, newPos, freshMoney);
      }
    } catch (err: any) {
      showNotification(t('err_title', locale), err.message, C.danger);
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
      showNotification(t('arrested_title', locale), t('arrested_msg', locale), '#FF6BD0');
      notifContinuationRef.current = advanceTurn;
      return;
    }
    if (space.type === 'tax') {
      const tax = space.taxAmount ?? 100000;
      await supabase.from('players').update({ money: Math.max(0, currentMoney - tax) }).eq('id', myPlayer.id);
      showNotification(t('tax_title', locale), t('tax_msg', locale, { tax: formatMoney(tax) }), '#5A6378');
      notifContinuationRef.current = advanceTurn;
      return;
    }
    if (space.type === 'event') {
      const card = drawEventCard();
      playSound('card');
      const msg = getEventMessage(card.effect, locale) ?? card.message;
      setModal({ kind: 'event', message: msg, effect: card.effect, currentMoney });
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
    const me    = myPlayer.id;
    const myIdx = players.findIndex(p => p.id === me);
    const left  = players[(myIdx + 1) % players.length];
    const right = players[((myIdx - 1) + players.length) % players.length];
    const others = players.filter(p => p.id !== me);

    const collectFromAll = async (amount: number) => {
      for (const p of others) await transferMoney(p.id, me, amount);
    };

    switch (effect) {
      case 'collect_20_all':  await collectFromAll(20000); break;
      case 'collect_30_all':  await collectFromAll(30000); break;
      case 'collect_50_all':  await collectFromAll(50000); break;
      case 'collect_100_all': await collectFromAll(100000); break;
      case 'collect_bank_50':  await adjustMoney(me, 50000); break;
      case 'collect_bank_100': await adjustMoney(me, 100000); break;
      case 'collect_bank_150': await adjustMoney(me, 150000); break;
      case 'collect_bank_200': await adjustMoney(me, 200000); break;
      case 'pay_bank_50':  await adjustMoney(me, -50000); break;
      case 'pay_bank_100': await adjustMoney(me, -100000); break;
      case 'pay_bank_200': await adjustMoney(me, -200000); break;
      case 'all_drink_1':
        for (const p of players) await adjustShots(p.id, 1); break;
      case 'all_drink_2':
        for (const p of players) await adjustShots(p.id, 2); break;
      case 'others_drink_1':
        for (const p of others) await adjustShots(p.id, 1); break;
      case 'self_drink_1':   await adjustShots(me, 1); break;
      case 'self_drink_2':   await adjustShots(me, 2); break;
      case 'self_drink_3':   await adjustShots(me, 3); break;
      case 'remove_1_shot':  await adjustShots(me, -1); break;
      case 'give_1_shot':    await adjustShots(left.id, 1); break;
      case 'give_2_shots':   await adjustShots(left.id, 2); break;
      case 'give_3_shots':   await adjustShots(left.id, 3); break;
      case 'give_shots_right': await adjustShots(right.id, 2); break;
      case 'advance_go':
        await supabase.from('players').update({ position: 0 }).eq('id', me);
        await adjustMoney(me, 200000);
        break;
      case 'go_to_jail_effect':
        // The card says "go to jail" — actually jail them (was missing jail_turns)
        await supabase.from('players').update({ position: 7, jail_turns: 3 }).eq('id', me);
        break;
      case 'advance_3': {
        const np = (myPlayer.position + 3) % BOARD_SIZE;
        await supabase.from('players').update({ position: np }).eq('id', me); break;
      }
      case 'advance_5': {
        const np = (myPlayer.position + 5) % BOARD_SIZE;
        await supabase.from('players').update({ position: np }).eq('id', me); break;
      }
      case 'back_2': {
        const np = ((myPlayer.position - 2) + BOARD_SIZE) % BOARD_SIZE;
        await supabase.from('players').update({ position: np }).eq('id', me); break;
      }
      case 'back_3': {
        const np = ((myPlayer.position - 3) + BOARD_SIZE) % BOARD_SIZE;
        await supabase.from('players').update({ position: np }).eq('id', me); break;
      }
      case 'swap_left': {
        if (players.length < 2) break;
        await supabase.from('players').update({ position: left.position }).eq('id', me);
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
        await adjustMoney(me, 300000);
        await adjustShots(me, 3);
        break;
      case 'collect_bank_100_drink_2':
        await adjustMoney(me, 100000);
        await adjustShots(me, 2);
        break;
      case 'pay_advance_3': {
        const np = (myPlayer.position + 3) % BOARD_SIZE;
        await adjustMoney(me, -100000);
        await supabase.from('players').update({ position: np }).eq('id', me); break;
      }
      case 'advance_3_collect_50': {
        const np = (myPlayer.position + 3) % BOARD_SIZE;
        await adjustMoney(me, 50000);
        await supabase.from('players').update({ position: np }).eq('id', me); break;
      }
      case 'drink_back_2': {
        const np = ((myPlayer.position - 2) + BOARD_SIZE) % BOARD_SIZE;
        await adjustShots(me, 1);
        await supabase.from('players').update({ position: np }).eq('id', me); break;
      }
      case 'others_pay_bank_50':
        for (const p of others) await adjustMoney(p.id, -50000); break;
      case 'poorest_collects': {
        const poorest = players.reduce((a, b) => a.money <= b.money ? a : b);
        for (const p of players) if (p.id !== poorest.id) await transferMoney(p.id, poorest.id, 100000);
        break;
      }
      case 'richest_drinks_per_player': {
        const richest = players.reduce((a, b) => a.money >= b.money ? a : b);
        await adjustShots(richest.id, players.length - 1); break;
      }
      case 'all_except_poorest_drink': {
        const poorest = players.reduce((a, b) => a.money <= b.money ? a : b);
        for (const p of players) if (p.id !== poorest.id) await adjustShots(p.id, 1); break;
      }
      case 'roll_again':
        hasRolledRef.current = false;
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
        showNotification(t('no_funds_title', locale), t('no_bail_funds', locale), '#5A6378');
        notifContinuationRef.current = () => setModal({ kind: 'jail_choice' });
        return;
      }
      await adjustMoney(myPlayer.id, -50000);
      await supabase.from('players').update({ jail_turns: 0 }).eq('id', myPlayer.id);
      setMyPlayer(prev => prev ? { ...prev, money: prev.money - 50000, jail_turns: 0 } : prev);
    } else {
      const { data: fresh } = await supabase.from('players').select('jail_turns').eq('id', myPlayer.id).single();
      const remaining = Math.max(0, (fresh?.jail_turns ?? 0) - 1);
      await supabase.from('players').update({ jail_turns: remaining }).eq('id', myPlayer.id);
      const jailMsg = remaining > 0
        ? t('jail_still', locale, { n: remaining, s: remaining !== 1 ? 's' : '' })
        : t('jail_freed', locale);
      playSound('jail');
      showNotification(t('jail_title_notif', locale), jailMsg, '#FF6BD0');
      notifContinuationRef.current = advanceTurn;
    }
  }

  // ── sell property ─────────────────────────────────────────────────────────────

  async function handleSell(position: number) {
    if (!myPlayer) return;
    const space = getBoardSpace(position);
    const salePrice = Math.floor((space.price ?? 0) * 0.5);
    const { data: fresh } = await supabase.from('players').select('properties').eq('id', myPlayer.id).single();
    const currentProps = (fresh?.properties as number[] ?? []);
    await supabase.from('players').update({
      properties: currentProps.filter(p => p !== position),
    }).eq('id', myPlayer.id);
    await adjustMoney(myPlayer.id, salePrice);
    await advanceTurn();
  }

  // ── shot tracker ──────────────────────────────────────────────────────────────

  async function handleDrinkShot(playerId: string) {
    const p = players.find(pl => pl.id === playerId);
    if (!p || p.shots_owed <= 0) return;
    await adjustShots(playerId, -1);
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
    const { ownerId, leveledRent, leveledSips } = modal;
    const discountedRent = Math.max(0, Math.round(leveledRent * 0.5 / 10000) * 10000);
    playSound('rent');
    if (choice === 'full') {
      await transferMoney(myPlayer.id, ownerId, leveledRent);
    } else {
      await transferMoney(myPlayer.id, ownerId, discountedRent);
      await adjustShots(myPlayer.id, leveledSips);
    }
    await advanceTurn();
  }

  // ── turn / buy / upgrade ──────────────────────────────────────────────────────

  async function advanceTurn() {
    if (!gameState || gameState.phase !== 'rolling') return;
    const rid = roomIdRef.current ?? gameState.room_id;
    const { data: freshPs } = await supabase
      .from('players').select().eq('room_id', rid).order('created_at', { ascending: true });
    const all = freshPs ?? players;

    // End condition 1: turn budget exhausted → biggest fortune wins.
    // End condition 2: everyone but one player is bankrupt.
    const solvent = all.filter(p => p.money > 0);
    const budgetDone = gameState.turn_number >= (gameState.max_turns ?? Number.MAX_SAFE_INTEGER);
    if ((all.length >= 2 && solvent.length <= 1) || budgetDone) {
      await endGame(gameState.id, rid);
      // Local fallback in case realtime is slow/down — every other client
      // gets the same flip through the game_states subscription.
      setGameState(prev => prev ? { ...prev, phase: 'ended' } : prev);
      setPlayers(all);
      setModal(null); setLastRoll(null); setLandedSpace(null);
      return;
    }

    // Guarded advance: if two clients race (e.g. double "skip idle"), only
    // the first call passes; the duplicate is a no-op.
    await advanceTurnGuarded(gameState.id, gameState.turn_number, rid);
    const { data: freshGs } = await supabase
      .from('game_states').select().eq('id', gameState.id).single();
    // ← critical: update gameState locally so the writer's isMyTurn flips immediately
    if (freshGs) setGameState(freshGs);
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

    const reopenBuy = () => { notifContinuationRef.current = () => setModal({ kind: 'buy', space }); };

    if (option === 'full') {
      if (currentMoney < fullPrice) {
        showNotification(t('no_funds_title', locale), t('no_funds_msg', locale), '#5A6378');
        reopenBuy();
        return;
      }
      await supabase.from('players').update({
        money: currentMoney - fullPrice,
        properties: [...currentProps, space.position],
      }).eq('id', myPlayer.id);
    } else {
      if (currentMoney < discountedPrice) {
        showNotification(t('no_funds_title', locale), t('no_funds_msg', locale), '#5A6378');
        reopenBuy();
        return;
      }
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
    if (myPlayer.money < cost) { showNotification(t('no_funds_title', locale), t('no_funds_msg', locale), '#5A6378'); return; }
    const newLevels = { ...propLevels, [String(position)]: currentLevel + 1 };
    await supabase.from('game_states').update({ property_levels: newLevels }).eq('id', gameState.id);
    await supabase.from('players').update({ money: myPlayer.money - cost }).eq('id', myPlayer.id);
    // Update locally so UI reflects new level without waiting for Realtime
    setGameState({ ...gameState, property_levels: newLevels });
    await advanceTurn();
  }


  // ── render ────────────────────────────────────────────────────────────────────

  if (loading || !gameState) {
    return <View style={gs.center}><ActivityIndicator size="large" color={C.accent} /></View>;
  }

  const isMyTurn      = gameState.current_player_id === myPlayer?.id && gameState.phase === 'rolling';
  const currentPlayer = players.find(p => p.id === gameState.current_player_id);
  const propLevels    = gameState.property_levels ?? {};
  const myJailTurns   = myPlayer?.jail_turns ?? 0;
  const isJailed      = isMyTurn && myJailTurns > 0;

  const nPlayers      = Math.max(1, players.length);
  const currentRound  = Math.min(Math.ceil(gameState.turn_number / nPlayers), Math.ceil((gameState.max_turns ?? gameState.turn_number) / nPlayers));
  const totalRounds   = Math.max(1, Math.ceil((gameState.max_turns ?? gameState.turn_number) / nPlayers));

  return (
    <View style={gs.screen}>
      <View style={[gs.header, { paddingTop: insets.top + 8 }]}>
        <Text style={gs.headerSub}>{t('round_of', locale, { code: roomCode, r: currentRound, rt: totalRounds })}</Text>
        <Text style={gs.headerTitle}>SHOTOPOLY</Text>
        <TouchableOpacity style={[gs.exitBtn, { top: insets.top + 8 }]} onPress={exitGame}>
          <Text style={gs.exitTxt}>{t('exit', locale)}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ alignItems: 'center', paddingTop: 4 }}>
        <Board
          players={players}
          boardWidth={boardWidth}
          turnNumber={currentRound}
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
        {!isMyTurn && idleSeconds >= 60 && (
          <TouchableOpacity style={[gs.diceBtn, { backgroundColor: C.danger, marginBottom: 6 }]} onPress={skipIdleTurn}>
            <Text style={[gs.diceTxt, { color: '#fff' }]}>{t('skip_idle', locale, { name: currentPlayer?.name ?? '…' })}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[gs.diceBtn, (!isMyTurn || isJailed) && gs.diceDim]}
          onPress={() => {
            if (!isMyTurn || rolling || isJailed || hasRolledRef.current) return;
            setDiceVisible(true);
          }}
          disabled={!isMyTurn || rolling}
          activeOpacity={0.85}
        >
          {rolling
            ? <ActivityIndicator color={isMyTurn && !isJailed ? C.amberInk : C.textFaint} />
            : isJailed
              ? <Text style={[gs.diceTxt, { color: C.textFaint }]}>
                  {t('in_jail', locale, { n: myJailTurns })}
                </Text>
              : <Text style={[gs.diceTxt, !isMyTurn && { color: C.textFaint }]}>
                  {isMyTurn ? t('roll_dice', locale) : t('not_your_turn', locale, { name: currentPlayer?.name ?? '…' })}
                </Text>
          }
        </TouchableOpacity>
      </View>

      <DiceRollModal
        visible={diceVisible}
        playerName={myPlayer?.name ?? ''}
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
                <Text style={gs.mTitle}>{t('buy_title', locale)}</Text>
                {modal.space.color && <View style={[gs.colorBar, { backgroundColor: modal.space.color }]} />}
                <Text style={gs.mName}>{modal.space.name}</Text>
                <Text style={gs.mDetail}>{t('buy_rent', locale, { rent: formatMoney(modal.space.rent ?? 0) })}</Text>
                <View style={gs.mRow}>
                  <TouchableOpacity style={gs.btnShots} onPress={() => handleBuyOption('discount')}>
                    <Image source={ART.shot} style={gs.btnIcon} resizeMode="contain" />
                    <Text style={gs.btnTxt}>{formatMoney(discountedPrice)}{'\n'}+ {sips} shots</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={gs.btnMoney} onPress={() => handleBuyOption('full')}>
                    <Image source={ART.coins} style={gs.btnIconDark} resizeMode="contain" />
                    <Text style={gs.btnTxtDark}>{formatMoney(fullPrice)}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[gs.btnGhost, { marginTop: 12 }]} onPress={() => handleBuyOption('pass')}>
                  <Text style={gs.btnGhostTxt}>{t('buy_pass', locale)}</Text>
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
                <Text style={gs.mTitle}>{t('rent_title', locale)}</Text>
                {modal.space.color && <View style={[gs.colorBar, { backgroundColor: modal.space.color }]} />}
                <Text style={gs.mName}>{modal.space.name}</Text>
                <Text style={gs.mSub}>{t('rent_owner', locale, { name: modal.ownerName })}</Text>
                <Text style={gs.mDetail}>{t('rent_question', locale)}</Text>
                <View style={gs.mRow}>
                  <TouchableOpacity style={gs.btnMoney} onPress={() => handlePayRent('full')}>
                    <Text style={gs.btnTxtDark}>{t('pay_full', locale, { rent: formatMoney(modal.leveledRent) })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={gs.btnShots} onPress={() => handlePayRent('discount')}>
                    <Text style={gs.btnTxt}>{t('pay_shots', locale, { rent: formatMoney(discountedRent), n: modal.leveledSips, s: modal.leveledSips !== 1 ? 's' : '' })}</Text>
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
                <Text style={gs.mTitle}>{t('upgrade_title', locale)}</Text>
                {space.color && <View style={[gs.colorBar, { backgroundColor: space.color }]} />}
                <Text style={gs.mName}>{space.name}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                  {[1, 2, 3].map(l => (
                    <View key={l} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: l <= level ? (space.color ?? C.accent) : 'rgba(255,255,255,0.12)' }} />
                  ))}
                </View>
                {level >= 3 ? (
                  <>
                    <Text style={[gs.mDetail, { color: C.green }]}>{t('upgrade_max', locale)}</Text>
                    <Text style={gs.mDetail}>{t('upgrade_rent_cur', locale, { rent: formatMoney((space.rent ?? 0) * level) })}</Text>
                  </>
                ) : (
                  <>
                    <Text style={gs.mDetail}>{t('upgrade_rent_cur', locale, { rent: formatMoney((space.rent ?? 0) * level) })}</Text>
                    <Text style={gs.mDetail}>{t('upgrade_rent_new', locale, { rent: formatMoney(newRent) })}</Text>
                    <View style={gs.mRow}>
                      <TouchableOpacity
                        style={canUpgrade ? gs.btnMoney : [gs.btnGhost, { flex: 1, opacity: 0.5 }]}
                        onPress={canUpgrade ? () => handleUpgrade(space.position) : undefined}
                      >
                        <Text style={canUpgrade ? gs.btnTxtDark : gs.btnGhostTxt}>
                          {canUpgrade ? t('upgrade_btn', locale, { cost: formatMoney(cost) }) : t('upgrade_no_funds', locale)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                <TouchableOpacity
                  style={[gs.btnGhost, { marginTop: 12, borderColor: C.danger }]}
                  onPress={() => handleSell(space.position)}
                >
                  <Text style={[gs.btnGhostTxt, { color: C.danger }]}>
                    {t('sell_btn', locale, { price: formatMoney(Math.floor((space.price ?? 0) * 0.5)) })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[gs.btnGhost, { marginTop: 8 }]} onPress={advanceTurn}>
                  <Text style={gs.btnGhostTxt}>{t('continue_btn', locale)}</Text>
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
              <Text style={gs.mTitle}>{t('event_title', locale)}</Text>
              <Text style={gs.eventMsg}>{modal.message}</Text>
              <TouchableOpacity style={gs.btnGold} onPress={() => {
                const { effect, currentMoney } = modal;
                setModal(null);
                applyEventEffect(effect, currentMoney);
              }}>
                <Text style={gs.btnGoldTxt}>{t('event_ok', locale)}</Text>
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
              <Text style={gs.mTitle}>{t('jail_title', locale)}</Text>
              <Text style={gs.mDetail}>
                {myPlayer ? t('jail_rounds', locale, { n: myPlayer.jail_turns ?? 0 }) : ''}
              </Text>
              <View style={gs.mRow}>
                <TouchableOpacity style={gs.btnMoney} onPress={() => handleJailChoice(true)}>
                  <Text style={gs.btnTxtDark}>{t('jail_bail', locale)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={gs.btnShots} onPress={() => handleJailChoice(false)}>
                  <Text style={gs.btnTxt}>{t('jail_skip', locale)}</Text>
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
            <View style={[gs.notifCard, { borderColor: C.amber + '88' }]}>
              <View style={[gs.notifAccent, { backgroundColor: C.amber }]} />
              <View style={gs.notifBody}>
                <View style={{ alignItems: 'center', marginBottom: 6 }}>
                  <Image source={ART.trophy} style={{ width: 52, height: 52, tintColor: C.amber }} resizeMode="contain" />
                </View>
                <Text style={[gs.notifTitle, { color: C.amber, fontSize: 18 }]}>{t('winner_title', locale, { name: modal.winnerName })}</Text>
                <Text style={{ color: C.textDim, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>
                  {t('game_over_sub', locale, { n: modal.totalRounds })}
                </Text>
                {modal.finalStandings.map((s, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                    <Token playerIdx={s.playerIdx} size={14} />
                    <Text style={{ color: i === 0 ? C.amber : C.textDim, fontSize: 14, fontFamily: i === 0 ? FONTS.bodyHeavy : FONTS.body }}>{s.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                      <Text style={{ color: C.amber, fontSize: 13, fontFamily: FONTS.bodyBold }}>{formatMoney(s.worth)}</Text>
                      {s.shots > 0 && (
                        <>
                          <Image source={ART.shot} style={{ width: 11, height: 11, tintColor: C.danger }} resizeMode="contain" />
                          <Text style={{ color: C.danger, fontSize: 12, fontFamily: FONTS.bodyBold }}>×{s.shots}</Text>
                        </>
                      )}
                    </View>
                  </View>
                ))}
                <TouchableOpacity style={[gs.notifBtn, { backgroundColor: C.amber, marginTop: 24 }]} onPress={exitGame}>
                  <Text style={[gs.notifBtnTxt, { color: C.amberInk }]}>{t('back_home', locale)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* ── CLAIM IDENTITY (unknown device) ── */}
      <Modal visible={modal?.kind === 'claim'} transparent animationType="fade">
        {modal?.kind === 'claim' && (
          <View style={gs.notifOverlay}>
            <View style={[gs.notifCard, { borderColor: C.accent + '55' }]}>
              <View style={[gs.notifAccent, { backgroundColor: C.accent }]} />
              <View style={gs.notifBody}>
                <Text style={[gs.notifTitle, { color: C.accent }]}>{t('claim_title', locale)}</Text>
                <Text style={{ color: C.textDim, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
                  {t('claim_msg', locale)}
                </Text>
                {players.map((p, idx) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[gs.btnGhost, { marginTop: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }]}
                    onPress={async () => {
                      const rid = roomIdRef.current ?? p.room_id;
                      await claimIdentity(p, rid);
                      setModal(null);
                    }}
                  >
                    <Token playerIdx={idx} size={18} />
                    <Text style={[gs.btnGhostTxt, { color: '#fff' }]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
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
                  <Text style={[gs.notifBtnTxt, { color: modal.accentColor === C.accent ? C.accentInk : '#fff' }]}>Ok</Text>
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
  headerTitle: { fontSize: 17, fontFamily: FONTS.display, color: C.amber, letterSpacing: 1 },
  exitBtn:     { position: 'absolute', right: 16, top: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: C.danger },
  exitTxt:     { fontSize: 11, color: '#fff', fontWeight: '700' },

  rollStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 4 },
  rollNum:   { color: '#fff', fontSize: 17, fontWeight: '800' },
  rollSpace: { color: C.accent, fontSize: 12, maxWidth: '55%' },

  diceWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 8, paddingTop: 8, backgroundColor: C.bg },
  diceBtn:  { height: 58, borderRadius: 16, backgroundColor: C.amber, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  diceDim:  { backgroundColor: 'rgba(255,255,255,0.06)' },
  diceTxt:  { fontSize: 17, fontWeight: '700', color: C.amberInk },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  mCard:   { backgroundColor: '#1a1f35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 44, borderTopWidth: 1, borderTopColor: 'rgba(255,70,85,0.35)' },
  mTitle:   { color: C.amber, fontSize: 20, fontFamily: FONTS.display, textAlign: 'center', marginBottom: 12, letterSpacing: 0.5 },
  colorBar: { height: 6, borderRadius: 3, marginBottom: 12 },
  mName:    { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  mSub:     { color: C.textDim, fontSize: 15, textAlign: 'center', marginBottom: 8 },
  mDetail:  { color: C.textDim, fontSize: 16, textAlign: 'center', marginBottom: 4 },
  mInfo:    { color: C.textDim, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  mRow:     { flexDirection: 'row', gap: 12, marginTop: 20 },
  eventMsg: { color: '#fff', fontSize: 18, textAlign: 'center', lineHeight: 26, marginVertical: 20 },

  btnGold:     { backgroundColor: C.amber, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnGoldTxt:  { color: C.amberInk, fontSize: 16, fontWeight: '800' },
  btnGhost:    { borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  btnGhostTxt: { color: C.textDim, fontSize: 16, fontWeight: '700' },
  btnMoney:    { flex: 1, backgroundColor: C.amber, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnShots:    { flex: 1, backgroundColor: C.danger, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnIcon:     { width: 18, height: 18, tintColor: '#fff', marginBottom: 5 },
  btnIconDark: { width: 18, height: 18, tintColor: C.amberInk, marginBottom: 5 },
  btnTxtDark:  { color: C.amberInk, fontSize: 15, fontWeight: '800', textAlign: 'center' },
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
