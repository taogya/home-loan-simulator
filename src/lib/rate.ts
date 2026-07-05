// 金利シミュレータのモデルと計算。
// 変動金利の「6ヶ月見直し・5年ルール（返済額据え置き）・125%ルール」と
// 未払利息の発生を含む元利均等返済を月次で計算する。
// 金額はすべて円で扱う（UI 入力は万円）。

/** 商品の種類（変動 / 固定期間選択型 / 全期間固定） */
export type RateKind = 'variable' | 'fixedPeriod' | 'wholeFixed';

/**
 * 比較する商品の定義。固定期間選択型は fixedYears と afterRatePct を持つ。
 * 変動・全期間固定は任意（銀行により無い商品もあるため、リストで自由に増減できる）。
 */
export interface RateProductDef {
  /** 一意なID */
  id: string;
  /** 種類 */
  kind: RateKind;
  /** 固定期間（年）。kind==='fixedPeriod' のとき有効 */
  fixedYears?: number;
  /** 表示名（未指定なら種類・固定期間から生成） */
  label?: string;
  /** 当初適用金利（%） */
  initialRatePct: number;
  /** 固定期間終了後に選ぶ金利（%）。kind==='fixedPeriod' のとき有効（何もしなければ変動へ移行） */
  afterRatePct?: number;
}

/** 商品の表示名を得る。 */
export function productLabel(p: RateProductDef): string {
  if (p.label && p.label.trim()) return p.label;
  if (p.kind === 'variable') return '変動金利型';
  if (p.kind === 'wholeFixed') return '全期間固定';
  return `固定${p.fixedYears ?? 0}年`;
}

/** 固定期間（年）を得る（fixedPeriod 以外は 0）。 */
export function productFixedYears(p: RateProductDef): number {
  return p.kind === 'fixedPeriod' ? p.fixedYears ?? 0 : 0;
}

/** ユニークIDを作る（商品定義用）。 */
export function newProductId(): string {
  return crypto.randomUUID();
}

/** 変動金利のルール設定 */
export interface VariableRules {
  /** 金利見直し周期（月）。例: 6 = 半年ごと */
  reviewMonths: number;
  /** 返済額を据え置く年数（5年ルール）。0 で無効 */
  paymentFixedYears: number;
  /** 見直し時の返済額の上限倍率（125%ルール = 1.25）。0 で無効 */
  paymentCapRatio: number;
}

/** 既定の変動金利ルール（6ヶ月見直し・5年ルール・125%ルール） */
export const DEFAULT_VARIABLE_RULES: VariableRules = {
  reviewMonths: 6,
  paymentFixedYears: 5,
  paymentCapRatio: 1.25,
};

/** 借入条件（金利シミュレータ専用・ライフプラン画面とは独立） */
export interface RateSimInput {
  /** 借入額（万円） */
  loanAmountMan: number;
  /** 返済期間（年） */
  years: number;
  /** 借入時の年齢（表示用・任意） */
  age: number;
}

export const DEFAULT_RATE_INPUT: RateSimInput = {
  loanAmountMan: 3500,
  years: 35,
  age: 35,
};

/** 金利シナリオの1点：借入から fromMonth ヶ月後に ratePct（%）へ変わる（ステップ） */
export interface RateScenarioPoint {
  /** 借入からの経過月（0 = 当初）。見直し境界にスナップして適用される */
  fromMonth: number;
  /** その時点以降の適用金利（%/年） */
  ratePct: number;
  /** 任意メモ（例: 日銀利上げ） */
  note?: string;
}

/** 金利シナリオ（インポート／エクスポート対象・JSON） */
export interface RateScenario {
  /** スキーマ識別子 */
  kind: 'home-loan-rate-scenario';
  /** データ構造のバージョン */
  version: number;
  /** シナリオ名 */
  name: string;
  /** 見直し周期（月）。6 = 半年 */
  reviewMonths: number;
  /** 変動金利ルール */
  rules: VariableRules;
  /** 各更新期の適用金利（%・絶対値）。fromMonth=0 を先頭に昇順で持つ */
  points: RateScenarioPoint[];
}

export const RATE_SCENARIO_KIND = 'home-loan-rate-scenario';

