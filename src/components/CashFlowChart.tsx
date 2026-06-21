import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PlanYear } from '../lib/plan';
import type { Theme } from '../hooks/useTheme';

interface CashFlowChartProps {
  data: PlanYear[];
  theme: Theme;
}

interface ChartRow {
  age: number;
  収入: number;
  暮らし: number;
  ローン: number;
  イベント: number;
  balance: number;
}

interface TooltipItem {
  payload: ChartRow;
}

interface CFTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
}

function CFTooltip({ active, payload }: CFTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  const positive = row.balance >= 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-medium text-slate-500 dark:text-slate-400">
        {row.age}歳時点
      </p>
      <p className="text-slate-700 dark:text-slate-200">
        収入 {row.収入.toLocaleString('ja-JP')}万円
      </p>
      <p className="text-slate-700 dark:text-slate-200">
        暮らし {row.暮らし.toLocaleString('ja-JP')}万円
      </p>
      <p className="text-slate-700 dark:text-slate-200">
        ローン {row.ローン.toLocaleString('ja-JP')}万円
      </p>
      {row.イベント > 0 && (
        <p className="text-amber-600 dark:text-amber-400">
          イベント {row.イベント.toLocaleString('ja-JP')}万円
        </p>
      )}
      <p
        className={`mt-1 font-bold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
      >
        収支 {positive ? '+' : ''}
        {row.balance.toLocaleString('ja-JP')}万円
      </p>
    </div>
  );
}

export function CashFlowChart({ data, theme }: CashFlowChartProps) {
  const rows: ChartRow[] = data
    .filter((d) => d.year >= 1)
    .map((d) => ({
      age: d.age,
      収入: Math.round(d.income / 10000),
      暮らし: Math.round(d.expense / 10000),
      ローン: Math.round(d.loanRepayment / 10000),
      イベント: Math.round(d.eventExpense / 10000),
      balance: Math.round(d.cashBalance / 10000),
    }));

  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  return (
    <div className="card p-5">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        年間キャッシュフロー
      </h3>
      <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
        毎年の収入（線）と支出（棒：暮らし＋ローン＋イベント）の比較・単位は万円
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="age"
            tick={{ fill: axisColor, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
            minTickGap={24}
          />
          <YAxis
            width={44}
            tick={{ fill: axisColor, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v.toLocaleString('ja-JP')}`}
          />
          <Tooltip content={<CFTooltip />} cursor={{ fill: 'rgba(100,116,139,0.08)' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="暮らし" stackId="out" fill="#94a3b8" maxBarSize={26} />
          <Bar dataKey="ローン" stackId="out" fill="#6366f1" maxBarSize={26} />
          <Bar dataKey="イベント" stackId="out" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Line type="monotone" dataKey="収入" stroke="#10b981" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        収入の線が積み上げ棒より上にあれば、その年は黒字です。
      </p>
    </div>
  );
}
