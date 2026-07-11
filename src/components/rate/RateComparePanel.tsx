import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  compareProducts,
  productLabel,
  type RateKind,
  type RateProductDef,
  type RateSimInput,
} from '../../lib/rate';
import { formatJpyCompact, formatYen } from '../../lib/format';
import { PLAN_COLORS } from '../../lib/planColors';
import { DecimalInput } from './DecimalInput';
import type { Theme } from '../../hooks/useTheme';
import type { Plan, PlansState } from '../../types';

interface RateComparePanelProps {
  input: RateSimInput;
  products: RateProductDef[];
  theme: Theme;
  onChangeProduct: (id: string, patch: Partial<RateProductDef>) => void;
  onAddProduct: (kind: RateKind) => void;
  onRemoveProduct: (id: string) => void;
  plansState?: PlansState;
  onApplyProductToPlan?: (productId: string, planId: string) => void;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  unit?: 'yen' | 'compact';
}

function BarTooltip({ active, payload, label, unit }: BarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-bold text-slate-900 dark:text-white">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}
          <span className="ml-auto font-semibold tabular-nums">
            {unit === 'compact' ? formatJpyCompact(p.value) : `${formatYen(p.value)}円`}
          </span>
        </p>
      ))}
    </div>
  );
}

export function RateComparePanel({
  input,
  products,
  theme,
  onChangeProduct,
  onAddProduct,
  onRemoveProduct,
  plansState,
  onApplyProductToPlan,
}: RateComparePanelProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const rows = compareProducts(input, products);
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  const paymentData = rows.map((r) => ({
    label: r.label,
    payment: Math.round(r.monthlyPayment),
  }));
  const interestData = rows.map((r) => ({
    label: r.label,
    simple: Math.round(r.totalInterestSimple),
    transition: r.totalInterestTransition != null ? Math.round(r.totalInterestTransition) : null,
  }));

  return (
    <div className="space-y-6">
      {/* 商品の編集（自由に追加・削除できる） */}
      <div className="card p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          比較する商品（適用金利・%）
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
          金利は小数第2位まで。固定期間選択型は年数と「固定期間後に選ぶ金利」も指定できます（何もしなければ変動へ移るのが一般的）。銀行にない商品は削除、必要な固定期間は自由に追加できます。
        </p>
        <div className="space-y-2">
          {products.map((p, i) => {
            const isFixedPeriod = p.kind === 'fixedPeriod';
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }}
                  />
                  {isFixedPeriod ? (
                    <span className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      固定
                      <DecimalInput
                        value={p.fixedYears ?? 10}
                        onChange={(v) => onChangeProduct(p.id, { fixedYears: Math.max(1, Math.round(v)) })}
                        min={1}
                        max={35}
                        decimals={0}
                        ariaLabel="固定期間（年）"
                        widthClass="w-14"
                      />
                      年
                    </span>
                  ) : (
                    <span className="w-24 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {productLabel(p)}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">当初</span>
                  <DecimalInput
                    value={p.initialRatePct}
                    onChange={(v) => onChangeProduct(p.id, { initialRatePct: v })}
                    min={0}
                    max={20}
                    decimals={2}
                    suffix="%"
                    ariaLabel={`${productLabel(p)}の当初金利`}
                  />
                </span>
                {isFixedPeriod && (
                  <span className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">終了後</span>
                    <DecimalInput
                      value={p.afterRatePct ?? p.initialRatePct}
                      onChange={(v) => onChangeProduct(p.id, { afterRatePct: v })}
                      min={0}
                      max={20}
                      decimals={2}
                      suffix="%"
                      ariaLabel={`${productLabel(p)}の固定期間後の金利`}
                    />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveProduct(p.id)}
                  className="ml-auto rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                  aria-label={`${productLabel(p)}を削除`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAddProduct('variable')}
            className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400"
          >
            ＋ 変動
          </button>
          <button
            type="button"
            onClick={() => onAddProduct('fixedPeriod')}
            className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400"
          >
            ＋ 固定期間
          </button>
          <button
            type="button"
            onClick={() => onAddProduct('wholeFixed')}
            className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400"
          >
            ＋ 全期間固定
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400 dark:text-slate-500">
          比較する商品がありません。上の「＋」ボタンから追加してください。
        </div>
      ) : (
        <>
      {/* 月々返済額の比較 */}
      <div className="card p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          月々の返済額（当初）
        </h3>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          借入 {input.loanAmountMan.toLocaleString('ja-JP')}万円・{input.years}年での毎月返済額。金利が低いほど毎月の負担は軽くなります。
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={paymentData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              width={52}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(v / 10000)}万`}
            />
            <Tooltip
              cursor={{ fill: theme === 'dark' ? '#1e293b55' : '#e2e8f055' }}
              content={<BarTooltip unit="yen" />}
            />
            <Bar dataKey="payment" name="月々返済額" radius={[6, 6, 0, 0]}>
              {paymentData.map((_, i) => (
                <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 総利息の比較 */}
      <div className="card p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          総利息の比較
        </h3>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          「単純」＝その金利が全期間続いた場合。「移行後」＝固定期間が終わった後に変動へ移った場合（固定期間選択型のみ）。
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={interestData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />
            <YAxis
              width={52}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(v / 10000)}万`}
            />
            <Tooltip
              cursor={{ fill: theme === 'dark' ? '#1e293b55' : '#e2e8f055' }}
              content={<BarTooltip unit="compact" />}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="simple" name="単純（金利そのまま）" fill="#6366f1" radius={[6, 6, 0, 0]} />
            <Bar dataKey="transition" name="移行後（固定→変動）" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 詳細テーブル */}
      <div className="card p-5">
        <h3 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
          比較表
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                <th className="py-2 pr-3 font-medium">プラン</th>
                <th className="py-2 pr-3 text-right font-medium">月々返済額</th>
                <th className="py-2 pr-3 text-right font-medium">総利息（単純）</th>
                <th className="py-2 pr-3 text-right font-medium">総利息（移行後）</th>
                <th className="py-2 pr-3 text-right font-medium">移行後の月々</th>
                <th className="py-2 text-center font-medium">ライフプラン連動</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="py-2.5 pr-3">
                    <span className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }}
                      />
                      {r.label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-800 dark:text-slate-100">
                    {formatYen(r.monthlyPayment)}円
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-800 dark:text-slate-100">
                    {formatJpyCompact(r.totalInterestSimple)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {r.totalInterestTransition != null
                      ? formatJpyCompact(r.totalInterestTransition)
                      : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                    {r.paymentAfterTransition != null
                      ? `${formatYen(r.paymentAfterTransition)}円`
                      : '—'}
                  </td>
                  <td className="py-2.5 text-center relative">
                    {plansState && plansState.plans.length > 0 && onApplyProductToPlan ? (
                      <div className="inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === r.id ? null : r.id)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71m-2.21 4.3a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          <span>連動</span>
                        </button>

                        {activeMenuId === r.id && (
                          <>
                            {/* ポップオーバーの背景用透明オーバーレイ */}
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 z-20">
                              <p className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 border-b border-dashed border-slate-100 dark:border-slate-800 mb-1">
                                連動先ライフプラン
                              </p>
                              {plansState.plans.map((p: Plan) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    onApplyProductToPlan(r.id, p.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-750 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80 transition"
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
