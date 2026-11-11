import { Appraiser } from './appraiser.js';
import { state, saveData, grantAlchemyXP, TOHO_TOLERANCE_SCALE } from './gameState.js';
import { 
  showScreen, showCustomAlert, updateShopUI, 
  checkNobleQuest, checkCountessQuest, renderLab,
  checkMineUpgradeQuest, checkEnding
} from './gameUI.js';

export const appraiser = new Appraiser();
let appraisingMissionKey = null;

export function startMiningProcess(cost, minGems, maxGems, typeKey, typeName, timeSec, poolType) {
  if (state.money < cost) {
    showCustomAlert(`資金が足りません。<br>派遣には ${cost.toLocaleString()} G 必要です。`);
    return;
  }
  state.money -= cost;
  state.activeMissions[typeKey] = {
    name: typeName,
    endTime: Date.now() + (timeSec * 1000),
    totalSec: timeSec,
    gems: Math.floor(Math.random() * (maxGems - minGems + 1)) + minGems,
    poolType: poolType
  };
  updateShopUI();
  saveData();
  document.getElementById('mine-select-overlay').style.display = 'none';
  renderMissions(); 
}

export function renderMissions() {
  const missionsUi = document.getElementById('missions-ui');
  missionsUi.innerHTML = '';
  let hasActive = Object.keys(state.activeMissions).length > 0;
  document.getElementById('dispatch-ui').style.display = hasActive ? 'none' : 'block';
  const now = Date.now();

  for (const key in state.activeMissions) {
    const m = state.activeMissions[key];
    const div = document.createElement('div');
    div.style = "background: #1a1410; border: 1px solid #4a3929; border-radius: 6px; padding: 15px; text-align: left;";
    
    if (now >= m.endTime) {
      div.innerHTML = `
        <div style="color: #55ff55; font-size: 1.1rem; margin-bottom: 8px;">✨ ${m.name}から帰還！</div>
        <div style="color: #c4b5a2; font-size: 0.95rem; margin-bottom: 12px;">未鑑定の原石: <span style="color:#fff; font-weight:bold; font-size: 1.2rem;">${m.gems}</span> 個</div>
        <button class="goto-appraisal-btn-specific" data-key="${key}" style="width: 100%; background: linear-gradient(to bottom, #2e7d32, #1b5e20); color: white; border: 1px solid #4caf50; padding: 10px; font-size: 1.1rem; cursor: pointer; border-radius: 4px; font-weight: bold;">🔍 鑑定所へ向かう</button>
      `;
    } else {
      const leftSec = Math.ceil((m.endTime - now) / 1000);
      const mStr = String(Math.floor(leftSec / 60)).padStart(2, '0');
      const sStr = String(leftSec % 60).padStart(2, '0');
      div.innerHTML = `
        <div style="color: #c4b5a2; font-size: 1.05rem; margin-bottom: 10px; display: flex; justify-content: space-between;">
          <span>⛏️ ${m.name}を探索中...</span>
          <span style="color:#f4d03f; font-family:monospace; font-size:1.2rem;">${mStr}:${sStr}</span>
        </div>
        <progress value="${m.totalSec - leftSec}" max="${m.totalSec}"></progress>
      `;
    }
    missionsUi.appendChild(div);
  }

  document.querySelectorAll('.goto-appraisal-btn-specific').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.target.getAttribute('data-key');
      appraisingMissionKey = key;
      const m = state.activeMissions[key];
      setupAppraisalRoom(m.gems, m.poolType);
      showScreen(document.getElementById('appraisal-screen'));
    });
  });
}

