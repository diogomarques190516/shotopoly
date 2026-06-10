import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Player, BoardSpace } from '../lib/types';
import { ALL_SPACES } from '../lib/gameLogic';
import { C, PLAYER_COLORS, PLAYER_EMOJIS, formatMoney } from '../constants/gameConstants';
import { getLocale, getSpaceName, t } from '../lib/i18n';

export function PropertiesPanel({ players, currentPlayerId, myPlayerId, propLevels, onDrink }: {
  players: Player[];
  currentPlayerId: string;
  myPlayerId: string | null;
  propLevels: Record<string, number>;
  onDrink?: (playerId: string) => void;
}) {
  // Build ordered list: current player first, then rest in turn order
  const currentIdx = players.findIndex(p => p.id === currentPlayerId);
  const ordered = currentIdx >= 0
    ? [...players.slice(currentIdx), ...players.slice(0, currentIdx)]
    : players;

  // Only show players who own at least one property
  const withProps = ordered.filter(p => (p.properties as number[] ?? []).length > 0);

  return (
    <View style={{ backgroundColor: '#0d1020', borderTopWidth: 1, borderTopColor: 'rgba(255,210,63,0.12)', maxHeight: 130 }}>
      {withProps.length === 0 ? (
        <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text style={{ fontSize: 10, color: C.textFaint, fontStyle: 'italic' }}>
            {t('no_props_yet', getLocale())}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 6 }}
        >
          {withProps.map((p, orderedIdx) => {
            const globalIdx = players.findIndex(pl => pl.id === p.id);
            const color  = PLAYER_COLORS[globalIdx % PLAYER_COLORS.length];
            const emoji  = PLAYER_EMOJIS[globalIdx % PLAYER_EMOJIS.length];
            const isMe   = p.id === myPlayerId;
            const isActive = p.id === currentPlayerId;
            const props  = (p.properties as number[])
              .map(pos => ALL_SPACES.find(s => s.position === pos))
              .filter((s): s is BoardSpace => !!s);

            return (
              <View key={p.id} style={{ marginBottom: orderedIdx < withProps.length - 1 ? 4 : 0 }}>
                {/* Player header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 3, gap: 5 }}>
                  <Text style={{ fontSize: 13 }}>{emoji}</Text>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                  <Text style={{ fontSize: 10, fontWeight: isMe ? '700' : '500', color: isMe ? '#fff' : C.textDim }}>
                    {p.name}
                  </Text>
                  {isActive && (
                    <Text style={{ fontSize: 8, color: C.gold, fontWeight: '700' }}>▶</Text>
                  )}
                  <Text style={{ fontSize: 9, color: C.green, marginLeft: 4 }}>{formatMoney(p.money)}</Text>
                  {(p.shots_owed ?? 0) > 0 && onDrink ? (
                    <TouchableOpacity
                      onPress={() => onDrink(p.id)}
                      style={{ backgroundColor: '#E94560', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 4 }}
                    >
                      <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>🥃×{p.shots_owed}</Text>
                    </TouchableOpacity>
                  ) : (p.shots_owed ?? 0) > 0 ? (
                    <Text style={{ fontSize: 9, color: '#E94560', marginLeft: 4 }}>🥃×{p.shots_owed}</Text>
                  ) : null}
                </View>

                {/* Property cards — horizontal scroll */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 10, gap: 5 }}
                >
                  {props.map(space => {
                    const level = propLevels[String(space.position)] ?? 1;
                    return (
                      <View key={space.position} style={{
                        width: 60, borderRadius: 7, backgroundColor: '#151a2e',
                        borderWidth: 1, borderColor: space.color ?? '#333', padding: 5,
                      }}>
                        <View style={{ height: 2, borderRadius: 1, backgroundColor: space.color ?? color, marginBottom: 3 }} />
                        <Text style={{ color: C.text, fontSize: 7.5, fontWeight: '700', lineHeight: 10 }} numberOfLines={2}>
                          {getSpaceName(space.name, getLocale())}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 2, marginTop: 3 }}>
                          {[1, 2, 3].map(l => (
                            <View key={l} style={{
                              width: 5, height: 5, borderRadius: 3,
                              backgroundColor: l <= level ? (space.color ?? C.gold) : 'rgba(255,255,255,0.1)',
                            }} />
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
