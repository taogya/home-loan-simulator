// ローン・家計・貯金・繰上げ返済を一体で計算する統合シミュレーション。
// 繰上げはローン残高と貯金が相互に影響するため、年次の一つのループで処理する。
// すべての金額は「円」単位で扱う。

import type { FormState, ExpenseItem } from '../types';
import { eventOccursAt } from './events';

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

export function simulatePlan(form: FormState): PlanResult {
  const principal = form.loanAmountMan * 10000;
  const startAge = form.age;
  const years = form.years;
  const rM = form.ratePct / 100 / 12;
  const rB = form.ratePct / 100 / 2;

  // ボーナス払い：1回の固定返済額から、ボーナスで返す元金（現在価値）を求める
  const bonus = Math.max(0, form.bonusRepayMan * 10000);
  const bonusPrincipal = Math.min(presentValue(bonus, rB, years * 2), principal);
  const monthlyPrincipal = principal - bonusPrincipal;
  const monthly = annuity(monthlyPrincipal, rM, years * 12);

  let balM = monthlyPrincipal;
  let balB = bonusPrincipal;
  let savings = form.initialSavingsMan * 10000;
  let pot = 0;
  let totalInterest = 0;
  let payoffYears = years;
  let payoffFound = false;

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

  for (let y = 1; y <= years; y++) {
    const age = startAge + y;
    let yearPrincipal = 0;
    let yearInterest = 0;
    let yearRepayment = 0;

    for (let m = 0; m < 12; m++) {
      // 月々返済分
      if (balM > 0) {
        const interest = balM * rM;
        let principalPart = monthly - interest;
        if (principalPart > balM) principalPart = balM;
        balM -= principalPart;
        if (balM < 0.5) balM = 0;
        yearPrincipal += principalPart;
        yearInterest += interest;
        yearRepayment += principalPart + interest;
      }
      // ボーナス返済分（6月・12月相当）
      if ((m === 5 || m === 11) && balB > 0) {
        const interest = balB * rB;
        let principalPart = bonus - interest;
        if (principalPart > balB) principalPart = balB;
        balB -= principalPart;
        if (balB < 0.5) balB = 0;
        yearPrincipal += principalPart;
        yearInterest += interest;
        yearRepayment += principalPart + interest;
      }
    }
    totalInterest += yearInterest;

    // 家計：本人収入は定年までは給与（昇給・ボーナス込み・手取り換算）、
    // 年金開始以降は年金（手取り月額×12）、その間（定年〜受給開始）は無収入。
    let personalIncome = 0;
    if (age < form.retireAge) {
      const grownYears = Math.max(
        0,
        Math.min(y - 1, form.raiseStopAge - startAge),
      );
      const grossAnnual =
        form.monthlySalaryMan *
        10000 *
        (12 + form.bonusMonths) *
        Math.pow(1 + form.raiseRatePct / 100, grownYears);
      personalIncome = estimateTakeHome(grossAnnual);
    } else if (age >= form.pensionStartAge) {
      personalIncome = form.pensionMonthlyMan * 10000 * 12;
    }
    const income =
      personalIncome +
      form.spouseIncomeMan * 10000 +
      form.sideIncomeMan * 10000;
    const annualExpense =
      form.expenses
        .filter((e) => expenseActiveAt(e, age - startAge))
        .reduce((sum, e) => sum + e.amountMan, 0) *
      12 *
      10000;
    const eventExpense = form.events
      .filter((e) => eventOccursAt(e, age))
      .reduce((sum, e) => sum + e.amountMan * 10000, 0);
    const cashBalance = income - annualExpense - yearRepayment - eventExpense;
    savings += cashBalance;

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
        const actual = Math.min(pot, totalBalance);
        let remaining = actual;
        const fromM = Math.min(remaining, balM);
        balM -= fromM;
        remaining -= fromM;
        if (remaining > 0) {
          const fromB = Math.min(remaining, balB);
          balB -= fromB;
          remaining -= fromB;
        }
        if (balM < 0.5) balM = 0;
        if (balB < 0.5) balB = 0;
        prepayment = actual;
        pot -= actual;
      }
    }

    const loanBalance = Math.max(balM + balB, 0);
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

  const annualRepayment = monthly * 12 + bonus * 2;
  const totalPayment = principal + totalInterest;
  const payoffAge = startAge + payoffYears;
  const grossAnnualNow = form.monthlySalaryMan * 10000 * (12 + form.bonusMonths);
  const netAnnualNow =
    estimateTakeHome(grossAnnualNow) +
    form.spouseIncomeMan * 10000 +
    form.sideIncomeMan * 10000;
  const repaymentBurdenPct =
    netAnnualNow > 0 ? (annualRepayment / netAnnualNow) * 100 : 0;

  return {
    monthlyPayment: monthly,
    bonusPayment: bonus,
    annualRepayment,
    totalInterest,
    totalPayment,
    payoffAge,
    payoffYears,
    repaymentBurdenPct,
    schedule,
  };
}
