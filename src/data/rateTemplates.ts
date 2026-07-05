// 金利テンプレート（銀行ごとの金利水準・見直しルールのプリセット）。
// ここに載る金利はいずれも「適用金利（優遇後）」の目安であり、実際の金利は
// 借入時期・優遇条件・審査結果により異なる。数値は編集して使う前提。

import {
  DEFAULT_VARIABLE_RULES,
  RATE_SCENARIO_KIND,
  type RateProductDef,
  type RateScenario,
  type VariableRules,
} from '../lib/rate';

export interface RateTemplate {
  /** 一意なID */
  id: string;
  /** 表示名 */
  name: string;
  /** 補足（目安である旨など） */
  note: string;
  /** 見直し周期（月） */
  reviewMonths: number;
  /** 変動金利ルール */
  rules: VariableRules;
  /** 比較する商品（自由に増減できる） */
  products: RateProductDef[];
}

/**
 * JA（農協）テンプレート。
 * 添付資料（変動金利の3ルール）に基づく考え方。6ヶ月見直し・5年ルール・125%ルール。
 * 金利は適用金利の目安。全期間固定は扱いが無い場合もある。
 */
export const JA_TEMPLATE: RateTemplate = {
  id: 'ja',
  name: 'JA（目安）',
  note: '6ヶ月見直し・5年ルール・125%ルール。金利は適用金利の目安で、営業店・優遇条件により異なります。',
  reviewMonths: 6,
  rules: { ...DEFAULT_VARIABLE_RULES },
  products: [
    { id: 'ja-variable', kind: 'variable', initialRatePct: 1.0 },
    { id: 'ja-fixed3', kind: 'fixedPeriod', fixedYears: 3, initialRatePct: 1.25, afterRatePct: 1.0 },
    { id: 'ja-fixed5', kind: 'fixedPeriod', fixedYears: 5, initialRatePct: 1.45, afterRatePct: 1.0 },
    { id: 'ja-fixed10', kind: 'fixedPeriod', fixedYears: 10, initialRatePct: 2.0, afterRatePct: 1.0 },
  ],
};

/**
 * 一般（メガバンク水準）テンプレート。
 * 2026年時点の一般的な適用金利（優遇後）の目安。日銀の利上げを反映した水準。
 */
export const GENERAL_TEMPLATE: RateTemplate = {
  id: 'general',
  name: '一般（メガバンク目安）',
  note: '2026年時点の一般的な適用金利（優遇後）の目安です。実際は優遇条件で変わります（あくまで目安）。',
  reviewMonths: 6,
  rules: { ...DEFAULT_VARIABLE_RULES },
  products: [
    { id: 'gen-variable', kind: 'variable', initialRatePct: 0.9 },
    { id: 'gen-fixed3', kind: 'fixedPeriod', fixedYears: 3, initialRatePct: 1.3, afterRatePct: 0.9 },
    { id: 'gen-fixed5', kind: 'fixedPeriod', fixedYears: 5, initialRatePct: 1.5, afterRatePct: 0.9 },
    { id: 'gen-fixed10', kind: 'fixedPeriod', fixedYears: 10, initialRatePct: 1.9, afterRatePct: 0.9 },
    { id: 'gen-whole', kind: 'wholeFixed', initialRatePct: 2.1 },
  ],
};

/**
 * ネット銀行（毎月見直し型）テンプレート。
 * 楽天銀行などは金利見直しが毎月で、5年ルール・125%ルールを設けない場合がある。
 */
export const NETBANK_TEMPLATE: RateTemplate = {
  id: 'netbank',
  name: 'ネット銀行（毎月見直し・目安）',
  note: '毎月見直し・5年ルール／125%ルールなしの例（楽天銀行など）。金利変動が返済額へすぐ反映されます。2026年時点の適用金利の目安。',
  reviewMonths: 1,
  rules: { reviewMonths: 1, paymentFixedYears: 0, paymentCapRatio: 0 },
  products: [
    { id: 'net-variable', kind: 'variable', initialRatePct: 1.0 },
    { id: 'net-fixed10', kind: 'fixedPeriod', fixedYears: 10, initialRatePct: 1.6, afterRatePct: 1.0 },
    { id: 'net-whole', kind: 'wholeFixed', initialRatePct: 2.1 },
  ],
};