function setupAppraisalRoom(gemCount, poolType = 'mineId1') {
  const focusVisual = document.getElementById('focus-visual');
  const focusName = document.getElementById('focus-name');
  const focusRarity = document.getElementById('focus-rarity');
  const focusCarat = document.getElementById('focus-carat');
  const focusClarity = document.getElementById('focus-clarity'); 
  const focusPurity = document.getElementById('focus-purity');   
  const focusPrice = document.getElementById('focus-price');     
  const appraisalBottom = document.getElementById('appraisal-bottom');
  const sessionTotalDisplay = document.getElementById('session-total-display');
  
  const bulkBtn = document.getElementById('bulk-appraise-btn');
  const sellBtn = document.getElementById('sell-return-btn');

  focusVisual.className = 'focus-gem empty';
  focusVisual.style.backgroundColor = '';
  focusName.style.color = '#d4af37';
  focusName.innerHTML = `未鑑定の原石: ${gemCount}個`;
  focusRarity.textContent = '';
  focusCarat.textContent = '- ct';
  focusClarity.textContent = `透明度: -`;
  focusPurity.textContent = `純度: -%`;
  focusPrice.innerHTML = '0 G';
  focusPrice.style.color = '#fff';
  
  appraisalBottom.innerHTML = '';
  
  let currentSessionTotal = 0; 
  let revealedCount = 0; 
  let allRevealed = false;
  sessionTotalDisplay.textContent = '0';
  
  bulkBtn.style.display = 'block';
  sellBtn.disabled = true;
  sellBtn.textContent = '鑑定中...';

  const stonesData = [];

  for (let i = 0; i < gemCount; i++) {
    const roughStone = document.createElement('div');
    roughStone.className = 'rough-stone';
    
    const gemResult = appraiser.appraiseOne(poolType, false);
    const bonusMultiplier = 1.0 + (state.employees * 0.1);
    gemResult.price = Math.floor(gemResult.price * bonusMultiplier);
    
    const stoneObj = {
      el: roughStone,
      result: gemResult,
      isRevealed: false,
      isKept: false
    };
    stonesData.push(stoneObj);

    roughStone.style.backgroundColor = `rgb(${gemResult.r}, ${gemResult.g}, ${gemResult.b})`;

    roughStone.addEventListener('click', () => {
      let isNew = false;
      let isHighScore = false;

      if (!stoneObj.isRevealed) {
        stoneObj.isRevealed = true;
        revealedCount++; 
        
        currentSessionTotal += gemResult.price;
        sessionTotalDisplay.textContent = currentSessionTotal.toLocaleString();
        
        roughStone.classList.add(gemResult.isKuzu ? 'kuzu-appraised' : 'gem-visual-appraised', 'appraised');

        if (!gemResult.isKuzu && gemResult.id) {
          const zEntry = state.zukanData[gemResult.id];
          if (!zEntry.discovered) isNew = true;
          else if (gemResult.purity > zEntry.maxPurity) isHighScore = true;

          zEntry.discovered = true;
          if (gemResult.purity > zEntry.maxPurity) {
            zEntry.maxPurity = gemResult.purity;
            zEntry.bestCarat = gemResult.carat;
            zEntry.bestClarity = gemResult.clarity;
          }
          saveData(); 
          checkNobleQuest();
          checkEnding();
        }

        if (revealedCount === gemCount && !allRevealed) {
          allRevealed = true;
          bulkBtn.style.display = 'none';
          sellBtn.disabled = false;
          sellBtn.textContent = '確定して店に戻る';
        }
        
      } else if (allRevealed) {
        if (state.workshopUnlocked) {
          let canKeep = true;
          if (!stoneObj.isKept) {
            const currentKeptInSession = stonesData.filter(s => s.isKept && s.result.isKuzu === gemResult.isKuzu).length;
            const currentCount = gemResult.isKuzu ? state.labInventory.length : state.inventory.length;
            const targetName = gemResult.isKuzu ? "実験室" : "工房";
            
            if (currentCount + currentKeptInSession >= 20) {
              showCustomAlert(`📦 <b>${targetName}の空き容量が足りません！</b><br><br>${targetName}には最大20個までしか保管できません。`, false);
              canKeep = false;
            }
          }

          if (canKeep) {
            stoneObj.isKept = !stoneObj.isKept;
            if (stoneObj.isKept) {
              roughStone.classList.add('gem-kept');
              roughStone.innerHTML = '<div class="badge-keep">🔒 保管</div>';
              currentSessionTotal -= gemResult.price; 
            } else {
              roughStone.classList.remove('gem-kept');
              roughStone.innerHTML = '';
              currentSessionTotal += gemResult.price; 
            }
            sessionTotalDisplay.textContent = currentSessionTotal.toLocaleString();
          }
        }
      }
      
      focusVisual.style.backgroundColor = `rgb(${gemResult.r}, ${gemResult.g}, ${gemResult.b})`;
      focusVisual.className = gemResult.isKuzu ? 'focus-gem kuzu-focus' : 'focus-gem';
      
      if (gemResult.isKuzu) {
        focusRarity.textContent = '';
      } else {
        focusRarity.textContent = `[${gemResult.rarity}]`;
        switch(gemResult.rarity) {
          case "Legendary": focusRarity.style.color = '#ffaa00'; break;
          case "Epic": focusRarity.style.color = '#c688ff'; break;
          case "Rare": focusRarity.style.color = '#55aaff'; break;
          case "Uncommon": focusRarity.style.color = '#88ff88'; break; 
          case "Common": default: focusRarity.style.color = '#e0d5c1'; break;
        }
      }

      let badgeHtml = '';
      if (isNew) {
        badgeHtml = `<span class="badge-new">New!!</span>`;
      } else if (stoneObj.isKept) {
        let inInv = 0;
        let inSession = 0;
        if (gemResult.isKuzu) {
            inInv = state.labInventory.filter(item => item.r === gemResult.r && item.g === gemResult.g && item.b === gemResult.b).length; 
            inSession = stonesData.filter(s => s.isKept && s.result.isKuzu).length;
        } else {
            inInv = state.inventory.filter(item => item.id === gemResult.id).length;
            inSession = stonesData.filter(s => s.isKept && s.result.id === gemResult.id).length;
        }
        const totalKept = inInv + inSession;
        badgeHtml = `<span style="font-size: 0.8em; color: #a99a86; margin-left: 10px;">(保管数: ${totalKept}個)</span>`;
      }

      const nameMatch = gemResult.name.match(/^(.*?)\s*\((.*)\)\s*$/);
      let nameHtml;
      if (nameMatch) {
        const jpName = nameMatch[1];
        const enName = nameMatch[2];
        const jpClass = jpName.length >= 13 ? 'focus-name-jp long' : 'focus-name-jp';
        const enClass = enName.length >= 21 ? 'focus-name-en long' : 'focus-name-en';
        nameHtml = `<span class="${jpClass}">${jpName}</span><span class="${enClass}">(${enName})${badgeHtml}</span>`;
      } else {
        nameHtml = gemResult.name + badgeHtml;
      }

      focusName.innerHTML = nameHtml;
      focusName.style.color = gemResult.isKuzu ? '#a99a86' : '#d4af37';
      focusCarat.textContent = `${gemResult.carat} ct`;
      focusClarity.textContent = `透明度: ${gemResult.clarity}`;
      focusPurity.textContent = gemResult.isKuzu ? `純度: -` : `純度: ${gemResult.purity}%`;
      
      let priceHtml = `${gemResult.price.toLocaleString()} G`;
      if (isHighScore && !isNew) priceHtml += `<span class="badge-high">High Score!!</span>`;
      focusPrice.innerHTML = priceHtml;
      focusPrice.style.color = gemResult.isKuzu ? '#a99a86' : '#55ff55';

      if (!gemResult.isKuzu && parseFloat(gemResult.carat) >= 2.00 && state.nobleQuestState === 1) {
        state.nobleQuestState = 2; 
        state.money += 20000; 
        updateShopUI(); 
        saveData();
        showCustomAlert("✨ <b>【依頼達成！】</b><br><br>見事な2カラット超えの宝石を貴族に披露しました！<br>貴族は大満足で帰り、謝礼として <b>20,000 G</b> を受け取りました。<br><br>これにより、貴族社会でのあなたの店の評判が高まりました！", true);
        checkCountessQuest(); 
      }

    });

    appraisalBottom.appendChild(roughStone);
  }

  bulkBtn.onclick = () => {
    stonesData.forEach(stone => {
      if (!stone.isRevealed) stone.el.click();
    });
  };

  sellBtn.onclick = () => {
    if (revealedCount < gemCount) return;
    
    const keptGems = stonesData.filter(s => s.isKept);
    
    let msg = `査定総額: <b style="color:#f4d03f; font-size:1.3rem;">${currentSessionTotal.toLocaleString()} G</b><br><br>`;
    if (keptGems.length > 0) {
      const keptInv = keptGems.filter(s => !s.result.isKuzu).length;
      const keptLab = keptGems.filter(s => s.result.isKuzu).length;
      msg += `※ <b>${keptInv} 個</b> の宝石を工房へ送ります。<br>`;
      msg += `※ <b>${keptLab} 個</b> のクズ石を実験室へ送ります。<br>`;
    } else {
      msg += `※ すべて売却します。<br>`;
    }
    msg += `よろしいですか？`;
    
    document.getElementById('sell-confirm-msg').innerHTML = msg;
    document.getElementById('sell-confirm-overlay').style.display = 'flex';
  };

  document.getElementById('sell-confirm-yes').onclick = () => {
    state.money += currentSessionTotal;
    
    stonesData.filter(s => s.isKept).forEach(s => {
      if (s.result.isKuzu) {
        state.labInventory.push({ ...s.result, acquiredAt: Date.now() });
      } else {
        state.inventory.push({ ...s.result, acquiredAt: Date.now() });
      }
    });
    
    delete state.activeMissions[appraisingMissionKey];
    appraisingMissionKey = null;
    
    checkMineUpgradeQuest(); 
    
    saveData(); 
    updateShopUI();
    renderMissions();
    document.getElementById('sell-confirm-overlay').style.display = 'none';
    showScreen(document.getElementById('mining-screen'));
  };
  
  document.getElementById('sell-confirm-no').onclick = () => {
    document.getElementById('sell-confirm-overlay').style.display = 'none';
  };
}

