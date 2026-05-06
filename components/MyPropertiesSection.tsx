import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Player, BoardSpace } from '../lib/types';
import { ALL_SPACES } from '../lib/gameLogic';
import { C, formatMoney } from '../constants/gameConstants';
import { getLocale, getSpaceName } from '../lib/i18n';

export function MyPropertiesSection({ player, propLevels }: {
  player: Player | null;
  propLevels: Record<string, number>;
}) {
  const props = useMemo(() => {
    if (!player?.properties?.length) return [];
    return (player.properties as number[])
      .map(pos => ALL_SPACES.find(s => s.position === pos))
      .filter((s): s is BoardSpace => !!s && s.type === 'property');
  }, [player?.properties]);

  return (
    <View style={{ paddingTop: 6 }}>
      <Text style={{ fontSize: 9, color: C.textFaint, letterSpacing: 2, textTransform: 'uppercase', paddingHorizontal: 12, marginBottom: 5 }}>
        As minhas propriedades
      </Text>
      {props.length === 0 ? (
        <Text style={{ fontSize: 11, color: C.textFaint, paddingHorizontal: 12, paddingVertical: 4 }}>
          Ainda não tens propriedades.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, gap: 8, paddingBottom: 4 }}>
          {props.map(space => {
            const level = propLevels[String(space.position)] ?? 1;
            const rent  = (space.rent ?? 0) * level;
            return (
              <View key={space.position} style={{ width: 100, borderRadius: 12, backgroundColor: '#151a2e', borderWidth: 1, borderColor: space.color ?? '#333', padding: 9 }}>
                <View style={{ height: 3, borderRadius: 2, backgroundColor: space.color ?? '#555', marginBottom: 7 }} />
                <Text style={{ color: C.text, fontSize: 10, fontWeight: '700', marginBottom: 5 }} numberOfLines={1}>{getSpaceName(space.name, getLocale())}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginBottom: 5 }}>
                  {[1, 2, 3].map(l => (
                    <View key={l} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l <= level ? (space.color ?? C.gold) : 'rgba(255,255,255,0.1)' }} />
                  ))}
                </View>
                <Text style={{ color: C.textDim, fontSize: 9 }}>Renda {formatMoney(rent)}</Text>
                {level >= 3 && (
                  <Text style={{ fontSize: 8, fontWeight: '700', color: C.green, marginTop: 4 }}>MAX</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
