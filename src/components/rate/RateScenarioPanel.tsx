import { useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  simulateRateScenario,
  type RateScenario,
  type RateScenarioPoint,
  type RateSimInput,
} from '../../lib/rate';
import { formatJpyCompact, formatYen } from '../../lib/format';
import { DecimalInput } from './DecimalInput';
import type { Theme } from '../../hooks/useTheme';
import type { Plan, PlansState } from '../../types';

interface RateScenarioPanelProps {
  input: RateSimInput;
  scenario: RateScenario;
  theme: Theme;
  onChangeScenario: (updater: (prev: RateScenario) => RateScenario) => void;
  onLoadFlat: () => void;
  onLoadRising: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  plansState?: PlansState;
  onApplyScenarioToPlan?: (planId: string) => void;
}

interface StepTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { yearFloat: number } }[];
  kind: 'rate' | 'payment';
}

function StepTooltip({ active, payload, kind }: StepTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  const year = Math.floor(p.payload.yearFloat);
  const mo = Math.round((p.payload.yearFloat - year) * 12);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="font-medium text-slate-500 dark:text-slate-400">
        {year}年{mo > 0 ? `${mo}ヶ月` : ''}目
      </p>
      <p className="font-bold text-slate-900 dark:text-white">
        {kind === 'rate'
          ? `適用金利 ${p.value.toFixed(2)}%`
          : `月々 ${formatYen(p.value)}円`}
      </p>
    </div>
  );
}

interface BalanceTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; color: string; payload: { yearFloat: number } }[];
}

