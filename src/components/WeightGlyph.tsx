import React, { useEffect, useRef } from 'react';
import { RelicId, ToolId, WeightId } from '../types/game';
import { drawWeightCanvasArt } from './weightArt';

interface WeightGlyphProps {
  defId: WeightId;
  className?: string;
}

/**
 * Renders the shared original weight artwork (共通の原画) using the exact same
 * drawWeightCanvasArt routine used during flight and on the brass scale pan.
 */
export const WeightGlyph: React.FC<WeightGlyphProps> = ({
  defId,
  className = 'w-9 h-9',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const logicalSize = Math.max(24, Math.round(rect.width || 44));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = logicalSize * dpr;
    canvas.height = logicalSize * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, logicalSize, logicalSize);
    ctx.translate(logicalSize / 2, logicalSize / 2);
    drawWeightCanvasArt(ctx, defId, logicalSize * 0.94);
    ctx.restore();
  }, [defId, className]);

  return (
    <canvas
      ref={canvasRef}
      className={`block shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
};

export const ToolGlyph: React.FC<{ defId: ToolId; className?: string }> = ({
  defId,
  className = 'w-6 h-6',
}) => {
  switch (defId) {
    case 't_glass':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <circle cx="12" cy="12" r="7" fill="#1e293b" stroke="#d4a352" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3" stroke="#7dd3fc" strokeWidth="1.2" />
          <path d="M17 17L24 24" stroke="#9e6d2b" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 't_tweezers':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <path d="M22 6L9 19L6 23" stroke="#d4a352" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M22 6L12 22L6 23" stroke="#9e6d2b" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 't_file':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <path d="M10 18L22 6L24 8L12 20L10 18Z" fill="#94a3b8" stroke="#e2e8f0" strokeWidth="1.3" />
          <path d="M5 23L10 18" stroke="#854d1e" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 't_glue':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <path d="M11 6H17L19 14V23H9V14L11 6Z" fill="#6b1d24" stroke="#e2a8ae" strokeWidth="1.5" />
          <path d="M12 6V4H16V6" stroke="#d4a352" strokeWidth="1.5" />
        </svg>
      );
  }
};

export const RelicGlyph: React.FC<{ defId: RelicId; className?: string }> = ({
  defId,
  className = 'w-6 h-6',
}) => {
  switch (defId) {
    case 'r_fulcrum':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <polygon points="14,5 23,23 5,23" fill="#5e3716" stroke="#d4a352" strokeWidth="1.6" />
          <circle cx="14" cy="17" r="2.2" fill="#efe2b8" />
        </svg>
      );
    case 'r_pendulum':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <path d="M14 4V17" stroke="#cbd5e1" strokeWidth="1.6" />
          <circle cx="14" cy="20" r="4.5" fill="#9e6d2b" stroke="#efe2b8" strokeWidth="1.6" />
          <path d="M7 18C9 21 19 21 21 18" stroke="#d4a352" strokeWidth="1.1" strokeDasharray="2 2" />
        </svg>
      );
    case 'r_miracle':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <circle cx="14" cy="14" r="9" fill="#3a230a" stroke="#e8c472" strokeWidth="1.6" />
          <path d="M14 7L16 12L21 14L16 16L14 21L12 16L7 14L12 12L14 7Z" fill="#f5e3a3" />
        </svg>
      );
    case 'r_zero':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <circle cx="14" cy="14" r="8" stroke="#76c7bd" strokeWidth="1.7" />
          <path d="M9 19L19 9" stroke="#47a69b" strokeWidth="1.6" />
        </svg>
      );
    case 'r_altar':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <path d="M6 12H22L20 23H8L6 12Z" fill="#471321" stroke="#d98998" strokeWidth="1.5" />
          <path d="M14 5C16 8 17 10 14 12C11 10 12 8 14 5Z" fill="#d97736" />
        </svg>
      );
    case 'r_scale':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <rect x="4" y="10" width="20" height="8" rx="1.5" fill="#1e293b" stroke="#d4a352" strokeWidth="1.5" />
          <path d="M9 10V14M14 10V15M19 10V14" stroke="#efe2b8" strokeWidth="1.4" />
        </svg>
      );
  }
};
