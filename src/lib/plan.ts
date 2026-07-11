// ローン・家計・貯金・繰上げ返済を一体で計算する統合シミュレーション。
// 繰上げはローン残高と貯金が相互に影響するため、年次の一つのループで処理する。
// すべての金額は「円」単位で扱う。

import type { FormState, ExpenseItem, IncomeItem, CommonSettings } from '../types';
import type { RateSimState } from './rateStorage';
import type { RateProductDef, RateScenario } from './rate';
import { eventOccursAt } from './events';

/** 共通設定をプランの form に合成した form を返す（共通→専用の順で結合）。 */
export function mergeCommonForm(
  form: FormState,
  common: CommonSettings,
): FormState {
  return {
    ...form,
    incomes: [...common.incomes, ...form.incomes],
    expenses: [...common.expenses, ...form.expenses],
    events: [...common.events, ...form.events],
  };
}

export interface PlanYear {
  /** 経過年（0 = 借入時点） */
  year: number;
  /** その年末時点の年齢 */
  age: number;
  /** 年末のローン残高（円） */
  loanBalance: number;
  /** その年の元金返済（通常返済分, 円） */
  principalPaid: number;
  /** その年の利息（円） */
  interestPaid: number;
  /** その年の繰上げ返済額（円） */
  prepayment: number;
  /** 年間の収入合計（円） */
  income: number;
  /** 年間の暮らしの支出（円・ローンや繰上げは含まない） */
  expense: number;
  /** 年間の通常ローン返済（円・繰上げは含まない） */
  loanRepayment: number;
  /** 年間収支 = 収入 − 暮らし − ローン返済（繰上げ前, 円） */
  cashBalance: number;
  /** その年末の貯金残高（繰上げ後, 円） */
  savings: number;
  /** その年の一時イベント支出（円） */
  eventExpense: number;
}

export interface PlanResult {
  /** 住居タイプ（own=持ち家 / rent=賃貸） */
  housingType: 'own' | 'rent';
  /** 賃貸の毎月の家賃（円。持ち家は0） */
  monthlyRent: number;
  /** 賃貸の更新料（円。持ち家は0） */
  renewalFee: number;
  /** 賃貸の更新間隔（年） */
  renewalIntervalYears: number;
  /** 毎月の返済額（円） */
  monthlyPayment: number;
  /** ボーナス1回の返済額（円） */
  bonusPayment: number;
  /** 年間の通常返済額（月々×12＋ボーナス×2, 円） */
  annualRepayment: number;
  /** 総利息（円） */
  totalInterest: number;
  /** 総返済額（元金＋利息, 円） */
  totalPayment: number;
  /** 完済時の年齢（歳） */
  payoffAge: number;
  /** 完済までの年数（繰上げで短縮されうる） */
  payoffYears: number;
  /** 返済負担率（年間返済額 / 年収, %） */
  repaymentBurdenPct: number;
  /** 開始時点（現在）の手取り年収（円）。0 のとき返済負担率は算出できない（収入未設定） */
  startAnnualIncome: number;
  /** 将来の最大月返済額（金利上昇時、固定金利などの場合は monthlyPayment と同じ） */
  maxMonthlyPayment: number;
  /** ライフプラン中の貯金残高の最大（円） */
  maxSavings: number;
  /** 年ごとの推移（year=0 を含む） */
  schedule: PlanYear[];
}

/** 元利均等の1期あたり返済額。 */
function annuity(
  principal: number,
  ratePerPeriod: number,
  nPeriods: number,
): number {
  if (nPeriods <= 0 || principal <= 0) return 0;
  if (ratePerPeriod === 0) return principal / nPeriods;
  const f = Math.pow(1 + ratePerPeriod, nPeriods);
  return (principal * ratePerPeriod * f) / (f - 1);
}

/** 毎期返済額から元本（現在価値）を求める。 */
function presentValue(
  payment: number,
  ratePerPeriod: number,
  nPeriods: number,
): number {
  if (nPeriods <= 0 || payment <= 0) return 0;
  if (ratePerPeriod === 0) return payment * nPeriods;
  return (payment * (1 - Math.pow(1 + ratePerPeriod, -nPeriods))) / ratePerPeriod;
}

/**
 * 給与所得控除（額面・円）。2020年以降の区分。
 */
