export const RANK_DATA = [
  { name: "未登録", cost: 0, employees: 0 },
  { name: "粗末な木箱の並ぶ店", cost: 0, employees: 0 },
  { name: "こぢんまりとした屋台", cost: 50000, employees: 1 },
  { name: "町外れの店舗", cost: 450000, employees: 2 },
  { name: "王都の宝石商", cost: 1200000, employees: 4 },
  { name: "王室御用達の伝説店", cost: 2500000, employees: 8 }
];

export const ALCHEMY_MAX_LEVEL = 12;
// 錬金術レベル n → n+1 に必要なXP（Lv2到達で東方の錬金術書の発見イベント）
export const ALCHEMY_XP_TABLE = { 1: 150, 2: 750, 3: 850, 4: 950, 5: 1150, 6: 1300, 7: 1450, 8: 1900, 9: 2300, 10: 2700, 11: 3200 };
export const BOOK_PRICE = 5000000;
export const TOHO_TOLERANCE_SCALE = 0.75;
// 融合の演算（錬成方法）。錬金術レベルで段階解放され、手数料はモードごとに異なる。
// 融合は図鑑コンプリートの手段であり、資金稼ぎにはならない（むしろ資金が減る）設計
export const FUSION_OPS = [
  { id: 'mix',  name: '混合', unlockLevel: 1, feeNormal: 2000, feeToho: 10000, formula: '2つのRGBの平均' },
  { id: 'diff', name: '分離', unlockLevel: 3, feeNormal: 2000, feeToho: 15000, formula: '2つのRGBの差の絶対値' },
  { id: 'rss',  name: '昇華', unlockLevel: 5, feeNormal: 3500, feeToho: 20000, formula: '2つのRGBの二乗和の平方根（上限255）' },
  { id: 'sum',  name: '蒸溜', unlockLevel: 7, feeNormal: 4000, feeToho: 30000, formula: '2つのRGBの和（上限255）' },
];
export function getFusionOp(id) {
  return FUSION_OPS.find(o => o.id === id) || FUSION_OPS[0];
}
export function currentFusionFee(isToho) {
  const op = getFusionOp(state.labOp);
  return isToho ? op.feeToho : op.feeNormal;
}
export const TOHO_KUZU_UNIT_PRICE = 1000;
export const TOHO_LAB_CAP = 20;

export const state = {
  money: 15000,
  shopRank: 1,
  alchemyLevel: 1,
  alchemyXP: 0,
  bookDiscovered: false,
  bookObtained: false,
  endingSeen: false,
  labMode: 'normal',
  labOp: 'mix',
  tohoLabInventory: [],   // 東方融合用のクズ石（通常分とは完全分離）
  tohoLabSelection: [],
  tohoZukanData: {},      // 東方の宝石図録
  employees: 0,
  nobleQuestState: 0,
  countessQuestState: 0,
  neighborTradeUnlocked: false,
  ownMinePurchased: false,
  ownMineUpgraded: false,
  workshopUnlocked: false, 
  activeMissions: {},
  activeCraft: null,
  zukanData: {},
  inventory: [],       // 宝石（加工用）
  labInventory: [],    // クズ石（融合用）
  labSelection: []     // 融合のために選択中のインデックス
};

// 錬金術XPを加算し、レベルアップと書の発見を処理する。戻り値: { levelsGained: number[], bookDiscovered: boolean }
export function grantAlchemyXP(gain) {
  const events = { levelsGained: [], bookDiscovered: false };
  if (state.alchemyLevel >= ALCHEMY_MAX_LEVEL || gain <= 0) return events;
  state.alchemyXP += gain;
  while (state.alchemyLevel < ALCHEMY_MAX_LEVEL && state.alchemyXP >= ALCHEMY_XP_TABLE[state.alchemyLevel]) {
    state.alchemyXP -= ALCHEMY_XP_TABLE[state.alchemyLevel];
    state.alchemyLevel++;
    events.levelsGained.push(state.alchemyLevel);
    if (state.alchemyLevel === 2 && !state.bookDiscovered) {
      state.bookDiscovered = true;
      events.bookDiscovered = true;
    }
  }
  if (state.alchemyLevel >= ALCHEMY_MAX_LEVEL) state.alchemyXP = 0;
  return events;
}

