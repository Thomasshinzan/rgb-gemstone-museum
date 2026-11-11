import { state, RANK_DATA, saveData, ALCHEMY_XP_TABLE, ALCHEMY_MAX_LEVEL } from './gameState.js';

export function showScreen(screenEl) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  screenEl.classList.add('active');
}

export function showCustomAlert(msg, append = false) {
  const el = document.getElementById('custom-alert-msg');
  const overlay = document.getElementById('custom-alert-overlay');
  
  if (append && overlay.style.display === 'flex') {
    el.innerHTML += `<br><br><hr style="border:1px dashed #5c4734; margin:15px 0;"><br>` + msg;
  } else {
    el.innerHTML = msg;
  }
  overlay.style.display = 'flex';
}

export function updateShopUI() {
  document.getElementById('money-display').textContent = state.money.toLocaleString();
  const currentRankData = RANK_DATA[state.shopRank];
  state.employees = currentRankData.employees;
  
  document.getElementById('status-employees').textContent = `👥 従業員: ${state.employees}`;
  document.getElementById('shop-rank-display').textContent = `店舗ランク: ${state.shopRank} (${currentRankData.name})`;
  
  const btnExpandShop = document.getElementById('btn-expand-shop');
  if (state.shopRank < RANK_DATA.length - 1) {
    const nextRankData = RANK_DATA[state.shopRank + 1];
    btnExpandShop.textContent = `🔨 店舗を拡張 (${nextRankData.cost.toLocaleString()} G)`;
    btnExpandShop.style.display = 'inline-block';
  } else {
    btnExpandShop.style.display = 'none';
  }

  const btnWorkshop = document.getElementById('nav-workshop-btn');
  const btnLab = document.getElementById('nav-lab-btn');
  if (btnWorkshop && btnLab) {
    btnWorkshop.style.display = state.workshopUnlocked ? 'block' : 'none';
    btnLab.style.display = state.workshopUnlocked ? 'block' : 'none';
  }
}

