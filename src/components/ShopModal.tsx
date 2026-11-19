import React, { useState } from 'react';
import { RefreshCw, Shield, Sparkles, Trash2, Wrench, ArrowRight } from 'lucide-react';
import {
  RelicId,
  ShopInventory,
  ToolInstance,
  WeightInstance,
} from '../types/game';
import { RelicGlyph, ToolGlyph, WeightGlyph } from './WeightGlyph';

interface ShopModalProps {
  day: number;
  coins: number;
  freeRerolls: number;
  shop: ShopInventory;
  deck: WeightInstance[];
  tools: ToolInstance[];
  relics: RelicId[];
  onBuyWeight: (slotIndex: number) => void;
  onBuyTool: (slotIndex: number) => void;
  onBuyRelic: (slotIndex: number) => void;
  onRemoveWeight: (uid: string) => void;
  onReroll: () => void;
  onNextDay: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  day,
  coins,
  freeRerolls,
  shop,
  deck,
  tools,
  relics,
  onBuyWeight,
  onBuyTool,
  onBuyRelic,
  onRemoveWeight,
  onReroll,
  onNextDay,
}) => {
  const [removingMode, setRemovingMode] = useState(false);

  const canReroll = freeRerolls > 0 || coins >= shop.rerollCost;
  const canOpenRemove = !shop.removeUsed && coins >= shop.removeCost && deck.length > 5;

  const rarityText = (rarity: string) => {
    if (rarity === 'rare') return { label: '希少', cls: 'text-amber-300' };
    if (rarity === 'uncommon') return { label: '上質', cls: 'text-sky-300' };
    return { label: '一般', cls: 'text-stone-400' };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#110e15] border border-amber-700/60 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b border-stone-800 bg-[#17121c]">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-amber-200 tracking-wider">
              死神の闇市 — DAY {day} 終了
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              ノルマ達成後の余剰コインで天秤を強化せよ · デッキ {deck.length}個 · 道具 {tools.length}/3 · 遺物 {relics.length}/6
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-1.5 bg-[#1f1912] border border-amber-600/50 text-right">
              <div className="text-[10px] text-amber-400/80">所持コイン</div>
              <div className="font-mono-num text-lg font-bold text-amber-300">
                {coins.toLocaleString()} G
              </div>
            </div>
            <button
              type="button"
              onClick={onNextDay}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>DAY {day + 1} へ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto gothic-scroll space-y-5 flex-1">
          {removingMode ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div>
                  <h3 className="text-base font-bold text-red-300">
                    デッキからおもり1個を永久削除（費用: {shop.removeCost} G）
                  </h3>
                  <p className="text-xs text-stone-400">
                    重い鉛や不要な分銅を削り、精密計量の確率を高めよ。（最低5個まで残す必要あり）
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRemovingMode(false)}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-xs text-stone-200 cursor-pointer"
                >
                  戻る
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {deck.map((w) => (
                  <button
                    key={w.uid}
                    type="button"
                    onClick={() => {
                      onRemoveWeight(w.uid);
                      setRemovingMode(false);
                    }}
                    className="flex items-center gap-2.5 p-2.5 bg-[#18131d] hover:bg-red-950/50 border border-stone-700 hover:border-red-500 text-left transition-colors cursor-pointer"
                  >
                    <WeightGlyph defId={w.defId} className="w-7 h-7 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-stone-100 truncate">
                        {w.name}
                      </div>
                      <div className="font-mono-num text-[11px] text-amber-300">
                        {w.weight}g · Soul {w.soul}
                        {w.sinBonus > 0 ? ` · Sin +${w.sinBonus}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Weights Section (3 slots) */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>おもり（Weights）</span>
                  </h3>
                  <span className="text-xs text-stone-400">購入するとデッキに加わる</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {shop.weights.map((w, idx) => {
                    const bought = shop.purchasedWeightIndices.includes(idx);
                    const affordable = coins >= w.price;
                    const rar = rarityText(w.rarity);
                    return (
                      <div
                        key={`${w.id}_${idx}`}
                        className={`flex flex-col justify-between p-3.5 border ${
                          bought
                            ? 'bg-[#120f16]/50 border-stone-800/50 opacity-45'
                            : 'bg-[#17131e] border-stone-700/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <WeightGlyph defId={w.id} className="w-9 h-9 shrink-0" />
                              <div>
                                <div className="text-sm font-bold text-stone-100">
                                  {w.name}
                                </div>
                                <div className={`text-[11px] ${rar.cls}`}>
                                  {rar.label} · {w.id === 'w_mercury' ? '10~20g' : `${w.weight}g`}
                                </div>
                              </div>
                            </div>
                            <div className="font-mono-num text-right text-xs">
                              <div className="text-amber-300 font-bold">Soul {w.soul}</div>
                              <div className="text-rose-300">Sin +{w.sinBonus}</div>
                            </div>
                          </div>
                          <p className="text-xs text-stone-300 mt-2.5 leading-relaxed">
                            {w.effectDesc}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={bought || !affordable}
                          onClick={() => onBuyWeight(idx)}
                          className={`mt-3 w-full py-2 text-xs font-bold font-mono-num transition-colors ${
                            bought
                              ? 'bg-stone-800 text-stone-500 cursor-default'
                              : affordable
                              ? 'bg-amber-700/80 hover:bg-amber-600 text-stone-100 cursor-pointer'
                              : 'bg-stone-800/70 text-stone-500 cursor-not-allowed'
                          }`}
                        >
                          {bought ? '購入済み' : `${w.price} G で購入`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Tools & Relics 2-Column Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Tools (2 slots) */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-sky-200 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-sky-400" />
                      <span>道具（Tools）</span>
                    </h3>
                    <span className="text-xs text-stone-400">最大3枠 ({tools.length}/3)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {shop.tools.map((t, idx) => {
                      const bought = shop.purchasedToolIndices.includes(idx);
                      const full = tools.length >= 3;
                      const affordable = coins >= t.price;
                      return (
                        <div
                          key={`${t.id}_${idx}`}
                          className={`flex flex-col justify-between p-3 border ${
                            bought
                              ? 'bg-[#120f16]/50 border-stone-800/50 opacity-45'
                              : 'bg-[#151520] border-stone-700/80'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <ToolGlyph defId={t.id} className="w-7 h-7 shrink-0" />
                              <div className="text-sm font-bold text-stone-100">
                                {t.name}
                              </div>
                            </div>
                            <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                              {t.effectDesc}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={bought || full || !affordable}
                            onClick={() => onBuyTool(idx)}
                            className={`mt-3 w-full py-1.5 text-xs font-bold font-mono-num transition-colors ${
                              bought
                                ? 'bg-stone-800 text-stone-500 cursor-default'
                                : full
                                ? 'bg-stone-800 text-stone-400 cursor-not-allowed'
                                : affordable
                                ? 'bg-sky-800 hover:bg-sky-700 text-sky-50 cursor-pointer'
                                : 'bg-stone-800/70 text-stone-500 cursor-not-allowed'
                            }`}
                          >
                            {bought
                              ? '購入済み'
                              : full
                              ? '道具枠上限 (3/3)'
                              : `${t.price} G で購入`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Relics (2 slots) */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-purple-200 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>死神の遺物（Relics）</span>
                    </h3>
                    <span className="text-xs text-stone-400">永続パッシブ ({relics.length}/6)</span>
                  </div>
                  {shop.relics.length === 0 ? (
                    <div className="p-6 bg-[#15121c] border border-stone-800 text-xs text-stone-400 text-center">
                      すべての遺物を所持しています。
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {shop.relics.map((r, idx) => {
                        const bought =
                          shop.purchasedRelicIndices.includes(idx) ||
                          relics.includes(r.id);
                        const full = relics.length >= 6;
                        const affordable = coins >= r.price;
                        return (
                          <div
                            key={`${r.id}_${idx}`}
                            className={`flex flex-col justify-between p-3 border ${
                              bought
                                ? 'bg-[#120f16]/50 border-stone-800/50 opacity-45'
                                : 'bg-[#191322] border-purple-900/60'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <RelicGlyph defId={r.id} className="w-7 h-7 shrink-0" />
                                <div className="text-sm font-bold text-purple-100">
                                  {r.name}
                                </div>
                              </div>
                              <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                                {r.effectDesc}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={bought || full || !affordable}
                              onClick={() => onBuyRelic(idx)}
                              className={`mt-3 w-full py-1.5 text-xs font-bold font-mono-num transition-colors ${
                                bought
                                  ? 'bg-stone-800 text-stone-500 cursor-default'
                                  : full
                                  ? 'bg-stone-800 text-stone-400 cursor-not-allowed'
                                  : affordable
                                  ? 'bg-purple-800 hover:bg-purple-700 text-purple-50 cursor-pointer'
                                  : 'bg-stone-800/70 text-stone-500 cursor-not-allowed'
                              }`}
                            >
                              {bought
                                ? '所持 / 購入済み'
                                : full
                                ? '遺物上限 (6/6)'
                                : `${r.price} G で購入`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </div>

        {/* Footer Services: Reroll & Deck Remove */}
        {!removingMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-stone-800 bg-[#15111a]">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!canReroll}
                onClick={onReroll}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border transition-colors ${
                  canReroll
                    ? 'bg-[#211b29] hover:bg-[#2d2438] border-amber-700/60 text-amber-200 cursor-pointer'
                    : 'bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {freeRerolls > 0
                    ? `陳列リロール（無料券 残${freeRerolls}）`
                    : `陳列リロール（${shop.rerollCost} G）`}
                </span>
              </button>

              <button
                type="button"
                disabled={!canOpenRemove}
                onClick={() => setRemovingMode(true)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border transition-colors ${
                  canOpenRemove
                    ? 'bg-[#241418] hover:bg-[#351b21] border-red-700/60 text-red-200 cursor-pointer'
                    : 'bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {shop.removeUsed
                    ? 'デッキ削除（本日使用済み）'
                    : deck.length <= 5
                    ? 'デッキ削除（最小5個）'
                    : `おもり1個削除（${shop.removeCost} G）`}
                </span>
              </button>
            </div>

            <div className="text-xs text-stone-400">
              完全水平（誤差0g）達成で無料リロール券を獲得
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
