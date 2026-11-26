// appraiser.js の全文
import { TOHO_TOLERANCE_SCALE } from './gameState.js';

export class Appraiser {
  constructor() {
    this.gemData = {};
    this.tohoGemData = [];
  }

  async loadGemData() {
    try {
      const response = await fetch('gem.json');
      this.gemData = await response.json();
    } catch (error) {
      console.error('宝石データの読み込みに失敗しました:', error);
      this.gemData = { "mineId1": [], "mineId2": [] }; 
    }
  }

  async loadTohoGemData() {
    try {
      const response = await fetch('toho_gem.json');
      this.tohoGemData = await response.json();
    } catch (error) {
      console.error('東方の宝石データの読み込みに失敗しました:', error);
      this.tohoGemData = [];
    }
  }

  // レアリティごとの許容誤差（RGB距離の tolerance）
  _tolerance(rarity) {
    switch(rarity) {
      case "Common": return 32;
      case "Uncommon": return 28;
      case "Rare": return 24;
      case "Epic": return 16;
      case "Legendary": return 8;
      default: return 20;
    }
  }

  // 宝石との距離から品質（純度・カラット・透明度・価格）を決定する。通常鑑定と共通のロジック
  _rollQuality(gem, dist, tol) {
    const maxDist = tol * Math.sqrt(3);
    let purity = Math.floor(100 - (dist / maxDist) * 50);
    if (purity > 100) purity = 100;
    if (purity < 50) purity = 50;

    const caratNum = (Math.random() * 3.0) + 0.5;
    const carat = caratNum.toFixed(2);

    const clarities = ["FL", "IF", "VVS", "VS", "SI", "I"];
    const clarityIndex = Math.floor(Math.random() * Math.random() * clarities.length);
    const clarity = clarities[clarities.length - 1 - clarityIndex];

    let qualityMultiplier = 1.0;
    if (clarity === "FL" || clarity === "IF") qualityMultiplier *= 1.5;
    else if (clarity === "SI") qualityMultiplier *= 0.8;
    else if (clarity === "I") qualityMultiplier *= 0.5;

    qualityMultiplier *= (purity / 100);

    let rarityMultiplier = 1.0;
    switch(gem.rarity) {
      case "Uncommon": rarityMultiplier = 1.5; break;
      case "Rare": rarityMultiplier = 2.0; break;
      case "Epic": rarityMultiplier = 3.0; break;
      case "Legendary": rarityMultiplier = 4.0; break;
      case "Common":
      default: rarityMultiplier = 1.0; break;
    }

    let price = Math.floor(gem.basePrice * caratNum * qualityMultiplier * rarityMultiplier);
    if (price < 10) price = 10;
    return { purity, carat, clarity, price };
  }

  // 💡 修正: 引数を poolType に一本化
  appraiseOne(poolType = 'mineId1', forceFail = false) {
    if (forceFail) {
      return this.createKuzu();
    }

    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);

    let pool = [];
    let allGems = [];
    for (const key in this.gemData) {
      allGems = allGems.concat(this.gemData[key]);
    }
    
    // 💡 追加: 提案された排出ルールの実装
    if (poolType === 'botayama') {
      // ボタ山: 全体のCommonのみ
      pool = allGems.filter(gem => gem.rarity === "Common");
    } else if (poolType === 'personal_lv1') {
      // 所有鉱山Lv1: mineId1の Common, Uncommon, Rare, Epic (Legendary以外)
      const mine1Gems = this.gemData['mineId1'] || [];
      pool = mine1Gems.filter(gem => gem.rarity !== "Legendary");
    } else if (poolType === 'mineId1') {
      // 長期遠征: mineId1全体
      pool = this.gemData['mineId1'] || [];
    } else if (poolType === 'mineId2') {
      // 貴族の鉱山: mineId2全体
      pool = this.gemData['mineId2'] || [];
    } else if (poolType === 'all') {
      // 隣国貿易・所有鉱山Lv2: gem.json全体
      pool = allGems;
    }

    if (!pool || pool.length === 0) return this.createKuzu(r, g, b);

    let matchedGems = [];
    pool.forEach(gem => {
      const tol = this._tolerance(gem.rarity);
      
      if (Math.abs(r - gem.r) <= tol && Math.abs(g - gem.g) <= tol && Math.abs(b - gem.b) <= tol) {
        const dist = Math.sqrt(Math.pow(r - gem.r, 2) + Math.pow(g - gem.g, 2) + Math.pow(b - gem.b, 2));
        matchedGems.push({ gem, dist, tol });
      }
    });

    if (matchedGems.length === 0) {
      return this.createKuzu(r, g, b);
    }

    matchedGems.sort((a, b) => a.dist - b.dist);
    const hitMatch = matchedGems[0];
    const hitGem = hitMatch.gem;
    const dist = hitMatch.dist;
    const tol = hitMatch.tol;

    const q = this._rollQuality(hitGem, dist, tol);