/** 元利均等の1期あたり返済額。 */
export function annuity(
  principal: number,
  ratePerPeriod: number,
  nPeriods: number,
): number {
  if (nPeriods <= 0 || principal <= 0) return 0;
  if (ratePerPeriod === 0) return principal / nPeriods;
  const f = Math.pow(1 + ratePerPeriod, nPeriods);
  return (principal * ratePerPeriod * f) / (f - 1);
}

/** 一定額返済を months 回続けたあとの残高（円）。 */
function remainingBalance(
  principal: number,
  ratePerPeriod: number,
  payment: number,
  months: number,
): number {
  if (months <= 0) return principal;
  if (ratePerPeriod === 0) return Math.max(0, principal - payment * months);
  const f = Math.pow(1 + ratePerPeriod, months);
  return Math.max(0, principal * f - payment * ((f - 1) / ratePerPeriod));
}

/** シナリオから経過月 month 時点の適用金利（%）を求める（直近の点を採用）。 */
function scenarioRateAt(scenario: RateScenario, month: number): number {
  const points = scenario.points;
  let rate = points[0]?.ratePct ?? 0;
  for (const p of points) {
    if (p.fromMonth <= month) rate = p.ratePct;
    else break;
  }
  return rate;
}

/** 当初の適用金利（%）。 */
export function initialScenarioRate(scenario: RateScenario): number {
  return scenario.points[0]?.ratePct ?? 0;
}

/** 月次の計算結果の1点 */
export interface RateMonth {
  /** 経過月（1..N） */
  month: number;
  /** 経過年（小数・month/12） */
  yearFloat: number;
  /** その月の適用金利（%/年） */
  ratePct: number;
  /** その月の返済額（円） */
  payment: number;
  /** その月の利息（円） */
  interest: number;
  /** その月の元金充当（円） */
  principal: number;
  /** 月末のローン残高（円） */
  balance: number;
  /** 累積の未払利息（円） */
  unpaidInterest: number;
}

/** 変動金利シナリオのシミュレーション結果 */
export interface RateSimResult {
  /** 当初の月返済額（円） */
  monthlyPayment0: number;
  /** 月次スケジュール */
  schedule: RateMonth[];
  /** 総利息（発生ベース・円） */
  totalInterest: number;
  /** 総返済額（元金＋総利息・円） */
  totalPayment: number;
  /** 期間中の最大の月返済額（円） */
  maxPayment: number;
  /** 最終の月返済額（円） */
  finalPayment: number;
  /** 完済月（残高が0になった月。しなければ返済期間の月数） */
  payoffMonth: number;
  /** 返済期間終了時に残る残高（円・0なら期間内に完済） */
  finalBalance: number;
  /** 返済期間終了時に残る未払利息（円） */
  finalUnpaidInterest: number;
  /** 期間中の未払利息の最大（ピーク・円） */
  maxUnpaidInterest: number;
  /** 期間中に未払利息が発生したか */
  hadUnpaidInterest: boolean;
}

/**
 * 変動金利シナリオを月次でシミュレーションする。
 * - 見直し周期ごとに適用金利を更新（返済額は5年ルールで据え置き）
 * - 返済額の見直し時は125%ルールで上限を掛ける
 * - 返済額 < 利息 のとき差額を未払利息として累積（元金は減らない）
 * - 未払利息には利息を付さない（一般的な運用）
 */
