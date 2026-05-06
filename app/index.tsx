import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { generateRoomCode } from '../lib/gameLogic';
import { getLocale, t } from '../lib/i18n';
import { getRulesSections } from '../lib/rules';

export default function HomeScreen() {
  const router = useRouter();
  const locale = getLocale();
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [rulesVisible, setRulesVisible] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  function showAlert(title: string, message: string) { setAlertModal({ title, message }); }

  useEffect(() => {
    checkRestore();
  }, []);

  async function checkRestore() {
    try {
      const raw = await AsyncStorage.getItem('last_session');
      if (!raw) { setRestoring(false); return; }

      const { gameStateId, roomId, playerId } = JSON.parse(raw) as {
        gameStateId: string; roomId: string; playerId: string;
      };

      const { data: room } = await supabase
        .from('rooms')
        .select('status')
        .eq('id', roomId)
        .single();

      const roomStatus = room?.status ?? 'unknown';
      console.log('[restore]', { roomId, playerId, roomStatus, navigatingTo: roomStatus === 'playing' ? `/game/${gameStateId}` : 'home' });

      if (roomStatus === 'playing') {
        router.replace(`/game/${gameStateId}`);
      } else {
        await AsyncStorage.removeItem('last_session');
        setRestoring(false);
      }
    } catch {
      setRestoring(false);
    }
  }

  if (restoring) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f5c518" />
      </View>
    );
  }

  async function createGame() {
    if (!playerName.trim()) {
      showAlert('Ops!', t('err_name', locale));
      return;
    }
    setLoading(true);
    try {
      const code = generateRoomCode();

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ code, status: 'waiting' })
        .select()
        .single();

      if (roomError) throw roomError;

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          name: playerName.trim(),
          money: 1500000,
          shots_owed: 0,
          position: 0,
          properties: [],
          is_host: true,
        })
        .select('id')
        .single();

      if (playerError) throw playerError;
      await AsyncStorage.setItem(`player_id_${room.id}`, playerData.id);

      router.push(`/lobby/${code}`);
    } catch (err: any) {
      showAlert(t('err_title', locale), err.message ?? t('err_generic', locale));
    } finally {
      setLoading(false);
    }
  }

  async function joinGame() {
    if (!playerName.trim()) {
      showAlert('Ops!', t('err_name_join', locale));
      return;
    }
    if (!joinCode.trim()) {
      showAlert('Ops!', t('err_code', locale));
      return;
    }
    setLoading(true);
    try {
      const code = joinCode.trim().toUpperCase();

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select()
        .eq('code', code)
        .eq('status', 'waiting')
        .single();

      if (roomError || !room) {
        showAlert(t('err_title', locale), t('err_room', locale));
        return;
      }

      // Duplicate name check
      const { data: existing } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', room.id)
        .eq('name', playerName.trim())
        .maybeSingle();
      if (existing) {
        showAlert(t('err_title', locale), t('err_name_taken', locale));
        return;
      }

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          name: playerName.trim(),
          money: 1500000,
          shots_owed: 0,
          position: 0,
          properties: [],
          is_host: false,
        })
        .select('id')
        .single();

      if (playerError) throw playerError;
      await AsyncStorage.setItem(`player_id_${room.id}`, playerData.id);

      router.push(`/lobby/${code}`);
    } catch (err: any) {
      showAlert(t('err_title', locale), err.message ?? t('err_generic', locale));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>SHOTOPOLY</Text>
          <Text style={styles.emoji}>🥃</Text>
          <Text style={styles.subtitle}>{t('subtitle', locale)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('your_name_label', locale)}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('your_name_ph', locale)}
            placeholderTextColor="#555"
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={20}
          />

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={createGame}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1a0a2e" />
            ) : (
              <Text style={styles.btnPrimaryText}>{t('create_game', locale)}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('or_join', locale)}</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('room_code_label', locale)}</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder={t('room_code_ph', locale)}
            placeholderTextColor="#555"
            value={joinCode}
            onChangeText={setJoinCode}
            maxLength={4}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={[styles.btnSecondary, loading && styles.btnDisabled]}
            onPress={joinGame}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#f5c518" />
            ) : (
              <Text style={styles.btnSecondaryText}>{t('join_game', locale)}</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.rulesBtn} onPress={() => setRulesVisible(true)}>
          <Text style={styles.rulesBtnText}>{t('rules_btn', locale)}</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>{t('footer', locale)}</Text>
      </ScrollView>

      {/* Rules Modal */}
      <Modal visible={rulesVisible} animationType="slide" onRequestClose={() => setRulesVisible(false)}>
        <View style={styles.rulesContainer}>
          <View style={styles.rulesHeader}>
            <Text style={styles.rulesTitle}>{t('rules_title', locale)}</Text>
            <TouchableOpacity style={styles.rulesClose} onPress={() => setRulesVisible(false)}>
              <Text style={styles.rulesCloseTxt}>{t('rules_close', locale)}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.rulesScroll} showsVerticalScrollIndicator={false}>
            {getRulesSections(locale).map((s, i) => (
              <View key={i} style={styles.rulesSection}>
                <Text style={styles.rulesSectionTitle}>{s.title}</Text>
                <Text style={styles.rulesSectionBody}>{s.body}</Text>
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Alert Modal */}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0a2e',
  },
  center: {
    flex: 1,
    backgroundColor: '#1a0a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#f5c518',
    letterSpacing: 4,
    textShadowColor: '#ff6b35',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  emoji: {
    fontSize: 56,
    marginVertical: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#2a1a4e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3a2a6e',
  },
  label: {
    color: '#f5c518',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#1a0a2e',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3a2a6e',
    marginBottom: 16,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#f5c518',
  },
  btnPrimary: {
    backgroundColor: '#f5c518',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#1a0a2e',
    fontSize: 18,
    fontWeight: '800',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f5c518',
  },
  btnSecondaryText: {
    color: '#f5c518',
    fontSize: 18,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3a2a6e',
  },
  dividerText: {
    color: '#aaa',
    fontSize: 13,
    marginHorizontal: 12,
  },
  rulesBtn: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a2a6e',
  },
  rulesBtnText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footer: {
    textAlign: 'center',
    color: '#555',
    fontSize: 12,
    marginTop: 16,
  },

  // Rules modal
  rulesContainer: {
    flex: 1,
    backgroundColor: '#0f0a1e',
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a1a4e',
  },
  rulesTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f5c518',
    letterSpacing: 1,
  },
  rulesClose: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2a1a4e',
  },
  rulesCloseTxt: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  rulesScroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  rulesSection: {
    marginBottom: 28,
  },
  rulesSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f5c518',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rulesSectionBody: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 23,
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
