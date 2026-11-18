// Campanha: hotéis pelo mundo, cada um com cenário, regras, metas e festival próprios.

export const SEASON_MONTHS = 12;          // uma temporada = 12 meses (1 mês = 1 dia de jogo)
export const DAILY_MONTHS = 4;            // desafio do dia é mais curto
export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Cada meta vale 1 estrela. kind: earned (dinheiro ganho na temporada), rating (avaliação final),
// angry (no máximo N hóspedes irritados), guests (hóspedes atendidos), score (pontuação).
export const LEVELS = [
  {
    id: 'br', name: 'Hotel Copacabana', country: 'Brasil', city: 'Rio de Janeiro', flag: ['#2fb350', '#ffd34d', '#2f5fb3'],
    lon: -43.2, lat: -22.9,
    desc: 'Seu primeiro hotel, de frente para a praia. Aprenda o básico e se prepare para o Carnaval!',
    scenery: 'beach', cols: 6, maxFloors: 4, startMoney: 250,
    theme: { facade: 0xfff4e2, roof: 0xe07a3a, sign: 'HOTEL COPACABANA', signBg: '#e07a3a', signFg: '#fff3c4', sky: 1.0 },
    guests: { palette: [0x2fb350, 0xffd34d, 0x4fb6e8, 0xef7a45, 0xe58fb8, 0xffffff], hats: ['sun', 'cap', 'shades'] },
    rules: [],
    mods: {},
    festival: { name: 'Carnaval', months: [2], mult: 1.9 },
    goals: [
      { kind: 'earned', value: 10000, label: 'Ganhar $10.000' },
      { kind: 'rating', value: 3.5, label: 'Terminar com ★ 3,5' },
      { kind: 'angry', value: 10, label: 'No máximo 10 irritados' },
    ],
  },
  {
    id: 'us', name: 'Hotel Manhattan', country: 'EUA', city: 'Nova York', flag: ['#d9473b', '#ffffff', '#34507a'],
    lon: -74.0, lat: 40.7,
    desc: 'A cidade que nunca dorme: muita gente chegando e executivos com pressa.',
    scenery: 'city', cols: 6, maxFloors: 6, startMoney: 400,
    theme: { facade: 0xe9e2d6, roof: 0x5a5f68, sign: 'HOTEL MANHATTAN', signBg: '#2a2a30', signFg: '#ffd34d', sky: 0.95 },
    guests: { palette: [0x34507a, 0x2a2a30, 0xd9473b, 0x8a90a0, 0xf0b323, 0x6b3b5a], hats: ['cap', 'none', 'none'] },
    rules: ['Hóspedes 25% menos pacientes', '35% mais chegadas'],
    mods: { patience: 0.75, arrivals: 1.35, wantUp: 0.15 },
    festival: { name: 'Réveillon na Times Square', months: [12], mult: 1.8 },
    goals: [
      { kind: 'earned', value: 9000, label: 'Ganhar $9.000' },
      { kind: 'rating', value: 3.6, label: 'Terminar com ★ 3,6' },
      { kind: 'guests', value: 100, label: 'Atender 100 hóspedes' },
    ],
  },
  {
    id: 'fr', name: 'Hôtel Lumière', country: 'França', city: 'Paris', flag: ['#34507a', '#ffffff', '#d9473b'],
    lon: 2.35, lat: 48.85, mapNudge: [-0.035, -0.05],
    desc: 'Hóspedes exigentes e críticos: cada avaliação pesa o dobro. A lanchonete vira bistrô.',
    scenery: 'paris', cols: 6, maxFloors: 5, startMoney: 500,
    theme: { facade: 0xf3e8d2, roof: 0x5c6b7a, sign: 'HÔTEL LUMIÈRE', signBg: '#34507a', signFg: '#fff3c4', sky: 1.0 },
    guests: { palette: [0x34507a, 0xd9473b, 0xf6f1e6, 0x6b4f8a, 0x2a2a30, 0xc49563], hats: ['beret', 'none', 'none'] },
    rules: ['Avaliação pesa o dobro', 'Preferem Luxo e Suíte', 'Bistrô: gasto 50% maior'],
    mods: { ratingWeight: 2, wantUp: 0.4, snackSpend: 1.5 },
    facilityNames: { snack: 'Bistrô' },
    festival: { name: 'Festa Nacional', months: [7], mult: 1.7 },
    goals: [
      { kind: 'earned', value: 12000, label: 'Ganhar $12.000' },
      { kind: 'rating', value: 4.0, label: 'Terminar com ★ 4,0' },
      { kind: 'angry', value: 6, label: 'No máximo 6 irritados' },
    ],
  },
  {
    id: 'jp', name: 'Hotel Sakura', country: 'Japão', city: 'Tóquio', flag: ['#ffffff', '#d9473b', '#ffffff'],
    lon: 139.7, lat: 35.7,
    desc: 'Terreno estreito: só 4 espaços por andar, mas dá para subir alto. Quarto sujo derruba a avaliação.',
    scenery: 'tokyo', cols: 4, maxFloors: 7, startMoney: 600,
    theme: { facade: 0xf6efe6, roof: 0x3a3340, sign: 'HOTEL SAKURA', signBg: '#d9473b', signFg: '#ffffff', sky: 1.0 },
    guests: { palette: [0x2a2a30, 0xe58fb8, 0xf6f1e6, 0x4f9bd9, 0xd9473b, 0x6aa84f], hats: ['none', 'cap', 'none'] },
    rules: ['4 espaços por andar, até 7 andares', 'Quarto sujo parado reduz a avaliação'],
    mods: { dirtyPenalty: 0.012, patience: 0.9 },
    festival: { name: 'Hanami (cerejeiras)', months: [4], mult: 1.8 },
    goals: [
      { kind: 'earned', value: 9000, label: 'Ganhar $9.000' },
      { kind: 'rating', value: 3.6, label: 'Terminar com ★ 3,6' },
      { kind: 'angry', value: 10, label: 'No máximo 10 irritados' },
    ],
  },
  {
    id: 'ch', name: 'Chalé Alpino', country: 'Suíça', city: 'Zermatt', flag: ['#d9473b', '#ffffff', '#d9473b'],
    lon: 7.75, lat: 46.0, mapNudge: [0.03, 0.06],
    desc: 'Hotel de montanha: lota no inverno, esvazia no verão. A piscina vira spa aquecido.',
    scenery: 'alps', cols: 6, maxFloors: 5, startMoney: 700,
    theme: { facade: 0xf2e3cc, roof: 0x7a4a2a, sign: 'CHALÉ ALPINO', signBg: '#7a4a2a', signFg: '#fff3c4', sky: 1.05 },
    guests: { palette: [0xd9473b, 0x34507a, 0xf0b323, 0x2f8f6a, 0xffffff, 0x6b3b5a], hats: ['beanie', 'beanie', 'none'] },
    rules: ['Alta temporada no inverno, baixa no verão', 'Hóspedes ficam 1 diária a mais', 'Piscina vira Spa'],
    mods: { nightsPlus: 1, seasonal: { 1: 1.5, 2: 1.5, 12: 1.4, 6: 0.6, 7: 0.6, 8: 0.6 } },
    facilityNames: { pool: 'Spa' },
    festival: { name: 'Semana do esqui', months: [1, 2], mult: 1.5 },
    goals: [
      { kind: 'earned', value: 15000, label: 'Ganhar $15.000' },
      { kind: 'rating', value: 3.8, label: 'Terminar com ★ 3,8' },
      { kind: 'angry', value: 12, label: 'No máximo 12 irritados' },
    ],
  },
  {
    id: 'ae', name: 'Oásis Dubai', country: 'Emirados Árabes', city: 'Dubai', flag: ['#2f8f6a', '#ffffff', '#2a2a30'],
    lon: 55.3, lat: 25.2,
    desc: 'O luxo extremo: muitos VIPs, Suítes valem 50% mais e as metas são altas.',
    scenery: 'desert', cols: 6, maxFloors: 7, startMoney: 1000,
    theme: { facade: 0xf6ead2, roof: 0xd4a93a, sign: 'OÁSIS DUBAI', signBg: '#d4a93a', signFg: '#2a2a30', sky: 1.05 },
    guests: { palette: [0xffffff, 0xd4a93a, 0x2a2a30, 0x2f8f6a, 0xe58fb8, 0x34507a], hats: ['shades', 'none', 'sun'] },
    rules: ['Muitos VIPs desde o início', 'Suítes rendem 50% a mais', 'Metas altas'],
    mods: { vipBoost: true, suiteMult: 1.5, wantUp: 0.25 },
    festival: { name: 'Festival de Compras', months: [12, 1], mult: 1.7 },
    goals: [
      { kind: 'earned', value: 25000, label: 'Ganhar $25.000' },
      { kind: 'rating', value: 4.0, label: 'Terminar com ★ 4,0' },
      { kind: 'angry', value: 6, label: 'No máximo 6 irritados' },
    ],
  },
];

