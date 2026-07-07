import { useState } from 'react';
import { RateInputPanel } from './RateInputPanel';
import { RateComparePanel } from './RateComparePanel';
import { RateScenarioPanel } from './RateScenarioPanel';
import { RateHistoryPanel } from './RateHistoryPanel';
import {
  RATE_TEMPLATES,
  flatScenarioFromTemplate,
  risingScenarioFromTemplate,
} from '../../data/rateTemplates';
import { cloneProducts, type RateSimState } from '../../lib/rateStorage';
import {
  newProductId,
  type RateKind,
  type RateProductDef,
  type RateScenario,
  type RateSimInput,
} from '../../lib/rate';
import type { Theme } from '../../hooks/useTheme';

const SUB_TABS = [
  { id: 'compare', label: 'プラン比較' },
  { id: 'scenario', label: '金利シナリオ' },
  { id: 'history', label: '過去の金利' },
] as const;

type SubTabId = (typeof SUB_TABS)[number]['id'];

interface RateSimulatorScreenProps {
  state: RateSimState;
  onChange: (updater: (prev: RateSimState) => RateSimState) => void;
  theme: Theme;
  onExportScenario: () => void;
  onImportScenario: (file: File) => void;
  plansState?: any;
  onApplyProductToPlan?: (productId: string, planId: string) => void;
  onApplyScenarioToPlan?: (planId: string) => void;
}

/** 種類ごとの新規商品の既定値。 */
function makeProduct(kind: RateKind): RateProductDef {
  if (kind === 'variable') return { id: newProductId(), kind, initialRatePct: 0.5 };
  if (kind === 'wholeFixed') return { id: newProductId(), kind, initialRatePct: 1.9 };
  return { id: newProductId(), kind: 'fixedPeriod', fixedYears: 10, initialRatePct: 1.5, afterRatePct: 1.0 };
}

export function RateSimulatorScreen({
  state,
  onChange,
  theme,
  onExportScenario,
  onImportScenario,
  plansState,
  onApplyProductToPlan,
  onApplyScenarioToPlan,
}: RateSimulatorScreenProps) {
  const [subTab, setSubTab] = useState<SubTabId>('compare');

  const activeTemplate =
    RATE_TEMPLATES.find((t) => t.id === state.templateId) ?? RATE_TEMPLATES[0];

  const changeInput = (patch: Partial<RateSimInput>) =>
    onChange((prev) => ({ ...prev, input: { ...prev.input, ...patch } }));

  // テンプレ選択は「比較の商品」を読み込むだけ。編集中のシナリオは保持する。
  const selectTemplate = (templateId: string) =>
    onChange((prev) => {
      const t = RATE_TEMPLATES.find((x) => x.id === templateId);
      if (!t) return prev;
      return { ...prev, templateId, products: cloneProducts(t.products) };
    });

  const changeProduct = (id: string, patch: Partial<RateProductDef>) =>
    onChange((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));

  const addProduct = (kind: RateKind) =>
    onChange((prev) => ({ ...prev, products: [...prev.products, makeProduct(kind)] }));

  const removeProduct = (id: string) =>
    onChange((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== id) }));

  const changeScenario = (updater: (prev: RateScenario) => RateScenario) =>
    onChange((prev) => ({ ...prev, scenario: updater(prev.scenario) }));

  const loadFlat = () =>
    onChange((prev) => ({ ...prev, scenario: flatScenarioFromTemplate(activeTemplate) }));
  const loadRising = () =>
    onChange((prev) => ({ ...prev, scenario: risingScenarioFromTemplate(activeTemplate) }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* サブタブ */}
      <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition sm:px-3 sm:text-sm ${
              subTab === t.id
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'history' ? (
        <RateHistoryPanel theme={theme} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          <div className="min-w-0 lg:col-span-1">
            <RateInputPanel
              input={state.input}
              templateId={state.templateId}
              onChangeInput={changeInput}
              onSelectTemplate={selectTemplate}
            />
          </div>
          <div className="min-w-0 lg:col-span-2 lg:sticky lg:top-20 lg:self-start lg:block space-y-6">
            {subTab === 'compare' ? (
              <RateComparePanel
                input={state.input}
                products={state.products}
                theme={theme}
                onChangeProduct={changeProduct}
                onAddProduct={addProduct}
                onRemoveProduct={removeProduct}
                plansState={plansState}
                onApplyProductToPlan={onApplyProductToPlan}
              />
            ) : (
              <RateScenarioPanel
                input={state.input}
                scenario={state.scenario}
                theme={theme}
                onChangeScenario={changeScenario}
                onLoadFlat={loadFlat}
                onLoadRising={loadRising}
                onExport={onExportScenario}
                onImport={onImportScenario}
                plansState={plansState}
                onApplyScenarioToPlan={onApplyScenarioToPlan}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
