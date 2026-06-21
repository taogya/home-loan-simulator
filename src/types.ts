// UI 入力フォームの状態（ローン金額は万円、月給・支出は万円）

export type PrepayMode = 'none' | 'saveup';

export interface LifeEvent {
  /** 一意なID */
  id: string;
  /** 何歳の時に起きるか（定期の場合は開始年齢） */
  atAge: number;
  /** イベント名（例: 車買い替え） */
  label: string;
  /** 一時支出（万円） */
  amountMan: number;
  /** N年ごとに繰り返す（0/undefined=単発） */
  intervalYears?: number;
  /** 繰り返し終了年齢（intervalYears>0 のとき有効） */
  untilAge?: number;
}

export interface ExpenseItem {
  /** 一意なID */
  id: string;
  /** 項目名（例: 生活費） */
  label: string;
  /** 月額（万円） */
  amountMan: number;
}

export interface FormState {
  // ローン条件
  /** 借入額（万円） */
  loanAmountMan: number;
  /** 年利（%） */
  ratePct: number;
  /** 返済期間（年） */
  years: number;
  /** 借入開始時の年齢（歳） */
  age: number;

  // 収入
  /** 月給（額面・税引き前, 万円/月） */
  monthlySalaryMan: number;
  /** 年間ボーナス＝月給の何ヶ月分（年間合計） */
  bonusMonths: number;
  /** 昇給率（%/年・額面） */
  raiseRatePct: number;
  /** 昇給停止年齢（歳） */
  raiseStopAge: number;
  /** 配偶者の手取り年収（年・万円） */
  spouseIncomeMan: number;
  /** 副収入（手取り・年・万円） */
  sideIncomeMan: number;

  // 定年・年金
  /** 定年退職の年齢（歳・以降は給与収入なし） */
  retireAge: number;
  /** 年金の受給開始年齢（歳） */
  pensionStartAge: number;
  /** 年金の手取り月額（万円） */
  pensionMonthlyMan: number;

  // 支出（毎月・万円）
  /** 毎月の支出項目（追加式・定番＋自由ラベル） */
  expenses: ExpenseItem[];

  // 返済プラン・貯金
  /** ボーナス1回の返済額（万円・固定。0で使わない） */
  bonusRepayMan: number;
  /** 現在の貯金（万円） */
  initialSavingsMan: number;

  // 繰上げ返済（積立方式）
  /** 繰上げ方式（none=しない / saveup=積み立てて実行） */
  prepayMode: PrepayMode;
  /** 毎年の繰上げ用積立額（万円） */
  prepaySaveupPerYearMan: number;
  /** 繰上げを実行する積立額のしきい値（万円） */
  prepayTriggerMan: number;

  // ライフイベント
  /** 一時支出イベント（年齢・ラベル・金額） */
  events: LifeEvent[];
}

export const DEFAULT_FORM: FormState = {
  loanAmountMan: 3500,
  ratePct: 1.0,
  years: 35,
  age: 35,
  monthlySalaryMan: 30,
  bonusMonths: 4,
  raiseRatePct: 1.5,
  raiseStopAge: 55,
  spouseIncomeMan: 0,
  sideIncomeMan: 0,
  retireAge: 65,
  pensionStartAge: 65,
  pensionMonthlyMan: 15,
  expenses: [
    { id: 'exp-living', label: '生活費', amountMan: 20 },
    { id: 'exp-car', label: '車の維持費', amountMan: 2 },
    { id: 'exp-insurance', label: '保険', amountMan: 2 },
  ],
  bonusRepayMan: 0,
  initialSavingsMan: 300,
  prepayMode: 'none',
  prepaySaveupPerYearMan: 20,
  prepayTriggerMan: 100,
  events: [],
};

export interface Plan {
  /** 一意なID */
  id: string;
  /** プラン名（例: プランA） */
  name: string;
  /** プランの入力内容 */
  form: FormState;
}

export interface PlansState {
  /** データ構造のバージョン */
  version: number;
  /** すべてのプラン */
  plans: Plan[];
  /** 現在表示中のプランID */
  activeId: string;
}
