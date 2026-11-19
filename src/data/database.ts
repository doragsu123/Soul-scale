import {
  RelicDefinition,
  RelicId,
  ToolDefinition,
  ToolId,
  ToolInstance,
  WeightDefinition,
  WeightId,
  WeightInstance,
} from '../types/game';

export const WEIGHT_DATABASE: Record<WeightId, WeightDefinition> = {
  w_lead: {
    id: 'w_lead',
    name: '鉛のおもり',
    weight: 20,
    soul: 20,
    sinBonus: 0,
    price: 100,
    rarity: 'common',
    effectDesc: '',
  },
  w_cast: {
    id: 'w_cast',
    name: '鋳鉄の分銅',
    weight: 15,
    soul: 18,
    sinBonus: 0,
    price: 100,
    rarity: 'common',
    effectDesc: '',
  },
  w_iron: {
    id: 'w_iron',
    name: '鉄の小塊',
    weight: 10,
    soul: 12,
    sinBonus: 0,
    price: 110,
    rarity: 'common',
    effectDesc: '',
  },
  w_copper: {
    id: 'w_copper',
    name: '銅の古銭',
    weight: 5,
    soul: 10,
    sinBonus: 0.2,
    price: 140,
    rarity: 'common',
    effectDesc: '',
  },
  w_feather: {
    id: 'w_feather',
    name: '銀の羽根',
    weight: 1,
    soul: 5,
    sinBonus: 0.5,
    price: 200,
    rarity: 'uncommon',
    effectDesc: 'ごく軽い調整用の羽根。罪の倍率も大きく底上げする。',
  },
  w_fallen: {
    id: 'w_fallen',
    name: '堕天の羽',
    weight: -5,
    soul: 15,
    sinBonus: 0.4,
    price: 220,
    rarity: 'uncommon',
    effectDesc: '皿を5g押し上げる。超過時の切り返しに重宝する。',
  },
  w_helium: {
    id: 'w_helium',
    name: '反重力の羽',
    weight: -10,
    soul: 30,
    sinBonus: 0.8,
    price: 320,
    rarity: 'rare',
    effectDesc: '皿を10g押し上げる強力な切り札。罪の加算も高い。',
  },
  w_gold: {
    id: 'w_gold',
    name: '黄金の心臓',
    weight: 25,
    soul: 80,
    sinBonus: 0,
    price: 300,
    rarity: 'rare',
    effectDesc: '精算時、達成率95%以上かつ超過していなければ罪倍率を ×1.8 にする。',
  },
  w_crystal: {
    id: 'w_crystal',
    name: '共鳴水晶',
    weight: 10,
    soul: 15,
    sinBonus: 0,
    price: 280,
    rarity: 'uncommon',
    effectDesc: '精算時、右皿にある「現在の重さが10g」の分銅1個につき罪倍率 ×1.3。',
  },
  w_mirror: {
    id: 'w_mirror',
    name: '鏡の分銅',
    weight: 8,
    soul: 10,
    sinBonus: 0,
    price: 340,
    rarity: 'rare',
    effectDesc: '精算時、左隣の分銅がもう一度働く（左隣も鏡の分銅なら基本値のみ）。',
  },
  w_twin: {
    id: 'w_twin',
    name: '双子の分銅',
    weight: 12,
    soul: 20,
    sinBonus: 0.3,
    price: 260,
    rarity: 'uncommon',
    effectDesc: '置いた直後、同じ重さ・価値の影分銅をもう1個末尾に落とす。',
  },
  w_mercury: {
    id: 'w_mercury',
    name: '不安定な水銀',
    weight: 15,
    soul: 50,
    sinBonus: 0.5,
    price: 250,
    rarity: 'uncommon',
    effectDesc: '置く瞬間に10〜20gで重さが決まり、決まった重さ×5を魂に加える。',
  },
  w_slime: {
    id: 'w_slime',
    name: '貪欲なスライム',
    weight: 5,
    soul: 10,
    sinBonus: 0.2,
    price: 270,
    rarity: 'rare',
    effectDesc: 'この後に別の分銅が乗るたび、自身の重さ+5g・魂+30・罪+0.2ずつ育つ。',
  },
  w_soul: {
    id: 'w_soul',
    name: '罪人の魂',
    weight: 15,
    soul: 40,
    sinBonus: 0.4,
    price: 260,
    rarity: 'uncommon',
    effectDesc: '置くと左皿の目標も +15g 増える。自重と相殺されるため超過そのものは減らない。',
  },
  w_crown: {
    id: 'w_crown',
    name: '狂王の冠',
    weight: 15,
    soul: 30,
    sinBonus: 0,
    price: 320,
    rarity: 'rare',
    effectDesc: '精算時、右皿の一番右に置かれているなら水平倍率に +3.0 を加える。',
  },
};

export const WEIGHT_LIST: WeightDefinition[] = Object.values(WEIGHT_DATABASE);

export const TOOL_DATABASE: Record<ToolId, ToolDefinition> = {
  t_glass: {
    id: 't_glass',
    name: '死神の虫眼鏡',
    price: 140,
    effectDesc: 'この審判中、袋の次の5個の順番と重さを見通せる。',
  },
  t_tweezers: {
    id: 't_tweezers',
    name: '真鍮のピンセット',
    price: 180,
    effectDesc: '右皿のおもり1個を手札に戻す（超過猶予中でも使える）。',
  },
  t_file: {
    id: 't_file',
    name: '魔法のヤスリ',
    price: 160,
    effectDesc: '手札のおもり1個の重さを半分にし、魂と罪の値を永続で2倍にする。',
  },
  t_glue: {
    id: 't_glue',
    name: '悪魔の接着剤',
    price: 150,
    effectDesc: '次の1個を置いたときに限り、目標を超えても斬首・超過猶予に入らず耐える。',
  },
};

