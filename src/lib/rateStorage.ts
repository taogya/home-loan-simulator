// 金利シミュレータの状態の保存／読み込み（LocalStorage）。
// ライフプラン画面（storage.ts）とは別キーで管理する。

import {
  DEFAULT_RATE_INPUT,
  newProductId,
  normalizeScenario,
  type RateProductDef,
  type RateScenario,
  type RateSimInput,
} from './rate';
import {
  GENERAL_TEMPLATE,
  RATE_TEMPLATES,
  flatScenarioFromTemplate,
} from '../data/rateTemplates';

const RATE_KEY = 'hlp-rate';

/** 金利シミュレータ画面の永続化状態 */
export interface RateSimState {
  /** データ構造のバージョン */
  version: number;
  /** 借入条件 */
  input: RateSimInput;
  /** 選択中のテンプレートID */
  templateId: string;
  /** 比較する商品（テンプレートから複製し、編集・増減可能） */
  products: RateProductDef[];
  /** 変動金利シナリオ */
  scenario: RateScenario;
}

/** 既定の状態（一般テンプレート＋横ばいシナリオ）を作る。 */
export function defaultRateState(): RateSimState {
  return {
    version: 1,
    input: { ...DEFAULT_RATE_INPUT },
    templateId: GENERAL_TEMPLATE.id,
    products: cloneProducts(GENERAL_TEMPLATE.products),
    scenario: flatScenarioFromTemplate(GENERAL_TEMPLATE),
  };
}

/** 商品リストのディープコピー（IDは維持）。 */
export function cloneProducts(products: RateProductDef[]): RateProductDef[] {
  return products.map((p) => ({ ...p }));
}

/** 旧形式（Record<type, {initialRatePct, afterRatePct}>）を新リストへ移行する。 */
function migrateProducts(raw: unknown): RateProductDef[] | null {
  if (Array.isArray(raw)) {
    // 既に新形式。最低限の妥当性を確認して採用。
    const list = raw
      .filter(
        (p): p is RateProductDef =>
          typeof p === 'object' &&
          p !== null &&
          typeof (p as RateProductDef).initialRatePct === 'number',
      )
      .map((p) => ({
        id: typeof p.id === 'string' && p.id ? p.id : newProductId(),
        kind: p.kind ?? 'fixedPeriod',
        fixedYears: p.fixedYears,
        label: p.label,
        initialRatePct: p.initialRatePct,
        afterRatePct: p.afterRatePct,
      }));
    return list.length > 0 ? list : null;
  }
  if (typeof raw === 'object' && raw !== null) {
    // 旧 Record 形式
    const rec = raw as Record<string, { initialRatePct?: number; afterRatePct?: number }>;
    const map: { key: string; def: Omit<RateProductDef, 'id' | 'initialRatePct'> }[] = [
      { key: 'variable', def: { kind: 'variable' } },
      { key: 'fixed3', def: { kind: 'fixedPeriod', fixedYears: 3 } },
      { key: 'fixed5', def: { kind: 'fixedPeriod', fixedYears: 5 } },
      { key: 'fixed10', def: { kind: 'fixedPeriod', fixedYears: 10 } },
      { key: 'flat35', def: { kind: 'wholeFixed' } },
    ];
    const list: RateProductDef[] = [];
    for (const { key, def } of map) {
      const r = rec[key];
      if (r && typeof r.initialRatePct === 'number') {
        list.push({
          id: newProductId(),
          ...def,
          initialRatePct: r.initialRatePct,
          afterRatePct: r.afterRatePct,
        });
      }
    }
    return list.length > 0 ? list : null;
  }
  return null;
}

/** 金利シミュレータの状態を読み込む。 */
export function loadRateState(): RateSimState {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RateSimState> & { products?: unknown };
      const base = defaultRateState();
      const template =
        RATE_TEMPLATES.find((t) => t.id === parsed.templateId) ?? GENERAL_TEMPLATE;
      const products = migrateProducts(parsed.products) ?? cloneProducts(template.products);
      return {
        version: 1,
        input: { ...base.input, ...(parsed.input ?? {}) },
        templateId: template.id,
        products,
        scenario: parsed.scenario
          ? normalizeScenario(parsed.scenario as RateScenario)
          : base.scenario,
      };
    }
  } catch {
    // 壊れていたら既定値へ
  }
  return defaultRateState();
}

/** 金利シミュレータの状態を保存する。 */
export function saveRateState(state: RateSimState): void {
  try {
    localStorage.setItem(RATE_KEY, JSON.stringify(state));
  } catch {
    // 保存できない場合は無視
  }
}
