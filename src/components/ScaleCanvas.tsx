import React, { useEffect, useRef } from 'react';
import { GamePhase, InteractionMode, WeightId, WeightInstance } from '../types/game';

interface ScaleCanvasProps {
  currentWeight: number;
  targetWeight: number;
  scaleWeights: WeightInstance[];
  phase: GamePhase;
  interactionMode: InteractionMode;
  activeScoreIndex: number | null;
  dropEventId: number;
  coinBurstId: number;
  hasPendulum: boolean;
  suspenseTier: 'safe' | 'danger' | 'critical';
  reaperSpeech: string;
  onPendulumBounce: (xPercent: number, yPercent: number, bounceIndex: number) => void;
  onSelectPanWeight: (uid: string) => void;
  onExposeAngle?: (angleDeg: number) => void;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface CoinParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  spin: number;
}

interface WeightHitbox {
  uid: string;
  x: number;
  y: number;
  r: number;
}

function getWeightPalette(defId: WeightId): {
  fill: string;
  stroke: string;
  accent: string;
} {
  switch (defId) {
    case 'w_lead':
      return { fill: '#374151', stroke: '#9ca3af', accent: '#1f2937' };
    case 'w_cast':
      return { fill: '#27272a', stroke: '#a1a1aa', accent: '#52525b' };
    case 'w_iron':
      return { fill: '#475569', stroke: '#cbd5e1', accent: '#94a3b8' };
    case 'w_copper':
      return { fill: '#92400e', stroke: '#f59e0b', accent: '#fbbf24' };
    case 'w_feather':
      return { fill: '#cbd5e1', stroke: '#f8fafc', accent: '#94a3b8' };
    case 'w_fallen':
      return { fill: '#4c1d2e', stroke: '#fb7185', accent: '#f43f5e' };
    case 'w_helium':
      return { fill: '#0f766e', stroke: '#5eead4', accent: '#99f6e4' };
    case 'w_gold':
      return { fill: '#b45309', stroke: '#fde047', accent: '#fef08a' };
    case 'w_crystal':
      return { fill: '#1d4ed8', stroke: '#93c5fd', accent: '#60a5fa' };
    case 'w_mirror':
      return { fill: '#334155', stroke: '#f8fafc', accent: '#d97706' };
    case 'w_twin':
      return { fill: '#4338ca', stroke: '#c7d2fe', accent: '#818cf8' };
    case 'w_mercury':
      return { fill: '#1e293b', stroke: '#cbd5e1', accent: '#38bdf8' };
    case 'w_slime':
      return { fill: '#15803d', stroke: '#86efac', accent: '#dcfce7' };
    case 'w_soul':
      return { fill: '#6b21a8', stroke: '#e9d5ff', accent: '#fef08a' };
    case 'w_crown':
      return { fill: '#b45309', stroke: '#fde047', accent: '#ef4444' };
  }
}

