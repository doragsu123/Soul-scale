import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronUp,
  Flame,
  HelpCircle,
  RotateCcw,
  Scale,
  Skull,
  Sparkles,
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
import { ScaleCanvas } from './components/ScaleCanvas';
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

  return <span>{active ? `${display}g?` : `${fixedWeight}g`}</span>;
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

  const handleDropWeight = async (handUid: string) => {
    if (phase !== 'PLAYER_TURN' && phase !== 'OVERLOAD_CHANCE') return;
    const wasOverload = phase === 'OVERLOAD_CHANCE';

    const targetItem = hand.find((w) => w.uid === handUid);
    if (!targetItem) return;

    const token = runTokenRef.current;
    setPhase('RESOLVE_WEIGHT');
    setInteractionMode('NORMAL');
    setShowBreakdown(false);

    const remainingHand = hand.filter((w) => w.uid === handUid);
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

    soundEngine.playDrop(tier);
    if (tier === 'danger') {
      soundEngine.playHeartbeat();
    } else if (tier === 'critical') {
      soundEngine.playTensionCreak();
    }

    // Play deterministic pendulum bounce popups & chimes purely as presentation
    if (pendulumSim.bounceCount > 0) {
      pendulumSim.bounceTimesMs.forEach((delayMs, idx) => {
        scheduleTimeout(() => {
          if (runTokenRef.current !== token) return;
          soundEngine.playBounce(idx);
          spawnFloating(64, 48 - idx * 3, '+15 魂', '#fde047', '振り子の魔術');
        }, Math.min(delayMs, 950));
      });
    }

    if (mercuryRolled && mercuryRoll !== undefined) {
      spawnFloating(64, 48, `${mercuryRoll}g 確定!`, '#38bdf8', `魂 +${mercuryRoll * 5}`);
    }
    if (targetItem.defId === 'w_soul') {
      spawnFloating(34, 46, '目標 +15g', '#e9d5ff', '罪人の魂');
    }
    if (targetItem.defId === 'w_twin' && !targetItem.isCopy) {
      spawnFloating(66, 42, '双子出現!', '#a5b4fc');
    }
    if (sim.slimeGrewCount > 0) {
      spawnFloating(58, 36, 'スライム成長!', '#86efac', `+5g / +30魂 (×${sim.slimeGrewCount})`);
    }

    // Compute projected payout for Reaper's dialogue
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

    if (nextCurrent === nextTarget) {
      setReaperSpeech('なんと…完璧な均衡だと！？');
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

    const waitMs = tier === 'critical' ? 1400 : tier === 'danger' ? 950 : 250;
    const alive = await sleep(waitMs, token);
    if (!alive) return;

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
      spawnFloating(18, 30, '袋の透視発動！', '#38bdf8');
      return;
    }

    if (tool.defId === 't_glue') {
      if (phase === 'OVERLOAD_CHANCE') return;
      soundEngine.playTool();
      setGlueActive(true);
      setTools((prev) => prev.filter((t) => t.uid !== tool.uid));
      spawnFloating(50, 62, '悪魔の接着剤 待機!', '#fca5a5', '次の1回は超過しても耐える');
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

    setScaleWeights(nextScale);
    setHand(nextHand);
    setTools(nextTools);
    setInteractionMode('NORMAL');
    setActiveTweezersUid(null);

    spawnFloating(64, 52, `${target.name} を回収`, '#7dd3fc');

    if (wasOverload) {
      const nextCurrent = nextScale.reduce((acc, w) => acc + w.weight, 0);
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

    spawnFloating(50, 74, `${item.name} 加工完了`, '#fde047', '重さ半減 · 魂と罪が永続2倍');
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
      soundEngine.playMiracleBell();
      triggerFlash('gold', 900);
      triggerBanner(
        {
          title: 'MIRACLE BALANCE!!',
          subtitle: relics.includes('r_miracle')
            ? '完全水平（誤差0g）— 奇跡の刻印により2回連続発動！'
            : '完全水平（誤差0g）— 水平倍率 ×12.0 + 無料入替券獲得！',
          tone: 'gold',
        },
        1900
      );
      setReaperSpeech('完璧なる均衡…！神をも欺く業か！');
      const ok = await sleep(620, token);
      if (!ok) return;
    }

    // Dynamic rhythmic cash-out: brisk 110ms for plain weights, punchy 300ms for special triggers
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
        isSpecial ? '#fde047' : '#fbbf24',
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
          title: '血の契約 成就！！',
          subtitle: `完全水平達成によりノルマ ${quota.toLocaleString()} G を一発完済！`,
          tone: 'gold',
        },
        1400
      );
    } else if (!result.isMiracleBalance) {
      triggerBanner(
        {
          title: `精算完了 +${earned.toLocaleString()} G`,
          subtitle: `魂 ${result.totalSoul} × 罪 ${result.totalSinMult.toFixed(2)} × 水平 ${result.finalBalanceMult.toFixed(2)}`,
          tone: 'amber',
        },
        1050
      );
    }

    const finalWaitMs =
      result.isMiracleBalance || result.bloodContractBonus > 0 ? 1200 : 880;
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
      className={`h-screen w-screen overflow-hidden flex flex-col bg-[#09080c] text-[#ece6da] ${
        shaking ? 'animate-screen-shake' : ''
      }`}
    >
      {/* STREAMLINED TOP HUD (Focus stays on the Scale!) */}
      <header className="shrink-0 z-20 flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 bg-[#110d16] border-b border-amber-800/40">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <Scale className="w-5 h-5 text-amber-400" />
            <h1 className="font-display text-base sm:text-lg font-bold tracking-wider text-amber-200 whitespace-nowrap">
              SOUL SCALE
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-300 font-mono-num whitespace-nowrap">
            <span className="text-amber-300 font-bold">DAY {day}</span>
            <span className="text-stone-600">·</span>
            <span>審判 {trial}/3</span>
          </div>
        </div>

        <div className="font-mono-num text-xs sm:text-sm whitespace-nowrap">
          <span className="text-stone-400 mr-1.5">ノルマ</span>
          <strong className="text-amber-300">{coins.toLocaleString()}</strong>
          <span className="text-stone-500 mx-1">/</span>
          <strong className={coins >= quota ? 'text-emerald-400' : 'text-stone-200'}>
            {quota.toLocaleString()} G
          </strong>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            className="p-2 bg-[#191520] hover:bg-[#241e2e] border border-stone-700 text-stone-300 hover:text-amber-200 transition-colors cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-2 bg-[#191520] hover:bg-[#241e2e] border border-amber-700/50 text-amber-200 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            <HelpCircle className="w-4 h-4" />
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
          coinBurstId={coinBurstId}
          hasPendulum={relics.includes('r_pendulum')}
          suspenseTier={suspenseTier}
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
            <div className="flex flex-col gap-1 text-[11px] font-semibold">
              {glueActive && (
                <div className="px-2.5 py-1 bg-rose-950/90 border border-rose-500/70 text-rose-200">
                  悪魔の接着剤：次の1回超過を耐える
                </div>
              )}
              {deathDefiedMult > 1 && (
                <div className="px-2.5 py-1 bg-emerald-950/90 border border-emerald-500/70 text-emerald-200">
                  起死回生：罪倍率 ×2.0 有効
                </div>
              )}
              {bloodAllIn && (
                <div className="px-2.5 py-1 bg-red-950/90 border border-red-500 text-red-200">
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
                className="flex items-center gap-2 px-3 py-2 bg-[#2b090e]/95 hover:bg-[#3e0d14] border border-red-500 text-red-100 text-xs font-bold shadow-lg transition-colors cursor-pointer"
              >
                <Flame className="w-4 h-4 text-red-400 shrink-0" />
                <div className="text-left">
                  <div>血のオールイン契約を結ぶ</div>
                  <div className="text-[10px] font-normal text-red-300">
                    目標+20g・猶予なし / 完全水平でノルマ完済
                  </div>
                </div>
              </button>
            )}
        </div>

        {/* Top-Right Overlay: Owned Relics */}
        {relics.length > 0 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#120f17]/90 border border-purple-900/60">
            <span className="text-[11px] text-purple-300 font-semibold mr-1">
              遺物 ({relics.length}/6)
            </span>
            {relics.map((rid) => {
              const rDef = RELIC_DATABASE[rid];
              return (
                <div
                  key={rid}
                  title={`${rDef.name}: ${rDef.effectDesc}`}
                  className="p-1 bg-[#1e1629] border border-purple-700/50 cursor-help"
                >
                  <RelicGlyph defId={rid} className="w-5 h-5" />
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* BOTTOM CONTROL DECK */}
      <footer className="shrink-0 z-20 bg-[#110d16] border-t border-amber-800/40 px-3 sm:px-5 py-2.5">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left: Sacrifice Altar */}
          <div className="flex items-center gap-2.5 shrink-0">
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
              className={`flex flex-col items-start px-3.5 py-2 border text-left transition-colors ${
                interactionMode === 'DISCARD'
                  ? 'bg-rose-950 border-rose-400 text-rose-100 cursor-pointer'
                  : phase === 'PLAYER_TURN' && discardsRemaining > 0 && hand.length > 0
                  ? 'bg-[#1a141d] hover:bg-[#261a24] border-rose-800/60 text-stone-200 cursor-pointer'
                  : 'bg-[#131016] border-stone-800 text-stone-600 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {interactionMode === 'DISCARD'
                    ? '供物選択中（解除）'
                    : '供物台に捧げる'}
                </span>
              </div>
              <div className="font-mono-num text-[11px] text-stone-400 mt-0.5">
                残 {discardsRemaining}/{maxDiscards} · 蓄積魂:{' '}
                <strong className="text-rose-300">
                  {sacrificeSoul + pendulumSoulBonus}
                </strong>
              </div>
            </button>
          </div>

          {/* Center: Hand Tray */}
          <div className="flex-1 flex items-center justify-center gap-2.5 overflow-x-auto py-0.5">
            {hand.length === 0 ? (
              <div className="px-6 py-4 border border-stone-800 bg-[#15111a] text-xs text-stone-500">
                手札がありません（手を引くか、ピンセットで回収）
              </div>
            ) : (
              hand.map((w) => {
                const isMercuryOscillating =
                  w.defId === 'w_mercury' && !w.mercuryResolved;

                // Pure drop simulation shared with actual execution
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

                let overloadCardStyle = 'bg-[#18141f] hover:bg-[#221c2c] hover:-translate-y-1 border-amber-800/50 hover:border-amber-400 cursor-pointer';
                let overloadStatusLine: string | null = null;
                let overloadStatusCls = 'text-stone-400';

                if (sim) {
                  if (sim.survivalStatus === 'SURVIVE') {
                    overloadCardStyle =
                      'bg-[#0e261f] hover:-translate-y-1.5 border-emerald-400 shadow-lg shadow-emerald-900/30 cursor-pointer';
                    overloadStatusLine = `投入後 ${sim.minCurrent}g · 生還`;
                    overloadStatusCls = 'text-emerald-300 font-bold';
                  } else if (sim.survivalStatus === 'UNCERTAIN') {
                    overloadCardStyle =
                      'bg-[#241b0c] hover:-translate-y-1 border-amber-400 cursor-pointer';
                    overloadStatusLine = `投入後 ${sim.minCurrent}〜${sim.maxCurrent}g · 不確定`;
                    overloadStatusCls = 'text-amber-300 font-bold';
                  } else {
                    overloadCardStyle =
                      'bg-[#191115] border-red-900/50 opacity-75 hover:opacity-100 cursor-pointer';
                    overloadStatusLine = `投入後 ${sim.minCurrent}g · ${sim.minOver}g超過`;
                    overloadStatusCls = 'text-red-300 font-semibold';
                  }
                }

                const cardVisualClass = !canClick
                  ? 'bg-[#141019] border-stone-800 opacity-55 cursor-not-allowed'
                  : isDiscardMode
                  ? 'bg-[#261118] hover:-translate-y-1 border-rose-500 cursor-pointer'
                  : isFileMode
                  ? 'bg-[#161c2b] hover:-translate-y-1 border-sky-400 cursor-pointer'
                  : overloadCardStyle;

                return (
                  <button
                    key={w.uid}
                    type="button"
                    disabled={!canClick}
                    onClick={() => {
                      if (isDiscardMode) {
                        handleDiscardWeight(w.uid);
                      } else if (isFileMode) {
                        handleSelectHandForFile(w.uid);
                      } else {
                        handleDropWeight(w.uid);
                      }
                    }}
                    className={`group relative flex flex-col justify-between w-[170px] sm:w-[192px] shrink-0 p-2.5 border text-left transition-transform duration-150 ${cardVisualClass}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <WeightGlyph
                          defId={w.defId}
                          className="w-8 h-8 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-100 truncate">
                            {w.name}
                          </div>
                          <div
                            className={`font-mono-num text-sm font-bold ${
                              w.weight < 0
                                ? 'text-teal-300'
                                : isMercuryOscillating
                                ? 'text-sky-300'
                                : 'text-amber-300'
                            }`}
                          >
                            <MercuryWeightValue
                              active={isMercuryOscillating}
                              fixedWeight={w.weight}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="font-mono-num text-[11px] text-right shrink-0">
                        <div className="text-amber-200">魂 {w.soul}</div>
                        {w.sinBonus > 0 && (
                          <div className="text-rose-300">罪 +{w.sinBonus}</div>
                        )}
                      </div>
                    </div>

                    {(isDiscardMode || isFileMode || overloadStatusLine || w.effectDesc) && (
                      <div
                        className={`mt-1.5 text-[10px] line-clamp-2 leading-snug ${
                          overloadStatusLine ? overloadStatusCls : 'text-stone-400'
                        }`}
                      >
                        {isDiscardMode
                          ? `捧げると +${
                              relics.includes('r_altar')
                                ? Math.floor(w.soul / 2) * 2
                                : Math.floor(w.soul / 2)
                            } 魂`
                          : isFileMode
                          ? '重さを半減し、魂と罪を永続2倍'
                          : overloadStatusLine ?? w.effectDesc}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Decision Cues + Tools (max 3) + Cash-Out CTA */}
          <div className="relative flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
            {/* Popover breakdown when clicked */}
            {showBreakdown && (
              <div className="absolute bottom-full right-0 mb-2 w-72 p-3 bg-[#15111b] border border-amber-700/60 shadow-2xl text-xs font-mono-num z-40">
                <div className="font-sans font-bold text-amber-200 mb-2">
                  現在の見込み報酬の内訳
                </div>
                <div className="space-y-1 text-stone-300">
                  <div className="flex justify-between">
                    <span>合計の魂</span>
                    <strong className="text-amber-200">{previewScore.totalSoul}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>罪倍率</span>
                    <strong className="text-rose-300">
                      ×{previewScore.totalSinMult.toFixed(2)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>水平精度倍率</span>
                    <strong className="text-yellow-300">
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
                  <div className="flex justify-between pt-1.5 border-t border-stone-800 text-amber-300 font-bold text-sm">
                    <span>合計見込み</span>
                    <span>{previewScore.finalCoins.toLocaleString()} G</span>
                  </div>
                </div>
              </div>
            )}

            {/* Next Decision Cue ("あと何g" & toggleable breakdown) */}
            <button
              type="button"
              onClick={() => setShowBreakdown((b) => !b)}
              className="flex flex-col items-end px-2.5 py-1.5 bg-[#16121c] hover:bg-[#1f1927] border border-stone-700/80 text-right transition-colors cursor-pointer"
              title="計算の内訳を開く"
            >
              <div className="font-mono-num text-xs font-bold">
                {remainingToTarget === 0 ? (
                  <span className="text-yellow-300">完全水平 0g</span>
                ) : remainingToTarget > 0 ? (
                  <span className="text-amber-200">あと {remainingToTarget}g</span>
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

            {/* 3 Tool Slots */}
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((slotIdx) => {
                const tool = tools[slotIdx];
                if (!tool) {
                  return (
                    <div
                      key={`empty_tool_${slotIdx}`}
                      className="w-12 h-12 border border-dashed border-stone-800 bg-[#0e0b12] flex items-center justify-center text-[10px] text-stone-700"
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
                    className={`relative w-12 h-12 border flex flex-col items-center justify-center transition-colors ${
                      isTurnLocked || !isOverloadUsable
                        ? 'bg-[#120f17] border-stone-800 opacity-45 cursor-not-allowed'
                        : isSelected
                        ? 'bg-sky-900/80 border-sky-400 cursor-pointer'
                        : isOverloadRescue
                        ? 'bg-emerald-950/90 border-emerald-400 cursor-pointer'
                        : 'bg-[#171522] hover:bg-[#231f33] border-sky-800/60 hover:border-sky-400 cursor-pointer'
                    }`}
                  >
                    <ToolGlyph defId={tool.defId} className="w-6 h-6" />
                    <span className="text-[9px] text-stone-300 truncate max-w-[44px] mt-0.5">
                      {tool.name.slice(0, 4)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Primary CTA: "{N} G で手を引く" */}
            <button
              type="button"
              disabled={
                phase !== 'PLAYER_TURN' ||
                (scaleWeights.length === 0 && sacrificeSoul === 0)
              }
              onClick={handleCashOut}
              className={`flex items-center gap-2 px-4 sm:px-5 py-3 font-bold text-sm tracking-wide transition-colors whitespace-nowrap font-mono-num ${
                phase === 'PLAYER_TURN' &&
                (scaleWeights.length > 0 || sacrificeSoul > 0)
                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-lg shadow-amber-900/30 cursor-pointer'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{previewScore.finalCoins.toLocaleString()} G で手を引く</span>
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
          <div className="w-full max-w-md bg-[#120b10] border border-red-700/70 p-7 text-center shadow-2xl">
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
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-700 hover:bg-red-600 text-stone-100 font-bold text-sm transition-colors cursor-pointer"
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
