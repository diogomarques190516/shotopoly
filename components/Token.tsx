import { Image, View } from 'react-native';
import { TOKEN_IMAGES, PLAYER_COLORS } from '../constants/gameConstants';

// A player's game piece: an original full-color character.
// `playerIdx` is the player's index in turn order (stable across screens).
export function Token({ playerIdx, size, framed = false }: {
  playerIdx: number;
  size: number;
  framed?: boolean;
}) {
  const source = TOKEN_IMAGES[playerIdx % TOKEN_IMAGES.length];
  const color  = PLAYER_COLORS[playerIdx % PLAYER_COLORS.length];
  const img = (
    <Image
      source={source}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
  if (!framed) return img;
  const pad = Math.max(2, Math.round(size * 0.2));
  return (
    <View style={{
      width: size + pad * 2, height: size + pad * 2,
      borderRadius: (size + pad * 2) / 2,
      backgroundColor: 'rgba(10,13,24,0.85)',
      borderWidth: 1.5, borderColor: color,
      alignItems: 'center', justifyContent: 'center',
    }}>
      {img}
    </View>
  );
}
