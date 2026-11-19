import React, { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { RELIC_LIST, TOOL_LIST, WEIGHT_LIST } from '../data/database';
import { RelicGlyph, ToolGlyph, WeightGlyph } from './WeightGlyph';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'rules' | 'weights' | 'items'>('rules');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#110e15] border border-amber-700/60 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800 bg-[#17121c]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-amber-200 tracking-wider">
              死神の法典 — CODEX & RULES
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 cursor-pointer"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-stone-800 bg-[#141019]">
          <button
            type="button"
            onClick={() => setTab('rules')}
            className={`px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              tab === 'rules'
                ? 'bg-amber-700 text-stone-100'
                : 'bg-[#1c1722] text-stone-400 hover:text-stone-200'
            }`}
          >
            計量法・計算式
          </button>
          <button
            type="button"
            onClick={() => setTab('weights')}
            className={`px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              tab === 'weights'
                ? 'bg-amber-700 text-stone-100'
                : 'bg-[#1c1722] text-stone-400 hover:text-stone-200'
            }`}
          >
            おもり図鑑 (全15種)
          </button>
          <button
            type="button"
            onClick={() => setTab('items')}
            className={`px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              tab === 'items'
                ? 'bg-amber-700 text-stone-100'
                : 'bg-[#1c1722] text-stone-400 hover:text-stone-200'
            }`}
          >
            道具・遺物図鑑
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto gothic-scroll space-y-5 text-sm text-stone-200">
          {tab === 'rules' && (
            <>
              <div className="p-4 bg-[#18131f] border border-amber-700/40">
                <h3 className="font-bold text-amber-300 mb-2">
                  1. 2軸スコア計算式（Soul × Sin × 水平精度倍率）
                </h3>
                <p className="font-mono-num text-base font-bold text-amber-100 bg-[#0d0a11] px-3 py-2 border border-stone-800">
                  獲得コイン = Math.floor( Total Soul × Total Sin倍率 × 水平精度倍率 )
                </p>
                <p className="text-xs text-stone-300 mt-2.5 leading-relaxed">
                  計量確定（WEIGH & JUDGE）時、右皿のおもりを<strong className="text-amber-200">左から右へ順番に</strong>評価し、Soul（魂値）と Sin倍率（初期1.0）を加算・乗算します。おもり配置の順番（鏡の分銅・狂王の冠など）が極めて重要です。
                </p>
              </div>

              <div className="p-4 bg-[#17131d] border border-stone-800">
                <h3 className="font-bold text-amber-300 mb-2">
                  2. 水平精度倍率（Current vs Target）
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono-num text-xs">
                  <div className="p-2 bg-[#110e15] border border-stone-800">
                    <div className="text-stone-400">達成率 0% 〜 49%</div>
                    <div className="text-stone-200 font-bold">×0.50 〜 ×0.80</div>
                  </div>
                  <div className="p-2 bg-[#110e15] border border-stone-800">
                    <div className="text-stone-400">達成率 50% 〜 79%</div>
                    <div className="text-stone-200 font-bold">×0.85 〜 ×1.30</div>
                  </div>
                  <div className="p-2 bg-[#110e15] border border-stone-800">
                    <div className="text-stone-400">達成率 80% 〜 89%</div>
                    <div className="text-amber-200 font-bold">×1.80 〜 ×2.30</div>
                  </div>
                  <div className="p-2 bg-[#110e15] border border-stone-800">
                    <div className="text-stone-400">達成率 90% 〜 94%</div>
                    <div className="text-amber-300 font-bold">×3.00 〜 ×3.80</div>
                  </div>
                  <div className="p-2 bg-[#110e15] border border-stone-800">
                    <div className="text-stone-400">達成率 95% 〜 99%</div>
                    <div className="text-orange-300 font-bold">×5.00 〜 ×6.50</div>
                  </div>
                  <div className="p-2 bg-[#231906] border border-amber-500/70">
                    <div className="text-amber-300">完全水平 (誤差 0g)</div>
                    <div className="text-yellow-300 font-bold">×12.00 + 無料リロール券</div>
                  </div>
                </div>
                <p className="text-xs text-stone-400 mt-2">
                  ※ 悪魔の接着剤などで Target を超過したまま確定した場合、水平精度倍率は ×5.00 となります。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#1c1014] border border-red-800/50">
                  <h3 className="font-bold text-red-300 mb-1.5">
                    3. OVERLOAD 猶予と DEATH DEFIED!
                  </h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Current が Target を <strong className="text-red-200">1g〜15g（遺物で25g）</strong> 超過すると、ギロチンが急降下し <strong className="text-red-300">OVERLOAD_CHANCE</strong> に突入（1Trial 1回まで）。
                    確定と供物は封じられ、<strong className="text-amber-200">1アクションのみ</strong>で Target 以下に引き戻せれば生還！このTrialの Sin倍率が <strong className="text-emerald-300">×2.0（DEATH DEFIED!）</strong> になります。失敗や大幅超過は即斬首（獲得0）となります。
                  </p>
                </div>

                <div className="p-4 bg-[#15121b] border border-stone-800">
                  <h3 className="font-bold text-amber-300 mb-1.5">
                    4. 供物台 & 血のオールイン契約
                  </h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    <strong className="text-stone-100">供物台（Discard）</strong>では手札のおもりを捧げてその Soul の半分（端数切捨て、遺物で2倍）を蓄積できます。
                    <br />
                    <strong className="text-red-300">血のオールイン契約（Trial 3限定）</strong>は開始時に結ぶことで Target +20g・OVERLOAD猶予なし となる代わりに、完全水平（100%）達成で Day ノルマ残額を一発完済します。
                  </p>
                </div>
              </div>
            </>
          )}

          {tab === 'weights' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WEIGHT_LIST.map((w) => (
                <div
                  key={w.id}
                  className="flex items-start gap-3 p-3 bg-[#17131e] border border-stone-800"
                >
                  <WeightGlyph defId={w.id} className="w-9 h-9 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-stone-100">{w.name}</span>
                      <span className="font-mono-num text-xs text-amber-300">
                        {w.id === 'w_mercury' ? '10~20g' : `${w.weight}g`} · Soul {w.soul} · Sin +{w.sinBonus}
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                      {w.effectDesc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'items' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-sky-300 mb-2">道具（Tools・全4種）</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TOOL_LIST.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start gap-3 p-3 bg-[#151520] border border-stone-800"
                    >
                      <ToolGlyph defId={t.id} className="w-7 h-7 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-stone-100">
                          {t.name}{' '}
                          <span className="font-mono-num text-xs text-amber-300 ml-1">
                            ({t.price} G)
                          </span>
                        </div>
                        <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                          {t.effectDesc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-purple-300 mb-2">死神の遺物（Relics・全6種）</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {RELIC_LIST.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-start gap-3 p-3 bg-[#191322] border border-purple-900/40"
                    >
                      <RelicGlyph defId={r.id} className="w-7 h-7 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-purple-100">
                          {r.name}{' '}
                          <span className="font-mono-num text-xs text-amber-300 ml-1">
                            ({r.price} G)
                          </span>
                        </div>
                        <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                          {r.effectDesc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
