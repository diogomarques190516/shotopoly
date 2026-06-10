import { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, StyleSheet, Animated, Easing } from 'react-native';
import { DieFace } from './DieFace';
import { C, FONTS } from '../constants/gameConstants';
import { getLocale, t } from '../lib/i18n';

export function DiceRollModal({ visible, playerName, onComplete }: {
  visible: boolean; playerName: string;
  onComplete: (total: number) => void;
}) {
  const [phase,  setPhase]  = useState<'rolling' | 'result'>('rolling');
  const [v1, setV1] = useState(1);
  const [v2, setV2] = useState(1);
  const [final1, setFinal1] = useState(1);
  const [final2, setFinal2] = useState(1);

  const shake0  = useRef(new Animated.Value(0)).current;
  const shake1  = useRef(new Animated.Value(0)).current;
  const shakeY0 = useRef(new Animated.Value(0)).current;
  const shakeY1 = useRef(new Animated.Value(0)).current;
  const rot0    = useRef(new Animated.Value(0)).current;
  const rot1    = useRef(new Animated.Value(0)).current;

  const anim0Ref = useRef<Animated.CompositeAnimation | null>(null);
  const anim1Ref = useRef<Animated.CompositeAnimation | null>(null);
  const spin0Ref = useRef<Animated.CompositeAnimation | null>(null);
  const spin1Ref = useRef<Animated.CompositeAnimation | null>(null);
  const intRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const t1Ref    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const t2Ref    = useRef<ReturnType<typeof setTimeout>  | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPhase('rolling');
    shake0.setValue(0); shake1.setValue(0);
    shakeY0.setValue(0); shakeY1.setValue(0);
    rot0.setValue(0); rot1.setValue(0);

    anim0Ref.current = Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(shake0,  { toValue: -6,  duration: 90, useNativeDriver: true }),
        Animated.timing(shake0,  { toValue: 5,   duration: 90, useNativeDriver: true }),
        Animated.timing(shake0,  { toValue: -2,  duration: 90, useNativeDriver: true }),
        Animated.timing(shake0,  { toValue: 0,   duration: 90, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(shakeY0, { toValue: -8,  duration: 90, useNativeDriver: true }),
        Animated.timing(shakeY0, { toValue: -4,  duration: 90, useNativeDriver: true }),
        Animated.timing(shakeY0, { toValue: -10, duration: 90, useNativeDriver: true }),
        Animated.timing(shakeY0, { toValue: 0,   duration: 90, useNativeDriver: true }),
      ]),
    ]));
    anim1Ref.current = Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(shake1,  { toValue: 5,   duration: 90, useNativeDriver: true }),
        Animated.timing(shake1,  { toValue: -5,  duration: 90, useNativeDriver: true }),
        Animated.timing(shake1,  { toValue: 3,   duration: 90, useNativeDriver: true }),
        Animated.timing(shake1,  { toValue: 0,   duration: 90, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(shakeY1, { toValue: -6,  duration: 90, useNativeDriver: true }),
        Animated.timing(shakeY1, { toValue: -10, duration: 90, useNativeDriver: true }),
        Animated.timing(shakeY1, { toValue: -3,  duration: 90, useNativeDriver: true }),
        Animated.timing(shakeY1, { toValue: 0,   duration: 90, useNativeDriver: true }),
      ]),
    ]));
    spin0Ref.current = Animated.loop(
      Animated.timing(rot0, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.linear })
    );
    spin1Ref.current = Animated.loop(
      Animated.timing(rot1, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.linear })
    );

    anim0Ref.current.start(); anim1Ref.current.start();
    spin0Ref.current.start(); spin1Ref.current.start();

    intRef.current = setInterval(() => {
      setV1(Math.floor(Math.random() * 6) + 1);
      setV2(Math.floor(Math.random() * 6) + 1);
    }, 80);

    t1Ref.current = setTimeout(() => {
      clearInterval(intRef.current!);
      anim0Ref.current?.stop(); anim1Ref.current?.stop();
      spin0Ref.current?.stop(); spin1Ref.current?.stop();
      shake0.setValue(0); shake1.setValue(0);
      shakeY0.setValue(0); shakeY1.setValue(0);
      rot0.setValue(0); rot1.setValue(0);
      const f1 = Math.floor(Math.random() * 6) + 1;
      const f2 = Math.floor(Math.random() * 6) + 1;
      setFinal1(f1); setFinal2(f2);
      setPhase('result');
      t2Ref.current = setTimeout(() => onComplete(f1 + f2), 1500);
    }, 1500);

    return () => {
      clearInterval(intRef.current!); clearTimeout(t1Ref.current!); clearTimeout(t2Ref.current!);
      anim0Ref.current?.stop(); anim1Ref.current?.stop();
      spin0Ref.current?.stop(); spin1Ref.current?.stop();
    };
  }, [visible]);

  const rotate0 = rot0.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotate1 = rot1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.glow} />
        {phase === 'rolling' ? (
          <>
            <Text style={s.prompt}>· {t('dice_rolling', getLocale())} ·</Text>
            <View style={s.diceRow}>
              <Animated.View style={{ transform: [{ translateX: shake0 }, { translateY: shakeY0 }, { rotate: rotate0 }] }}>
                <DieFace value={v1} />
              </Animated.View>
              <Animated.View style={{ transform: [{ translateX: shake1 }, { translateY: shakeY1 }, { rotate: rotate1 }] }}>
                <DieFace value={v2} />
              </Animated.View>
            </View>
          </>
        ) : (
          <>
            <Text style={s.prompt}>· {t('dice_result', getLocale())} ·</Text>
            <View style={s.diceRow}>
              <DieFace value={final1} />
              <DieFace value={final2} />
            </View>
            <View style={s.resultBlock}>
              <Text style={s.totalLabel}>{t('dice_total', getLocale())}</Text>
              <Text style={s.totalNum}>{final1 + final2}</Text>
              <View style={s.moveChip}>
                <Text style={s.moveChipText}>
                  {t('dice_advance', getLocale(), { name: playerName, n: final1 + final2 })}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(7,9,18,0.88)', alignItems: 'center', justifyContent: 'center', gap: 32 },
  glow:         { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(0,229,192,0.06)' },
  prompt:       { fontSize: 11, letterSpacing: 4, color: C.accent, textTransform: 'uppercase', fontWeight: '600' },
  diceRow:      { flexDirection: 'row', gap: 20 },
  resultBlock:  { alignItems: 'center', gap: 6 },
  totalLabel:   { fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 3, textTransform: 'uppercase' },
  totalNum:     { fontSize: 84, fontFamily: FONTS.display, color: C.accent, lineHeight: 92 },
  moveChip:     { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(57,255,139,0.12)', borderWidth: 1, borderColor: 'rgba(57,255,139,0.4)' },
  moveChipText: { fontSize: 11, color: C.green, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
});