export function simulateRateScenario(
  input: RateSimInput,
  scenario: RateScenario,
): RateSimResult {
  const principal = Math.max(0, input.loanAmountMan) * 10000;
  const totalMonths = Math.max(1, Math.round(input.years * 12));
  const review = Math.max(1, Math.round(scenario.reviewMonths || 6));
  const fixedMonths =
    scenario.rules.paymentFixedYears > 0
      ? Math.round(scenario.rules.paymentFixedYears * 12)
      : 0;
  const cap = scenario.rules.paymentCapRatio > 0 ? scenario.rules.paymentCapRatio : 0;

  let balance = principal;
  let unpaid = 0;
  let currentRate = scenarioRateAt(scenario, 0);
  let payment = annuity(balance, currentRate / 1200, totalMonths);
  const monthlyPayment0 = payment;

  let totalInterest = 0;
  let maxPayment = payment;
  let maxUnpaid = 0;
  let payoffMonth = totalMonths;
  let hadUnpaidInterest = false;

  const schedule: RateMonth[] = [];

  for (let m = 1; m <= totalMonths; m++) {
    // 見直し境界で適用金利を更新
    if ((m - 1) % review === 0) {
      currentRate = scenarioRateAt(scenario, m - 1);
      // 5年ルールが無効なら、見直しのたびに返済額を再計算（125%上限は任意で適用）
      if (fixedMonths === 0 && m > 1) {
        const remaining = totalMonths - (m - 1);
        const raw = annuity(balance + unpaid, currentRate / 1200, remaining);
        payment = cap > 0 ? Math.min(raw, payment * cap) : raw;
      }
    }

    const monthlyRate = currentRate / 1200;
    const interest = balance * monthlyRate;
    totalInterest += interest;

    let principalPart = payment - interest;
    if (principalPart < 0) {
      // 返済額が利息に満たない → 未払利息が発生（元金は減らない）
      unpaid += -principalPart;
      principalPart = 0;
      hadUnpaidInterest = true;
    } else {
      // まず溜まっている未払利息へ充当し、残りを元金へ
      const toUnpaid = Math.min(principalPart, unpaid);
      unpaid -= toUnpaid;
      principalPart -= toUnpaid;
    }
    if (principalPart > balance) principalPart = balance;
    balance -= principalPart;
    if (balance < 0.5) balance = 0;

    // 返済額の見直し（5年ルール：fixedMonths ごと・125%上限）
    if (fixedMonths > 0 && m % fixedMonths === 0 && m < totalMonths) {
      const remaining = totalMonths - m;
      const raw = annuity(balance + unpaid, monthlyRate, remaining);
      payment = cap > 0 ? Math.min(raw, payment * cap) : raw;
    }

    if (payment > maxPayment) maxPayment = payment;
    if (unpaid > maxUnpaid) maxUnpaid = unpaid;

    schedule.push({
      month: m,
      yearFloat: m / 12,
      ratePct: currentRate,
      payment,
      interest,
      principal: principalPart,
      balance,
      unpaidInterest: unpaid,
    });

    if (balance <= 0 && unpaid <= 0.5) {
      payoffMonth = m;
      break;
    }
  }

  const last = schedule[schedule.length - 1];
  return {
    monthlyPayment0,
    schedule,
    totalInterest,
    totalPayment: principal + totalInterest,
    maxPayment,
    finalPayment: last?.payment ?? monthlyPayment0,
    payoffMonth,
    finalBalance: last?.balance ?? 0,
    finalUnpaidInterest: last?.unpaidInterest ?? 0,
    maxUnpaidInterest: maxUnpaid,
    hadUnpaidInterest,
  };
}

/** 商品比較の1行 */
export interface ProductComparison {
  /** 商品定義のID */
  id: string;
  /** 種類 */
  kind: RateKind;
  label: string;
  /** 当初適用金利（%） */
  initialRatePct: number;
  /** 固定期間終了後の金利（%・固定期間選択型のみ） */
  afterRatePct?: number;
  /** 固定期間（年）。0 = なし */
  fixedYears: number;
  /** 当初の月返済額（円） */
  monthlyPayment: number;
  /** 単純比較：当初金利が全期間続く前提の総利息（円） */
  totalInterestSimple: number;
  /** 単純比較：総返済額（円） */
  totalPaymentSimple: number;
  /** 移行シナリオ：固定期間後は afterRatePct が続く前提の総利息（円・固定期間選択型のみ） */
  totalInterestTransition?: number;
  /** 移行シナリオ：総返済額（円） */
  totalPaymentTransition?: number;
  /** 移行シナリオ：固定期間終了後の月返済額（円） */
  paymentAfterTransition?: number;
}

/**
 * 各商品の月返済額・総利息を計算する。
 * - 単純比較：その金利が全期間続く前提（元利均等・完済）
 * - 移行シナリオ：固定期間選択型のみ、固定期間終了後に afterRatePct へ移行
 */
