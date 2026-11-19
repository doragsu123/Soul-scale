import { RelicId, WeightInstance } from '../types/game';
import { nextUid } from '../data/database';

export interface DropSimulationInput {
  scaleWeights: WeightInstance[];
  targetWeight: number;
  droppedWeight: WeightInstance;
  glueActive: boolean;
  relics: RelicId[];
  /** Optional explicit roll for w_mercury during actual execution; omit for preview */
  mercuryRoll?: number;
}

export interface DropSimulationResult {
  minCurrent: number;
  maxCurrent: number;
  nextTarget: number;
  minOver: number;
  maxOver: number;
  survivalStatus: 'SURVIVE' | 'FAIL' | 'UNCERTAIN';
  isDeterministic: boolean;
  slimeGrewCount: number;
  /** Populated when executing deterministically (or using fixed sample for non-mercury) */
  nextScaleWeights: WeightInstance[];
}

export function computeScaleAngleDeg(
  currentWeight: number,
  targetWeight: number
): number {
  const ratio = targetWeight > 0 ? currentWeight / targetWeight : 0;
  if (ratio <= 1.0) {
    return Math.max(-28, -24 * (1 - ratio));
  }
  return Math.min(28, (ratio - 1.0) * 68);
}

/**
 * Deterministic fixed-timestep (60Hz) spring simulation for r_pendulum bounce count.
 * Completely independent of requestAnimationFrame or Canvas rendering.
 */
export function simulatePendulumBounces(
  prevCurrentWeight: number,
  nextCurrentWeight: number,
  prevTargetWeight: number,
  nextTargetWeight: number,
  hasPendulum: boolean
): { bounceCount: number; bounceTimesMs: number[] } {
  if (!hasPendulum) {
    return { bounceCount: 0, bounceTimesMs: [] };
  }

  let angleDeg = computeScaleAngleDeg(prevCurrentWeight, prevTargetWeight);
  const targetAngleDeg = computeScaleAngleDeg(nextCurrentWeight, nextTargetWeight);
  let velocityDeg = 58; // Deterministic drop impulse matching visual physics

  const k = 76;
  const c = 2.4;
  const dt = 1 / 60;
  const maxSteps = 120; // 2.0 seconds fixed simulation
  const bounceTimesMs: number[] = [];

  for (let step = 0; step < maxSteps; step++) {
    const prevVel = velocityDeg;
    const accel = -k * (angleDeg - targetAngleDeg) - c * velocityDeg;
    velocityDeg += accel * dt;
    angleDeg += velocityDeg * dt;

    if (
      prevVel * velocityDeg < 0 &&
      Math.abs(angleDeg - targetAngleDeg) > 0.45 &&
      bounceTimesMs.length < 5
    ) {
      bounceTimesMs.push(Math.round((step + 1) * dt * 1000));
    }

    if (
      Math.abs(velocityDeg) < 0.25 &&
      Math.abs(angleDeg - targetAngleDeg) < 0.2
    ) {
      break;
    }
  }

  return {
    bounceCount: bounceTimesMs.length,
    bounceTimesMs,
  };
}

/**
 * Pure, side-effect-free drop simulator shared by both Hand UI preview and Execution.
 * Never rolls random numbers on its own; unresolved w_mercury yields an exact min..max range.
 */
export function simulateDrop({
  scaleWeights,
  targetWeight,
  droppedWeight,
  glueActive,
  mercuryRoll,
}: DropSimulationInput): DropSimulationResult {
  const tolerance = 0;
  const isUnresolvedMercury =
    droppedWeight.defId === 'w_mercury' &&
    !droppedWeight.mercuryResolved &&
    mercuryRoll === undefined;

  // 1. PASSIVE: Existing slimes on the pan grow (+5g, +30 Soul, +0.2 Sin)
  let slimeGrewCount = 0;
  let nextScale: WeightInstance[] = scaleWeights.map((sw) => {
    if (sw.defId === 'w_slime') {
      slimeGrewCount += 1;
      return {
        ...sw,
        weight: sw.weight + 5,
        soul: sw.soul + 30,
        sinBonus: Number((sw.sinBonus + 0.2).toFixed(2)),
        slimeStacks: (sw.slimeStacks ?? 0) + 1,
      };
    }
    return sw;
  });

  // 2. Prepare dropped instance
  let resolvedDrop: WeightInstance = { ...droppedWeight };
  if (
    droppedWeight.defId === 'w_mercury' &&
    !droppedWeight.mercuryResolved &&
    mercuryRoll !== undefined
  ) {
    resolvedDrop = {
      ...droppedWeight,
      weight: mercuryRoll,
      soul: droppedWeight.soul + mercuryRoll * 5,
      mercuryResolved: true,
    };
  }

  nextScale = [...nextScale, resolvedDrop];

  // 3. ON_DROP effects (w_twin, w_soul)
  let nextTarget = targetWeight;
  if (resolvedDrop.defId === 'w_twin' && !resolvedDrop.isCopy) {
    // Copy also triggers existing slimes
    nextScale = nextScale.map((sw) => {
      if (sw.defId === 'w_slime') {
        slimeGrewCount += 1;
        return {
          ...sw,
          weight: sw.weight + 5,
          soul: sw.soul + 30,
          sinBonus: Number((sw.sinBonus + 0.2).toFixed(2)),
          slimeStacks: (sw.slimeStacks ?? 0) + 1,
        };
      }
      return sw;
    });
    const twinCopy: WeightInstance = {
      ...resolvedDrop,
      uid: nextUid('twin'),
      name: `${resolvedDrop.name}(影)`,
      isCopy: true,
    };
    nextScale = [...nextScale, twinCopy];
  }

  if (resolvedDrop.defId === 'w_soul') {
    nextTarget += 15;
  }

  const baseSum = nextScale.reduce((acc, w) => acc + w.weight, 0);

  let minCurrent = baseSum;
  let maxCurrent = baseSum;
  if (isUnresolvedMercury) {
    const withoutDefault = baseSum - resolvedDrop.weight;
    minCurrent = withoutDefault + 10;
    maxCurrent = withoutDefault + 20;
  }

  const limit = nextTarget + tolerance;
  const minOver = glueActive ? Math.min(0, minCurrent - limit) : minCurrent - limit;
  const maxOver = glueActive ? Math.min(0, maxCurrent - limit) : maxCurrent - limit;

  let survivalStatus: 'SURVIVE' | 'FAIL' | 'UNCERTAIN' = 'FAIL';
  if (glueActive || maxCurrent <= limit) {
    survivalStatus = 'SURVIVE';
  } else if (minCurrent <= limit && maxCurrent > limit) {
    survivalStatus = 'UNCERTAIN';
  } else {
    survivalStatus = 'FAIL';
  }

  return {
    minCurrent,
    maxCurrent,
    nextTarget,
    minOver,
    maxOver,
    survivalStatus,
    isDeterministic: !isUnresolvedMercury,
    slimeGrewCount,
    nextScaleWeights: nextScale,
  };
}
