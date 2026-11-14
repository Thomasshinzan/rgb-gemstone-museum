import { state, RANK_DATA, saveData, loadSaveData, BOOK_PRICE, TOHO_KUZU_UNIT_PRICE, TOHO_LAB_CAP, getFusionOp } from './gameState.js';
import { 
  showScreen, showCustomAlert, updateShopUI, renderZukan, 
  checkNobleQuest, checkCountessQuest, updateMineMenuUI, 
  updateLongExpeditionUI, updateNobleExpeditionUI, 
  checkMineUpgradeQuest, renderWorkshop, updateWorkshopProgress, renderLab, renderTohoZukan,
  showOpSelect, hideOpSelect, showModeSelect, hideModeSelect
} from './gameUI.js';
import { appraiser, startMiningProcess, renderMissions, startFusionProcess, startTohoFusionProcess } from './gameLogic.js';

let previousScreen = null; 

// --- アプリの初期化 ---
async function startApp() {
  await appraiser.loadGemData();
  
  for (const mineKey in appraiser.gemData) {
    appraiser.gemData[mineKey].forEach(gem => {
      state.zukanData[gem.id] = { discovered: false, maxPurity: 0, bestCarat: 0, bestClarity: '-', ref: gem };
    });
  }

  await appraiser.loadTohoGemData();
  appraiser.tohoGemData.forEach(gem => {
    state.tohoZukanData[gem.id] = { discovered: false, maxPurity: 0, bestCarat: 0, bestClarity: '-', ref: gem };
  });
  
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
  if (state.shopRank === 3) {
    showCustomAlert("⛏️ <b>【新しい採掘先が解放されました！】</b><br><br>店舗の評判が貴族社会にも届き、<b>貴族の私有鉱山</b>への立ち入りが許されました！<br><br>「鉱山へ派遣」メニューに<b>特別派遣</b>が追加されています。通常の長期遠征とは違う種類の宝石が発掘できる鉱山で、20分・5,000 Gから派遣できます。", true);
  }
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
  // 図録の「戻る」は常にスタート画面へ（東方宝石図録側と挙動を統一）
  showScreen(document.getElementById('mining-screen'));
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

// --- 錬金術室の通常 / 東方モード切替（単一ボタン＋二択ポップアップ、項目27） ---
document.getElementById('btn-lab-mode').addEventListener('click', () => {
  showModeSelect();
});

document.getElementById('mode-select-close-btn').addEventListener('click', () => {
  hideModeSelect();
});

document.getElementById('mode-select-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'mode-select-overlay') hideModeSelect();
});

// --- 融合方法の選択ポップアップ ---
document.getElementById('btn-op-select').addEventListener('click', () => {
  showOpSelect();
});

document.getElementById('op-select-close-btn').addEventListener('click', () => {
  hideOpSelect();
});

document.getElementById('op-select-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'op-select-overlay') hideOpSelect();
});

// --- 東方のクズ石の補充（東方貿易、1個 1,000 G の補充式） ---
document.getElementById('btn-buy-kuzu').addEventListener('click', () => {
  const room = TOHO_LAB_CAP - state.tohoLabInventory.length;
  if (room <= 0) {
    showCustomAlert(`東方のクズ石は満杯です（${TOHO_LAB_CAP} 個まで）。`);
    return;
  }
  const affordable = Math.floor(state.money / TOHO_KUZU_UNIT_PRICE);
  if (affordable <= 0) {
    showCustomAlert(`資金が足りません。<br>クズ石の補充には1個 <b>${TOHO_KUZU_UNIT_PRICE.toLocaleString()} G</b> が必要です（あと <b>${(TOHO_KUZU_UNIT_PRICE - state.money).toLocaleString()} G</b>）。`);
    return;
  }
  const count = Math.min(room, affordable);
  const cost = count * TOHO_KUZU_UNIT_PRICE;
  state.money -= cost;
  for (let i = 0; i < count; i++) {
    state.tohoLabInventory.push({ ...appraiser.createKuzu(), acquiredAt: Date.now() + i });
  }
  saveData();
  updateShopUI();
  renderLab();
  showCustomAlert(`🚢 <b>東方貿易の船が到着しました！</b><br><br>クズ石 <b>${count} 個</b> を補充しました（${cost.toLocaleString()} G）。<br>在庫: ${state.tohoLabInventory.length} / ${TOHO_LAB_CAP} 個`);
});

