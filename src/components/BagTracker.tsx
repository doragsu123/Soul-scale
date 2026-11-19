import React, { useMemo, useState } from 'react';
import { Eye, Package, X } from 'lucide-react';
import { WeightInstance } from '../types/game';
import { WeightGlyph } from './WeightGlyph';

interface BagTrackerProps {
  bag: WeightInstance[];
  glassActive: boolean;
}

export const BagTracker: React.FC<BagTrackerProps> = ({ bag, glassActive }) => {
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    const total = bag.length;
    const bands = [
      { label: 'マイナス (-)', items: bag.filter((w) => w.weight < 0) },
      { label: '軽量 (1〜9g)', items: bag.filter((w) => w.weight >= 0 && w.weight <= 9) },
      { label: '中量 (10〜14g)', items: bag.filter((w) => w.weight >= 10 && w.weight <= 14) },
      { label: '重量 (15〜19g)', items: bag.filter((w) => w.weight >= 15 && w.weight <= 19) },
      { label: '超重 (20g+)', items: bag.filter((w) => w.weight >= 20) },
    ];

    const byType = new Map<
      string,
      { sample: WeightInstance; count: number; prob: number }
    >();
    for (const w of bag) {
      const key = `${w.defId}_${w.weight}_${w.soul}`;
      const existing = byType.get(key);
      if (existing) {
        existing.count += 1;
        existing.prob = total > 0 ? (existing.count / total) * 100 : 0;
      } else {
        byType.set(key, {
          sample: w,
          count: 1,
          prob: total > 0 ? (1 / total) * 100 : 0,
        });
      }
    }

    const groupedList = Array.from(byType.values()).sort(
      (a, b) => b.sample.weight - a.sample.weight
    );

    return { total, bands, groupedList };
  }, [bag]);

  // Note: bag draws from index 0 (or end). We treat bag[0..4] as next 5 draws!
  const nextFive = useMemo(() => bag.slice(0, 5), [bag]);

  return (
    <div className="relative z-20">
      {/* Compact Trigger + Glass X-ray strip */}
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 px-3.5 py-2 bg-[#141118]/90 hover:bg-[#1e1925] border border-amber-700/40 hover:border-amber-500/70 text-stone-200 transition-colors cursor-pointer shadow-lg"
          title="おもり袋の中身を確認"
        >
          <Package className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold tracking-wide whitespace-nowrap">
            おもり袋
          </span>
          <span className="font-mono-num text-sm font-bold text-amber-300">
            {bag.length}個
          </span>
        </button>

        {/* Active Magnifying Glass preview directly visible */}
        {glassActive && (
          <div className="bg-[#12101a]/95 border border-sky-500/50 p-2.5 shadow-xl max-w-[215px]">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-300 mb-1.5">
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>虫眼鏡透視：次の5個</span>
            </div>
            {nextFive.length === 0 ? (
              <div className="text-[11px] text-stone-400">袋は空です</div>
            ) : (
              <ol className="space-y-1">
                {nextFive.map((w, idx) => (
                  <li
                    key={w.uid}
                    className="flex items-center justify-between gap-2 text-[11px] border-b border-stone-800/80 pb-1 last:border-none last:pb-0"
                  >
                    <span className="text-stone-300 truncate">
                      <span className="font-mono-num text-sky-400 mr-1">
                        {idx + 1}.
                      </span>
                      {w.name}
                    </span>
                    <span
                      className={`font-mono-num font-bold shrink-0 ${
                        w.weight < 0
                          ? 'text-teal-300'
                          : w.defId === 'w_mercury'
                          ? 'text-sky-300'
                          : 'text-amber-300'
                      }`}
                    >
                      {w.defId === 'w_mercury' && !w.mercuryResolved
                        ? '10~20g'
                        : `${w.weight}g`}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>

      {/* Expanded Tracker Drawer */}
      {open && (
        <div className="absolute left-0 top-11 w-[310px] sm:w-[340px] max-h-[62vh] flex flex-col bg-[#110e15]/98 border border-amber-700/60 shadow-2xl z-40">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-stone-800 bg-[#18131d]">
            <div className="text-sm font-semibold text-amber-200">
              袋の残存リスト（計 {summary.total}個）
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 text-stone-400 hover:text-stone-100 cursor-pointer"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 overflow-y-auto gothic-scroll space-y-3">
            {/* Weight band breakdown */}
            <div>
              <div className="text-[11px] text-stone-400 font-semibold mb-1.5">
                重さ帯別の残り枚数・確率
              </div>
              <div className="grid grid-cols-1 gap-1">
                {summary.bands.map((band) => {
                  const pct =
                    summary.total > 0
                      ? ((band.items.length / summary.total) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <div
                      key={band.label}
                      className="flex items-center justify-between px-2.5 py-1 bg-[#18141e] border border-stone-800/80 text-xs"
                    >
                      <span className="text-stone-300">{band.label}</span>
                      <span className="font-mono-num text-stone-200">
                        <strong className="text-amber-300">
                          {band.items.length}
                        </strong>
                        個 <span className="text-stone-500">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed remaining weights */}
            <div>
              <div className="text-[11px] text-stone-400 font-semibold mb-1.5">
                種類別・ドロー確率
              </div>
              {summary.groupedList.length === 0 ? (
                <div className="text-xs text-stone-500 py-2">
                  袋に残りのおもりはありません。
                </div>
              ) : (
                <div className="space-y-1">
                  {summary.groupedList.map(({ sample, count, prob }) => (
                    <div
                      key={`${sample.defId}_${sample.weight}_${sample.soul}`}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 bg-[#16121b] border border-stone-800/70 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <WeightGlyph
                          defId={sample.defId}
                          className="w-5 h-5 shrink-0"
                        />
                        <div className="truncate">
                          <span className="text-stone-200 font-medium">
                            {sample.name}
                          </span>
                          <span className="font-mono-num text-[11px] text-stone-400 ml-1.5">
                            {sample.defId === 'w_mercury'
                              ? '10~20g'
                              : `${sample.weight}g`}
                          </span>
                        </div>
                      </div>
                      <div className="font-mono-num text-right shrink-0">
                        <span className="text-amber-300 font-bold">
                          ×{count}
                        </span>
                        <span className="text-stone-500 ml-1.5 text-[11px]">
                          {prob.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