export const TOOL_LIST: ToolDefinition[] = Object.values(TOOL_DATABASE);

export const RELIC_DATABASE: Record<RelicId, RelicDefinition> = {
  r_fulcrum: {
    id: 'r_fulcrum',
    name: '錆びた支点',
    price: 420,
    effectDesc: '超過猶予の上限が 15g → 25g に広がり、1審判につき 2回まで耐えられる。',
  },
  r_pendulum: {
    id: 'r_pendulum',
    name: '振り子の魔術',
    price: 450,
    effectDesc: '天秤の揺れが大きくなり、投入時の反発回数に応じて魂が +15 ずつ加算される。',
  },
  r_miracle: {
    id: 'r_miracle',
    name: '奇跡の刻印',
    price: 520,
    effectDesc: '完全水平（誤差0g）で精算すると、右皿のおもりの効果が 2回連続で働く。',
  },
  r_zero: {
    id: 'r_zero',
    name: '無重力の祝福',
    price: 400,
    effectDesc: '精算時に右皿へマイナスの重さが乗っていれば、1g以下のおもりの罪加算が 2倍になる。',
  },
  r_altar: {
    id: 'r_altar',
    name: '供物の祭壇',
    price: 380,
    effectDesc: '供物回数が 2回 → 4回 に増え、捧げたおもりの魂を 2倍 で蓄積できる。',
  },
  r_scale: {
    id: 'r_scale',
    name: '精密な目盛り',
    price: 460,
    effectDesc: '手札トレイの上限が 3個 → 4個 に増える。',
  },
};

export const RELIC_LIST: RelicDefinition[] = Object.values(RELIC_DATABASE);

let uidCounter = 1;
export function nextUid(prefix = 'id'): string {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter}`;
}

export function createWeightInstance(defId: WeightId): WeightInstance {
  const def = WEIGHT_DATABASE[defId];
  return {
    uid: nextUid('w'),
    defId: def.id,
    name: def.name,
    weight: def.weight,
    soul: def.soul,
    sinBonus: def.sinBonus,
    rarity: def.rarity,
    effectDesc: def.effectDesc,
    isCopy: false,
    filedCount: 0,
    slimeStacks: 0,
    mercuryResolved: false,
  };
}

export function cloneWeightInstance(inst: WeightInstance): WeightInstance {
  return { ...inst };
}

export function createToolInstance(defId: ToolId): ToolInstance {
  const def = TOOL_DATABASE[defId];
  return {
    uid: nextUid('t'),
    defId: def.id,
    name: def.name,
    price: def.price,
    effectDesc: def.effectDesc,
  };
}

export function createInitialDeck(): WeightInstance[] {
  const recipe: Array<[WeightId, number]> = [
    ['w_lead', 3],
    ['w_cast', 3],
    ['w_iron', 4],
    ['w_copper', 4],
    ['w_feather', 2],
    ['w_fallen', 2],
  ];
  const deck: WeightInstance[] = [];
  for (const [id, count] of recipe) {
    for (let i = 0; i < count; i++) {
      deck.push(createWeightInstance(id));
    }
  }
  return deck;
}

export function getQuotaForDay(day: number): number {
  if (day <= 1) return 700;
  if (day === 2) return 1800;
  if (day === 3) return 4000;
  let quota = 4000;
  for (let d = 4; d <= day; d++) {
    quota = Math.floor(quota * 2.1);
  }
  return quota;
}

export function getTargetForTrial(day: number, trial = 1): number {
  if (day === 1) {
    // Trial 1: fixed 100g to teach Miracle Balance (last 5g copper coin!)
    if (trial === 1) return 100;
    // Trial 2: fixed 93g (mod 5 === 3, impossible with initial deck) to teach cashing out early!
    if (trial === 2) return 93;
    // Trial 3: achievable 85..110g multiple of 5 or +1/+2
    return 95;
  }
  if (day === 2) {
    return 100 + Math.floor(Math.random() * 51); // 100..150
  }
  const min = 100 + (day - 2) * 20;
  const max = 150 + (day - 2) * 30;
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Arranges Day 1 Trial 1 opening draw order so the player holds a 5g copper coin
 * and draws clean weights up to 95g -> 100g Miracle Balance on their very first Trial.
 */
export function orderDay1Trial1Deck(deck: WeightInstance[]): WeightInstance[] {
  const desiredPrefix: WeightId[] = [
    'w_lead',   // 20
    'w_lead',   // 20
    'w_copper', // 5 (kept in hand or played last!)
    'w_lead',   // 20
    'w_cast',   // 15
    'w_cast',   // 15
    'w_iron',   // 10
    'w_copper', // 5
  ];
  const pool = [...deck];
  const head: WeightInstance[] = [];
  for (const id of desiredPrefix) {
    const idx = pool.findIndex((w) => w.defId === id);
    if (idx !== -1) {
      head.push(pool[idx]);
      pool.splice(idx, 1);
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [...head, ...pool];
}
