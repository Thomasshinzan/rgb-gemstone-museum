import { state, RANK_DATA, saveData, loadSaveData } from './gameState.js';
import { 
  showScreen, showCustomAlert, updateShopUI, renderZukan, 
  checkNobleQuest, checkCountessQuest, updateMineMenuUI, 
  updateLongExpeditionUI, updateNobleExpeditionUI, 
  checkMineUpgradeQuest, renderWorkshop, updateWorkshopProgress, renderLab
} from './gameUI.js';
import { appraiser, startMiningProcess, renderMissions, startFusionProcess } from './gameLogic.js';

let previousScreen = null; 

// --- アプリの初期化 ---
async function startApp() {
  await appraiser.loadGemData();
  
  for (const mineKey in appraiser.gemData) {
    appraiser.gemData[mineKey].forEach(gem => {
      state.zukanData[gem.id] = { discovered: false, maxPurity: 0, bestCarat: 0, bestClarity: '-', ref: gem };
    });
  }
  
  loadSaveData(); 
  
  checkMineUpgradeQuest();
  
  if (state.shopRank >= 4) {
    state.workshopUnlocked = true;
  }
  
  updateShopUI();
  
  setInterval(() => {
    renderMissions();
    if (document.getElementById('workshop-screen').classList.contains('active')) {
      updateWorkshopProgress();
    }
  }, 1000);
  renderMissions();
}

// --- イベントリスナー設定 ---
document.getElementById('btn-expand-shop').addEventListener('click', () => {
  if (state.shopRank >= RANK_DATA.length - 1) return;
  const nextRankData = RANK_DATA[state.shopRank + 1];
  if (state.money < nextRankData.cost) {
    showCustomAlert(`資金が足りません。<br>店舗拡張には ${nextRankData.cost.toLocaleString()} G 必要です。`);
    return;
  }
  state.money -= nextRankData.cost;
  state.shopRank++;
  
  const justUnlockedFacilities = !state.workshopUnlocked && state.shopRank >= 4;
  if (state.shopRank >= 4) {
    state.workshopUnlocked = true;
  }

  updateShopUI();
  saveData();
  showCustomAlert(`✨ <b>店舗を拡張しました！</b><br><br>店舗ランクが ${state.shopRank} に上がり、「${nextRankData.name}」になりました！`);
  if (justUnlockedFacilities) {
    showCustomAlert("🔓 <b>【新施設が解放されました！】</b><br><br>店舗の拡張にあわせて、<b>工房</b>と<b>錬金術室</b>が使えるようになりました。メイン画面にボタンが追加されています。<br><br>⚒️ <b>工房</b>：鑑定した宝石をタップすると「保管」できるようになりました。保管した宝石は工房で加工すると、指輪・ネックレス・王冠になって高く売れます。<br><br>⚗️ <b>錬金術室</b>：鑑定したクズ石もタップで保管でき、錬金術室に送られます。クズ石を2個融合すると、色が混ざり合って新しい宝石が生まれることがあります。<br><br>どちらの保管も最大20個までです。", true);
  }
  checkNobleQuest();
  checkCountessQuest(); 
  checkMineUpgradeQuest(); 
});

document.getElementById('btn-dispatch').addEventListener('click', () => {
  updateMineMenuUI();
  updateLongExpeditionUI();
  if(state.shopRank >= 3) updateNobleExpeditionUI();
  document.getElementById('mine-select-overlay').style.display = 'flex';
});

document.getElementById('mine-select-close-btn').addEventListener('click', () => {
  document.getElementById('mine-select-overlay').style.display = 'none';
});

document.getElementById('custom-alert-close-btn').addEventListener('click', () => {
  document.getElementById('custom-alert-overlay').style.display = 'none';
});

document.getElementById('long-expedition-slider').addEventListener('input', updateLongExpeditionUI);
document.getElementById('noble-expedition-slider').addEventListener('input', updateNobleExpeditionUI);

document.getElementById('nav-zukan-btn').addEventListener('click', () => {
  previousScreen = document.querySelector('.screen.active');
  renderZukan();
  showScreen(document.getElementById('zukan-screen'));
});

document.getElementById('zukan-back-btn').addEventListener('click', () => {
  if (previousScreen) showScreen(previousScreen);
});

document.getElementById('nav-workshop-btn').addEventListener('click', () => {
  previousScreen = document.querySelector('.screen.active');
  renderWorkshop();
  showScreen(document.getElementById('workshop-screen'));
});

document.getElementById('workshop-back-btn').addEventListener('click', () => {
  if (previousScreen) showScreen(previousScreen);
});

document.getElementById('nav-lab-btn').addEventListener('click', () => {
  previousScreen = document.querySelector('.screen.active');
  renderLab();
  showScreen(document.getElementById('lab-screen'));
});

document.getElementById('lab-back-btn').addEventListener('click', () => {
  if (previousScreen) showScreen(previousScreen);
});

