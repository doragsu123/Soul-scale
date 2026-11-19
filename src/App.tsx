import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
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

/** Hand card for oscillating Unstable Mercury display */
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
  // Core run state
  const [phase, setPhase] = useState<GamePhase>('PLAYER_TURN');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('NORMAL');
  const [day, setDay] = useState(1);
  const [trial, setTrial] = useState(1);
  const [quota, setQuota] = useState(() => getQuotaForDay(1));
  const [coins, setCoins] = useState(0);
  const [totalRunCoins, setTotalRunCoins] = useState(0);
  const [freeRerolls, setFreeRerolls] = useState(0);

  // Persistent inventory
  const [masterDeck, setMasterDeck] = useState<WeightInstance[]>(() =>
    createInitialDeck()
  );
  const [tools, setTools] = useState<ToolInstance[]>([]);
  const [relics, setRelics] = useState<RelicId[]>([]);

  // Trial state
  const [targetWeight, setTargetWeight] = useState(() => getTargetForTrial(1));
  const [bag, setBag] = useState<WeightInstance[]>([]);
  const [hand, setHand] = useState<WeightInstance[]>([]);
  const [scaleWeights, setScaleWeights] = useState<WeightInstance[]>([]);
  const [sacrificeSoul, setSacrificeSoul] = useState(0);
  const [pendulumSoulBonus, setPendulumSoulBonus] = useState(0);
  const [discardsRemaining, setDiscardsRemaining] = useState(2);
  const [overloadCount, setOverloadCount] = useState(0);
  const [deathDefiedMult, setDeathDefiedMult] = useState(1.0);
  const [bloodAllIn, setBloodAllIn] = useState(false);

  // Tool transient flags for current trial / turn
  const [glassActive, setGlassActive] = useState(false);
  const [glueActive, setGlueActive] = useState(false);
  const [activeTweezersUid, setActiveTweezersUid] = useState<string | null>(null);
  const [activeFileUid, setActiveFileUid] = useState<string | null>(null);

  // Visual / FX state
  const [dropEventId, setDropEventId] = useState(0);
  const [coinBurstId, setCoinBurstId] = useState(0);
  const [suspenseTier, setSuspenseTier] = useState<'safe' | 'danger' | 'critical'>('safe');
  const [activeScoreIndex, setActiveScoreIndex] = useState<number | null>(null);
  const [floatingEffects, setFloatingEffects] = useState<FloatingEffect[]>([]);
  const [flashTone, setFlashTone] = useState<'gold' | 'crimson' | null>(null);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [shaking, setShaking] = useState(false);
  const [reaperSpeech, setReaperSpeech] = useState(
    '貴様の魂の重さを量ろう。寸分の狂いも許されぬぞ。'
  );
  const [hudAngleDeg, setHudAngleDeg] = useState(-24);
  const [muted, setMuted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [shopInventory, setShopInventory] = useState<ShopInventory | null>(null);

  // Safety refs for async sequences & unmount/reset cancellation
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

  // Derived constants
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
      }),
    [
      scaleWeights,
      currentWeight,
      targetWeight,
      sacrificeSoul,
      pendulumSoulBonus,
      deathDefiedMult,
      relics,
    ]
  );

  // Initialize a Trial cleanly
  const initTrial = useCallback(
    (
      nextDay: number,
      nextTrial: number,
      deckSource: WeightInstance[],
      ownedRelics: RelicId[]
    ) => {
      const targetHandSize = ownedRelics.includes('r_scale') ? 4 : 3;
      const targetDiscards = ownedRelics.includes('r_altar') ? 4 : 2;
      const shuffled = shuffleArray(deckSource.map(cloneWeightInstance));
      const drawnHand = shuffled.slice(0, targetHandSize);
      const remainingBag = shuffled.slice(targetHandSize);

      setDay(nextDay);
      setTrial(nextTrial);
      setTargetWeight(getTargetForTrial(nextDay));
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
      setActiveScoreIndex(null);
      setInteractionMode('NORMAL');
      setSuspenseTier('safe');
      setPhase('PLAYER_TURN');

      setReaperSpeech(
        nextTrial === 3
          ? '最終審判だ。血の契約に挑む度胸はあるか？'
          : '貴様の魂の重さを量ろう。寸分の狂いも許されぬぞ。'
      );
    },
    []
  );

  // Initial mount: start Day 1 Trial 1
  useEffect(() => {
    const initial = createInitialDeck();
    setMasterDeck(initial);
    initTrial(1, 1, initial, []);
  }, [initTrial]);

  // Complete Game Reset on Retry
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

  // Advance after Trial finishes (CASH_OUT or GUILLOTINE)
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
        // END_DAY evaluation
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

  // Guillotine Sequence
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
          title: 'GUILLOTINE!!',
          subtitle: '規定重量超過 — このTrialの獲得コインは 0 G',
          tone: 'crimson',
        },
        1800
      );
      setReaperSpeech('判決は『斬首』だ！欲をかいたな、愚か者。');

      const alive = await sleep(1950, token);
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

  // Pendulum Relic Bounce Handler
  const handlePendulumBounce = useCallback(
    (xPercent: number, yPercent: number) => {
      setPendulumSoulBonus((prev) => prev + 15);
      soundEngine.playBounce(Math.floor(Math.random() * 5));
      spawnFloating(
        Math.min(86, Math.max(14, xPercent)),
        Math.min(72, Math.max(20, yPercent)),
        '+15 Soul',
        '#fde047',
        '振り子の魔術'
      );
    },
    [spawnFloating]
  );

  // Drop a weight from hand onto the scale
  const handleDropWeight = async (handUid: string) => {
    if (phase !== 'PLAYER_TURN' && phase !== 'OVERLOAD_CHANCE') return;
    const wasOverload = phase === 'OVERLOAD_CHANCE';

    const targetItem = hand.find((w) => w.uid === handUid);
    if (!targetItem) return;

    const token = runTokenRef.current;
    setPhase('RESOLVE_WEIGHT');
    setInteractionMode('NORMAL');

    // Remove from hand and draw replacement from bag
    const remainingHand = hand.filter((w) => w.uid !== handUid);
    let nextBag = bag;
    if (nextBag.length > 0 && remainingHand.length < handMax) {
      remainingHand.push(nextBag[0]);
      nextBag = nextBag.slice(1);
    }

    // Prepare dropped weight instance
    let dropped: WeightInstance = { ...targetItem };
    let mercuryRolled = false;
    if (dropped.defId === 'w_mercury' && !dropped.mercuryResolved) {
      const rolled = 10 + Math.floor(Math.random() * 11);
      dropped = {
        ...dropped,
        weight: rolled,
        soul: dropped.soul + rolled * 5,
        mercuryResolved: true,
      };
      mercuryRolled = true;
    }

    // Step 1: PASSIVE on existing scale weights (w_slime grows!)
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

    // Step 2: Add dropped weight
    nextScale = [...nextScale, dropped];

    // Step 3: ON_DROP effects
    let nextTarget = targetWeight;
    if (dropped.defId === 'w_twin' && !dropped.isCopy) {
      // Twin copy triggers existing slimes again (including any earlier slimes!)
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
        ...dropped,
        uid: nextUid('twin'),
        name: `${dropped.name}(影)`,
        isCopy: true,
      };
      nextScale = [...nextScale, twinCopy];
    }

    if (dropped.defId === 'w_soul') {
      nextTarget += 15;
    }

    const nextCurrent = nextScale.reduce((acc, w) => acc + w.weight, 0);
    const glueUsedThisDrop = glueActive;

    // Determine suspense tier
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
    setGlueActive(false);
    setSuspenseTier(tier);
    setDropEventId((id) => id + 1);

    // Sound & Visual popups
    soundEngine.playDrop(tier);
    if (tier === 'danger') {
      soundEngine.playHeartbeat();
    } else if (tier === 'critical') {
      soundEngine.playTensionCreak();
    }

    if (mercuryRolled) {
      spawnFloating(64, 48, `${dropped.weight}g 確定!`, '#38bdf8', `Soul +${dropped.weight * 5}`);
    }
    if (dropped.defId === 'w_soul') {
      spawnFloating(34, 46, 'TARGET +15g!', '#e9d5ff', '罪人の魂');
    }
    if (dropped.defId === 'w_twin' && !dropped.isCopy) {
      spawnFloating(66, 42, '双子出現!', '#a5b4fc');
    }
    if (slimeGrewCount > 0) {
      spawnFloating(58, 36, 'スライム成長!', '#86efac', `+5g / +30 Soul (×${slimeGrewCount})`);
    }

    if (nextCurrent === nextTarget) {
      setReaperSpeech('なんと…完璧な均衡だと！？');
    } else if (tier === 'critical') {
      setReaperSpeech('あと一息…それとも地獄への片道切符か？');
    } else if (tier === 'danger') {
      setReaperSpeech('ギロチンの刃が首筋に触れるぞ…');
    } else {
      setReaperSpeech('ほう…まだ余裕があるようだな。');
    }

    const waitMs = tier === 'critical' ? 1500 : tier === 'danger' ? 1000 : 250;
    const alive = await sleep(waitMs, token);
    if (!alive) return;

    // Limit evaluation
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
            subtitle: '死線からの生還 — このTrialの Sin倍率 ×2.0！',
            tone: 'emerald',
          },
          1800
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

    // Normal drop resolution
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
            title: 'OVERLOAD CHANCE!!',
            subtitle: `超過 +${over}g — 1アクションのみで Target 以下へ引き戻せ！`,
            tone: 'crimson',
          },
          2100
        );
        setReaperSpeech('愚か者め！一手で引き戻さねば即刻斬首だ！');
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

  // Discard (供物台) handler
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
      `+${gained} Soul (供物)`,
      '#fb7185',
      relics.includes('r_altar') ? '祭壇効果×2' : undefined
    );
    setReaperSpeech('魂を捧げて活路を繋ぐか。悪くない。');
  };

  // Use a Tool
  const handleClickTool = (tool: ToolInstance) => {
    if (phase !== 'PLAYER_TURN' && phase !== 'OVERLOAD_CHANCE') return;

    if (tool.defId === 't_glass') {
      if (phase === 'OVERLOAD_CHANCE') return; // Glass doesn't rescue overload; keep it clean or allow on normal turn
      soundEngine.playTool();
      setGlassActive(true);
      setTools((prev) => prev.filter((t) => t.uid !== tool.uid));
      spawnFloating(18, 30, '袋の透視発動！', '#38bdf8');
      return;
    }

    if (tool.defId === 't_glue') {
      soundEngine.playTool();
      setGlueActive(true);
      setTools((prev) => prev.filter((t) => t.uid !== tool.uid));
      spawnFloating(50, 62, '悪魔の接着剤 待機!', '#fca5a5', '次の1回バースト無効');
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

  // Resolve Brass Tweezers on pan weight
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
            subtitle: 'ピンセットによる奇跡の生還 — Sin倍率 ×2.0！',
            tone: 'emerald',
          },
          1800
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

  // Resolve Magic File on hand weight (permanent buff!)
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

    spawnFloating(50, 74, `${item.name} ヤスリ加工!`, '#fde047', '重さ半減 · Soul&Sin永続2倍');
  };

  // Activate Blood All-In Contract (Trial 3 only, before first drop)
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
        subtitle: 'Target +20g · OVERLOAD猶予なし · 100%水平でノルマ一発完済！',
        tone: 'crimson',
      },
      2000
    );
    setReaperSpeech('面白い！その命、すべて天秤に賭けるか！');
  };

  // CASH_OUT sequential ascending scale scoring
  const handleCashOut = async () => {
    if (phase !== 'PLAYER_TURN') return;
    if (scaleWeights.length === 0 && sacrificeSoul === 0) return;

    const token = runTokenRef.current;
    setPhase('CASH_OUT');
    setInteractionMode('NORMAL');

    const result = evaluateCashOut({
      scaleWeights,
      currentWeight,
      targetWeight,
      sacrificeSoul,
      pendulumSoulBonus,
      deathDefiedMult,
      relics,
    });

    if (result.isMiracleBalance) {
      soundEngine.playMiracleBell();
      triggerFlash('gold', 900);
      triggerBanner(
        {
          title: 'MIRACLE BALANCE!!',
          subtitle: relics.includes('r_miracle')
            ? '完全水平（誤差0g）— 奇跡の刻印により連鎖 2回発動！'
            : '完全水平（誤差0g）— 水平精度倍率 ×12.0 + 無料リロール券獲得！',
          tone: 'gold',
        },
        2200
      );
      setReaperSpeech('完璧なる均衡…！神をも欺く業か！');
      const ok = await sleep(700, token);
      if (!ok) return;
    }

    // Sequential jump from index 0 to end
    for (let sIdx = 0; sIdx < result.steps.length; sIdx++) {
      const step = result.steps[sIdx];
      setActiveScoreIndex(step.index);
      soundEngine.playScaleNote(sIdx);

      const posX = 56 + ((step.index % 6) * 4.5);
      const posY = 44 - Math.floor(step.index / 6) * 8;
      spawnFloating(
        posX,
        posY,
        step.effectLabels.slice(0, 2).join(' / ') || `+${step.addedSoul} Soul`,
        step.sinMultFactor > 1 || step.addedBalanceMult > 0 ? '#fde047' : '#fbbf24',
        step.effectLabels.slice(2).join(' ')
      );

      const ok = await sleep(340, token);
      if (!ok) return;
    }

    setActiveScoreIndex(null);

    // Final Balance Multiplier Boom & Coin Fountain
    soundEngine.playBalanceMultBoom();
    setCoinBurstId((c) => c + 1);

    let earned = result.finalCoins;
    let bloodAllInTriggered = false;
    if (bloodAllIn && result.isMiracleBalance) {
      const neededForQuota = Math.max(0, quota - coins);
      earned = Math.max(earned, neededForQuota);
      bloodAllInTriggered = true;
    }

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
      `×${result.finalBalanceMult.toFixed(2)} 水平倍率`
    );

    if (bloodAllInTriggered) {
      triggerBanner(
        {
          title: '血の契約 成就！！',
          subtitle: `完全水平達成によりノルマ ${quota.toLocaleString()} G を一発完済！`,
          tone: 'gold',
        },
        1900
      );
    } else if (!result.isMiracleBalance) {
      triggerBanner(
        {
          title: `計量完了 +${earned.toLocaleString()} G`,
          subtitle: `Soul ${result.totalSoul} × Sin ${result.totalSinMult.toFixed(2)} × 水平 ${result.finalBalanceMult.toFixed(2)}`,
          tone: 'amber',
        },
        1600
      );
    }

    const okEnd = await sleep(1700, token);
    if (!okEnd) return;

    advanceAfterTrial(nextCoins, day, trial, quota, masterDeck, relics);
  };

  // Shop Actions
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

  // UI helpers
  const isOverload = phase === 'OVERLOAD_CHANCE';
  const isTurnLocked =
    phase !== 'PLAYER_TURN' && phase !== 'OVERLOAD_CHANCE';
  const diffFromTarget = currentWeight - targetWeight;
  const ratioPct =
    targetWeight > 0 ? Math.round((currentWeight / targetWeight) * 100) : 0;

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col bg-[#09080c] text-[#ece6da] ${
        shaking ? 'animate-screen-shake' : ''
      }`}
    >
      {/* TOP HUD */}
      <header className="shrink-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#110d16] border-b border-amber-800/40">
        {/* Left: Brand & Day/Trial */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400 shrink-0" />
            <h1 className="font-display text-base sm:text-lg font-bold tracking-wider text-amber-200 whitespace-nowrap">
              SOUL SCALE
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-300 font-mono-num whitespace-nowrap">
            <span className="text-amber-300 font-bold">DAY {day}</span>
            <span className="text-stone-600">·</span>
            <span>TRIAL {trial}/3</span>
            <span className="text-stone-600">·</span>
            <span>
              所持{' '}
              <strong className="text-amber-300">
                {coins.toLocaleString()}
              </strong>{' '}
              / ノルマ{' '}
              <strong
                className={
                  coins >= quota ? 'text-emerald-400' : 'text-stone-200'
                }
              >
                {quota.toLocaleString()} G
              </strong>
            </span>
          </div>
        </div>

        {/* Center: Target vs Current & Angle & Forecast */}
        <div className="flex items-center gap-4 sm:gap-6 font-mono-num text-xs">
          <div className="flex items-center gap-3 px-3 py-1 bg-[#18131f] border border-stone-800">
            <div>
              <span className="text-stone-400 mr-1.5">TARGET</span>
              <strong className="text-purple-300 text-sm">{targetWeight}g</strong>
            </div>
            <span className="text-stone-600">vs</span>
            <div>
              <span className="text-stone-400 mr-1.5">CURRENT</span>
              <strong
                className={`text-sm ${
                  currentWeight === targetWeight
                    ? 'text-yellow-300'
                    : currentWeight > targetWeight
                    ? 'text-red-400'
                    : 'text-amber-200'
                }`}
              >
                {currentWeight}g
              </strong>
            </div>
            <span className="text-stone-600">·</span>
            <span
              className={
                diffFromTarget === 0
                  ? 'text-yellow-300 font-bold'
                  : diffFromTarget > 0
                  ? 'text-red-400 font-bold'
                  : 'text-stone-300'
              }
            >
              {diffFromTarget === 0
                ? '完全水平 100%'
                : `${diffFromTarget > 0 ? '+' : ''}${diffFromTarget}g (${ratioPct}%)`}
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-2 text-stone-300">
            <span className="text-stone-500">傾斜</span>
            <span className="w-14 text-right font-bold text-amber-200">
              {hudAngleDeg >= 0 ? `+${hudAngleDeg.toFixed(1)}°` : `${hudAngleDeg.toFixed(1)}°`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#19140b] border border-amber-700/40">
            <span className="text-stone-400">予想:</span>
            <span className="text-amber-200 font-bold">{previewScore.totalSoul}</span>
            <span className="text-stone-500">×</span>
            <span className="text-rose-300 font-bold">
              {previewScore.totalSinMult.toFixed(2)}
            </span>
            <span className="text-stone-500">×</span>
            <span className="text-yellow-300 font-bold">
              {previewScore.finalBalanceMult.toFixed(2)}
            </span>
            <span className="text-stone-500">=</span>
            <span className="text-amber-300 font-bold text-sm">
              {previewScore.finalCoins.toLocaleString()} G
            </span>
          </div>
        </div>

        {/* Right: Audio Mute & Rules */}
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

      {/* MAIN ARENA (Scale Canvas + Left Bag Tracker + Relics + Trial 3 All-In) */}
      <main className="relative flex-1 min-h-0">
        <ScaleCanvas
          currentWeight={currentWeight}
          targetWeight={targetWeight}
          scaleWeights={scaleWeights}
          phase={phase}
          interactionMode={interactionMode}
          activeScoreIndex={activeScoreIndex}
          dropEventId={dropEventId}
          coinBurstId={coinBurstId}
          hasPendulum={relics.includes('r_pendulum')}
          suspenseTier={suspenseTier}
          reaperSpeech={reaperSpeech}
          onPendulumBounce={handlePendulumBounce}
          onSelectPanWeight={handleSelectPanWeight}
          onExposeAngle={setHudAngleDeg}
        />

        <FloatingEffects
          effects={floatingEffects}
          flashTone={flashTone}
          banner={banner}
        />

        {/* Top-Left Overlay: Bag Tracker & Active Trial Status */}
        <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-2">
          <BagTracker bag={bag} glassActive={glassActive} />

          {/* Active Buffs Indicator */}
          {(glueActive || deathDefiedMult > 1 || bloodAllIn) && (
            <div className="flex flex-col gap-1 text-[11px] font-semibold">
              {glueActive && (
                <div className="px-2.5 py-1 bg-rose-950/90 border border-rose-500/70 text-rose-200">
                  悪魔の接着剤：次の1回バースト無効
                </div>
              )}
              {deathDefiedMult > 1 && (
                <div className="px-2.5 py-1 bg-emerald-950/90 border border-emerald-500/70 text-emerald-200">
                  DEATH DEFIED：Sin倍率 ×2.0 有効
                </div>
              )}
              {bloodAllIn && (
                <div className="px-2.5 py-1 bg-red-950/90 border border-red-500 text-red-200">
                  血のオールイン契約中（猶予なし・100%でノルマ完済）
                </div>
              )}
            </div>
          )}

          {/* Trial 3 Blood All-In Contract Trigger */}
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
                    Target+20g・猶予なし / 100%でノルマ完済
                  </div>
                </div>
              </button>
            )}
        </div>

        {/* Top-Right Overlay: Owned Relics */}
        <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
          {relics.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#120f17]/90 border border-purple-900/60">
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

          {isOverload && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/95 border border-red-500 text-red-100 text-xs font-bold shadow-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                OVERLOAD猶予中！有効な一手のみで {targetWeight}g 以下へ戻せ
              </span>
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM CONTROL DECK */}
      <footer className="shrink-0 z-20 bg-[#110d16] border-t border-amber-800/40 px-3 sm:px-5 py-2.5">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left: Sacrifice Altar (Discard) */}
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
                    ? '供物選択中（クリックで解除）'
                    : '供物台に捧げる'}
                </span>
              </div>
              <div className="font-mono-num text-[11px] text-stone-400 mt-0.5">
                残 {discardsRemaining}/{maxDiscards} · 蓄積Soul:{' '}
                <strong className="text-rose-300">
                  {sacrificeSoul + pendulumSoulBonus}
                </strong>
              </div>
            </button>
          </div>

          {/* Center: Hand Tray (3 or 4 weights) */}
          <div className="flex-1 flex items-center justify-center gap-2.5 overflow-x-auto py-0.5">
            {hand.length === 0 ? (
              <div className="px-6 py-4 border border-stone-800 bg-[#15111a] text-xs text-stone-500">
                手札がありません（計量確定またはピンセットを使用）
              </div>
            ) : (
              hand.map((w) => {
                const isMercuryOscillating =
                  w.defId === 'w_mercury' && !w.mercuryResolved;
                const isValidOverloadRescue =
                  isOverload && (w.weight < 0 || w.defId === 'w_soul');
                const isDiscardMode = interactionMode === 'DISCARD';
                const isFileMode = interactionMode === 'SELECT_HAND_FILE';
                const canClick =
                  !isTurnLocked &&
                  interactionMode !== 'SELECT_PAN_TWEEZERS';

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
                    className={`group relative flex flex-col justify-between w-[165px] sm:w-[188px] shrink-0 p-2.5 border text-left transition-transform duration-150 ${
                      !canClick
                        ? 'bg-[#141019] border-stone-800 opacity-55 cursor-not-allowed'
                        : isDiscardMode
                        ? 'bg-[#261118] hover:-translate-y-1 border-rose-500 cursor-pointer'
                        : isFileMode
                        ? 'bg-[#161c2b] hover:-translate-y-1 border-sky-400 cursor-pointer'
                        : isValidOverloadRescue
                        ? 'bg-[#0e261f] hover:-translate-y-1.5 border-emerald-400 shadow-lg shadow-emerald-900/30 cursor-pointer'
                        : isOverload
                        ? 'bg-[#191115] border-red-900/50 opacity-75 hover:opacity-100 cursor-pointer'
                        : 'bg-[#18141f] hover:bg-[#221c2c] hover:-translate-y-1 border-amber-800/50 hover:border-amber-400 cursor-pointer'
                    }`}
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
                        <div className="text-amber-200">S:{w.soul}</div>
                        {w.sinBonus > 0 && (
                          <div className="text-rose-300">+{w.sinBonus}</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-1.5 text-[10px] text-stone-400 line-clamp-2 leading-snug">
                      {isDiscardMode
                        ? `供物で +${
                            relics.includes('r_altar')
                              ? Math.floor(w.soul / 2) * 2
                              : Math.floor(w.soul / 2)
                          } Soul`
                        : isFileMode
                        ? 'クリックで重さ半減＆価値2倍'
                        : isValidOverloadRescue
                        ? '生還可能！クリックで緊急投入'
                        : w.effectDesc}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Tools (max 3) & Judge CTA */}
          <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
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
                  !isOverload ||
                  tool.defId === 't_tweezers' ||
                  tool.defId === 't_glue';

                const isOverloadRescue =
                  isOverload && tool.defId === 't_tweezers';

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

            {/* WEIGH & JUDGE Primary CTA */}
            <button
              type="button"
              disabled={
                phase !== 'PLAYER_TURN' ||
                (scaleWeights.length === 0 && sacrificeSoul === 0)
              }
              onClick={handleCashOut}
              className={`flex items-center gap-2 px-5 py-3 font-display font-bold text-sm tracking-wider transition-colors whitespace-nowrap ${
                phase === 'PLAYER_TURN' &&
                (scaleWeights.length > 0 || sacrificeSoul > 0)
                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 shadow-lg shadow-amber-900/30 cursor-pointer'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>WEIGH &amp; JUDGE</span>
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
              JUDGEMENT EXECUTED
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
              <span>最初からやり直す（RETRY）</span>
            </button>
          </div>
        </div>
      )}

      {/* RULES / CODEX MODAL */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