// --- 2つの図録の切り替え（入口は各図録の「戻る」行の左で対向配置） ---
document.getElementById('btn-toho-zukan-open').addEventListener('click', () => {
  renderTohoZukan();
  showScreen(document.getElementById('toho-zukan-screen'));
});

document.getElementById('btn-royal-zukan-open').addEventListener('click', () => {
  renderZukan();
  showScreen(document.getElementById('zukan-screen'));
});

document.getElementById('toho-zukan-back-btn').addEventListener('click', () => {
  // 図録の「戻る」は常にスタート画面へ（王立宝石図録側と挙動を統一）
  showScreen(document.getElementById('mining-screen'));
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
  const sourceGem = state.activeCraft.gem;
  state.money += price;
  state.activeCraft = null; 
  
  checkMineUpgradeQuest(); 
  
  saveData();
  updateShopUI();
  renderWorkshop();
  
  showCustomAlert(`✨ <b>宝飾品を売却しました！</b><br><br>見事な <b>${name}</b> が高値で取引され、<br><b style="color:#f4d03f; font-size:1.3rem;">${price.toLocaleString()} G</b> の資金を得ました！`);
  if (state.countessQuestState === 1 && sourceGem && sourceGem.purity >= 90) {
    state.countessQuestState = 2;
    state.neighborTradeUnlocked = true;
    saveData();
    showCustomAlert("✨ <b>【伯爵夫人の特注依頼 達成！】</b><br><br>完成した宝飾品は、噂を聞きつけた伯爵夫人がその場で買い上げました！<br>「素晴らしいわ！この輝きこそ私にふさわしい！」<br><br>夫人の口利きにより<b>隣国との独占取引</b>が可能になりました！", true);
  }
});

document.getElementById('btn-start-fusion').addEventListener('click', () => {
  const isToho = state.labMode === 'toho';
  const op = getFusionOp(state.labOp);
  if (state.alchemyLevel < op.unlockLevel) {
    showCustomAlert(`「${op.name}」は錬金術Lv.${op.unlockLevel}で解放されます。<br>（現在の錬金術Lv.${state.alchemyLevel}）`);
    return;
  }
  const fee = isToho ? op.feeToho : op.feeNormal;

  if (isToho) {
    const selectedIndexes = state.tohoLabSelection || [];
    if (selectedIndexes.length !== 2) return;
    if (state.money < fee) {
      showCustomAlert(`資金が足りません。<br>東方の錬成（${op.name}）には手数料 <b>${fee.toLocaleString()} G</b> が必要です（あと <b>${(fee - state.money).toLocaleString()} G</b>）。`);
      return;
    }
    
    const indices = [...selectedIndexes].sort((a, b) => b - a);
    const gemA = state.tohoLabInventory[indices[0]];
    const gemB = state.tohoLabInventory[indices[1]];
    
    state.tohoLabInventory.splice(indices[0], 1);
    state.tohoLabInventory.splice(indices[1], 1);
    state.tohoLabSelection = []; 
    state.money -= fee;
    
    saveData();
    updateShopUI();
    renderLab(); 
    
    startTohoFusionProcess(gemA, gemB, op.id);
    return;
  }

  const selectedIndexes = state.labSelection || [];
  if (selectedIndexes.length !== 2) return;
  if (state.money < fee) {
    showCustomAlert(`資金が足りません。<br>融合（${op.name}）には手数料 <b>${fee.toLocaleString()} G</b> が必要です（あと <b>${(fee - state.money).toLocaleString()} G</b>）。`);
    return;
  }
  
  const indices = [...selectedIndexes].sort((a, b) => b - a);
  const gemA = state.labInventory[indices[0]];
  const gemB = state.labInventory[indices[1]];
  
  state.labInventory.splice(indices[0], 1);
  state.labInventory.splice(indices[1], 1);
  state.labSelection = []; 
  state.money -= fee;
  
  saveData();
  updateShopUI();
  renderLab(); 
  
  startFusionProcess(gemA, gemB, op.id);
});