// --- 工房システムの処理 ---
document.getElementById('btn-start-craft').addEventListener('click', (e) => {
  const cost = 1000;
  if (state.money < cost) {
    showCustomAlert(`資金が足りません。<br>加工の依頼には ${cost.toLocaleString()} G 必要です。`);
    return;
  }
  
  const index = e.target.dataset.index;
  if (index === undefined) return;
  
  const gem = state.inventory[index];
  
  let jpName = gem.name;
  if (gem.name.includes('(')) {
    const parts = gem.name.split(/[()]/).map(s => s.trim()).filter(Boolean);
    const jpPart = parts.find(p => /[ぁ-んァ-ヶｱ-ﾝﾞﾟ一-龠]/.test(p));
    if (jpPart) jpName = jpPart;
    else jpName = parts[0];
  }

  const types = ["指輪", "首飾り", "宝冠"];
  const type = types[Math.floor(Math.random() * types.length)];
  const resultName = `${jpName}の${type}`;
  
  const multiplier = (Math.floor(Math.random() * 21) + 15) / 10;
  const resultPrice = Math.floor(gem.price * multiplier);
  
  state.money -= cost;
  state.inventory.splice(index, 1); 
  
  const timeSec = 60 * 60; 
  state.activeCraft = {
    endTime: Date.now() + (timeSec * 1000),
    totalSec: timeSec,
    gem: gem,
    resultName: resultName,
    resultPrice: resultPrice,
    multiplier: multiplier
  };
  
  saveData();
  updateShopUI();
  renderWorkshop(); 
});

document.getElementById('btn-collect-craft').addEventListener('click', () => {
  if (!state.activeCraft) return;
  
  const price = state.activeCraft.resultPrice;
  const name = state.activeCraft.resultName;
  state.money += price;
  state.activeCraft = null; 
  
  checkMineUpgradeQuest(); 
  
  saveData();
  updateShopUI();
  renderWorkshop();
  
  showCustomAlert(`✨ <b>宝飾品を売却しました！</b><br><br>見事な <b>${name}</b> が高値で取引され、<br><b style="color:#f4d03f; font-size:1.3rem;">${price.toLocaleString()} G</b> の資金を得ました！`);
});

document.getElementById('btn-start-fusion').addEventListener('click', () => {
  const selectedIndexes = state.labSelection || [];
  if (selectedIndexes.length !== 2) return;
  
  const indices = [...selectedIndexes].sort((a, b) => b - a);
  const gemA = state.labInventory[indices[0]];
  const gemB = state.labInventory[indices[1]];
  
  state.labInventory.splice(indices[0], 1);
  state.labInventory.splice(indices[1], 1);
  state.labSelection = []; 
  
  saveData();
  renderLab(); 
  
  startFusionProcess(gemA, gemB);
});

// --- 採掘のイベントバインディング ---
document.getElementById('btn-buy-mine').addEventListener('click', () => {
  const MINE_COST = 100000;
  if (state.money < MINE_COST) {
    showCustomAlert(`資金が足りません。<br>鉱山購入には ${MINE_COST.toLocaleString()} G 必要です。`);
    return;
  }
  state.money -= MINE_COST;
  state.ownMinePurchased = true;
  updateShopUI();
  saveData();
  updateMineMenuUI();
  showCustomAlert("✨ <b>自分の鉱山を購入しました！</b><br><br>たった5秒で素早く採掘できる専用ルートが開拓されました！");
  checkMineUpgradeQuest(); 
});

document.getElementById('btn-mine-personal').addEventListener('click', () => {
  const bonus = 1.0 + (state.employees * 0.1);
  let minGems = Math.floor(8 * bonus);
  let maxGems = Math.ceil(12 * bonus);
  let cost = 5000;
  let poolType = 'personal_lv1'; 

  if (state.ownMineUpgraded) {
    minGems *= 2;
    maxGems *= 2;
    cost = 10000;
    poolType = 'all'; 
  }

  startMiningProcess(cost, minGems, maxGems, 'personal', '自分の鉱山', 5, poolType);
});

document.getElementById('btn-mine-botayama').addEventListener('click', () => startMiningProcess(0, 3, 5, 'botayama', '廃鉱のボタ山', 5, 'botayama'));

document.getElementById('btn-mine-long').addEventListener('click', () => {
  const minutes = parseInt(document.getElementById('long-expedition-slider').value, 10);
  const cost = (minutes / 10) * 2500; 
  const baseGems = minutes * 1.5; 
  startMiningProcess(cost, Math.floor(baseGems * 0.9), Math.ceil(baseGems * 1.1), 'long', '長期遠征', minutes * 60, 'mineId1');
});

document.getElementById('btn-mine-noble').addEventListener('click', () => {
  const minutes = parseInt(document.getElementById('noble-expedition-slider').value, 10);
  const cost = (minutes / 20) * 5000;
  const baseGems = minutes * 1.2;
  startMiningProcess(cost, Math.floor(baseGems * 0.9), Math.ceil(baseGems * 1.1), 'noble', '貴族の私有鉱山', minutes * 60, 'mineId2');
});

