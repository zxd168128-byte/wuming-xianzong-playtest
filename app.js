(function () {
  const D = window.SectData, C = window.SectCore, Combat = window.SectCombat05A;
  const SAVE_KEY = "immortal-sect-v04-save";
  const RESOURCE_NAMES = { stone: "灵石", wood: "灵木", herbs: "灵药", food: "灵粮", seals: "寻仙令", jade: "灵玉", fateSeals: "通用命印", fateDust: "天命尘", renown: "声望", debt: "债务" };
  let state = loadState(), activeTab = "sect", recruitMode = "characters", selectedDisciple = "fang-yan", activeBattle = null, selectedTactic = "balanced", toastTimer = null, sandboxBattle = null, sandboxPreset = "balanced", sandboxSeed = 20260905;
  const el = (selector) => document.querySelector(selector), view = el("#view");

  function loadState() {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? C.sanitizeState(JSON.parse(raw)) : C.createInitialState(); }
    catch (_) { return C.createInitialState(); }
  }
  function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function commit(result, rerender = true) {
    if (result?.state) state = result.state;
    save();
    if (result?.message) toast(result.message);
    if (rerender) render();
    return result;
  }
  function toast(message) {
    const node = el("#toast"); node.textContent = message; node.classList.add("show"); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2200);
  }
  function ownedCount() { return Object.values(state.roster).filter((d) => d.owned).length; }
  function resourceMarkup() {
    return ["stone", "wood", "herbs", "food", "seals", "jade"].map((key) => `<div class="resource"><span>${RESOURCE_NAMES[key]}</span><b>${state.resources[key]}</b></div>`).join("");
  }
  function goalMarkup() {
    const steps = ["收取一次灵息", "让任意弟子修炼一次", "完成一次免费招贤", "点亮任意弟子命星", "赢得雾林入口首战"];
    const done = state.tutorial.complete ? 5 : state.tutorial.step;
    return `<strong>${state.tutorial.complete ? "掌门指引完成" : `新手指引 ${done + 1}/5`}</strong><p>${state.tutorial.complete ? "继续经营、结缘与挑战灵潮" : steps[done]}</p><div class="goal-meter"><span style="width:${done / 5 * 100}%"></span></div>`;
  }
  function guidePanel() {
    if (state.tutorial.complete) return "";
    const guides = [
      ["第一课 · 聚拢资源", "先收取山门积存的灵息。", "claim", "收取灵息"],
      ["第二课 · 打磨根骨", "选择方砚，让他完成一次闭关修炼。", "guide-tab", "前往弟子", "disciples"],
      ["第三课 · 广纳门徒", "仙缘阁每日有一次免费招贤。", "guide-tab", "前往仙缘阁", "recruit"],
      ["第四课 · 点亮命星", "刚获得的天命印可替代一次重复本体。", "guide-tab", "查看弟子命星", "disciples"],
      ["第五课 · 初入秘境", "带三名弟子扫清雾林入口。", "guide-tab", "开始首战", "expedition"]
    ];
    const g = guides[state.tutorial.step];
    return `<section class="guide-panel"><span>掌门指引</span><div><b>${g[0]}</b><p>${g[1]}</p></div><button class="primary-button" data-action="${g[2]}" ${g[4] ? `data-tab="${g[4]}"` : ""}>${g[3]}</button></section>`;
  }
  function renderChrome() {
    el("#resources").innerHTML = resourceMarkup(); el("#sect-name").textContent = state.sectName;
    el("#scene-eyebrow").textContent = `青崖山南麓 · 第${state.day}日 · 秘境第${state.currentCycle}轮`;
    el("#goal-card").innerHTML = goalMarkup();
    document.querySelectorAll(".main-nav button").forEach((button) => button.classList.toggle("active", button.dataset.tab === activeTab));
    if (state.currentCycle > 1) { el("#scene-title").textContent = "灵潮复起，道阻且长"; el("#scene-text").textContent = `墨蛟虽伏，秘境已进入第${state.currentCycle}轮。更强的敌人和更丰厚的资源正在山下重生。`; }
    else if (state.sectLevel > 1) { el("#scene-title").textContent = "青崖门，今日重立"; el("#scene-text").textContent = "屋瓦仍旧，门下的人心却已经不同。下一步，是取回墨蛟潭中的宗门旧印。"; }
  }
  function render() {
    renderChrome();
    ({ sect: renderSect, disciples: renderDisciples, recruit: renderRecruit, expedition: renderExpedition, sandbox: renderSandbox, chronicle: renderChronicle })[activeTab]();
    view.insertAdjacentHTML("afterbegin", guidePanel());
  }
  function header(title, subtitle, aside = "") { return `<div class="view-header"><div><h2>${title}</h2><p>${subtitle}</p></div>${aside}</div>`; }
  function portrait(d, className = "portrait") { return `<div class="${className}"><img src="${d.portrait}" alt="${d.name}人物形象"></div>`; }
  function costText(cost) { return Object.entries(cost).filter(([key]) => ["stone", "wood", "herbs", "food"].includes(key)).map(([key, value]) => `${RESOURCE_NAMES[key]}${value}`).join(" · "); }

  function renderSect() {
    const hourly = C.hourlyProduction(state), prices = [0, 30, 50, 80, 120], harvestCount = state.quickHarvest?.key === new Date().toISOString().slice(0, 10) ? state.quickHarvest.count : 0, nextPrice = prices[harvestCount];
    const cards = D.buildings.map((building) => {
      const level = state.buildings[building.id], cost = C.buildingCost(building.id, level), max = level >= 4, assignedId = state.assignments[building.id], assigned = D.disciples.find((d) => d.id === assignedId), bonus = Math.round(C.assignmentBonus(state, building.id) * 100);
      const enough = Object.entries(cost).every(([key, value]) => state.resources[key] >= value);
      return `<article class="building-card"><div class="building-icon">${building.icon}</div><h3>${building.name} <small>Lv.${level}</small></h3><p>${building.desc}</p><div class="meta">${building.resource ? `每小时：${RESOURCE_NAMES[building.resource]} ${hourly[building.resource]}` : `效果：${building.output}`}</div><button class="assignment-line" data-action="open-assign" data-id="${building.id}">${assigned ? `<img src="${assigned.portrait}" alt=""><span><b>${assigned.name}</b><small>${assigned.profession} · 效率+${bonus}%</small></span>` : `<span><b>暂无管事</b><small>派弟子任职可提高效率</small></span>`}</button><small class="build-cost">${max ? "" : costText(cost)}</small><button class="small-button" data-action="upgrade-building" data-id="${building.id}" ${max ? "disabled" : ""}>${max ? "已达上限" : "升级建筑"}</button>${!max && !enough ? `<button class="supply-button" data-action="finish-building" data-id="${building.id}">灵玉补齐缺口并升级</button>` : ""}</article>`;
    }).join("");
    const levelTwo = Object.values(state.buildings).filter((level) => level >= 2).length;
    view.innerHTML = `${header("宗门经营", "四处产地决定每小时收益；派驻弟子后可以主动调整资源方向。")}
      <section class="production-board paper-panel"><div><span class="section-kicker">当前每小时产量</span><div class="production-rates">${Object.entries(hourly).map(([key, value]) => `<b>${RESOURCE_NAMES[key]}<em>+${value}</em></b>`).join("")}</div></div><button class="primary-button" data-action="quick-harvest" ${harvestCount >= 5 ? "disabled" : ""}>快速收获2小时 · ${nextPrice === 0 ? "本次免费" : `${nextPrice}灵玉`}</button><small>今日 ${harvestCount}/5 次，之后价格依次30/50/80/120灵玉</small></section>
      <div class="building-grid">${cards}</div>
      <section class="resource-choice paper-panel"><div><span class="section-kicker">定向资源箱</span><h3>缺什么，就买6小时当前产量</h3><p>产量随建筑和派驻成长，不会因为境界提高而贬值。</p></div>${["wood", "herbs", "food", "stone"].map((key) => `<button data-action="resource-choice" data-resource="${key}">${RESOURCE_NAMES[key]}<small>80灵玉 · +${hourly[key] * 6}</small></button>`).join("")}</section>
      <section class="sect-summary paper-panel"><div><strong>${state.sectName} · ${state.sectLevel}级山门</strong><p>二级建筑 ${levelTwo}/3 · 声望 ${state.resources.renown}/80 · 欠青石坊 ${state.resources.debt} 灵石</p></div><div class="scene-actions"><button class="ink-button" data-action="repay">偿债100</button><button class="primary-button" data-action="upgrade-sect" ${C.canUpgradeSect(state) ? "" : "disabled"}>重立山门</button></div></section>
      <section class="paper-panel loop-panel"><div><span class="section-kicker">持续循环</span><h3>秘境不会耗尽</h3><p>每轮四关，击败墨蛟后灵潮重启。敌人提高22%，奖励提高28%；每3次胜利额外获得1枚寻仙令。</p></div><button class="primary-button" data-action="tab" data-tab="expedition">第${state.currentCycle}轮 · 前往历练</button></section>`;
  }

  function discipleCard(d) {
    const p = state.roster[d.id], locked = !p.owned, realm = C.realmInfo(p);
    return `<article class="disciple-card ${locked ? "locked" : ""} ${selectedDisciple === d.id ? "selected" : ""}" data-action="select-disciple" data-id="${d.id}"><span class="rarity ${d.rarity}">${d.rarity}</span>${locked ? `<div class="portrait mystery">？</div>` : portrait(d)}<h3>${locked ? "尚未结缘" : d.name}</h3><span class="role">${locked ? "仙缘未至" : `${d.element} · ${d.role} · ${d.profession}`}</span>${locked ? "" : `<div class="star-mini">${"✦".repeat(p.stars)}${"◇".repeat(5 - p.stars)}</div>`}<div class="tag-row compact">${d.tags.slice(0, 2).map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>${locked ? "" : `<div class="cultivation"><label><span>${realm.name}</span><span>${p.cultivation}/${realm.exp}</span></label><div class="bar"><span style="width:${p.cultivation / realm.exp * 100}%"></span></div></div>`}</article>`;
  }
  function realmRoadmap(progress) {
    const majors = ["炼气1–14层", "筑基·四期各5重", "结丹·四期各5重", "元婴·四期各5重", "化神·四期各5重", "炼虚·四期各5重", "合体·四期各5重", "大乘·四期各5重", "渡劫·四期各5重", "羽化飞升"];
    const currentMajor = C.realmInfo(progress).major;
    const majorOrder = ["炼气", "筑基", "结丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫", "飞升"], currentIndex = majorOrder.indexOf(currentMajor);
    return `<div class="realm-roadmap">${majors.map((name, index) => `<div class="realm-node ${index === currentIndex ? "current" : ""} ${index < currentIndex ? "passed" : ""}"><span>${index + 1}</span><small>${name}</small></div>`).join("")}</div>`;
  }
  function detailActions(d, p) {
    if (!p.owned) return `<aside class="paper-panel action-stack"><h3>仙缘未至</h3><p>可在仙缘阁、秘境事件或后续剧情中相遇。</p><button class="primary-button" data-action="tab" data-tab="recruit">前往招贤</button></aside>`;
    const realm = C.realmInfo(p), ready = p.cultivation >= realm.exp, trainCost = C.trainingCost(p), advanceCost = C.advancementCost(p), skillCost = { stone: p.skillLevel * 18, herbs: p.skillLevel * 5, food: p.skillLevel * 3 };
    const canStar = p.stars < 5 && (p.copies > 0 || state.resources.fateSeals > 0);
    return `<aside class="paper-panel action-stack"><h3>修行与绝技</h3><div class="cost-line"><span>当前境界</span><b>${realm.name}</b></div><div class="cost-line"><span>本重修为</span><b>${p.cultivation}/${realm.exp}</b></div><button class="primary-button" data-action="train" data-id="${d.id}" ${ready ? "disabled" : ""}>闭关修炼</button><div class="cost-line"><span>修炼消耗</span><span>${costText(trainCost)}</span></div><button class="ink-button" data-action="advance" data-id="${d.id}" ${ready ? "" : "disabled"}>${advanceCost.major ? "冲击大境界" : advanceCost.phase ? "冲击阶段瓶颈" : "突破小层次"}</button><div class="cost-line"><span>突破消耗</span><span>${costText(advanceCost)}</span></div><button class="ink-button" data-action="skill-up" data-id="${d.id}" ${p.skillLevel >= 5 ? "disabled" : ""}>研习绝技 · ${p.skillLevel}/5重</button><div class="cost-line"><span>技能消耗</span><span>${p.skillLevel >= 5 ? "已圆满" : costText(skillCost)}</span></div><hr><h3>命印 · ${p.stars}/5</h3><div class="star-track">${d.starNodes.map((node, index) => `<div class="star-node ${index < p.stars ? "lit" : ""}"><b>${index + 1}</b><span>${node}</span></div>`).join("")}</div><button class="primary-button" data-action="star-up" data-id="${d.id}" ${canStar ? "" : "disabled"}>激活命印</button><small>专属命印 ${p.copies} · 通用命印 ${state.resources.fateSeals}。满命多余重复自动转为天命尘。</small></aside>`;
  }
  function renderDisciples() {
    const d = D.disciples.find((item) => item.id === selectedDisciple), p = state.roster[d.id], realm = C.realmInfo(p);
    view.innerHTML = `${header("门下弟子", `已结缘 ${ownedCount()}/${D.disciples.length}。本体拥有完整机制，五重命印总提升控制在约25%。`)}<div class="roster-grid">${D.disciples.map(discipleCard).join("")}</div><div class="detail-layout" style="margin-top:12px"><section class="paper-panel detail-panel"><div class="detail-head">${p.owned ? portrait(d, "portrait large") : `<div class="portrait large mystery">？</div>`}<div><span class="rarity ${d.rarity}">${d.rarity}</span><h2>${p.owned ? d.name : "未识之人"}</h2><p class="realm-title">${p.owned ? `${realm.name} · ${p.stars}命` : "结缘后可见"}</p><div class="tag-row">${d.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>${d.rarity === "UR" ? `<p class="compatibility">战斗属性：${d.element} · 阵法兼容：${d.formationElements.join(" / ")}</p>` : ""}</div></div><div class="detail-section"><h4>${d.skill} · ${p.skillLevel}重</h4><p>${d.skillText2}</p></div><div class="detail-section"><h4>${d.talent}</h4><p>${d.talentText}</p></div><div class="detail-section"><h4>人物小传</h4><p>${p.owned ? d.story : "结缘后解锁人物小传。"}</p></div>${p.owned ? realmRoadmap(p) : ""}</section>${detailActions(d, p)}</div>`;
  }

  function renderRecruit() {
    const tabs = `<div class="recruit-tabs"><button class="${recruitMode === "characters" ? "active" : ""}" data-action="recruit-mode" data-mode="characters">弟子仙缘</button><button class="${recruitMode === "formations" ? "active" : ""}" data-action="recruit-mode" data-mode="formations">阵图参悟</button><button class="${recruitMode === "shop" ? "active" : ""}" data-action="recruit-mode" data-mode="shop">仙坊</button></div>`;
    if (recruitMode === "formations") { renderFormationRecruit(tabs); return; }
    if (recruitMode === "shop") { renderShop(tabs); return; }
    const usedFree = state.lastFreeRecruitKey === new Date().toISOString().slice(0, 10);
    const featured = D.disciples.find((d) => d.id === D.banner.featured);
    view.innerHTML = `${header("仙缘阁", "付费人物池只含SR以上；UR靠机制与阵法兼容成为核心拼图。")}${tabs}
      <section class="limited-banner paper-panel"><img src="${featured.portrait}" alt="${featured.name}"><div><span class="section-kicker">限时仙缘 · 雷异灵根</span><h2>${D.banner.name}</h2><h3>UR ${featured.name} · 天雷道骨</h3><p>${featured.talentText}</p><div class="tag-row">${featured.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div><small>战斗为雷属性，不参与五行克制；阵法判定可视为金或水。</small></div><div class="summon-controls"><div class="resource"><span>持有灵玉</span><b>${state.resources.jade}</b></div><div class="rate-list"><div><b>82%</b><small>SR</small></div><div><b>15%</b><small>SSR</small></div><div><b>3%</b><small>UR</small></div></div><button class="ink-button" data-action="limited-recruit" data-count="1" ${state.resources.jade < 160 ? "disabled" : ""}>结缘一次 · 160</button><button class="primary-button" data-action="limited-recruit" data-count="10" ${state.resources.jade < 1600 ? "disabled" : ""}>十方寻缘 · 1600</button><small>UR保底 ${state.limitedPity}/60 · ${state.featuredGuaranteed ? "下个UR必为当期" : "首次UR有50%为当期"} · 最差120抽</small></div></section>
      <section class="summon-hall paper-panel"><div class="summon-visual"><h2>山门常驻招贤</h2><p>普通门人从经营与事件获得；寻仙池只投放SR、SSR、UR。满命后的重复会自动化为天命尘。</p></div><div class="summon-controls"><div class="resource"><span>寻仙令 / 天命尘</span><b>${state.resources.seals} / ${state.resources.fateDust}</b></div><div class="rate-list"><div><b>82%</b><small>SR</small></div><div><b>15%</b><small>SSR</small></div><div><b>3%</b><small>UR</small></div></div><button class="ink-button" data-action="free-recruit" ${usedFree ? "disabled" : ""}>${usedFree ? "今日免费招贤已用" : "今日免费招贤"}</button><button class="ink-button" data-action="recruit" data-count="1" ${state.resources.seals < 1 ? "disabled" : ""}>招贤一次 · 1令</button><button class="primary-button" data-action="recruit" data-count="10" ${state.resources.seals < 10 ? "disabled" : ""}>十方寻缘 · 10令</button><small>常驻UR保底 ${state.urPity}/60；抽到UR后重置。</small></div></section>`;
  }

  function renderFormationRecruit(tabs) {
    view.innerHTML = `${header("阵图参悟", "独立阵法池：SSR 3%、UR 1%。不加入法宝、灵宠等额外卡池。")}${tabs}<section class="formation-summon paper-panel"><div><span class="section-kicker">阵法池</span><h2>太虚阵卷</h2><p>重复阵图用于升阶；满阶多余阵图转为天命尘。阵法升阶需要四项宗门资源。</p><div class="rate-list"><div><b>96%</b><small>SR</small></div><div><b>3%</b><small>SSR</small></div><div><b>1%</b><small>UR</small></div></div></div><div class="summon-controls"><div class="resource"><span>持有灵玉</span><b>${state.resources.jade}</b></div><button class="ink-button" data-action="formation-recruit" data-count="1" ${state.resources.jade < 160 ? "disabled" : ""}>参悟一次 · 160</button><button class="primary-button" data-action="formation-recruit" data-count="10" ${state.resources.jade < 1600 ? "disabled" : ""}>参悟十次 · 1600</button></div></section><div class="formation-codex">${D.formations.map((f) => { const p = state.formationCollection[f.id]; return `<article class="paper-panel ${p.owned ? "" : "locked"}"><span class="rarity ${f.rarity}">${f.rarity}</span><b>${f.icon} ${p.owned ? f.name : "未悟阵图"}</b><small>${p.owned ? `阵阶 ${p.rank}/5 · 重复 ${p.copies}` : "参悟后解锁"}</small><p>${f.tiers.map((tier) => tier.text).join("；")}</p>${p.owned && p.copies > 0 ? `<button class="small-button" data-action="refine-formation" data-id="${f.id}">消耗重复阵图升阶</button>` : ""}</article>`; }).join("")}</div>`;
  }

  function renderShop(tabs) {
    const monthlyClaimed = state.lastMonthlyClaimKey === new Date().toISOString().slice(0, 10);
    view.innerHTML = `${header("仙坊", "当前为沙盒购买：点击后模拟到账，不连接真实支付。")}${tabs}<section class="first-charge paper-panel"><div><span class="section-kicker">首次任意购买</span><h2>首充礼 · 宁红绡</h2><p>立即获得SSR宁红绡（已拥有则获得专属命印）及10枚寻仙令。每档灵玉首购另享双倍。</p></div><button class="${state.firstPurchaseClaimed ? "ink-button" : "primary-button"}" disabled>${state.firstPurchaseClaimed ? "首充礼已领取" : "购买任意商品自动领取"}</button></section>${state.monthlyDays > 0 ? `<section class="monthly-claim paper-panel"><div><span class="section-kicker">洞天月契生效中</span><h3>余 ${state.monthlyDays} 次每日供奉</h3><p>领取90灵玉；月契期间离线积存上限由8小时提高到12小时。</p></div><button class="primary-button" data-action="claim-monthly" ${monthlyClaimed ? "disabled" : ""}>${monthlyClaimed ? "今日已领取" : "领取今日90灵玉"}</button></section>` : ""}<div class="shop-grid">${D.shopItems.map((item) => { const bought = state.purchases[item.id] || 0, firstDouble = item.type === "jade" && !bought; return `<article class="paper-panel"><span>${item.type === "jade" ? "灵玉充值" : item.type === "monthly" ? "月度权益" : "限购礼包"}</span><h3>${item.name}</h3><strong>${item.price}</strong><p>${item.type === "jade" ? `${item.jade}灵玉${firstDouble ? ` + 首购赠${item.jade}` : ""}` : item.type === "monthly" ? "立即300灵玉；30次每日90灵玉；离线收益上限+4小时" : costText(item.rewards)}</p><button class="small-button" data-action="purchase" data-id="${item.id}" ${!item.repeatable && bought ? "disabled" : ""}>${!item.repeatable && bought ? "已购买" : `沙盒购买 ${item.price}`}</button></article>`; }).join("")}</div><section class="dust-shop paper-panel"><div><span class="section-kicker">满命回收</span><h3>天命尘 ${state.resources.fateDust}</h3><p>SR/SSR/UR满命后的重复分别转10/40/100天命尘。</p></div><button data-action="dust-exchange" data-id="fate">通用命印<small>200尘</small></button><button data-action="dust-exchange" data-id="ticket">寻仙令×10<small>80尘</small></button>${["wood", "herbs", "food", "stone"].map((key) => `<button data-action="dust-exchange" data-id="${key}">${RESOURCE_NAMES[key]}6小时<small>60尘</small></button>`).join("")}</section>`;
  }

  function formationPanel() {
    const info = C.formationMatchInfo(state);
    return `<section class="formation-panel paper-panel"><div class="formation-heading"><span class="section-kicker">6弟子 + 1阵法 + 1掌门技</span><h3>${info.formation.name} · 适配${info.count}人</h3><p>${info.activeTiers.length ? `已激活：${info.activeTiers.map((tier) => tier.text).join("；")}` : "尚未达到第一档人数，调整属性或更换阵法。"}</p></div><div class="formation-grid">${D.formations.map((f) => { const p = state.formationCollection[f.id], own = p?.owned; return `<button class="formation-card ${state.formationId === f.id ? "active" : ""} ${own ? "" : "locked"}" data-action="formation" data-id="${f.id}" ${own ? "" : "disabled"}><span>${f.icon}</span><b>${own ? f.name : "未悟阵图"} <i>${f.rarity}</i></b><small>适配：${f.elements.join(" / ")} · 阵阶${p?.rank || 0}</small><em>${f.active}：${f.activeText}</em></button>`; }).join("")}</div></section>`;
  }
  function partyPicker() {
    const owned = D.disciples.filter((d) => state.roster[d.id].owned), bonds = C.getBonds(state.party), tags = Object.entries(C.getTagCounts(state.party)).filter(([, count]) => count >= 2);
    const party = state.party.map((id) => D.disciples.find((d) => d.id === id)), hasFront = party.slice(0, 3).some((d) => ["守御"].includes(d.role)), hasSustain = party.some((d) => ["疗愈", "丹术", "辅助"].includes(d.role));
    return `<section class="party-picker paper-panel"><div class="formation-heading"><span class="section-kicker">六人编队 · ${state.party.length}/6</span><h3>前三位前排，后三位后排</h3><p>点击弟子加入或撤下；至少保留3人。职业不锁死，但前排承受普通攻击。</p></div><div class="lineup-slots">${Array.from({ length: 6 }, (_, index) => { const d = party[index]; return `<div class="lineup-slot ${index < 3 ? "front" : "back"}"><small>${index < 3 ? `前排${index + 1}` : `后排${index - 2}`}</small>${d ? `<img src="${d.portrait}" alt=""><b>${d.name}</b><span>${d.element} · ${d.role}</span>` : `<b>空位</b><span>点击下方弟子加入</span>`}</div>`; }).join("")}</div><div class="party-options">${owned.map((d) => `<button class="party-chip ${state.party.includes(d.id) ? "active" : ""}" data-action="party" data-id="${d.id}"><img src="${d.portrait}" alt=""><span>${d.name}<small>${d.element} · ${d.role}</small></span></button>`).join("")}</div><div class="recommend-row"><button data-action="recommend-party" data-style="balanced">一键均衡推图</button><button data-action="recommend-party" data-style="burst">一键雷金爆发</button><button data-action="recommend-party" data-style="sustain">一键稳守续航</button></div><div class="newbie-advice"><b>新手配队检查</b><span class="${hasFront ? "ok" : "warn"}">${hasFront ? "✓ 前排有守御" : "! 建议前三位至少放1名守御"}</span><span class="${hasSustain ? "ok" : "warn"}">${hasSustain ? "✓ 队内有治疗/辅助" : "! 建议加入治疗或辅助"}</span><span>${state.party.length < 6 ? `尚有${6 - state.party.length}个空位；招到新弟子后继续补齐。` : "六人已满，下一步检查阵法2/4/6档。"}</span></div><div class="synergy-strip">${bonds.length ? bonds.map((b) => `<div><b>${b.name}</b><span>${b.effect}</span></div>`).join("") : `<div><b>尚无人物羁绊</b><span>优先保证前排、续航，再追求羁绊和属性阵法。</span></div>`}${tags.map(([tag, count]) => `<div><b>${tag}共鸣 ×${count}</b><span>角色机制标签，可与羁绊共同生效。</span></div>`).join("")}</div></section>`;
  }
  function stageCards() {
    return D.stages.map((stage, index) => {
      const locked = index > state.expeditionProgress, clearKey = `${state.currentCycle}:${index}`, cleared = state.cleared.includes(clearKey), reward = cleared ? stage.repeat : stage.reward;
      const recruit = stage.recruit && D.disciples.find((d) => d.id === stage.recruit);
      return `<article class="stage-card ${locked ? "locked" : ""} ${cleared ? "cleared" : ""}"><span class="stage-number">${stage.boss ? "秘境之主" : `节点 ${index + 1}`} · 第${state.currentCycle}轮</span><h3>${stage.name}</h3><p>${stage.story}</p><p>敌：${stage.enemy} · ${stage.element}属</p><small class="reward-preview">${cleared ? "重复" : "首胜"}：${Object.entries(reward).map(([k, v]) => `${RESOURCE_NAMES[k]}${v}`).join(" · ")}${!cleared && recruit ? ` · ${recruit.name}来投` : ""}</small><button class="${stage.boss ? "primary-button" : "small-button"}" data-action="start-battle" data-id="${index}" ${locked ? "disabled" : ""}>${cleared ? "再次历练" : "进入"}</button></article>`;
    }).join("");
  }
  function unitRows(list) {
    return list.map((u) => `<div class="unit-row ${u.hp <= 0 ? "dead" : ""}">${u.portrait ? `<img src="${u.portrait}" alt="">` : `<div class="enemy-sigil">${u.element}</div>`}<div class="unit-body"><div class="unit-meta"><b>${u.name}</b><span>${u.element} · ${u.role}${u.position ? ` · ${u.position === "front" ? "前排" : "后排"}` : ""}</span></div><div class="hp-bar"><span style="width:${Math.max(0, u.hp / u.maxHp * 100)}%"></span></div><div class="unit-meta"><small>${u.hp}/${u.maxHp}${u.shield ? ` +盾${u.shield}` : ""}</small><small>${u.side === "player" ? `灵力 ${u.energy}/${u.skillCost}` : (u.armorBreak ? "破防" : "")}</small></div><div class="energy-bar"><span style="width:${Math.min(100, u.energy || 0)}%"></span></div></div></div>`).join("");
  }
  function enemyIntent() {
    const boss = activeBattle.enemies.find((u) => u.role === "Boss" && u.hp > 0);
    if (boss && (activeBattle.round + 1) % 3 === 0) return "敌方预兆：墨蛟下轮将释放群体墨潮，建议守势。";
    return "敌方预兆：普通攻击。可强攻抢节奏，或蓄灵准备绝技。";
  }
  function battleMarkup() {
    const formation = D.formations.find((f) => f.id === activeBattle.formationId);
    const tactics = [{ id: "assault", name: "强攻", text: "伤害+25%，受伤+10%" }, { id: "guard", name: "守势", text: "伤害-14%，受伤-38%" }, { id: "charge", name: "蓄灵", text: "伤害-18%，回灵+20" }];
    return `<div class="battlefield"><section class="combat-side paper-panel"><h3>门下弟子 · ${activeBattle.players.length}人</h3>${unitRows(activeBattle.players)}</section><section class="combat-log paper-panel"><span class="intent">${enemyIntent()}</span><h3>${D.stages[activeBattle.stageId].name} · 第${activeBattle.round}轮</h3>${activeBattle.players.some((u) => u.skillType === "thunder") ? `<div class="thunder-marks">雷印 ${"●".repeat(activeBattle.thunderMarks)}${"○".repeat(5 - activeBattle.thunderMarks)}</div>` : ""}${activeBattle.log.map((line) => `<p>${line}</p>`).join("")}</section><section class="combat-side paper-panel"><h3>秘境敌人</h3>${unitRows(activeBattle.enemies)}${activeBattle.finished ? `<div class="battle-actions"><button class="primary-button" data-action="settle" ${activeBattle.victory ? "" : "disabled"}>${activeBattle.victory ? "领取奖励" : "整备后再战"}</button><button class="ink-button" data-action="leave-battle">返回</button></div>` : `<div class="tactic-picker">${tactics.map((t) => `<button class="${selectedTactic === t.id ? "active" : ""}" data-action="tactic" data-id="${t.id}"><b>${t.name}</b><small>${t.text}</small></button>`).join("")}</div><button class="formation-active" data-action="formation-active" ${activeBattle.formationReady ? "" : "disabled"}>阵法 · ${formation.active}${activeBattle.formationReady ? `（适配${activeBattle.formationCount}人）` : "（已用）"}</button><button class="formation-active master" data-action="master-skill" ${activeBattle.masterReady ? "" : "disabled"}>掌门技 · 清心令${activeBattle.masterReady ? "" : "（已用）"}</button><div class="battle-actions"><button class="primary-button" data-action="battle-round">执行本轮</button><button class="ink-button" data-action="auto-battle">按当前战术自动</button></div>`}</section></div>`;
  }
  function renderExpedition() {
    if (activeBattle) { view.innerHTML = `${header("秘境交锋", "每轮先看敌方预兆，再选择强攻、守势或蓄灵；阵术每场只能使用一次。")}${battleMarkup()}`; return; }
    view.innerHTML = `${header("残碑秘境", `当前第${state.currentCycle}轮 · 累计胜利${state.expeditionWins}次。Boss后秘境会重启，不再一次性消失。`)}<div class="stage-list">${stageCards()}</div>${partyPicker()}${formationPanel()}`;
  }

  function sandboxUnitRows(units) {
    return units.map((u) => {
      const statuses = (u.statuses || []).map((s) => s.id + (s.stacks > 1 ? "x" + s.stacks : "")).join(" · ");
      const shield = u.shieldHp ? ` 盾${Math.round(u.shieldHp)}` : "";
      return `<div class="unit-row"><b>${u.name}</b><small>${u.element} · ${u.position} · SPD${u.speed} · 灵力${u.energy || 0}</small><div class="bar"><span style="width:${Math.max(0, u.hp / u.maxHp * 100)}%"></span></div><small>HP ${u.hp}/${u.maxHp}${shield}</small>${statuses ? `<span class="unit-status">${statuses}</span>` : ""}</div>`;
    }).join("");
  }
  function ensureSandbox() {
    if (sandboxBattle) return;
    const presets = Combat.createSandboxPresets();
    const cfg = { ...presets[sandboxPreset] || presets.balanced, seed: Number(sandboxSeed) || 20260905 };
    sandboxBattle = Combat.createEncounter(cfg);
  }
  function renderSandbox() {
    if (!Combat) {
      view.innerHTML = `${header("战斗沙盒", "0.5A 引擎未加载。")}<p class="sandbox-note">缺少 combat-0.5a.js</p>`;
      return;
    }
    ensureSandbox();
    const b = sandboxBattle;
    const queue = (!b.finished && b.queue && b.queue.length) ? b.queue : Combat.getTimeline(b);
    const formation = D.formations.find((f) => f.id === b.formationId) || D.formations[0];
    view.innerHTML = `${header("0.5A 战斗沙盒", "速度队列原型验收入口。秘境仍使用旧 battleRound，直至适配层就绪。")}
      <section class="paper-panel sandbox-panel">
        <p class="sandbox-note">Prototype：配置驱动技能/状态、前3后3+嘲讽、五行轻克制、雷/风无硬克。不消耗体力，不改抽卡。</p>
        <div class="sandbox-controls">
          <label>预设 <select data-action="sandbox-preset">${Object.keys(Combat.createSandboxPresets()).map((k) => `<option value="${k}" ${k === sandboxPreset ? "selected" : ""}>${k}</option>`).join("")}</select></label>
          <label>Seed <input type="number" value="${sandboxSeed}" data-action="sandbox-seed-input" style="width:8rem"></label>
          <button class="ink-button" data-action="sandbox-reset">重开</button>
          <button class="primary-button" data-action="sandbox-round" ${b.finished ? "disabled" : ""}>执行一轮</button>
          <button class="ink-button" data-action="sandbox-auto" ${b.finished ? "disabled" : ""}>自动至结束</button>
          <button class="formation-active" data-action="sandbox-formation" ${b.formationReady ? "" : "disabled"}>阵法·${formation.active}${b.formationReady ? "" : "（已用）"}</button>
          <button class="formation-active master" data-action="sandbox-master" ${b.masterReady ? "" : "disabled"}>掌门技·清心令${b.masterReady ? "" : "（已用）"}</button>
        </div>
        <p class="sandbox-queue">速度队列：${queue.map((q) => q.uid + "(" + Math.round(q.speed) + ")").join(" → ") || "—"}</p>
        <p class="sandbox-note">回合 ${b.round}/${b.maxRounds} · ${b.finished ? (b.victory ? "胜利" : "失败") : "进行中"} · engine ${b.engineVersion}</p>
      </section>
      <div class="battlefield">
        <section class="combat-side paper-panel"><h3>我方</h3>${sandboxUnitRows(b.allies)}</section>
        <section class="combat-log paper-panel"><h3>${b.name}</h3>${b.log.map((line) => `<p>${line}</p>`).join("")}</section>
        <section class="combat-side paper-panel"><h3>敌方</h3>${sandboxUnitRows(b.enemies)}</section>
      </div>`;
  }
    function renderChronicle() {
    view.innerHTML = `${header("宗门纪事", "关键行为自动存档在当前浏览器。")}
      <div class="chronicle"><section class="paper-panel log-list">${state.log.map((line) => `<div class="log-entry">${line}</div>`).join("")}</section><aside class="paper-panel about-panel"><h3>0.4可玩循环</h3><ul><li>经营：四资源生产、派驻、建筑交叉消耗。</li><li>养成：炼气十四层起步、绝技与五重命印。</li><li>构筑：六人前后排、五行、羁绊与阵法档位。</li><li>结缘：人物UR 3%、六十抽保底与限定50/50。</li><li>回流：秘境循环、Boss奖励重新投入宗门成长。</li></ul></aside></div>`;
  }

  function showModal(html) { const modal = el("#modal"); modal.innerHTML = html; modal.hidden = false; }
  function closeModal() { el("#modal").hidden = true; el("#modal").innerHTML = ""; }
  function summonModal(results) {
    const ur = results.find((d) => d.rarity === "UR"), reveal = ur ? `ur-reveal ${ur.element === "雷" ? "thunder" : "wind"}` : "";
    showModal(`<div class="modal-card ${reveal}">${ur ? `<div class="omen"><span>${ur.element === "雷" ? "雷云聚顶 · 天光裂卷" : "云卷开卷 · 风纹显现"}</span><b>异灵根 · ${ur.element}</b></div>` : `<div class="story-seal">缘</div>`}<h2>${ur ? "天命异象" : "山门有客"}</h2><div class="summon-results">${results.map((d) => `<div class="result-card ${d.rarity.toLowerCase()}"><img src="${d.portrait}" alt="${d.name}"><b>${d.name}</b><small>${d.rarity} · ${d.element} · ${d.role}</small><small>${d.overflowDust ? `满命重复 · 化为${d.overflowDust}天命尘` : d.copy ? `重复结缘 · ${d.name}本命印+1` : "新弟子 · 人物小传解锁"}</small></div>`).join("")}</div><button class="primary-button" data-action="close-modal">收入门下</button></div>`);
  }
  function formationSummonModal(results) {
    const ur = results.find((f) => f.rarity === "UR");
    showModal(`<div class="modal-card ${ur ? "ur-reveal formation-ur" : ""}"><div class="story-seal">阵</div><h2>${ur ? "太虚阵图现世" : "阵纹显化"}</h2><div class="formation-results">${results.map((f) => `<div class="formation-result ${f.rarity.toLowerCase()}"><span>${f.icon}</span><b>${f.name}</b><small>${f.rarity} · ${f.copy ? f.overflowDust ? `满阶转${f.overflowDust}天命尘` : "重复阵图+1" : "新阵法解锁"}</small></div>`).join("")}</div><button class="primary-button" data-action="close-modal">收入阵阁</button></div>`);
  }
  function assignmentModal(buildingId) {
    const building = D.buildings.find((b) => b.id === buildingId), owned = D.disciples.filter((d) => state.roster[d.id].owned);
    showModal(`<div class="modal-card"><div class="story-seal">任</div><h2>${building.name} · 择任管事</h2><p>专长匹配产出+22%，普通任职+8%。一名弟子只能管理一处建筑。</p><div class="assign-grid">${owned.map((d) => `<button data-action="assign" data-building="${buildingId}" data-id="${d.id}"><img src="${d.portrait}" alt=""><span><b>${d.name}</b><small>${d.profession}${building.preferred.includes(d.profession) ? " · 专长匹配" : ""}</small></span></button>`).join("")}</div><button class="ink-button" data-action="close-modal">取消</button></div>`);
  }
  function breakthroughModal(disciple, realm, major) {
    showModal(`<div class="modal-card breakthrough-card"><div class="breakthrough-portrait"><img src="${disciple.portrait}" alt="${disciple.name}"></div><div class="story-seal">破</div><h2>${disciple.name} · ${realm.name}</h2><p>${major ? "灵气冲开桎梏，山中风声骤歇。大境界之前没有侥幸，只有积累。" : "经脉再拓一层，离筑基仍有漫长路途。"}</p><button class="primary-button" data-action="close-modal">记入宗门谱</button></div>`);
  }
  function openStory() {
    showModal(`<div class="modal-card"><div class="story-seal">残</div><h2>掌门印</h2><p>门下三人都只是炼气一层。若想筑基，要走完十四层小境界，还要攒出筑基资源。青石坊七日后上山收债，而南麓秘境正在重生。</p><button class="primary-button" data-action="close-modal">从炼气一层开始</button></div>`);
  }
  function setTab(tab) { activeTab = tab; activeBattle = null; render(); window.scrollTo({ top: Math.max(0, el(".main-nav").offsetTop - 80), behavior: "smooth" }); }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]"); if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === "tab") setTab(button.dataset.tab);
    if (action === "guide-tab") setTab(button.dataset.tab);
    if (action === "claim") commit(C.claimIdle(state));
    if (action === "quick-harvest") commit(C.quickHarvest(state));
    if (action === "resource-choice") commit(C.buyResourceChoice(state, button.dataset.resource));
    if (action === "upgrade-building") commit(C.upgradeBuilding(state, button.dataset.id));
    if (action === "finish-building") commit(C.finishBuildingWithJade(state, button.dataset.id));
    if (action === "upgrade-sect") commit(C.upgradeSect(state));
    if (action === "repay") commit(C.repayDebt(state));
    if (action === "select-disciple") { selectedDisciple = button.dataset.id; renderDisciples(); }
    if (action === "train") commit(C.trainDisciple(state, button.dataset.id));
    if (action === "advance") { const result = commit(C.advanceRealm(state, button.dataset.id)); if (result.ok) breakthroughModal(result.disciple, result.realm, result.major || result.phase); }
    if (action === "skill-up") commit(C.upgradeSkill(state, button.dataset.id));
    if (action === "star-up") commit(C.ascendStar(state, button.dataset.id));
    if (action === "recruit") { const result = commit(C.recruit(state, Number(button.dataset.count))); if (result.ok) summonModal(result.results); }
    if (action === "limited-recruit") { const result = commit(C.limitedRecruit(state, Number(button.dataset.count))); if (result.ok) summonModal(result.results); }
    if (action === "free-recruit") { const result = commit(C.freeRecruit(state)); if (result.ok) summonModal(result.results); }
    if (action === "recruit-mode") { recruitMode = button.dataset.mode; renderRecruit(); }
    if (action === "formation-recruit") { const result = commit(C.formationRecruit(state, Number(button.dataset.count))); if (result.ok) formationSummonModal(result.results); }
    if (action === "refine-formation") commit(C.refineFormation(state, button.dataset.id));
    if (action === "purchase") commit(C.purchaseDemo(state, button.dataset.id));
    if (action === "claim-monthly") commit(C.claimMonthly(state));
    if (action === "dust-exchange") commit(C.exchangeDust(state, button.dataset.id));
    if (action === "open-assign") assignmentModal(button.dataset.id);
    if (action === "assign") { closeModal(); commit(C.assignDisciple(state, button.dataset.building, button.dataset.id)); }
    if (action === "party") {
      const selected = state.party.includes(button.dataset.id);
      if (selected && state.party.length <= 3) { toast("出战阵容至少保留3名弟子。"); return; }
      if (!selected && state.party.length >= 6) { toast("阵容已满，请先撤下一名弟子。"); return; }
      commit(C.setParty(state, selected ? state.party.filter((id) => id !== button.dataset.id) : [...state.party, button.dataset.id]));
    }
    if (action === "recommend-party") commit(C.recommendParty(state, button.dataset.style));
    if (action === "formation") commit(C.setFormation(state, button.dataset.id));
    if (action === "start-battle") { activeBattle = C.createBattle(state, Number(button.dataset.id)); if (!activeBattle) toast("请先配置三名已入门弟子。"); selectedTactic = "balanced"; renderExpedition(); }
    if (action === "tactic") { selectedTactic = button.dataset.id; renderExpedition(); }
    if (action === "formation-active") { activeBattle = C.useFormationActive(activeBattle); renderExpedition(); }
    if (action === "master-skill") { activeBattle = C.useMasterSkill(activeBattle); renderExpedition(); }
    if (action === "battle-round") { activeBattle = C.battleRound(activeBattle, selectedTactic); renderExpedition(); }
    if (action === "auto-battle") { let safety = 0; while (activeBattle && !activeBattle.finished && safety < 18) { activeBattle = C.battleRound(activeBattle, selectedTactic); safety += 1; } renderExpedition(); }
    if (action === "settle") { const result = commit(C.settleBattle(state, activeBattle), false); if (result.ok) activeBattle = null; render(); }
    if (action === "leave-battle") { activeBattle = null; renderExpedition(); }
    if (action === "sandbox-reset") {
      const input = view.querySelector("[data-action='sandbox-seed-input']");
      if (input) sandboxSeed = Number(input.value) || sandboxSeed;
      const sel = view.querySelector("select[data-action='sandbox-preset']");
      if (sel) sandboxPreset = sel.value;
      sandboxBattle = null; ensureSandbox(); renderSandbox();
    }
    if (action === "sandbox-round") { ensureSandbox(); sandboxBattle = Combat.runRound(sandboxBattle); renderSandbox(); }
    if (action === "sandbox-auto") { ensureSandbox(); sandboxBattle = Combat.runUntilDone(sandboxBattle); renderSandbox(); }
    if (action === "sandbox-formation") { ensureSandbox(); sandboxBattle = Combat.useFormationActive(sandboxBattle); renderSandbox(); }
    if (action === "sandbox-master") { ensureSandbox(); sandboxBattle = Combat.useMasterSkill(sandboxBattle); renderSandbox(); }
    if (action === "close-modal") closeModal();
    if (action === "reset" && window.confirm("清除0.4存档并重新开始？")) { localStorage.removeItem(SAVE_KEY); state = C.createInitialState(); activeTab = "sect"; activeBattle = null; save(); render(); openStory(); }
  });


  document.addEventListener("change", (event) => {
    const node = event.target.closest("[data-action]");
    if (!node) return;
    const action = node.dataset.action;
    if (action === "sandbox-preset") { sandboxPreset = node.value; sandboxBattle = null; ensureSandbox(); renderSandbox(); }
    if (action === "sandbox-seed-input") { sandboxSeed = Number(node.value) || sandboxSeed; }
  });

  const firstVisit = !localStorage.getItem(SAVE_KEY); save(); render(); if (firstVisit) openStory();
})();
