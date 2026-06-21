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

interface BalanceChartProps {
  schedule: PlanYear[];
  theme: Theme;
  events: LifeEvent[];
}

interface TooltipPayloadItem {
  value: number;
  payload: { age: number };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  markers?: EventMarker[];
}

function ChartTooltip({ active, payload, markers }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const marker = markers?.find((m) => m.atAge === item.payload.age);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="font-medium text-slate-500 dark:text-slate-400">
        {item.payload.age}歳時点
      </p>
      <p className="font-bold text-slate-900 dark:text-white">
        残高 {item.value.toLocaleString('ja-JP')}万円
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

function formatYAxis(value: number): string {
  if (value >= 10000) {
    const oku = value / 10000;
    return `${Number.isInteger(oku) ? oku : oku.toFixed(1)}億`;
  }
  return value.toLocaleString('ja-JP');
}

export function BalanceChart({ schedule, theme, events }: BalanceChartProps) {
  const data = schedule.map((s) => ({
    age: s.age,
    balance: Math.round(s.loanBalance / 10000),
  }));

  const startAge = schedule[0]?.age ?? 0;
  const endAge = schedule[schedule.length - 1]?.age ?? 0;
  const markers = groupEventsByAge(events, startAge, endAge);

  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  return (
    <div className="card p-5">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        ローン残高の推移
      </h3>
      <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
        横軸：年齢（歳）／縦軸：残高（万円）
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="age"
            tick={{ fill: axisColor, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
            minTickGap={24}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            width={44}
            tick={{ fill: axisColor, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
          />
          <Tooltip content={<ChartTooltip markers={markers} />} />
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
            dataKey="balance"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="url(#balanceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