export function startFusionProcess(gemA, gemB) {
  const overlay = document.getElementById('fusion-progress-overlay');
  overlay.style.display = 'flex';
  
  const progBar = document.getElementById('fusion-progress-bar');
  progBar.value = 0;
  progBar.max = 50; 
  
  let ticks = 0;
  const timer = setInterval(() => {
    ticks++;
    progBar.value = ticks;
    
    if (ticks >= 50) {
      clearInterval(timer);
      overlay.style.display = 'none';
      
      const avgR = Math.floor((gemA.r + gemB.r) / 2);
      const avgG = Math.floor((gemA.g + gemB.g) / 2);
      const avgB = Math.floor((gemA.b + gemB.b) / 2);
      
      let pool = [];
      for (const key in appraiser.gemData) {
        pool = pool.concat(appraiser.gemData[key]);
      }
      
      const getTolerance = (rarity) => {
        switch(rarity) {
          case "Common": return 32;
          case "Uncommon": return 28;    
          case "Rare": return 24;      
          case "Epic": return 16;      
          case "Legendary": return 8;  
          default: return 20;
        }
      };

      let matchedGems = [];
      pool.forEach(gem => {
        const tol = getTolerance(gem.rarity);
        if (Math.abs(avgR - gem.r) <= tol && Math.abs(avgG - gem.g) <= tol && Math.abs(avgB - gem.b) <= tol) {
          const dist = Math.sqrt(Math.pow(avgR - gem.r, 2) + Math.pow(avgG - gem.g, 2) + Math.pow(avgB - gem.b, 2));
          matchedGems.push({ gem, dist, tol });
        }
      });

      if (matchedGems.length > 0) {
        matchedGems.sort((a, b) => a.dist - b.dist);
        const hitMatch = matchedGems[0];
        const hitGem = hitMatch.gem;
        
        const avgCarat = (parseFloat(gemA.carat) + parseFloat(gemB.carat)) / 2;
        const newCarat = (avgCarat * (1 + (Math.random() * 0.2))).toFixed(2);
        
        const bonusMultiplier = 1.0 + (state.employees * 0.1);
        const clarities = ["FL", "IF", "VVS", "VS", "SI", "I"];
        const clarityIndex = Math.floor(Math.random() * Math.random() * clarities.length);
        const newClarity = clarities[clarities.length - 1 - clarityIndex];

        const maxDist = hitMatch.tol * Math.sqrt(3); 
        let newPurity = Math.floor(100 - (hitMatch.dist / maxDist) * 50);
        if (newPurity > 100) newPurity = 100;
        if (newPurity < 50) newPurity = 50;
        
        let qualityMultiplier = 1.0;
        if (newClarity === "FL" || newClarity === "IF") qualityMultiplier *= 1.5;
        else if (newClarity === "SI") qualityMultiplier *= 0.8;
        else if (newClarity === "I") qualityMultiplier *= 0.5;
        qualityMultiplier *= (newPurity / 100);

        let rarityMultiplier = 1.0;
        switch(hitGem.rarity) {
          case "Uncommon": rarityMultiplier = 1.5; break;
          case "Rare": rarityMultiplier = 2.0; break;
          case "Epic": rarityMultiplier = 3.0; break;
          case "Legendary": rarityMultiplier = 4.0; break;
          case "Common": default: rarityMultiplier = 1.0; break;
        }

        let newPrice = Math.floor(hitGem.basePrice * parseFloat(newCarat) * qualityMultiplier * rarityMultiplier * bonusMultiplier);
        if (newPrice < 10) newPrice = 10;
        
        const newGemData = {
          isKuzu: false, id: hitGem.id, name: hitGem.name, 
          r: hitGem.r, g: hitGem.g, b: hitGem.b, rarity: hitGem.rarity,
          carat: newCarat, clarity: newClarity, purity: newPurity, price: newPrice, acquiredAt: Date.now()
        };

        const zEntry = state.zukanData[hitGem.id];
        const prevMaxPurity = zEntry.maxPurity;
        let isNew = false;
        if (!zEntry.discovered) {
          isNew = true;
          zEntry.discovered = true;
        }
        if (newPurity > zEntry.maxPurity) {
          zEntry.maxPurity = newPurity;
          zEntry.bestCarat = newCarat;
          zEntry.bestClarity = newClarity;
        }

        // 錬金術XP: 基礎 = カラット × 純度 ÷ 2（クズ石のカラットは 0.1〜0.6 と小さいため）。
        // 新規登録 ×1 / 登録済み ×2 / 最高純度更新 ×3
        const xpMult = isNew ? 1 : (newPurity > prevMaxPurity ? 3 : 2);
        const xpGain = Math.max(1, Math.round(parseFloat(newCarat) * newPurity / 2)) * xpMult;
        const xpEvents = grantAlchemyXP(xpGain);
        
        let msg = `✨ <b>融合成功！</b><br><br>見事な <b>${hitGem.name}</b> が誕生しました！`;
        if (isNew) msg += `<span class="badge-new">New!!</span>`;
        
        let questCleared = false;
        if (parseFloat(newCarat) >= 2.00 && state.nobleQuestState === 1) {
          state.nobleQuestState = 2; 
          state.money += 20000; 
          msg += `<br><br>📜 <b>【依頼達成！】</b><br>融合で2カラット超えの宝石を生み出し、貴族から謝礼 <b>20,000 G</b> を受け取りました！`;
          questCleared = true;
        }

        const xpMultLabel = xpMult === 3 ? '（最高純度更新ボーナス ×3）' : (xpMult === 2 ? '（図鑑登録済みボーナス ×2）' : '');
        msg += `<br><br>⚗️ <b>錬金術XP +${xpGain}</b>${xpMultLabel}`;
        for (const lv of xpEvents.levelsGained) {
          msg += `<br>🎉 <b>錬金術レベルが ${lv} に上がりました！</b>`;
        }
        if (xpEvents.bookDiscovered) {
          msg += `<br><br>📖 <b>【東方由来の錬金術書の発見！】</b><br>実験を重ねるなか、錬金術室の古い棚の奥から、東方由来の錬金術書が見つかりました。<br>しかし書には封印がかけられており、手に入れるには然るべき対価が必要らしい……。`;
        }

        if (state.inventory.length < 20) {
            state.inventory.push(newGemData);
            saveData();
            if (questCleared) { updateShopUI(); checkCountessQuest(); }
            showCustomAlert(msg + `<br><br>この宝石は工房に送られました。`, true);
        } else {
            state.money += newPrice;
            saveData();
            updateShopUI();
            if (questCleared) checkCountessQuest();
            showCustomAlert(msg + `<br><br>※工房が満杯のため自動的に売却され <b style="color:#f4d03f;">${newPrice.toLocaleString()} G</b> を得ました。`, true);
        }
        
      } else {
        const newKuzu = appraiser.createKuzu(avgR, avgG, avgB);
        newKuzu.carat = ((parseFloat(gemA.carat) + parseFloat(gemB.carat)) / 2).toFixed(2);
        
        state.labInventory.push({ ...newKuzu, acquiredAt: Date.now() });
        saveData();
        showCustomAlert(`💨 <b>融合失敗...</b><br><br>どの宝石にも変化せず、新たな色の「クズ石」になりました。<br>実験室に戻しておきます。`, true);
      }
      
      renderLab();
      checkEnding();
    }
  }, 100);
}

