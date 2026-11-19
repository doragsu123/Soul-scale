import React from 'react';
import { BannerState, FloatingEffect } from '../types/game';

interface FloatingEffectsProps {
  effects: FloatingEffect[];
  flashTone: 'gold' | 'crimson' | null;
  banner: BannerState | null;
}

export const FloatingEffects: React.FC<FloatingEffectsProps> = ({
  effects,
  flashTone,
  banner,
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {/* Full-screen flash */}
      {flashTone === 'gold' && (
        <div
          className="absolute inset-0 bg-amber-400/25 transition-opacity duration-500"
          style={{ boxShadow: 'inset 0 0 120px rgba(250, 204, 21, 0.55)' }}
        />
      )}
      {flashTone === 'crimson' && (
        <div
          className="absolute inset-0 bg-red-600/25 transition-opacity duration-300"
          style={{ boxShadow: 'inset 0 0 140px rgba(220, 38, 38, 0.7)' }}
        />
      )}

      {/* Floating text popups */}
      {effects.map((fx) => (
        <div
          key={fx.id}
          className="animate-float-up absolute text-center whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
          style={{
            left: `${fx.x}%`,
            top: `${fx.y}%`,
            color: fx.color,
          }}
        >
          <div className="font-mono-num text-lg sm:text-xl font-bold tracking-tight">
            {fx.text}
          </div>
          {fx.subtext && (
            <div className="text-xs font-semibold text-amber-100/90 mt-0.5">
              {fx.subtext}
            </div>
          )}
        </div>
      ))}

      {/* Dramatic Judge Banner */}
      {banner && (
        <div className="absolute inset-x-0 top-[22%] flex justify-center px-4">
          <div
            className={`animate-banner-slam px-8 py-4 border text-center backdrop-blur-md shadow-2xl ${
              banner.tone === 'gold'
                ? 'bg-[#1a1306]/90 border-amber-400 text-amber-200 shadow-amber-500/30'
                : banner.tone === 'crimson'
                ? 'bg-[#21070a]/92 border-red-500 text-red-200 shadow-red-600/40'
                : banner.tone === 'emerald'
                ? 'bg-[#061c15]/90 border-emerald-400 text-emerald-200 shadow-emerald-500/30'
                : 'bg-[#1f1307]/90 border-amber-500 text-amber-100 shadow-amber-500/25'
            }`}
          >
            <div className="font-display text-2xl sm:text-3xl font-bold tracking-widest">
              {banner.title}
            </div>
            {banner.subtitle && (
              <div className="text-sm mt-1 text-stone-200/90 font-medium">
                {banner.subtitle}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