export function compareProducts(
  input: RateSimInput,
  products: RateProductDef[],
): ProductComparison[] {
  const principal = Math.max(0, input.loanAmountMan) * 10000;
  const totalMonths = Math.max(1, Math.round(input.years * 12));

  return products.map((p) => {
    const initialRatePct = p.initialRatePct;
    const fixedYears = productFixedYears(p);
    const r0 = initialRatePct / 1200;
    const monthlyPayment = annuity(principal, r0, totalMonths);
    const totalPaymentSimple = monthlyPayment * totalMonths;
    const totalInterestSimple = totalPaymentSimple - principal;

    const row: ProductComparison = {
      id: p.id,
      kind: p.kind,
      label: productLabel(p),
      initialRatePct,
      afterRatePct: p.afterRatePct,
      fixedYears,
      monthlyPayment,
      totalInterestSimple,
      totalPaymentSimple,
    };

    // 固定期間選択型のみ移行シナリオを計算
    if (p.kind === 'fixedPeriod' && fixedYears > 0 && fixedYears * 12 < totalMonths) {
      const phase1 = fixedYears * 12;
      const balAfter = remainingBalance(principal, r0, monthlyPayment, phase1);
      const rAfter = (p.afterRatePct ?? initialRatePct) / 1200;
      const remaining = totalMonths - phase1;
      const payment2 = annuity(balAfter, rAfter, remaining);
      const paidPhase1 = monthlyPayment * phase1;
      const paidPhase2 = payment2 * remaining;
      const total = paidPhase1 + paidPhase2;
      row.totalPaymentTransition = total;
      row.totalInterestTransition = total - principal;
      row.paymentAfterTransition = payment2;
    }

    return row;
  });
}

/** シナリオが妥当か（インポート時の検証）。 */
export function isValidScenario(value: unknown): value is RateScenario {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.kind !== RATE_SCENARIO_KIND) return false;
  if (!Array.isArray(v.points) || v.points.length === 0) return false;
  const pointsOk = v.points.every(
    (p) =>
      typeof p === 'object' &&
      p !== null &&
      typeof (p as Record<string, unknown>).fromMonth === 'number' &&
      typeof (p as Record<string, unknown>).ratePct === 'number',
  );
  if (!pointsOk) return false;
  // rules は任意。あれば object であることだけ確認（欠損は normalizeScenario が補完）。
  // reviewMonths はトップレベル / rules のどちらか、無ければ既定値でよい。
  if (v.rules !== undefined && (typeof v.rules !== 'object' || v.rules === null)) {
    return false;
  }
  return true;
}

/** インポートしたシナリオを安全に正規化する（欠損を既定値で補完・点を昇順整列）。 */
export function normalizeScenario(raw: RateScenario): RateScenario {
  // 見直し周期はトップレベル → rules → 既定 の順で解決し、両者を一致させる。
  const reviewMonths =
    raw.reviewMonths ?? raw.rules?.reviewMonths ?? DEFAULT_VARIABLE_RULES.reviewMonths;
  const rules: VariableRules = {
    reviewMonths,
    paymentFixedYears:
      raw.rules?.paymentFixedYears ?? DEFAULT_VARIABLE_RULES.paymentFixedYears,
    paymentCapRatio:
      raw.rules?.paymentCapRatio ?? DEFAULT_VARIABLE_RULES.paymentCapRatio,
  };
  const points = [...raw.points]
    .filter((p) => Number.isFinite(p.fromMonth) && Number.isFinite(p.ratePct))
    .map((p) => ({
      fromMonth: Math.max(0, Math.round(p.fromMonth)),
      ratePct: p.ratePct,
      note: typeof p.note === 'string' ? p.note : undefined,
    }))
    .sort((a, b) => a.fromMonth - b.fromMonth);
  // 先頭が fromMonth=0 でなければ当初点を補う
  if (points.length === 0 || points[0].fromMonth !== 0) {
    points.unshift({ fromMonth: 0, ratePct: points[0]?.ratePct ?? 0.5, note: undefined });
  }
  return {
    kind: RATE_SCENARIO_KIND,
    version: 1,
    name: typeof raw.name === 'string' && raw.name ? raw.name : '金利シナリオ',
    reviewMonths,
    rules,
    points,
  };
}
