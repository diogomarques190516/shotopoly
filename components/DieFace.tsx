import { View } from 'react-native';
import { C } from '../constants/gameConstants';

const PIPS: Record<number, [number, number][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

export function DieFace({ value, size = 78 }: { value: number; size?: number }) {
  const pad      = Math.round(size * 0.17);
  const pipSize  = Math.round(size * 0.145);
  const cellStep = (size - 2 * pad - pipSize) / 2;
  const dots     = PIPS[value] ?? PIPS[1];
  return (
    <View style={{
      width: size, height: size,
      borderRadius: Math.round(size * 0.2),
      backgroundColor: '#f4f7ff',
      shadowColor: C.accent, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6, shadowRadius: 14, elevation: 10,
    }}>
      {dots.map(([r, c], i) => (
        <View key={i} style={{
          position: 'absolute',
          top: pad + r * cellStep, left: pad + c * cellStep,
          width: pipSize, height: pipSize,
          borderRadius: pipSize / 2, backgroundColor: '#1a0a05',
        }} />
      ))}
    </View>
  );
}
