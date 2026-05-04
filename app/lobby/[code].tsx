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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { getLocale, t } from '../../lib/i18n';
import { Player, Room } from '../../lib/types';
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
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);
  const channelsRef = useRef<RealtimeChannel[]>([]);

  function showAlert(title: string, message: string) { setAlertModal({ title, message }); }

  useEffect(() => {
    loadRoom();
    return () => {
      channelsRef.current.forEach(c => supabase.removeChannel(c));
      channelsRef.current = [];
    };
  }, [code]);

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

      const { data: playersData, error: playersErr } = await supabase
        .from('players')
        .select()
        .eq('room_id', roomData.id)
        .order('created_at', { ascending: true });

      if (playersErr) { console.error('[lobby] players query failed:', playersErr.message); }
      setPlayers(playersData ?? []);

      // Identify "me" from saved player ID (written at insert time in home screen)
      if (playersData && playersData.length > 0) {
        const savedId = await AsyncStorage.getItem(`player_id_${roomData.id}`);
        const me = savedId
          ? (playersData.find(p => p.id === savedId) ?? playersData[playersData.length - 1])
          : playersData[playersData.length - 1];
        setMyPlayer(me);
        await AsyncStorage.setItem(`player_id_${roomData.id}`, me.id);
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
        <ActivityIndicator size="large" color="#f5c518" />
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
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <View style={styles.playerAvatar}>
              <Text style={styles.playerAvatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.playerName}>{item.name}</Text>
            {item.is_host && <Text style={styles.hostBadge}>👑 Host</Text>}
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
        {isHost ? (
          <TouchableOpacity
            style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
            onPress={startGame}
            disabled={!canStart || starting}
          >
            {starting ? (
              <ActivityIndicator color="#1a0a2e" />
            ) : (
              <Text style={styles.startBtnText}>
                {canStart ? t('start_game', locale) : t('wait_min', locale)}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingBox}>
            <ActivityIndicator color="#f5c518" style={{ marginRight: 10 }} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0a2e',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  center: {
    flex: 1,
    backgroundColor: '#1a0a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBox: {
    backgroundColor: '#2a1a4e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f5c518',
  },
  codeLabel: {
    color: '#aaa',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  codeText: {
    color: '#f5c518',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 12,
  },
  shareBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3a2a6e',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  sectionTitle: {
    color: '#f5c518',
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
    backgroundColor: '#2a1a4e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5c518',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerAvatarText: {
    color: '#1a0a2e',
    fontWeight: '900',
    fontSize: 18,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  hostBadge: {
    color: '#f5c518',
    fontSize: 13,
    marginLeft: 8,
  },
  youBadge: {
    color: '#aaa',
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 8,
    backgroundColor: '#3a2a6e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  footer: {
    paddingVertical: 20,
  },
  startBtn: {
    backgroundColor: '#f5c518',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startBtnDisabled: {
    backgroundColor: '#3a2a6e',
  },
  startBtnText: {
    color: '#1a0a2e',
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
    color: '#aaa',
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
    borderColor: 'rgba(245,197,24,0.25)',
  },
  alertTitle: {
    color: '#f5c518',
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
    backgroundColor: '#f5c518',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  alertBtnText: {
    color: '#1a0a2e',
    fontSize: 16,
    fontWeight: '800',
  },
});
