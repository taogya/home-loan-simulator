import { formatJpyCompact, formatFlexibleYen } from '../lib/format';
import type { PlanResult } from '../lib/plan';

interface StatHighlightProps {
  result: PlanResult;
}

const toneClasses: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
  slate: 'text-slate-500 dark:text-slate-400',
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
  // 開始時点の収入が無い（0円）と負担率は算出不能。0% を「ゆとりあり」と誤表示しないよう別扱いにする。
  const noIncome = !isRent && result.startAnnualIncome === 0;
  const tone = noIncome
    ? { label: '収入が未設定です', color: 'slate' }
    : burdenTone(result.repaymentBurdenPct);

  return (
    <div className="space-y-3">
      {/* 主役カード */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-4 text-white">
          {isRent ? (
            <>
              <p className="text-xs opacity-80">毎月の家賃</p>
              <div className="mt-0.5 flex flex-wrap items-end gap-1.5 leading-none">
                <span className="text-2xl sm:text-4xl font-extrabold tabular-nums break-words max-w-full">
                  {formatFlexibleYen(result.monthlyRent)}
                </span>
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
        <div className="card p-3 min-w-0 overflow-hidden">
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {isRent ? '更新料' : `毎月の返済${!isRent && result.maxMonthlyPayment > result.monthlyPayment ? '（当初）' : ''}`}
          </p>
          <p className="mt-0.5 text-lg sm:text-xl font-bold tabular-nums text-slate-900 dark:text-white truncate" title={formatFlexibleYen(isRent ? result.renewalFee : result.monthlyPayment)}>
            {formatFlexibleYen(isRent ? result.renewalFee : result.monthlyPayment)}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 truncate" title={!isRent && result.maxMonthlyPayment > result.monthlyPayment ? `📈 金利上昇時最大: ${formatFlexibleYen(result.maxMonthlyPayment)}` : ''}>
            {isRent
              ? `${result.renewalIntervalYears}年ごと`
              : !isRent && result.maxMonthlyPayment > result.monthlyPayment
                ? `📈 上昇時最大: ${formatFlexibleYen(result.maxMonthlyPayment)}`
                : result.bonusPayment > 0
                  ? `＋ボーナス時 ${formatFlexibleYen(result.bonusPayment)}`
                  : 'ボーナス払いなし'}
          </p>
        </div>

        <div className="card p-3 min-w-0 overflow-hidden">
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {isRent ? '年間の家賃' : '総利息'}
          </p>
          <p className="mt-0.5 text-lg sm:text-xl font-bold tabular-nums text-slate-900 dark:text-white truncate">
            {formatJpyCompact(
              isRent ? result.annualRepayment : result.totalInterest,
            )}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 truncate" title={`総返済 ${formatJpyCompact(result.totalPayment)}`}>
            {isRent
              ? '更新料は別途'
              : `総返済 ${formatJpyCompact(result.totalPayment)}`}
          </p>
        </div>

        <div className="card p-3 min-w-0 overflow-hidden">
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {isRent ? '家賃負担率' : `返済負担率${!isRent && result.maxMonthlyPayment > result.monthlyPayment ? '（当初）' : ''}`}
          </p>
          <p
            className={`mt-0.5 text-lg sm:text-xl font-bold tabular-nums truncate ${toneClasses[tone.color]}`}
          >
            {noIncome ? (
              <span className="text-slate-400 dark:text-slate-500">—</span>
            ) : (
              <>
                {result.repaymentBurdenPct.toFixed(0)}
                <span className="ml-0.5 text-sm font-medium">%</span>
              </>
            )}
          </p>
          <p className={`mt-1 text-xs font-medium truncate ${toneClasses[tone.color]}`}>
            {isRent
              ? tone.label
              : !isRent && result.maxMonthlyPayment > result.monthlyPayment
                ? (() => {
                    const netAnnualNow = result.repaymentBurdenPct > 0 
                      ? result.annualRepayment / (result.repaymentBurdenPct / 100) 
                      : 0;
                    const maxAnnualRepayment = result.maxMonthlyPayment * 12 + result.bonusPayment * 2;
                    const maxBurdenPct = netAnnualNow > 0 ? (maxAnnualRepayment / netAnnualNow) * 100 : result.repaymentBurdenPct;
                    return `📈 上昇時最大: ${maxBurdenPct.toFixed(0)}%`;
                  })()
                : tone.label}
          </p>
        </div>
      </div>
    </div>
  );
}
