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
    effectDesc: '特殊なし',
  },
  w_cast: {
    id: 'w_cast',
    name: '鋳鉄の分銅',
    weight: 15,
    soul: 18,
    sinBonus: 0,
    price: 100,
    rarity: 'common',
    effectDesc: '特殊なし',
  },
  w_iron: {
    id: 'w_iron',
    name: '鉄の小塊',
    weight: 10,
    soul: 12,
    sinBonus: 0,
    price: 110,
    rarity: 'common',
    effectDesc: '特殊なし',
  },
  w_copper: {
    id: 'w_copper',
    name: '銅の古銭',
    weight: 5,
    soul: 10,
    sinBonus: 0.2,
    price: 140,
    rarity: 'common',
    effectDesc: '特殊なし',
  },
  w_feather: {
    id: 'w_feather',
    name: '銀の羽根',
    weight: 1,
    soul: 5,
    sinBonus: 0.5,
    price: 200,
    rarity: 'uncommon',
    effectDesc: '超軽量。100%調整とSin底上げの要',
  },
  w_fallen: {
    id: 'w_fallen',
    name: '堕天の羽',
    weight: -5,
    soul: 15,
    sinBonus: 0.4,
    price: 220,
    rarity: 'uncommon',
    effectDesc: '皿を押し上げる。OVERLOAD切り返しの基本',
  },
  w_helium: {
    id: 'w_helium',
    name: '反重力の羽',
    weight: -10,
    soul: 30,
    sinBonus: 0.8,
    price: 320,
    rarity: 'rare',
    effectDesc: '大きく皿を押し上げる最強の切り札',
  },
  w_gold: {
    id: 'w_gold',
    name: '黄金の心臓',
    weight: 25,
    soul: 80,
    sinBonus: 0,
    price: 300,
    rarity: 'rare',
    effectDesc: 'ON_SCORE: 水平率95%以上かつ Current <= Target なら、その時点の合計Sin倍率を ×1.8',
  },
  w_crystal: {
    id: 'w_crystal',
    name: '共鳴水晶',
    weight: 10,
    soul: 15,
    sinBonus: 0,
    price: 280,
    rarity: 'uncommon',
    effectDesc: 'ON_SCORE: 右皿にある「現在の重さが10g」のおもり（自身含む）1個につき、合計Sin倍率を ×1.3',
  },
  w_mirror: {
    id: 'w_mirror',
    name: '鏡の分銅',
    weight: 8,
    soul: 10,
    sinBonus: 0,
    price: 340,
    rarity: 'rare',
    effectDesc: 'ON_SCORE: 右皿の左隣（index - 1）のおもりのスコア効果を再発動（※左隣も鏡の分銅の場合は基礎値のみ再発動）',
  },
  w_twin: {
    id: 'w_twin',
    name: '双子の分銅',
    weight: 12,
    soul: 20,
    sinBonus: 0.3,
    price: 260,
    rarity: 'uncommon',
    effectDesc: 'ON_DROP: 乗せた直後、同じコピーをもう1個（コピー側はON_DROP無効）末尾に落とす',
  },
  w_mercury: {
    id: 'w_mercury',
    name: '不安定な水銀',
    weight: 15,
    soul: 50,
    sinBonus: 0.5,
    price: 250,
    rarity: 'uncommon',
    effectDesc: 'ON_DROP: 手札上では10〜20gで高速振動し、落下時に10〜20の整数が確定。確定重さ×5をSoulに追加',
  },
  w_slime: {
    id: 'w_slime',
    name: '貪欲なスライム',
    weight: 5,
    soul: 10,
    sinBonus: 0.2,
    price: 270,
    rarity: 'rare',
    effectDesc: 'PASSIVE: このおもりより後に新しいおもりが乗るたび（コピー含む）、自身の重さ +5g、Soul +30、Sin +0.2 成長',
  },
  w_soul: {
    id: 'w_soul',
    name: '罪人の魂',
    weight: 15,
    soul: 40,
    sinBonus: 0.4,
    price: 260,
    rarity: 'uncommon',
    effectDesc: 'ON_DROP: 左皿のTargetを +15g 増やす（OVERLOAD脱出可）',
  },
  w_crown: {
    id: 'w_crown',
    name: '狂王の冠',
    weight: 15,
    soul: 30,
    sinBonus: 0,
    price: 320,
    rarity: 'rare',
    effectDesc: 'ON_SCORE: 右皿の一番右（末尾）にあるなら、最終の水平精度倍率に +3.0',
  },
};

export const WEIGHT_LIST: WeightDefinition[] = Object.values(WEIGHT_DATABASE);

export const TOOL_DATABASE: Record<ToolId, ToolDefinition> = {
  t_glass: {
    id: 't_glass',
    name: '死神の虫眼鏡',
    price: 140,
    effectDesc: 'このTrial中、袋の次の5個の正確な順番と重さを透視表示。',
  },
  t_tweezers: {
    id: 't_tweezers',
    name: '真鍮のピンセット',
    price: 180,
    effectDesc: '選択モードに入り、右皿の任意のおもり1個を手札に戻す（OVERLOAD時も使用可）。',
  },
  t_file: {
    id: 't_file',
    name: '魔法のヤスリ',
    price: 160,
    effectDesc: '選択モードに入り、手札のおもり1つの重さを半分にし、SoulとSin加算値を永続で2倍にする。',
  },
  t_glue: {
    id: 't_glue',
    name: '悪魔の接着剤',
    price: 150,
    effectDesc: '次の1個のおもりを乗せた手番に限り、バーストおよびOVERLOAD判定を強制無効化して耐える。',
  },
};

export const TOOL_LIST: ToolDefinition[] = Object.values(TOOL_DATABASE);

export const RELIC_DATABASE: Record<RelicId, RelicDefinition> = {
  r_fulcrum: {
    id: 'r_fulcrum',
    name: '錆びた支点',
    price: 420,
    effectDesc: 'OVERLOAD許容超過が 15g → 25g、発動上限が1Trialにつき 2回 に増加。',
  },
  r_pendulum: {
    id: 'r_pendulum',
    name: '振り子の魔術',
    price: 450,
    effectDesc: 'バネ振動の反発を強化し、落下時のバウンドごとに Soul +15 を加算＋ポップアップ表示。',
  },
  r_miracle: {
    id: 'r_miracle',
    name: '奇跡の刻印',
    price: 520,
    effectDesc: '完全水平（誤差0g）達成時、CASH_OUT のおもり連鎖計算を 2回発動。',
  },
  r_zero: {
    id: 'r_zero',
    name: '無重力の祝福',
    price: 400,
    effectDesc: '確定時に右皿にマイナス重量のおもりがある場合、そのTrialの「1g以下／マイナス重量」のおもりのSin加算値が 2倍。',
  },
  r_altar: {
    id: 'r_altar',
    name: '供物の祭壇',
    price: 380,
    effectDesc: 'Discard上限が 2回 → 4回 に増え、捨てたおもりのSoul値が 2倍 になって sacrificeSoul に加算される。',
  },
  r_scale: {
    id: 'r_scale',
    name: '精密な目盛り',
    price: 460,
    effectDesc: '手札トレイの最大数が 3個 → 4個 に増加。',
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

export function getTargetForTrial(day: number): number {
  if (day <= 1) {
    return 80 + Math.floor(Math.random() * 41); // 80..120
  }
  if (day === 2) {
    return 100 + Math.floor(Math.random() * 51); // 100..150
  }
  const min = 100 + (day - 2) * 20;
  const max = 150 + (day - 2) * 30;
  return min + Math.floor(Math.random() * (max - min + 1));
}
