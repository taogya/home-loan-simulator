import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { simulatePlan } from '../lib/plan';
import { formatYen, formatJpyCompact } from '../lib/format';
import type { Plan } from '../types';
import type { Theme } from '../hooks/useTheme';
import { PLAN_COLORS } from '../lib/planColors';

interface ComparePanelProps {
  plans: Plan[];
  theme: Theme;
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="py-2 pr-3 text-left text-slate-500 dark:text-slate-400">
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className="py-2 pl-3 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100"
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

export function ComparePanel({ plans, theme }: ComparePanelProps) {
  const results = plans.map((p) => ({ plan: p, result: simulatePlan(p.form) }));

  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  const ageSet = new Set<number>();
  results.forEach((r) => r.result.schedule.forEach((y) => ageSet.add(y.age)));
  const ages = [...ageSet].sort((a, b) => a - b);
  const buildChartData = (key: 'loanBalance' | 'savings') =>
    ages.map((age) => {
      const row: Record<string, number> = { age };
      results.forEach((r, i) => {
        const point = r.result.schedule.find((y) => y.age === age);
        row[`p${i}`] = point ? Math.round(point[key] / 10000) : 0;
      });
      return row;
    });
  const chartData = buildChartData('loanBalance');
  const savingsChartData = buildChartData('savings');

  return (
    <div className="space-y-6">
      <div className="card overflow-x-auto p-5">
        <h3 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
          プラン比較
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="py-2 pr-3 text-left font-medium text-slate-400">
                指標
              </th>
              {results.map((r, i) => (
                <th
                  key={r.plan.id}
                  className="py-2 pl-3 text-right font-semibold"
                  style={{ color: PLAN_COLORS[i % PLAN_COLORS.length] }}
                >
                  {r.plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <CompareRow
              label="完済年齢"
              values={results.map((r) =>
                r.result.housingType === 'rent'
                  ? '賃貸'
                  : `${r.result.payoffAge}歳`,
              )}
            />
            <CompareRow
              label="毎月の支払い"
              values={results.map(
                (r) =>
                  `${formatYen(r.result.housingType === 'rent' ? r.result.monthlyRent : r.result.monthlyPayment)}円`,
              )}
            />
            <CompareRow
              label="総利息"
              values={results.map((r) =>
                r.result.housingType === 'rent'
                  ? '—'
                  : formatJpyCompact(r.result.totalInterest),
              )}
            />
            <CompareRow
              label="総返済"
              values={results.map((r) =>
                r.result.housingType === 'rent'
                  ? '—'
                  : formatJpyCompact(r.result.totalPayment),
              )}
            />
            <CompareRow
              label="住居費の負担率"
              values={results.map((r) => `${r.result.repaymentBurdenPct.toFixed(0)}%`)}
            />
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          残高の比較
        </h3>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          横軸：年齢（歳）／縦軸：残高（万円）
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            <Tooltip />
            {results.map((r, i) => (
              <Line
                key={r.plan.id}
                type="monotone"
                dataKey={`p${i}`}
                name={r.plan.name}
                stroke={PLAN_COLORS[i % PLAN_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          貯金の比較
        </h3>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          横軸：年齢（歳）／縦軸：貯金（万円）・0を下回ると赤字
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={savingsChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <ReferenceArea
              y1={-1000000}
              y2={0}
              fill="#f43f5e"
              fillOpacity={0.06}
              ifOverflow="hidden"
            />
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
            <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="4 2" />
            <Tooltip />
            {results.map((r, i) => (
              <Line
                key={r.plan.id}
                type="monotone"
                dataKey={`p${i}`}
                name={r.plan.name}
                stroke={PLAN_COLORS[i % PLAN_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
