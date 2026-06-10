import { useEffect, useRef } from 'react';
import { Modal, View, Text, Animated, Pressable, Image } from 'react-native';
import { Player, BoardSpace } from '../lib/types';
import { C, FONTS, SPACE_ICONS, UPGRADE_COST, PLAYER_COLORS, formatMoney, hasMonopoly } from '../constants/gameConstants';
import { getLocale, getSpaceName, t } from '../lib/i18n';
import { Token } from './Token';

// Tap any board tile → this card scales in with the full economics of the
// space: price, rent at every level, upgrade costs, owner and sell value.
export function SpaceInfoModal({ space, players, propLevels, onClose }: {
  space: BoardSpace | null;
  players: Player[];
  propLevels: Record<string, number>;
  onClose: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const locale = getLocale();

  useEffect(() => {
    if (space) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 90 }).start();
    }
  }, [space]);

  function close() {
    Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => onClose());
  }

  if (!space) return null;

  const ownerIdx = players.findIndex(p =>
    Array.isArray(p.properties) && (p.properties as any[]).some((pos: any) => Number(pos) === space.position)
  );
  const owner    = ownerIdx >= 0 ? players[ownerIdx] : null;
  const level    = propLevels[String(space.position)] ?? 1;
  const monopoly = owner ? hasMonopoly(owner, space) : false;
  const isProp   = space.type === 'property';
  const bandColor = space.color ?? C.accent;
  const icon = SPACE_ICONS[space.type];

  const invested = (space.price ?? 0) + UPGRADE_COST.slice(1, level).reduce((a, b) => a + b, 0);

  const typeHint =
    space.type === 'go'           ? t('sp_go', locale) :
    space.type === 'tax'          ? t('sp_tax', locale, { v: formatMoney(space.taxAmount ?? 0) }) :
    space.type === 'jail'         ? t('sp_jail', locale) :
    space.type === 'go_to_jail'   ? t('sp_gotojail', locale) :
    space.type === 'event'        ? t('sp_event', locale) :
    space.type === 'free_parking' ? t('sp_free', locale) : null;

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
            borderColor: bandColor + '88',
            overflow: 'hidden',
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          }}
        >
          <Pressable onPress={() => {}}>
            <View style={{ height: 6, backgroundColor: bandColor }} />
            <View style={{ padding: 22 }}>

              {/* header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                {icon && (
                  <Image source={icon} style={{ width: 26, height: 26, tintColor: bandColor }} resizeMode="contain" />
                )}
                <Text style={{ fontFamily: FONTS.display, fontSize: 26, color: '#fff', letterSpacing: 1, flex: 1 }} numberOfLines={1}>
                  {getSpaceName(space.name, locale)}
                </Text>
                {isProp && (
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {[1, 2, 3].map(l => (
                      <View key={l} style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: l <= level ? bandColor : 'rgba(255,255,255,0.14)',
                      }} />
                    ))}
                  </View>
                )}
              </View>

              {!isProp && typeHint && (
                <Text style={{ color: C.textDim, fontSize: 14, fontFamily: FONTS.body, lineHeight: 21 }}>
                  {typeHint}
                </Text>
              )}

              {isProp && (
                <>
                  {/* owner / for sale */}
                  {owner ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Token playerIdx={ownerIdx} size={20} />
                      <Text style={{ color: '#fff', fontSize: 14, fontFamily: FONTS.bodyBold }}>
                        {t('rent_owner', locale, { name: owner.name })}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ color: C.green, fontSize: 14, fontFamily: FONTS.bodyBold }}>
                        {t('sp_forsale', locale)}
                      </Text>
                      <Text style={{ color: C.amber, fontSize: 15, fontFamily: FONTS.bodyHeavy, marginTop: 2 }}>
                        {t('sp_price', locale, { v: formatMoney(space.price ?? 0) })}
                      </Text>
                    </View>
                  )}

                  {/* rent table */}
                  <Text style={{ color: C.textDim, fontSize: 11, fontFamily: FONTS.bodyHeavy, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                    {t('sp_rent_lvls', locale)}
                  </Text>
                  <View style={{ backgroundColor: '#1b2138', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 12 }}>
                    {[1, 2, 3].map(l => {
                      const isCur = owner && l === level;
                      const rent = (space.rent ?? 0) * l * (monopoly ? 2 : 1);
                      return (
                        <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                          <Text style={{ color: isCur ? bandColor : C.textDim, fontSize: 13, fontFamily: isCur ? FONTS.bodyHeavy : FONTS.body }}>
                            {t('sp_lvl', locale, { n: l })}{isCur ? '  ←' : ''}
                          </Text>
                          <Text style={{ color: isCur ? C.amber : C.textDim, fontSize: 13, fontFamily: isCur ? FONTS.bodyHeavy : FONTS.body }}>
                            {formatMoney(rent)}
                          </Text>
                        </View>
                      );
                    })}
                    {monopoly && (
                      <Text style={{ color: C.accent, fontSize: 11, fontFamily: FONTS.bodyBold, marginTop: 4 }}>
                        {t('sp_monopoly', locale)}
                      </Text>
                    )}
                  </View>

                  {/* economics */}
                  <View style={{ gap: 4 }}>
                    {level < 2 && (
                      <Text style={{ color: C.textDim, fontSize: 13, fontFamily: FONTS.body }}>
                        {t('sp_upgrade', locale, { n: 2, v: formatMoney(UPGRADE_COST[1]) })}
                      </Text>
                    )}
                    {level < 3 && (
                      <Text style={{ color: C.textDim, fontSize: 13, fontFamily: FONTS.body }}>
                        {t('sp_upgrade', locale, { n: 3, v: formatMoney(UPGRADE_COST[2]) })}
                      </Text>
                    )}
                    <Text style={{ color: C.textDim, fontSize: 13, fontFamily: FONTS.body }}>
                      {t('sp_sell', locale, { v: formatMoney(Math.floor((space.price ?? 0) * 0.5)) })}
                    </Text>
                    {owner && (
                      <Text style={{ color: C.amber, fontSize: 13, fontFamily: FONTS.bodyBold }}>
                        {t('sp_invested', locale, { v: formatMoney(invested) })}
                      </Text>
                    )}
                  </View>
                </>
              )}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
