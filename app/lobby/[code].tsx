import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
  Share,
  Image,
  AppState,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { getLocale, t } from '../../lib/i18n';
import { Player, Room } from '../../lib/types';
import { FONTS, ART, GAME_DURATIONS, calcMaxTurns } from '../../constants/gameConstants';
import { Token } from '../../components/Token';
import type { RealtimeChannel } from '@supabase/supabase-js';

export default function LobbyScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const locale = getLocale();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [duration, setDuration] = useState<typeof GAME_DURATIONS[number]>(GAME_DURATIONS[1]);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const roomIdRef = useRef<string | null>(null);

  function showAlert(title: string, message: string) { setAlertModal({ title, message }); }

  useEffect(() => {
    loadRoom();
    return () => {
      channelsRef.current.forEach(c => supabase.removeChannel(c));
      channelsRef.current = [];
    };
  }, [code]);

  // Re-sync on foreground: a phone that locked while waiting could miss the
  // host pressing start. On resume, re-check the room (jump to the game if it
  // already started), refresh the player list and rebuild the channels.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      const rid = roomIdRef.current;
      if (next !== 'active' || !rid) return;
      const { data: r } = await supabase.from('rooms').select().eq('id', rid).single();
      if (r?.status === 'playing') {
        const { data: gs } = await supabase.from('game_states').select('id').eq('room_id', rid).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (gs) { router.replace(`/game/${gs.id}`); return; }
      }
      const { data } = await supabase.from('players').select().eq('room_id', rid).order('created_at', { ascending: true });
      setPlayers(data ?? []);
      channelsRef.current.forEach(c => supabase.removeChannel(c));
      channelsRef.current = [];
      subscribeToPlayers(rid);
      subscribeToRoom(rid);
    });
    return () => sub.remove();
  }, []);

  async function loadRoom() {
    try {
      const { data: roomData, error: roomErr } = await supabase
        .from('rooms')
        .select()
        .eq('code', code)
        .single();

      if (roomErr) { console.error('[lobby] rooms query failed:', roomErr.message); }

      if (!roomData) {
        showAlert(t('err_title', locale), t('err_room_lobby', locale));
        router.replace('/');
        return;
      }
      setRoom(roomData);
      roomIdRef.current = roomData.id;

      const { data: playersData, error: playersErr } = await supabase
        .from('players')
        .select()
        .eq('room_id', roomData.id)
        .order('created_at', { ascending: true });

      if (playersErr) { console.error('[lobby] players query failed:', playersErr.message); }
      setPlayers(playersData ?? []);

      // Identify "me" strictly from the saved player ID written at join time.
      // Guessing here could hand this phone another player's identity.
      if (playersData && playersData.length > 0) {
        const savedId = await AsyncStorage.getItem(`player_id_${roomData.id}`);
        const me = savedId ? playersData.find(p => p.id === savedId) ?? null : null;
        setMyPlayer(me);
      }

      subscribeToPlayers(roomData.id);
      subscribeToRoom(roomData.id);
    } finally {
      setLoading(false);
    }
  }

  function subscribeToPlayers(roomId: string) {
    const ch = supabase
      .channel(`lobby:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data } = await supabase
            .from('players')
            .select()
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
          setPlayers(data ?? []);
        }
      )
      .subscribe();
    channelsRef.current.push(ch);
  }

  function subscribeToRoom(roomId: string) {
    const ch = supabase
      .channel(`room_status:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        async (payload) => {
          const updatedRoom = payload.new as Room;
          setRoom(updatedRoom);
          if (updatedRoom.status === 'playing') {
            const { data: gs } = await supabase
              .from('game_states')
              .select('id')
              .eq('room_id', roomId)
              .single();
            if (gs) {
              router.replace(`/game/${gs.id}`);
            }
          }
        }
      )
      .subscribe();
    channelsRef.current.push(ch);
  }

  async function startGame() {
    if (!room) return;
    if (players.length < 1) {
      showAlert(t('err_title', locale), t('wait_min', locale));
      return;
    }
    setStarting(true);
    try {
      // Reset all player state so previous game data never bleeds in
      await supabase.from('players').update({
        position: 0,
        money: 1500000,
        properties: [],
        shots_owed: 0,
        jail_turns: 0,
      }).eq('room_id', room.id);

      const { data: gs, error: gsError } = await supabase
        .from('game_states')
        .insert({
          room_id: room.id,
          current_player_id: players[0].id,
          turn_number: 1,
          max_turns: calcMaxTurns(duration.minutes, players.length),
          dice_result: null,
          phase: 'rolling',
          property_levels: {},
        })
        .select()
        .single();

      if (gsError) throw gsError;

      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', room.id);

      if (roomError) throw roomError;

      router.replace(`/game/${gs.id}`);
    } catch (err: any) {
      showAlert(t('err_title', locale), err.message ?? t('err_generic', locale));
    } finally {
      setStarting(false);
    }
  }

  async function shareCode() {
    await Share.share({ message: t('share_msg', locale, { code: code ?? '' }) });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FFC300" />
      </View>
    );
  }

  const isHost = myPlayer?.is_host ?? false;
  const canStart = isHost && players.length >= 1;

  return (
    <View style={styles.container}>
      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>{t('room_code', locale)}</Text>
        <Text style={styles.codeText}>{code}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
          <Text style={styles.shareBtnText}>{t('share', locale)}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        {t('players_n', locale, { n: players.length })}
      </Text>

      <FlatList
        data={players}
        keyExtractor={(p) => p.id}
        style={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.playerRow}>
            <View style={styles.playerAvatar}>
              <Token playerIdx={index} size={22} />
            </View>
            <Text style={styles.playerName}>{item.name}</Text>
            {item.is_host && (
              <View style={styles.hostBadge}>
                <Image source={ART.crown} style={{ width: 13, height: 13, tintColor: AMBER }} resizeMode="contain" />
                <Text style={styles.hostBadgeTxt}>Host</Text>
              </View>
            )}
            {item.id === myPlayer?.id && (
              <Text style={styles.youBadge}>{t('you_badge', locale)}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t('no_players', locale)}</Text>
        }
      />

      <View style={styles.footer}>
        {isHost && (
          <View style={styles.durBox}>
            <Text style={styles.durLabel}>{t('game_length', locale)}</Text>
            <View style={styles.durRow}>
              {GAME_DURATIONS.map(d => {
                const active = duration.key === d.key;
                return (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.durChip, active && styles.durChipActive]}
                    onPress={() => setDuration(d)}
                  >
                    <Text style={[styles.durChipTxt, active && styles.durChipTxtActive]}>
                      {t(`dur_${d.key}`, locale)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.durInfo}>
              {t('dur_info', locale, {
                rounds: calcMaxTurns(duration.minutes, Math.max(1, players.length)) / Math.max(1, players.length),
                min: duration.minutes,
              })}
            </Text>
          </View>
        )}
        {isHost ? (
          <TouchableOpacity
            style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
            onPress={startGame}
            disabled={!canStart || starting}
          >
            {starting ? (
              <ActivityIndicator color="#2B1A00" />
            ) : (
              <Text style={styles.startBtnText}>
                {canStart ? t('start_game', locale) : t('wait_min', locale)}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingBox}>
            <ActivityIndicator color="#FFC300" style={{ marginRight: 10 }} />
            <Text style={styles.waitingText}>{t('waiting_host', locale)}</Text>
          </View>
        )}
      </View>

      <Modal visible={!!alertModal} transparent animationType="fade" onRequestClose={() => setAlertModal(null)}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>{alertModal?.title}</Text>
            <Text style={styles.alertMessage}>{alertModal?.message}</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={() => setAlertModal(null)}>
              <Text style={styles.alertBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ACCENT = '#FF4655';
const AMBER  = '#FFC300';
const BG   = '#0a0d18';
const CARD = '#13182a';
const INK    = '#2B1A00';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  center: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBox: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  codeLabel: {
    color: '#9aa0b5',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  codeText: {
    color: AMBER,
    fontSize: 48,
    fontFamily: FONTS.display,
    letterSpacing: 10,
  },
  shareBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,70,85,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,70,85,0.45)',
  },
  shareBtnText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    color: AMBER,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    flex: 1,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  hostBadgeTxt: {
    color: AMBER,
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
  youBadge: {
    color: '#9aa0b5',
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emptyText: {
    color: '#5a6070',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  footer: {
    paddingVertical: 20,
  },
  durBox: {
    marginBottom: 14,
  },
  durLabel: {
    color: '#9aa0b5',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  durRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  durChipActive: {
    backgroundColor: 'rgba(255,70,85,0.14)',
    borderColor: ACCENT,
  },
  durChipTxt: {
    color: '#9aa0b5',
    fontSize: 13,
    fontWeight: '700',
  },
  durChipTxtActive: {
    color: ACCENT,
  },
  durInfo: {
    color: '#5a6070',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  startBtn: {
    backgroundColor: AMBER,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  startBtnText: {
    color: INK,
    fontSize: 18,
    fontWeight: '800',
  },
  waitingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  waitingText: {
    color: '#9aa0b5',
    fontSize: 15,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  alertCard: {
    backgroundColor: '#1a1f35',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,195,0,0.25)',
  },
  alertTitle: {
    color: ACCENT,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  alertMessage: {
    color: '#ccc',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  alertBtn: {
    backgroundColor: AMBER,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  alertBtnText: {
    color: INK,
    fontSize: 16,
    fontWeight: '800',
  },
});
