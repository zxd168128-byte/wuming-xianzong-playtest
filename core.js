(function (root) {
  const DATA = root.SectData || (typeof require !== "undefined" ? require("./data.js") : null);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const findDisciple = (id) => DATA.disciples.find((d) => d.id === id);
  const todayKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

  function createInitialState(now = Date.now()) {
    const startingCultivation = { "fang-yan": 16, "gu-nian": 9, "su-wan": 12 };
    const roster = {};
    DATA.disciples.forEach((d) => {
      roster[d.id] = { owned: ["fang-yan", "gu-nian", "su-wan"].includes(d.id), realmIndex: 0, cultivation: startingCultivation[d.id] || 0, skillLevel: 1, copies: 0, stars: 0 };
    });
    return {
      version: DATA.version, day: 1, sectName: "无名山门", sectLevel: 1,
      resources: { stone: 420, wood: 210, herbs: 150, food: 180, seals: 10, jade: 1600, fateSeals: 0, fateDust: 0, renown: 0, debt: 600 },
      buildings: Object.fromEntries(DATA.buildings.map((b) => [b.id, 1])), roster,
      assignments: { vein: "fang-yan", field: null, garden: "gu-nian", forest: null, alchemy: "su-wan" },
      formationCollection: Object.fromEntries(DATA.formations.map((f) => [f.id, { owned: !!f.free, rank: 0, copies: 0 }])),
      party: ["fang-yan", "gu-nian", "su-wan"], formationId: "starter", pity: 0, urPity: 0, limitedPity: 0, featuredGuaranteed: false,
      expeditionProgress: 0, currentCycle: 1, cleared: [], expeditionWins: 0,
      lastFreeRecruitKey: null, lastClaimAt: now - 12 * 60 * 1000,
      quickHarvest: { key: todayKey(now), count: 0 }, purchases: {}, monthlyDays: 0, lastMonthlyClaimKey: null, firstPurchaseClaimed: false,
      tutorial: { step: 0, complete: false },
      log: ["你接过残破掌门印，无名山门尚欠青石坊六百灵石。"]
    };
  }

  function sanitizeState(raw) {
    if (!raw || !raw.resources || !raw.roster) return createInitialState();
    if (raw.version === "0.4.0") {
      Object.values(raw.roster).forEach((progress) => {
        const oldIndex = progress.realmIndex || 0;
        if (oldIndex >= 14 && oldIndex < 46) {
          const oldOffset = oldIndex - 14, majorIndex = Math.floor(oldOffset / 4), phaseIndex = oldOffset % 4;
          progress.realmIndex = 14 + majorIndex * 20 + phaseIndex * 5;
          progress.cultivation = 0;
        } else if (oldIndex >= 46) progress.realmIndex = DATA.realms.length - 1;
      });
      raw.version = DATA.version;
    }
    if (raw.version !== DATA.version) return createInitialState();
    const state = createInitialState(raw.lastClaimAt || Date.now());
    Object.assign(state, clone(raw));
    state.resources.jade = state.resources.jade || 0;
    state.resources.fateSeals = state.resources.fateSeals || 0;
    state.resources.fateDust = state.resources.fateDust || 0;
    return state;
  }

  const tutorialRewards = [
    { stone: 60, herbs: 20 },
    { seals: 1, food: 30 },
    { fateSeals: 1, wood: 60 },
    { stone: 100, herbs: 35 },
    { jade: 320, seals: 2 }
  ];
  function tutorialEvent(state, event) {
    if (!state.tutorial || state.tutorial.complete) return;
    const expected = ["claim", "train", "recruit", "star", "battle"][state.tutorial.step];
    if (event !== expected) return;
    const reward = tutorialRewards[state.tutorial.step];
    Object.entries(reward).forEach(([key, value]) => { state.resources[key] = (state.resources[key] || 0) + value; });
    state.tutorial.step += 1;
    state.tutorial.complete = state.tutorial.step >= tutorialRewards.length;
    state.log.unshift(state.tutorial.complete ? "掌门入门课业完成，山门诸事已可自行决断。" : `掌门指引完成一环，领取了入门物资。`);
  }

  function realmInfo(progress) {
    const index = Math.max(0, Math.min(DATA.realms.length - 1, progress.realmIndex || 0));
    return DATA.realms[index];
  }
  function nextRealmInfo(progress) { return DATA.realms[Math.min(DATA.realms.length - 1, (progress.realmIndex || 0) + 1)]; }
  function advancementCost(progress) {
    const current = realmInfo(progress), next = nextRealmInfo(progress);
    const major = current.major !== next.major;
    const phase = !major && current.phase && current.phase !== next.phase;
    if (major) {
      const tier = Math.max(1, Math.floor((progress.realmIndex + 1) / 20));
      return { stone: 320 + tier * 180, herbs: 150 + tier * 75, food: 80 + tier * 35, wood: 45 + tier * 22, major: true, phase: false };
    }
    if (phase) {
      const tier = Math.max(1, Math.floor((progress.realmIndex + 1) / 10));
      return { stone: 100 + tier * 45, herbs: 48 + tier * 22, food: 32 + tier * 14, wood: 18 + tier * 8, major: false, phase: true };
    }
    return { stone: 20 + Math.round(progress.realmIndex * 3.2), herbs: 9 + Math.round(progress.realmIndex * 1.5), food: 7 + Math.floor(progress.realmIndex / 2), wood: Math.floor(progress.realmIndex / 4), major: false, phase: false };
  }

  function buildingCost(id, level) {
    const b = DATA.buildings.find((item) => item.id === id), factor = Math.pow(1.65, Math.max(0, level - 1));
    return Object.fromEntries(Object.entries(b.baseCost).map(([key, value]) => [key, Math.round(value * factor)]));
  }
  function upgradeBuilding(source, id) {
    const state = clone(source), level = state.buildings[id];
    if (!level || level >= 4) return { ok: false, state, message: "当前版本建筑最高四级。" };
    const cost = buildingCost(id, level);
    const missing = Object.entries(cost).filter(([key, value]) => state.resources[key] < value);
    if (missing.length) return { ok: false, state, message: `资源不足：${missing.map(([key, value]) => `${key}:${value - state.resources[key]}`).join("、")}`, missing: Object.fromEntries(missing.map(([key, value]) => [key, value - state.resources[key]])) };
    Object.entries(cost).forEach(([key, value]) => { state.resources[key] -= value; }); state.buildings[id] += 1;
    state.log.unshift(`${DATA.buildings.find((b) => b.id === id).name}升至${state.buildings[id]}级。`);
    return { ok: true, state, message: "建筑升级完成。" };
  }
  function canUpgradeSect(state) { return state.sectLevel === 1 && Object.values(state.buildings).filter((level) => level >= 2).length >= 3 && state.resources.renown >= 80; }
  function upgradeSect(source) {
    const state = clone(source);
    if (!canUpgradeSect(state)) return { ok: false, state, message: "需要三座二级建筑与80声望。" };
    state.sectLevel = 2; state.sectName = "青崖门"; state.resources.renown -= 80;
    state.log.unshift("山门重立，众人终于有了正式宗号：青崖门。");
    return { ok: true, state, message: "宗门升至二级。" };
  }
  function repayDebt(source, amount = 100) {
    const state = clone(source), payment = Math.min(amount, state.resources.debt);
    if (payment <= 0) return { ok: false, state, message: "山门债务已经还清。" };
    if (state.resources.stone < payment) return { ok: false, state, message: `需要${payment}灵石。` };
    state.resources.stone -= payment; state.resources.debt -= payment; state.resources.renown += 8;
    state.log.unshift(`偿还青石坊${payment}灵石，山门声誉稍有恢复。`);
    return { ok: true, state, message: `已偿还${payment}灵石。` };
  }
  function assignmentBonus(state, buildingId) {
    const building = DATA.buildings.find((b) => b.id === buildingId), id = state.assignments && state.assignments[buildingId];
    if (!building || !id || !state.roster[id]?.owned) return 0;
    return building.preferred.includes(findDisciple(id).profession) ? 0.22 : 0.08;
  }
  function assignDisciple(source, buildingId, discipleId) {
    const state = clone(source), building = DATA.buildings.find((b) => b.id === buildingId), progress = state.roster[discipleId];
    if (!building || !progress?.owned) return { ok: false, state, message: "该弟子无法任职。" };
    Object.keys(state.assignments).forEach((id) => { if (state.assignments[id] === discipleId) state.assignments[id] = null; });
    state.assignments[buildingId] = discipleId;
    const matched = building.preferred.includes(findDisciple(discipleId).profession);
    state.log.unshift(`${findDisciple(discipleId).name}出任${building.name}管事。`);
    return { ok: true, state, message: matched ? "专长匹配，离线产出提高22%。" : "任职成功，离线产出提高8%。" };
  }
  const baseHourlyRates = { stone: 36, food: 42, herbs: 30, wood: 34 };
  function hourlyProduction(state) {
    const gains = {};
    DATA.buildings.filter((b) => b.resource).forEach((building) => {
      gains[building.resource] = Math.round(baseHourlyRates[building.resource] * state.buildings[building.id] * (1 + assignmentBonus(state, building.id)));
    });
    return gains;
  }
  function claimIdle(source, now = Date.now()) {
    const state = clone(source), cap = state.monthlyDays > 0 ? 720 : 480, elapsedMinutes = Math.max(1, Math.min(cap, Math.floor((now - state.lastClaimAt) / 60000)));
    if (elapsedMinutes < 2) return { ok: false, state, message: "灵息尚未积聚。", gains: {} };
    const hourly = hourlyProduction(state), gains = Object.fromEntries(Object.entries(hourly).map(([key, value]) => [key, Math.max(1, Math.floor(value * elapsedMinutes / 60))]));
    Object.entries(gains).forEach(([key, value]) => { state.resources[key] += value; });
    state.lastClaimAt = now; state.day += 1; state.log.unshift(`收取${elapsedMinutes}分钟灵息收益。`); tutorialEvent(state, "claim");
    return { ok: true, state, message: "灵息收益已收取。", gains };
  }
  function quickHarvest(source, now = Date.now()) {
    const state = clone(source), key = todayKey(now), prices = [0, 30, 50, 80, 120];
    if (!state.quickHarvest || state.quickHarvest.key !== key) state.quickHarvest = { key, count: 0 };
    if (state.quickHarvest.count >= prices.length) return { ok: false, state, message: "今日快速收获次数已用完。" };
    const price = prices[state.quickHarvest.count];
    if (state.resources.jade < price) return { ok: false, state, message: `需要${price}灵玉。` };
    state.resources.jade -= price;
    const gains = Object.fromEntries(Object.entries(hourlyProduction(state)).map(([resource, value]) => [resource, value * 2]));
    Object.entries(gains).forEach(([resource, value]) => { state.resources[resource] += value; });
    state.quickHarvest.count += 1;
    return { ok: true, state, message: `${price ? `消耗${price}灵玉，` : "免费"}获得2小时宗门产量。`, gains, nextPrice: prices[state.quickHarvest.count] };
  }
  function buyResourceChoice(source, resource, hours = 6) {
    const state = clone(source);
    if (!["stone", "wood", "food", "herbs"].includes(resource)) return { ok: false, state, message: "资源类型错误。" };
    const cost = 80;
    if (state.resources.jade < cost) return { ok: false, state, message: "需要80灵玉。" };
    const amount = hourlyProduction(state)[resource] * hours;
    state.resources.jade -= cost; state.resources[resource] += amount;
    return { ok: true, state, message: `获得${hours}小时定向产量：${amount}。`, amount };
  }
  function finishBuildingWithJade(source, id) {
    const state = clone(source), level = state.buildings[id];
    if (!level || level >= 4) return { ok: false, state, message: "建筑无法继续升级。" };
    const cost = buildingCost(id, level), missing = Object.fromEntries(Object.entries(cost).map(([key, value]) => [key, Math.max(0, value - state.resources[key])]).filter(([, value]) => value > 0));
    if (!Object.keys(missing).length) return upgradeBuilding(state, id);
    const jadeCost = Math.max(10, Math.ceil(Object.values(missing).reduce((a, b) => a + b, 0) / 12));
    if (state.resources.jade < jadeCost) return { ok: false, state, message: `补齐本次缺口需要${jadeCost}灵玉。`, jadeCost };
    state.resources.jade -= jadeCost;
    Object.entries(missing).forEach(([key, value]) => { state.resources[key] += value; });
    const result = upgradeBuilding(state, id); result.message = `补齐缺口并完成升级，共消耗${jadeCost}灵玉。`; result.jadeCost = jadeCost;
    return result;
  }

  function trainingCost(progress) {
    const index = progress.realmIndex || 0, tier = index < 14 ? Math.floor(index / 4) : 4 + Math.floor((index - 14) / 5);
    return { food: 9 + tier * 4, herbs: 5 + tier * 3, stone: 5 + tier * 3 };
  }
  function trainDisciple(source, id, rng = Math.random) {
    const state = clone(source), progress = state.roster[id];
    if (!progress || !progress.owned) return { ok: false, state, message: "弟子尚未入门。" };
    if (progress.realmIndex >= DATA.realms.length - 1) return { ok: false, state, message: "此人已至此界尽头。" };
    const realm = realmInfo(progress);
    if (progress.cultivation >= realm.exp) return { ok: false, state, message: "修为已满，需要突破当前小境界。", ready: true };
    const cost = trainingCost(progress);
    if (Object.entries(cost).some(([key, value]) => state.resources[key] < value)) return { ok: false, state, message: `需要${cost.food}灵粮、${cost.herbs}灵药、${cost.stone}灵石。` };
    Object.entries(cost).forEach(([key, value]) => { state.resources[key] -= value; });
    const gain = Math.round((8 + state.buildings.alchemy * 2 + Math.floor(rng() * 4)) * (1 + assignmentBonus(state, "alchemy")));
    progress.cultivation = Math.min(realm.exp, progress.cultivation + gain);
    state.log.unshift(`${findDisciple(id).name}闭关修炼，修为增加${gain}。`); tutorialEvent(state, "train");
    return { ok: true, state, message: `修为增加${gain}。`, gain, ready: progress.cultivation >= realm.exp };
  }
  function advanceRealm(source, id) {
    const state = clone(source), progress = state.roster[id];
    if (!progress || !progress.owned) return { ok: false, state, message: "弟子尚未入门。" };
    const current = realmInfo(progress);
    if (progress.cultivation < current.exp) return { ok: false, state, message: "修为尚未圆满。" };
    if (progress.realmIndex >= DATA.realms.length - 1) return { ok: false, state, message: "已无更高境界。" };
    const cost = advancementCost(progress);
    const resourceCost = Object.entries(cost).filter(([key]) => ["stone", "wood", "herbs", "food"].includes(key));
    if (resourceCost.some(([key, value]) => state.resources[key] < value)) return { ok: false, state, message: "突破所需四项资源尚未齐备。" };
    resourceCost.forEach(([key, value]) => { state.resources[key] -= value; });
    progress.realmIndex += 1; progress.cultivation = 0;
    const next = realmInfo(progress);
    if (cost.major) state.resources.renown += 35 + progress.realmIndex * 2;
    state.log.unshift(`${findDisciple(id).name}突破至${next.name}${cost.major ? "，引动山门天象" : ""}。`);
    return { ok: true, state, message: `突破至${next.name}。`, major: cost.major, phase: cost.phase, disciple: findDisciple(id), realm: next };
  }
  function upgradeSkill(source, id) {
    const state = clone(source), progress = state.roster[id];
    if (!progress || !progress.owned) return { ok: false, state, message: "弟子尚未入门。" };
    if (progress.skillLevel >= 5) return { ok: false, state, message: "绝技已经研习至五重。" };
    const cost = { stone: progress.skillLevel * 18, herbs: progress.skillLevel * 5, food: progress.skillLevel * 3 };
    if (Object.entries(cost).some(([key, value]) => state.resources[key] < value)) return { ok: false, state, message: `需要${cost.stone}灵石、${cost.herbs}灵药、${cost.food}灵粮。` };
    Object.entries(cost).forEach(([key, value]) => { state.resources[key] -= value; }); progress.skillLevel += 1;
    state.log.unshift(`${findDisciple(id).name}将${findDisciple(id).skill}研习至${progress.skillLevel}重。`);
    return { ok: true, state, message: `绝技升至${progress.skillLevel}重。` };
  }
  function ascendStar(source, id) {
    const state = clone(source), progress = state.roster[id];
    if (!progress?.owned) return { ok: false, state, message: "弟子尚未入门。" };
    if (progress.stars >= 5) return { ok: false, state, message: "五重命印已经圆满。" };
    if (progress.copies > 0) progress.copies -= 1;
    else if (state.resources.fateSeals > 0) state.resources.fateSeals -= 1;
    else return { ok: false, state, message: "需要该弟子的本命印，或通用天命印。" };
    progress.stars += 1; tutorialEvent(state, "star");
    if (progress.stars === 5 && progress.copies > 0) { const dust = progress.copies * ({ SR: 10, SSR: 40, UR: 100 }[findDisciple(id).rarity] || 5); state.resources.fateDust += dust; progress.copies = 0; }
    state.log.unshift(`${findDisciple(id).name}点亮第${progress.stars}阶命星：${findDisciple(id).starNodes[progress.stars - 1]}。`);
    return { ok: true, state, message: `命印升至${progress.stars}/5。`, node: findDisciple(id).starNodes[progress.stars - 1] };
  }

  function pickRarity(roll, guaranteedUr = false) {
    if (guaranteedUr || roll < DATA.rarityRates.UR) return "UR";
    if (roll < DATA.rarityRates.UR + DATA.rarityRates.SSR) return "SSR";
    return "SR";
  }
  const dustValue = { SR: 10, SSR: 40, UR: 100 };
  function grantDisciple(state, disciple) {
    const progress = state.roster[disciple.id], copy = progress.owned;
    progress.owned = true;
    let overflowDust = 0;
    if (copy) {
      if (progress.stars >= 5) { overflowDust = dustValue[disciple.rarity] || 5; state.resources.fateDust += overflowDust; }
      else progress.copies += 1;
    }
    return { ...disciple, copy, overflowDust };
  }
  function drawOne(state, rarity, rng) {
    const pool = DATA.disciples.filter((d) => d.rarity === rarity);
    const disciple = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    return grantDisciple(state, disciple);
  }
  function drawLimitedOne(state, rarity, rng) {
    if (rarity !== "UR") return drawOne(state, rarity, rng);
    let disciple;
    if (state.featuredGuaranteed || rng() < 0.5) disciple = findDisciple(DATA.banner.featured);
    else {
      const pool = DATA.disciples.filter((d) => d.rarity === "UR" && d.id !== DATA.banner.featured);
      disciple = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    }
    state.featuredGuaranteed = disciple.id !== DATA.banner.featured;
    state.limitedPity = 0;
    return { ...grantDisciple(state, disciple), featured: disciple.id === DATA.banner.featured };
  }
  function recruit(source, count, rng = Math.random) {
    const state = clone(source);
    if (![1, 10].includes(count)) return { ok: false, state, message: "只可使用一枚或十枚寻仙令。" };
    if (state.resources.seals < count) return { ok: false, state, message: "寻仙令不足，可通过秘境首胜、三次历练或每日招贤获得。" };
    state.resources.seals -= count;
    const results = [];
    for (let i = 0; i < count; i += 1) {
      state.urPity += 1;
      const rarity = pickRarity(rng(), state.urPity >= 60), result = drawOne(state, rarity, rng);
      if (rarity === "UR") state.urPity = 0;
      results.push(result);
    }
    state.log.unshift(`山门招贤${count}次，迎来${results.filter((r) => !r.copy).length}名新弟子。`);
    tutorialEvent(state, "recruit");
    return { ok: true, state, message: "招贤完成。", results };
  }
  function limitedRecruit(source, count, rng = Math.random) {
    const state = clone(source), cost = count === 10 ? DATA.banner.tenPrice : DATA.banner.price;
    if (![1, 10].includes(count)) return { ok: false, state, message: "只可结缘一次或十次。" };
    if (state.resources.jade < cost) return { ok: false, state, message: "灵玉不足。试玩可通过掌门指引获得。" };
    state.resources.jade -= cost;
    const results = [];
    for (let i = 0; i < count; i += 1) {
      state.limitedPity += 1;
      const rarity = pickRarity(rng(), state.limitedPity >= 60), result = drawLimitedOne(state, rarity, rng);
      results.push(result);
    }
    state.log.unshift(`${DATA.banner.name}结缘${count}次。`); tutorialEvent(state, "recruit");
    return { ok: true, state, message: "限时结缘完成。", results };
  }
  function freeRecruit(source, now = Date.now(), rng = Math.random) {
    const state = clone(source), key = todayKey(now);
    if (state.lastFreeRecruitKey === key) return { ok: false, state, message: "今日免费招贤已经使用。" };
    state.lastFreeRecruitKey = key;
    state.urPity += 1;
    const rarity = pickRarity(rng(), state.urPity >= 60), result = drawOne(state, rarity, rng);
    if (rarity === "UR") state.urPity = 0;
    state.log.unshift(`今日山门招贤，${result.name}${result.copy ? "留下本命印" : "拜入门下"}。`); tutorialEvent(state, "recruit");
    return { ok: true, state, message: "今日免费招贤完成。", results: [result] };
  }

  function pickFormationRarity(roll) {
    if (roll < DATA.formationRates.UR) return "UR";
    if (roll < DATA.formationRates.UR + DATA.formationRates.SSR) return "SSR";
    return "SR";
  }
  function formationRecruit(source, count, rng = Math.random) {
    const state = clone(source), cost = count === 10 ? 1600 : 160;
    if (![1, 10].includes(count)) return { ok: false, state, message: "只可参悟一次或十次。" };
    if (state.resources.jade < cost) return { ok: false, state, message: "灵玉不足。" };
    state.resources.jade -= cost;
    const pool = DATA.formations.filter((f) => !f.free), results = [];
    for (let i = 0; i < count; i += 1) {
      const rarity = pickFormationRarity(rng()), rarityPool = pool.filter((f) => f.rarity === rarity), formation = rarityPool[Math.min(rarityPool.length - 1, Math.floor(rng() * rarityPool.length))];
      const progress = state.formationCollection[formation.id], copy = progress.owned; progress.owned = true;
      let overflowDust = 0;
      if (copy) {
        if (progress.rank >= 5) { overflowDust = formation.rarity === "UR" ? 100 : formation.rarity === "SSR" ? 40 : 10; state.resources.fateDust += overflowDust; }
        else progress.copies += 1;
      }
      results.push({ ...formation, copy, overflowDust });
    }
    return { ok: true, state, message: "阵图参悟完成。", results };
  }
  function refineFormation(source, id) {
    const state = clone(source), progress = state.formationCollection[id];
    if (!progress?.owned) return { ok: false, state, message: "尚未获得这座阵法。" };
    if (progress.rank >= 5) return { ok: false, state, message: "阵法已至五阶。" };
    if (progress.copies < 1) return { ok: false, state, message: "需要一份重复阵图。" };
    const cost = { stone: 80 + progress.rank * 45, wood: 55 + progress.rank * 35, herbs: 25 + progress.rank * 18, food: 20 + progress.rank * 12 };
    if (Object.entries(cost).some(([key, value]) => state.resources[key] < value)) return { ok: false, state, message: "阵法升阶所需四项资源不足。" };
    Object.entries(cost).forEach(([key, value]) => { state.resources[key] -= value; }); progress.copies -= 1; progress.rank += 1;
    return { ok: true, state, message: `阵法升至${progress.rank}阶。` };
  }

  function purchaseDemo(source, itemId) {
    const state = clone(source), item = DATA.shopItems.find((entry) => entry.id === itemId);
    if (!item) return { ok: false, state, message: "商品不存在。" };
    if (!item.repeatable && state.purchases[item.id]) return { ok: false, state, message: "该礼包已经购买。" };
    let detail = "";
    if (item.type === "jade") {
      const first = !state.purchases[item.id], amount = item.jade * (first ? 2 : 1); state.resources.jade += amount; detail = `${amount}灵玉${first ? "（首充双倍）" : ""}`;
    } else if (item.type === "monthly") {
      state.resources.jade += item.jade; state.monthlyDays += item.days; detail = `立即${item.jade}灵玉，月契延长${item.days}日`;
    } else {
      Object.entries(item.rewards).forEach(([key, value]) => { state.resources[key] += value; }); detail = "礼包资源已入库";
    }
    state.purchases[item.id] = (state.purchases[item.id] || 0) + 1;
    let firstGift = null;
    if (!state.firstPurchaseClaimed) {
      state.firstPurchaseClaimed = true; firstGift = grantDisciple(state, findDisciple("ning-hongxiao")); state.resources.seals += 10;
    }
    return { ok: true, state, message: `试玩购买成功：${detail}${firstGift ? "；首充礼已到账" : ""}。`, firstGift };
  }
  function claimMonthly(source, now = Date.now()) {
    const state = clone(source), key = todayKey(now);
    if (state.monthlyDays <= 0) return { ok: false, state, message: "尚未开通洞天月契。" };
    if (state.lastMonthlyClaimKey === key) return { ok: false, state, message: "今日月契灵玉已经领取。" };
    state.resources.jade += 90; state.monthlyDays -= 1; state.lastMonthlyClaimKey = key;
    state.log.unshift("领取洞天月契每日供奉：90灵玉。");
    return { ok: true, state, message: "月契每日90灵玉已到账。" };
  }
  function exchangeDust(source, itemId) {
    const state = clone(source), costs = { fate: 200, ticket: 80, stone: 60, wood: 60, food: 60, herbs: 60 }, cost = costs[itemId];
    if (!cost || state.resources.fateDust < cost) return { ok: false, state, message: `天命尘不足，需要${cost || 0}。` };
    state.resources.fateDust -= cost;
    if (itemId === "fate") state.resources.fateSeals += 1;
    else if (itemId === "ticket") state.resources.seals += 10;
    else state.resources[itemId] += hourlyProduction(state)[itemId] * 6;
    return { ok: true, state, message: "天命尘兑换完成。" };
  }

  function getTagCounts(ids) {
    const counts = {};
    ids.forEach((id) => findDisciple(id).tags.forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; }));
    return counts;
  }
  function getBonds(ids) { return DATA.namedBonds.filter((bond) => bond.members.every((id) => ids.includes(id))); }
  function formationMatchInfo(state, partyIds = state.party) {
    const formation = DATA.formations.find((f) => f.id === state.formationId) || DATA.formations[0], party = partyIds.map(findDisciple).filter(Boolean);
    const count = formation.mode === "unique"
      ? new Set(party.map((d) => d.element)).size
      : party.filter((d) => d.formationElements.some((element) => formation.elements.includes(element))).length;
    const activeTiers = formation.tiers.filter((tier) => count >= tier.count), stats = {};
    activeTiers.forEach((tier) => Object.entries(tier.stats).forEach(([key, value]) => { stats[key] = (stats[key] || 0) + value; }));
    const rank = state.formationCollection?.[formation.id]?.rank || 0;
    Object.keys(stats).forEach((key) => { stats[key] *= 1 + rank * 0.04; });
    return { formation, count, activeTiers, stats };
  }
  function unitStats(id, progress, state) {
    const d = findDisciple(id), stars = progress.stars || 0, realmMultiplier = 1 + (progress.realmIndex || 0) * 0.055, skillMultiplier = (1 + (progress.skillLevel - 1) * 0.04) * (stars >= 1 ? 1.06 : 1) * (stars >= 5 ? 1.08 : 1), starStats = (stars >= 2 ? 1.05 : 1) * (stars >= 4 ? 1.06 : 1);
    const formationInfo = formationMatchInfo(state), formation = formationInfo.formation;
    const formationMatch = formation.mode === "unique" || d.formationElements.some((element) => formation.elements.includes(element));
    let hp = d.baseHp * realmMultiplier * starStats, atk = d.baseAtk * realmMultiplier * skillMultiplier * starStats, def = d.baseDef * realmMultiplier * starStats, speed = d.speed;
    if (formationMatch) { hp *= 1 + (formationInfo.stats.hp || 0); atk *= 1 + (formationInfo.stats.atk || 0); def *= 1 + (formationInfo.stats.def || 0); speed *= 1 + (formationInfo.stats.speed || 0); }
    const bonds = getBonds(state.party);
    if (bonds.some((b) => b.id === "old-guard")) hp *= 1.12;
    if (bonds.some((b) => b.id === "mortal-craft") && d.rarity === "R") { atk *= 1.18; def *= 1.18; }
    if (bonds.some((b) => b.id === "wild-path")) speed *= 1.12;
    return {
      id, name: d.name, rarity: d.rarity, role: d.role, element: d.element, tags: d.tags, portrait: d.portrait,
      skill: d.skill, skillType: d.skillType, skillCost: d.skillCost, skillLevel: progress.skillLevel, stars, formationElements: d.formationElements,
      side: "player", maxHp: Math.round(hp), hp: Math.round(hp), atk: Math.round(atk), def: Math.round(def), speed: Math.round(speed),
      energy: stars >= 3 ? 32 : 22, shield: 0, burn: 0, armorBreak: 0, stunned: false, evasion: 0, taunt: 0,
      critBuff: bonds.some((b) => b.id === "frost-thunder") ? 0.10 : 0
    };
  }
  function createBattle(state, stageId) {
    const stage = DATA.stages[stageId];
    if (!stage || stageId > state.expeditionProgress) return null;
    const party = state.party.filter((id) => state.roster[id] && state.roster[id].owned).slice(0, 6);
    if (party.length < 3) return null;
    const difficulty = (1 + (state.currentCycle - 1) * 0.22) * (1 + Math.max(0, party.length - 3) * 0.14), players = party.map((id, index) => ({ ...unitStats(id, state.roster[id], state), position: index < 3 ? "front" : "back" }));
    const enemies = Array.from({ length: stage.count }, (_, index) => ({
      id: `enemy-${stage.id}-${index}`, name: stage.count > 1 ? `${stage.enemy}·${index + 1}` : stage.enemy,
      role: stage.boss ? "Boss" : "妖兽", element: stage.element, side: "enemy", maxHp: Math.round(stage.hp * difficulty), hp: Math.round(stage.hp * difficulty),
      atk: Math.round(stage.atk * difficulty), def: Math.round(stage.def * difficulty), speed: stage.speed - index * 2,
      energy: 0, shield: 0, burn: 0, armorBreak: 0, stunned: false, evasion: 0, taunt: 0, critBuff: 0
    }));
    const formationInfo = formationMatchInfo(state, party), formation = formationInfo.formation;
    if (formation.id === "earth" && formationInfo.count >= 6) players.forEach((u) => { u.shield += Math.round(u.maxHp * 0.12); });
    return { stageId, cycle: state.currentCycle, round: 0, players, enemies, formationId: formation.id, formationCount: formationInfo.count, formationReady: true, masterReady: true, thunderMarks: 0, nextRoundBuff: null, tactic: "balanced", bonds: getBonds(party), tagCounts: getTagCounts(party), log: [`进入第${state.currentCycle}轮${stage.name}：${stage.story}`], finished: false, victory: false };
  }
  const elementCycle = { 火: "金", 金: "木", 木: "土", 土: "水", 水: "火" };
  function elementMultiplier(attacker, defender) { if (!elementCycle[attacker] || !elementCycle[defender]) return 1; if (elementCycle[attacker] === defender) return 1.15; if (elementCycle[defender] === attacker) return 0.88; return 1; }

  function useFormationActive(sourceBattle) {
    const battle = clone(sourceBattle);
    if (!battle || battle.finished || !battle.formationReady) return battle;
    const formation = DATA.formations.find((f) => f.id === battle.formationId); battle.formationReady = false;
    if (formation.activeType === "earth") battle.players.filter((u) => u.hp > 0).forEach((u) => { u.shield += Math.round(u.maxHp * 0.28); u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.08)); });
    else if (formation.activeType === "wood") battle.players.filter((u) => u.hp > 0).forEach((u) => { u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.20)); });
    else if (formation.activeType === "fire") battle.enemies.filter((u) => u.hp > 0).forEach((u) => { u.burn = Math.max(u.burn, 3); });
    else if (formation.activeType === "storm") battle.players.filter((u) => u.hp > 0).forEach((u) => { u.energy = Math.min(100, u.energy + 35); u.critBuff += 0.15; });
    else if (formation.activeType === "cycle") battle.players.filter((u) => u.hp > 0).forEach((u) => { u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.12)); u.shield += Math.round(u.maxHp * 0.12); u.energy = Math.min(100, u.energy + 20); });
    else if (formation.activeType === "starter") battle.players.filter((u) => u.hp > 0).forEach((u) => { u.energy = Math.min(100, u.energy + 20); });
    else battle.nextRoundBuff = "sword";
    battle.log.unshift(`阵法发动：${formation.active}。`);
    return battle;
  }
  function useMasterSkill(sourceBattle) {
    const battle = clone(sourceBattle);
    if (!battle || battle.finished || !battle.masterReady) return battle;
    battle.masterReady = false;
    battle.players.filter((u) => u.hp > 0).forEach((u) => { u.burn = 0; u.stunned = false; u.energy = Math.min(100, u.energy + 18); });
    battle.log.unshift("掌门技·清心令：驱散弟子减益，并回复18点灵力。");
    return battle;
  }
  function dealDamage(attacker, target, amount, log, label) {
    let damage = Math.max(5, Math.round(amount));
    if (target.evasion > 0) { target.evasion -= 1; log.push(`${target.name}避开了${attacker.name}的攻击。`); return 0; }
    if (target.shield > 0) { const blocked = Math.min(target.shield, damage); target.shield -= blocked; damage -= blocked; }
    target.hp = Math.max(0, target.hp - damage); log.push(`${attacker.name}${label}，对${target.name}造成${damage}伤害。`);
    if (target.hp <= 0) log.push(`${target.name}倒下。`); return damage;
  }
  function playerSkill(unit, allies, foes, tacticAtk, battle, log) {
    const living = foes.filter((u) => u.hp > 0); if (!living.length) return;
    const target = living.sort((a, b) => a.hp - b.hp)[0], level = unit.skillLevel, base = unit.atk * tacticAtk * elementMultiplier(unit.element, target.element);
    unit.energy = 0;
    const awakened = unit.stars >= 4;
    if (unit.skillType === "guard") { allies.filter((u) => u.hp > 0).forEach((ally) => { ally.shield += Math.round(unit.def * (1.35 + level * 0.12) * (awakened ? 1.35 : 1)); }); unit.taunt = awakened ? 2 : 1; log.push(`${unit.name}施展${unit.skill}，玄岩护住全队。`); }
    else if (unit.skillType === "heal") { const targets = awakened ? allies.filter((u) => u.hp > 0) : [allies.filter((u) => u.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]]; targets.forEach((wounded) => { const heal = Math.round(unit.atk * (1.5 + level * 0.14) * (awakened ? 0.72 : 1)); wounded.hp = Math.min(wounded.maxHp, wounded.hp + heal); wounded.burn = 0; }); log.push(`${unit.name}施展${unit.skill}，春意洗过同门经脉。`); }
    else if (unit.skillType === "break") living.forEach((enemy) => { dealDamage(unit, enemy, base * (0.62 + level * 0.05) - enemy.def * 0.25, log, `施展${unit.skill}`); enemy.armorBreak = 2; });
    else if (unit.skillType === "thunder") living.forEach((enemy) => { enemy.shield = 0; dealDamage(unit, enemy, base * (0.70 + level * 0.05) - enemy.def * 0.16, log, `引落${unit.skill}`); enemy.armorBreak = 2; });
    else if (unit.skillType === "phoenix") { living.forEach((enemy) => dealDamage(unit, enemy, base * (0.58 + level * 0.05) - enemy.def * 0.25, log, `引动${unit.skill}`)); allies.filter((u) => u.hp > 0).forEach((ally) => { ally.energy = Math.min(100, ally.energy + 14 + level * 2); }); }
    else if (unit.skillType === "wind") { dealDamage(unit, target, base * 0.72 - target.def * 0.22, log, `御风追袭`); allies.filter((u) => u.hp > 0).forEach((ally) => { ally.burn = 0; ally.stunned = false; ally.energy = Math.min(100, ally.energy + 12); ally.critBuff += 0.08; }); }
    else if (unit.skillType === "bind") { dealDamage(unit, target, base * (0.72 + level * 0.05) - target.def * 0.3, log, `祭出${unit.skill}`); target.stunned = true; if (awakened && living[1]) living[1].stunned = true; }
    else if (unit.skillType === "evade") { dealDamage(unit, target, base * (1.15 + level * 0.08) - target.def * 0.35, log, `使出${unit.skill}`); unit.evasion = 1; }
    else if (unit.skillType === "taunt") { unit.shield += Math.round(unit.def * (1.8 + level * 0.18)); unit.taunt = 2; log.push(`${unit.name}横炉而立，替同门承接杀机。`); }
    else if (unit.skillType === "haste") { allies.filter((u) => u.hp > 0).forEach((ally) => { ally.critBuff += 0.10 + level * 0.015; ally.energy = Math.min(100, ally.energy + 10); }); log.push(`${unit.name}引来青雀，全队速度与会心提升。`); }
    else { let power = 1.18 + level * 0.09; if (unit.skillType === "execute") power += (1 - target.hp / target.maxHp) * (awakened ? 1.35 : 0.9); dealDamage(unit, target, base * power - target.def * (awakened ? 0.12 : 0.35), log, `施展${unit.skill}`); if (unit.skillType === "burn") target.burn = Math.max(target.burn, awakened ? 3 : 2); }
    if (battle.bonds.some((b) => b.id === "hearth") && ["burn", "phoenix"].includes(unit.skillType)) allies.filter((u) => u.hp > 0).forEach((ally) => { ally.energy = Math.min(100, ally.energy + 6); });
    const wind = allies.find((ally) => ally.hp > 0 && ally.skillType === "wind" && ally.id !== unit.id);
    if (wind && living.some((enemy) => enemy.hp > 0)) {
      const followTarget = living.find((enemy) => enemy.hp > 0), slowest = allies.filter((ally) => ally.hp > 0).sort((a, b) => a.speed - b.speed)[0];
      dealDamage(wind, followTarget, wind.atk * 0.42 - followTarget.def * 0.18, log, "踏风追击"); slowest.energy = Math.min(100, slowest.energy + 10);
    }
  }
  function battleRound(sourceBattle, tactic = "balanced", rng = Math.random) {
    const battle = clone(sourceBattle); if (!battle || battle.finished) return battle;
    battle.round += 1; battle.tactic = ["assault", "guard", "charge"].includes(tactic) ? tactic : "balanced";
    const tacticAtk = tactic === "assault" ? 1.25 : tactic === "guard" ? 0.86 : tactic === "charge" ? 0.82 : 1;
    const incoming = tactic === "guard" ? 0.62 : tactic === "assault" ? 1.10 : 1, energyGain = tactic === "charge" ? 52 : 32;
    const swordBuff = battle.nextRoundBuff === "sword" ? 1.30 : 1; battle.nextRoundBuff = null;
    const log = [`— 第${battle.round}轮 · ${tactic === "assault" ? "强攻" : tactic === "guard" ? "守势" : tactic === "charge" ? "蓄灵" : "平衡"} —`], activeFormation = DATA.formations.find((f) => f.id === battle.formationId);
    if ((activeFormation.id === "wood" && battle.formationCount >= 6) || (activeFormation.id === "cycle" && battle.formationCount >= 6)) battle.players.filter((u) => u.hp > 0).forEach((u) => { u.energy = Math.min(100, u.energy + 8); });
    battle.enemies.filter((u) => u.hp > 0 && u.burn > 0).forEach((enemy) => { const burnBoost = (battle.bonds.some((b) => b.id === "hearth") ? 1.25 : 1) * (activeFormation.id === "fire" && battle.formationCount >= 4 ? 1.25 : 1), burn = Math.max(8, Math.round(enemy.maxHp * 0.055 * burnBoost)); enemy.hp = Math.max(0, enemy.hp - burn); enemy.burn -= 1; log.push(`${enemy.name}受到${burn}点灼烧。`); });
    const all = [...battle.players, ...battle.enemies].filter((u) => u.hp > 0).sort((a, b) => b.speed - a.speed);
    for (const unit of all) {
      if (unit.hp <= 0) continue;
      const allies = unit.side === "player" ? battle.players : battle.enemies, foes = unit.side === "player" ? battle.enemies : battle.players;
      const livingFoes = foes.filter((u) => u.hp > 0); if (!livingFoes.length) break;
      if (unit.stunned) { unit.stunned = false; log.push(`${unit.name}被符箓封禁，无法行动。`); continue; }
      if (unit.side === "player") {
        if (unit.energy >= Math.max(40, unit.skillCost - (swordBuff > 1 ? 22 : 0))) playerSkill(unit, allies, foes, tacticAtk * swordBuff, battle, log);
        else { const target = livingFoes[Math.floor(rng() * livingFoes.length)], critical = rng() < 0.10 + unit.critBuff, def = target.def * (target.armorBreak > 0 ? 0.62 : 1), raw = unit.atk * tacticAtk * swordBuff * (critical ? 1.55 : 1) * elementMultiplier(unit.element, target.element); dealDamage(unit, target, raw - def * 0.45, log, critical ? "会心一击" : "出手"); unit.energy = Math.min(100, unit.energy + energyGain); if (critical) { const thunder = allies.find((ally) => ally.hp > 0 && ally.skillType === "thunder"); if (thunder) { battle.thunderMarks += 1; log.push(`雷印积累至${battle.thunderMarks}/5。`); if (battle.thunderMarks >= 5) { battle.thunderMarks = 0; livingFoes.filter((enemy) => enemy.hp > 0).forEach((enemy) => { enemy.shield = 0; dealDamage(thunder, enemy, thunder.atk * 1.20 - enemy.def * 0.10, log, "引发五雷轰顶"); }); } } } }
      } else {
        const taunter = livingFoes.find((u) => u.taunt > 0), frontline = livingFoes.filter((u) => u.position === "front"), targets = frontline.length ? frontline : livingFoes, target = taunter || targets[Math.floor(rng() * targets.length)], bossSurge = unit.role === "Boss" && battle.round % 3 === 0;
        if (bossSurge) livingFoes.forEach((victim) => dealDamage(unit, victim, (unit.atk * 1.70 - victim.def * 0.28) * incoming, log, "掀起墨潮"));
        else dealDamage(unit, target, (unit.atk - target.def * 0.34) * incoming, log, "扑杀");
      }
    }
    [...battle.players, ...battle.enemies].forEach((unit) => { if (unit.armorBreak > 0) unit.armorBreak -= 1; if (unit.taunt > 0) unit.taunt -= 1; unit.critBuff = Math.max(0, unit.critBuff - 0.02); });
    const alivePlayers = battle.players.some((u) => u.hp > 0), aliveEnemies = battle.enemies.some((u) => u.hp > 0);
    battle.log = [...log, ...battle.log].slice(0, 30);
    if (!alivePlayers || !aliveEnemies || battle.round >= 18) { battle.finished = true; battle.victory = alivePlayers && !aliveEnemies; battle.log.unshift(battle.victory ? "秘境战斗胜利。" : "弟子力竭，只得暂退山门。"); }
    return battle;
  }

  function settleBattle(source, battle) {
    const state = clone(source);
    if (!battle || !battle.finished || !battle.victory) return { ok: false, state, message: "战斗尚未胜利。" };
    if (battle.cycle !== state.currentCycle) return { ok: false, state, message: "秘境轮次已经变化。" };
    const stage = DATA.stages[battle.stageId], clearKey = `${state.currentCycle}:${battle.stageId}`, first = !state.cleared.includes(clearKey), sourceReward = first ? stage.reward : stage.repeat, scale = 1 + (state.currentCycle - 1) * 0.28, reward = {};
    Object.entries(sourceReward).forEach(([key, value]) => { reward[key] = Math.max(1, Math.round(value * scale)); state.resources[key] = (state.resources[key] || 0) + reward[key]; });
    if (first) state.cleared.push(clearKey); state.expeditionWins += 1;
    let recruitResult = null;
    if (first && stage.recruit) {
      recruitResult = grantDisciple(state, findDisciple(stage.recruit));
      state.log.unshift(`${recruitResult.name}${recruitResult.copy ? "留下本命印" : "受掌门相救，拜入山门"}。`);
    }
    if (state.expeditionWins % 3 === 0) { state.resources.seals += 1; reward.seals = (reward.seals || 0) + 1; }
    if (battle.stageId === DATA.stages.length - 1 && first) { state.currentCycle += 1; state.expeditionProgress = 0; state.log.unshift(`墨蛟伏诛，秘境灵潮重启。第${state.currentCycle}轮敌人更强，奖励也更丰厚。`); }
    else { state.expeditionProgress = Math.min(DATA.stages.length - 1, Math.max(state.expeditionProgress, battle.stageId + 1)); state.log.unshift(`${first ? "首度扫清" : "再次历练"}${stage.name}，物资已入库。`); }
    tutorialEvent(state, "battle");
    return { ok: true, state, message: first ? `首胜奖励已入库${recruitResult ? `，${recruitResult.name}加入宗门` : ""}。` : "历练奖励已入库。", reward, recruitResult, first };
  }
  function setParty(source, ids) {
    const state = clone(source), unique = [...new Set(ids)].filter((id) => state.roster[id] && state.roster[id].owned);
    if (unique.length < 3 || unique.length > 6) return { ok: false, state, message: "秘境小队需3至6人，前三位为前排。" };
    state.party = unique; return { ok: true, state, message: "出战阵容已调整。" };
  }
  function recommendParty(source, style = "balanced") {
    const state = clone(source), owned = DATA.disciples.filter((d) => state.roster[d.id].owned);
    const priorities = {
      balanced: ["guard", "taunt", "heal", "wind", "thunder", "execute", "phoenix", "break", "bind", "burn", "haste", "evade"],
      burst: ["thunder", "execute", "break", "wind", "phoenix", "burn", "guard", "heal"],
      sustain: ["guard", "taunt", "heal", "wind", "bind", "phoenix", "execute", "break"]
    }[style] || [];
    const order = (type) => { const index = priorities.indexOf(type); return index < 0 ? 99 : index; }, selected = [...owned].sort((a, b) => order(a.skillType) - order(b.skillType)).slice(0, 6).map((d) => d.id);
    if (selected.length < 3) return { ok: false, state, message: "至少需要三名弟子。" };
    state.party = selected;
    return { ok: true, state, message: `${style === "burst" ? "雷金爆发" : style === "sustain" ? "稳守续航" : "均衡推图"}阵容已应用。` };
  }
  function setFormation(source, formationId) {
    const state = clone(source);
    if (!DATA.formations.some((f) => f.id === formationId)) return { ok: false, state, message: "阵法不存在。" };
    if (!state.formationCollection[formationId]?.owned) return { ok: false, state, message: "尚未获得这座阵法。" };
    state.formationId = formationId; return { ok: true, state, message: "护山阵枢已更换。" };
  }

  const Core = { createInitialState, sanitizeState, realmInfo, nextRealmInfo, advancementCost, trainingCost, buildingCost, upgradeBuilding, finishBuildingWithJade, canUpgradeSect, upgradeSect, repayDebt, assignmentBonus, assignDisciple, hourlyProduction, claimIdle, quickHarvest, buyResourceChoice, trainDisciple, advanceRealm, upgradeSkill, ascendStar, recruit, limitedRecruit, freeRecruit, pickRarity, formationRecruit, refineFormation, purchaseDemo, claimMonthly, exchangeDust, getTagCounts, getBonds, formationMatchInfo, elementMultiplier, createBattle, useFormationActive, useMasterSkill, battleRound, settleBattle, setParty, recommendParty, setFormation };
  root.SectCore = Core;
  if (typeof module !== "undefined" && module.exports) module.exports = Core;
})(typeof globalThis !== "undefined" ? globalThis : this);
