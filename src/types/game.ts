export type GamePhase =
  | 'START_DAY'
  | 'TRIAL_INIT'
  | 'PLAYER_TURN'
  | 'RESOLVE_WEIGHT'
  | 'OVERLOAD_CHANCE'
  | 'CASH_OUT'
  | 'GUILLOTINE'
  | 'END_DAY'
  | 'SHOP'
  | 'GAME_OVER';

export type InteractionMode =
  | 'NORMAL'
  | 'DISCARD'
  | 'SELECT_PAN_TWEEZERS'
  | 'SELECT_HAND_FILE';

export type Rarity = 'common' | 'uncommon' | 'rare';

export type WeightId =
  | 'w_lead'
  | 'w_cast'
  | 'w_iron'
  | 'w_copper'
  | 'w_feather'
  | 'w_fallen'
  | 'w_helium'
  | 'w_gold'
  | 'w_crystal'
  | 'w_mirror'
  | 'w_twin'
  | 'w_mercury'
  | 'w_slime'
  | 'w_soul'
  | 'w_crown';

export interface WeightDefinition {
  id: WeightId;
  name: string;
  weight: number;
  soul: number;
  sinBonus: number;
  price: number;
  rarity: Rarity;
  effectDesc: string;
}

export interface WeightInstance {
  uid: string;
  defId: WeightId;
  name: string;
  weight: number;
  soul: number;
  sinBonus: number;
  rarity: Rarity;
  effectDesc: string;
  isCopy?: boolean;
  filedCount?: number;
  slimeStacks?: number;
  mercuryResolved?: boolean;
}

export type ToolId = 't_glass' | 't_tweezers' | 't_file' | 't_glue';

export interface ToolDefinition {
  id: ToolId;
  name: string;
  price: number;
  effectDesc: string;
}

export interface ToolInstance {
  uid: string;
  defId: ToolId;
  name: string;
  price: number;
  effectDesc: string;
}

export type RelicId =
  | 'r_fulcrum'
  | 'r_pendulum'
  | 'r_miracle'
  | 'r_zero'
  | 'r_altar'
  | 'r_scale';

export interface RelicDefinition {
  id: RelicId;
  name: string;
  price: number;
  effectDesc: string;
}

export interface ShopInventory {
  weights: WeightDefinition[];
  tools: ToolDefinition[];
  relics: RelicDefinition[];
  purchasedWeightIndices: number[];
  purchasedToolIndices: number[];
  purchasedRelicIndices: number[];
  removeCost: number;
  rerollCost: number;
  removeUsed: boolean;
}

export interface FloatingEffect {
  id: string;
  x: number; // percentage 0..100 or px inside overlay
  y: number;
  text: string;
  subtext?: string;
  color: string;
}

export interface ScoreStep {
  pass: number;
  index: number;
  mirroredIndex?: number;
  uid: string;
  name: string;
  addedSoul: number;
  addedSin: number;
  sinMultFactor: number;
  addedBalanceMult: number;
  effectLabels: string[];
}

export interface CashOutResult {
  totalSoul: number;
  totalSinMult: number;
  baseBalanceMult: number;
  bonusBalanceMult: number;
  finalBalanceMult: number;
  baseCoins: number;
  bloodContractBonus: number;
  finalCoins: number;
  isMiracleBalance: boolean;
  steps: ScoreStep[];
}

export interface BannerState {
  title: string;
  subtitle?: string;
  tone: 'gold' | 'crimson' | 'emerald' | 'amber';
}
