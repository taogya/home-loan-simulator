import { formatYen, formatJpyCompact } from '../lib/format';
import type { PlanResult } from '../lib/plan';

interface StatHighlightProps {
  result: PlanResult;
}

const toneClasses: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
};

function burdenTone(pct: number): { label: string; color: string } {
  if (pct < 25) return { label: 'ゆとりあり', color: 'emerald' };
  if (pct < 35) return { label: '標準的', color: 'amber' };
  return { label: '要注意', color: 'rose' };
}

export function StatHighlight({ result }: StatHighlightProps) {
  const isRent = result.housingType === 'rent';
  const years = result.payoffYears;
  const payoffYear = new Date().getFullYear() + years;
  const tone = burdenTone(result.repaymentBurdenPct);

  return (
    <div className="space-y-3">
      {/* 主役カード */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-4 text-white">
          {isRent ? (
            <>
              <p className="text-xs opacity-80">毎月の家賃</p>
              <div className="mt-0.5 flex items-end gap-2">
                <span className="text-4xl font-extrabold leading-none tabular-nums">
                  {formatYen(result.monthlyRent)}
                </span>
                <span className="mb-0.5 text-xl font-bold">円</span>
              </div>
              <p className="mt-1.5 text-xs opacity-80">
                賃貸プラン・{result.renewalIntervalYears}年ごとに更新料
              </p>
            </>
          ) : (
            <>
              <p className="text-xs opacity-80">完済予定</p>
              <div className="mt-0.5 flex items-end gap-2">
                <span className="text-5xl font-extrabold leading-none tabular-nums">
                  {result.payoffAge}
                </span>
                <span className="mb-0.5 text-xl font-bold">歳</span>
              </div>
              <p className="mt-1.5 text-xs opacity-80">
                あと {years} 年・{payoffYear} 年ごろに完済
              </p>
            </>
          )}
        </div>
      </div>

      {/* サブ指標 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-3">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {isRent ? '更新料' : '毎月の返済'}
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
            {formatYen(isRent ? result.renewalFee : result.monthlyPayment)}
            <span className="ml-0.5 text-sm font-medium">円</span>
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {isRent
              ? `${result.renewalIntervalYears}年ごと`
              : result.bonusPayment > 0
                ? `＋ボーナス時 ${formatYen(result.bonusPayment)}円`
                : 'ボーナス払いなし'}
          </p>
        </div>

        <div className="card p-3">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {isRent ? '年間の家賃' : '総利息'}
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900 dark:text-white">
            {formatJpyCompact(
              isRent ? result.annualRepayment : result.totalInterest,
            )}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {isRent
              ? '更新料は別途'
              : `総返済 ${formatJpyCompact(result.totalPayment)}`}
          </p>
        </div>

        <div className="card p-3">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {isRent ? '家賃負担率' : '返済負担率'}
          </p>
          <p
            className={`mt-0.5 text-xl font-bold tabular-nums ${toneClasses[tone.color]}`}
          >
            {result.repaymentBurdenPct.toFixed(0)}
            <span className="ml-0.5 text-sm font-medium">%</span>
          </p>
          <p className={`mt-1 text-xs font-medium ${toneClasses[tone.color]}`}>
            {tone.label}
          </p>
        </div>
      </div>
    </div>
  );
}
