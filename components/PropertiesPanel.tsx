import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Player, BoardSpace } from '../lib/types';
import { ALL_SPACES } from '../lib/gameLogic';
import { C, FONTS, ART, PLAYER_COLORS, formatMoney } from '../constants/gameConstants';
import { getLocale, getSpaceName } from '../lib/i18n';
import { Token } from './Token';

// Always lists EVERY player with their cash and pending shots — the money
// scoreboard lives here, not just property owners.
export function PropertiesPanel({ players, currentPlayerId, myPlayerId, propLevels, onDrink }: {
  players: Player[];
  currentPlayerId: string;
  myPlayerId: string | null;
  propLevels: Record<string, number>;
  onDrink?: (playerId: string) => void;
}) {
  // Current player first, then the rest in turn order
  const currentIdx = players.findIndex(p => p.id === currentPlayerId);
  const ordered = currentIdx >= 0
    ? [...players.slice(currentIdx), ...players.slice(0, currentIdx)]
    : players;

  return (
    <View style={{ backgroundColor: '#0d1020', borderTopWidth: 1, borderTopColor: C.accentDim, maxHeight: 130 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 6 }}
      >
        {ordered.map((p, orderedIdx) => {
          const globalIdx = players.findIndex(pl => pl.id === p.id);
          const isMe      = p.id === myPlayerId;
          const isActive  = p.id === currentPlayerId;
          const props     = (p.properties as number[] ?? [])
            .map(pos => ALL_SPACES.find(s => s.position === pos))
            .filter((s): s is BoardSpace => !!s);

          return (
            <View key={p.id} style={{ marginBottom: orderedIdx < ordered.length - 1 ? 5 : 0 }}>
              {/* Player row: token · name · money · shots */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: props.length > 0 ? 3 : 0, gap: 6 }}>
                {isActive && <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: C.accent }} />}
                <Token playerIdx={globalIdx} size={13} />
                <Text style={{ fontSize: 11, fontFamily: isMe ? FONTS.bodyHeavy : FONTS.body, color: isMe ? '#fff' : C.textDim }} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={{ fontSize: 11, color: C.green, fontFamily: FONTS.bodyHeavy, marginLeft: 'auto' }}>
                  {formatMoney(p.money)}
                </Text>
                {(p.shots_owed ?? 0) > 0 ? (
                  <TouchableOpacity
                    disabled={!onDrink}
                    onPress={() => onDrink?.(p.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.danger, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}
                  >
                    <Image source={ART.shot} style={{ width: 10, height: 10, tintColor: '#fff' }} resizeMode="contain" />
                    <Text style={{ fontSize: 10, color: '#fff', fontFamily: FONTS.bodyHeavy }}>×{p.shots_owed}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 34 }} />
                )}
              </View>

              {/* Property cards — horizontal scroll */}
              {props.length > 0 && (
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
                        <View style={{ height: 2, borderRadius: 1, backgroundColor: space.color ?? PLAYER_COLORS[globalIdx % PLAYER_COLORS.length], marginBottom: 3 }} />
                        <Text style={{ color: C.text, fontSize: 7.5, fontWeight: '700', lineHeight: 10 }} numberOfLines={2}>
                          {getSpaceName(space.name, getLocale())}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 2, marginTop: 3 }}>
                          {[1, 2, 3].map(l => (
                            <View key={l} style={{
                              width: 5, height: 5, borderRadius: 3,
                              backgroundColor: l <= level ? (space.color ?? C.accent) : 'rgba(255,255,255,0.1)',
                            }} />
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
