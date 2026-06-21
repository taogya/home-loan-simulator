import { DEFAULT_FORM } from '../types';
import type { ExpenseItem, FormState, Plan, PlansState } from '../types';

const FORM_KEY = 'hlp-form';
const PLANS_KEY = 'hlp-plans';

function withDefaults(form: Partial<FormState>): FormState {
  const legacy = form as Partial<FormState> & {
    livingCostMan?: number;
    carCostMan?: number;
    insuranceMan?: number;
    educationMan?: number;
  };
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
        migrated.push({ id: 'exp-living', label: '生活費', amountMan: legacy.livingCostMan });
      if (legacy.carCostMan)
        migrated.push({ id: 'exp-car', label: '車の維持費', amountMan: legacy.carCostMan });
      if (legacy.insuranceMan)
        migrated.push({ id: 'exp-insurance', label: '保険', amountMan: legacy.insuranceMan });
      if (legacy.educationMan)
        migrated.push({ id: 'exp-education', label: '教育費', amountMan: legacy.educationMan });
      expenses = migrated;
    }
  }
  if (!expenses || expenses.length === 0) {
    expenses = DEFAULT_FORM.expenses.map((e) => ({ ...e }));
  }
  return { ...DEFAULT_FORM, ...form, expenses };
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
          plans: parsed.plans.map((p) => ({ ...p, form: withDefaults(p.form) })),
          activeId: parsed.activeId,
        };
      }
    }
    const legacy = localStorage.getItem(FORM_KEY);
    if (legacy) {
      const form = withDefaults(JSON.parse(legacy) as Partial<FormState>);
      const plan: Plan = { id: crypto.randomUUID(), name: 'プランA', form };
      return { version: 1, plans: [plan], activeId: plan.id };
    }
  } catch {
    // 壊れていたら既定値へ
  }
  const plan: Plan = {
    id: crypto.randomUUID(),
    name: 'プランA',
    form: DEFAULT_FORM,
  };
  return { version: 1, plans: [plan], activeId: plan.id };
}

/** 複数プランを保存する。 */
export function savePlans(state: PlansState): void {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(state));
  } catch {
    // 保存できない場合は無視
  }
}
