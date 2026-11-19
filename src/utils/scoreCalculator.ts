import { CashOutResult, RelicId, ScoreStep, WeightInstance } from '../types/game';

export function calculateBalanceMultiplier(
  currentWeight: number,
  targetWeight: number
): number {
  if (targetWeight <= 0) return 0.5;
  if (currentWeight === targetWeight) return 12.0;
  if (currentWeight > targetWeight) return 5.0;

  const ratio = Math.max(0, currentWeight / targetWeight);
  if (ratio < 0.5) {
    return 0.5 + (ratio / 0.5) * 0.3;
  }
  if (ratio < 0.8) {
    return 0.85 + ((ratio - 0.5) / 0.3) * 0.45;
  }
  if (ratio < 0.9) {
    return 1.8 + ((ratio - 0.8) / 0.1) * 0.5;
  }
  if (ratio < 0.95) {
    return 3.0 + ((ratio - 0.9) / 0.05) * 0.8;
  }
  return 5.0 + ((ratio - 0.95) / 0.05) * 1.5;
}

export interface EvaluateCashOutParams {
  scaleWeights: WeightInstance[];
  currentWeight: number;
  targetWeight: number;
  sacrificeSoul: number;
  pendulumSoulBonus: number;
  deathDefiedMult: number;
  relics: RelicId[];
  bloodAllIn?: boolean;
  currentCoins?: number;
  quota?: number;
}

export function evaluateCashOut({
  scaleWeights,
  currentWeight,
  targetWeight,
  sacrificeSoul,
  pendulumSoulBonus,
  deathDefiedMult,
  relics,
  bloodAllIn = false,
  currentCoins = 0,
  quota = 0,
}: EvaluateCashOutParams): CashOutResult {
  let totalSoul = sacrificeSoul + pendulumSoulBonus;
  let totalSinMult = 1.0;
  let bonusBalanceMult = 0;

  const isMiracleBalance = currentWeight === targetWeight;
  const hasMiracleRelic = relics.includes('r_miracle');
  const hasZeroBlessingRelic = relics.includes('r_zero');
  const hasNegativeOnScale = scaleWeights.some((w) => w.weight < 0);
  const zeroBlessingActive = hasZeroBlessingRelic && hasNegativeOnScale;

  const passes = isMiracleBalance && hasMiracleRelic ? 2 : 1;
  const steps: ScoreStep[] = [];

  const tensCount = scaleWeights.filter((w) => w.weight === 10).length;
  const ratio = targetWeight > 0 ? currentWeight / targetWeight : 0;

  const applyWeightEffect = (
    source: WeightInstance,
    triggerIndex: number,
    allowSpecial: boolean
  ): {
    addedSoul: number;
    addedSin: number;
    sinMultFactor: number;
    addedBalanceMult: number;
    labels: string[];
  } => {
    const labels: string[] = [];
    const addedSoul = source.soul;
    const sinDouble = zeroBlessingActive && source.weight <= 1 && source.sinBonus > 0;
    const addedSin = sinDouble ? source.sinBonus * 2 : source.sinBonus;

    totalSoul += addedSoul;
    totalSinMult += addedSin;

    if (addedSoul > 0) {
      labels.push(`+${addedSoul} 魂`);
    }
    if (addedSin > 0) {
      labels.push(
        sinDouble
          ? `+${addedSin.toFixed(1)} 罪 (無重力×2)`
          : `+${addedSin.toFixed(1)} 罪`
      );
    }

    let sinMultFactor = 1.0;
    let addedBalanceMult = 0;

    if (allowSpecial) {
      if (source.defId === 'w_gold') {
        if (currentWeight <= targetWeight && ratio >= 0.95) {
          totalSinMult *= 1.8;
          sinMultFactor *= 1.8;
          labels.push('×1.8 罪倍率 (黄金の心臓)');
        }
      } else if (source.defId === 'w_crystal') {
        if (tensCount > 0) {
          const factor = Math.pow(1.3, tensCount);
          totalSinMult *= factor;
          sinMultFactor *= factor;
          labels.push(`×${factor.toFixed(2)} 罪倍率 (共鳴×${tensCount})`);
        }
      } else if (source.defId === 'w_crown') {
        if (triggerIndex === scaleWeights.length - 1) {
          bonusBalanceMult += 3.0;
          addedBalanceMult += 3.0;
          labels.push('+3.0 水平倍率 (狂王の冠)');
        }
      }
    }

    return {
      addedSoul,
      addedSin,
      sinMultFactor,
      addedBalanceMult,
      labels,
    };
  };

  for (let pass = 1; pass <= passes; pass++) {
    for (let i = 0; i < scaleWeights.length; i++) {
      const w = scaleWeights[i];

      if (w.defId === 'w_mirror') {
        const own = applyWeightEffect(w, i, false);
        let combinedSoul = own.addedSoul;
        let combinedSin = own.addedSin;
        let combinedFactor = own.sinMultFactor;
        let combinedBal = own.addedBalanceMult;
        const combinedLabels = [...own.labels];
        let mirroredIndex: number | undefined;

        if (i > 0) {
          mirroredIndex = i - 1;
          const leftNeighbor = scaleWeights[i - 1];
          const isLeftAlsoMirror = leftNeighbor.defId === 'w_mirror';
          const mirrored = applyWeightEffect(leftNeighbor, i, !isLeftAlsoMirror);
          combinedSoul += mirrored.addedSoul;
          combinedSin += mirrored.addedSin;
          combinedFactor *= mirrored.sinMultFactor;
          combinedBal += mirrored.addedBalanceMult;
          combinedLabels.push(`鏡写し(${leftNeighbor.name})`, ...mirrored.labels);
        }

        steps.push({
          pass,
          index: i,
          mirroredIndex,
          uid: w.uid,
          name: w.name,
          addedSoul: combinedSoul,
          addedSin: combinedSin,
          sinMultFactor: combinedFactor,
          addedBalanceMult: combinedBal,
          effectLabels: combinedLabels,
        });
      } else {
        const res = applyWeightEffect(w, i, true);
        steps.push({
          pass,
          index: i,
          uid: w.uid,
          name: w.name,
          addedSoul: res.addedSoul,
          addedSin: res.addedSin,
          sinMultFactor: res.sinMultFactor,
          addedBalanceMult: res.addedBalanceMult,
          effectLabels: res.labels,
        });
      }
    }
  }

  if (deathDefiedMult > 1) {
    totalSinMult *= deathDefiedMult;
  }

  const baseBalanceMult = calculateBalanceMultiplier(currentWeight, targetWeight);
  const finalBalanceMult = baseBalanceMult + bonusBalanceMult;
  const baseCoins = Math.floor(totalSoul * totalSinMult * finalBalanceMult);

  let bloodContractBonus = 0;
  if (bloodAllIn && isMiracleBalance && quota > currentCoins) {
    const needed = quota - currentCoins;
    if (needed > baseCoins) {
      bloodContractBonus = needed - baseCoins;
    }
  }

  const finalCoins = baseCoins + bloodContractBonus;

  return {
    totalSoul,
    totalSinMult,
    baseBalanceMult,
    bonusBalanceMult,
    finalBalanceMult,
    baseCoins,
    bloodContractBonus,
    finalCoins,
    isMiracleBalance,
    steps,
  };
}
