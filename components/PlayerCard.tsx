import { View, Text } from 'react-native';
import { Player } from '../lib/types';
import { C, PLAYER_COLORS, PLAYER_EMOJIS, formatMoney } from '../constants/gameConstants';

export function PlayerCard({ player, idx, isActive, cardWidth }: {
  player: Player; idx: number; isActive: boolean; cardWidth: number;
}) {
  const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
  const emoji = PLAYER_EMOJIS[idx % PLAYER_EMOJIS.length];
  return (
    <View style={{ width: cardWidth, borderRadius: 14, padding: 9, backgroundColor: isActive ? 'rgba(255,210,63,0.08)' : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: isActive ? 'rgba(255,210,63,0.55)' : 'rgba(255,255,255,0.08)' }}>
      {isActive && (
        <View style={{ position: 'absolute', top: -7, right: 8, backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Text style={{ fontSize: 7, fontWeight: '700', color: '#0a0d18', letterSpacing: 0.5 }}>VEZ</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: color + '22', borderWidth: 1, borderColor: color + '55', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 15 }}>{emoji}</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '600', color: C.text, flex: 1 }} numberOfLines={1}>{player.name}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 7.5, color: C.textFaint, marginBottom: 1 }}>€k</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.gold }}>{formatMoney(player.money)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 7.5, color: C.textFaint, marginBottom: 1 }}>🥃</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: player.shots_owed > 0 ? '#FF6BD0' : C.textDim }}>{player.shots_owed}</Text>
        </View>
      </View>
    </View>
  );
}