export const ScaleCanvas: React.FC<ScaleCanvasProps> = ({
  currentWeight,
  targetWeight,
  scaleWeights,
  phase,
  interactionMode,
  activeScoreIndex,
  dropEventId,
  coinBurstId,
  hasPendulum,
  suspenseTier,
  reaperSpeech,
  onPendulumBounce,
  onSelectPanWeight,
  onExposeAngle,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Latest props in refs for rAF loop without re-subscribing
  const propsRef = useRef({
    currentWeight,
    targetWeight,
    scaleWeights,
    phase,
    interactionMode,
    activeScoreIndex,
    hasPendulum,
    suspenseTier,
  });
  propsRef.current = {
    currentWeight,
    targetWeight,
    scaleWeights,
    phase,
    interactionMode,
    activeScoreIndex,
    hasPendulum,
    suspenseTier,
  };

  const onBounceRef = useRef(onPendulumBounce);
  onBounceRef.current = onPendulumBounce;
  const onExposeAngleRef = useRef(onExposeAngle);
  onExposeAngleRef.current = onExposeAngle;

  // Physics & animation mutable state (never causes React re-renders)
  const physRef = useRef({
    angleDeg: -24,
    velocityDeg: 0,
    guillotineProgress: 0.02,
    guillotineVel: 0,
    sparks: [] as Spark[],
    coinParticles: [] as CoinParticle[],
    hitboxes: [] as WeightHitbox[],
    hoveredUid: null as string | null,
    bouncesInDrop: 0,
    bounceWindowActive: false,
    lastDropEventId: 0,
    lastCoinBurstId: 0,
    scoreJumpOffset: new Map<string, number>(),
    time: 0,
    lastPanRightPos: { x: 0, y: 0 },
    lastHudAngleReport: 0,
  });

  // Trigger drop impulse when dropEventId increments
  useEffect(() => {
    if (dropEventId > 0 && dropEventId !== physRef.current.lastDropEventId) {
      physRef.current.lastDropEventId = dropEventId;
      physRef.current.bouncesInDrop = 0;
      physRef.current.bounceWindowActive = true;
      const impulse = hasPendulum ? 58 : 26;
      physRef.current.velocityDeg += impulse;
    }
  }, [dropEventId, hasPendulum]);

  // Trigger coin particle fountain when coinBurstId increments
  useEffect(() => {
    if (coinBurstId > 0 && coinBurstId !== physRef.current.lastCoinBurstId) {
      physRef.current.lastCoinBurstId = coinBurstId;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const originX = physRef.current.lastPanRightPos.x || w * 0.65;
      const originY = physRef.current.lastPanRightPos.y || h * 0.58;
      for (let i = 0; i < 42; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.7;
        const speed = 160 + Math.random() * 290;
        physRef.current.coinParticles.push({
          x: originX + (Math.random() - 0.5) * 40,
          y: originY - 12,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 1.1 + Math.random() * 0.7,
          size: 4 + Math.random() * 4,
          spin: Math.random() * Math.PI * 2,
        });
      }
    }
  }, [coinBurstId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;
    let lastTs = performance.now();

    const spawnSparks = (x: number, y: number, count: number, color = '#fb923c') => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 80 + Math.random() * 240;
        physRef.current.sparks.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - 40,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.35,
          color,
          size: 1.5 + Math.random() * 2.2,
        });
      }
    };

    const drawPanWeight = (
      ctx: CanvasRenderingContext2D,
      w: WeightInstance,
      wx: number,
      wy: number,
      radius: number,
      isActiveScore: boolean,
      isHovered: boolean,
      isSelectMode: boolean
    ) => {
      const pal = getWeightPalette(w.defId);
      ctx.save();
      ctx.translate(wx, wy);

      if (isActiveScore) {
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 18;
      } else if (isSelectMode) {
        ctx.shadowColor = isHovered ? '#38bdf8' : '#f59e0b';
        ctx.shadowBlur = isHovered ? 16 : 8;
      }

      // Base body shape
      ctx.fillStyle = pal.fill;
      ctx.strokeStyle = isActiveScore
        ? '#fde047'
        : isHovered && isSelectMode
        ? '#7dd3fc'
        : pal.stroke;
      ctx.lineWidth = isActiveScore || (isHovered && isSelectMode) ? 2.4 : 1.5;

      if (w.defId === 'w_feather' || w.defId === 'w_fallen' || w.defId === 'w_helium') {
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 0.65, radius * 0.98, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (w.defId === 'w_crystal' || w.defId === 'w_soul') {
        ctx.beginPath();
        ctx.moveTo(0, -radius);
        ctx.lineTo(radius * 0.85, -radius * 0.15);
        ctx.lineTo(radius * 0.6, radius * 0.88);
        ctx.lineTo(-radius * 0.6, radius * 0.88);
        ctx.lineTo(-radius * 0.85, -radius * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (w.defId === 'w_crown') {
        ctx.beginPath();
        ctx.moveTo(-radius * 0.9, radius * 0.75);
        ctx.lineTo(-radius * 0.9, -radius * 0.45);
        ctx.lineTo(-radius * 0.35, 0);
        ctx.lineTo(0, -radius * 0.85);
        ctx.lineTo(radius * 0.35, 0);
        ctx.lineTo(radius * 0.9, -radius * 0.45);
        ctx.lineTo(radius * 0.9, radius * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (w.defId === 'w_slime') {
        ctx.beginPath();
        ctx.arc(0, 2, radius * 0.9, Math.PI, 0);
        ctx.lineTo(radius * 0.9, radius * 0.75);
        ctx.lineTo(-radius * 0.9, radius * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (w.defId === 'w_gold') {
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.92, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Trapezoid / ingot brass weight
        ctx.beginPath();
        ctx.moveTo(-radius * 0.62, -radius * 0.82);
        ctx.lineTo(radius * 0.62, -radius * 0.82);
        ctx.lineTo(radius * 0.92, radius * 0.82);
        ctx.lineTo(-radius * 0.92, radius * 0.82);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Selection ring when Tweezers mode active
      if (isSelectMode) {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = isHovered ? '#38bdf8' : 'rgba(251, 191, 36, 0.55)';
        ctx.lineWidth = isHovered ? 2 : 1.2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Weight text stamp
      ctx.fillStyle = '#f8fafc';
      ctx.font = `700 ${Math.max(10, Math.round(radius * 0.65))}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${w.weight}g`, 0, 1);

      ctx.restore();
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTs) / 1000;
      lastTs = now;
      const dt = Math.min(rawDt, 0.05);

      const {
        currentWeight: curW,
        targetWeight: tgtW,
        scaleWeights: weights,
        phase: curPhase,
        interactionMode: curMode,
        activeScoreIndex: scoreIdx,
        hasPendulum: pendulum,
        suspenseTier: tier,
      } = propsRef.current;

      const p = physRef.current;
      p.time += dt;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      // 1. Update Scale Spring Physics
      const ratio = tgtW > 0 ? curW / tgtW : 0;
      let targetAngleDeg = 0;
      if (ratio <= 1.0) {
        targetAngleDeg = Math.max(-28, -24 * (1 - ratio));
      } else {
        targetAngleDeg = Math.min(28, (ratio - 1.0) * 68);
      }

      // Suspense slow-motion & spring tuning
      const k = pendulum ? 76 : tier === 'critical' ? 32 : tier === 'danger' ? 44 : 62;
      const c = pendulum ? 2.4 : tier === 'critical' ? 3.2 : 5.4;

      const prevVel = p.velocityDeg;
      const accel = -k * (p.angleDeg - targetAngleDeg) - c * p.velocityDeg;
      p.velocityDeg += accel * dt;
      p.angleDeg += p.velocityDeg * dt;

      // Detect bounce peak for r_pendulum
      if (
        p.bounceWindowActive &&
        pendulum &&
        prevVel * p.velocityDeg < 0 &&
        Math.abs(p.angleDeg - targetAngleDeg) > 0.45 &&
        p.bouncesInDrop < 5
      ) {
        p.bouncesInDrop += 1;
        const panXPercent = ((p.lastPanRightPos.x || width * 0.65) / width) * 100;
        const panYPercent = ((p.lastPanRightPos.y || height * 0.56) / height) * 100;
        onBounceRef.current(panXPercent, panYPercent - 6, p.bouncesInDrop);
      }

      if (Math.abs(p.velocityDeg) < 0.25 && Math.abs(p.angleDeg - targetAngleDeg) < 0.2) {
        p.bounceWindowActive = false;
      }

      if (p.time - p.lastHudAngleReport > 0.08 && onExposeAngleRef.current) {
        p.lastHudAngleReport = p.time;
        onExposeAngleRef.current(p.angleDeg);
      }

      // 2. Update Guillotine Blade Progress
      let targetGuillotine = 0.02;
      if (curPhase === 'GUILLOTINE') {
        targetGuillotine = 0.96;
      } else if (curPhase === 'OVERLOAD_CHANCE') {
        targetGuillotine = 0.61;
      } else if (ratio >= 0.8) {
        targetGuillotine = 0.12 + Math.min(1, (ratio - 0.8) / 0.2) * 0.28;
      }

      const prevGuillotine = p.guillotineProgress;
      const gSpeed = curPhase === 'GUILLOTINE' || curPhase === 'OVERLOAD_CHANCE' ? 14 : 4;
      p.guillotineProgress += (targetGuillotine - p.guillotineProgress) * Math.min(1, dt * gSpeed);

      const centerX = width * 0.5;
      const fulcrumY = height * 0.34;
      const maxGuillotineDropY = height * 0.72;
      const bladeEdgeY = 12 + p.guillotineProgress * (maxGuillotineDropY - 12);

      // Sparks on sudden arrest or slam
      if (
        curPhase === 'OVERLOAD_CHANCE' &&
        Math.abs(prevGuillotine - 0.61) > 0.02 &&
        Math.abs(p.guillotineProgress - 0.61) <= 0.03
      ) {
        spawnSparks(centerX, bladeEdgeY, 22, '#fb923c');
      }
      if (
        curPhase === 'GUILLOTINE' &&
        Math.abs(prevGuillotine - 0.96) > 0.03 &&
        Math.abs(p.guillotineProgress - 0.96) <= 0.04
      ) {
        spawnSparks(centerX, bladeEdgeY, 36, '#ef4444');
      }

      // 3. Update Sparks & Gold Coin Particles
      p.sparks = p.sparks.filter((s) => {
        s.life += dt;
        s.vy += 420 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        return s.life < s.maxLife;
      });

      p.coinParticles = p.coinParticles.filter((cp) => {
        cp.life += dt;
        cp.vy += 520 * dt;
        cp.x += cp.vx * dt;
        cp.y += cp.vy * dt;
        cp.spin += 9 * dt;
        return cp.life < cp.maxLife;
      });

      // 4. Begin Drawing
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Gothic Courtroom Radial Background
      const bgGrad = ctx.createRadialGradient(
        centerX,
        height * 0.38,
        30,
        centerX,
        height * 0.5,
        Math.max(width, height) * 0.72
      );
      bgGrad.addColorStop(0, '#191420');
      bgGrad.addColorStop(0.55, '#0e0b12');
      bgGrad.addColorStop(1, '#070609');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle Gothic Cathedral Arch lines
      ctx.strokeStyle = 'rgba(180, 140, 72, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, height * 0.52, Math.min(width, height) * 0.42, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, height * 0.52, Math.min(width, height) * 0.36, Math.PI, 0);
      ctx.stroke();

      // 5. Reaper's Glowing Eyes in Deep Background
      const eyeY = height * 0.2;
      const eyeSpread = Math.min(82, width * 0.085);
      let eyeColor = '#e2e8f0'; // white-silver
      if (curW === tgtW && curW > 0) {
        eyeColor = '#facc15'; // Miracle gold
      } else if (
        curPhase === 'OVERLOAD_CHANCE' ||
        curPhase === 'GUILLOTINE' ||
        ratio >= 0.92
      ) {
        eyeColor = '#ef4444'; // Crimson
      } else if (ratio >= 0.75) {
        eyeColor = '#f59e0b'; // Amber orange
      }

      const lookX = Math.max(-4, Math.min(4, (p.angleDeg / 24) * 4));
      const eyePulse = 0.85 + Math.sin(p.time * 2.8) * 0.15;

      // Reaper subtle hood silhouette
      ctx.fillStyle = 'rgba(5, 4, 8, 0.72)';
      ctx.beginPath();
      ctx.moveTo(centerX - eyeSpread * 2.1, eyeY + 88);
      ctx.quadraticCurveTo(centerX, eyeY - 90, centerX + eyeSpread * 2.1, eyeY + 88);
      ctx.closePath();
      ctx.fill();

      [-1, 1].forEach((side) => {
        const ex = centerX + side * eyeSpread;
        const ey = eyeY;

        ctx.save();
        ctx.shadowColor = eyeColor;
        ctx.shadowBlur = 24 * eyePulse;
        ctx.fillStyle = eyeColor;

        // Almond gothic eye slit
        ctx.beginPath();
        ctx.moveTo(ex - 20, ey);
        ctx.quadraticCurveTo(ex, ey - 10 * eyePulse, ex + 20, ey);
        ctx.quadraticCurveTo(ex, ey + 9 * eyePulse, ex - 20, ey);
        ctx.fill();

        // Dark slit pupil
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#09080c';
        ctx.beginPath();
        ctx.ellipse(ex + lookX, ey, 3.2, 6.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 6. Scale Pedestal & Central Pillar
      const baseBottomY = Math.min(height * 0.89, fulcrumY + 250);
      const pillarGrad = ctx.createLinearGradient(centerX - 16, 0, centerX + 16, 0);
      pillarGrad.addColorStop(0, '#5c4319');
      pillarGrad.addColorStop(0.5, '#d4a348');
      pillarGrad.addColorStop(1, '#4f3915');

      // Pedestal
      ctx.fillStyle = '#1b1614';
      ctx.strokeStyle = '#9e762f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 96, baseBottomY);
      ctx.lineTo(centerX + 96, baseBottomY);
      ctx.lineTo(centerX + 74, baseBottomY - 22);
      ctx.lineTo(centerX - 74, baseBottomY - 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pillar shaft
      ctx.fillStyle = pillarGrad;
      ctx.fillRect(centerX - 7, fulcrumY, 14, baseBottomY - 22 - fulcrumY);

      // Degree Balance Gauge Arc above fulcrum
      const gaugeR = 46;
      ctx.save();
      ctx.translate(centerX, fulcrumY);
      ctx.strokeStyle = 'rgba(212, 163, 72, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, gaugeR, -Math.PI * 0.78, -Math.PI * 0.22);
      ctx.stroke();

      // Center zero notch (100% miracle mark)
      ctx.strokeStyle = curW === tgtW ? '#facc15' : '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -gaugeR - 6);
      ctx.lineTo(0, -gaugeR + 6);
      ctx.stroke();

      // Needle pointing opposite/proportional to tilt
      const needleRad = (p.angleDeg * Math.PI) / 180;
      ctx.save();
      ctx.rotate(needleRad);
      ctx.strokeStyle = curW === tgtW ? '#fef08a' : '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -gaugeR + 4);
      ctx.stroke();
      ctx.restore();
      ctx.restore();

      // 7. Scale Beam & Hanging Pans
      const armLen = Math.min(265, width * 0.28);
      const chainLen = Math.min(138, height * 0.23);
      const beamRad = (p.angleDeg * Math.PI) / 180;

      const leftHookX = centerX - Math.cos(beamRad) * armLen;
      const leftHookY = fulcrumY - Math.sin(beamRad) * armLen;
      const rightHookX = centerX + Math.cos(beamRad) * armLen;
      const rightHookY = fulcrumY + Math.sin(beamRad) * armLen;

      // Draw Beam
      ctx.save();
      ctx.translate(centerX, fulcrumY);
      ctx.rotate(beamRad);

      const beamGrad = ctx.createLinearGradient(0, -10, 0, 10);
      beamGrad.addColorStop(0, '#f3c669');
      beamGrad.addColorStop(0.5, '#b6832c');
      beamGrad.addColorStop(1, '#5e4214');
      ctx.fillStyle = beamGrad;
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(-armLen - 12, -3);
      ctx.lineTo(-18, -9);
      ctx.lineTo(18, -9);
      ctx.lineTo(armLen + 12, -3);
      ctx.lineTo(armLen + 12, 4);
      ctx.lineTo(18, 9);
      ctx.lineTo(-18, 9);
      ctx.lineTo(-armLen - 12, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Fulcrum jewel
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fillStyle = curW === tgtW ? '#facc15' : '#991b1b';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // Helper to draw hanging pan (keeps pan horizontal vertically due to gravity!)
      const panWidth = Math.min(182, width * 0.2);

      // --- LEFT PAN (Target Counterweight) ---
      const leftPanX = leftHookX;
      const leftPanY = leftHookY + chainLen;

      ctx.strokeStyle = '#a1792f';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(leftHookX, leftHookY);
      ctx.lineTo(leftPanX - panWidth * 0.42, leftPanY);
      ctx.moveTo(leftHookX, leftHookY);
      ctx.lineTo(leftPanX + panWidth * 0.42, leftPanY);
      ctx.stroke();

      // Left Pan Brass Dish
      ctx.fillStyle = '#3c2a12';
      ctx.strokeStyle = '#d4a348';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(leftPanX - panWidth * 0.48, leftPanY);
      ctx.lineTo(leftPanX + panWidth * 0.48, leftPanY);
      ctx.quadraticCurveTo(leftPanX, leftPanY + 26, leftPanX - panWidth * 0.48, leftPanY);
      ctx.fill();
      ctx.stroke();

      // Target Soul Stone sitting on Left Pan
      ctx.save();
      ctx.translate(leftPanX, leftPanY - 22);
      ctx.fillStyle = '#251a2e';
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(168, 85, 247, 0.45)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(-26, 20);
      ctx.lineTo(-18, -16);
      ctx.lineTo(0, -28);
      ctx.lineTo(18, -16);
      ctx.lineTo(26, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#e9d5ff';
      ctx.font = '700 10px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.fillText('TARGET', 0, -5);
      ctx.fillStyle = '#facc15';
      ctx.font = '700 15px "JetBrains Mono", monospace';
      ctx.fillText(`${tgtW}g`, 0, 12);
      ctx.restore();

      // --- RIGHT PAN (Player Weights) ---
      const rightPanX = rightHookX;
      const rightPanY = rightHookY + chainLen;
      p.lastPanRightPos = { x: rightPanX, y: rightPanY };

      ctx.strokeStyle = '#a1792f';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(rightHookX, rightHookY);
      ctx.lineTo(rightPanX - panWidth * 0.44, rightPanY);
      ctx.moveTo(rightHookX, rightHookY);
      ctx.lineTo(rightPanX + panWidth * 0.44, rightPanY);
      ctx.stroke();

      // Right Pan Brass Dish
      ctx.fillStyle = curW === tgtW ? '#4a3810' : '#3c2a12';
      ctx.strokeStyle = curW === tgtW ? '#facc15' : '#d4a348';
      ctx.lineWidth = curW === tgtW ? 3 : 2.2;
      ctx.beginPath();
      ctx.moveTo(rightPanX - panWidth * 0.5, rightPanY);
      ctx.lineTo(rightPanX + panWidth * 0.5, rightPanY);
      ctx.quadraticCurveTo(rightPanX, rightPanY + 26, rightPanX - panWidth * 0.5, rightPanY);
      ctx.fill();
      ctx.stroke();

      // Render Placed Weights Left-to-Right
      const newHitboxes: WeightHitbox[] = [];
      const count = weights.length;
      if (count > 0) {
        const cols = Math.min(count, 6);
        const radius = count > 6 ? 13 : 16;
        const spacingX = Math.min(34, (panWidth * 0.86) / Math.max(1, cols));

        weights.forEach((w, idx) => {
          const row = Math.floor(idx / 6);
          const itemsInRow = row === Math.floor((count - 1) / 6) ? ((count - 1) % 6) + 1 : 6;
          const col = idx % 6;
          const rowStartX = rightPanX - ((itemsInRow - 1) * spacingX) / 2;
          const wx = rowStartX + col * spacingX;

          // Animate jump when activeScoreIndex === idx
          const prevJump = p.scoreJumpOffset.get(w.uid) ?? 0;
          const targetJump = scoreIdx === idx ? -22 : 0;
          const nextJump = prevJump + (targetJump - prevJump) * Math.min(1, dt * 18);
          p.scoreJumpOffset.set(w.uid, nextJump);

          const wy = rightPanY - radius - 2 - row * (radius * 1.95) + nextJump;

          drawPanWeight(
            ctx,
            w,
            wx,
            wy,
            radius,
            scoreIdx === idx,
            p.hoveredUid === w.uid,
            curMode === 'SELECT_PAN_TWEEZERS'
          );

          newHitboxes.push({ uid: w.uid, x: wx, y: wy, r: radius + 6 });
        });
      }
      p.hitboxes = newHitboxes;

      // Current weight badge below right pan
      ctx.save();
      ctx.fillStyle =
        curW === tgtW
          ? '#facc15'
          : curW > tgtW
          ? '#f87171'
          : '#e7e5e4';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`CURRENT: ${curW}g`, rightPanX, rightPanY + 38);
      ctx.restore();

      // 8. Guillotine Blade descending from top
      if (p.guillotineProgress > 0.03) {
        const bladeW = 132;
        const bladeH = 110;
        const topY = bladeEdgeY - bladeH;

        ctx.save();
        // Guide rails
        ctx.strokeStyle = 'rgba(120, 113, 108, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX - bladeW / 2 - 8, 0);
        ctx.lineTo(centerX - bladeW / 2 - 8, bladeEdgeY + 18);
        ctx.moveTo(centerX + bladeW / 2 + 8, 0);
        ctx.lineTo(centerX + bladeW / 2 + 8, bladeEdgeY + 18);
        ctx.stroke();

        // Heavy steel angled blade
        const bladeGrad = ctx.createLinearGradient(
          centerX - bladeW / 2,
          topY,
          centerX + bladeW / 2,
          bladeEdgeY
        );
        bladeGrad.addColorStop(0, '#3f3f46');
        bladeGrad.addColorStop(0.55, '#a1a1aa');
        bladeGrad.addColorStop(1, '#e4e4e7');

        ctx.fillStyle = bladeGrad;
        ctx.strokeStyle = curPhase === 'OVERLOAD_CHANCE' || curPhase === 'GUILLOTINE' ? '#ef4444' : '#71717a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - bladeW / 2, topY);
        ctx.lineTo(centerX + bladeW / 2, topY);
        ctx.lineTo(centerX + bladeW / 2, bladeEdgeY - 34);
        ctx.lineTo(centerX - bladeW / 2, bladeEdgeY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Razor edge glint
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - bladeW / 2, bladeEdgeY);
        ctx.lineTo(centerX + bladeW / 2, bladeEdgeY - 34);
        ctx.stroke();
        ctx.restore();
      }

      // 9. Sparks & Gold Coin Particles
      for (const s of p.sparks) {
        const alpha = Math.max(0, 1 - s.life / s.maxLife);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const cp of p.coinParticles) {
        const alpha = Math.max(0, 1 - cp.life / cp.maxLife);
        const rx = Math.max(1.5, Math.abs(Math.cos(cp.spin)) * cp.size);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cp.x, cp.y, rx, cp.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (interactionMode !== 'SELECT_PAN_TWEEZERS') {
      physRef.current.hoveredUid = null;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = physRef.current.hitboxes.find(
      (b) => Math.hypot(x - b.x, y - b.y) <= b.r
    );
    physRef.current.hoveredUid = hit ? hit.uid : null;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (interactionMode !== 'SELECT_PAN_TWEEZERS') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = physRef.current.hitboxes.find(
      (b) => Math.hypot(x - b.x, y - b.y) <= b.r
    );
    if (hit) {
      onSelectPanWeight(hit.uid);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onMouseMove={handlePointerMove}
        onClick={handleClick}
        className={`block w-full h-full ${
          interactionMode === 'SELECT_PAN_TWEEZERS' ? 'cursor-crosshair' : ''
        }`}
      />

      {/* Reaper Dialogue Subtitle */}
      {reaperSpeech && (
        <div className="pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 max-w-md px-4 py-1.5 bg-[#0e0b13]/85 border border-amber-800/40 text-center shadow-lg">
          <p className="text-xs sm:text-sm text-amber-100/90 italic tracking-wide">
            「{reaperSpeech}」
          </p>
        </div>
      )}

      {/* Tweezers Prompt Overlay */}
      {interactionMode === 'SELECT_PAN_TWEEZERS' && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-sky-950/90 border border-sky-400/70 text-sky-100 text-xs font-semibold shadow-lg">
          真鍮のピンセット：右皿のおもりをクリックして手札に戻す
        </div>
      )}
    </div>
  );
};
