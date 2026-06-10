import { useEffect, useRef } from 'react';
import { Modal, View, Text, Animated, Pressable, Image, ScrollView } from 'react-native';
import { Player } from '../lib/types';
import { ALL_SPACES } from '../lib/gameLogic';
import { C, FONTS, ART, PLAYER_COLORS, formatMoney, netWorth } from '../constants/gameConstants';
import { getLocale, getSpaceName, t } from '../lib/i18n';
import { Token } from './Token';

// Tap a player anywhere → this card scales in with their full situation:
// cash, pending shots, properties and total fortune.
export function PlayerInfoModal({ player, playerIdx, propLevels, onClose }: {
  player: Player | null;
  playerIdx: number;
  propLevels: Record<string, number>;
  onClose: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const locale = getLocale();

  useEffect(() => {
    if (player) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 90 }).start();
    }
  }, [player]);

  function close() {
    Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => onClose());
  }

  if (!player) return null;

  const color = PLAYER_COLORS[playerIdx % PLAYER_COLORS.length];
  const props = ((player.properties as number[]) ?? [])
    .map(pos => ALL_SPACES.find(s => s.position === pos))
    .filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}
        onPress={close}
      >
        <Animated.View
          style={{
            width: '100%',
            backgroundColor: '#151b30',
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor: color + '77',
            overflow: 'hidden',
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }}
        >
          <Pressable onPress={() => {}}>
            <View style={{ height: 5, backgroundColor: color }} />
            <View style={{ padding: 24 }}>
              {/* identity */}
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Token playerIdx={playerIdx} size={72} />
                <Text style={{ fontFamily: FONTS.display, fontSize: 26, color: '#fff', letterSpacing: 1, marginTop: 8 }}>
                  {player.name}
                </Text>
              </View>

              {/* stats */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 18 }}>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Image source={ART.coins} style={{ width: 22, height: 22, tintColor: C.amber }} resizeMode="contain" />
                  <Text style={{ color: C.amber, fontFamily: FONTS.bodyHeavy, fontSize: 16 }}>{formatMoney(player.money)}</Text>
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Image source={ART.shot} style={{ width: 22, height: 22, tintColor: C.danger }} resizeMode="contain" />
                  <Text style={{ color: C.danger, fontFamily: FONTS.bodyHeavy, fontSize: 16 }}>×{player.shots_owed ?? 0}</Text>
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Image source={ART.trophy} style={{ width: 22, height: 22, tintColor: C.text }} resizeMode="contain" />
                  <Text style={{ color: C.text, fontFamily: FONTS.bodyHeavy, fontSize: 16 }}>{formatMoney(netWorth(player, propLevels))}</Text>
                  <Text style={{ color: C.textFaint, fontSize: 10, marginTop: -4 }}>{t('networth', locale)}</Text>
                </View>
              </View>

              {/* properties */}
              <Text style={{ color: C.textDim, fontSize: 11, fontFamily: FONTS.bodyHeavy, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                {t('props_label', locale, { n: props.length })}
              </Text>
              {props.length === 0 ? (
                <Text style={{ color: C.textFaint, fontSize: 13, fontFamily: FONTS.body }}>{t('no_props_yet', locale)}</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {props.map(space => {
                    const level = propLevels[String(space.position)] ?? 1;
                    return (
                      <View key={space.position} style={{
                        width: 76, borderRadius: 8, backgroundColor: '#1b2138',
                        borderWidth: 1, borderColor: space.color ?? '#333', padding: 7,
                      }}>
                        <View style={{ height: 3, borderRadius: 2, backgroundColor: space.color ?? color, marginBottom: 5 }} />
                        <Text style={{ color: C.text, fontSize: 9.5, fontWeight: '700', lineHeight: 12 }} numberOfLines={2}>
                          {getSpaceName(space.name, locale)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 3, marginTop: 5 }}>
                          {[1, 2, 3].map(l => (
                            <View key={l} style={{
                              width: 6, height: 6, borderRadius: 3,
                              backgroundColor: l <= level ? (space.color ?? C.amber) : 'rgba(255,255,255,0.12)',
                            }} />
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
