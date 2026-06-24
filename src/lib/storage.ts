import { DEFAULT_FORM, emptyCommon } from '../types';
import type {
  CommonSettings,
  ExpenseItem,
  FormState,
  IncomeItem,
  Plan,
  PlansState,
} from '../types';

const FORM_KEY = 'hlp-form';
const PLANS_KEY = 'hlp-plans';

/** 共通設定を安全に正規化する（欠けていれば空配列）。 */
function normalizeCommon(c: Partial<CommonSettings> | undefined): CommonSettings {
  return {
    incomes: Array.isArray(c?.incomes) ? c!.incomes : [],
    expenses: Array.isArray(c?.expenses) ? c!.expenses : [],
    events: Array.isArray(c?.events) ? c!.events : [],
  };
}

/** 旧形式（固定の収入フィールド）の型 */
type LegacyIncomeFields = {
  age?: number;
  monthlySalaryMan?: number;
  bonusMonths?: number;
  raiseRatePct?: number;
  raiseStopAge?: number;
  spouseIncomeMan?: number;
  sideIncomeMan?: number;
  retireAge?: number;
  pensionStartAge?: number;
  pensionMonthlyMan?: number;
  retirementBonusMan?: number;
};

/** 旧形式の固定収入フィールドを追加式の incomes へ移行する */
function migrateIncomes(
  incomes: IncomeItem[] | undefined,
  legacy: LegacyIncomeFields,
): IncomeItem[] {
  if (Array.isArray(incomes) && incomes.length > 0) return incomes;
  const startAge = legacy.age ?? DEFAULT_FORM.age;
  const retireAge = legacy.retireAge ?? 65;
  const salaryEnd = Math.max(startAge, retireAge - 1);
  const migrated: IncomeItem[] = [];
  if (legacy.monthlySalaryMan && legacy.monthlySalaryMan > 0) {
    migrated.push({
      id: crypto.randomUUID(),
      owner: 'self',
      kind: 'salary',
      label: '本人給与',
      startAge,
      endAge: salaryEnd,
      amountMan: legacy.monthlySalaryMan,
      basis: 'monthly',
      isGross: true,
      bonusMonths: legacy.bonusMonths ?? 0,
      raiseRatePct: legacy.raiseRatePct ?? 0,
      raiseStopAge: legacy.raiseStopAge ?? retireAge,
    });
  }
  if (legacy.spouseIncomeMan && legacy.spouseIncomeMan > 0) {
    migrated.push({
      id: crypto.randomUUID(),
      owner: 'spouse',
      kind: 'salary',
      label: '配偶者収入',
      startAge,
      endAge: salaryEnd,
      amountMan: legacy.spouseIncomeMan,
      basis: 'annual',
      isGross: false,
    });
  }
  if (legacy.sideIncomeMan && legacy.sideIncomeMan > 0) {
    migrated.push({
      id: crypto.randomUUID(),
      owner: 'other',
      kind: 'other',
      label: '副業',
      startAge,
      amountMan: legacy.sideIncomeMan,
      basis: 'annual',
      isGross: false,
    });
  }
  if (legacy.pensionMonthlyMan && legacy.pensionMonthlyMan > 0) {
    migrated.push({
      id: crypto.randomUUID(),
      owner: 'self',
      kind: 'pension',
      label: '年金',
      startAge: legacy.pensionStartAge ?? 65,
      amountMan: legacy.pensionMonthlyMan,
      basis: 'monthly',
      isGross: false,
    });
  }
  if (legacy.retirementBonusMan && legacy.retirementBonusMan > 0) {
    migrated.push({
      id: crypto.randomUUID(),
      owner: 'self',
      kind: 'retirement',
      label: '退職金',
      startAge: retireAge,
      amountMan: legacy.retirementBonusMan,
      basis: 'annual',
      isGross: false,
      oneTime: true,
    });
  }
  if (migrated.length === 0)
    return DEFAULT_FORM.incomes.map((i) => ({ ...i, id: crypto.randomUUID() }));
  return migrated;
}

function withDefaults(form: Partial<FormState>): FormState {
  const legacy = form as Partial<FormState> & {
    livingCostMan?: number;
    carCostMan?: number;
    insuranceMan?: number;
    educationMan?: number;
  } & LegacyIncomeFields;
  let expenses = Array.isArray(form.expenses) ? form.expenses : undefined;
  // 旧形式（個別フィールド）から追加式の expenses へ移行
  if (!expenses) {
    const hasLegacy =
      legacy.livingCostMan !== undefined ||
      legacy.carCostMan !== undefined ||
      legacy.insuranceMan !== undefined ||
      legacy.educationMan !== undefined;
    if (hasLegacy) {
      const migrated: ExpenseItem[] = [];
      if (legacy.livingCostMan)
        migrated.push({ id: crypto.randomUUID(), label: '生活費', amountMan: legacy.livingCostMan });
      if (legacy.carCostMan)
        migrated.push({ id: crypto.randomUUID(), label: '車の維持費', amountMan: legacy.carCostMan });
      if (legacy.insuranceMan)
        migrated.push({ id: crypto.randomUUID(), label: '保険', amountMan: legacy.insuranceMan });
      if (legacy.educationMan)
        migrated.push({ id: crypto.randomUUID(), label: '教育費', amountMan: legacy.educationMan });
      expenses = migrated;
    }
  }
  if (!expenses || expenses.length === 0) {
    expenses = DEFAULT_FORM.expenses.map((e) => ({ ...e, id: crypto.randomUUID() }));
  }
  const incomes = migrateIncomes(form.incomes, legacy);
  return { ...DEFAULT_FORM, ...form, expenses, incomes };
}

/** 任意の（旧形式を含む）フォームを現行の FormState に正規化する。 */
export function normalizeForm(form: Partial<FormState>): FormState {
  return withDefaults(form);
}

/**
 * 複数プランを読み込む。新形式が無ければ旧単一形式から移行し、
 * それも無ければ既定のプラン1つを返す。各プランの form は既定値で補完。
 */
export function loadPlans(): PlansState {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlansState;
      if (parsed.plans && parsed.plans.length > 0) {
        return {
          version: 1,
          common: normalizeCommon(parsed.common),
          plans: parsed.plans.map((p) => ({ ...p, form: withDefaults(p.form) })),
          activeId: parsed.activeId,
        };
      }
    }
    const legacy = localStorage.getItem(FORM_KEY);
    if (legacy) {
      const form = withDefaults(JSON.parse(legacy) as Partial<FormState>);
      const plan: Plan = { id: crypto.randomUUID(), name: 'プランA', form };
      return { version: 1, common: emptyCommon(), plans: [plan], activeId: plan.id };
    }
  } catch {
    // 壊れていたら既定値へ
  }
  // 何も保存されていなければ空（ウェルカム画面を表示）
  return { version: 1, common: emptyCommon(), plans: [], activeId: '' };
}

/** 複数プランを保存する。 */
export function savePlans(state: PlansState): void {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(state));
  } catch {
    // 保存できない場合は無視
  }
}