    return {
      isKuzu: false, id: hitGem.id, name: hitGem.name,
      r: hitGem.r, g: hitGem.g, b: hitGem.b, rarity: hitGem.rarity,
      carat: q.carat, clarity: q.clarity, purity: q.purity, price: q.price
    };
  }

  // 特定の宝石1種について、通常採掘と同じ品質決定ロジックで個体を生成する（冒険者の持ち込み用）
  // 宝石のRGBを中心に許容誤差の範囲でランダムな点を振り、その距離から品質を決める
  appraiseSpecific(gem) {
    const tol = this._tolerance(gem.rarity);
    const rollChannel = (base) => {
      const v = Math.round(base + (Math.random() * 2 - 1) * tol);
      return Math.max(0, Math.min(255, v));
    };
    const r = rollChannel(gem.r);
    const g = rollChannel(gem.g);
    const b = rollChannel(gem.b);
    const dist = Math.sqrt(Math.pow(r - gem.r, 2) + Math.pow(g - gem.g, 2) + Math.pow(b - gem.b, 2));

    const q = this._rollQuality(gem, dist, tol);

    return {
      isKuzu: false, id: gem.id, name: gem.name,
      r: gem.r, g: gem.g, b: gem.b, rarity: gem.rarity,
      carat: q.carat, clarity: q.clarity, purity: q.purity, price: q.price
    };
  }

  // 東方の宝石には鑑定額（basePrice）がないため、通常宝石のレアリティ別平均 basePrice を
  // 「通常宝石だった場合の鑑定額」の換算ベースとして使う
  _virtualBasePrice(rarity) {
    if (!this._virtualBaseCache) {
      const sums = {}, counts = {};
      for (const key in this.gemData) {
        (this.gemData[key] || []).forEach(gem => {
          sums[gem.rarity] = (sums[gem.rarity] || 0) + gem.basePrice;
          counts[gem.rarity] = (counts[gem.rarity] || 0) + 1;
        });
      }
      this._virtualBaseCache = {};
      for (const r in sums) this._virtualBaseCache[r] = Math.round(sums[r] / counts[r]);
    }
    return this._virtualBaseCache[rarity] || 1000;
  }

  // 東方の宝石1種について、東方融合と同じ品質決定ロジックで個体を生成する（冒険者の持ち込み用）
  // 純度: 許容範囲（×TOHO_TOLERANCE_SCALE）内のランダムな点との距離から決定
  // カラット: クズ石2個（0.1〜0.6ct）の融合と同じ式。透明度: 通常鑑定と同じ重み付き抽選
  // appraisal: 通常宝石だった場合の鑑定額（換算）。価格計算のベースになる
  appraiseTohoSpecific(gem) {
    const tol = this._tolerance(gem.rarity) * TOHO_TOLERANCE_SCALE;
    const rollChannel = (base) => {
      const v = Math.round(base + (Math.random() * 2 - 1) * tol);
      return Math.max(0, Math.min(255, v));
    };
    const r = rollChannel(gem.r);
    const g = rollChannel(gem.g);
    const b = rollChannel(gem.b);
    const dist = Math.sqrt(Math.pow(r - gem.r, 2) + Math.pow(g - gem.g, 2) + Math.pow(b - gem.b, 2));

    const maxDist = tol * Math.sqrt(3);
    let purity = Math.floor(100 - (dist / maxDist) * 50);
    if (purity > 100) purity = 100;
    if (purity < 50) purity = 50;

    const parentCarat = () => Math.random() * 0.5 + 0.1;
    const avgCarat = (parentCarat() + parentCarat()) / 2;
    const carat = (avgCarat * 1.5 * (1 + (Math.random() * 0.2))).toFixed(2);

    const clarities = ["FL", "IF", "VVS", "VS", "SI", "I"];
    const clarityIndex = Math.floor(Math.random() * Math.random() * clarities.length);
    const clarity = clarities[clarities.length - 1 - clarityIndex];

    const shim = { rarity: gem.rarity, basePrice: this._virtualBasePrice(gem.rarity) };
    const appraisal = this._rollQuality(shim, dist, tol).price;

    return {
      id: gem.id, name: gem.name,
      r: gem.r, g: gem.g, b: gem.b, rarity: gem.rarity, level: gem.level,
      carat, clarity, purity, appraisal
    };
  }

  createKuzu(r = null, g = null, b = null) {
    const finalR = r !== null ? r : Math.floor(Math.random() * 256);
    const finalG = g !== null ? g : Math.floor(Math.random() * 256);
    const finalB = b !== null ? b : Math.floor(Math.random() * 256);
    const avgPrice = Math.floor((finalR + finalG + finalB) / 3);

    return {
      isKuzu: true, id: null, name: "クズ石",
      r: finalR, g: finalG, b: finalB,
      carat: (Math.random() * 0.5 + 0.1).toFixed(2),
      clarity: "I", purity: Math.floor(Math.random() * 30), price: Math.max(10, avgPrice)
    };
  }
}