function salaryDeduction(grossYen: number): number {
  if (grossYen <= 1_625_000) return 550_000;
  if (grossYen <= 1_800_000) return grossYen * 0.4 - 100_000;
  if (grossYen <= 3_600_000) return grossYen * 0.3 + 80_000;
  if (grossYen <= 6_600_000) return grossYen * 0.2 + 440_000;
  if (grossYen <= 8_500_000) return grossYen * 0.1 + 1_100_000;
  return 1_950_000;
}

/**
 * 所得税（課税所得・円、累進速算表。復興特別所得税は簡易のため省略）。
 */
function incomeTax(taxableYen: number): number {
  if (taxableYen <= 0) return 0;
  if (taxableYen <= 1_950_000) return taxableYen * 0.05;
  if (taxableYen <= 3_300_000) return taxableYen * 0.1 - 97_500;
  if (taxableYen <= 6_950_000) return taxableYen * 0.2 - 427_500;
  if (taxableYen <= 9_000_000) return taxableYen * 0.23 - 636_000;
  if (taxableYen <= 18_000_000) return taxableYen * 0.33 - 1_536_000;
  if (taxableYen <= 40_000_000) return taxableYen * 0.4 - 2_796_000;
  return taxableYen * 0.45 - 4_796_000;
}

/**
 * 額面年収（円）から手取り年収（円）を概算する。
 * 社会保険料・給与所得控除・基礎控除・所得税・住民税を簡易計算（目安）。
 * 配偶者控除・扶養控除・各種控除は考慮しない。
 */
function estimateTakeHome(grossAnnualYen: number): number {
  if (grossAnnualYen <= 0) return 0;
  // 社会保険料（健康保険・厚生年金・雇用保険）の概算。
  // 厚生年金等の上限を考慮し、約780万を超える分は率を下げる。
  const socialBase = Math.min(grossAnnualYen, 7_800_000);
  const social =
    socialBase * 0.15 + Math.max(0, grossAnnualYen - 7_800_000) * 0.05;
  const salaryDed = salaryDeduction(grossAnnualYen);
  const basicDed = 480_000;
  const taxable = Math.max(0, grossAnnualYen - salaryDed - social - basicDed);
  const tax = incomeTax(taxable);
  const residentTax = taxable * 0.1 + 5_000;
  const net = grossAnnualYen - social - tax - residentTax;
  return Math.max(0, net);
}

/** その支出が指定の経過年で有効か（「○年後から○年間」を考慮。durationなし=ずっと） */
function expenseActiveAt(e: ExpenseItem, elapsedYears: number): boolean {
  const start = e.startAfterYears ?? 0;
  const dur = e.durationYears ?? 0;
  if (elapsedYears < start) return false;
  if (dur > 0 && elapsedYears >= start + dur) return false;
  return true;
}

/** その収入が指定年齢で受け取れるか（単発=startAge のみ。endAge は含む） */
function incomeActiveAt(inc: IncomeItem, age: number): boolean {
  if (age < inc.startAge) return false;
  if (inc.oneTime) return age === inc.startAge;
  if (inc.endAge != null && inc.endAge > 0 && age > inc.endAge) return false;
  return true;
}

/** その収入の指定年齢での年額（円・昇給とボーナスを反映） */
function incomeAnnualYen(inc: IncomeItem, age: number): number {
  const isSalary = inc.kind === 'salary';
  const months =
    inc.basis === 'monthly' ? 12 + (isSalary ? inc.bonusMonths ?? 0 : 0) : 1;
  let annual = inc.amountMan * 10000 * months;
  if (isSalary && inc.raiseRatePct) {
    const stop = inc.raiseStopAge ?? age;
    const grown = Math.max(0, Math.min(age - inc.startAge, stop - inc.startAge));
    annual *= Math.pow(1 + inc.raiseRatePct / 100, grown);
  }
  return annual;
}

/**
 * 指定年齢の年間手取り収入（円）。
 * 本人・配偶者の額面給与（isGross）はそれぞれ合算して estimateTakeHome で手取り換算し、
 * 手取り項目（年金・退職金・その他）はそのまま加算する（個人単位の概算）。
 * includeOneTime=false で単発（退職金など）を除外する。
 */
