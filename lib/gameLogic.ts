import { BoardSpace } from './types';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 28-space board — 8×8 grid perimeter
// Bottom row right→left (0-7), left col bottom→top (7-14),
// top row left→right (14-21), right col top→bottom (21-27)
const BOARD: BoardSpace[] = [
  // ── bottom row right→left ──────────────────────────────
  { position: 0,  name: 'GO',           type: 'go',           emoji: '🎯', sub: '+€200k' },
  { position: 1,  name: 'Honi',         type: 'property',     price: 60000,  rent: 10000, color: '#2BB573', sub: '🥃×1' },
  { position: 2,  name: 'Surpresa',     type: 'event',        emoji: '⚡' },
  { position: 3,  name: 'Lux',          type: 'property',     price: 120000, rent: 25000, color: '#3D8BFF', sub: '🥃×2' },
  { position: 4,  name: 'Eskada',       type: 'property',     price: 60000,  rent: 10000, color: '#2BB573', sub: '🥃×1' },
  { position: 5,  name: 'Albufeira',    type: 'property',     price: 180000, rent: 40000, color: '#FF8A3D', sub: '🥃×2' },
  { position: 6,  name: 'Imposto',      type: 'tax',          taxAmount: 100000, sub: '-€100k' },
  { position: 7,  name: 'Cadeia',       type: 'jail',         emoji: '🔒', sub: 'Visita' },

  // ── left col bottom→top ────────────────────────────────
  { position: 8,  name: 'Pacha',        type: 'property',     price: 120000, rent: 25000, color: '#3D8BFF', sub: '🥃×2' },
  { position: 9,  name: 'Zé Dogs',      type: 'property',     price: 240000, rent: 60000, color: '#E94560', sub: '🥃×3' },
  { position: 10, name: 'PVZ',          type: 'property',     price: 180000, rent: 40000, color: '#FF8A3D', sub: '🥃×2' },
  { position: 11, name: 'Surpresa',     type: 'event',        emoji: '⚡' },
  { position: 12, name: 'SkyValley',    type: 'property',     price: 60000,  rent: 10000, color: '#2BB573', sub: '🥃×1' },
  { position: 13, name: 'Classe',       type: 'property',     price: 120000, rent: 25000, color: '#3D8BFF', sub: '🥃×2' },

  // ── top row left→right ─────────────────────────────────
  { position: 14, name: 'Portal',     type: 'free_parking', emoji: '🍺', sub: 'Free' },
  { position: 15, name: 'Vilamoura',    type: 'property',     price: 180000, rent: 40000, color: '#FF8A3D', sub: '🥃×2' },
  { position: 16, name: 'Forte',     type: 'property',     price: 60000,  rent: 10000, color: '#2BB573', sub: '🥃×1' },
  { position: 17, name: 'Boite',        type: 'property',     price: 240000, rent: 60000, color: '#E94560', sub: '🥃×3' },
  { position: 18, name: 'Surpresa',     type: 'event',        emoji: '⚡' },
  { position: 19, name: 'Rooftop',      type: 'property',     price: 120000, rent: 25000, color: '#3D8BFF', sub: '🥃×2' },
  { position: 20, name: 'Esposende',    type: 'property',     price: 180000, rent: 40000, color: '#FF8A3D', sub: '🥃×2' },
  { position: 21, name: 'Pra Cadeia',   type: 'go_to_jail',   emoji: '🚔' },

  // ── right col top→bottom ───────────────────────────────
  { position: 22, name: 'Tabuas',          type: 'property',     price: 60000,  rent: 10000, color: '#2BB573', sub: '🥃×1' },
  { position: 23, name: 'Imposto',      type: 'tax',          taxAmount: 150000, sub: '-€150k' },
  { position: 24, name: 'Gate13',       type: 'property',     price: 240000, rent: 60000, color: '#E94560', sub: '🥃×3' },
  { position: 25, name: 'Gare',         type: 'property',     price: 120000, rent: 25000, color: '#3D8BFF', sub: '🥃×2' },
  { position: 26, name: 'Século',       type: 'property',     price: 180000, rent: 40000, color: '#FF8A3D', sub: '🥃×2' },
  { position: 27, name: 'Neopop',        type: 'property',     price: 120000, rent: 25000, color: '#3D8BFF', sub: '🥃×2' },
];