document.getElementById('btn-mine-neighbor').addEventListener('click', () => {
  startMiningProcess(10000, 11, 50, 'neighbor', '隣国との独占取引', 60 * 60, 'all');
});

// --- リセットとセーブのイベント ---
document.getElementById('reset-data-btn').addEventListener('click', () => {
  document.getElementById('confirm-overlay').style.display = 'flex';
});

document.getElementById('confirm-no-btn').addEventListener('click', () => {
  document.getElementById('confirm-overlay').style.display = 'none';
});

document.getElementById('confirm-yes-btn').addEventListener('click', () => {
  localStorage.clear();
  state.money = 15000;
  state.shopRank = 1;
  state.employees = 0;
  state.nobleQuestState = 0;
  state.countessQuestState = 0;
  state.neighborTradeUnlocked = false; 
  state.ownMinePurchased = false;
  state.ownMineUpgraded = false;
  state.workshopUnlocked = false;
  state.activeMissions = {};
  state.activeCraft = null;
  state.inventory = []; 
  state.labInventory = []; 
  state.labSelection = []; 
  Object.values(state.zukanData).forEach(e => { e.discovered = false; e.maxPurity = 0; e.bestCarat = 0; e.bestClarity = '-'; });
  
  updateShopUI();
  renderZukan();
  renderMissions();
  document.getElementById('confirm-overlay').style.display = 'none';
});

document.getElementById('btn-export-save').addEventListener('click', () => {
  saveData();
  const saveObj = { 
    money: state.money, 
    shopRank: state.shopRank, 
    nobleQuestState: state.nobleQuestState, 
    countessQuestState: state.countessQuestState, 
    neighborTradeUnlocked: state.neighborTradeUnlocked,
    ownMinePurchased: state.ownMinePurchased, 
    ownMineUpgraded: state.ownMineUpgraded,
    workshopUnlocked: state.workshopUnlocked,
    activeMissions: state.activeMissions, 
    activeCraft: state.activeCraft,
    inventory: state.inventory, 
    labInventory: state.labInventory, 
    zukan: {} 
  };
  for (const key in state.zukanData) {
    saveObj.zukan[key] = { discovered: state.zukanData[key].discovered, maxPurity: state.zukanData[key].maxPurity, bestCarat: state.zukanData[key].bestCarat, bestClarity: state.zukanData[key].bestClarity };
  }
  document.getElementById('save-data-text').value = btoa(encodeURIComponent(JSON.stringify(saveObj)));
  document.getElementById('save-data-overlay').style.display = 'flex';
});

document.getElementById('btn-import-save').addEventListener('click', () => {
  document.getElementById('save-data-text').value = '';
  document.getElementById('save-data-overlay').style.display = 'flex';
});

document.getElementById('btn-close-save').addEventListener('click', () => {
  document.getElementById('save-data-overlay').style.display = 'none';
});

document.getElementById('btn-do-import').addEventListener('click', () => {
  try {
    const saveStr = document.getElementById('save-data-text').value.trim();
    if (!saveStr) return;
    const saveObj = JSON.parse(decodeURIComponent(atob(saveStr)));
    state.money = saveObj.money || 15000;
    state.shopRank = saveObj.shopRank || 1;
    state.nobleQuestState = saveObj.nobleQuestState || 0;
    state.countessQuestState = saveObj.countessQuestState || 0;
    state.neighborTradeUnlocked = saveObj.neighborTradeUnlocked || false;
    state.ownMinePurchased = saveObj.ownMinePurchased || false;
    state.ownMineUpgraded = saveObj.ownMineUpgraded || false;
    state.workshopUnlocked = saveObj.workshopUnlocked || false;
    state.activeMissions = saveObj.activeMissions || {};
    state.activeCraft = saveObj.activeCraft || null;
    state.inventory = saveObj.inventory || []; 
    state.labInventory = saveObj.labInventory || []; 
    state.labSelection = []; 
    if (saveObj.zukan) {
      for (const key in saveObj.zukan) {
        if (state.zukanData[key]) {
          state.zukanData[key].discovered = saveObj.zukan[key].discovered;
          state.zukanData[key].maxPurity = saveObj.zukan[key].maxPurity || 0;
          state.zukanData[key].bestCarat = saveObj.zukan[key].bestCarat || 0;
          state.zukanData[key].bestClarity = saveObj.zukan[key].bestClarity || '-';
        }
      }
    }
    saveData(); 
    updateShopUI();
    renderZukan();
    renderMissions();
    document.getElementById('save-data-overlay').style.display = 'none';
    showCustomAlert("✨ <b>セーブデータを復元しました！</b>");
  } catch(e) {
    showCustomAlert("🚨 <b>データの読み込みに失敗しました。</b><br>コピーしたテキストが欠けていないか確認してください。");
  }
});

startApp();