export function renderZukan() {
  const container = document.getElementById('zukan-list-container');
  container.innerHTML = '';
  
  const focusVisual = document.getElementById('zukan-focus-visual');
  const focusName = document.getElementById('zukan-focus-name');
  const focusPrice = document.getElementById('zukan-focus-price');

  focusVisual.className = 'focus-gem empty';
  focusVisual.style.backgroundColor = '';
  focusName.textContent = '宝石を選択してください';
  focusName.style.color = '#fff';
  focusPrice.textContent = '最高純度: ---%';
  focusPrice.style.color = '#55ff55';
  
  let discoveredCount = 0; 
  const totalGems = Object.keys(state.zukanData).length; 

  const groupedGems = {
    "Legendary": [],
    "Epic": [],
    "Rare": [],
    "Uncommon": [],
    "Common": []
  };

  Object.values(state.zukanData).forEach(entry => {
    const rarity = entry.ref.rarity || "Common";
    if (groupedGems[rarity]) {
      groupedGems[rarity].push(entry);
    }
    if (entry.discovered) discoveredCount++;
  });

  const rarityOrder = ["Legendary", "Epic", "Rare", "Uncommon", "Common"];
  rarityOrder.forEach(rarity => {
    const gemsInRarity = groupedGems[rarity];
    if (gemsInRarity.length === 0) return;

    const section = document.createElement('div');
    section.className = `rarity-section section-${rarity}`;

    const header = document.createElement('div');
    header.className = `rarity-header header-${rarity}`;
    const discInRarity = gemsInRarity.filter(g => g.discovered).length;
    header.textContent = `[${rarity}] ${discInRarity} / ${gemsInRarity.length}`;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'rarity-grid';

    gemsInRarity.forEach(entry => {
      const slot = document.createElement('div');
      slot.className = 'zukan-slot';
      const gem = entry.ref;
      
      if (entry.discovered) {
        const gemEl = document.createElement('div');
        gemEl.className = 'gem-visual';
        gemEl.style.backgroundColor = `rgb(${gem.r}, ${gem.g}, ${gem.b})`;
        slot.appendChild(gemEl);
      }

      slot.addEventListener('click', () => {
        if (entry.discovered) {
          focusVisual.className = 'focus-gem';
          focusVisual.style.backgroundColor = `rgb(${gem.r}, ${gem.g}, ${gem.b})`;
          const nameMatch = gem.name.match(/^(.*?)\s*\((.*)\)\s*$/);
          if (nameMatch) {
            const jpName = nameMatch[1];
            const enName = nameMatch[2];
            const jpClass = jpName.length >= 13 ? 'zukan-name-jp long' : 'zukan-name-jp';
            const enClass = enName.length >= 21 ? 'zukan-name-en long' : 'zukan-name-en';
            focusName.innerHTML = `<span class="${jpClass}">${jpName}</span><span class="${enClass}">(${enName})</span>`;
          } else {
            focusName.textContent = gem.name;
          }
          focusName.style.color = '#d4af37';
          
          let rarityColor = '#e0d5c1';
          if (gem.rarity === 'Legendary') rarityColor = '#ffaa00';
          else if (gem.rarity === 'Epic') rarityColor = '#c688ff';
          else if (gem.rarity === 'Rare') rarityColor = '#55aaff';
          else if (gem.rarity === 'Uncommon') rarityColor = '#88ff88';

          focusPrice.innerHTML = `<span style="color:${rarityColor}; margin-right:10px;">[${gem.rarity}]</span>最高純度: ${entry.maxPurity}%<br><span style="font-size:0.8rem; color:#a99a86;">${entry.bestCarat} ct / 透明度: ${entry.bestClarity}</span>`;
        } else {
          focusVisual.className = 'focus-gem empty';
          focusVisual.style.backgroundColor = '';
          focusName.textContent = '？？？';
          focusName.style.color = '#a99a86';
          focusPrice.textContent = '最高純度: ---%';
        }
      });

      grid.appendChild(slot);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });

  const progressEl = document.getElementById('zukan-progress');
  if (progressEl) {
    progressEl.textContent = `収集率: ${discoveredCount} / ${totalGems}`;
  }
}

export function checkNobleQuest() {
  let discoveredCount = Object.values(state.zukanData).filter(e => e.discovered).length;
  if (state.shopRank >= 2 && discoveredCount >= 5 && state.nobleQuestState === 0) {
    state.nobleQuestState = 1;
    saveData();
    showCustomAlert("📜 <b>【貴族からの依頼】</b><br><br>「2.00カラット以上の立派な宝石を見せてほしい」<br><br>鑑定所で該当する宝石を引き当てて、選択してみましょう！", true);
  }
}

export function checkCountessQuest() {
  if (state.shopRank >= 5 && state.nobleQuestState === 2 && state.countessQuestState === 0) {
    state.countessQuestState = 1;
    saveData();
    showCustomAlert("📜 <b>【伯爵夫人からの特注依頼】</b><br><br>「王室御用達の店の工房仕事、ぜひ見せてちょうだい。純度90%以上の宝石を使った宝飾品を所望するわ」<br><br>純度90%以上の宝石を保管して工房で加工し、完成品を受け取りましょう！報酬は隣国との独占取引権です。", true);
  }
}

export function updateLongExpeditionUI() {
  const slider = document.getElementById('long-expedition-slider');
  const minutes = parseInt(slider.value, 10);
  const cost = (minutes / 10) * 2500; 
  const baseGems = minutes * 1.5;     
  document.getElementById('long-exp-time').textContent = minutes;
  document.getElementById('long-exp-yield').textContent = `${Math.floor(baseGems * 0.9)}〜${Math.ceil(baseGems * 1.1)}`;
  document.getElementById('btn-mine-long').textContent = `遠征開始 (${cost.toLocaleString()} G)`;
}

export function updateNobleExpeditionUI() {
  const slider = document.getElementById('noble-expedition-slider');
  const minutes = parseInt(slider.value, 10);
  const cost = (minutes / 20) * 5000; 
  const baseGems = minutes * 1.2;     
  document.getElementById('noble-exp-time').textContent = minutes;
  document.getElementById('noble-exp-yield').textContent = `${Math.floor(baseGems * 0.9)}〜${Math.ceil(baseGems * 1.1)}`;
  document.getElementById('btn-mine-noble').textContent = `特別派遣 (${cost.toLocaleString()} G)`;
}

export function updateMineMenuUI() {
  const btnBuyMine = document.getElementById('btn-buy-mine');
  const btnMinePersonal = document.getElementById('btn-mine-personal');
  const btnMineLong = document.getElementById('btn-mine-long');
  const btnMineNoble = document.getElementById('btn-mine-noble');
  const btnMineBotayama = document.getElementById('btn-mine-botayama');
  const nobleMineContainer = document.getElementById('noble-mine-container');
  const neighborTradeContainer = document.getElementById('neighbor-trade-container'); 
  const btnMineNeighbor = document.getElementById('btn-mine-neighbor');               

  if (state.ownMinePurchased) {
    btnBuyMine.style.display = 'none';
    btnMinePersonal.style.display = 'block';
  } else {
    btnBuyMine.style.display = 'block';
    btnMinePersonal.style.display = 'none';
  }
  
  const personalBonus = 1.0 + (state.employees * 0.1);
  let personalMin = Math.floor(8 * personalBonus);
  let personalMax = Math.ceil(12 * personalBonus);
  let personalCost = 5000;
  let mineDesc = `5秒で素早く探索する。(${personalMin}〜${personalMax}個)`;

  if (state.ownMineUpgraded) {
    personalMin *= 2;
    personalMax *= 2;
    personalCost = 10000;
    mineDesc = `未知の鉱脈も同時に探索する。(すべての宝石に対応)<br><span style="color:#55ff55;">大漁ボーナス: ${personalMin}〜${personalMax}個</span>`;
  }

  btnMinePersonal.disabled = !!state.activeMissions['personal'];
  if (state.activeMissions['personal']) {
    btnMinePersonal.innerHTML = "👑 自分の鉱山<br><span style='font-size:0.9rem; color:#a99a86; display:block; margin-top:5px;'>採掘中 / 鑑定待ち</span>";
  } else {
    btnMinePersonal.innerHTML = `👑 自分の鉱山 (${personalCost.toLocaleString()} G)<br><span style='font-size:0.9rem; font-weight:normal; color:#e0d5c1; display:block; margin-top:5px;'>${mineDesc}</span>`;
  }

  btnMineLong.disabled = !!state.activeMissions['long'];
  if (state.activeMissions['long']) {
    btnMineLong.textContent = "🏕️ 遠征中 / 鑑定待ち";
  } else {
    updateLongExpeditionUI(); 
  }

  if (state.shopRank >= 3) {
    nobleMineContainer.style.display = 'block';
    btnMineNoble.disabled = !!state.activeMissions['noble'];
    if (state.activeMissions['noble']) {
      btnMineNoble.textContent = "🏰 特別派遣中 / 鑑定待ち";
    } else {
      updateNobleExpeditionUI();
    }
  } else {
    nobleMineContainer.style.display = 'none';
  }

  if (state.neighborTradeUnlocked) {
    neighborTradeContainer.style.display = 'block';
    btnMineNeighbor.disabled = !!state.activeMissions['neighbor'];
    if (state.activeMissions['neighbor']) {
      btnMineNeighbor.textContent = "🚢 取引進行中 / 鑑定待ち";
    } else {
      btnMineNeighbor.textContent = "取引実行 (10,000 G)";
    }
  } else {
    neighborTradeContainer.style.display = 'none';
  }

  btnMineBotayama.disabled = !!state.activeMissions['botayama'];
  if (state.activeMissions['botayama']) {
    btnMineBotayama.innerHTML = "⛏️ 廃鉱のボタ山<br><span style='font-size:0.9rem; color:#a99a86; display:block; margin-top:5px;'>採掘中 / 鑑定待ち</span>";
  } else {
    btnMineBotayama.innerHTML = "⛏️ 廃鉱のボタ山 (無料)<br><span style='font-size:0.9rem; font-weight:normal; color:#a99a86; display:block; margin-top:5px;'>クズ石ばかりだが5秒で拾える。(3〜5個)</span>";
  }
}

export function checkMineUpgradeQuest() {
  if (state.ownMinePurchased && !state.ownMineUpgraded && state.shopRank >= 4 && state.money >= 1000000) {
    state.ownMineUpgraded = true;
    saveData();
    updateMineMenuUI();
    showCustomAlert("⛏️ <b>【新鉱脈の発見！】</b><br><br>店舗の大規模な拡張と潤沢な資金による地質調査の結果、所有している鉱山の奥深くに未知の鉱脈が発見されました！<br><br>採掘費用は <b>10,000 G</b> に上がりますが、<b>すべての種類の宝石</b>が発掘できるようになり、さらに一度に採掘できる量が<b>2倍</b>になります！", true);
  }
}

export function renderWorkshop() {
  const lockedUi = document.getElementById('workshop-locked-ui');
  const activeUi = document.getElementById('workshop-active-ui');
  
  if (!state.workshopUnlocked) {
    lockedUi.style.display = 'block';
    activeUi.style.display = 'none';
    return;
  }

  lockedUi.style.display = 'none';
  activeUi.style.display = 'block';
  document.getElementById('inventory-capacity').textContent = `保管状況: ${state.inventory.length} / 20`;

  const statusContainer = document.getElementById('crafting-status-container');
  const selectContainer = document.getElementById('craft-select-container');

  if (state.activeCraft) {
    selectContainer.style.display = 'none';
    statusContainer.style.display = 'block';
    updateWorkshopProgress();
  } else {
    statusContainer.style.display = 'none';
    selectContainer.style.display = 'block';
    
    const invList = document.getElementById('craft-inventory-list');
    invList.innerHTML = '';
    
    const focusVisual = document.getElementById('craft-focus-visual');
    const focusName = document.getElementById('craft-focus-name');
    const focusDetails = document.getElementById('craft-focus-details'); 
    const focusPrice = document.getElementById('craft-focus-price');
    const btnStart = document.getElementById('btn-start-craft');

    focusVisual.className = 'focus-gem empty';
    focusVisual.style.backgroundColor = '';
    focusName.textContent = '宝石を選択してください';
    focusName.style.color = '#fff';
    focusDetails.innerHTML = '';
    focusPrice.textContent = '';
    btnStart.style.display = 'none';

    if (state.inventory.length === 0) {
      invList.innerHTML = '<p style="color: #a99a86; font-size: 0.9rem; padding: 20px;">保管庫に宝石がありません。</p>';
    } else {
      state.inventory.forEach((gem, index) => {
        const el = document.createElement('div');
        el.className = 'rough-stone gem-visual-appraised';
        el.style.backgroundColor = `rgb(${gem.r}, ${gem.g}, ${gem.b})`;
        
        el.addEventListener('click', () => {
          focusVisual.className = 'focus-gem';
          focusVisual.style.backgroundColor = `rgb(${gem.r}, ${gem.g}, ${gem.b})`;
          const nameMatch = gem.name.match(/^(.*?)\s*\((.*)\)\s*$/);
          if (nameMatch) {
            const jpName = nameMatch[1];
            const enName = nameMatch[2];
            const jpClass = jpName.length >= 13 ? 'focus-name-jp long' : 'focus-name-jp';
            const enClass = enName.length >= 21 ? 'focus-name-en long' : 'focus-name-en';
            focusName.innerHTML = `<span class="${jpClass}">${jpName}</span><span class="${enClass}">(${enName})</span>`;
          } else {
            focusName.textContent = gem.name;
          }
          focusName.style.color = '#d4af37';
          
          let rarityColor = '#e0d5c1';
          if (gem.rarity === 'Legendary') rarityColor = '#ffaa00';
          else if (gem.rarity === 'Epic') rarityColor = '#c688ff';
          else if (gem.rarity === 'Rare') rarityColor = '#55aaff';
          else if (gem.rarity === 'Uncommon') rarityColor = '#88ff88';

          focusDetails.innerHTML = `<span style="color:${rarityColor}; margin-right:10px;">[${gem.rarity}]</span>${gem.carat} ct / 透明度: ${gem.clarity} / 純度: ${gem.purity}%`;
          focusPrice.textContent = `原石価値: ${gem.price.toLocaleString()} G`;
          
          btnStart.style.display = 'inline-block';
          btnStart.dataset.index = index; 
        });
        invList.appendChild(el);
      });
    }
  }
}

export function updateWorkshopProgress() {
  if (!state.activeCraft) return;
  const now = Date.now();
  const c = state.activeCraft;
  
  const msgEl = document.getElementById('crafting-msg');
  const progContainer = document.getElementById('crafting-progress-container');
  const progBar = document.getElementById('crafting-progress');
  const timeEl = document.getElementById('crafting-time');
  const resultContainer = document.getElementById('crafting-result-container');
  
  if (now >= c.endTime) {
    msgEl.textContent = '✨ 宝飾品が完成しました！';
    progContainer.style.display = 'none';
    resultContainer.style.display = 'block';
    
    let mulColor = '#c4b5a2';
    if (c.multiplier >= 3.0) mulColor = '#ff5555';
    else if (c.multiplier >= 2.0) mulColor = '#ffaa00';

    document.getElementById('crafting-result-name').textContent = c.resultName;
    document.getElementById('crafting-result-price').innerHTML = `売却額: ${c.resultPrice.toLocaleString()} G <br><span style="font-size: 1rem; color: ${mulColor};">（価値 ${c.multiplier.toFixed(1)}倍の大成功！）</span>`;
  } else {
    msgEl.innerHTML = `職人が <b>${c.gem.name}</b> を加工中...`;
    progContainer.style.display = 'block';
    resultContainer.style.display = 'none';
    
    const leftSec = Math.ceil((c.endTime - now) / 1000);
    const mStr = String(Math.floor(leftSec / 60)).padStart(2, '0');
    const sStr = String(leftSec % 60).padStart(2, '0');
    
    progBar.max = c.totalSec;
    progBar.value = c.totalSec - leftSec;
    timeEl.textContent = `${mStr}:${sStr}`;
  }
}

export function renderLab() {
  const alchemyInfo = document.getElementById('lab-alchemy-info');
  if (alchemyInfo) {
    alchemyInfo.textContent = state.alchemyLevel >= ALCHEMY_MAX_LEVEL
      ? `⚗️ 錬金術Lv.${state.alchemyLevel}（MAX）`
      : `⚗️ 錬金術Lv.${state.alchemyLevel}　XP: ${state.alchemyXP} / ${ALCHEMY_XP_TABLE[state.alchemyLevel]}`;
    if (state.bookObtained) alchemyInfo.textContent += '　📖 錬金術書 入手済み';
  }
  const btnBuyBook = document.getElementById('btn-buy-book');
  if (btnBuyBook) {
    btnBuyBook.style.display = (state.bookDiscovered && !state.bookObtained) ? 'block' : 'none';
  }
  document.getElementById('lab-capacity').textContent = `保管状況: ${state.labInventory.length} / 20`;
  const listContainer = document.getElementById('lab-inventory-list');
  listContainer.innerHTML = '';
  
  const focusA = document.getElementById('lab-focus-a');
  const focusB = document.getElementById('lab-focus-b');
  const btnFusion = document.getElementById('btn-start-fusion');
  const selectionInfo = document.getElementById('lab-selection-info');
  
  const updateSelectionUI = () => {
    focusA.className = 'focus-gem empty'; focusA.style.backgroundColor = '';
    focusB.className = 'focus-gem empty'; focusB.style.backgroundColor = '';
    
    const sel = state.labSelection || [];
    
    if (sel.length > 0) {
      const gemA = state.labInventory[sel[0]];
      focusA.className = 'focus-gem kuzu-focus';
      focusA.style.backgroundColor = `rgb(${gemA.r}, ${gemA.g}, ${gemA.b})`;
    }
    if (sel.length > 1) {
      const gemB = state.labInventory[sel[1]];
      focusB.className = 'focus-gem kuzu-focus';
      focusB.style.backgroundColor = `rgb(${gemB.r}, ${gemB.g}, ${gemB.b})`;
    }

    if (sel.length === 2) {
      const gA = state.labInventory[sel[0]];
      const gB = state.labInventory[sel[1]];
      const avgR = Math.floor((gA.r + gB.r) / 2);
      const avgG = Math.floor((gA.g + gB.g) / 2);
      const avgB = Math.floor((gA.b + gB.b) / 2);
      selectionInfo.innerHTML = `予想RGB: (<span style="color:#ff8888">${avgR}</span>, <span style="color:#88ff88">${avgG}</span>, <span style="color:#8888ff">${avgB}</span>)`;
      btnFusion.style.display = 'inline-block';
    } else {
      selectionInfo.textContent = 'クズ石を2つ選択してください';
      btnFusion.style.display = 'none';
    }
  };

  if (!state.labSelection) state.labSelection = [];
  
  state.labSelection = state.labSelection.filter(i => i < state.labInventory.length);

  if (state.labInventory.length === 0) {
    listContainer.innerHTML = '<p style="color: #a99a86; font-size: 0.9rem; padding: 20px;">実験室にクズ石がありません。</p>';
  } else {
    state.labInventory.forEach((gem, index) => {
      const el = document.createElement('div');
      el.className = 'rough-stone kuzu-appraised';
      el.style.backgroundColor = `rgb(${gem.r}, ${gem.g}, ${gem.b})`;
      
      if (state.labSelection.includes(index)) {
        el.classList.add('gem-kept');
      }
      
      el.addEventListener('click', () => {
        if (state.labSelection.includes(index)) {
          state.labSelection = state.labSelection.filter(i => i !== index);
        } else {
          if (state.labSelection.length < 2) {
            state.labSelection.push(index);
          } else {
            state.labSelection.shift();
            state.labSelection.push(index);
          }
        }
        renderLab(); 
      });
      listContainer.appendChild(el);
    });
  }
  
  updateSelectionUI();
}