export function saveData() {
  localStorage.setItem('rgbMiner_money', state.money.toString());
  localStorage.setItem('rgbMiner_alchemyLevel', state.alchemyLevel.toString());
  localStorage.setItem('rgbMiner_alchemyXP', state.alchemyXP.toString());
  localStorage.setItem('rgbMiner_bookDiscovered', state.bookDiscovered ? "1" : "0");
  localStorage.setItem('rgbMiner_bookObtained', state.bookObtained ? "1" : "0");
  localStorage.setItem('rgbMiner_endingSeen', state.endingSeen ? "1" : "0");
  localStorage.setItem('rgbMiner_tohoLabInventory', JSON.stringify(state.tohoLabInventory));

  const tohoZukanToSave = {};
  for (const key in state.tohoZukanData) {
    tohoZukanToSave[key] = {
      discovered: state.tohoZukanData[key].discovered,
      maxPurity: state.tohoZukanData[key].maxPurity,
      bestCarat: state.tohoZukanData[key].bestCarat,
      bestClarity: state.tohoZukanData[key].bestClarity
    };
  }
  localStorage.setItem('rgbMiner_tohoZukan', JSON.stringify(tohoZukanToSave));
  localStorage.setItem('rgbMiner_shopRank', state.shopRank.toString());
  localStorage.setItem('rgbMiner_nobleQuestState', state.nobleQuestState.toString());
  localStorage.setItem('rgbMiner_countessQuestState', state.countessQuestState.toString());
  localStorage.setItem('rgbMiner_neighborTradeUnlocked', state.neighborTradeUnlocked ? "1" : "0");
  localStorage.setItem('rgbMiner_ownMinePurchased', state.ownMinePurchased ? "1" : "0");
  localStorage.setItem('rgbMiner_ownMineUpgraded', state.ownMineUpgraded ? "1" : "0");
  localStorage.setItem('rgbMiner_workshopUnlocked', state.workshopUnlocked ? "1" : "0");
  localStorage.setItem('rgbMiner_missions', JSON.stringify(state.activeMissions));
  localStorage.setItem('rgbMiner_activeCraft', JSON.stringify(state.activeCraft));
  localStorage.setItem('rgbMiner_inventory', JSON.stringify(state.inventory)); 
  localStorage.setItem('rgbMiner_labInventory', JSON.stringify(state.labInventory));
  
  const zukanToSave = {};
  for (const key in state.zukanData) {
    zukanToSave[key] = {
      discovered: state.zukanData[key].discovered,
      maxPurity: state.zukanData[key].maxPurity,
      bestCarat: state.zukanData[key].bestCarat,
      bestClarity: state.zukanData[key].bestClarity
    };
  }
  localStorage.setItem('rgbMiner_zukan', JSON.stringify(zukanToSave));
}

export function loadSaveData() {
  const savedMoney = localStorage.getItem('rgbMiner_money');
  if (savedMoney !== null) state.money = parseInt(savedMoney, 10);

  const savedAlchemyLevel = localStorage.getItem('rgbMiner_alchemyLevel');
  if (savedAlchemyLevel !== null) state.alchemyLevel = parseInt(savedAlchemyLevel, 10);
  const savedAlchemyXP = localStorage.getItem('rgbMiner_alchemyXP');
  if (savedAlchemyXP !== null) state.alchemyXP = parseInt(savedAlchemyXP, 10);
  if (localStorage.getItem('rgbMiner_bookDiscovered') === "1") state.bookDiscovered = true;
  if (localStorage.getItem('rgbMiner_bookObtained') === "1") state.bookObtained = true;
  if (localStorage.getItem('rgbMiner_endingSeen') === "1") state.endingSeen = true;

  const savedTohoLabInventory = localStorage.getItem('rgbMiner_tohoLabInventory');
  if (savedTohoLabInventory) state.tohoLabInventory = JSON.parse(savedTohoLabInventory);

  const savedTohoZukan = localStorage.getItem('rgbMiner_tohoZukan');
  if (savedTohoZukan) {
    const parsedToho = JSON.parse(savedTohoZukan);
    for (const key in parsedToho) {
      if (state.tohoZukanData[key]) {
        state.tohoZukanData[key].discovered = parsedToho[key].discovered;
        state.tohoZukanData[key].maxPurity = parsedToho[key].maxPurity || 0;
        state.tohoZukanData[key].bestCarat = parsedToho[key].bestCarat || 0;
        state.tohoZukanData[key].bestClarity = parsedToho[key].bestClarity || '-';
      }
    }
  }

  const savedRank = localStorage.getItem('rgbMiner_shopRank');
  if (savedRank !== null) state.shopRank = parseInt(savedRank, 10);
  
  const savedQuest = localStorage.getItem('rgbMiner_nobleQuestState');
  if (savedQuest !== null) state.nobleQuestState = parseInt(savedQuest, 10);

  const savedCountess = localStorage.getItem('rgbMiner_countessQuestState');
  if (savedCountess !== null) state.countessQuestState = parseInt(savedCountess, 10);

  if (localStorage.getItem('rgbMiner_neighborTradeUnlocked') === "1") state.neighborTradeUnlocked = true;
  if (localStorage.getItem('rgbMiner_ownMinePurchased') === "1") state.ownMinePurchased = true;
  if (localStorage.getItem('rgbMiner_ownMineUpgraded') === "1") state.ownMineUpgraded = true;
  if (localStorage.getItem('rgbMiner_workshopUnlocked') === "1") state.workshopUnlocked = true;
  
  const savedMissions = localStorage.getItem('rgbMiner_missions');
  if (savedMissions) state.activeMissions = JSON.parse(savedMissions);

  const savedCraft = localStorage.getItem('rgbMiner_activeCraft');
  if (savedCraft) state.activeCraft = JSON.parse(savedCraft);

  const savedInventory = localStorage.getItem('rgbMiner_inventory'); 
  if (savedInventory) state.inventory = JSON.parse(savedInventory);

  const savedLabInventory = localStorage.getItem('rgbMiner_labInventory'); 
  if (savedLabInventory) state.labInventory = JSON.parse(savedLabInventory);
  
  const savedZukan = localStorage.getItem('rgbMiner_zukan');
  if (savedZukan) {
    const parsed = JSON.parse(savedZukan);
    for (const key in parsed) {
      if (state.zukanData[key]) {
        state.zukanData[key].discovered = parsed[key].discovered;
        state.zukanData[key].maxPurity = parsed[key].maxPurity || 0;
        state.zukanData[key].bestCarat = parsed[key].bestCarat || 0;
        state.zukanData[key].bestClarity = parsed[key].bestClarity || '-';
      }
    }
  }
}
