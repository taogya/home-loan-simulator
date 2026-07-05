import { useRef, useState } from 'react';
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
import type { RateHistoryEvent } from '../../data/rateHistory';
import {
  RATE_HISTORY_KIND,
  builtinHistory,
  clearHistoryData,
  isValidHistory,
  loadHistoryData,
  normalizeHistory,
  saveHistoryData,
  type RateHistoryData,
} from '../../lib/rateHistoryStore';
import type { Theme } from '../../hooks/useTheme';

interface RateHistoryPanelProps {
  theme: Theme;
}

interface HistoryTooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; color: string; dataKey: string }[];
  label?: number;
  events?: RateHistoryEvent[];
}

const SERIES = [
  { key: 'variable', name: '変動金利型', color: '#6366f1' },
  { key: 'fixed3', name: '固定3年', color: '#10b981' },
  { key: 'fixed10', name: '固定10年', color: '#f59e0b' },
] as const;

/** データ範囲に合わせた5年おきの目盛りを作る。 */
function fiveYearTicks(points: { year: number }[]): number[] {
  if (points.length === 0) return [];
  const min = points[0].year;
  const max = points[points.length - 1].year;
  const start = Math.ceil(min / 5) * 5;
  const ticks: number[] = [];
  for (let y = start; y <= max; y += 5) ticks.push(y);
  return ticks;
}

function HistoryTooltip({ active, payload, label, events }: HistoryTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const year = label ?? 0;
  const yearEvents = (events ?? []).filter((e) => e.year === year);
  const isFuture = year >= new Date().getFullYear();
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="mb-1 font-bold text-slate-900 dark:text-white">
        {year}年（{isFuture ? '予測' : '店頭金利'}）
      </p>
      {payload
        .filter((p) => typeof p.value === 'number' && Number.isFinite(p.value))
        .map((p, i) => (
          <p key={i} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
            <span className="ml-auto font-semibold tabular-nums">{p.value.toFixed(3)}%</span>
          </p>
        ))}
      {yearEvents.length > 0 && (
        <div className="mt-1.5 space-y-1 border-t border-slate-100 pt-1.5 dark:border-slate-700">
          {yearEvents.map((e, i) => (
            <div key={i} className="text-amber-600 dark:text-amber-400">
              <p className="flex items-start gap-1.5">
                <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {e.month ? `${e.month}月：` : ''}
                {e.label}
              </p>
              {e.detail && (
                <p className="ml-3 text-[11px] text-slate-400 dark:text-slate-500">{e.detail}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RateHistoryPanel({ theme }: RateHistoryPanelProps) {
  const axisColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState(loadHistoryData);
  const { data, custom } = state;

  const points = data.points;
  const events = data.events;
  const maxRate = points.reduce(
    (m, p) => Math.max(m, p.variable ?? 0, p.fixed3 ?? 0, p.fixed10 ?? 0),
    0,
  );
  const yMax = Math.max(9, Math.ceil(maxRate));
  // 各系列の最後の有効値（null は飛ばす）を凡例に表示する
  const lastFinite = (key: 'variable' | 'fixed3' | 'fixed10'): number | null => {
    for (let i = points.length - 1; i >= 0; i--) {
      const v = points[i][key];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
    }
    return null;
  };

  // 現在年（借入時点）より先の期間を「予測」として薄く網かけする。
  // 履歴データ自体が将来（現在年より先）まで延びている場合のみ帯を表示する。
  const currentYear = new Date().getFullYear();
  const dataMaxYear = points.length > 0 ? points[points.length - 1].year : currentYear;
  const showFutureBand = dataMaxYear > currentYear;
  const chartData = points;
  const ticks = fiveYearTicks(chartData);

  const exportData = () => {
    const payload: RateHistoryData = {
      kind: RATE_HISTORY_KIND,
      version: 1,
      points,
      events,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rate-history.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (isValidHistory(parsed)) {
          const normalized = normalizeHistory(parsed);
          saveHistoryData(normalized);
          setState({ data: normalized, custom: true });
        } else {
          window.alert(
            'このファイルは金利推移データではないようです。points（year・variable・fixed3・fixed10）が必要です。',
          );
        }
      } catch {
        window.alert('ファイルを読み込めませんでした。JSON形式をご確認ください。');
      }
    };
    reader.readAsText(file);
  };

  const resetData = () => {
    clearHistoryData();
    setState({ data: builtinHistory(), custom: false });
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">住宅ローンの金利推移</h3>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={exportData}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              データを読み込み
            </button>
            <button
              type="button"
              onClick={resetData}
              disabled={!custom}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              初期状態に戻す
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importData(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
        {custom && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            読み込んだデータを表示中（「初期状態に戻す」で内蔵データへ）
          </div>
        )}
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          横軸：西暦／縦軸：店頭金利（%）。点線は主要な金融政策イベントの年です。
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="year"
              type="number"
              domain={['dataMin', 'dataMax']}
              allowDecimals={false}
              ticks={ticks}
              tick={{ fill: axisColor, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              tickFormatter={(v) => `${Math.round(v)}`}
            />
            <YAxis
              width={40}
              domain={[0, yMax]}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<HistoryTooltip events={events} />} />
            {showFutureBand && (
              <ReferenceArea
                x1={currentYear}
                x2={dataMaxYear}
                fill="#8b5cf6"
                fillOpacity={theme === 'dark' ? 0.14 : 0.08}
                label={{ value: '予測', position: 'insideTop', fill: '#8b5cf6', fontSize: 11, fontWeight: 600 }}
              />
            )}
            {events.map((e, i) => (
              <ReferenceLine
                key={i}
                x={e.year}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
            ))}
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {SERIES.map((s) => {
            const v = lastFinite(s.key);
            return (
              <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                {s.name}
                {v != null && (
                  <span className="tabular-nums text-slate-400 dark:text-slate-500">
                    {v.toFixed(3)}%
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          ※ここでの金利は「店頭金利（基準金利）」の近似値です。実際に借りる人が払う「適用金利（優遇後）」は、これより1〜2%程度低いのが一般的です。考え方の出典：住宅金融支援機構「民間金融機関の住宅ローン金利推移」。
          {showFutureBand && (
            <>
              {' '}
              網かけ（{currentYear}年以降）は将来の予測値です。実績ではなく想定である点にご注意ください。
            </>
          )}
        </p>
      </div>

      {/* イベント年表 */}
      <div className="card p-5">
        <h3 className="mb-3 text-base font-bold text-slate-900 dark:text-white">主な金融政策イベント</h3>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">イベントは登録されていません。</p>
        ) : (
          <ol className="space-y-2.5">
            {events.map((e, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-20 shrink-0 text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                  {e.year}
                  {e.month ? `.${String(e.month).padStart(2, '0')}` : ''}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm text-slate-700 dark:text-slate-200">{e.label}</span>
                  {e.detail && (
                    <span className="block text-xs text-slate-400 dark:text-slate-500">要因：{e.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
