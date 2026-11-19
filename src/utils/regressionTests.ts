import assert from 'node:assert/strict';
import { createWeightInstance } from '../data/database';
import { simulateDrop, simulatePendulumBounces } from './dropSimulator';
import { evaluateCashOut } from './scoreCalculator';

function runRegressionTests() {
  // Helper: create a pan totaling exact weight using plain lead/copper weights
  const makePanOfWeight = (grams: number) => {
    const w = createWeightInstance('w_lead');
    w.weight = grams;
    return [w];
  };

  // 1a. Target 100g, Current 108g + Fallen Feather (-5g) -> 103/100g, FAIL
  {
    const pan = makePanOfWeight(108);
    const fallen = createWeightInstance('w_fallen');
    const res = simulateDrop({
      scaleWeights: pan,
      targetWeight: 100,
      droppedWeight: fallen,
      glueActive: false,
      relics: [],
    });
    assert.equal(res.minCurrent, 103);
    assert.equal(res.nextTarget, 100);
    assert.equal(res.minOver, 3);
    assert.equal(res.survivalStatus, 'FAIL');
  }

  // 1b. Target 100g, Current 108g + Anti-gravity Feather (-10g) -> 98/100g, SURVIVE
  {
    const pan = makePanOfWeight(108);
    const helium = createWeightInstance('w_helium');
    const res = simulateDrop({
      scaleWeights: pan,
      targetWeight: 100,
      droppedWeight: helium,
      glueActive: false,
      relics: [],
    });
    assert.equal(res.minCurrent, 98);
    assert.equal(res.nextTarget, 100);
    assert.equal(res.minOver, -2);
    assert.equal(res.survivalStatus, 'SURVIVE');
  }

  // 1c. Target 100g, Current 108g + Sinner's Soul (+15g / Target +15g) -> 123/115g, FAIL
  {
    const pan = makePanOfWeight(108);
    const soul = createWeightInstance('w_soul');
    const res = simulateDrop({
      scaleWeights: pan,
      targetWeight: 100,
      droppedWeight: soul,
      glueActive: false,
      relics: [],
    });
    assert.equal(res.minCurrent, 123);
    assert.equal(res.nextTarget, 115);
    assert.equal(res.minOver, 8);
    assert.equal(res.survivalStatus, 'FAIL');
  }

  // 1d. Target 100g, Current 105g with Slime on pan + Fallen Feather (-5g) -> Slime +5g cancels -5g -> 105/100g, FAIL
  {
    const base = makePanOfWeight(100);
    const slime = createWeightInstance('w_slime'); // 5g -> total 105g
    const pan = [...base, slime];
    const fallen = createWeightInstance('w_fallen');
    const res = simulateDrop({
      scaleWeights: pan,
      targetWeight: 100,
      droppedWeight: fallen,
      glueActive: false,
      relics: [],
    });
    assert.equal(res.slimeGrewCount, 1);
    assert.equal(res.minCurrent, 105);
    assert.equal(res.nextTarget, 100);
    assert.equal(res.minOver, 5);
    assert.equal(res.survivalStatus, 'FAIL');
  }

  // 2. Unstable Mercury preview never rolls random numbers and reports exact range 10..20
  {
    const pan = makePanOfWeight(85);
    const mercury = createWeightInstance('w_mercury');
    const preview1 = simulateDrop({
      scaleWeights: pan,
      targetWeight: 100,
      droppedWeight: mercury,
      glueActive: false,
      relics: [],
    });
    const preview2 = simulateDrop({
      scaleWeights: pan,
      targetWeight: 100,
      droppedWeight: mercury,
      glueActive: false,
      relics: [],
    });
    assert.deepEqual(
      { min: preview1.minCurrent, max: preview1.maxCurrent, status: preview1.survivalStatus },
      { min: 95, max: 105, status: 'UNCERTAIN' }
    );
    assert.equal(preview1.minCurrent, preview2.minCurrent);
    assert.equal(preview1.maxCurrent, preview2.maxCurrent);
  }

  // 3. Deterministic fixed-step pendulum bounces (independent of Canvas/rAF)
  {
    const simA = simulatePendulumBounces(0, 20, 100, 100, true);
    const simB = simulatePendulumBounces(0, 20, 100, 100, true);
    assert.deepEqual(simA, simB);
    assert.ok(simA.bounceCount >= 1 && simA.bounceCount <= 5);
  }

  // 4. Unified Blood All-In Contract payout matches preview and execution
  {
    const lead = createWeightInstance('w_lead');
    lead.weight = 100;
    lead.soul = 25;
    const payout = evaluateCashOut({
      scaleWeights: [lead],
      currentWeight: 100,
      targetWeight: 100,
      sacrificeSoul: 0,
      pendulumSoulBonus: 0,
      deathDefiedMult: 1.0,
      relics: [],
      bloodAllIn: true,
      currentCoins: 200,
      quota: 700,
    });
    // baseCoins = 25 * 1.0 * 12.0 = 300; needed = 700 - 200 = 500 -> top-up +200 => finalCoins = 500
    assert.equal(payout.baseCoins, 300);
    assert.equal(payout.bloodContractBonus, 200);
    assert.equal(payout.finalCoins, 500);
  }

  console.log('ALL REGRESSION TESTS PASSED (7/7)');
}

runRegressionTests();