function BalanceTooltip({ active, payload }: BalanceTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const year = Math.floor(payload[0].payload.yearFloat);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-medium text-slate-500 dark:text-slate-400">{year}年目</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}
          <span className="ml-auto font-semibold tabular-nums">{formatJpyCompact(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

interface BreakdownTooltipProps {
  active?: boolean;
  payload?: {
    name: string;
    value: number;
    color: string;
    payload: { startYear: number; endYear: number };
  }[];
}

function BreakdownTooltip({ active, payload }: BreakdownTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const title = `${d.startYear.toFixed(1)}〜${d.endYear.toFixed(1)}年`;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-medium text-slate-500 dark:text-slate-400">{title}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}
          <span className="ml-auto font-semibold tabular-nums">{formatJpyCompact(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function RuleToggle({
  on,
  label,
  desc,
  onToggle,
}: {
  on: boolean;
  label: string;
  desc: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${
        on
          ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40'
          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
      }`}
      aria-pressed={on}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          on
            ? 'border-indigo-500 bg-indigo-500 text-white'
            : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
        }`}
      >
        {on && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3 w-3">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        <span className="block text-xs text-slate-400 dark:text-slate-500">{desc}</span>
      </span>
    </button>
  );
}

export function RateScenarioPanel({
  input,
  scenario,
  theme,
  onChangeScenario,
  onLoadFlat,
  onLoadRising,
  onExport,
  onImport,
  plansState,
  onApplyScenarioToPlan,
}: RateScenarioPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const result = useMemo(
    () => simulateRateScenario(input, scenario),
    [input, scenario],
  );

  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  const chartData = result.schedule.map((s) => ({
    yearFloat: s.yearFloat,
    ratePct: s.ratePct,
    payment: Math.round(s.payment),
    balance: Math.round(s.balance),
    unpaid: Math.round(s.unpaidInterest),
  }));

  // 見直し周期ごとの返済内訳（元金・利息）と周期末の未払利息
  const review = Math.max(1, Math.round(scenario.reviewMonths || 6));
  const periodData = useMemo(() => {
    const map = new Map<
      number,
      { idx: number; startMonth: number; endMonth: number; principal: number; interest: number; unpaid: number }
    >();
    for (const s of result.schedule) {
      const bi = Math.floor((s.month - 1) / review);
      const cur =
        map.get(bi) ?? {
          idx: bi,
          startMonth: bi * review + 1,
          endMonth: (bi + 1) * review,
          principal: 0,
          interest: 0,
          unpaid: 0,
        };
      cur.principal += s.principal;
      cur.interest += s.interest;
      cur.unpaid = s.unpaidInterest; // その周期の最後の値
      cur.endMonth = s.month;
      map.set(bi, cur);
    }
    return [...map.values()]
      .sort((a, b) => a.idx - b.idx)
      .map((b) => ({
        idx: b.idx,
        startYear: (b.startMonth - 1) / 12,
        endYear: b.endMonth / 12,
        principal: Math.round(b.principal),
        interest: Math.round(b.interest),
        unpaid: Math.round(b.unpaid),
      }));
  }, [result, review]);
  // 全チャート共通の横軸目盛り（経過年）。線グラフと内訳グラフでラベルを統一する。
  const maxYear = Math.max(1, Math.round(input.years));
  const tickStep = maxYear <= 10 ? 2 : 5;
  const xYearTicks: number[] = [];
  for (let y = 0; y <= maxYear; y += tickStep) xYearTicks.push(y);
  if (xYearTicks[xYearTicks.length - 1] !== maxYear) xYearTicks.push(maxYear);
  // 内訳グラフ（見直し周期インデックス軸）用に、年→周期indexへ写像した目盛り
  const xPeriodTicks = [
    ...new Set(
      xYearTicks.map((y) =>
        Math.min(Math.max(0, periodData.length - 1), Math.round((y * 12) / review)),
      ),
    ),
  ];

  const setPoint = (idx: number, patch: Partial<RateScenarioPoint>) =>
    onChangeScenario((prev) => ({
      ...prev,
      points: prev.points.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));

  const addPoint = () =>
    onChangeScenario((prev) => {
      const last = prev.points[prev.points.length - 1];
      const nextMonth = (last?.fromMonth ?? 0) + 24;
      return {
        ...prev,
        points: [...prev.points, { fromMonth: nextMonth, ratePct: last?.ratePct ?? 0.5 }],
      };
    });

  const removePoint = (idx: number) =>
    onChangeScenario((prev) => ({
      ...prev,
      points: prev.points.filter((_, i) => i !== idx),
    }));

  const setRule = (patch: Partial<RateScenario['rules']>) =>
    onChangeScenario((prev) => ({ ...prev, rules: { ...prev.rules, ...patch } }));

  const setReviewMonths = (m: number) =>
    onChangeScenario((prev) => ({
      ...prev,
      reviewMonths: m,
      rules: { ...prev.rules, reviewMonths: m },
    }));

  return (
    <div className="space-y-6">
      {/* ライフプランへの連動機能 (共通ポップオーバー統一) */}
      {plansState && plansState.plans.length > 0 && onApplyScenarioToPlan && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-850 dark:bg-slate-800/40">
          <div className="leading-tight pr-3">
            <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
              <span>📈</span> 金利シナリオをライフプランに連動
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              設計中のお好みの金利更新スケジュールを、今すぐライフプランに適用できます。
            </p>
          </div>
          
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-500 cursor-pointer inline-flex items-center gap-1"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4 text-indigo-500">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71m-2.21 4.3a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>連動する</span>
            </button>

            {menuOpen && (
              <>
                {/* クリック時にメニューを閉じる背景オーバーレイ */}
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 z-20">
                  <p className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 border-b border-dashed border-slate-100 dark:border-slate-800 mb-1">
                    連動先ライフプラン
                  </p>
                  {plansState.plans.map((p: Plan) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onApplyScenarioToPlan(p.id);
                        setMenuOpen(false);
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
        </div>
      )}

      {/* ルールの説明 */}
      <div className="card p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          変動金利の3つのルール
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">①</span>
            見直し周期：金利は一定周期（例: 6ヶ月）ごとに見直されます。
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">②</span>
            5年ルール：金利が上がっても、返済額は5年間は変わりません。
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">③</span>
            125%ルール：返済額の見直しでも、増えるのは前回の最大1.25倍まで。
          </li>
        </ul>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          返済額が利息に満たない状態が続くと「未払利息」が発生し、元金が減りにくくなります。下のグラフで、その発生も確認できます。
        </p>
      </div>

      {/* ルールの設定 */}
      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">ルールの設定</h3>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">見直し周期</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {[
                [1, '毎月'],
                [6, '半年'],
                [12, '1年'],
              ].map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setReviewMonths(m as number)}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                    scenario.reviewMonths === m
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              または
              <DecimalInput
                value={scenario.reviewMonths}
                onChange={(v) => setReviewMonths(Math.max(1, Math.round(v)))}
                min={1}
                max={24}
                decimals={0}
                suffix="ヶ月ごと"
                ariaLabel="見直し周期（月）"
                widthClass="w-14"
              />
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            楽天銀行など毎月見直しの銀行は「毎月（1ヶ月）」に。JA等は「半年（6ヶ月）」が一般的です。
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <RuleToggle
            on={scenario.rules.paymentFixedYears > 0}
            label="5年ルール"
            desc="返済額を5年間据え置く"
            onToggle={() => setRule({ paymentFixedYears: scenario.rules.paymentFixedYears > 0 ? 0 : 5 })}
          />
          <RuleToggle
            on={scenario.rules.paymentCapRatio > 0}
            label="125%ルール"
            desc="見直し時は前回の1.25倍まで"
            onToggle={() => setRule({ paymentCapRatio: scenario.rules.paymentCapRatio > 0 ? 0 : 1.25 })}
          />
        </div>
      </div>

      {/* シナリオ編集 */}
      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">金利シナリオ（適用金利の予測）</h3>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onLoadFlat}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              横ばい
            </button>
            <button
              type="button"
              onClick={onLoadRising}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              段階上昇の例
            </button>
            <button
              type="button"
              onClick={onExport}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              読み込み
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          「いつ・何％になるか」を並べます。金利は見直し周期のタイミングで切り替わります。
        </p>
        <div className="space-y-2">
          {scenario.points.map((p, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <div className="flex items-center gap-1.5">
                {i === 0 ? (
                  <span className="w-24 text-sm font-semibold text-slate-500 dark:text-slate-400">当初</span>
                ) : (
                  <>
                    <DecimalInput
                      value={Math.round((p.fromMonth / 12) * 2) / 2}
                      onChange={(years) => setPoint(i, { fromMonth: Math.max(0, Math.round(years * 12)) })}
                      min={0}
                      max={input.years}
                      decimals={1}
                      ariaLabel={`${i}番目の切替時期（年）`}
                      widthClass="w-16"
                    />
                    <span className="text-xs text-slate-400">年後</span>
                  </>
                )}
              </div>
              <DecimalInput
                value={p.ratePct}
                onChange={(v) => setPoint(i, { ratePct: v })}
                min={0}
                max={20}
                decimals={2}
                suffix="%"
                ariaLabel={`${i}番目の金利（％）`}
              />
              <input
                type="text"
                value={p.note ?? ''}
                placeholder="メモ（任意）"
                onChange={(e) => setPoint(i, { note: e.target.value })}
                className="min-w-[80px] flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                aria-label={`${i}番目のメモ`}
              />
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => removePoint(i)}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                  aria-label="この期を削除"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addPoint}
          className="mt-3 w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400"
        >
          ＋ 期を追加
        </button>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryStat label="当初の月々" value={`${formatYen(result.monthlyPayment0)}円`} />
        <SummaryStat label="最大の月々" value={`${formatYen(result.maxPayment)}円`} accent={result.maxPayment > result.monthlyPayment0} />
        <SummaryStat label="総利息" value={formatJpyCompact(result.totalInterest)} />
        <SummaryStat
          label="未払利息（ピーク）"
          value={result.hadUnpaidInterest ? formatJpyCompact(result.maxUnpaidInterest) : 'なし'}
          warn={result.hadUnpaidInterest}
        />
      </div>

      {result.finalBalance > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <span>
            このシナリオでは返済期間の終わりに残高が残ります（元金＋未払利息の最終残債 約 {formatJpyCompact(result.finalBalance + result.finalUnpaidInterest)}）。
            5年・125%ルールで返済額が抑えられた分、最後にまとめて残るケースです。
          </span>
        </div>
      )}

      {/* 適用金利の推移 */}
      <div className="card p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">適用金利の推移</h3>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">横軸：経過年／縦軸：金利（%）</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="yearFloat"
              type="number"
              domain={[0, 'dataMax']}
              ticks={xYearTicks}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(v) => `${Math.round(v)}`}
            />
            <YAxis
              width={40}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<StepTooltip kind="rate" />} />
            <Line
              type="stepAfter"
              dataKey="ratePct"
              stroke="#ec4899"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 月々返済額の推移 */}
      <div className="card p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">月々返済額の推移</h3>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          横軸：経過年／縦軸：月々返済額（円）。5年ルールで階段状に、125%ルールで急増が抑えられます。
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="paymentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="yearFloat"
              type="number"
              domain={[0, 'dataMax']}
              ticks={xYearTicks}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(v) => `${Math.round(v)}`}
            />
            <YAxis
              width={52}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(v / 10000)}万`}
            />
            <Tooltip content={<StepTooltip kind="payment" />} />
            <Area
              type="stepAfter"
              dataKey="payment"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#paymentGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 残高＋未払利息 */}
      <div className="card p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">ローン残高と未払利息</h3>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          横軸：経過年／縦軸：金額。未払利息（赤）が積み上がると、元金が減りにくくなります。
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="yearFloat"
              type="number"
              domain={[0, 'dataMax']}
              ticks={xYearTicks}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(v) => `${Math.round(v)}`}
            />
            <YAxis
              width={56}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(v / 10000).toLocaleString('ja-JP')}万`}
            />
            <Tooltip content={<BalanceTooltip />} />
            <Area
              type="monotone"
              dataKey="balance"
              name="ローン残高"
              stackId="1"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.35}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="unpaid"
              name="未払利息"
              stackId="1"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.5}
              isAnimationActive={false}
            />
            {result.payoffMonth < result.schedule.length && (
              <ReferenceLine
                x={result.payoffMonth / 12}
                stroke="#6366f1"
                strokeDasharray="4 2"
                label={{ value: '完済', position: 'insideTopRight', fontSize: 10, fill: '#6366f1' }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 返済の内訳（見直し周期ごと） */}
      <div className="card p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">返済の内訳（見直し周期ごと）</h3>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          横軸：経過年（ラベル）／縦軸：金額。棒は見直し周期ごとの元金と利息、赤い線は未払利息の残高です。利息が元金より大きいほど、元金が減りにくい時期です。
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={periodData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="idx"
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              ticks={xPeriodTicks}
              tickFormatter={(idx) => `${Math.round((idx * review) / 12)}`}
            />
            <YAxis
              width={52}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(v / 10000)}万`}
            />
            <Tooltip content={<BreakdownTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="principal" name="元金" stackId="a" fill="#10b981" />
            <Bar dataKey="interest" name="利息" stackId="a" fill="#f59e0b" />
            <Line
              type="monotone"
              dataKey="unpaid"
              name="未払利息"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p
        className={`mt-0.5 text-lg font-bold tabular-nums ${
          warn
            ? 'text-rose-600 dark:text-rose-400'
            : accent
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