function annualIncomeAt(
  incomes: IncomeItem[] | undefined,
  age: number,
  includeOneTime = true,
): number {
  let grossSelf = 0;
  let grossSpouse = 0;
  let net = 0;
  for (const inc of incomes ?? []) {
    if (!incomeActiveAt(inc, age)) continue;
    if (inc.oneTime && !includeOneTime) continue;
    const annual = incomeAnnualYen(inc, age);
    if (inc.isGross && inc.owner === 'self') grossSelf += annual;
    else if (inc.isGross && inc.owner === 'spouse') grossSpouse += annual;
    else net += annual;
  }
  return estimateTakeHome(grossSelf) + estimateTakeHome(grossSpouse) + net;
}

export function simulatePlan(form: FormState, rateState?: RateSimState): PlanResult {
  const isRent = form.housingType === 'rent';
  const principal = isRent ? 0 : form.loanAmountMan * 10000;
  const startAge = form.age;
  const years = form.years;
  const simYears = Math.max(years, 100 - startAge);

  const interestType = form.interestType ?? 'fixed';
  const scenario = rateState?.scenario;
  const reviewMonths = scenario?.reviewMonths ?? 6;
  const paymentFixedYears = scenario?.rules?.paymentFixedYears ?? 5;
  const paymentCapRatio = scenario?.rules?.paymentCapRatio ?? 1.25;

  // 1経過月ごとの金利（年利、%）を決定するヘルパー
  const getRatePctAt = (elapsedMonths: number): number => {
    if (isRent) return 0;
    if (interestType === 'fixed') {
      return form.ratePct;
    }
    if (interestType === 'variable') {
      if (!scenario) return form.ratePct;
      return scenarioRateAt(scenario, elapsedMonths);
    }
    if (interestType === 'product' && rateState) {
      const p = rateState.products.find((x: RateProductDef) => x.id === form.selectedProductId);
      if (!p) return form.ratePct;
      if (p.kind === 'wholeFixed') {
        return p.initialRatePct;
      }
      if (p.kind === 'variable') {
        if (!scenario) return p.initialRatePct;
        return scenarioRateAt(scenario, elapsedMonths);
      }
      if (p.kind === 'fixedPeriod') {
        const fixedMonths = (p.fixedYears ?? 0) * 12;
        if (elapsedMonths < fixedMonths) {
          return p.initialRatePct;
        } else {
          if (!scenario) return p.afterRatePct ?? 1.0;
          // 固定期間終了後: afterRatePct + 当初からの金利変動分
          const scenarioDelta = scenarioRateAt(scenario, elapsedMonths) - scenarioRateAt(scenario, 0);
          return (p.afterRatePct ?? 1.0) + scenarioDelta;
        }
      }
    }
    return form.ratePct;
  };

  function scenarioRateAt(sc: RateScenario, month: number): number {
    const points = sc.points;
    if (!points || points.length === 0) return 0.5;
    let rate = points[0]?.ratePct ?? 0;
    for (const p of points) {
      if (p.fromMonth <= month) rate = p.ratePct;
      else break;
    }
    return rate;
  }

  // 初期金利
  const initialRate = getRatePctAt(0);
  const rM = initialRate / 100 / 12;
  const rB = initialRate / 100 / 2;

  // ボーナス払い：1回の固定返済額から、ボーナスで返す元金（現在価値）を求める
  const bonus = isRent ? 0 : Math.max(0, form.bonusRepayMan * 10000);
  const bonusPrincipal = Math.min(presentValue(bonus, rB, years * 2), principal);
  const monthlyPrincipal = principal - bonusPrincipal;
  const monthly = isRent ? 0 : annuity(monthlyPrincipal, rM, years * 12);

  let balM = monthlyPrincipal;
  let balB = bonusPrincipal;
  let savings = form.initialSavingsMan * 10000;
  let pot = 0;
  let totalInterest = 0;
  let payoffYears = isRent ? 0 : years;
  let payoffFound = isRent;

  // 変動金利見直し制御
  let currentMonthlyPayment = monthly;
  let currentBonusPayment = bonus;
  let unpaidInterestM = 0;
  let unpaidInterestB = 0;
  let peakMonthlyPayment = monthly;

  const schedule: PlanYear[] = [
    {
      year: 0,
      age: startAge,
      loanBalance: principal,
      principalPaid: 0,
      interestPaid: 0,
      prepayment: 0,
      income: 0,
      expense: 0,
      loanRepayment: 0,
      cashBalance: 0,
      savings,
      eventExpense: 0,
    },
  ];

  for (let y = 1; y <= simYears; y++) {
    const age = startAge + y;
    let yearPrincipal = 0;
    let yearInterest = 0;
    let yearRepayment = 0;

    for (let m = 0; m < 12; m++) {
      const elapsedMonths = (y - 1) * 12 + m;
      const currentRate = isRent ? 0 : getRatePctAt(elapsedMonths);
      const rM_current = currentRate / 100 / 12;
      const rB_current = currentRate / 100 / 2;

      // 見直し
      if (!isRent && interestType !== 'fixed' && elapsedMonths > 0) {
        if (paymentFixedYears > 0) {
          // 5年ごと（60ヶ月ごと）
          if (elapsedMonths % (paymentFixedYears * 12) === 0) {
            const remainingMonths = (years * 12) - elapsedMonths;
            if (remainingMonths > 0) {
              if (balM > 0) {
                const rawNewMonthly = annuity(balM + unpaidInterestM, rM_current, remainingMonths);
                const capRatio = paymentCapRatio > 0 ? paymentCapRatio : 1.25;
                currentMonthlyPayment = Math.min(rawNewMonthly, currentMonthlyPayment * capRatio);
              }
            }
          }
          // ボーナス（5年＝10回)
          if (elapsedMonths % (paymentFixedYears * 12) === 0) {
            const remainingBonuses = (years * 2) - Math.round(elapsedMonths / 6);
            if (remainingBonuses > 0 && balB > 0) {
              const rawNewBonus = annuity(balB + unpaidInterestB, rB_current, remainingBonuses);
              const capRatio = paymentCapRatio > 0 ? paymentCapRatio : 1.25;
              currentBonusPayment = Math.min(rawNewBonus, currentBonusPayment * capRatio);
            }
          }
        } else {
          // 変動で5年ルール無効時は reviewMonths ごとにリセット
          if (elapsedMonths % reviewMonths === 0) {
            const remainingMonths = (years * 12) - elapsedMonths;
            if (remainingMonths > 0) {
              if (balM > 0) {
                const rawNewMonthly = annuity(balM + unpaidInterestM, rM_current, remainingMonths);
                currentMonthlyPayment = rawNewMonthly;
              }
            }
          }
          if (elapsedMonths % reviewMonths === 0) {
            const remainingBonuses = (years * 2) - Math.round(elapsedMonths / 6);
            if (remainingBonuses > 0 && balB > 0) {
              const rawNewBonus = annuity(balB + unpaidInterestB, rB_current, remainingBonuses);
              currentBonusPayment = rawNewBonus;
            }
          }
        }
      }

      // 月々返済
      if (balM > 0) {
        if (currentMonthlyPayment > peakMonthlyPayment) {
          peakMonthlyPayment = currentMonthlyPayment;
        }
        const interest = balM * rM_current;
        let principalPart = currentMonthlyPayment - interest;
        if (principalPart < 0) {
          unpaidInterestM += -principalPart;
          principalPart = 0;
        } else {
          const toUnpaid = Math.min(principalPart, unpaidInterestM);
          unpaidInterestM -= toUnpaid;
          principalPart -= toUnpaid;
        }
        if (principalPart > balM) principalPart = balM;
        balM -= principalPart;
        if (balM < 0.5) balM = 0;
        yearPrincipal += principalPart;
        yearInterest += interest;
        yearRepayment += principalPart + interest;
      }

      // ボーナス返済（6月・12月相当）
      if ((m === 5 || m === 11) && balB > 0) {
        const interest = balB * rB_current;
        let principalPart = currentBonusPayment - interest;
        if (principalPart < 0) {
          unpaidInterestB += -principalPart;
          principalPart = 0;
        } else {
          const toUnpaid = Math.min(principalPart, unpaidInterestB);
          unpaidInterestB -= toUnpaid;
          principalPart -= toUnpaid;
        }
        if (principalPart > balB) principalPart = balB;
        balB -= principalPart;
        if (balB < 0.5) balB = 0;
        yearPrincipal += principalPart;
        yearInterest += interest;
        yearRepayment += principalPart + interest;
      }
    }
    totalInterest += yearInterest;

    // 家計：収入は incomes から年齢ごとに算出。
    const income = annualIncomeAt(form.incomes, age);
    const rentAnnual = isRent ? form.rentMan * 12 * 10000 : 0;
    const renewalFee =
      isRent &&
      form.renewalIntervalYears > 0 &&
      y % form.renewalIntervalYears === 0
        ? form.renewalFeeMan * 10000
        : 0;
    const annualExpense =
      form.expenses
        .filter((e) => expenseActiveAt(e, age - startAge))
        .reduce((sum, e) => sum + e.amountMan, 0) *
        12 *
        10000 +
      rentAnnual;
    const eventExpense =
      form.events
        .filter((e) => eventOccursAt(e, age))
        .reduce((sum, e) => sum + e.amountMan * 10000, 0) + renewalFee;
    const cashBalance = income - annualExpense - yearRepayment - eventExpense;
    savings += Number.isFinite(cashBalance) ? cashBalance : 0;

    // 繰上げ返済（積立方式・期間短縮型）：毎年積み立て、しきい値に達したら実行
    let prepayment = 0;
    const totalBalance = balM + balB;
    if (form.prepayMode === 'saveup' && totalBalance > 0) {
      const saveup = form.prepaySaveupPerYearMan * 10000;
      if (saveup > 0 && savings >= saveup) {
        pot += saveup;
        savings -= saveup;
      }
      if (pot >= form.prepayTriggerMan * 10000 && pot > 0) {
        const actual = Math.min(pot, totalBalance + unpaidInterestM + unpaidInterestB);
        let remaining = actual;
        // まず未払い利息に充当
        const toUnpaidM = Math.min(remaining, unpaidInterestM);
        unpaidInterestM -= toUnpaidM;
        remaining -= toUnpaidM;
        const toUnpaidB = Math.min(remaining, unpaidInterestB);
        unpaidInterestB -= toUnpaidB;
        remaining -= toUnpaidB;

        // 残りを元本に充当
        if (remaining > 0) {
          const fromM = Math.min(remaining, balM);
          balM -= fromM;
          remaining -= fromM;
          if (remaining > 0) {
            const fromB = Math.min(remaining, balB);
            balB -= fromB;
          }
        }
        if (balM < 0.5) balM = 0;
        if (balB < 0.5) balB = 0;
        prepayment = actual;
        pot -= actual;
      }
    }

    const loanBalance = Math.max(balM + balB + unpaidInterestM + unpaidInterestB, 0);
    if (!payoffFound && loanBalance <= 0) {
      payoffYears = y;
      payoffFound = true;
    }

    schedule.push({
      year: y,
      age,
      loanBalance,
      principalPaid: yearPrincipal,
      interestPaid: yearInterest,
      prepayment,
      income,
      expense: annualExpense,
      loanRepayment: yearRepayment,
      cashBalance,
      savings,
      eventExpense,
    });
  }

  const annualRepayment = isRent
    ? form.rentMan * 12 * 10000
    : monthly * 12 + bonus * 2;
  const totalPayment = principal + totalInterest;
  const payoffAge = isRent ? 0 : startAge + payoffYears;
  // 返済負担率の分母：開始時点（現在）の手取り年収（単発の退職金などは除外）
  const netAnnualNow = annualIncomeAt(form.incomes, startAge, false);
  const repaymentBurdenPct =
    netAnnualNow > 0 ? (annualRepayment / netAnnualNow) * 100 : 0;

  return {
    housingType: form.housingType,
    monthlyRent: isRent ? form.rentMan * 10000 : 0,
    renewalFee: isRent ? form.renewalFeeMan * 10000 : 0,
    renewalIntervalYears: form.renewalIntervalYears,
    monthlyPayment: monthly,
    bonusPayment: bonus,
    annualRepayment,
    totalInterest,
    totalPayment,
    payoffAge,
    payoffYears,
    repaymentBurdenPct,
    startAnnualIncome: netAnnualNow,
    maxSavings: Math.max(...schedule.map((s) => s.savings), 0),
    maxMonthlyPayment: isRent ? form.rentMan * 10000 : peakMonthlyPayment,
    schedule,
  };
}
