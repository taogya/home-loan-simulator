import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PlanYear } from '../lib/plan';
import type { Theme } from '../hooks/useTheme';
import type { LifeEvent } from '../types';
import { groupEventsByAge, type EventMarker } from '../lib/events';
import { formatManLabel } from '../lib/format';

interface SavingsChartProps {
  data: PlanYear[];
  theme: Theme;
  events: LifeEvent[];
}

interface ChartRow {
  age: number;
  savings: number;
}

interface TooltipItem {
  payload: ChartRow;
}

interface SavingsTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
  markers?: EventMarker[];
}

function SavingsTooltip({ active, payload, markers }: SavingsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  const positive = row.savings >= 0;
  const marker = markers?.find((m) => m.atAge === row.age);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-medium text-slate-500 dark:text-slate-400">
        {row.age}歳時点
      </p>
      <p
        className={`font-bold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
      >
        貯金 {row.savings.toLocaleString('ja-JP')}万円
      </p>
      {marker && (
        <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5 dark:border-slate-700">
          {marker.items.map((it, i) => (
            <p
              key={i}
              className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              {it.label}
              <span className="ml-auto font-medium">
                {formatManLabel(it.amountMan)}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function SavingsChart({ data, theme, events }: SavingsChartProps) {
  const rows: ChartRow[] = data.map((d) => ({
    age: d.age,
    savings: Math.round(d.savings / 10000),
  }));

  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const hasNegative = rows.some((r) => r.savings < 0);
  const dataMax = Math.max(...rows.map((r) => r.savings), 0);
  const dataMin = Math.min(...rows.map((r) => r.savings), 0);
  const zeroOffset =
    dataMax - dataMin === 0 ? 1 : dataMax / (dataMax - dataMin);
  const startAge = data[0]?.age ?? 0;
  const endAge = data[data.length - 1]?.age ?? 0;
  const markers = groupEventsByAge(events, startAge, endAge);

  return (
    <div className="card p-5">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        貯金残高の推移
      </h3>
      <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
        毎年の収支を積み上げた貯金の見込み・単位は万円
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor="#10b981" stopOpacity={0.4} />
              <stop offset={zeroOffset} stopColor="#10b981" stopOpacity={0.05} />
              <stop offset={zeroOffset} stopColor="#f43f5e" stopOpacity={0.05} />
              <stop offset={1} stopColor="#f43f5e" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="savingsStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset={zeroOffset} stopColor="#10b981" />
              <stop offset={zeroOffset} stopColor="#f43f5e" />
            </linearGradient>
          </defs>
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
            tickFormatter={(v) => v.toLocaleString('ja-JP')}
          />
          <Tooltip content={<SavingsTooltip markers={markers} />} />
          <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="4 2" />
          {markers.map((m) => (
            <ReferenceLine
              key={m.atAge}
              x={m.atAge}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{
                value: m.label,
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#f59e0b',
              }}
            />
          ))}
          <Area
            type="monotone"
            dataKey="savings"
            stroke="url(#savingsStroke)"
            strokeWidth={2.5}
            fill="url(#savingsGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
      {hasNegative && (
        <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
          貯金がマイナスになる年があります。支出や返済プランの見直しを検討しましょう。
        </p>
      )}
    </div>
  );
}
