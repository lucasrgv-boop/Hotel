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
      { kind: 'earned', value: 6000, label: 'Ganhar $6.000' },
      { kind: 'rating', value: 3.5, label: 'Terminar com ★ 3,5' },
      { kind: 'angry', value: 20, label: 'No máximo 20 irritados' },
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
      { kind: 'earned', value: 10000, label: 'Ganhar $10.000' },
      { kind: 'rating', value: 3.8, label: 'Terminar com ★ 3,8' },
      { kind: 'guests', value: 110, label: 'Atender 110 hóspedes' },
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
      { kind: 'earned', value: 11000, label: 'Ganhar $11.000' },
      { kind: 'rating', value: 4.0, label: 'Terminar com ★ 4,0' },
      { kind: 'angry', value: 12, label: 'No máximo 12 irritados' },
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
      { kind: 'earned', value: 6000, label: 'Ganhar $6.000' },
      { kind: 'rating', value: 3.6, label: 'Terminar com ★ 3,6' },
      { kind: 'angry', value: 20, label: 'No máximo 20 irritados' },
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
      { kind: 'earned', value: 12000, label: 'Ganhar $12.000' },
      { kind: 'rating', value: 4.2, label: 'Terminar com ★ 4,2' },
      { kind: 'angry', value: 18, label: 'No máximo 18 irritados' },
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
      { kind: 'earned', value: 16000, label: 'Ganhar $16.000' },
      { kind: 'rating', value: 4.0, label: 'Terminar com ★ 4,0' },
      { kind: 'angry', value: 12, label: 'No máximo 12 irritados' },
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

// Mapa-múndi em pontos (gerado a partir do world-atlas 110m, Natural Earth, domínio público)
export const WORLD = {"W":128,"H":56,"LAT0":80,"LAT1":-60,"data":"AAAAlfn//4AOAAAACAAAAAAADUkB//+AAAADAAAAAAAAAA4LAA//gAAAEAAAACAAgIAJ4vwH/wAAABAAAAAAAAf//oOnA/wAAAAAAAAAAAAH////g8fgIAAAAAAAAAAAAf///1ODgEAAAAAAAAAAAAf///4OAYAAAAAAAAAAAAADgf/+D8AAAAAAAAAAAAAAAQB//4fAAAIAAAAAAAAAAAAAP//v8AAFAAAAAAAAAAAAAB///+AAAQAAAAAAACAAAAAf//+YAAAAAAAAAAAgAAAAD///4AAAAAAAAAAAIAAAAA///oAAAAAAAAAAADAAAAAP//wAAAAAAAAAAAAAAAAAD//4AAAAAAAAAAAAAAAAAAf/+AAAAAAAAAAAAMAAAAAD//AAAAAAAAAAAAMAAAAAAP/gAAAAAAAAAAACAAAAAAH8AAAAAAAAAAAAAAAAAAAAeBgAAAAAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAAAAAAYiAAAAAAAAAAAAAAAAAAAHYMAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAEAAAAAAAAEEAAAAAAAAAADAAAAAAAAA3wAAAAAAACAAIAAAAAAAAD/AAAAAAAAAASAAAAAAAAAf8AAAAAAAAIMAAAAAAAAAP/AAAAAAAABHEAAAAAAAAH/8AAAAAAAAJ8QAAAAAAAB//wAAAAAAADBLgAAAAAAAf//AAAAAAAAAAeAAAAAAAD//wAAAAAAAACCgAAAAAAA//4AAAAAAAAAAAAAAAAAAH/8AAAABAAAADIAAAAAAAA//AAAAAwAAAD7AQAAAAAAH/wAAAAIAAAB/wAAAAAAAB/4AAAACAAAB/+AAAAAAAAf8AAAAAgAAA//wAAAAAAAH+AAAAAAAAAP/8AAAAAAAB/gAAAAAAAAB//gAAAAAAAfwAAAAAAAAAf/wAAAAAAAP4AAAAAAAAAHD8AAAAAAAD8AAAAAAAAAAAOAAAAAAAA+AAAAAAAAAAAAACAAAAAAOAAAAAAAAAAAAYBgAAAAADgAAAAAAAAAAAAAwAAAAABwAAAAAAAAAAAAAQAAAAAAcAAAAAAACAAAAAAAAAAAAGAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="};
