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

const RULES_SECTIONS = [
  {
    title: 'Objetivo',
    body: 'Acumula o máximo de dinheiro possível enquanto os teus adversários bebem. Não há condição de fim automática — o jogo acaba quando o grupo decidir. Vence quem tiver mais dinheiro no momento em que o jogo terminar.',
  },
  {
    title: 'Como Começar',
    body: 'Cria uma sala e partilha o código de 4 letras com os outros jogadores. Cada jogador entra com o seu nome. O host clica em "Começar Jogo" quando todos estiverem prontos. Cada jogador começa com €1.500k.',
  },
  {
    title: 'Como Funcionam os Turnos',
    body: 'Os jogadores jogam por ordem. No teu turno, carrega em "Lançar Dados". Dois dados são lançados e o total determina quantas casas avanças. O jogo resolve automaticamente o que acontece na casa onde caíste.',
  },
  {
    title: 'Tipos de Casas',
    body: 'GO — recebes €200k sempre que passas ou caís aqui.\n\nPropriedade — podes comprar, pagar renda ou negociar a compra ao dono.\n\nSurpresa — tiras uma carta de evento aleatória entre 50 possíveis.\n\nImposto — pagas ao banco automaticamente.\n\nCadeia — casa de visita, nada acontece.\n\nPra Cadeia — vais direto para a Cadeia.\n\nOpen Bar — casa neutra, descansa.',
  },
  {
    title: 'Comprar uma Propriedade',
    body: 'Quando caís numa propriedade sem dono tens três opções:\n\n1. Pagar o preço completo em dinheiro.\n2. Pagar 60% do preço em dinheiro e os restantes 40% em shots — desconto com bebida.\n3. Passar e não comprar.',
  },
  {
    title: 'Pagar Renda',
    body: 'Quando caís numa propriedade de outro jogador, o dono escolhe como quer cobrar:\n\nDinheiro — o valor da renda atual, que aumenta com o nível da propriedade.\n\nShots — a quantidade depende do nível da propriedade (nível 1 = 1 shot, nível 2 = 2 shots, nível 3 = 3 shots).\n\nO jogador que caiu espera enquanto o dono decide.',
  },
  {
    title: 'Roubar uma Propriedade',
    body: 'Ao cair numa propriedade de outro jogador, podes também comprá-la diretamente:\n\nPreço = 2x o preço original + €200k por cada nível de upgrade.\n\nExemplo: propriedade de €500k no nível 2 custa €1.000k + €400k = €1.400k.\n\nSe a propriedade estiver no nível máximo (3), não pode ser comprada desta forma.\n\nQuando comprada: o dinheiro vai para o dono anterior e a propriedade muda de dono mantendo o nível atual.',
  },
  {
    title: 'Fazer Upgrade',
    body: 'Quando o teu token cai na tua própria propriedade, aparece o menu de upgrade:\n\nNível 2 — custa €200k e duplica a renda.\nNível 3 (máximo) — custa €400k e triplica a renda.\n\nPodes sempre escolher continuar sem fazer upgrade. O nível de cada propriedade é visível no tabuleiro através dos indicadores coloridos.',
  },
  {
    title: 'Cartas de Evento',
    body: 'Existem 50 cartas de evento diferentes. Quando caís numa casa Surpresa, uma carta é retirada aleatoriamente. Podem acontecer muitas coisas:\n\nReceber ou pagar dinheiro ao banco, cobrar de todos os jogadores, obrigar jogadores a beber, mover o teu token, trocar posições, lançar os dados de novo, entre outras situações especiais.',
  },
  {
    title: 'Shots',
    body: 'Os shots são rastreados por jogador no contador visível em cada carta. Quando alguém deve shots, o contador sobe. Os shots bebem-se na realidade — são os outros jogadores à mesa que garantem o cumprimento.',
  },
  {
    title: 'Fim do Jogo',
    body: 'O jogo não tem fim automático. Quando o grupo decidir parar, vence quem tiver mais dinheiro. Quem tiver mais shots por beber é o rei da noite.',
  },
];

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
            {RULES_SECTIONS.map((s, i) => (
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
