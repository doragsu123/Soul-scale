import React, { useEffect, useRef } from 'react';
import { GamePhase, InteractionMode, WeightInstance } from '../types/game';
import { computeScaleAngleDeg } from '../utils/dropSimulator';
import { drawWeightCanvasArt } from './weightArt';

export interface FlightEvent {
  id: number;
  weight: WeightInstance;
  startClientX: number;
  startClientY: number;
}

interface ScaleCanvasProps {
  currentWeight: number;
  targetWeight: number;
  scaleWeights: WeightInstance[];
  phase: GamePhase;
  interactionMode: InteractionMode;
  activeScoreIndices: number[];
  dropEventId: number;
  flightEvent: FlightEvent | null;
  coinBurstId: number;
  hasPendulum: boolean;
  suspenseTier: 'safe' | 'danger' | 'critical';
  miracleLit: boolean;
  reaperSpeech: string;
  onSelectPanWeight: (uid: string) => void;
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

interface ActiveFlight {
  id: number;
  uid: string;
  weight: WeightInstance;
  startX: number;
  startY: number;
  elapsed: number;
  duration: number;
  touchedDown: boolean;
}

export const ScaleCanvas: React.FC<ScaleCanvasProps> = ({
  currentWeight,
  targetWeight,
  scaleWeights,
  phase,
  interactionMode,
  activeScoreIndices,
  dropEventId,
  flightEvent,
  coinBurstId,
  hasPendulum,
  suspenseTier,
  miracleLit,
  reaperSpeech,
  onSelectPanWeight,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const propsRef = useRef({
    currentWeight,
    targetWeight,
    scaleWeights,
    phase,
    interactionMode,
    activeScoreIndices,
    hasPendulum,
    suspenseTier,
    miracleLit,
  });
  propsRef.current = {
    currentWeight,
    targetWeight,
    scaleWeights,
    phase,
    interactionMode,
    activeScoreIndices,
    hasPendulum,
    suspenseTier,
    miracleLit,
  };

  // Purely visual/cosmetic physics state — never mutates game state or rewards
  const physRef = useRef({
    angleDeg: computeScaleAngleDeg(currentWeight, targetWeight),
    visualTargetAngleDeg: computeScaleAngleDeg(currentWeight, targetWeight),
    velocityDeg: 0,
    guillotineProgress: 0.02,
    sparks: [] as Spark[],
    coinParticles: [] as CoinParticle[],
    hitboxes: [] as WeightHitbox[],
    hoveredUid: null as string | null,
    lastDropEventId: 0,
    lastFlightId: 0,
    lastCoinBurstId: 0,
    activeFlight: null as ActiveFlight | null,
    landingWobble: new Map<string, { elapsed: number; kind: 'lead' | 'coin' | 'feather' }>(),
    scoreJumpOffset: new Map<string, number>(),
    time: 0,
    lastPanRightPos: { x: 0, y: 0 },
  });

  // Trigger flight immediately when flightEvent arrives
  useEffect(() => {
    if (!flightEvent || flightEvent.id === physRef.current.lastFlightId) return;
    physRef.current.lastFlightId = flightEvent.id;

    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const startX = rect ? flightEvent.startClientX - rect.left : 400;
    const startY = rect ? flightEvent.startClientY - rect.top : 450;

    const isFeather =
      flightEvent.weight.defId === 'w_fallen' ||
      flightEvent.weight.defId === 'w_feather' ||
      flightEvent.weight.defId === 'w_helium';
    const isLead = flightEvent.weight.defId === 'w_lead';

    physRef.current.activeFlight = {
      id: flightEvent.id,
      uid: flightEvent.weight.uid,
      weight: flightEvent.weight,
      startX,
      startY,
      elapsed: 0,
      duration: isFeather ? 0.42 : isLead ? 0.24 : 0.29,
      touchedDown: false,
    };
  }, [flightEvent]);

  // Keep visualTargetAngleDeg synced when NOT waiting for flight touchdown
  useEffect(() => {
    const f = physRef.current.activeFlight;
    if (!f || f.touchedDown) {
      physRef.current.visualTargetAngleDeg = computeScaleAngleDeg(
        currentWeight,
        targetWeight
      );
    }
  }, [currentWeight, targetWeight]);

  useEffect(() => {
    if (dropEventId > 0 && dropEventId !== physRef.current.lastDropEventId) {
      physRef.current.lastDropEventId = dropEventId;
      // If there's no active flight, apply impulse right away
      if (!physRef.current.activeFlight) {
        const impulse = hasPendulum ? 58 : 22;
        physRef.current.velocityDeg += impulse;
      }
    }
  }, [dropEventId, hasPendulum]);

  useEffect(() => {
    if (coinBurstId > 0 && coinBurstId !== physRef.current.lastCoinBurstId) {
      physRef.current.lastCoinBurstId = coinBurstId;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const originX = physRef.current.lastPanRightPos.x || w * 0.65;
      const originY = physRef.current.lastPanRightPos.y || h * 0.58;
      for (let i = 0; i < 36; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        const speed = 150 + Math.random() * 260;
        physRef.current.coinParticles.push({
          x: originX + (Math.random() - 0.5) * 36,
          y: originY - 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 1.0 + Math.random() * 0.6,
          size: 3.5 + Math.random() * 3.5,
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
        const spd = 80 + Math.random() * 220;
        physRef.current.sparks.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - 40,
          life: 0,
          maxLife: 0.35 + Math.random() * 0.35,
          color,
          size: 1.5 + Math.random() * 2.0,
        });
      }
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
        activeScoreIndices: scoreIndices,
        hasPendulum: pendulum,
        suspenseTier: tier,
        miracleLit: isMiracleLit,
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

      // 1. Update Active Flight & Touchdown Trigger
      if (p.activeFlight) {
        p.activeFlight.elapsed += dt;
        if (p.activeFlight.elapsed >= p.activeFlight.duration && !p.activeFlight.touchedDown) {
          p.activeFlight.touchedDown = true;
          const fw = p.activeFlight.weight;
          p.visualTargetAngleDeg = computeScaleAngleDeg(curW, tgtW);

          // Per-weight impact signature:
          // Lead: heavy drop, NO bounce (small damped settle)
          // Copper Coin: edge rock once before settling
          // Feather: soft upward lift!
          const isFeather =
            fw.defId === 'w_fallen' ||
            fw.defId === 'w_feather' ||
            fw.defId === 'w_helium';
          const isLead = fw.defId === 'w_lead';
          const isCoin = fw.defId === 'w_copper';

          if (isFeather) {
            p.velocityDeg += fw.weight < 0 ? -24 : 8;
            p.landingWobble.set(fw.uid, { elapsed: 0, kind: 'feather' });
          } else if (isLead) {
            // Stops dead without bounce
            p.velocityDeg += 10;
            p.landingWobble.set(fw.uid, { elapsed: 0, kind: 'lead' });
          } else if (isCoin) {
            p.velocityDeg += pendulum ? 50 : 18;
            p.landingWobble.set(fw.uid, { elapsed: 0, kind: 'coin' });
          } else {
            p.velocityDeg += pendulum ? 54 : 20;
          }
          p.activeFlight = null;
        }
      }

      // Advance landing wobbles
      p.landingWobble.forEach((val, key) => {
        val.elapsed += dt;
        if (val.elapsed > 0.7) {
          p.landingWobble.delete(key);
        }
      });

      // 2. Scale Beam Spring Physics
      const ratio = tgtW > 0 ? curW / tgtW : 0;
      const targetAngleDeg = p.visualTargetAngleDeg;
      const k = pendulum ? 74 : tier === 'critical' ? 38 : 56;
      const c = pendulum ? 2.6 : tier === 'critical' ? 4.4 : 6.2;

      const accel = -k * (p.angleDeg - targetAngleDeg) - c * p.velocityDeg;
      p.velocityDeg += accel * dt;
      p.angleDeg += p.velocityDeg * dt;

      // 3. Guillotine Blade
      let targetGuillotine = 0.0;
      if (curPhase === 'GUILLOTINE') {
        targetGuillotine = 0.96;
      } else if (curPhase === 'OVERLOAD_CHANCE') {
        targetGuillotine = 0.61;
      } else if (ratio >= 0.85 && curW !== tgtW) {
        targetGuillotine = 0.1 + Math.min(1, (ratio - 0.85) / 0.15) * 0.24;
      }

      const prevGuillotine = p.guillotineProgress;
      const gSpeed = curPhase === 'GUILLOTINE' || curPhase === 'OVERLOAD_CHANCE' ? 14 : 4;
      p.guillotineProgress += (targetGuillotine - p.guillotineProgress) * Math.min(1, dt * gSpeed);

      const centerX = width * 0.5;
      const fulcrumY = height * 0.37;
      const maxGuillotineDropY = height * 0.74;
      const bladeEdgeY = 8 + p.guillotineProgress * (maxGuillotineDropY - 8);

      if (
        curPhase === 'OVERLOAD_CHANCE' &&
        Math.abs(prevGuillotine - 0.61) > 0.02 &&
        Math.abs(p.guillotineProgress - 0.61) <= 0.03
      ) {
        spawnSparks(centerX, bladeEdgeY, 20, '#fb923c');
      }
      if (
        curPhase === 'GUILLOTINE' &&
        Math.abs(prevGuillotine - 0.96) > 0.03 &&
        Math.abs(p.guillotineProgress - 0.96) <= 0.04
      ) {
        spawnSparks(centerX, bladeEdgeY, 32, '#ef4444');
      }

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

      // ================================================================
      // LAYER 1: QUIET COURTROOM BACKDROP, TABLETOP & SEATED REAPER IN GLOOM
      // ================================================================
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Upper-left key light gradient (subtle, calm darkness)
      const bgGrad = ctx.createRadialGradient(
        width * 0.34,
        height * 0.28,
        24,
        centerX,
        height * 0.52,
        Math.max(width, height) * 0.78
      );
      bgGrad.addColorStop(0, '#19161b');
      bgGrad.addColorStop(0.55, '#0e0c10');
      bgGrad.addColorStop(1, '#070608');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Reaper seated silently deep in the gloom (only discernible after looking)
      const reaperShoulderY = height * 0.56;
      const reaperHeadY = height * 0.26;
      ctx.save();
      ctx.fillStyle = 'rgba(13, 11, 16, 0.92)';
      // Seated hooded cloak silhouette
      ctx.beginPath();
      ctx.moveTo(centerX - 165, reaperShoulderY + 120);
      ctx.quadraticCurveTo(centerX - 130, reaperHeadY + 65, centerX - 52, reaperHeadY + 28);
      ctx.quadraticCurveTo(centerX, reaperHeadY - 46, centerX + 52, reaperHeadY + 28);
      ctx.quadraticCurveTo(centerX + 130, reaperHeadY + 65, centerX + 165, reaperShoulderY + 120);
      ctx.closePath();
      ctx.fill();

      // Faint upper-left rim light on the Reaper's hood fold
      ctx.strokeStyle = 'rgba(138, 116, 86, 0.14)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(centerX - 120, reaperShoulderY + 40);
      ctx.quadraticCurveTo(centerX - 88, reaperHeadY + 55, centerX - 38, reaperHeadY + 12);
      ctx.quadraticCurveTo(centerX - 10, reaperHeadY - 26, centerX + 14, reaperHeadY - 12);
      ctx.stroke();

      // Subdued eyes deep within hood (barely glowing so they don't steal focus)
      const eyeY = reaperHeadY + 26;
      const eyeSpread = 22;
      let eyeColor = 'rgba(195, 185, 166, 0.36)';
      if (isMiracleLit) {
        eyeColor = 'rgba(234, 179, 8, 0.68)';
      } else if (curPhase === 'OVERLOAD_CHANCE' || curPhase === 'GUILLOTINE') {
        eyeColor = 'rgba(220, 68, 68, 0.72)';
      } else if (ratio >= 0.88) {
        eyeColor = 'rgba(217, 138, 54, 0.52)';
      }

      const lookX = Math.max(-2.5, Math.min(2.5, (p.angleDeg / 24) * 2.5));
      [-1, 1].forEach((side) => {
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.ellipse(centerX + side * eyeSpread + lookX, eyeY, 4.2, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // Quiet dark wood table plane at lower third (clean, low-noise surface)
      const tableTopY = Math.min(height * 0.84, fulcrumY + 232);
      const tableGrad = ctx.createLinearGradient(0, tableTopY, 0, height);
      tableGrad.addColorStop(0, '#1a1410');
      tableGrad.addColorStop(0.25, '#130e0b');
      tableGrad.addColorStop(1, '#0b0807');
      ctx.fillStyle = tableGrad;
      ctx.fillRect(0, tableTopY, width, height - tableTopY);

      ctx.strokeStyle = 'rgba(168, 134, 82, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, tableTopY);
      ctx.lineTo(width, tableTopY);
      ctx.stroke();

      // ================================================================
      // LAYER 2: AGED BRASS SCALE (↖ Lighting, Recessed Brown, Zero Scratch)
      // ================================================================
      const baseBottomY = tableTopY + 22;

      // Pedestal shadow on tabletop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(centerX + 8, baseBottomY + 2, 118, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stepped Aged Brass Pedestal (lit from upper-left)
      const pedGrad = ctx.createLinearGradient(centerX - 102, baseBottomY - 26, centerX + 102, baseBottomY);
      pedGrad.addColorStop(0, '#a88142');
      pedGrad.addColorStop(0.32, '#694c21');
      pedGrad.addColorStop(0.75, '#3b2912');
      pedGrad.addColorStop(1, '#24180a');

      ctx.fillStyle = pedGrad;
      ctx.strokeStyle = '#31210e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX - 102, baseBottomY);
      ctx.lineTo(centerX + 102, baseBottomY);
      ctx.lineTo(centerX + 82, baseBottomY - 20);
      ctx.lineTo(centerX - 82, baseBottomY - 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Upper-left specular rim on pedestal
      ctx.strokeStyle = 'rgba(242, 211, 146, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(centerX - 100, baseBottomY - 1);
      ctx.lineTo(centerX - 82, baseBottomY - 20);
      ctx.lineTo(centerX + 10, baseBottomY - 20);
      ctx.stroke();

      // Central Brass Pillar with recessed tarnished brown flutes
      const pillarTopY = fulcrumY - 6;
      const pillarBotY = baseBottomY - 20;
      const pillarGrad = ctx.createLinearGradient(centerX - 10, 0, centerX + 10, 0);
      pillarGrad.addColorStop(0, '#c49b52');
      pillarGrad.addColorStop(0.28, '#87622b');
      pillarGrad.addColorStop(0.55, '#3b2913'); // tarnished flute recess
      pillarGrad.addColorStop(0.8, '#5e441e');
      pillarGrad.addColorStop(1, '#291c0c');

      ctx.fillStyle = pillarGrad;
      ctx.fillRect(centerX - 8, pillarTopY, 16, pillarBotY - pillarTopY);

      // Decorative collar rings with dull brown recesses
      [pillarTopY + 28, pillarBotY - 14].forEach((ry) => {
        ctx.fillStyle = '#473217';
        ctx.fillRect(centerX - 13, ry - 4, 26, 8);
        ctx.strokeStyle = 'rgba(242, 211, 146, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX - 13, ry - 4);
        ctx.lineTo(centerX + 6, ry - 4);
        ctx.stroke();
      });

      // Precision Brass Arc Plate & Deep Hand-Carved Zero Scratch
      const gaugeR = 72;
      ctx.save();
      ctx.translate(centerX, fulcrumY);

      // Brass arc plaque
      ctx.strokeStyle = '#382712';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(0, 0, gaugeR, -Math.PI * 0.68, -Math.PI * 0.32);
      ctx.stroke();

      ctx.strokeStyle = '#8b662f';
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.arc(0, 0, gaugeR, -Math.PI * 0.675, -Math.PI * 0.325);
      ctx.stroke();

      // Thin upper-left rim highlight along arc
      ctx.strokeStyle = 'rgba(245, 216, 152, 0.42)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, gaugeR + 4, -Math.PI * 0.675, -Math.PI * 0.42);
      ctx.stroke();

      // Subtle minor tick marks
      for (let deg = -20; deg <= 20; deg += 5) {
        if (deg === 0) continue;
        const rad = ((deg - 90) * Math.PI) / 180;
        const rIn = gaugeR - 3;
        const rOut = gaugeR + 3;
        ctx.strokeStyle = 'rgba(30, 20, 10, 0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(rad) * rIn, Math.sin(rad) * rIn);
        ctx.lineTo(Math.cos(rad) * rOut, Math.sin(rad) * rOut);
        ctx.stroke();
      }

      // THE HAND-CARVED DEEP ZERO SCRATCH (刻み傷) at 0°
      // Slightly longer, rugged chisel groove that glints when aligned
      ctx.save();
      if (isMiracleLit) {
        ctx.shadowColor = 'rgba(250, 204, 21, 0.85)';
        ctx.shadowBlur = 12;
      }
      // Bright carved upper-left bevel
      ctx.strokeStyle = isMiracleLit ? '#fef08a' : '#e6c27a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-1.1, -gaugeR - 7);
      ctx.lineTo(-0.8, -gaugeR + 8);
      ctx.stroke();
      // Deep dark incised notch groove
      ctx.strokeStyle = '#140c05';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, -gaugeR - 8);
      ctx.lineTo(0.4, -gaugeR + 9);
      ctx.stroke();
      ctx.restore();

      // Rotating Slender Pointer Needle (pivots cleanly at fulcrum)
      const needleRad = (p.angleDeg * Math.PI) / 180;
      ctx.save();
      ctx.rotate(needleRad);

      if (isMiracleLit) {
        ctx.shadowColor = 'rgba(250, 204, 21, 0.9)';
        ctx.shadowBlur = 14;
      }

      // Needle body: fine tapered brass/ivory spire
      ctx.fillStyle = isMiracleLit ? '#fef08a' : '#d6ba84';
      ctx.strokeStyle = '#291c0d';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-2.4, 14);
      ctx.lineTo(0, -gaugeR + 3);
      ctx.lineTo(2.4, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Needle sharp tip highlight
      ctx.strokeStyle = isMiracleLit ? '#ffffff' : 'rgba(255, 244, 214, 0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-1, 6);
      ctx.lineTo(0, -gaugeR + 3);
      ctx.stroke();
      ctx.restore();
      ctx.restore();

      // Scale Beam & Hanging Pans
      const armLen = Math.min(272, width * 0.285);
      const chainLen = Math.min(132, height * 0.22);
      const beamRad = (p.angleDeg * Math.PI) / 180;

      const leftHookX = centerX - Math.cos(beamRad) * armLen;
      const leftHookY = fulcrumY - Math.sin(beamRad) * armLen;
      const rightHookX = centerX + Math.cos(beamRad) * armLen;
      const rightHookY = fulcrumY + Math.sin(beamRad) * armLen;

      ctx.save();
      ctx.translate(centerX, fulcrumY);
      ctx.rotate(beamRad);

      // Aged brass beam lit from upper-left
      const beamGrad = ctx.createLinearGradient(0, -10, 0, 10);
      beamGrad.addColorStop(0, '#cfa65c');
      beamGrad.addColorStop(0.35, '#8c662b');
      beamGrad.addColorStop(1, '#3b2912');

      ctx.fillStyle = beamGrad;
      ctx.strokeStyle = '#2b1d0b';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-armLen - 10, -2.5);
      ctx.lineTo(-18, -8);
      ctx.lineTo(18, -8);
      ctx.lineTo(armLen + 10, -2.5);
      ctx.lineTo(armLen + 10, 3);
      ctx.lineTo(18, 7.5);
      ctx.lineTo(-18, 7.5);
      ctx.lineTo(-armLen - 10, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Thin upper specular line on beam
      ctx.strokeStyle = 'rgba(247, 224, 168, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-armLen - 8, -2.2);
      ctx.lineTo(-18, -7.2);
      ctx.lineTo(18, -7.2);
      ctx.lineTo(armLen + 8, -2.2);
      ctx.stroke();

      // Fulcrum pivot boss (thin brass rim highlight)
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#4a3316';
      ctx.fill();
      ctx.strokeStyle = isMiracleLit ? '#fde047' : '#d6ad60';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-2, -2, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isMiracleLit ? '#fef08a' : '#b88f46';
      ctx.fill();
      ctx.restore();

      const panWidth = Math.min(184, width * 0.205);

      const drawBrassPan = (
        hookX: number,
        hookY: number,
        panX: number,
        panY: number,
        litGold: boolean
      ) => {
        // Hanging brass chains (left chain slightly brighter from upper-left light)
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#9c7536';
        ctx.beginPath();
        ctx.moveTo(hookX, hookY);
        ctx.lineTo(panX - panWidth * 0.43, panY);
        ctx.stroke();

        ctx.strokeStyle = '#63481e';
        ctx.beginPath();
        ctx.moveTo(hookX, hookY);
        ctx.lineTo(panX + panWidth * 0.43, panY);
        ctx.stroke();

        // Subtle center back cord
        ctx.strokeStyle = 'rgba(99, 72, 30, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hookX, hookY);
        ctx.lineTo(panX, panY - 2);
        ctx.stroke();

        // Dish underside gradient
        const dishGrad = ctx.createLinearGradient(
          panX - panWidth * 0.5,
          panY,
          panX + panWidth * 0.5,
          panY + 24
        );
        dishGrad.addColorStop(0, '#7d5a26');
        dishGrad.addColorStop(0.5, '#473215');
        dishGrad.addColorStop(1, '#261a0a');

        ctx.save();
        if (litGold) {
          ctx.shadowColor = 'rgba(250, 204, 21, 0.55)';
          ctx.shadowBlur = 14;
        }
        ctx.fillStyle = dishGrad;
        ctx.strokeStyle = litGold ? '#facc15' : '#8a652d';
        ctx.lineWidth = litGold ? 2.2 : 1.6;
        ctx.beginPath();
        ctx.moveTo(panX - panWidth * 0.5, panY);
        ctx.lineTo(panX + panWidth * 0.5, panY);
        ctx.quadraticCurveTo(panX, panY + 25, panX - panWidth * 0.5, panY);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Thin crisp brass highlight ONLY along upper-left pan rim
        ctx.strokeStyle = litGold ? '#fef08a' : 'rgba(245, 217, 152, 0.72)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(panX - panWidth * 0.5, panY);
        ctx.lineTo(panX + panWidth * 0.1, panY);
        ctx.stroke();
      };

      // --- LEFT PAN (Target Weight Counterbalance) ---
      const leftPanX = leftHookX;
      const leftPanY = leftHookY + chainLen;
      drawBrassPan(leftHookX, leftHookY, leftPanX, leftPanY, isMiracleLit);

      // Left Counterweight block sitting calmly on left pan
      ctx.save();
      ctx.translate(leftPanX, leftPanY - 19);
      const cwGrad = ctx.createLinearGradient(-22, -20, 22, 18);
      cwGrad.addColorStop(0, '#4a3d33');
      cwGrad.addColorStop(0.5, '#29211d');
      cwGrad.addColorStop(1, '#14100e');
      ctx.fillStyle = cwGrad;
      ctx.strokeStyle = '#876d49';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-22, 18);
      ctx.lineTo(-16, -15);
      ctx.lineTo(16, -15);
      ctx.lineTo(22, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Upper-left edge highlight on counterweight
      ctx.strokeStyle = 'rgba(229, 206, 165, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-21, 17);
      ctx.lineTo(-16, -15);
      ctx.lineTo(10, -15);
      ctx.stroke();

      ctx.fillStyle = '#c4b8a6';
      ctx.font = '600 10px "Noto Serif JP", serif';
      ctx.textAlign = 'center';
      ctx.fillText('目標', 0, -2);
      ctx.fillStyle = '#ece6da';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.fillText(`${tgtW}g`, 0, 12);
      ctx.restore();

      // --- RIGHT PAN (Player Weights) ---
      const rightPanX = rightHookX;
      const rightPanY = rightHookY + chainLen;
      p.lastPanRightPos = { x: rightPanX, y: rightPanY };
      drawBrassPan(rightHookX, rightHookY, rightPanX, rightPanY, isMiracleLit);

      // Compute pan slot layout (hide in-flight weight from pan until touchdown!)
      const activeFlightUid = p.activeFlight && !p.activeFlight.touchedDown
        ? p.activeFlight.uid
        : null;

      const newHitboxes: WeightHitbox[] = [];
      const count = weights.length;
      let flightTargetPos = { x: rightPanX, y: rightPanY - 18, size: 32 };

      if (count > 0) {
        const cols = Math.min(count, 6);
        const radius = count > 6 ? 13 : 16;
        const artSize = radius * 2.05;
        const spacingX = Math.min(35, (panWidth * 0.86) / Math.max(1, cols));

        weights.forEach((w, idx) => {
          const row = Math.floor(idx / 6);
          const itemsInRow = row === Math.floor((count - 1) / 6) ? ((count - 1) % 6) + 1 : 6;
          const col = idx % 6;
          const rowStartX = rightPanX - ((itemsInRow - 1) * spacingX) / 2;
          const wx = rowStartX + col * spacingX;

          const isActiveScore = scoreIndices.includes(idx);
          const prevJump = p.scoreJumpOffset.get(w.uid) ?? 0;
          const targetJump = isActiveScore ? -20 : 0;
          const nextJump = prevJump + (targetJump - prevJump) * Math.min(1, dt * 20);
          p.scoreJumpOffset.set(w.uid, nextJump);

          const baseWy = rightPanY - radius * 0.85 - row * (radius * 1.9) + nextJump;

          // Remember destination coordinates for active flying weight
          if (w.uid === activeFlightUid) {
            flightTargetPos = { x: wx, y: baseWy, size: artSize };
            return;
          }

          // Contact wobble after landing
          let tiltRad = 0;
          let extraY = 0;
          const wob = p.landingWobble.get(w.uid);
          if (wob) {
            if (wob.kind === 'coin') {
              // Copper coin: rocks ONCE on its rim edge then lies flat!
              const t = Math.min(1, wob.elapsed / 0.36);
              tiltRad = Math.sin(t * Math.PI * 2.0) * 0.44 * (1 - t);
              extraY = -Math.abs(Math.sin(t * Math.PI * 2.0)) * 4 * (1 - t);
            } else if (wob.kind === 'feather') {
              const t = Math.min(1, wob.elapsed / 0.35);
              tiltRad = Math.sin(t * Math.PI) * -0.18 * (1 - t);
            }
            // Lead ('lead'): zero wobble, stops dead!
          }

          // Contact shadow on pan
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.beginPath();
          ctx.ellipse(wx + 2, baseWy + radius * 0.65, radius * 0.72, 3.2, 0, 0, Math.PI * 2);
          ctx.fill();

          const isHovered = p.hoveredUid === w.uid;
          const isSelectMode = curMode === 'SELECT_PAN_TWEEZERS';

          ctx.save();
          ctx.translate(wx, baseWy + extraY);
          drawWeightCanvasArt(ctx, w.defId, artSize, {
            tiltRad,
            glowGold: isActiveScore,
            rimHighlight: isActiveScore
              ? '#fde047'
              : isHovered && isSelectMode
              ? '#7dd3fc'
              : undefined,
            showStamp: count <= 8,
            weightLabel: `${w.weight}g`,
          });

          if (isSelectMode) {
            ctx.beginPath();
            ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = isHovered ? '#38bdf8' : 'rgba(212, 163, 82, 0.6)';
            ctx.lineWidth = isHovered ? 2 : 1.2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.restore();

          newHitboxes.push({ uid: w.uid, x: wx, y: baseWy, r: radius + 6 });
        });
      }
      p.hitboxes = newHitboxes;

      // Quiet label below right pan
      ctx.save();
      ctx.fillStyle = isMiracleLit
        ? '#facc15'
        : curW > tgtW
        ? '#f87171'
        : '#d6cfc2';
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`現在 ${curW}g`, rightPanX, rightPanY + 38);
      ctx.restore();

      // ================================================================
      // LAYER 3: IN-FLIGHT WEIGHT FROM WOODEN BOX TO PAN
      // ================================================================
      if (p.activeFlight && !p.activeFlight.touchedDown) {
        const f = p.activeFlight;
        const rawT = Math.min(1, f.elapsed / f.duration);
        const w = f.weight;
        const isFeather =
          w.defId === 'w_fallen' || w.defId === 'w_feather' || w.defId === 'w_helium';

        // Easing
        const ease = isFeather
          ? 1 - Math.pow(1 - rawT, 2.2)
          : rawT < 0.5
          ? 2 * rawT * rawT
          : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

        const arcHeight = isFeather ? 150 : 120;
        const swayX = isFeather ? Math.sin(rawT * Math.PI * 2.5) * 18 : 0;

        const curX = f.startX + (flightTargetPos.x - f.startX) * ease + swayX;
        const baseY = f.startY + (flightTargetPos.y - f.startY) * ease;
        const curY = baseY - Math.sin(rawT * Math.PI) * arcHeight;

        const curSize = 48 + (flightTargetPos.size - 48) * ease;
        const flightTilt = isFeather
          ? Math.sin(rawT * Math.PI * 2.5) * 0.28
          : w.defId === 'w_copper'
          ? (1 - rawT) * -0.45
          : 0;

        // Detached shadow dropping onto tabletop/pan below
        ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * (1 - Math.sin(rawT * Math.PI) * 0.5)})`;
        ctx.beginPath();
        ctx.ellipse(curX, baseY + 18, curSize * 0.28, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(curX, curY);
        drawWeightCanvasArt(ctx, w.defId, curSize, { tiltRad: flightTilt });
        ctx.restore();
      }

      // Guillotine Blade (only appears in danger / overload / execution)
      if (p.guillotineProgress > 0.03) {
        const bladeW = 132;
        const bladeH = 110;
        const topY = bladeEdgeY - bladeH;

        ctx.save();
        ctx.strokeStyle = 'rgba(120, 113, 108, 0.28)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX - bladeW / 2 - 8, 0);
        ctx.lineTo(centerX - bladeW / 2 - 8, bladeEdgeY + 18);
        ctx.moveTo(centerX + bladeW / 2 + 8, 0);
        ctx.lineTo(centerX + bladeW / 2 + 8, bladeEdgeY + 18);
        ctx.stroke();

        const bladeGrad = ctx.createLinearGradient(
          centerX - bladeW / 2,
          topY,
          centerX + bladeW / 2,
          bladeEdgeY
        );
        bladeGrad.addColorStop(0, '#3f3f46');
        bladeGrad.addColorStop(0.55, '#9ca3af');
        bladeGrad.addColorStop(1, '#e4e4e7');

        ctx.fillStyle = bladeGrad;
        ctx.strokeStyle = curPhase === 'OVERLOAD_CHANCE' || curPhase === 'GUILLOTINE' ? '#ef4444' : '#52525b';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(centerX - bladeW / 2, topY);
        ctx.lineTo(centerX + bladeW / 2, topY);
        ctx.lineTo(centerX + bladeW / 2, bladeEdgeY - 34);
        ctx.lineTo(centerX - bladeW / 2, bladeEdgeY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(centerX - bladeW / 2, bladeEdgeY);
        ctx.lineTo(centerX + bladeW / 2, bladeEdgeY - 34);
        ctx.stroke();
        ctx.restore();
      }

      // Sparks & Gold Particles
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
        ctx.fillStyle = '#e5b84b';
        ctx.strokeStyle = '#855814';
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

      {reaperSpeech && (
        <div className="pointer-events-none absolute top-2.5 left-1/2 -translate-x-1/2 max-w-md px-4 py-1.5 bg-[#0c0a0f]/80 border border-stone-800/80 text-center">
          <p className="text-xs sm:text-sm text-[#dcd4c6] tracking-wide">
            「{reaperSpeech}」
          </p>
        </div>
      )}

      {interactionMode === 'SELECT_PAN_TWEEZERS' && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-stone-900/95 border border-stone-600 text-stone-100 text-xs font-semibold shadow-lg">
          真鍮のピンセット：右皿のおもりをクリックして手札に戻す
        </div>
      )}
    </div>
  );
};
