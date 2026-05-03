import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Player, BoardSpace } from '../lib/types';
import { ALL_SPACES } from '../lib/gameLogic';
import { C, PLAYER_COLORS, PLAYER_EMOJIS, formatMoney } from '../constants/gameConstants';

type Tab = 'players' | 'money' | 'props';

export function PlayerPanel({ players, currentPlayerId, myPlayerId, propLevels }: {
  players: Player[];
  currentPlayerId: string;
  myPlayerId: string | null;
  propLevels: Record<string, number>;
}) {
  const [tab, setTab] = useState<Tab>('players');

  const TAB_LABELS: Record<Tab, string> = { players: 'Jogadores', money: 'Dinheiro & Shots', props: 'Propriedades' };

  return (
    <View style={{ backgroundColor: '#0d1020', borderTopWidth: 1, borderTopColor: 'rgba(255,210,63,0.12)' }}>
      {/* Tab bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingTop: 6, gap: 4 }}>
        {(['players', 'money', 'props'] as Tab[]).map(t => {
          const active = tab === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{ flex: 1, paddingVertical: 5, borderRadius: 7, alignItems: 'center',
                backgroundColor: active ? 'rgba(255,210,63,0.12)' : 'transparent',
                borderWidth: 1, borderColor: active ? C.gold + '66' : 'transparent' }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: active ? C.gold : C.textFaint, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                {TAB_LABELS[t]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content — fixed height so it never grows */}
      <View style={{ height: 84, paddingHorizontal: 8, paddingTop: 6 }}>

        {tab === 'players' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
            {players.map((p, idx) => {
              const color  = PLAYER_COLORS[idx % PLAYER_COLORS.length];
              const emoji  = PLAYER_EMOJIS[idx % PLAYER_EMOJIS.length];
              const active = p.id === currentPlayerId;
              const isMe   = p.id === myPlayerId;
              return (
                <View key={p.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: active ? 'rgba(255,210,63,0.10)' : 'rgba(255,255,255,0.04)',
                  borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
                  borderWidth: 1, borderColor: active ? C.gold + '88' : 'transparent',
                  minWidth: 90,
                }}>
                  <Text style={{ fontSize: 18 }}>{emoji}</Text>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
                  <View>
                    <Text style={{ fontSize: 11, color: isMe ? '#fff' : C.textDim, fontWeight: isMe ? '700' : '400' }} numberOfLines={1}>{p.name}</Text>
                    {active && <Text style={{ fontSize: 8, color: C.gold }}>▶ a jogar</Text>}
                    {isMe && !active && <Text style={{ fontSize: 8, color: C.textFaint }}>tu</Text>}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {tab === 'money' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 5 }}>
            {players.map((p, idx) => {
              const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
              const emoji = PLAYER_EMOJIS[idx % PLAYER_EMOJIS.length];
              const isMe  = p.id === myPlayerId;
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14 }}>{emoji}</Text>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
                    <Text style={{ fontSize: 11, color: isMe ? '#fff' : C.textDim, fontWeight: isMe ? '700' : '400' }}>{p.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 11, color: C.green, fontWeight: '700' }}>{formatMoney(p.money)}</Text>
                    {(p.shots_owed ?? 0) > 0 && (
                      <Text style={{ fontSize: 10, color: '#E94560', fontWeight: '700' }}>🥃×{p.shots_owed}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {tab === 'props' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'flex-start' }}>
            {(() => {
              const cards: JSX.Element[] = [];
              players.forEach((p, idx) => {
                const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                (p.properties as number[] ?? []).forEach(pos => {
                  const space = ALL_SPACES.find(s => s.position === pos) as BoardSpace | undefined;
                  if (!space) return;
                  const level = propLevels[String(pos)] ?? 1;
                  cards.push(
                    <View key={`${p.id}-${pos}`} style={{ width: 68, borderRadius: 8, backgroundColor: '#151a2e', borderWidth: 1, borderColor: space.color ?? '#333', padding: 6 }}>
                      <View style={{ height: 2, borderRadius: 1, backgroundColor: color, marginBottom: 4 }} />
                      <Text style={{ color: C.text, fontSize: 8, fontWeight: '700' }} numberOfLines={2}>{space.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
                        {[1, 2, 3].map(l => (
                          <View key={l} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: l <= level ? (space.color ?? C.gold) : 'rgba(255,255,255,0.1)' }} />
                        ))}
                      </View>
                    </View>
                  );
                });
              });
              if (cards.length === 0) {
                return <Text style={{ color: C.textFaint, fontSize: 11, paddingTop: 10 }}>Ainda não há propriedades.</Text>;
              }
              return cards;
            })()}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