export const BOARD_SIZE = BOARD.length; // 28
export const ALL_SPACES = BOARD;

export function getBoardSpace(position: number): BoardSpace {
  const idx = ((position % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  return BOARD[idx];
}

// Maps perimeter index 0-27 → 8×8 grid {row, col}
// 0 = GO (bottom-right corner), going counter-clockwise
export function indexToGrid(i: number): { row: number; col: number } {
  if (i <= 7)  return { row: 7, col: 7 - i };
  if (i <= 14) return { row: 7 - (i - 7), col: 0 };
  if (i <= 21) return { row: 0, col: i - 14 };
  return { row: i - 21, col: 7 };
}

export const EVENT_CARDS = [
  // ── banco paga ────────────────────────────────────────────────────────────
  { message: 'Encontraste uma nota esquecida no bolso do casaco. O banco paga-te €50k.', effect: 'collect_bank_50' },
  { message: 'O banco cometeu um erro de processamento a teu favor. Recebes €100k.', effect: 'collect_bank_100' },
  { message: 'Dividendos de um investimento antigo chegaram. Recebes €150k do banco.', effect: 'collect_bank_150' },
  { message: 'Prémio surpresa por seres o mais animado da noite. Recebes €200k do banco.', effect: 'collect_bank_200' },
  { message: 'Reembolso de impostos com juros incluídos. Recebes €100k do banco.', effect: 'collect_bank_100' },
  { message: 'Subsídio de habitação aprovado pela câmara. Recebes €150k do banco.', effect: 'collect_bank_150' },
  { message: 'O banco oferece €300k mas exige 3 shots como comissão. Aceitas o negócio.', effect: 'collect_bank_300_drink_3' },
  // ── pagas ao banco ────────────────────────────────────────────────────────
  { message: 'Multa por perturbação da ordem pública. Pagas €50k ao banco.', effect: 'pay_bank_50' },
  { message: 'Conta do hospital após a noitada épica. Pagas €100k ao banco.', effect: 'pay_bank_100' },
  { message: 'Dano colateral numa festa que não foi tua. Pagas €200k ao banco.', effect: 'pay_bank_200' },
  { message: 'Taxa de manutenção anual das tuas propriedades. Pagas €50k ao banco.', effect: 'pay_bank_50' },
  // ── recebes dos jogadores ─────────────────────────────────────────────────
  { message: 'Hoje é o teu dia. Cada jogador oferece-te €20k de presente.', effect: 'collect_20_all' },
  { message: 'Acordo fechado com todos à mesa. Cada jogador paga-te €30k.', effect: 'collect_30_all' },
  { message: 'Rodada ao contrário. Cada jogador contribui com €50k para ti.', effect: 'collect_50_all' },
  { message: 'Garrafa coletiva a teu favor. Recebes €100k de cada jogador.', effect: 'collect_100_all' },
  { message: 'Eleito o mais simpático da mesa. Cada jogador dá-te €30k.', effect: 'collect_30_all' },
  // ── todos bebem ───────────────────────────────────────────────────────────
  { message: 'Saúde geral! Todos os jogadores bebem 1 shot sem exceção.', effect: 'all_drink_1' },
  { message: 'Noite longa pela frente. Todos os jogadores bebem 2 shots agora.', effect: 'all_drink_2' },
  { message: 'Todos bebem 1 shot exceto quem tirou esta carta. Boa sorte para os outros.', effect: 'others_drink_1' },
  { message: 'Brinde obrigatório! Todos os jogadores à mesa bebem 1 shot.', effect: 'all_drink_1' },
  { message: 'Decisão popular por unanimidade. Todos bebem 2 shots. Sem exceções.', effect: 'all_drink_2' },
  // ── tu bebes ──────────────────────────────────────────────────────────────
  { message: 'Perdeste uma aposta mais cedo que já tinhas esquecido. Bebes 1 shot.', effect: 'self_drink_1' },
  { message: 'Excesso de confiança na jogada anterior. Bebes 2 shots como punição.', effect: 'self_drink_2' },
  { message: 'A mesa decidiu por unanimidade. Bebes 3 shots sem direito a reclamar.', effect: 'self_drink_3' },
  { message: 'Consequências das tuas escolhas de vida esta noite. Bebes 2 shots.', effect: 'self_drink_2' },
  { message: 'Alguém bebeu por ti entretanto. Remove 1 shot pendente da tua conta.', effect: 'remove_1_shot' },
  // ── passes sips a outros ──────────────────────────────────────────────────
  { message: 'Generosidade seletiva. Passa 1 shot ao jogador imediatamente à tua esquerda.', effect: 'give_1_shot' },
  { message: 'Partilha obrigatória. Passa 2 shots ao jogador da tua esquerda.', effect: 'give_2_shots' },
  { message: 'Punição especial. Passa 3 shots ao jogador da tua esquerda.', effect: 'give_3_shots' },
  { message: 'O jogador à tua direita bebe 2 shots por decisão do grupo.', effect: 'give_shots_right' },
  // ── movimento ─────────────────────────────────────────────────────────────
  { message: 'Festa no início do tabuleiro! Avança diretamente para o GO e recebes €200k.', effect: 'advance_go' },
  { message: 'Foste apanhado a fazer batota. Vai direto para a Cadeia sem passar pelo GO.', effect: 'go_to_jail_effect' },
  { message: 'Vento a favor. Avança 5 casas de uma vez.', effect: 'advance_5' },
  { message: 'Impulso renovado. Avança 3 casas com confiança.', effect: 'advance_3' },
  { message: 'Tropeçaste na estratégia. Recuas 3 casas.', effect: 'back_3' },
  { message: 'Voltavas atrás para buscar algo que esqueceste. Recuas 2 casas.', effect: 'back_2' },
  // ── lança de novo ─────────────────────────────────────────────────────────
  { message: 'Turbo ativado. Lança os dados novamente sem perder a vez.', effect: 'roll_again' },
  { message: 'Segunda oportunidade. A sorte pode mudar. Lança de novo.', effect: 'roll_again' },
  { message: 'Dados suspeitos a teu favor desta vez. Lança novamente.', effect: 'roll_again' },
  // ── troca de posicao ──────────────────────────────────────────────────────
  { message: 'Troca de posição com o jogador à tua esquerda. Boa ou má sorte, não há volta.', effect: 'swap_left' },
  { message: 'Rotação geral no tabuleiro. Todos avançam para a posição do jogador seguinte.', effect: 'rotate_positions' },
  // ── combinados e especiais ────────────────────────────────────────────────
  { message: 'Investimento arriscado. Perdes €100k mas avança 3 casas em compensação.', effect: 'pay_advance_3' },
  { message: 'Negócio relâmpago. Avança 3 casas e ainda recebes €50k do banco.', effect: 'advance_3_collect_50' },
  { message: 'O banco oferece €100k mas exige 2 shots como comissão. Aceitas o acordo.', effect: 'collect_bank_100_drink_2' },
  { message: 'Batota detetada pelos outros jogadores. Bebes 1 shot e recuas 2 casas.', effect: 'drink_back_2' },
  { message: 'Taxa de luxo coletiva. Todos os jogadores exceto tu pagam €50k ao banco.', effect: 'others_pay_bank_50' },
  { message: 'Solidariedade com o mais pobre. O jogador com menos dinheiro recebe €100k de cada um.', effect: 'poorest_collects' },
  { message: 'O mais rico paga a ronda. O jogador com mais dinheiro bebe 1 shot por cada pessoa à mesa.', effect: 'richest_drinks_per_player' },
  { message: 'Todos bebem exceto o jogador com menos dinheiro. Quem é pobre tem essa vantagem.', effect: 'all_except_poorest_drink' },
  { message: 'A tua propriedade valorizou no mercado. Recebes €100k do banco por boa gestão.', effect: 'collect_bank_100' },
];

export function drawEventCard(): typeof EVENT_CARDS[0] {
  return EVENT_CARDS[Math.floor(Math.random() * EVENT_CARDS.length)];
}
