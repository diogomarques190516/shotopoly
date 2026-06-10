import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Player, BoardSpace } from '../lib/types';
import { ALL_SPACES, indexToGrid } from '../lib/gameLogic';
import { C, FONTS, PLAYER_COLORS, PLAYER_EMOJIS, CORNER_TYPES, getBandColor } from '../constants/gameConstants';
import { getLocale, getSpaceName, t } from '../lib/i18n';

export type TokenInfo = { id: string; color: string; emoji: string };

function PlayerToken({ color, emoji, size }: { color: string; emoji: string; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#0a0d18cc', borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.6, lineHeight: size }}>{emoji}</Text>
    </View>
  );
}

function SpaceTile({ space, side, tokens, owner, size }: {
  space: BoardSpace; side: string; tokens: TokenInfo[];
  owner?: { color: string; level: number };
  size: number;
}) {
  const isCorner  = CORNER_TYPES.has(space.type);
  const bandColor = getBandColor(space);
  const bandSize  = Math.round(size * 0.28);
  const isSide    = side === 'left' || side === 'right';

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

  return (
    <View style={{ width: size, height: size, backgroundColor: isCorner ? C.corner : C.tile, borderWidth: 0.5, borderColor: C.border, overflow: 'hidden' }}>
      <View style={contentPos}>
        <View style={{ transform: [{ rotate }], alignItems: 'center', width: isSide ? size - bandSize : undefined }}>
          {space.emoji
            ? <Text style={{ fontSize: isCorner ? 20 : 12, lineHeight: isCorner ? 24 : 15 }}>{space.emoji}</Text>
            : null}
          <Text style={{ fontSize: isCorner ? 8.5 : 7.5, fontWeight: '700', color: isCorner ? C.gold : C.text, textAlign: 'center', lineHeight: isCorner ? 11 : 9.5 }} numberOfLines={2}>
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

      {tokens.length > 0 && (
        <View style={{ position: 'absolute', bottom: 1, right: 1, flexDirection: 'row', alignItems: 'flex-end' }}>
          {tokens.slice(0, 4).map((t, i) => (
            <View key={t.id} style={{ marginLeft: i > 0 ? -5 : 0, zIndex: tokens.length - i }}>
              <PlayerToken color={t.color} emoji={t.emoji} size={tokens.length > 2 ? 12 : 14} />
            </View>
          ))}
          {tokens.length > 4 && (
            <Text style={{ fontSize: 7, color: C.gold, marginLeft: -3, zIndex: 10 }}>+{tokens.length - 4}</Text>
          )}
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
        <Text style={{ fontSize: 9, color: 'rgba(255,210,63,0.5)', letterSpacing: 3, textTransform: 'uppercase' }}>
          {t('board_round', getLocale(), { n: String(turnNumber).padStart(2, '0') })}
        </Text>
        <Text style={{ fontSize: inner * 0.085, fontFamily: FONTS.display, color: C.gold, lineHeight: inner * 0.1, textAlign: 'center' }}>
          {'SHOTO\nPOLY'}
        </Text>
        <Text style={{ fontSize: 8, color: 'rgba(57,255,139,0.55)', letterSpacing: 2, textTransform: 'uppercase' }}>
          🥃 🎲 🥃
        </Text>
      </View>
    </View>
  );
}

export function Board({ players, boardWidth, turnNumber, propLevels, animPositions }: {
  players: Player[]; boardWidth: number; turnNumber: number;
  propLevels: Record<string, number>;
  animPositions?: Record<string, number>;
}) {
  const tileSize = boardWidth / 8;

  const tokensByPos = useMemo(() => {
    const map: Record<number, TokenInfo[]> = {};
    players.forEach((p, idx) => {
      const pos = animPositions?.[p.id] ?? p.position;
      if (!map[pos]) map[pos] = [];
      map[pos].push({ id: p.id, color: PLAYER_COLORS[idx % PLAYER_COLORS.length], emoji: PLAYER_EMOJIS[idx % PLAYER_EMOJIS.length] });
    });
    return map;
  }, [players, animPositions]);

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
    <View style={{ width: boardWidth, height: boardWidth, backgroundColor: '#0f1424', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,210,63,0.2)', overflow: 'hidden' }}>
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
            <SpaceTile space={space} side={side} tokens={tokensByPos[idx] ?? []} owner={ownersByPos[idx]} size={tileSize} />
          </View>
        );
      })}
    </View>
  );
}
