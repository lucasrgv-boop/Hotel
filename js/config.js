// Constantes de layout e tabelas de balanceamento do jogo.
//
// Planta de cada andar (vista de cima, +z = rua):
//
//   z = -5.7  +------+--------+--------+--------+--------+   fundos
//             | ELEV | col 0  | col 1  | col 2  | col 3  |   fileira de trás (i = 0..3)
//   z = -1.2  +------+--------+--------+--------+--------+
//             |            corredor (z = 0)               |
//   z =  1.2  +------+--------+--------+--------+--------+
//             |ESCADA| col 0  | col 1  | col 2  | col 3  |   fileira da frente (i = 4..7)
//   z =  5.7  +------+--------+--------+--------+--------+   fachada (rua)
//
// No térreo, i = 4 e 5 formam o lobby com a recepção.

export const FLOOR_H = 3.0;     // distância entre andares
export const WALL_H = 1.25;     // paredes cortadas (casa de bonecas)
export const SLOT_W = 5;
export const ROOM_D = 4.5;
export const CORR_HALF = 1.2;   // meia largura do corredor
export const CORE_W = 4;        // bloco do elevador/escada
export const COLS = 4;
export const SLOTS_PER_FLOOR = COLS * 2;
export const BUILDING_W = CORE_W + COLS * SLOT_W;
export const BACK_Z = -(CORR_HALF + ROOM_D);
export const FRONT_Z = CORR_HALF + ROOM_D;
export const CORRIDOR_Z = 0;
export const ELEV_X = 2;
export const ELEV_Z = -3.2;
export const MAX_FLOORS = 5;
export const LOBBY_SLOTS = [4, 5];
export const DOOR_X = CORE_W + SLOT_W;   // porta de entrada do hotel (centro do lobby)
export const STREET_Z = 8.6;

export const slotCol = (i) => i % COLS;
export const slotRow = (i) => (i < COLS ? 0 : 1); // 0 = trás, 1 = frente
export const slotX0 = (i) => CORE_W + slotCol(i) * SLOT_W;

// Tempo: 1 hora de jogo = REAL_SEC_PER_HOUR segundos reais (na velocidade 1x)
export const REAL_SEC_PER_HOUR = 2.5;
export const HOURS_PER_NIGHT = 4; // uma "diária" dura 4 horas de jogo

export const TIERS = [
  { id: 0, name: 'Simples', price: 30, color: 0x4f9bd9 },
  { id: 1, name: 'Luxo',    price: 65, color: 0xa267d6, upgrade: 300 },
  { id: 2, name: 'Suíte',   price: 120, color: 0xf0b323, upgrade: 750 },
];

export const BUILDABLES = {
  room:  { name: 'Quarto Simples', cost: 150, desc: 'Um quarto básico para hospedar.', icon: 'bed' },
  snack: { name: 'Lanchonete', cost: 400, desc: 'Hóspedes compram lanches (+$). +Satisfação.', icon: 'burger', spend: [12, 22] },
  gym:   { name: 'Academia', cost: 650, desc: 'Hóspedes malham e pagam taxa. ++Satisfação.', icon: 'dumbbell', spend: [15, 25] },
  pool:  { name: 'Piscina', cost: 1100, desc: 'Atração principal! Atrai mais hóspedes.', icon: 'wave', spend: [20, 35] },
};

export const UPGRADES = {
  floor:     { name: 'Novo Andar', desc: 'Constrói mais um andar com 8 espaços.', cost: (lvl) => 600 + lvl * 500, max: MAX_FLOORS - 1, icon: 'building' },
  maid:      { name: 'Camareira', desc: 'Limpa quartos sujos automaticamente. Salário $15/dia.', cost: (lvl) => 250 + lvl * 150, max: 5, icon: 'broom' },
  reception: { name: 'Recepcionista', desc: 'Aloca hóspedes automaticamente no melhor quarto. Salário $30/dia.', cost: () => 900, max: 1, icon: 'bell' },
  decor:     { name: 'Decoração do Lobby', desc: 'Plantas e sofás: hóspedes esperam com +30% de paciência.', cost: (lvl) => 200 + lvl * 300, max: 2, icon: 'plant' },
  marketing: { name: 'Marketing', desc: 'Anúncios atraem mais hóspedes.', cost: (lvl) => 300 + lvl * 400, max: 3, icon: 'megaphone' },
  cleanfast: { name: 'Kit de Limpeza Pro', desc: 'Limpeza 40% mais rápida.', cost: () => 350, max: 1, icon: 'sparkle' },
};

export const GUEST_TYPES = [
  { id: 'backpacker', name: 'Mochileiro', want: 0, weight: 5, minRating: 0, nights: [1, 2], shirt: 0x6aa84f },
  { id: 'tourist',    name: 'Turista',    want: 0, weight: 4, minRating: 0, nights: [1, 3], shirt: 0xf08a3c },
  { id: 'business',   name: 'Executivo',  want: 1, weight: 3, minRating: 2, nights: [1, 2], shirt: 0x34507a },
  { id: 'family',     name: 'Família',    want: 1, weight: 2, minRating: 2.5, nights: [2, 3], shirt: 0xd9473b },
  { id: 'vip',        name: 'Celebridade', want: 2, weight: 1.2, minRating: 3.5, nights: [1, 3], shirt: 0xe58fb8 },
];

export const START_MONEY = 250;
export const QUEUE_MAX = 7;
export const BASE_PATIENCE = 28; // segundos reais (1x)
export const CLEAN_TIME = 4;     // segundos reais (1x)