export const levelById = (id) => LEVELS.find((l) => l.id === id);

// Bônus permanentes da rede (comprados com estrelas)
export const PERKS = [
  { id: 'capital', name: 'Capital inicial', desc: '+$150 de dinheiro inicial por nível.', max: 3, icon: 'coin' },
  { id: 'fame', name: 'Fama da rede', desc: '+8% de chegadas por nível.', max: 3, icon: 'megaphone' },
  { id: 'patience', name: 'Atendimento acolhedor', desc: '+10% de paciência por nível.', max: 3, icon: 'heart' },
  { id: 'clean', name: 'Equipe treinada', desc: 'Limpeza 12% mais rápida por nível.', max: 3, icon: 'broom' },
  { id: 'tips', name: 'Serviço 5 estrelas', desc: '+15% de gorjetas por nível.', max: 3, icon: 'star' },
  { id: 'builder', name: 'Construtora parceira', desc: 'Obras e reformas 10% mais baratas por nível.', max: 3, icon: 'building' },
];
export const perkCost = (lvl) => lvl + 1; // 1, 2, 3 estrelas

// Contorno dos continentes (world-atlas 110m / Natural Earth, domínio público), simplificado.
// Int16 LE: [n, lon*10, lat*10, ...] por anel; a Antártida é desenhada à parte.
export const LAND_SHAPES = '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XQGyBFgBwwQ9AcMENQG9BDMBxQQqAcEEGgG7BBkBowT1AIcE5ABUBNYAUATLAEsEywBLBNYAPQTZACMExgAhBL8AQQSZAEUEhgBEBHUAHARWABsEYwALBGoAAgR6APADfgDyA4YA6QOGAOADXADnA1wA7QNKAAYENwASBA0ACwQMAPYDHADpA0EA2QNUANcDTgDcA3IAzAOpALoDnQCuA6AArwO2AJID5ACJA+QAhwPaAGYD1wBhA8oAUwPDADYDpgAjA58AHwNoAAcDUAD+AlkA3wKgANYC1gDBAtEAtALdALgC4QC1AuQAogLvAJgC/gBnAvsAPgIBATUCDwEjAgkBAwIXAfUBLQHgASwB6AEVAfYBCwH8AfgA/gEEAQQCAgEGAvAAHALxADQCCAE4AvIASwLsAFYC3wBCAsoAQQK9ACkCrAAMAqQACgKcAOcBjACzAX4AqgGYAKsBqACHAdUAgQHtAHcB8wBfARkBWgEZAV0BJwFTARQBRAErAWUB7wBjAecAcQHcAHcBugCAAbQAiQGfALEBfACrAXUAvgFoAP8BeAD+AWoA3QEqAJMB5v+IAdH/gwHF/4oBvP+IAav/lQGU/5gBbf+RAV//XAE6/2QBI/9jAQ//RgH//kkB+v5FAeX+LQHJ/hoBuP4CAa3+4gCt/sQApP62AK3+tgDD/pgA8f6PACP/dgBL/3oAcP+IAIj/iQCV/4EApP+EAKr/dwDO/1gA9f9iAB8AVQAwAEcALQA7ACsAKwA/ABsAPwDs/y8A0v80ALD/LACE/0kAbP9tAFr/egBZ/4gAUP+TAFv/oQBf/7UAVv/bAHD/BwGg/ysBnv84AaP/RgG7/1UBxf9mAer/YAEPAG4BXwB2AWYAdAFmAG8BbwBxAWoAbAFtAGUBZwBSAZgAQwGdADoBvwAvAckANgHJAEIB1wBIASEBNQE2ATwBQAE1AVIBNgFaATsBaAFaAWoBbwFbAXABRQFpAT0BbgEpAWkBFAFvAQcBfgEMAYYBBgGLAREBlAEgAZUBJAGcATcBmwFPAaQBYAGkAX8BmQGUAZoBoQGkAZ8BqgFvAcQBfgHOAXkB0gGHAdkBXgHPAV4ByQFtAccBawHDAVMBvAFNAb4BTwHCAUUBxQFQAcsBTQHNATMB0gEoAcIBIAHBARUBqgEgAZsBFAGaAQgBkgEFAZgB+QCZAe0AlwH0AJEB7wCQAeIAkwHwAHkB5wB7AeoAdgHkAHUB6ABsAeEAbAHZAHAB0wB/AcIAkwHDAKEBoACzAZUAwwGMAMABiwDIAYMAyQF7AMYBfgC5AZcApAGfAKQBnwCfAbkAkgG3AI4BqQCUAaUAjgGsAIoBqwCFAaEAfAGdAHsBoQCGAZoAkAF5AKEBaQCtAWYAtwFZALwBQQCvAR8ArwEeAKMBCACaAf3/iQEBAIMB6/9vAdT/bwHK/2cBv/9xAaf/cQGo/38Bof+DAaj/mAGi/64BsP+1Ae3/sgHy/7gB9P/MAeL/3AHT/+AB0v/nAfD/5gHt//IB9v/tAQ0A9QEQAP0BJgAEAi8AEwJRABcCWAAcAlEAKwJVADsCagBBAmcAOQJtADUCYAArAmMAIgJtABwCfQAhAo0AGgKwACUCxQAgAtUAKALTADgC2AA+AuEAQgLpADoC8QA6AvQASALqAEoC6QBQAhgBUwIjAVgCGQFdAuUAVgLVAF8C1wBpAtMAcgLXAHgC/gCLAu8AlALeAJEC1ACKAtYAhAKyAHMCqwBlArwAWQKzAE4CqABLAp8AMQKTADICjQAqAoEAKgJoAFMCVABHAkcARQI5AEoCMgBsAmkAhQKUAKYCwAC6AuYAvgL1AMYCGgHIAjkBwQIsAb4CNwG4AkEBuwKTAacCmwGcApABlwKAAZQCTAGaAlwBkwJdAYQCcgF/Am0BiAJ0AYsCjAGFApQBiAKOAY8CpQGZArgBlQK9AZwCtQGiAroBqAKzAa4CzwGqAtQBpQLIAaQCyAGeAs8BmwIZArECIQKwAhcCqgJMArECVwKrAmMCsQJYArcCXgK7Aq0CqQK0Aq4CnQK3AqECuwKbAsYCuwLaAtYC2ALYAtICzgLKAtgCwALWArIC4QKsAskClwLUApYC7wKmAukCqwLtArIC4gKzAuACuALoAsIC2wLKAu0C0QLrAtgC9QLTAvECyQL8AsgC9wLPAggD0wIvA80CJgPWAiUD4AJkA+MCXAPpAmgD7wLwA/wC/AMFAxQECQMlBAYDFwQDAy4EAgMwBP0CVwT/AnUE9gJzBPECRgTmAmoE5AJvBN0ChATiAtAE2gLRBOEC9gTgAgYF2gILBdQCBQXQAiEFxAIrBc4COwXKAncFywJvBdQCfQXYAtcF0gL6BcQCNgbFAj4GwQI9BrkCSQa2Ao4G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';