/**
 * 地方銀行（目安）テンプレート。
 * 6ヶ月見直し・5年ルール・125%ルール。メガバンクよりやや高めの適用金利の目安。
 */
export const REGIONAL_TEMPLATE: RateTemplate = {
  id: 'regional',
  name: '地方銀行（目安）',
  note: '6ヶ月見直し・5年ルール・125%ルール。メガバンクよりやや高めの適用金利の目安（2026年時点）。',
  reviewMonths: 6,
  rules: { ...DEFAULT_VARIABLE_RULES },
  products: [
    { id: 'reg-variable', kind: 'variable', initialRatePct: 1.1 },
    { id: 'reg-fixed3', kind: 'fixedPeriod', fixedYears: 3, initialRatePct: 1.5, afterRatePct: 1.1 },
    { id: 'reg-fixed10', kind: 'fixedPeriod', fixedYears: 10, initialRatePct: 2.1, afterRatePct: 1.1 },
    { id: 'reg-whole', kind: 'wholeFixed', initialRatePct: 2.2 },
  ],
};

/**
 * フラット35（全期間固定）テンプレート。
 * 住宅金融支援機構の全期間固定金利（借入期間21〜35年・融資率9割以下）の目安。
 */
export const FLAT35_TEMPLATE: RateTemplate = {
  id: 'flat35',
  name: 'フラット35（全期間固定・目安）',
  note: '住宅金融支援機構の全期間固定金利の目安（2026年時点・融資率9割以下）。変動・固定期間選択型はありません。',
  reviewMonths: 6,
  rules: { ...DEFAULT_VARIABLE_RULES },
  products: [{ id: 'flat-whole', kind: 'wholeFixed', initialRatePct: 2.1 }],
};

export const RATE_TEMPLATES: RateTemplate[] = [
  GENERAL_TEMPLATE,
  JA_TEMPLATE,
  NETBANK_TEMPLATE,
  REGIONAL_TEMPLATE,
  FLAT35_TEMPLATE,
];

/** テンプレートの代表的な変動金利（%）を得る（変動商品→先頭商品の順）。 */
export function templateVariableRate(t: RateTemplate): number {
  const v = t.products.find((p) => p.kind === 'variable');
  return v?.initialRatePct ?? t.products[0]?.initialRatePct ?? 0.5;
}

/** テンプレートから既定の「横ばい」シナリオを作る（当初金利がそのまま続く）。 */
export function flatScenarioFromTemplate(t: RateTemplate): RateScenario {
  return {
    kind: RATE_SCENARIO_KIND,
    version: 1,
    name: `${t.name}・横ばい`,
    reviewMonths: t.reviewMonths,
    rules: { ...t.rules },
    points: [{ fromMonth: 0, ratePct: templateVariableRate(t) }],
  };
}

/**
 * テンプレートから「段階的に上昇する」サンプルシナリオを作る。
 * 当初金利から、数年ごとに 0.25% ずつ上昇していく例（編集して使う想定）。
 */
export function risingScenarioFromTemplate(t: RateTemplate): RateScenario {
  const base = templateVariableRate(t);
  const step = 0.25;
  const points = [
    { fromMonth: 0, ratePct: base, note: '当初' },
    { fromMonth: 24, ratePct: base + step, note: '日銀利上げ想定' },
    { fromMonth: 48, ratePct: base + step * 2, note: '追加利上げ想定' },
    { fromMonth: 84, ratePct: base + step * 3 },
    { fromMonth: 120, ratePct: base + step * 4 },
    { fromMonth: 180, ratePct: base + step * 3, note: '低下局面' },
  ];
  return {
    kind: RATE_SCENARIO_KIND,
    version: 1,
    name: `${t.name}・段階上昇の例`,
    reviewMonths: t.reviewMonths,
    rules: { ...t.rules },
    points,
  };
}