// --- 東方の宝石の専用融合 ---
export function startTohoFusionProcess(gemA, gemB) {
  const overlay = document.getElementById('fusion-progress-overlay');
  overlay.style.display = 'flex';
  
  const progBar = document.getElementById('fusion-progress-bar');
  progBar.value = 0;
  progBar.max = 50; 
  
  let ticks = 0;
  const timer = setInterval(() => {
    ticks++;
    progBar.value = ticks;
    
    if (ticks >= 50) {
      clearInterval(timer);
      overlay.style.display = 'none';
      
      const avgR = Math.floor((gemA.r + gemB.r) / 2);
      const avgG = Math.floor((gemA.g + gemB.g) / 2);
      const avgB = Math.floor((gemA.b + gemB.b) / 2);
      
      // 解読済みバッチ（錬金術レベル以下）の色だけが錬成対象。未解放の色はクズ石判定になる
      const pool = appraiser.tohoGemData.filter(gem => gem.level <= state.alchemyLevel);
      
      // 東方の宝石は従来より発見の幅を狭くする（許容範囲 × TOHO_TOLERANCE_SCALE）
      const getTolerance = (rarity) => {
        switch(rarity) {
          case "Common": return 32 * TOHO_TOLERANCE_SCALE;
          case "Uncommon": return 28 * TOHO_TOLERANCE_SCALE;    
          case "Rare": return 24 * TOHO_TOLERANCE_SCALE;      
          case "Epic": return 16 * TOHO_TOLERANCE_SCALE;      
          case "Legendary": return 8 * TOHO_TOLERANCE_SCALE;  
          default: return 20 * TOHO_TOLERANCE_SCALE;
        }
      };

      let matchedGems = [];
      pool.forEach(gem => {
        const tol = getTolerance(gem.rarity);
        if (Math.abs(avgR - gem.r) <= tol && Math.abs(avgG - gem.g) <= tol && Math.abs(avgB - gem.b) <= tol) {
          const dist = Math.sqrt(Math.pow(avgR - gem.r, 2) + Math.pow(avgG - gem.g, 2) + Math.pow(avgB - gem.b, 2));
          matchedGems.push({ gem, dist, tol });
        }
      });

      if (matchedGems.length > 0) {
        matchedGems.sort((a, b) => a.dist - b.dist);
        // 距離が完全に同点の候補（RGB完全一致の色同士など）はランダムに選ぶ。
        // これにより同点ペアの片方だけが永遠に選ばれ続けることがなくなる
        const bestDist = matchedGems[0].dist;
        const tied = matchedGems.filter(m => m.dist === bestDist);
        const hitMatch = tied[Math.floor(Math.random() * tied.length)];
        const hitGem = hitMatch.gem;
        
        const avgCarat = (parseFloat(gemA.carat) + parseFloat(gemB.carat)) / 2;
        const newCarat = (avgCarat * (1 + (Math.random() * 0.2))).toFixed(2);
        
        const clarities = ["FL", "IF", "VVS", "VS", "SI", "I"];
        const clarityIndex = Math.floor(Math.random() * Math.random() * clarities.length);
        const newClarity = clarities[clarities.length - 1 - clarityIndex];

        const maxDist = hitMatch.tol * Math.sqrt(3); 
        let newPurity = Math.floor(100 - (hitMatch.dist / maxDist) * 50);
        if (newPurity > 100) newPurity = 100;
        if (newPurity < 50) newPurity = 50;
        
        const zEntry = state.tohoZukanData[hitGem.id];
        const prevMaxPurity = zEntry.maxPurity;
        let isNew = false;
        if (!zEntry.discovered) {
          isNew = true;
          zEntry.discovered = true;
        }
        if (newPurity > zEntry.maxPurity) {
          zEntry.maxPurity = newPurity;
          zEntry.bestCarat = newCarat;
          zEntry.bestClarity = newClarity;
        }

        // 錬金術XP（通常融合と同じ式・倍率）
        const xpMult = isNew ? 1 : (newPurity > prevMaxPurity ? 3 : 2);
        const xpGain = Math.max(1, Math.round(parseFloat(newCarat) * newPurity / 2)) * xpMult;
        const xpEvents = grantAlchemyXP(xpGain);
        
        let msg = `✨ <b>錬成成功！</b><br><br>見事な <b>${hitGem.name}</b> が誕生しました！`;
        if (isNew) msg += `<span class="badge-new">New!!</span>`;
        msg += `<br><br>完成した宝石は、色図鑑（別冊）に登録され、<b>王家に献上されました</b>。`;
        const xpMultLabel = xpMult === 3 ? '（最高純度更新ボーナス ×3）' : (xpMult === 2 ? '（図鑑登録済みボーナス ×2）' : '');
        msg += `<br><br>⚗️ <b>錬金術XP +${xpGain}</b>${xpMultLabel}`;
        for (const lv of xpEvents.levelsGained) {
          msg += `<br>🎉 <b>錬金術レベルが ${lv} に上がりました！</b><br>東方の錬金術書のバッチ${lv}が解読できるようになりました。`;
        }
        
        saveData();
        showCustomAlert(msg, true);
      } else {
        const newKuzu = appraiser.createKuzu(avgR, avgG, avgB);
        newKuzu.carat = ((parseFloat(gemA.carat) + parseFloat(gemB.carat)) / 2).toFixed(2);
        
        state.tohoLabInventory.push({ ...newKuzu, acquiredAt: Date.now() });
        saveData();
        showCustomAlert(`💨 <b>錬成失敗...</b><br><br>どの色にも変化せず、新たな色の「クズ石」になりました。<br>東方の在庫に戻しておきます。`, true);
      }
      
      renderLab();
      checkEnding();
    }
  }, 100);
}
