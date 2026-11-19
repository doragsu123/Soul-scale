import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronUp,
  Flame,
  HelpCircle,
  RotateCcw,
  Scale,
  Skull,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  cloneWeightInstance,
  createInitialDeck,
  createToolInstance,
  createWeightInstance,
  getQuotaForDay,
  getTargetForTrial,
  nextUid,
  orderDay1Trial1Deck,
  RELIC_DATABASE,
  RELIC_LIST,
  TOOL_LIST,
  WEIGHT_LIST,
} from './data/database';
import {
  BannerState,
  FloatingEffect,
  GamePhase,
  InteractionMode,
  RelicId,
  ShopInventory,
  ToolInstance,
  WeightDefinition,
  WeightInstance,
} from './types/game';
import { simulateDrop, simulatePendulumBounces } from './utils/dropSimulator';
import { evaluateCashOut } from './utils/scoreCalculator';
import { soundEngine } from './utils/soundEngine';
import { FlightEvent, ScaleCanvas } from './components/ScaleCanvas';
import { FloatingEffects } from './components/FloatingEffects';
import { BagTracker } from './components/BagTracker';
import { ShopModal } from './components/ShopModal';
import { RulesModal } from './components/RulesModal';
import { RelicGlyph, ToolGlyph, WeightGlyph } from './components/WeightGlyph';

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickWeightedWeight(excludeIds: Set<string>): WeightDefinition {
  const pool = WEIGHT_LIST.filter((w) => !excludeIds.has(w.id));
  const candidates = pool.length > 0 ? pool : WEIGHT_LIST;
  const roll = Math.random();
  let targetRarity: 'common' | 'uncommon' | 'rare' = 'common';
  if (roll > 0.85) targetRarity = 'rare';
  else if (roll > 0.45) targetRarity = 'uncommon';

  const byRarity = candidates.filter((w) => w.rarity === targetRarity);
  const finalPool = byRarity.length > 0 ? byRarity : candidates;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

function generateShopInventory(ownedRelics: RelicId[]): ShopInventory {
  const chosenWeightIds = new Set<string>();
  const weights: WeightDefinition[] = [];
  for (let i = 0; i < 3; i++) {
    const w = pickWeightedWeight(chosenWeightIds);
    chosenWeightIds.add(w.id);
    weights.push(w);
  }

  const shuffledTools = shuffleArray(TOOL_LIST);
  const tools = shuffledTools.slice(0, 2);

  const availableRelics = RELIC_LIST.filter((r) => !ownedRelics.includes(r.id));
  const relics = shuffleArray(availableRelics).slice(0, 2);

  return {
    weights,
    tools,
    relics,
    purchasedWeightIndices: [],
    purchasedToolIndices: [],
    purchasedRelicIndices: [],
    removeCost: 100,
    rerollCost: 50,
    removeUsed: false,
  };
}

function formatSignedGrams(grams: number): string {
  if (grams < 0) return `−${Math.abs(grams)}g`;
  return `${grams}g`;
}

const MercuryWeightValue: React.FC<{ active: boolean; fixedWeight: number }> = ({
  active,
  fixedWeight,
}) => {
  const [display, setDisplay] = useState(fixedWeight);

  useEffect(() => {
    if (!active) {
      setDisplay(fixedWeight);
      return;
    }
    const timer = window.setInterval(() => {
      setDisplay(10 + Math.floor(Math.random() * 11));
    }, 85);
    return () => window.clearInterval(timer);
  }, [active, fixedWeight]);

  return <span>{active ? `${display}g?` : formatSignedGrams(fixedWeight)}</span>;
};

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('PLAYER_TURN');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('NORMAL');
  const [day, setDay] = useState(1);
  const [trial, setTrial] = useState(1);
  const [quota, setQuota] = useState(() => getQuotaForDay(1));
  const [coins, setCoins] = useState(0);
  const [totalRunCoins, setTotalRunCoins] = useState(0);
  const [freeRerolls, setFreeRerolls] = useState(0);

  const [masterDeck, setMasterDeck] = useState<WeightInstance[]>(() =>
    createInitialDeck()
  );
  const [tools, setTools] = useState<ToolInstance[]>([]);
  const [relics, setRelics] = useState<RelicId[]>([]);

  const [targetWeight, setTargetWeight] = useState(() => getTargetForTrial(1, 1));
  const [bag, setBag] = useState<WeightInstance[]>([]);
  const [hand, setHand] = useState<WeightInstance[]>([]);
  const [scaleWeights, setScaleWeights] = useState<WeightInstance[]>([]);
  const [sacrificeSoul, setSacrificeSoul] = useState(0);
  const [pendulumSoulBonus, setPendulumSoulBonus] = useState(0);
  const [discardsRemaining, setDiscardsRemaining] = useState(2);
  const [overloadCount, setOverloadCount] = useState(0);
  const [deathDefiedMult, setDeathDefiedMult] = useState(1.0);
  const [bloodAllIn, setBloodAllIn] = useState(false);

  const [glassActive, setGlassActive] = useState(false);
  const [glueActive, setGlueActive] = useState(false);
  const [activeTweezersUid, setActiveTweezersUid] = useState<string | null>(null);
  const [activeFileUid, setActiveFileUid] = useState<string | null>(null);

  const [hoveredHandUid, setHoveredHandUid] = useState<string | null>(null);
  const [selectedHandUid, setSelectedHandUid] = useState<string | null>(null);
  const [flightEvent, setFlightEvent] = useState<FlightEvent | null>(null);
  const [miracleLit, setMiracleLit] = useState(false);

  const [dropEventId, setDropEventId] = useState(0);
  const [coinBurstId, setCoinBurstId] = useState(0);
  const [suspenseTier, setSuspenseTier] = useState<'safe' | 'danger' | 'critical'>('safe');
  const [activeScoreIndices, setActiveScoreIndices] = useState<number[]>([]);
  const [floatingEffects, setFloatingEffects] = useState<FloatingEffect[]>([]);
  const [flashTone, setFlashTone] = useState<'gold' | 'crimson' | null>(null);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [shaking, setShaking] = useState(false);
  const [reaperSpeech, setReaperSpeech] = useState(
    '最初は100g。ぴったり揃えれば12倍の値が着く。最後の5gを見極めろ。'
  );
  const [muted, setMuted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [shopInventory, setShopInventory] = useState<ShopInventory | null>(null);

  const isMountedRef = useRef(true);
  const runTokenRef = useRef(1);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      runTokenRef.current += 1;
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
      if (isMountedRef.current) fn();
    }, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const sleep = useCallback((ms: number, token: number) => {
    return new Promise<boolean>((resolve) => {
      const id = window.setTimeout(() => {
        timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
        resolve(isMountedRef.current && runTokenRef.current === token);
      }, ms);
      timeoutsRef.current.push(id);
    });
  }, []);

  const spawnFloating = useCallback(
    (x: number, y: number, text: string, color: string, subtext?: string) => {
      const id = nextUid('fx');
      setFloatingEffects((prev) => [...prev, { id, x, y, text, color, subtext }]);
      scheduleTimeout(() => {
        setFloatingEffects((prev) => prev.filter((item) => item.id !== id));
      }, 1150);
    },
    [scheduleTimeout]
  );

  const triggerBanner = useCallback(
    (nextBanner: BannerState, duration = 1700) => {
      setBanner(nextBanner);
      scheduleTimeout(() => {
        setBanner((curr) => (curr === nextBanner ? null : curr));
      }, duration);
    },
    [scheduleTimeout]
  );

  const triggerFlash = useCallback(
    (tone: 'gold' | 'crimson', duration = 550) => {
      setFlashTone(tone);
      scheduleTimeout(() => {
        setFlashTone(null);
      }, duration);
    },
    [scheduleTimeout]
  );

  const triggerShake = useCallback(() => {
    setShaking(true);
    scheduleTimeout(() => setShaking(false), 450);
  }, [scheduleTimeout]);

  const handMax = relics.includes('r_scale') ? 4 : 3;
  const maxDiscards = relics.includes('r_altar') ? 4 : 2;
  const overloadLimit = relics.includes('r_fulcrum') ? 25 : 15;
  const maxOverload = bloodAllIn ? 0 : relics.includes('r_fulcrum') ? 2 : 1;
  const tolerance = 0;

  const currentWeight = useMemo(
    () => scaleWeights.reduce((acc, w) => acc + w.weight, 0),
    [scaleWeights]
  );

  const previewScore = useMemo(
    () =>
      evaluateCashOut({
        scaleWeights,
        currentWeight,
        targetWeight,
        sacrificeSoul,
        pendulumSoulBonus,
        deathDefiedMult,
        relics,
        bloodAllIn,
        currentCoins: coins,
        quota,
      }),
    [
      scaleWeights,
      currentWeight,
      targetWeight,
      sacrificeSoul,
      pendulumSoulBonus,
      deathDefiedMult,
      relics,
      bloodAllIn,
      coins,
      quota,
    ]
  );

  const initTrial = useCallback(
    (
      nextDay: number,
      nextTrial: number,
      deckSource: WeightInstance[],
      ownedRelics: RelicId[]
    ) => {
      const targetHandSize = ownedRelics.includes('r_scale') ? 4 : 3;
      const targetDiscards = ownedRelics.includes('r_altar') ? 4 : 2;
      const cloned = deckSource.map(cloneWeightInstance);
      const ordered =
        nextDay === 1 && nextTrial === 1
          ? orderDay1Trial1Deck(cloned)
          : shuffleArray(cloned);

      const drawnHand = ordered.slice(0, targetHandSize);
      const remainingBag = ordered.slice(targetHandSize);

      setDay(nextDay);
      setTrial(nextTrial);
      setTargetWeight(getTargetForTrial(nextDay, nextTrial));
      setBag(remainingBag);
      setHand(drawnHand);
      setScaleWeights([]);
      setSacrificeSoul(0);
      setPendulumSoulBonus(0);
      setDiscardsRemaining(targetDiscards);
      setOverloadCount(0);
      setDeathDefiedMult(1.0);
      setBloodAllIn(false);
      setGlassActive(false);
      setGlueActive(false);
      setActiveTweezersUid(null);
      setActiveFileUid(null);
      setActiveScoreIndices([]);
      setHoveredHandUid(null);
      setSelectedHandUid(null);
      setFlightEvent(null);
      setMiracleLit(false);
      setInteractionMode('NORMAL');
      setSuspenseTier('safe');
      setShowBreakdown(false);
      setPhase('PLAYER_TURN');

      if (nextDay === 1 && nextTrial === 1) {
        setReaperSpeech(
          '最初は100g。ぴったり揃えれば12倍の値が着く。最後の5gを見極めろ。'
        );
      } else if (nextDay === 1 && nextTrial === 2) {
        setReaperSpeech(
          '今度は端数だ。100%に届かなくとも、量った魂は金になる。降り時を探れ。'
        );
      } else if (nextTrial === 3) {
        setReaperSpeech('最終審判だ。血の契約に挑む度胸はあるか？');
      } else {
        setReaperSpeech('貴様の魂の重さを量ろう。さあ、分銅を乗せろ。');
      }
    },
    []
  );

  useEffect(() => {
    const initial = createInitialDeck();
    setMasterDeck(initial);
    initTrial(1, 1, initial, []);
  }, [initTrial]);

  const handleResetGame = useCallback(() => {
    soundEngine.playClick();
    runTokenRef.current += 1;
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current = [];

    const freshDeck = createInitialDeck();
    setMasterDeck(freshDeck);
    setTools([]);
    setRelics([]);
    setCoins(0);
    setTotalRunCoins(0);
    setFreeRerolls(0);
    setQuota(getQuotaForDay(1));
    setShopInventory(null);
    setFloatingEffects([]);
    setFlashTone(null);
    setBanner(null);
    setShaking(false);

    initTrial(1, 1, freshDeck, []);
  }, [initTrial]);

  const advanceAfterTrial = useCallback(
    (
      latestCoins: number,
      latestDay: number,
      latestTrial: number,
      latestQuota: number,
      latestDeck: WeightInstance[],
      latestRelics: RelicId[]
    ) => {
      if (latestTrial < 3) {
        initTrial(latestDay, latestTrial + 1, latestDeck, latestRelics);
      } else {
        if (latestCoins >= latestQuota) {
          const surplus = latestCoins - latestQuota;
          setCoins(surplus);
          setShopInventory(generateShopInventory(latestRelics));
          setPhase('SHOP');
          setReaperSpeech('ノルマ達成だ…だが明日の天秤はさらに重いぞ。');
        } else {
          setPhase('GAME_OVER');
          setReaperSpeech('契約不履行だ。貴様の魂はここで刈り取る。');
        }
      }
    },
    [initTrial]
  );

  const executeGuillotine = useCallback(
    async (
      token: number,
      latestCoins: number,
      latestDay: number,
      latestTrial: number,
      latestQuota: number,
      latestDeck: WeightInstance[],
      latestRelics: RelicId[]
    ) => {
      setPhase('GUILLOTINE');
      setInteractionMode('NORMAL');
      setMiracleLit(false);
      soundEngine.playGuillotineDrop();
      triggerFlash('crimson', 700);
      triggerShake();
      triggerBanner(
        {
          title: '斬首執行',
          subtitle: '規定重量を超過 — この審判の獲得コインは 0 G',
          tone: 'crimson',
        },
        1650
      );
      setReaperSpeech('判決は『斬首』だ！欲をかいたな、愚か者。');

      const alive = await sleep(1750, token);
      if (!alive) return;

      advanceAfterTrial(
        latestCoins,
        latestDay,
        latestTrial,
        latestQuota,
        latestDeck,
        latestRelics
      );
    },
    [advanceAfterTrial, sleep, triggerBanner, triggerFlash, triggerShake]
  );

  const handleDropWeight = async (
    handUid: string,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (phase !== 'PLAYER_TURN' && phase !== 'OVERLOAD_CHANCE') return;
    const wasOverload = phase === 'OVERLOAD_CHANCE';

    const targetItem = hand.find((w) => w.uid === handUid);
    if (!targetItem) return;

    // Capture slot center immediately so flight starts instantaneously on click/tap
    const rect = e.currentTarget.getBoundingClientRect();
    const startClientX = rect.left + rect.width * 0.5;
    const startClientY = rect.top + rect.height * 0.4;

    const token = runTokenRef.current;
    setSelectedHandUid(handUid);
    setPhase('RESOLVE_WEIGHT');
    setInteractionMode('NORMAL');
    setShowBreakdown(false);
    setMiracleLit(false);

    const remainingHand = hand.filter((w) => w.uid !== handUid);
    let nextBag = bag;
    if (nextBag.length > 0 && remainingHand.length < handMax) {
      remainingHand.push(nextBag[0]);
      nextBag = nextBag.slice(1);
    }

    const mercuryRolled =
      targetItem.defId === 'w_mercury' && !targetItem.mercuryResolved;
    const mercuryRoll = mercuryRolled
      ? 10 + Math.floor(Math.random() * 11)
      : undefined;

    const glueUsedThisDrop = glueActive;

    const sim = simulateDrop({
      scaleWeights,
      targetWeight,
      droppedWeight: targetItem,
      glueActive: glueUsedThisDrop,
      relics,
      mercuryRoll,
    });

    const nextScale = sim.nextScaleWeights;
    const nextCurrent = sim.minCurrent;
    const nextTarget = sim.nextTarget;

    // Find the dropped instance inside nextScale (with resolved mercury weight if applicable)
    const placedInstance =
      nextScale.find((w) => w.uid === targetItem.uid) ?? targetItem;

    // Trigger immediate visual flight from wooden box to scale pan
    setFlightEvent({
      id: Date.now() + Math.random(),
      weight: placedInstance,
      startClientX,
      startClientY,
    });

    // Deterministic fixed-step simulation for r_pendulum (independent of Canvas/rAF)
    const hasPendulum = relics.includes('r_pendulum');
    const pendulumSim = simulatePendulumBounces(
      currentWeight,
      nextCurrent,
      targetWeight,
      nextTarget,
      hasPendulum
    );
    const pendulumGain = pendulumSim.bounceCount * 15;
    const nextPendulumBonus = pendulumSoulBonus + pendulumGain;

    const ratio = nextTarget > 0 ? nextCurrent / nextTarget : 0;
    const diff = Math.abs(nextTarget - nextCurrent);
    const exceeds = !glueUsedThisDrop && nextCurrent > nextTarget + tolerance;
    const tier: 'safe' | 'danger' | 'critical' =
      diff <= 3 || exceeds
        ? 'critical'
        : ratio >= 0.85 || mercuryRolled
        ? 'danger'
        : 'safe';

    setHand(remainingHand);
    setBag(nextBag);
    setScaleWeights(nextScale);
    setTargetWeight(nextTarget);
    setPendulumSoulBonus(nextPendulumBonus);
    setGlueActive(false);
    setSuspenseTier(tier);
    setDropEventId((id) => id + 1);
    setSelectedHandUid(null);

    const isFeather =
      targetItem.defId === 'w_fallen' ||
      targetItem.defId === 'w_feather' ||
      targetItem.defId === 'w_helium';
    const isLead = targetItem.defId === 'w_lead';
    const flightTimeMs = isFeather ? 420 : isLead ? 240 : 290;

    // Play contact sound right as weight touches the brass pan
    scheduleTimeout(() => {
      if (runTokenRef.current !== token) return;
      soundEngine.playDrop(tier);
      if (tier === 'danger') {
        soundEngine.playHeartbeat();
      } else if (tier === 'critical') {
        soundEngine.playTensionCreak();
      }
    }, flightTimeMs);

    if (pendulumSim.bounceCount > 0) {
      pendulumSim.bounceTimesMs.forEach((delayMs, idx) => {
        scheduleTimeout(() => {
          if (runTokenRef.current !== token) return;
          soundEngine.playBounce(idx);
          spawnFloating(64, 48 - idx * 3, '+15 魂', '#e8d8b0', '振り子の魔術');
        }, flightTimeMs + Math.min(delayMs, 850));
      });
    }

    if (mercuryRolled && mercuryRoll !== undefined) {
      scheduleTimeout(() => {
        if (runTokenRef.current !== token) return;
        spawnFloating(64, 48, `${mercuryRoll}g 確定`, '#7dd3fc', `魂 +${mercuryRoll * 5}`);
      }, flightTimeMs);
    }
    if (targetItem.defId === 'w_soul') {
      scheduleTimeout(() => {
        if (runTokenRef.current !== token) return;
        spawnFloating(34, 46, '目標 +15g', '#d8b4fe', '罪人の魂');
      }, flightTimeMs);
    }
    if (targetItem.defId === 'w_twin' && !targetItem.isCopy) {
      scheduleTimeout(() => {
        if (runTokenRef.current !== token) return;
        spawnFloating(66, 42, '双子出現', '#a5b4fc');
      }, flightTimeMs);
    }
    if (sim.slimeGrewCount > 0) {
      scheduleTimeout(() => {
        if (runTokenRef.current !== token) return;
        spawnFloating(58, 36, 'スライム成長', '#86efac', `+5g / +30魂 (×${sim.slimeGrewCount})`);
      }, flightTimeMs);
    }

    const projectedAfterDrop = evaluateCashOut({
      scaleWeights: nextScale,
      currentWeight: nextCurrent,
      targetWeight: nextTarget,
      sacrificeSoul,
      pendulumSoulBonus: nextPendulumBonus,
      deathDefiedMult,
      relics,
      bloodAllIn,
      currentCoins: coins,
      quota,
    });

    const isExactBalance = nextCurrent === nextTarget;
    if (isExactBalance) {
      setReaperSpeech('針が傷へ戻る…完全なる水平か。');
    } else if (day === 1 && trial === 2 && ratio >= 0.8) {
      setReaperSpeech(
        `あと一枚か。今なら ${projectedAfterDrop.finalCoins.toLocaleString()} G で降りられるが、どうする？`
      );
    } else if (tier === 'critical') {
      setReaperSpeech('あと一息…それとも地獄への片道切符か？');
    } else if (tier === 'danger') {
      setReaperSpeech('ギロチンの刃が首筋に触れるぞ…');
    } else {
      setReaperSpeech('ほう…まだ余裕があるようだな。');
    }

    // If achieving complete level (100%), wait for coin contact + beam swing + needle settling onto carved scratch!
    if (isExactBalance) {
      const okSettle = await sleep(flightTimeMs + 720, token);
      if (!okSettle) return;
      setMiracleLit(true);
      soundEngine.playMiracleBell();
      const okBeat = await sleep(520, token);
      if (!okBeat) return;
    } else {
      const waitMs =
        flightTimeMs + (tier === 'critical' ? 980 : tier === 'danger' ? 680 : 180);
      const alive = await sleep(waitMs, token);
      if (!alive) return;
    }

    const isWithinLimit = glueUsedThisDrop || nextCurrent <= nextTarget + tolerance;

    if (wasOverload) {
      if (isWithinLimit) {
        setDeathDefiedMult(2.0);
        setPhase('PLAYER_TURN');
        soundEngine.playDeathDefied();
        triggerFlash('gold', 500);
        triggerBanner(
          {
            title: 'DEATH DEFIED!',
            subtitle: '死線からの生還 — この審判の罪倍率 ×2.0！',
            tone: 'emerald',
          },
          1650
        );
        setReaperSpeech('チッ…死神の鎌を弾き返したか！見事な悪足掻きだ。');
      } else {
        await executeGuillotine(
          token,
          coins,
          day,
          trial,
          quota,
          masterDeck,
          relics
        );
      }
      return;
    }

    if (isWithinLimit) {
      setPhase('PLAYER_TURN');
    } else {
      const over = nextCurrent - (nextTarget + tolerance);
      if (over >= 1 && over <= overloadLimit && overloadCount < maxOverload) {
        setOverloadCount((c) => c + 1);
        setPhase('OVERLOAD_CHANCE');
        soundEngine.playTensionCreak();
        triggerFlash('crimson', 650);
        triggerShake();
        triggerBanner(
          {
            title: '超過猶予！',
            subtitle: `+${over}g 超過 — たった一手で ${nextTarget}g 以下へ引き戻せ！`,
            tone: 'crimson',
          },
          1900
        );
        setReaperSpeech(`+${over}g の超過だ。一手で引き戻さねば即刻斬首する！`);
      } else {
        await executeGuillotine(
          token,
          coins,
          day,
          trial,
          quota,
          masterDeck,
          relics
        );
      }
    }
  };

  const handleDiscardWeight = (handUid: string) => {
    if (phase !== 'PLAYER_TURN' || discardsRemaining <= 0) return;
    const item = hand.find((w) => w.uid === handUid);
    if (!item) return;

    soundEngine.playDiscard();
    const baseSac = Math.floor(item.soul / 2);
    const gained = relics.includes('r_altar') ? baseSac * 2 : baseSac;

    const remainingHand = hand.filter((w) => w.uid !== handUid);
    let nextBag = bag;
    if (nextBag.length > 0 && remainingHand.length < handMax) {
      remainingHand.push(nextBag[0]);
      nextBag = nextBag.slice(1);
    }

    setHand(remainingHand);
    setBag(nextBag);
    setSacrificeSoul((s) => s + gained);
    setDiscardsRemaining((d) => d - 1);
    setInteractionMode('NORMAL');

    spawnFloating(
      36,
      74,
      `+${gained} 魂 (供物)`,
      '#fb7185',
      relics.includes('r_altar') ? '祭壇効果×2' : undefined
    );
    setReaperSpeech('魂を捧げて活路を繋ぐか。悪くない。');
  };

  const handleClickTool = (tool: ToolInstance) => {
    if (phase !== 'PLAYER_TURN' && phase !== 'OVERLOAD_CHANCE') return;

    if (tool.defId === 't_glass') {
      if (phase === 'OVERLOAD_CHANCE') return;
      soundEngine.playTool();
      setGlassActive(true);
      setTools((prev) => prev.filter((t) => t.uid !== tool.uid));
      spawnFloating(18, 30, '袋の透視発動', '#7dd3fc');
      return;
    }

    if (tool.defId === 't_glue') {
      if (phase === 'OVERLOAD_CHANCE') return;
      soundEngine.playTool();
      setGlueActive(true);
      setTools((prev) => prev.filter((t) => t.uid !== tool.uid));
      spawnFloating(50, 62, '悪魔の接着剤 待機', '#fca5a5', '次の1回は超過しても耐える');
      return;
    }

    if (tool.defId === 't_tweezers') {
      if (scaleWeights.length === 0) return;
      soundEngine.playClick();
      if (interactionMode === 'SELECT_PAN_TWEEZERS' && activeTweezersUid === tool.uid) {
        setInteractionMode('NORMAL');
        setActiveTweezersUid(null);
      } else {
        setInteractionMode('SELECT_PAN_TWEEZERS');
        setActiveTweezersUid(tool.uid);
      }
      return;
    }

    if (tool.defId === 't_file') {
      if (phase === 'OVERLOAD_CHANCE' || hand.length === 0) return;
      soundEngine.playClick();
      if (interactionMode === 'SELECT_HAND_FILE' && activeFileUid === tool.uid) {
        setInteractionMode('NORMAL');
        setActiveFileUid(null);
      } else {
        setInteractionMode('SELECT_HAND_FILE');
        setActiveFileUid(tool.uid);
      }
    }
  };

  const handleSelectPanWeight = async (panUid: string) => {
    if (interactionMode !== 'SELECT_PAN_TWEEZERS' || !activeTweezersUid) return;
    const target = scaleWeights.find((w) => w.uid === panUid);
    if (!target) return;

    const wasOverload = phase === 'OVERLOAD_CHANCE';
    const token = runTokenRef.current;

    soundEngine.playTool();
    const nextScale = scaleWeights.filter((w) => w.uid !== panUid);
    const nextHand = [...hand, target];
    const nextTools = tools.filter((t) => t.uid !== activeTweezersUid);
    const nextCurrent = nextScale.reduce((acc, w) => acc + w.weight, 0);

    setScaleWeights(nextScale);
    setHand(nextHand);
    setTools(nextTools);
    setInteractionMode('NORMAL');
    setActiveTweezersUid(null);
    setMiracleLit(nextCurrent === targetWeight);

    spawnFloating(64, 52, `${target.name} を回収`, '#7dd3fc');

    if (wasOverload) {
      setPhase('RESOLVE_WEIGHT');
      const alive = await sleep(650, token);
      if (!alive) return;

      if (nextCurrent <= targetWeight + tolerance) {
        setDeathDefiedMult(2.0);
        setPhase('PLAYER_TURN');
        soundEngine.playDeathDefied();
        triggerFlash('gold', 500);
        triggerBanner(
          {
            title: 'DEATH DEFIED!',
            subtitle: 'ピンセットによる生還 — この審判の罪倍率 ×2.0！',
            tone: 'emerald',
          },
          1650
        );
        setReaperSpeech('抜いたか…！死神の鎌を寸前でかわすとは。');
      } else {
        await executeGuillotine(
          token,
          coins,
          day,
          trial,
          quota,
          masterDeck,
          relics
        );
      }
    }
  };

  const handleSelectHandForFile = (handUid: string) => {
    if (interactionMode !== 'SELECT_HAND_FILE' || !activeFileUid) return;
    const item = hand.find((w) => w.uid === handUid);
    if (!item) return;

    soundEngine.playTool();
    const applyFile = (w: WeightInstance): WeightInstance => ({
      ...w,
      weight: w.weight >= 0 ? Math.floor(w.weight / 2) : Math.ceil(w.weight / 2),
      soul: w.soul * 2,
      sinBonus: Number((w.sinBonus * 2).toFixed(2)),
      filedCount: (w.filedCount ?? 0) + 1,
    });

    setHand((prev) => prev.map((w) => (w.uid === handUid ? applyFile(w) : w)));
    setMasterDeck((prev) => prev.map((w) => (w.uid === handUid ? applyFile(w) : w)));
    setTools((prev) => prev.filter((t) => t.uid !== activeFileUid));
    setInteractionMode('NORMAL');
    setActiveFileUid(null);

    spawnFloating(50, 74, `${item.name} 加工完了`, '#e8d8b0', '重さ半減 · 魂と罪が永続2倍');
  };

  const handleActivateBloodAllIn = () => {
    if (
      phase !== 'PLAYER_TURN' ||
      trial !== 3 ||
      bloodAllIn ||
      scaleWeights.length > 0
    ) {
      return;
    }
    soundEngine.playTensionCreak();
    triggerFlash('crimson', 450);
    setBloodAllIn(true);
    setTargetWeight((t) => t + 20);
    triggerBanner(
      {
        title: '血のオールイン契約 締結',
        subtitle: '目標 +20g · 超過猶予なし · 完全水平でノルマ一発完済！',
        tone: 'crimson',
      },
      1800
    );
    setReaperSpeech('面白い！その命、すべて天秤に賭けるか！');
  };

  const handleCashOut = async () => {
    if (phase !== 'PLAYER_TURN') return;
    if (scaleWeights.length === 0 && sacrificeSoul === 0) return;

    const token = runTokenRef.current;
    setPhase('CASH_OUT');
    setInteractionMode('NORMAL');
    setShowBreakdown(false);

    const result = evaluateCashOut({
      scaleWeights,
      currentWeight,
      targetWeight,
      sacrificeSoul,
      pendulumSoulBonus,
      deathDefiedMult,
      relics,
      bloodAllIn,
      currentCoins: coins,
      quota,
    });

    if (result.isMiracleBalance) {
      setMiracleLit(true);
      soundEngine.playMiracleBell();
      triggerFlash('gold', 850);
      triggerBanner(
        {
          title: '完全水平 · 100%',
          subtitle: relics.includes('r_miracle')
            ? '奇跡の刻印により2回連続で発動 · 無料入替券獲得'
            : '水平倍率 ×12.0 · 無料入替券獲得',
          tone: 'gold',
        },
        1800
      );
      setReaperSpeech('完璧なる均衡…！神をも欺く業か！');
      const ok = await sleep(560, token);
      if (!ok) return;
    }

    for (let sIdx = 0; sIdx < result.steps.length; sIdx++) {
      const step = result.steps[sIdx];
      const highlightIndices =
        step.mirroredIndex !== undefined
          ? [step.mirroredIndex, step.index]
          : [step.index];
      setActiveScoreIndices(highlightIndices);
      soundEngine.playScaleNote(sIdx);

      const isSpecial =
        step.mirroredIndex !== undefined ||
        step.sinMultFactor > 1 ||
        step.addedBalanceMult > 0;

      const posX = 56 + (step.index % 6) * 4.5;
      const posY = 44 - Math.floor(step.index / 6) * 8;
      spawnFloating(
        posX,
        posY,
        step.effectLabels.slice(0, 2).join(' / ') || `+${step.addedSoul} 魂`,
        isSpecial ? '#fde047' : '#e6cfa3',
        step.effectLabels.slice(2).join(' ')
      );

      const stepMs = isSpecial ? 300 : 115;
      const ok = await sleep(stepMs, token);
      if (!ok) return;
    }

    setActiveScoreIndices([]);

    soundEngine.playBalanceMultBoom();
    setCoinBurstId((c) => c + 1);

    const earned = result.finalCoins;
    const nextCoins = coins + earned;
    setCoins(nextCoins);
    setTotalRunCoins((t) => t + earned);
    if (result.isMiracleBalance) {
      setFreeRerolls((r) => r + 1);
    }

    spawnFloating(
      50,
      36,
      `+${earned.toLocaleString()} G`,
      '#facc15',
      `水平倍率 ×${result.finalBalanceMult.toFixed(2)}`
    );

    if (result.bloodContractBonus > 0) {
      triggerBanner(
        {
          title: '血の契約 成就',
          subtitle: `完全水平達成によりノルマ ${quota.toLocaleString()} G を一発完済！`,
          tone: 'gold',
        },
        1300
      );
    } else if (!result.isMiracleBalance) {
      triggerBanner(
        {
          title: `精算 +${earned.toLocaleString()} G`,
          subtitle: `魂 ${result.totalSoul} × 罪 ${result.totalSinMult.toFixed(2)} × 水平 ${result.finalBalanceMult.toFixed(2)}`,
          tone: 'amber',
        },
        1050
      );
    }

    const finalWaitMs =
      result.isMiracleBalance || result.bloodContractBonus > 0 ? 1150 : 850;
    const okEnd = await sleep(finalWaitMs, token);
    if (!okEnd) return;

    advanceAfterTrial(nextCoins, day, trial, quota, masterDeck, relics);
  };

  const handleBuyWeight = (slotIndex: number) => {
    if (!shopInventory) return;
    if (shopInventory.purchasedWeightIndices.includes(slotIndex)) return;
    const def = shopInventory.weights[slotIndex];
    if (!def || coins < def.price) return;

    soundEngine.playBuy();
    setCoins((c) => c - def.price);
    setMasterDeck((d) => [...d, createWeightInstance(def.id)]);
    setShopInventory((s) =>
      s
        ? {
            ...s,
            purchasedWeightIndices: [...s.purchasedWeightIndices, slotIndex],
          }
        : null
    );
  };

  const handleBuyTool = (slotIndex: number) => {
    if (!shopInventory || tools.length >= 3) return;
    if (shopInventory.purchasedToolIndices.includes(slotIndex)) return;
    const def = shopInventory.tools[slotIndex];
    if (!def || coins < def.price) return;

    soundEngine.playBuy();
    setCoins((c) => c - def.price);
    setTools((t) => [...t, createToolInstance(def.id)]);
    setShopInventory((s) =>
      s
        ? {
            ...s,
            purchasedToolIndices: [...s.purchasedToolIndices, slotIndex],
          }
        : null
    );
  };

  const handleBuyRelic = (slotIndex: number) => {
    if (!shopInventory || relics.length >= 6) return;
    if (shopInventory.purchasedRelicIndices.includes(slotIndex)) return;
    const def = shopInventory.relics[slotIndex];
    if (!def || relics.includes(def.id) || coins < def.price) return;

    soundEngine.playBuy();
    setCoins((c) => c - def.price);
    setRelics((r) => [...r, def.id]);
    setShopInventory((s) =>
      s
        ? {
            ...s,
            purchasedRelicIndices: [...s.purchasedRelicIndices, slotIndex],
          }
        : null
    );
  };

  const handleRemoveWeightFromDeck = (uid: string) => {
    if (!shopInventory || shopInventory.removeUsed || coins < shopInventory.removeCost) return;
    if (masterDeck.length <= 5) return;

    soundEngine.playDiscard();
    setCoins((c) => c - shopInventory.removeCost);
    setMasterDeck((d) => d.filter((w) => w.uid !== uid));
    setShopInventory((s) => (s ? { ...s, removeUsed: true } : null));
  };

  const handleRerollShop = () => {
    if (!shopInventory) return;
    if (freeRerolls > 0) {
      soundEngine.playClick();
      setFreeRerolls((f) => f - 1);
      setShopInventory((prev) => ({
        ...generateShopInventory(relics),
        removeUsed: prev?.removeUsed ?? false,
      }));
    } else if (coins >= shopInventory.rerollCost) {
      soundEngine.playBuy();
      setCoins((c) => c - shopInventory.rerollCost);
      setShopInventory((prev) => ({
        ...generateShopInventory(relics),
        removeUsed: prev?.removeUsed ?? false,
      }));
    }
  };

  const handleNextDay = () => {
    soundEngine.playClick();
    const nextDay = day + 1;
    const nextQuota = getQuotaForDay(nextDay);
    setQuota(nextQuota);
    setShopInventory(null);
    initTrial(nextDay, 1, masterDeck, relics);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.setMuted(next);
  };

  const isOverload = phase === 'OVERLOAD_CHANCE';
  const isTurnLocked = phase !== 'PLAYER_TURN' && phase !== 'OVERLOAD_CHANCE';
  const remainingToTarget = targetWeight - currentWeight;
  const overAmount = Math.max(0, currentWeight - targetWeight);
  const canTweezersRescue =
    isOverload && scaleWeights.some((w) => currentWeight - w.weight <= targetWeight);

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col bg-[#09080b] text-[#e8e1d5] ${
        shaking ? 'animate-screen-shake' : ''
      }`}
    >
      {/* QUIET TOP BAR (No loud gold borders in normal play) */}
      <header className="shrink-0 z-20 flex items-center justify-between gap-4 px-4 sm:px-6 py-2 bg-[#0e0c10] border-b border-stone-800/80">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Scale className="w-4 h-4 text-[#b89146]" />
            <h1 className="font-display text-sm sm:text-base font-bold tracking-wider text-[#dcd4c6] whitespace-nowrap">
              SOUL SCALE
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-400 font-mono-num whitespace-nowrap">
            <span className="text-[#d6cfc2] font-bold">DAY {day}</span>
            <span className="text-stone-600">·</span>
            <span>審判 {trial}/3</span>
          </div>
        </div>

        <div className="font-mono-num text-xs sm:text-sm whitespace-nowrap">
          <span className="text-stone-400 mr-1.5">ノルマ</span>
          <strong className="text-[#e5d9c3]">{coins.toLocaleString()}</strong>
          <span className="text-stone-600 mx-1">/</span>
          <strong className={coins >= quota ? 'text-emerald-400' : 'text-stone-300'}>
            {quota.toLocaleString()} G
          </strong>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            className="p-2 bg-[#141217] hover:bg-[#1d1a21] border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            title={muted ? 'ミュート解除' : 'ミュート'}
            aria-label={muted ? 'ミュート解除' : 'ミュート'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setShowRules(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141217] hover:bg-[#1d1a21] border border-stone-800 text-stone-300 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#b89146]" />
            <span>死神の法典</span>
          </button>
        </div>
      </header>

      {/* MAIN ARENA */}
      <main className="relative flex-1 min-h-0">
        <ScaleCanvas
          currentWeight={currentWeight}
          targetWeight={targetWeight}
          scaleWeights={scaleWeights}
          phase={phase}
          interactionMode={interactionMode}
          activeScoreIndices={activeScoreIndices}
          dropEventId={dropEventId}
          flightEvent={flightEvent}
          coinBurstId={coinBurstId}
          hasPendulum={relics.includes('r_pendulum')}
          suspenseTier={suspenseTier}
          miracleLit={miracleLit}
          reaperSpeech={reaperSpeech}
          onSelectPanWeight={handleSelectPanWeight}
        />

        <FloatingEffects
          effects={floatingEffects}
          flashTone={flashTone}
          banner={banner}
        />

        {/* Top-Left Overlay: Bag Tracker & Active Buffs */}
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-2">
          <BagTracker bag={bag} glassActive={glassActive} />

          {(glueActive || deathDefiedMult > 1 || bloodAllIn) && (
            <div className="flex flex-col gap-1 text-[11px] font-medium">
              {glueActive && (
                <div className="px-2.5 py-1 bg-[#1e1215]/95 border border-rose-800/70 text-rose-200">
                  悪魔の接着剤：次の1回超過を耐える
                </div>
              )}
              {deathDefiedMult > 1 && (
                <div className="px-2.5 py-1 bg-[#0e1c16]/95 border border-emerald-700/70 text-emerald-200">
                  起死回生：罪倍率 ×2.0 有効
                </div>
              )}
              {bloodAllIn && (
                <div className="px-2.5 py-1 bg-[#210d10]/95 border border-red-800 text-red-200">
                  血のオールイン契約中（猶予なし・完全水平でノルマ完済）
                </div>
              )}
            </div>
          )}

          {trial === 3 &&
            !bloodAllIn &&
            scaleWeights.length === 0 &&
            phase === 'PLAYER_TURN' && (
              <button
                type="button"
                onClick={handleActivateBloodAllIn}
                className="flex items-center gap-2 px-3 py-2 bg-[#1c0c0f]/95 hover:bg-[#2a1015] border border-red-900/80 text-red-200 text-xs font-semibold shadow-lg transition-colors cursor-pointer"
              >
                <Flame className="w-4 h-4 text-red-400 shrink-0" />
                <div className="text-left">
                  <div>血のオールイン契約を結ぶ</div>
                  <div className="text-[10px] font-normal text-red-300/80">
                    目標+20g・猶予なし / 完全水平でノルマ完済
                  </div>
                </div>
              </button>
            )}
        </div>

        {/* Top-Right Overlay: Owned Relics */}
        {relics.length > 0 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0f0d13]/90 border border-stone-800">
            <span className="text-[11px] text-stone-400 font-medium mr-1">
              遺物 ({relics.length}/6)
            </span>
            {relics.map((rid) => {
              const rDef = RELIC_DATABASE[rid];
              return (
                <div
                  key={rid}
                  title={`${rDef.name}: ${rDef.effectDesc}`}
                  className="p-1 bg-[#17131d] border border-stone-700/70 cursor-help"
                >
                  <RelicGlyph defId={rid} className="w-5 h-5" />
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* BOTTOM WORKBENCH: SACRIFICE + SHALLOW WOODEN WEIGHT BOX + ACTION CUE */}
      <footer className="shrink-0 z-20 bg-[#0d0b0e] border-t border-stone-800/80 px-3 sm:px-5 py-2.5">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left: Sacrifice Altar & Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={
                phase !== 'PLAYER_TURN' ||
                discardsRemaining <= 0 ||
                hand.length === 0
              }
              onClick={() => {
                soundEngine.playClick();
                setInteractionMode((m) => (m === 'DISCARD' ? 'NORMAL' : 'DISCARD'));
              }}
              className={`flex flex-col items-start px-3 py-2 border text-left transition-colors ${
                interactionMode === 'DISCARD'
                  ? 'bg-[#2a1218] border-rose-500 text-rose-100 cursor-pointer'
                  : phase === 'PLAYER_TURN' && discardsRemaining > 0 && hand.length > 0
                  ? 'bg-[#141116] hover:bg-[#1e171f] border-stone-700/80 text-stone-200 cursor-pointer'
                  : 'bg-[#100e12] border-stone-800/60 text-stone-600 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {interactionMode === 'DISCARD'
                    ? '供物選択中（解除）'
                    : '供物台に捧げる'}
                </span>
              </div>
              <div className="font-mono-num text-[11px] text-stone-400 mt-0.5">
                残 {discardsRemaining}/{maxDiscards} · 魂{' '}
                <strong className="text-stone-200">
                  {sacrificeSoul + pendulumSoulBonus}
                </strong>
              </div>
            </button>

            {/* 3 Tool Slots */}
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((slotIdx) => {
                const tool = tools[slotIdx];
                if (!tool) {
                  return (
                    <div
                      key={`empty_tool_${slotIdx}`}
                      className="w-11 h-12 border border-dashed border-stone-800/80 bg-[#0b090d] flex items-center justify-center text-[10px] text-stone-700"
                    >
                      道具
                    </div>
                  );
                }

                const isSelected =
                  (interactionMode === 'SELECT_PAN_TWEEZERS' &&
                    activeTweezersUid === tool.uid) ||
                  (interactionMode === 'SELECT_HAND_FILE' &&
                    activeFileUid === tool.uid);

                const isOverloadUsable =
                  !isOverload || tool.defId === 't_tweezers';

                const isOverloadRescue =
                  canTweezersRescue && tool.defId === 't_tweezers';

                return (
                  <button
                    key={tool.uid}
                    type="button"
                    disabled={isTurnLocked || !isOverloadUsable}
                    onClick={() => handleClickTool(tool)}
                    title={`${tool.name}: ${tool.effectDesc}`}
                    className={`relative w-11 h-12 border flex flex-col items-center justify-center transition-colors ${
                      isTurnLocked || !isOverloadUsable
                        ? 'bg-[#110f14] border-stone-800 opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#1a2633] border-sky-400 cursor-pointer'
                        : isOverloadRescue
                        ? 'bg-[#10261e] border-emerald-500 cursor-pointer'
                        : 'bg-[#141219] hover:bg-[#1e1b26] border-stone-700 hover:border-stone-500 cursor-pointer'
                    }`}
                  >
                    <ToolGlyph defId={tool.defId} className="w-5 h-5" />
                    <span className="text-[9px] text-stone-300 truncate max-w-[40px] mt-0.5">
                      {tool.name.slice(0, 4)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center: ONE CONTINUOUS SHALLOW WOODEN WEIGHT BOX (浅い木箱) */}
          <div className="flex-1 flex items-center justify-center overflow-x-auto py-0.5">
            {hand.length === 0 ? (
              <div className="px-6 py-5 border border-stone-800 bg-[#14100d] text-xs text-stone-500">
                木箱は空です（手を引くか、ピンセットで回収）
              </div>
            ) : (
              <div
                className="inline-flex items-stretch bg-[#1b140f] border-2 border-[#473321] shadow-[inset_0_3px_12px_rgba(0,0,0,0.85),0_4px_14px_rgba(0,0,0,0.65)] divide-x divide-[#382719]"
                style={{
                  borderTopColor: '#63482f',
                  borderLeftColor: '#563e28',
                }}
              >
                {hand.map((w) => {
                  const isMercuryOscillating =
                    w.defId === 'w_mercury' && !w.mercuryResolved;

                  const sim = isOverload
                    ? simulateDrop({
                        scaleWeights,
                        targetWeight,
                        droppedWeight: w,
                        glueActive,
                        relics,
                      })
                    : null;

                  const isDiscardMode = interactionMode === 'DISCARD';
                  const isFileMode = interactionMode === 'SELECT_HAND_FILE';
                  const canClick =
                    !isTurnLocked && interactionMode !== 'SELECT_PAN_TWEEZERS';

                  const isActivePick =
                    hoveredHandUid === w.uid || selectedHandUid === w.uid;

                  let overloadStatusLine: string | null = null;
                  let overloadStatusCls = 'text-stone-400';

                  if (sim) {
                    if (sim.survivalStatus === 'SURVIVE') {
                      overloadStatusLine = `投入後 ${sim.minCurrent}g · 生還`;
                      overloadStatusCls = 'text-emerald-300 font-semibold';
                    } else if (sim.survivalStatus === 'UNCERTAIN') {
                      overloadStatusLine = `投入後 ${sim.minCurrent}〜${sim.maxCurrent}g · 不確定`;
                      overloadStatusCls = 'text-amber-300 font-semibold';
                    } else {
                      overloadStatusLine = `投入後 ${sim.minCurrent}g · ${sim.minOver}g超過`;
                      overloadStatusCls = 'text-rose-300/90 font-semibold';
                    }
                  }

                  const subLine = isDiscardMode
                    ? `捧げる (+${
                        relics.includes('r_altar')
                          ? Math.floor(w.soul / 2) * 2
                          : Math.floor(w.soul / 2)
                      } 魂)`
                    : isFileMode
                    ? '重さ半減 · 価値2倍'
                    : overloadStatusLine;

                  return (
                    <button
                      key={w.uid}
                      type="button"
                      disabled={!canClick}
                      onMouseEnter={() => setHoveredHandUid(w.uid)}
                      onMouseLeave={() =>
                        setHoveredHandUid((curr) => (curr === w.uid ? null : curr))
                      }
                      onFocus={() => setHoveredHandUid(w.uid)}
                      onBlur={() =>
                        setHoveredHandUid((curr) => (curr === w.uid ? null : curr))
                      }
                      onClick={(e) => {
                        if (isDiscardMode) {
                          handleDiscardWeight(w.uid);
                        } else if (isFileMode) {
                          handleSelectHandForFile(w.uid);
                        } else {
                          handleDropWeight(w.uid, e);
                        }
                      }}
                      title={w.effectDesc ? `${w.name}: ${w.effectDesc}` : w.name}
                      className={`group relative flex flex-col items-center justify-between w-[138px] sm:w-[152px] shrink-0 px-2.5 pt-2.5 pb-2 text-center transition-colors ${
                        !canClick
                          ? 'bg-[#140f0b] opacity-55 cursor-not-allowed'
                          : isDiscardMode
                          ? 'bg-[#261316] hover:bg-[#31171b] cursor-pointer'
                          : isFileMode
                          ? 'bg-[#151c26] hover:bg-[#1b2533] cursor-pointer'
                          : 'bg-[#18120d] hover:bg-[#201811] cursor-pointer'
                      }`}
                    >
                      {/* Recessed wooden compartment shadow */}
                      <div className="pointer-events-none absolute inset-1 border border-black/40" />

                      {/* Small Ivory Selection Marker (小さな象牙色の印) */}
                      {canClick && isActivePick && (
                        <span
                          aria-hidden="true"
                          className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-1 rounded-xs bg-[#efe7d6] shadow-sm"
                        />
                      )}

                      {/* Top quiet value line */}
                      <div className="w-full flex items-center justify-end font-mono-num text-[10px] text-stone-400/90 leading-none mb-0.5">
                        <span>
                          魂{w.soul}
                          {w.sinBonus > 0 ? ` · 罪+${w.sinBonus}` : ''}
                        </span>
                      </div>

                      {/* Large Shared Weight Artwork + Detached Shadow on Lift */}
                      <div className="relative flex items-center justify-center h-14 w-full">
                        <div
                          aria-hidden="true"
                          className={`absolute bottom-1 rounded-full bg-black/75 transition-all duration-150 ${
                            isActivePick && canClick
                              ? 'w-9 h-2 blur-[2px] opacity-65 translate-y-1'
                              : 'w-11 h-2.5 blur-[1.5px] opacity-85'
                          }`}
                        />
                        <div
                          className={`relative transition-transform duration-150 ${
                            isActivePick && canClick ? '-translate-y-2' : ''
                          }`}
                        >
                          <WeightGlyph defId={w.defId} className="w-12 h-12" />
                        </div>
                      </div>

                      {/* Front Wooden Rim Typography: Calm Name + Unmistakable Weight */}
                      <div className="w-full pt-1.5 mt-0.5 border-t border-[#322215] flex items-baseline justify-between gap-1.5">
                        <span className="text-[11px] font-medium text-[#e6dfd2] truncate">
                          {w.name}
                        </span>
                        <span
                          className={`font-mono-num text-xs font-bold shrink-0 tracking-tight ${
                            w.weight < 0
                              ? 'text-[#7dd3c8]'
                              : isMercuryOscillating
                              ? 'text-[#8ecae6]'
                              : 'text-[#efe2c4]'
                          }`}
                        >
                          <MercuryWeightValue
                            active={isMercuryOscillating}
                            fixedWeight={w.weight}
                          />
                        </span>
                      </div>

                      {subLine && (
                        <div className={`text-[10px] mt-0.5 leading-tight ${overloadStatusCls}`}>
                          {subLine}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: "あと ○g" Cue & "{N} G で手を引く" CTA */}
          <div className="relative flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
            {showBreakdown && (
              <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-[#141117] border border-stone-700 shadow-2xl text-xs font-mono-num z-40">
                <div className="font-sans font-bold text-[#e6dfd2] mb-2">
                  現在の見込み報酬の内訳
                </div>
                <div className="space-y-1 text-stone-300">
                  <div className="flex justify-between">
                    <span>合計の魂</span>
                    <strong className="text-[#ece6da]">{previewScore.totalSoul}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>罪倍率</span>
                    <strong className="text-rose-300">
                      ×{previewScore.totalSinMult.toFixed(2)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>水平精度倍率</span>
                    <strong className="text-[#e6c478]">
                      ×{previewScore.finalBalanceMult.toFixed(2)}
                    </strong>
                  </div>
                  {previewScore.bloodContractBonus > 0 && (
                    <div className="flex justify-between text-red-300">
                      <span>血の契約 残額保証</span>
                      <strong>
                        +{previewScore.bloodContractBonus.toLocaleString()} G
                      </strong>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-stone-800 text-[#f1d58a] font-bold text-sm">
                    <span>合計見込み</span>
                    <span>{previewScore.finalCoins.toLocaleString()} G</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowBreakdown((b) => !b)}
              className="flex flex-col items-end px-3 py-1.5 bg-[#131115] hover:bg-[#1a171d] border border-stone-800 text-right transition-colors cursor-pointer"
              title="計算の内訳を開く"
            >
              <div className="font-mono-num text-xs font-bold">
                {remainingToTarget === 0 ? (
                  <span className={miracleLit ? 'text-yellow-300' : 'text-[#efe2c4]'}>
                    完全水平 0g
                  </span>
                ) : remainingToTarget > 0 ? (
                  <span className="text-[#e6dfd2]">あと {remainingToTarget}g</span>
                ) : (
                  <span className="text-red-400">超過 +{overAmount}g</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400">
                <span>倍率内訳</span>
                <ChevronUp
                  className={`w-3 h-3 transition-transform ${
                    showBreakdown ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            <button
              type="button"
              disabled={
                phase !== 'PLAYER_TURN' ||
                (scaleWeights.length === 0 && sacrificeSoul === 0)
              }
              onClick={handleCashOut}
              className={`px-4 sm:px-5 py-3 font-bold text-sm tracking-wide transition-colors whitespace-nowrap font-mono-num border ${
                phase === 'PLAYER_TURN' &&
                (scaleWeights.length > 0 || sacrificeSoul > 0)
                  ? miracleLit
                    ? 'bg-[#c99b32] hover:bg-[#dbb042] border-[#f6dc88] text-stone-950 shadow-lg cursor-pointer'
                    : 'bg-[#2a2117] hover:bg-[#382b1d] border-[#87673b] text-[#f2e6cf] cursor-pointer'
                  : 'bg-[#141216] border-stone-800 text-stone-600 cursor-not-allowed'
              }`}
            >
              {previewScore.finalCoins.toLocaleString()} G で手を引く
            </button>
          </div>
        </div>
      </footer>

      {/* SHOP MODAL */}
      {phase === 'SHOP' && shopInventory && (
        <ShopModal
          day={day}
          coins={coins}
          freeRerolls={freeRerolls}
          shop={shopInventory}
          deck={masterDeck}
          tools={tools}
          relics={relics}
          onBuyWeight={handleBuyWeight}
          onBuyTool={handleBuyTool}
          onBuyRelic={handleBuyRelic}
          onRemoveWeight={handleRemoveWeightFromDeck}
          onReroll={handleRerollShop}
          onNextDay={handleNextDay}
        />
      )}

      {/* GAME OVER MODAL */}
      {phase === 'GAME_OVER' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#120b10] border border-red-900/70 p-7 text-center shadow-2xl">
            <Skull className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="font-display text-3xl font-bold text-red-400 tracking-widest">
              審判執行
            </h2>
            <p className="text-sm text-stone-300 mt-2">
              DAY {day} のノルマ（{quota.toLocaleString()} G）に届かず、死神の刃が振り下ろされた。
            </p>

            <div className="my-5 p-4 bg-[#1a1116] border border-stone-800 space-y-2 text-xs font-mono-num">
              <div className="flex justify-between">
                <span className="text-stone-400">到達日数</span>
                <span className="text-amber-300 font-bold">DAY {day}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">最終所持コイン</span>
                <span className="text-red-300 font-bold">
                  {coins.toLocaleString()} / {quota.toLocaleString()} G
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">累計獲得コイン</span>
                <span className="text-amber-200 font-bold">
                  {totalRunCoins.toLocaleString()} G
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">獲得遺物数</span>
                <span className="text-purple-300 font-bold">{relics.length} 個</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetGame}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-800 hover:bg-red-700 text-stone-100 font-bold text-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>最初からやり直す</span>
            </button>
          </div>
        </div>
      )}

      {/* RULES / CODEX MODAL */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
