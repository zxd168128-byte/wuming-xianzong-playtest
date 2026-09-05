(function (root) {
  const disciples = [
    {
      id: "fang-yan", name: "方砚", rarity: "SR", element: "土", role: "守御", profession: "执事",
      baseHp: 360, baseAtk: 54, baseDef: 42, speed: 72, startCultivation: 82,
      skill: "镇岳式", skillText: "护住全队并反震来敌。",
      talent: "旧账清明", talentText: "担任执事时，债务偿还成本降低。",
      story: "曾替商队押送灵矿，因不肯做假账而被逐。"
    },
    {
      id: "gu-nian", name: "顾念", rarity: "R", element: "木", role: "疗愈", profession: "灵植师",
      baseHp: 260, baseAtk: 42, baseDef: 25, speed: 84, startCultivation: 34,
      skill: "回春引", skillText: "治疗伤势最重的弟子。",
      talent: "识草", talentText: "驻守灵田时，药草产量提高20%。",
      story: "山下药农之女，认得百草，却从未摸过一块中品灵石。"
    },
    {
      id: "su-wan", name: "苏晚", rarity: "R", element: "火", role: "术攻", profession: "丹童",
      baseHp: 235, baseAtk: 60, baseDef: 22, speed: 91, startCultivation: 49,
      skill: "流火符", skillText: "对后排敌人造成灼烧伤害。",
      talent: "守炉", talentText: "驻守丹房时，炼丹消耗降低15%。",
      story: "嘴硬心细的丹童，能守三天三夜的炉火。"
    },
    {
      id: "shen-qingli", name: "沈青璃", rarity: "SSR", element: "水", role: "剑修", profession: "剑首",
      baseHp: 330, baseAtk: 105, baseDef: 35, speed: 112, startCultivation: 70,
      skill: "霜河断", skillText: "凝霜成河，对单体造成高额剑伤。",
      talent: "太阴剑体", talentText: "敌方生命低于40%时，伤害提高35%。",
      story: "落魄剑修世家的最后传人。她的断剑仍在等待一个名字。"
    },
    {
      id: "lu-xuanchuan", name: "陆玄川", rarity: "UR", element: "雷", formationElements: ["金", "水"], role: "破阵", profession: "巡山使",
      baseHp: 360, baseAtk: 104, baseDef: 39, speed: 108, startCultivation: 66,
      skill: "惊雷踏", skillText: "贯穿前后排，并削弱敌方防御。",
      talent: "天雷道骨", talentText: "队友会心叠加雷印；5层后引落天雷，无视35%防御并破盾。",
      story: "曾在雷泽失踪三年。归来后，他不再记得自己的影子。"
    },
    {
      id: "ning-hongxiao", name: "宁红绡", rarity: "SSR", element: "火", role: "丹术", profession: "炼丹师",
      baseHp: 300, baseAtk: 89, baseDef: 31, speed: 98, startCultivation: 74,
      skill: "赤鸾火", skillText: "引燃敌阵，并为全队回复灵力。",
      talent: "赤鸾余血", talentText: "首次濒死时涅槃，恢复45%生命。",
      story: "她只炼救命的丹，从不解释血脉为何惧怕月光。"
    },
    {
      id: "pei-zhou", name: "裴舟", rarity: "SR", element: "金", role: "游击", profession: "寻矿师",
      baseHp: 285, baseAtk: 76, baseDef: 29, speed: 108, startCultivation: 55,
      skill: "藏锋", skillText: "避开一次攻击后刺向要害。",
      talent: "听脉", talentText: "秘境结算时有概率多获得灵石。",
      story: "能从石声里听出矿脉，也能听出一句话里藏了几分假。"
    },
    {
      id: "lin-xiaoyu", name: "林小雨", rarity: "SR", element: "水", role: "符师", profession: "制符师",
      baseHp: 270, baseAtk: 70, baseDef: 28, speed: 99, startCultivation: 46,
      skill: "缚潮符", skillText: "封住敌方最快单位一轮。",
      talent: "一笔成符", talentText: "每次秘境首战获得一次伤害减免。",
      story: "逃出纸坊的学徒，袖中藏着一张不敢展开的古符。"
    },
    {
      id: "tie-shan", name: "铁山", rarity: "R", element: "金", role: "守御", profession: "炼器师",
      baseHp: 330, baseAtk: 46, baseDef: 39, speed: 63, startCultivation: 28,
      skill: "横炉", skillText: "举炉格挡，并嘲讽前排敌人。",
      talent: "百炼凡铁", talentText: "炼器阁开放后可成长为顶级炼器师。",
      story: "没有灵根世家的血，却能让一块废铁多活十年。"
    },
    {
      id: "wen-yao", name: "温遥", rarity: "R", element: "木", role: "辅助", profession: "驭兽学徒",
      baseHp: 250, baseAtk: 48, baseDef: 24, speed: 88, startCultivation: 31,
      skill: "雀鸣", skillText: "灵雀扰敌，提高全队出手速度。",
      talent: "兽语", talentText: "灵兽园开放后可触发稀有驯养事件。",
      story: "总与一只看不见的青雀说话，旁人都说那只是山风。"
    },
    {
      id: "si-tianheng", name: "司天衡", rarity: "UR", element: "风", formationElements: ["木", "水"], role: "辅助", profession: "阵法师",
      baseHp: 390, baseAtk: 98, baseDef: 42, speed: 124, startCultivation: 88,
      skill: "天衡御风", skillText: "驱散减益、全队提速，并在同门释放绝技后追击。",
      talent: "周天风轨", talentText: "同门释放绝技后自身追击，并为行动最慢的弟子推进灵力。",
      story: "他从坠毁的观星台中醒来，记得天下每一道灵脉，却不记得自己的来处。"
    }
  ];

  const buildings = [
    { id: "vein", name: "下品灵脉", icon: "石", resource: "stone", output: "灵石", preferred: ["巡山使", "阵法师"], baseCost: { wood: 70, stone: 35, food: 12, herbs: 8 }, desc: "灵脉微薄，却是宗门所有开销的根。" },
    { id: "field", name: "灵田", icon: "田", resource: "food", output: "灵粮", preferred: ["灵植师", "执事"], baseCost: { wood: 55, stone: 30, food: 15, herbs: 6 }, desc: "种植辟谷粟，支撑修炼、派遣与探索。" },
    { id: "garden", name: "药园", icon: "药", resource: "herbs", output: "灵药", preferred: ["灵植师", "丹童", "炼丹师"], baseCost: { wood: 65, stone: 28, food: 12, herbs: 10 }, desc: "培育聚气藤与凝露草，中期突破的命脉。" },
    { id: "forest", name: "灵林", icon: "木", resource: "wood", output: "灵木", preferred: ["寻矿师", "炼器师", "驭兽学徒"], baseCost: { wood: 45, stone: 35, food: 14, herbs: 5 }, desc: "采伐后需养林，前期扩建最紧缺的资源。" },
    { id: "alchemy", name: "丹房", icon: "丹", resource: null, output: "修炼效率", preferred: ["丹童", "炼丹师"], baseCost: { wood: 80, stone: 45, food: 16, herbs: 15 }, desc: "派驻丹师可提高闭关所得，不直接生产资源。" }
  ];

  const portraits = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "ur-sitianheng"];
  const combatProfiles = {
    "fang-yan": { tags: ["凡骨", "守山", "稳守"], skillType: "guard", skillCost: 80, skillText2: "全队获得护盾，自己承受更多攻击。" },
    "gu-nian": { tags: ["凡骨", "百草", "济世"], skillType: "heal", skillCost: 65, skillText2: "治疗生命最低的弟子，并净化灼烧。" },
    "su-wan": { tags: ["凡骨", "丹火", "后发"], skillType: "burn", skillCost: 70, skillText2: "攻击后附加两轮灼烧。" },
    "shen-qingli": { tags: ["剑修", "世家遗脉", "一击"], skillType: "execute", skillCost: 90, skillText2: "高额单体剑伤；目标生命越低，伤害越高。" },
    "lu-xuanchuan": { tags: ["异灵根", "雷法", "秘境归人", "破阵"], skillType: "thunder", skillCost: 75, skillText2: "贯穿敌阵并降低防御；队友会心积攒雷印，引发破盾天雷。" },
    "ning-hongxiao": { tags: ["丹火", "血脉", "济世"], skillType: "phoenix", skillCost: 85, skillText2: "群体火伤，并为全队回复灵力。" },
    "pei-zhou": { tags: ["散修", "探索", "先手"], skillType: "evade", skillCost: 60, skillText2: "突袭要害，并使自身闪避下一次攻击。" },
    "lin-xiaoyu": { tags: ["符箓", "控制", "后发"], skillType: "bind", skillCost: 70, skillText2: "封禁最快敌人一轮，并削减其灵力。" },
    "tie-shan": { tags: ["凡骨", "炼器", "稳守"], skillType: "taunt", skillCost: 70, skillText2: "获得高额减伤并保护生命最低的队友。" },
    "wen-yao": { tags: ["驭兽", "山野", "先手"], skillType: "haste", skillCost: 60, skillText2: "灵雀扰敌，全队获得速度与会心提升。" },
    "si-tianheng": { tags: ["异灵根", "风法", "阵法", "先手"], skillType: "wind", skillCost: 70, skillText2: "驱散全队减益并提速；同门绝技会触发御风追击。" }
  };
  disciples.forEach((disciple, index) => Object.assign(disciple, combatProfiles[disciple.id], {
    portrait: `assets/portraits/portrait-${portraits[index]}.webp`,
    formationElements: disciple.formationElements || [disciple.element],
    starNodes: [
      `一命·${disciple.skill}强化：绝技效果提高12%`,
      "二命·根骨淬炼：生命、攻击、防御提高8%",
      "三命·灵台澄明：开战额外获得10点灵力",
      `四命·${disciple.talent}显化：解锁专属战斗变化`,
      `五命·真意圆满：${disciple.skill}效果再提高8%`
    ]
  }));

  const formations = [
    { id: "starter", name: "三才聚灵阵", rarity: "SR", free: true, icon: "合", elements: ["金", "木", "水", "火", "土"], mode: "unique", tiers: [{ count: 3, text: "三种五行：全队生命+8%", stats: { hp: 0.08 } }, { count: 5, text: "五行俱全：全队攻击、防御+10%", stats: { atk: 0.10, def: 0.10 } }], active: "三才聚灵", activeType: "starter", activeText: "全队回复20点灵力。" },
    { id: "earth", name: "厚土守山阵", rarity: "SR", icon: "山", elements: ["土"], tiers: [{ count: 2, text: "2土：防御+10%", stats: { def: 0.10 } }, { count: 4, text: "4土：生命+14%", stats: { hp: 0.14 } }, { count: 6, text: "6土：开战获得护盾", stats: { def: 0.10 } }], active: "玄岩护界", activeType: "earth", activeText: "全队获得护盾并回复8%生命。" },
    { id: "wood", name: "青木回春阵", rarity: "SR", icon: "生", elements: ["木", "水"], tiers: [{ count: 2, text: "2木/水：生命+8%", stats: { hp: 0.08 } }, { count: 4, text: "4木/水：治疗+15%", stats: { def: 0.08 } }, { count: 6, text: "6木/水：每轮回灵", stats: { hp: 0.10 } }], active: "万木回春", activeType: "wood", activeText: "立即治疗全队20%最大生命。" },
    { id: "fire", name: "烈阳焚天阵", rarity: "SSR", icon: "炎", elements: ["火"], tiers: [{ count: 2, text: "2火：火系攻击+12%", stats: { atk: 0.12 } }, { count: 4, text: "4火：灼烧增伤25%", stats: { atk: 0.08 } }, { count: 6, text: "6火：烈阳爆发", stats: { speed: 0.10 } }], active: "赤霞燎原", activeType: "fire", activeText: "敌方全体附加三轮灼烧。" },
    { id: "sword", name: "七曜断河阵", rarity: "SSR", icon: "剑", elements: ["金", "雷"], tiers: [{ count: 2, text: "2金/雷：攻击+10%", stats: { atk: 0.10 } }, { count: 4, text: "4金/雷：破防伤害+15%", stats: { atk: 0.08 } }, { count: 6, text: "6金/雷：会心后回灵", stats: { speed: 0.10 } }], active: "七曜同辉", activeType: "sword", activeText: "下轮攻击提高30%，绝技需求降低。" },
    { id: "storm", name: "风雷天罡阵", rarity: "UR", icon: "霆", elements: ["雷", "风", "金", "水", "木"], tiers: [{ count: 2, text: "2适配：速度+8%", stats: { speed: 0.08 } }, { count: 4, text: "4适配：攻击+12%", stats: { atk: 0.12 } }, { count: 6, text: "6适配：绝技触发追击", stats: { speed: 0.08, atk: 0.08 } }], active: "天罡疾行", activeType: "storm", activeText: "全队获得35点灵力与会心。" },
    { id: "cycle", name: "五行周天阵", rarity: "UR", icon: "轮", elements: ["金", "木", "水", "火", "土", "雷", "风"], mode: "unique", tiers: [{ count: 3, text: "3种属性：攻防+8%", stats: { atk: 0.08, def: 0.08 } }, { count: 5, text: "5种属性：生命+15%", stats: { hp: 0.15 } }, { count: 6, text: "6种属性：周天循环", stats: { atk: 0.10, speed: 0.08 } }], active: "周天轮转", activeType: "cycle", activeText: "治疗、护盾、回灵同时生效。" }
  ];

  const namedBonds = [
    { id: "old-guard", name: "残门旧人", members: ["fang-yan", "gu-nian", "su-wan"], effect: "全队生命+12%，首轮防御+20%。" },
    { id: "frost-thunder", name: "霜雷相济", members: ["shen-qingli", "lu-xuanchuan"], effect: "会心率+10%，对破防目标伤害+15%。" },
    { id: "hearth", name: "炉火相承", members: ["su-wan", "ning-hongxiao"], effect: "灼烧伤害+25%，丹火技能为队友回灵。" },
    { id: "mortal-craft", name: "凡骨百工", members: ["fang-yan", "gu-nian", "tie-shan"], effect: "R弟子攻防+18%，秘境重复奖励+10%。" },
    { id: "wild-path", name: "山野寻踪", members: ["pei-zhou", "wen-yao"], effect: "全队速度+12%，首轮会心+15%。" }
  ];

  const realms = [];
  for (let layer = 1; layer <= 14; layer += 1) realms.push({ id: `qi-${layer}`, name: `炼气${layer}层`, major: "炼气", layer, exp: 24 + layer * 4 });
  ["筑基", "结丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫"].forEach((major, majorIndex) => {
    ["初期", "中期", "后期", "巅峰"].forEach((phase, phaseIndex) => {
      for (let step = 1; step <= 5; step += 1) realms.push({
        id: `${majorIndex + 1}-${phaseIndex}-${step}`,
        name: `${major}${phase}·${step}重`,
        major,
        phase,
        step,
        exp: Math.round(140 * Math.pow(1.68, majorIndex) * (1 + phaseIndex * 0.50) * (1 + (step - 1) * 0.18))
      });
    });
  });
  realms.push({ id: "ascended", name: "羽化飞升", major: "飞升", exp: 999999 });

  const stages = [
    { id: 0, name: "雾林入口", enemy: "灰脊狼", element: "土", count: 2, hp: 175, atk: 29, def: 14, speed: 71, recruit: "tie-shan", reward: { stone: 70, herbs: 20, food: 80, seals: 2 }, repeat: { stone: 24, herbs: 8, food: 24 }, story: "失踪的采药人留下了沾血的竹篓。" },
    { id: 1, name: "缚藤石径", enemy: "噬灵藤", element: "木", count: 2, hp: 225, atk: 34, def: 17, speed: 58, recruit: "wen-yao", reward: { stone: 90, wood: 120, food: 45, seals: 2 }, repeat: { stone: 32, wood: 38, food: 16 }, story: "石缝间的藤蔓正在吸食地脉灵气。" },
    { id: 2, name: "废观残垣", enemy: "黑风散修", element: "金", count: 3, hp: 210, atk: 40, def: 21, speed: 86, recruit: "pei-zhou", reward: { stone: 120, herbs: 55, wood: 60, seals: 2, jade: 30 }, repeat: { stone: 42, herbs: 18, wood: 22 }, story: "有人先一步来到秘境，却不愿与你分享发现。" },
    { id: 3, name: "墨蛟潭", enemy: "墨鳞蛟", element: "水", count: 1, hp: 1250, atk: 120, def: 28, speed: 92, boss: true, reward: { stone: 260, herbs: 80, food: 160, wood: 180, renown: 120, seals: 2, jade: 80 }, repeat: { stone: 70, herbs: 20, food: 50, wood: 60, jade: 15 }, story: "潭底压着半块宗门旧印，蛟影已经睁眼。" }
  ];

  const banner = {
    featured: "lu-xuanchuan", name: "雷泽归人", subtitle: "UR陆玄川限时结缘",
    price: 160, tenPrice: 1600
  };
  const shopItems = [
    { id: "jade-60", type: "jade", name: "一匣灵玉", price: "¥6", jade: 60, repeatable: true },
    { id: "jade-300", type: "jade", name: "三百灵玉", price: "¥30", jade: 300, repeatable: true },
    { id: "jade-980", type: "jade", name: "九百八十灵玉", price: "¥98", jade: 980, repeatable: true },
    { id: "monthly", type: "monthly", name: "洞天月契", price: "¥30", jade: 300, days: 30, repeatable: true },
    { id: "newcomer", type: "bundle", name: "新掌门启程礼", price: "¥6", rewards: { wood: 800, food: 600, herbs: 300, seals: 10 }, repeatable: false },
    { id: "resource", type: "bundle", name: "百工急援箱", price: "¥18", rewards: { wood: 1200, food: 900, herbs: 600, stone: 900 }, repeatable: true }
  ];
  const DATA = {
    disciples, buildings, stages, formations, namedBonds, realms, banner, shopItems,
    rarityRates: { SR: 0.82, SSR: 0.15, UR: 0.03 },
    formationRates: { SR: 0.96, SSR: 0.03, UR: 0.01 },
    version: "0.4.1"
  };
  root.SectData = DATA;
  if (typeof module !== "undefined" && module.exports) module.exports = DATA;
})(typeof globalThis !== "undefined" ? globalThis : this);