// --- 東方の錬金術書の購入（確認を開く入口は融合先ポップアップ内の東方融合: gameUI.openBookPurchase） ---
document.getElementById('book-confirm-no').addEventListener('click', () => {
  document.getElementById('book-confirm-overlay').style.display = 'none';
});

document.getElementById('book-confirm-yes').addEventListener('click', () => {
  document.getElementById('book-confirm-overlay').style.display = 'none';
  if (state.bookObtained || state.money < BOOK_PRICE) return;
  state.money -= BOOK_PRICE;
  state.bookObtained = true;
  updateShopUI();
  saveData();
  renderLab();
  showCustomAlert(`📖 <b>東方の錬金術書を手に入れました！</b><br><br>重い封印が解かれ、東方の宝石のレシピが姿を現しました。<br>現在の錬金術レベルで解読できるのは、バッチ${Math.min(state.alchemyLevel, 12)}までのレシピです。<br>錬金術レベルが上がれば、さらに多くのレシピを解読できるでしょう。<br><br>東方の宝石の錬成に向け、錬金術室の準備が始まります。`);
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
  state.alchemyLevel = 1;
  state.alchemyXP = 0;
  state.bookDiscovered = false;
  state.bookObtained = false;
  state.endingSeen = false;
  state.labMode = 'normal';
  state.tohoLabInventory = [];
  state.tohoLabSelection = [];
  Object.values(state.tohoZukanData).forEach(e => { e.discovered = false; e.maxPurity = 0; e.bestCarat = 0; e.bestClarity = '-'; });
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
    alchemyLevel: state.alchemyLevel,
    alchemyXP: state.alchemyXP,
    bookDiscovered: state.bookDiscovered,
    bookObtained: state.bookObtained,
    endingSeen: state.endingSeen,
    tohoLabInventory: state.tohoLabInventory,
    tohoZukan: {},
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
  for (const key in state.tohoZukanData) {
    saveObj.tohoZukan[key] = { discovered: state.tohoZukanData[key].discovered, maxPurity: state.tohoZukanData[key].maxPurity, bestCarat: state.tohoZukanData[key].bestCarat, bestClarity: state.tohoZukanData[key].bestClarity };
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
    state.alchemyLevel = saveObj.alchemyLevel || 1;
    state.alchemyXP = saveObj.alchemyXP || 0;
    state.bookDiscovered = saveObj.bookDiscovered || false;
    state.bookObtained = saveObj.bookObtained || false;
    state.endingSeen = saveObj.endingSeen || false;
    state.tohoLabInventory = saveObj.tohoLabInventory || [];
    state.tohoLabSelection = [];
    if (saveObj.tohoZukan) {
      for (const key in saveObj.tohoZukan) {
        if (state.tohoZukanData[key]) {
          state.tohoZukanData[key].discovered = saveObj.tohoZukan[key].discovered;
          state.tohoZukanData[key].maxPurity = saveObj.tohoZukan[key].maxPurity || 0;
          state.tohoZukanData[key].bestCarat = saveObj.tohoZukan[key].bestCarat || 0;
          state.tohoZukanData[key].bestClarity = saveObj.tohoZukan[key].bestClarity || '-';
        }
      }
    }
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
