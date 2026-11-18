// Constantes e tabelas de balanceamento do jogo.

export const FLOOR_H = 3.2;      // altura de cada andar
export const SLOT_W = 4.5;       // largura de cada espaço (quarto/instalação)
export const DEPTH = 4;          // profundidade dos cômodos (z de -DEPTH até 0)
export const CORRIDOR_Z = 0.75;  // linha onde os personagens andam no corredor
export const SLAB_FRONT = 1.5;   // quanto a laje avança para frente (corredor)
export const ELEV_X0 = 9;        // início do poço do elevador
export const ELEV_W = 2;
export const ELEV_X = ELEV_X0 + ELEV_W / 2;
export const SLOTS_PER_FLOOR = 6;
export const MAX_FLOORS = 6;
export const STREET_X = -9;      // de onde os hóspedes surgem/somem

// x inicial de um espaço (índices 0,1 à esquerda do elevador; 2..5 à direita)
export function slotX0(i) {
  return i < 2 ? i * SLOT_W : ELEV_X0 + ELEV_W + (i - 2) * SLOT_W;
}
export function slotCenterX(i) { return slotX0(i) + SLOT_W / 2; }
export const BUILDING_W = slotX0(SLOTS_PER_FLOOR - 1) + SLOT_W;

// Tempo: 1 hora de jogo = REAL_SEC_PER_HOUR segundos reais (na velocidade 1x)
export const REAL_SEC_PER_HOUR = 2.5;
export const HOURS_PER_NIGHT = 4; // uma "diária" dura 4 horas de jogo

export const TIERS = [
  { id: 0, name: 'Simples', price: 30, color: 0x6fa8dc },
  { id: 1, name: 'Luxo',    price: 65, color: 0xb57edc, upgrade: 300 },
  { id: 2, name: 'Suíte',   price: 120, color: 0xf1c232, upgrade: 750 },
];

export const BUILDABLES = {
  room:   { name: 'Quarto Simples', cost: 150, desc: 'Um quarto básico para hospedar.', icon: 'bed' },
  snack:  { name: 'Lanchonete', cost: 400, desc: 'Hóspedes compram lanches (+$). +Satisfação.', icon: 'burger', spend: [12, 22] },
  gym:    { name: 'Academia', cost: 650, desc: 'Hóspedes malham e pagam taxa. ++Satisfação.', icon: 'dumbbell', spend: [15, 25] },
  pool:   { name: 'Piscina', cost: 1100, desc: 'Atração principal! Atrai mais hóspedes.', icon: 'wave', spend: [20, 35] },
};

export const UPGRADES = {
  floor:     { name: 'Novo Andar', desc: 'Constrói mais um andar com 6 espaços.', cost: (lvl) => 500 + lvl * 450, max: MAX_FLOORS - 1 },
  maid:      { name: 'Camareira', desc: 'Limpa quartos sujos automaticamente. Salário $15/dia.', cost: (lvl) => 250 + lvl * 150, max: 5 },
  reception: { name: 'Recepcionista', desc: 'Aloca hóspedes automaticamente no melhor quarto. Salário $30/dia.', cost: () => 900, max: 1 },
  decor:     { name: 'Decoração do Lobby', desc: 'Plantas e sofás: hóspedes esperam com +30% de paciência.', cost: (lvl) => 200 + lvl * 300, max: 2 },
  marketing: { name: 'Marketing', desc: 'Anúncios atraem mais hóspedes.', cost: (lvl) => 300 + lvl * 400, max: 3 },
  cleanfast: { name: 'Kit de Limpeza Pro', desc: 'Limpeza 40% mais rápida.', cost: () => 350, max: 1 },
};

export const GUEST_TYPES = [
  { id: 'backpacker', name: 'Mochileiro', want: 0, weight: 5, minRating: 0, nights: [1, 2], shirt: 0x6aa84f },
  { id: 'tourist',    name: 'Turista',    want: 0, weight: 4, minRating: 0, nights: [1, 3], shirt: 0xe69138 },
  { id: 'business',   name: 'Executivo',  want: 1, weight: 3, minRating: 2, nights: [1, 2], shirt: 0x3d5a80 },
  { id: 'family',     name: 'Família',    want: 1, weight: 2, minRating: 2.5, nights: [2, 3], shirt: 0xcc4125 },
  { id: 'vip',        name: 'Celebridade', want: 2, weight: 1.2, minRating: 3.5, nights: [1, 3], shirt: 0xd5a6bd },
];

export const START_MONEY = 250;
export const QUEUE_MAX = 7;
export const BASE_PATIENCE = 28; // segundos reais (1x)
export const CLEAN_TIME = 4;     // segundos reais (1x)
