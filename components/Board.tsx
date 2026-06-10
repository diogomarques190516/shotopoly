import { useEffect, useMemo, useRef } from 'react';
import { View, Text, Image, Pressable, Animated, Easing } from 'react-native';
import { Player, BoardSpace } from '../lib/types';
import { ALL_SPACES, BOARD_SIZE, indexToGrid } from '../lib/gameLogic';
import { C, FONTS, CORNER_TYPES, SPACE_ICONS, PLAYER_COLORS, getBandColor } from '../constants/gameConstants';
import { getLocale, getSpaceName, t } from '../lib/i18n';
import { Token } from './Token';

// How long one hop between adjacent tiles takes. The game screen waits for
// `steps * WALK_STEP_MS` before opening result modals.
export const WALK_STEP_MS = 230;

function tileCenter(pos: number, tileSize: number) {
  const { row, col } = indexToGrid(pos);
  return { x: col * tileSize + tileSize / 2, y: row * tileSize + tileSize / 2 };
}

// A token that physically walks tile-by-tile to its target position,
// hopping with a little jump arc — including on spectators' screens,
// since it animates whenever the player's position changes.
function WalkingToken({ playerIdx, position, tileSize, onStep, onPress }: {
  playerIdx: number; position: number; tileSize: number;
  onStep?: () => void; onPress?: () => void;
}) {
  const size = Math.max(16, Math.round(tileSize * 0.44));
  // deterministic fan offset so tokens sharing a tile stay visible
  const angle = (playerIdx / 8) * Math.PI * 2 + 0.6;
  const off = {
    x: Math.cos(angle) * tileSize * 0.16,
    y: Math.sin(angle) * tileSize * 0.16,
  };
  const dest = (pos: number) => {
    const c = tileCenter(pos, tileSize);
    return { x: c.x + off.x - size / 2, y: c.y + off.y - size / 2 };
  };

  const xy   = useRef(new Animated.ValueXY(dest(position))).current;
  const jump = useRef(new Animated.Value(0)).current;
  const curRef    = useRef(position);
  const targetRef = useRef(position);
  const busyRef   = useRef(false);

  useEffect(() => {
    targetRef.current = position;
    if (busyRef.current || curRef.current === position) return;
    busyRef.current = true;
    (async () => {
      while (curRef.current !== targetRef.current) {
        // walk the shorter way around (handles "go back 2" cards)
        const fwd = ((targetRef.current - curRef.current) + BOARD_SIZE) % BOARD_SIZE;
        const dir = fwd <= BOARD_SIZE / 2 ? 1 : -1;
        curRef.current = (curRef.current + dir + BOARD_SIZE) % BOARD_SIZE;
        onStep?.();
        await new Promise<void>(res => {
          Animated.parallel([
            Animated.timing(xy, {
              toValue: dest(curRef.current),
              duration: WALK_STEP_MS,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(jump, { toValue: 1, duration: WALK_STEP_MS / 2, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(jump, { toValue: 0, duration: WALK_STEP_MS / 2, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            ]),
          ]).start(() => res());
        });
      }
      busyRef.current = false;
    })();
  }, [position, tileSize]);

  const hopY  = jump.interpolate({ inputRange: [0, 1], outputRange: [0, -tileSize * 0.38] });
  const hopSc = jump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute', left: 0, top: 0,
        transform: [
          { translateX: xy.x },
          { translateY: Animated.add(xy.y, hopY) },
          { scale: hopSc },
        ],
      }}
    >
      <Pressable onPress={onPress} hitSlop={8}>
        <Token playerIdx={playerIdx} size={size} framed />
      </Pressable>
    </Animated.View>
  );
}

function SpaceTile({ space, side, owner, size }: {
  space: BoardSpace; side: string;
  owner?: { color: string; level: number };
  size: number;
}) {
  const isCorner  = CORNER_TYPES.has(space.type);
  const bandColor = getBandColor(space);
  const bandSize  = Math.round(size * 0.28);
  const isSide    = side === 'left' || side === 'right';
  const icon      = SPACE_ICONS[space.type];

  const bandPos: any = { position: 'absolute', backgroundColor: bandColor };
  if (side === 'bottom') Object.assign(bandPos, { top: 0, left: 0, right: 0, height: bandSize });
  if (side === 'top')    Object.assign(bandPos, { bottom: 0, left: 0, right: 0, height: bandSize });
  if (side === 'left')   Object.assign(bandPos, { top: 0, bottom: 0, right: 0, width: bandSize });
  if (side === 'right')  Object.assign(bandPos, { top: 0, bottom: 0, left: 0, width: bandSize });

  const contentPos: any = { position: 'absolute', alignItems: 'center', justifyContent: 'center' };
  if (isCorner) {
    Object.assign(contentPos, { top: 0, left: 0, right: 0, bottom: 0 });
  } else if (side === 'bottom') {
    Object.assign(contentPos, { top: bandSize, left: 0, right: 0, bottom: 0 });
  } else if (side === 'top') {
    Object.assign(contentPos, { top: 0, left: 0, right: 0, bottom: bandSize });
  } else if (side === 'left') {
    Object.assign(contentPos, { top: 0, left: 0, right: bandSize, bottom: 0 });
  } else {
    Object.assign(contentPos, { top: 0, left: bandSize, right: 0, bottom: 0 });
  }

  const rotate =
    side === 'left'  ? '90deg'  :
    side === 'right' ? '-90deg' :
    side === 'top'   ? '180deg' : '0deg';

  const dotSize = Math.max(3, Math.round(size * 0.085));
  const dotPos: any = { position: 'absolute', alignItems: 'center', justifyContent: 'center' };
  if (side === 'bottom') Object.assign(dotPos, { top: 1, left: 0, right: 0, flexDirection: 'row', gap: 1.5 });
  if (side === 'top')    Object.assign(dotPos, { bottom: 1, left: 0, right: 0, flexDirection: 'row', gap: 1.5 });
  if (side === 'left')   Object.assign(dotPos, { right: 1, top: 0, bottom: 0, flexDirection: 'column', gap: 1.5 });
  if (side === 'right')  Object.assign(dotPos, { left: 1, top: 0, bottom: 0, flexDirection: 'column', gap: 1.5 });

  const iconSize = isCorner ? size * 0.34 : size * 0.22;

  return (
    <View style={{ width: size, height: size, backgroundColor: isCorner ? C.corner : C.tile, borderWidth: 0.5, borderColor: C.border, overflow: 'hidden' }}>
      <View style={contentPos}>
        <View style={{ transform: [{ rotate }], alignItems: 'center', width: isSide ? size - bandSize : undefined }}>
          {icon
            ? <Image source={icon} resizeMode="contain"
                style={{ width: iconSize, height: iconSize, marginBottom: 1,
                         tintColor: isCorner ? C.amber : 'rgba(244,245,251,0.8)' }} />
            : null}
          <Text style={{ fontSize: isCorner ? 8.5 : 7.5, fontWeight: '700', color: isCorner ? C.amber : C.text, textAlign: 'center', lineHeight: isCorner ? 11 : 9.5 }} numberOfLines={2}>
            {getSpaceName(space.name, getLocale())}
          </Text>
          {space.sub
            ? <Text style={{ fontSize: 6, color: C.textDim, lineHeight: 8 }}>{space.sub}</Text>
            : null}
        </View>
      </View>

      {!isCorner && bandColor && <View style={bandPos} />}

      {owner && !isCorner && bandColor && (
        <View style={dotPos}>
          {[1, 2, 3].map(l => (
            <View key={l} style={{
              width: dotSize, height: dotSize, borderRadius: dotSize / 2,
              backgroundColor: l <= owner.level ? owner.color : 'rgba(255,255,255,0.2)',
            }} />
          ))}
        </View>
      )}
    </View>
  );
}

function BoardCenter({ tileSize, turnNumber }: { tileSize: number; turnNumber: number }) {
  const inner = tileSize * 6;
  return (
    <View style={{ position: 'absolute', top: tileSize, left: tileSize, width: inner, height: inner, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ transform: [{ rotate: '-12deg' }], alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 9, color: 'rgba(255,195,0,0.6)', letterSpacing: 3, textTransform: 'uppercase' }}>
          {t('board_round', getLocale(), { n: String(turnNumber).padStart(2, '0') })}
        </Text>
        <Text style={{ fontSize: inner * 0.13, fontFamily: FONTS.display, color: C.accent, lineHeight: inner * 0.13, letterSpacing: 2, textAlign: 'center' }}>
          {'SHOTO\nPOLY'}
        </Text>
        <View style={{ width: inner * 0.32, height: 2, backgroundColor: 'rgba(255,70,85,0.55)', borderRadius: 1 }} />
      </View>
    </View>
  );
}

export function Board({ players, boardWidth, turnNumber, propLevels, onPlayerPress, onTokenStep }: {
  players: Player[]; boardWidth: number; turnNumber: number;
  propLevels: Record<string, number>;
  onPlayerPress?: (playerId: string) => void;
  onTokenStep?: () => void;
}) {
  const tileSize = boardWidth / 8;

  const ownersByPos = useMemo(() => {
    const map: Record<number, { color: string; level: number }> = {};
    players.forEach((p, idx) => {
      const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
      (p.properties as number[] ?? []).forEach(pos => {
        map[pos] = { color, level: propLevels[String(pos)] ?? 1 };
      });
    });
    return map;
  }, [players, propLevels]);

  return (
    <View style={{ width: boardWidth, height: boardWidth, backgroundColor: '#0f1424', borderRadius: 14, borderWidth: 1, borderColor: C.accentDim, overflow: 'hidden' }}>
      <BoardCenter tileSize={tileSize} turnNumber={turnNumber} />
      {ALL_SPACES.map((space, idx) => {
        const { row, col } = indexToGrid(idx);
        const isCorner = CORNER_TYPES.has(space.type);
        let side: string;
        if (isCorner)       side = 'corner';
        else if (row === 7) side = 'bottom';
        else if (row === 0) side = 'top';
        else if (col === 0) side = 'left';
        else                side = 'right';
        return (
          <View key={idx} style={{ position: 'absolute', top: row * tileSize, left: col * tileSize }}>
            <SpaceTile space={space} side={side} owner={ownersByPos[idx]} size={tileSize} />
          </View>
        );
      })}
      {players.map((p, idx) => (
        <WalkingToken
          key={p.id}
          playerIdx={idx}
          position={p.position}
          tileSize={tileSize}
          onStep={onTokenStep}
          onPress={() => onPlayerPress?.(p.id)}
        />
      ))}
    </View>
  );
}
