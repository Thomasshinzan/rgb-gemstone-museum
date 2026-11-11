// appraiser.js の全文
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
    switch(hitGem.rarity) {
      case "Uncommon": rarityMultiplier = 1.5; break;
      case "Rare": rarityMultiplier = 2.0; break;
      case "Epic": rarityMultiplier = 3.0; break;
      case "Legendary": rarityMultiplier = 4.0; break;
      case "Common":
      default: rarityMultiplier = 1.0; break;
    }

    let finalPrice = Math.floor(hitGem.basePrice * caratNum * qualityMultiplier * rarityMultiplier);
    if (finalPrice < 10) finalPrice = 10; 

    return {
      isKuzu: false, id: hitGem.id, name: hitGem.name,
      r: hitGem.r, g: hitGem.g, b: hitGem.b, rarity: hitGem.rarity,
      carat: carat, clarity: clarity, purity: purity, price: finalPrice
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
