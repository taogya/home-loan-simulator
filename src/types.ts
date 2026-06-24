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
  /** 何年後から始まるか（0/undefined=今から） */
  startAfterYears?: number;
  /** 何年間続くか（0/undefined=ずっと） */
  durationYears?: number;
}

/** 収入の持ち主（税は本人・配偶者で個別に計算、その他は手取り直接） */
export type IncomeOwner = 'self' | 'spouse' | 'other';

/** 収入の種類 */
export type IncomeKind = 'salary' | 'pension' | 'retirement' | 'other';

export interface IncomeItem {
  /** 一意なID */
  id: string;
  /** 持ち主（本人/配偶者/その他） */
  owner: IncomeOwner;
  /** 種類（給与/年金/退職金/その他） */
  kind: IncomeKind;
  /** 項目名（例: 本人給与） */
  label: string;
  /** 受け取り開始年齢（すべて本人の年齢が基準・歳） */
  startAge: number;
  /** 受け取り終了年齢（含む・空=ずっと） */
  endAge?: number;
  /** 金額（万円。basis により月額/年額） */
  amountMan: number;
  /** 金額の単位（monthly=月額 / annual=年額） */
  basis: 'monthly' | 'annual';
  /** true=額面（給与所得→手取りを自動計算） / false=手取り（そのまま加算） */
  isGross: boolean;
  /** 年間ボーナス＝月給の何ヶ月分（給与・basis=monthly のとき有効） */
  bonusMonths?: number;
  /** 昇給率（%/年・給与のみ） */
  raiseRatePct?: number;
  /** 昇給停止年齢（歳・給与のみ） */
  raiseStopAge?: number;
  /** 単発（退職金など・startAge の年だけ受け取る） */
  oneTime?: boolean;
}

export interface FormState {
  // 住居タイプ
  /** 住居タイプ（own=持ち家・ローン / rent=賃貸） */
  housingType: 'own' | 'rent';

  // ローン条件
  /** 借入額（万円） */
  loanAmountMan: number;
  /** 年利（%） */
  ratePct: number;
  /** 返済期間（年） */
  years: number;
  /** 借入開始時の年齢（歳） */
  age: number;

  // 賃貸条件（housingType==='rent' のとき使用）
  /** 家賃（万円/月） */
  rentMan: number;
  /** 更新料（万円・更新時に発生） */
  renewalFeeMan: number;
  /** 更新間隔（年） */
  renewalIntervalYears: number;

  // 収入（追加式・本人/配偶者/その他）
  /** 収入項目（給与・年金・退職金・その他） */
  incomes: IncomeItem[];

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
  housingType: 'own',
  loanAmountMan: 3500,
  ratePct: 1.0,
  years: 35,
  age: 35,
  rentMan: 12,
  renewalFeeMan: 12,
  renewalIntervalYears: 2,
  incomes: [
    {
      id: 'inc-salary',
      owner: 'self',
      kind: 'salary',
      label: '本人給与',
      startAge: 35,
      endAge: 64,
      amountMan: 30,
      basis: 'monthly',
      isGross: true,
      bonusMonths: 4,
      raiseRatePct: 1.5,
      raiseStopAge: 55,
    },
    {
      id: 'inc-pension',
      owner: 'self',
      kind: 'pension',
      label: '年金',
      startAge: 65,
      amountMan: 15,
      basis: 'monthly',
      isGross: false,
    },
    {
      id: 'inc-retirement',
      owner: 'self',
      kind: 'retirement',
      label: '退職金',
      startAge: 65,
      amountMan: 1000,
      basis: 'annual',
      isGross: false,
      oneTime: true,
    },
  ],
  expenses: [
    { id: 'exp-living', label: '生活費', amountMan: 20 },
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
  /** 全プラン共通の設定（収入・支出・イベント） */
  common: CommonSettings;
  /** すべてのプラン */
  plans: Plan[];
  /** 現在表示中のプランID */
  activeId: string;
}

/** 全プランで共有する設定。各プランはこれを継承し、専用項目を足せる。 */
export interface CommonSettings {
  /** 共通の収入項目 */
  incomes: IncomeItem[];
  /** 共通の支出項目 */
  expenses: ExpenseItem[];
  /** 共通のライフイベント */
  events: LifeEvent[];
}

/** 空の共通設定を作る。 */
export function emptyCommon(): CommonSettings {
  return { incomes: [], expenses: [], events: [] };
}
