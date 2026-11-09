export const RANK_DATA = [
  { name: "未登録", cost: 0, employees: 0 },
  { name: "粗末な木箱の並ぶ店", cost: 0, employees: 0 },
  { name: "こぢんまりとした屋台", cost: 50000, employees: 1 },
  { name: "町外れの店舗", cost: 450000, employees: 2 },
  { name: "王都の宝石商", cost: 1200000, employees: 4 },
  { name: "王室御用達の伝説店", cost: 2500000, employees: 8 }
];

export const state = {
  money: 15000,
  shopRank: 1,
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

export function saveData() {
  localStorage.setItem('rgbMiner_money', state.money.toString());
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
