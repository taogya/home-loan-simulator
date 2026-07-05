import { useEffect, useMemo, useState } from 'react'
import { InputPanel } from './components/InputPanel'
import { StatHighlight } from './components/StatHighlight'
import { BalanceChart } from './components/BalanceChart'
import { CashFlowChart } from './components/CashFlowChart'
import { SavingsChart } from './components/SavingsChart'
import { PlanTabs } from './components/PlanTabs'
import { ComparePanel } from './components/ComparePanel'
import { PlanMenu, type AppScreen } from './components/PlanMenu'
import { PlanWizard } from './components/PlanWizard'
import { RateSimulatorScreen } from './components/rate/RateSimulatorScreen'
import { simulatePlan, mergeCommonForm } from './lib/plan'
import { loadPlans, savePlans, normalizeForm } from './lib/storage'
import {
  loadRateState,
  saveRateState,
  type RateSimState,
} from './lib/rateStorage'
import { isValidScenario, normalizeScenario } from './lib/rate'
import { formatYen, formatManLabel } from './lib/format'
import { DEFAULT_FORM, emptyCommon } from './types'
import type {
  ExpenseItem,
  FormState,
  IncomeItem,
  LifeEvent,
  Plan,
  PlansState,
} from './types'
import { useTheme } from './hooks/useTheme'

const CHART_TABS = [
  { id: 'balance', label: '残高' },
  { id: 'cashflow', label: '収支' },
  { id: 'savings', label: '貯金' },
] as const

type ChartTabId = (typeof CHART_TABS)[number]['id']

function ChartTabIcon({ id }: { id: ChartTabId }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-3.5 w-3.5',
    'aria-hidden': true,
  }
  if (id === 'balance')
    return (
      <svg {...common}>
        <path d="M20 7l-6 6-4-4-6 6" />
      </svg>
    )
  if (id === 'cashflow')
    return (
      <svg {...common}>
        <path d="M5 20V11M10 20V5M15 20V13M20 20V8" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M4 16l6-6 4 4 6-7" />
      <path d="M4 21h16" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.6 8.21 11.16.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.73-1.34-1.73-1.09-.73.08-.71.08-.71 1.21.08 1.84 1.22 1.84 1.22 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.83 0-1.29.47-2.34 1.23-3.17-.12-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.21.96-.26 1.98-.39 3-.4 1.02 0 2.04.14 3 .4 2.28-1.53 3.29-1.21 3.29-1.21.66 1.64.24 2.86.12 3.16.77.83 1.23 1.88 1.23 3.17 0 4.53-2.81 5.52-5.49 5.81.43.36.81 1.09.81 2.2 0 1.59-.01 2.87-.01 3.26 0 .31.21.68.83.56C20.57 21.88 24 17.48 24 12.29 24 5.78 18.63.5 12 .5z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

/** アクティブプランの form だけを書き換えた新しい state を返す。 */
function patchActivePlanForm(
  prev: PlansState,
  fn: (form: FormState) => FormState,
): PlansState {
  return {
    ...prev,
    plans: prev.plans.map((p) =>
      p.id === prev.activeId ? { ...p, form: fn(p.form) } : p,
    ),
  }
}

/** 項目のIDを振り直した form の複製を返す（プラン間のID衝突を防ぐ）。 */
function cloneFormWithFreshIds(form: FormState): FormState {
  return {
    ...form,
    incomes: form.incomes.map((i) => ({ ...i, id: crypto.randomUUID() })),
    expenses: form.expenses.map((e) => ({ ...e, id: crypto.randomUUID() })),
    events: form.events.map((e) => ({ ...e, id: crypto.randomUUID() })),
  }
}

function WelcomeHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
          aria-hidden="true"
        >
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9 21v-6h6v6" />
        </svg>
      </div>
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        住宅ローン後の暮らしを、シミュレーション
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        完済年齢・毎月の返済・家計のキャッシュフロー・貯金の推移をまとめて確認。代表的な項目を入力するだけで、教育費・修繕費・車の買い替えなども自動で用意します。
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-7 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700"
      >
        シミュレーションを始める
      </button>
      <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <LockIcon />
        入力内容はこの端末にだけ保存されます
      </p>
    </div>
  )
}

function App() {
  const { theme, toggle } = useTheme()
  const [plansState, setPlansState] = useState<PlansState>(loadPlans)
  const [chartTab, setChartTab] = useState<ChartTabId>('balance')
  const [viewMode, setViewMode] = useState<'edit' | 'compare'>('edit')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'input' | 'result'>('input')
  const [screen, setScreen] = useState<AppScreen>('lifeplan')
  const [rateState, setRateState] = useState<RateSimState>(loadRateState)

  useEffect(() => {
    savePlans(plansState)
  }, [plansState])

  useEffect(() => {
    saveRateState(rateState)
  }, [rateState])

  const { plans, activeId, common } = plansState
  const activePlan = plans.find((p) => p.id === activeId) ?? plans[0]
  const form = activePlan?.form ?? DEFAULT_FORM

  const update = (patch: Partial<FormState>) =>
    setPlansState((prev) =>
      patchActivePlanForm(prev, (f) => ({ ...f, ...patch })),
    )

  // ライフイベント（共通プールにあれば共通を、なければアクティブプランを更新）
  const addEvent = (event: LifeEvent) =>
    setPlansState((prev) =>
      patchActivePlanForm(prev, (f) => ({ ...f, events: [...f.events, event] })),
    )
  const removeEvent = (id: string) =>
    setPlansState((prev) =>
      prev.common.events.some((e) => e.id === id)
        ? {
            ...prev,
            common: {
              ...prev.common,
              events: prev.common.events.filter((e) => e.id !== id),
            },
          }
        : patchActivePlanForm(prev, (f) => ({
            ...f,
            events: f.events.filter((e) => e.id !== id),
          })),
    )
  const updateEvent = (id: string, patch: Partial<LifeEvent>) =>
    setPlansState((prev) =>
      prev.common.events.some((e) => e.id === id)
        ? {
            ...prev,
            common: {
              ...prev.common,
              events: prev.common.events.map((e) =>
                e.id === id ? { ...e, ...patch } : e,
              ),
            },
          }
        : patchActivePlanForm(prev, (f) => ({
            ...f,
            events: f.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          })),
    )
  const toggleCommonEvent = (id: string) =>
    setPlansState((prev) => {
      const c = prev.common.events.find((e) => e.id === id)
      if (c) {
        return {
          ...prev,
          common: {
            ...prev.common,
            events: prev.common.events.filter((e) => e.id !== id),
          },
          plans: prev.plans.map((p) => ({
            ...p,
            form: {
              ...p.form,
              events: [...p.form.events, { ...c, id: crypto.randomUUID() }],
            },
          })),
        }
      }
      const item = prev.plans
        .find((p) => p.id === prev.activeId)
        ?.form.events.find((e) => e.id === id)
      if (!item) return prev
      return {
        ...prev,
        common: { ...prev.common, events: [...prev.common.events, item] },
        plans: prev.plans.map((p) =>
          p.id === prev.activeId
            ? {
                ...p,
                form: {
                  ...p.form,
                  events: p.form.events.filter((e) => e.id !== id),
                },
              }
            : p,
        ),
      }
    })

  // 毎月の支出
  const addExpense = (item: ExpenseItem) =>
    setPlansState((prev) =>
      patchActivePlanForm(prev, (f) => ({
        ...f,
        expenses: [...f.expenses, item],
      })),
    )
  const removeExpense = (id: string) =>
    setPlansState((prev) =>
      prev.common.expenses.some((e) => e.id === id)
        ? {
            ...prev,
            common: {
              ...prev.common,
              expenses: prev.common.expenses.filter((e) => e.id !== id),
            },
          }
        : patchActivePlanForm(prev, (f) => ({
            ...f,
            expenses: f.expenses.filter((e) => e.id !== id),
          })),
    )
  const updateExpense = (id: string, patch: Partial<ExpenseItem>) =>
    setPlansState((prev) =>
      prev.common.expenses.some((e) => e.id === id)
        ? {
            ...prev,
            common: {
              ...prev.common,
              expenses: prev.common.expenses.map((e) =>
                e.id === id ? { ...e, ...patch } : e,
              ),
            },
          }
        : patchActivePlanForm(prev, (f) => ({
            ...f,
            expenses: f.expenses.map((e) =>
              e.id === id ? { ...e, ...patch } : e,
            ),
          })),
    )
  const toggleCommonExpense = (id: string) =>
    setPlansState((prev) => {
      const c = prev.common.expenses.find((e) => e.id === id)
      if (c) {
        return {
          ...prev,
          common: {
            ...prev.common,
            expenses: prev.common.expenses.filter((e) => e.id !== id),
          },
          plans: prev.plans.map((p) => ({
            ...p,
            form: {
              ...p.form,
              expenses: [...p.form.expenses, { ...c, id: crypto.randomUUID() }],
            },
          })),
        }
      }
      const item = prev.plans
        .find((p) => p.id === prev.activeId)
        ?.form.expenses.find((e) => e.id === id)
      if (!item) return prev
      return {
        ...prev,
        common: { ...prev.common, expenses: [...prev.common.expenses, item] },
        plans: prev.plans.map((p) =>
          p.id === prev.activeId
            ? {
                ...p,
                form: {
                  ...p.form,
                  expenses: p.form.expenses.filter((e) => e.id !== id),
                },
              }
            : p,
        ),
      }
    })

  // グループ単位で共通/専用をまとめて切り替える
  const setCommonExpenses = (ids: string[], toCommon: boolean) =>
    setPlansState((prev) => {
      const idSet = new Set(ids)
      if (toCommon) {
        const active = prev.plans.find((p) => p.id === prev.activeId)
        if (!active) return prev
        const moving = active.form.expenses.filter((e) => idSet.has(e.id))
        if (moving.length === 0) return prev
        const movingIds = new Set(moving.map((e) => e.id))
        return {
          ...prev,
          common: {
            ...prev.common,
            expenses: [...prev.common.expenses, ...moving],
          },
          plans: prev.plans.map((p) =>
            p.id === prev.activeId
              ? {
                  ...p,
                  form: {
                    ...p.form,
                    expenses: p.form.expenses.filter((e) => !movingIds.has(e.id)),
                  },
                }
              : p,
          ),
        }
      }
      const moving = prev.common.expenses.filter((e) => idSet.has(e.id))
      if (moving.length === 0) return prev
      const movingIds = new Set(moving.map((e) => e.id))
      return {
        ...prev,
        common: {
          ...prev.common,
          expenses: prev.common.expenses.filter((e) => !movingIds.has(e.id)),
        },
        plans: prev.plans.map((p) => ({
          ...p,
          form: {
            ...p.form,
            expenses: [
              ...p.form.expenses,
              ...moving.map((e) => ({ ...e, id: crypto.randomUUID() })),
            ],
          },
        })),
      }
    })

  const setCommonEvents = (ids: string[], toCommon: boolean) =>
    setPlansState((prev) => {
      const idSet = new Set(ids)
      if (toCommon) {
        const active = prev.plans.find((p) => p.id === prev.activeId)
        if (!active) return prev
        const moving = active.form.events.filter((e) => idSet.has(e.id))
        if (moving.length === 0) return prev
        const movingIds = new Set(moving.map((e) => e.id))
        return {
          ...prev,
          common: {
            ...prev.common,
            events: [...prev.common.events, ...moving],
          },
          plans: prev.plans.map((p) =>
            p.id === prev.activeId
              ? {
                  ...p,
                  form: {
                    ...p.form,
                    events: p.form.events.filter((e) => !movingIds.has(e.id)),
                  },
                }
              : p,
          ),
        }
      }
      const moving = prev.common.events.filter((e) => idSet.has(e.id))
      if (moving.length === 0) return prev
      const movingIds = new Set(moving.map((e) => e.id))
      return {
        ...prev,
        common: {
          ...prev.common,
          events: prev.common.events.filter((e) => !movingIds.has(e.id)),
        },
        plans: prev.plans.map((p) => ({
          ...p,
          form: {
            ...p.form,
            events: [
              ...p.form.events,
              ...moving.map((e) => ({ ...e, id: crypto.randomUUID() })),
            ],
          },
        })),
      }
    })

  // 収入
  const addIncome = (item: IncomeItem) =>
    setPlansState((prev) =>
      patchActivePlanForm(prev, (f) => ({ ...f, incomes: [...f.incomes, item] })),
    )
  const removeIncome = (id: string) =>
    setPlansState((prev) =>
      prev.common.incomes.some((i) => i.id === id)
        ? {
            ...prev,
            common: {
              ...prev.common,
              incomes: prev.common.incomes.filter((i) => i.id !== id),
            },
          }
        : patchActivePlanForm(prev, (f) => ({
            ...f,
            incomes: f.incomes.filter((i) => i.id !== id),
          })),
    )
  const updateIncome = (id: string, patch: Partial<IncomeItem>) =>
    setPlansState((prev) =>
      prev.common.incomes.some((i) => i.id === id)
        ? {
            ...prev,
            common: {
              ...prev.common,
              incomes: prev.common.incomes.map((i) =>
                i.id === id ? { ...i, ...patch } : i,
              ),
            },
          }
        : patchActivePlanForm(prev, (f) => ({
            ...f,
            incomes: f.incomes.map((i) => (i.id === id ? { ...i, ...patch } : i)),
          })),
    )
  const toggleCommonIncome = (id: string) =>
    setPlansState((prev) => {
      const c = prev.common.incomes.find((i) => i.id === id)
      if (c) {
        return {
          ...prev,
          common: {
            ...prev.common,
            incomes: prev.common.incomes.filter((i) => i.id !== id),
          },
          plans: prev.plans.map((p) => ({
            ...p,
            form: {
              ...p.form,
              incomes: [...p.form.incomes, { ...c, id: crypto.randomUUID() }],
            },
          })),
        }
      }
      const item = prev.plans
        .find((p) => p.id === prev.activeId)
        ?.form.incomes.find((i) => i.id === id)
      if (!item) return prev
      return {
        ...prev,
        common: { ...prev.common, incomes: [...prev.common.incomes, item] },
        plans: prev.plans.map((p) =>
          p.id === prev.activeId
            ? {
                ...p,
                form: {
                  ...p.form,
                  incomes: p.form.incomes.filter((i) => i.id !== id),
                },
              }
            : p,
        ),
      }
    })

  const selectPlan = (id: string) =>
    setPlansState((prev) => ({ ...prev, activeId: id }))

  const goPlan = (dir: number) => {
    const idx = plans.findIndex((p) => p.id === activeId)
    const next = idx + dir
    if (next >= 0 && next < plans.length) selectPlan(plans[next].id)
  }

  const makePlanName = (count: number) =>
    `プラン${String.fromCharCode(65 + count)}`

  const createPlanFromWizard = (form: FormState) => {
    setPlansState((prev) => {
      // すでに共通(📌)になっている項目と同名のものは作らない（共通を優先・重複防止）
      const commonExpenseLabels = new Set(
        prev.common.expenses.map((e) => e.label),
      )
      const commonEventLabels = new Set(prev.common.events.map((e) => e.label))
      const commonIncomeLabels = new Set(prev.common.incomes.map((i) => i.label))
      const dedupedForm: FormState = {
        ...form,
        expenses: form.expenses.filter(
          (e) => !commonExpenseLabels.has(e.label),
        ),
        events: form.events.filter((e) => !commonEventLabels.has(e.label)),
        incomes: form.incomes.filter((i) => !commonIncomeLabels.has(i.label)),
      }
      const plan: Plan = {
        id: crypto.randomUUID(),
        name: makePlanName(prev.plans.length),
        form: dedupedForm,
      }
      return { ...prev, plans: [...prev.plans, plan], activeId: plan.id }
    })
    setViewMode('edit')
    setWizardOpen(false)
  }

  const createBlankPlan = () => {
    setPlansState((prev) => {
      const plan: Plan = {
        id: crypto.randomUUID(),
        name: makePlanName(prev.plans.length),
        form: cloneFormWithFreshIds(DEFAULT_FORM),
      }
      return { ...prev, plans: [...prev.plans, plan], activeId: plan.id }
    })
    setViewMode('edit')
    setWizardOpen(false)
  }

  const duplicatePlan = () =>
    setPlansState((prev) => {
      const src = prev.plans.find((p) => p.id === prev.activeId) ?? prev.plans[0]
      const plan: Plan = {
        id: crypto.randomUUID(),
        name: `${src.name}のコピー`,
        form: cloneFormWithFreshIds(src.form),
      }
      return { ...prev, plans: [...prev.plans, plan], activeId: plan.id }
    })

  const removePlan = () =>
    setPlansState((prev) => {
      const plans = prev.plans.filter((p) => p.id !== prev.activeId)
      // すべてのプランを削除したら共通設定もリセット（まっさらな状態から始められるように）
      if (plans.length === 0) {
        return { ...prev, plans, activeId: '', common: emptyCommon() }
      }
      return { ...prev, plans, activeId: plans[0]?.id ?? '' }
    })

  const renamePlan = (id: string, name: string) =>
    setPlansState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => (p.id === id ? { ...p, name } : p)),
    }))

  const reorderPlans = (fromId: string, toId: string) =>
    setPlansState((prev) => {
      const fromIdx = prev.plans.findIndex((p) => p.id === fromId)
      const toIdx = prev.plans.findIndex((p) => p.id === toId)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev
      const plans = [...prev.plans]
      const [moved] = plans.splice(fromIdx, 1)
      plans.splice(toIdx, 0, moved)
      return { ...prev, plans }
    })

  const exportJson = () => {
    const data = JSON.stringify(plansState, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'home-loan-plans.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const importJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as PlansState
        if (parsed.plans && parsed.plans.length > 0) {
          setPlansState({
            version: 1,
            common: { ...emptyCommon(), ...(parsed.common ?? {}) },
            plans: parsed.plans.map((p) => ({
              ...p,
              form: normalizeForm(p.form),
            })),
            activeId: parsed.activeId ?? parsed.plans[0].id,
          })
          setViewMode('edit')
        }
      } catch {
        window.alert('ファイルを読み込めませんでした。JSON形式をご確認ください。')
      }
    }
    reader.readAsText(file)
  }

  // 金利シナリオのエクスポート（金利シミュレータ画面用）
  const exportScenario = () => {
    const data = JSON.stringify(rateState.scenario, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rate-scenario.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // 金利シナリオのインポート（金利シミュレータ画面用）
  const importScenario = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        if (isValidScenario(parsed)) {
          setRateState((prev) => ({ ...prev, scenario: normalizeScenario(parsed) }))
        } else {
          window.alert(
            'このファイルは金利シナリオではないようです。金利シミュレータで保存したJSONをご確認ください。',
          )
        }
      } catch {
        window.alert('ファイルを読み込めませんでした。JSON形式をご確認ください。')
      }
    }
    reader.readAsText(file)
  }

  // メニューのインポート／エクスポートは画面ごとに役割が異なる
  const handleMenuExport = () => (screen === 'rate' ? exportScenario() : exportJson())
  const handleMenuImport = (file: File) =>
    screen === 'rate' ? importScenario(file) : importJson(file)

  const result = useMemo(
    () => simulatePlan(mergeCommonForm(form, common)),
    [form, common],
  )

  // 共通＋専用を合成して入力欄に渡す（共通項目は📌で識別）
  const commonIds = new Set<string>([
    ...common.incomes.map((i) => i.id),
    ...common.expenses.map((e) => e.id),
    ...common.events.map((e) => e.id),
  ])
  const mergedIncomes = [...common.incomes, ...form.incomes]
  const mergedExpenses = [...common.expenses, ...form.expenses]
  const mergedEvents = [...common.events, ...form.events]

  // 貯蓄が一度でもマイナスになる時期（フローティングカードで警告するため）
  const firstNegativeSaving = result.schedule.find((s) => s.savings < 0)

  const burdenColor =
    result.repaymentBurdenPct < 25
      ? 'text-emerald-600 dark:text-emerald-400'
      : result.repaymentBurdenPct < 35
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400'

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              おうちとお金の未来シミュレータ
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {screen === 'rate'
                ? '金利シミュレータ｜プラン比較・金利シナリオ・過去の金利'
                : '住宅ローンを「返す」ためのライフプラン'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {screen === 'lifeplan' && plans.length > 0 && (
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {(
                  [
                    ['edit', '編集'],
                    ['compare', '比較'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                      viewMode === mode
                        ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <PlanMenu
              screen={screen}
              onNavigate={setScreen}
              onExport={handleMenuExport}
              onImport={handleMenuImport}
            />
            <a
              href="https://github.com/taogya/home-loan-simulator"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="GitHub リポジトリを開く"
              title="GitHub で見る"
            >
              <GitHubIcon />
            </a>
            <button
              type="button"
              onClick={toggle}
              className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="テーマを切り替える"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </header>

      {screen === 'rate' && (
        <RateSimulatorScreen
          state={rateState}
          onChange={setRateState}
          theme={theme}
          onExportScenario={exportScenario}
          onImportScenario={importScenario}
        />
      )}

      {screen === 'lifeplan' && (
      <>
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <LockIcon />
          入力内容はこの端末の中だけに保存され、外部には送信されません
        </div>
        {plans.length > 0 && (
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            📌 が付いた項目は全プラン共通です。各項目の 📌 をタップで「共通／このプラン専用」を切り替えられます。
          </p>
        )}
      </div>

      {plans.length === 0 ? (
        <WelcomeHero onStart={() => setWizardOpen(true)} />
      ) : (
        <>
      <div className="mx-auto max-w-6xl px-4 pt-3">
        <PlanTabs
          plans={plans}
          activeId={activeId}
          onSelect={selectPlan}
          onAdd={() => setWizardOpen(true)}
          onDuplicate={duplicatePlan}
          onRemove={removePlan}
          onRename={renamePlan}
          onReorder={reorderPlans}
        />
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {viewMode === 'compare' ? (
          <ComparePanel plans={plans} common={common} theme={theme} />
        ) : (
          <>
          <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60 lg:hidden">
            {(
              [
                ['input', '入力'],
                ['result', '結果'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setMobileView(v)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  mobileView === v
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div
          className={`lg:col-span-1 lg:block ${
            mobileView === 'input' ? '' : 'hidden'
          }`}
        >
          <InputPanel
            value={form}
            onChange={update}
            events={mergedEvents}
            onAddEvent={addEvent}
            onRemoveEvent={removeEvent}
            onUpdateEvent={updateEvent}
            onToggleCommonEvent={toggleCommonEvent}
            onSetCommonEvents={setCommonEvents}
            expenses={mergedExpenses}
            onAddExpense={addExpense}
            onRemoveExpense={removeExpense}
            onUpdateExpense={updateExpense}
            onToggleCommonExpense={toggleCommonExpense}
            onSetCommonExpenses={setCommonExpenses}
            incomes={mergedIncomes}
            onAddIncome={addIncome}
            onRemoveIncome={removeIncome}
            onUpdateIncome={updateIncome}
            onToggleCommonIncome={toggleCommonIncome}
            commonIds={commonIds}
          />
        </div>
        <div
          className={`space-y-6 lg:col-span-2 lg:sticky lg:top-20 lg:self-start lg:block ${
            mobileView === 'result' ? '' : 'hidden'
          }`}
        >
          <StatHighlight result={result} />
          <div className="space-y-3">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
              {CHART_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setChartTab(t.id)}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                    chartTab === t.id
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  <ChartTabIcon id={t.id} />
                  {t.label}
                </button>
              ))}
            </div>
            {chartTab === 'balance' && (
              <BalanceChart
                schedule={result.schedule}
                theme={theme}
                events={mergedEvents}
                payoffAge={result.payoffAge}
                isRent={result.housingType === 'rent'}
              />
            )}
            {chartTab === 'cashflow' && (
              <CashFlowChart
                data={result.schedule}
                theme={theme}
                payoffAge={result.payoffAge}
              />
            )}
            {chartTab === 'savings' && (
              <SavingsChart
                data={result.schedule}
                theme={theme}
                events={mergedEvents}
                payoffAge={result.payoffAge}
              />
            )}
          </div>
        </div>
          </div>
          </>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2">
        <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-600">
          本ツールの計算結果は概算です。実際の借入条件・税制・手数料・ボーナス払い等とは異なる場合があります。
          借入や投資の判断は、金融機関や専門家にご相談ください。
        </p>
      </footer>

      {/* スクロール追従の結果サマリー */}
      <div className="fixed inset-x-0 bottom-3 z-20 px-3">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          {plans.length > 1 ? (
            <div className="mb-0.5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => goPlan(-1)}
                disabled={plans.findIndex((p) => p.id === activeId) <= 0}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                aria-label="前のプラン"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <p className="truncate text-center text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {activePlan?.name}
              </p>
              <button
                type="button"
                onClick={() => goPlan(1)}
                disabled={plans.findIndex((p) => p.id === activeId) >= plans.length - 1}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                aria-label="次のプラン"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          ) : (
            <p className="mb-0.5 truncate text-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
              {activePlan?.name}
            </p>
          )}
          {firstNegativeSaving && (
            <div className="mb-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              {firstNegativeSaving.age}歳ごろ貯蓄がマイナスになります
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </span>
              <div className="leading-tight">
                <p className="text-[9px] text-slate-400 dark:text-slate-500">
                  {result.housingType === 'rent' ? '住居' : '完済'}
                </p>
                {result.housingType === 'rent' ? (
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    賃貸
                  </p>
                ) : (
                  <p className="text-sm font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                    {result.payoffAge}
                    <span className="text-[10px] font-medium">歳</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M3 3v18h18" />
                  <path d="M7 13l3-3 3 2 5-6" />
                </svg>
              </span>
              <div className="leading-tight">
                <p className="text-[9px] text-slate-400 dark:text-slate-500">
                  負担率
                </p>
                <p className={`text-sm font-bold tabular-nums ${burdenColor}`}>
                  {result.repaymentBurdenPct.toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9 9l3 4 3-4M9.5 13.5h5M9.5 16h5M12 13v4" />
                </svg>
              </span>
              <div className="leading-tight">
                <p className="text-[9px] text-slate-400 dark:text-slate-500">
                  毎月
                </p>
                <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                  {formatYen(result.housingType === 'rent' ? result.monthlyRent : result.monthlyPayment)}
                  <span className="text-[10px] font-medium">円</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M4 17l6-6 4 4 6-7" />
                  <path d="M4 21h16" />
                </svg>
              </span>
              <div className="leading-tight">
                <p className="text-[9px] text-slate-400 dark:text-slate-500">
                  貯金ピーク
                </p>
                <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatManLabel(Math.round(result.maxSavings / 10000))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
      </>
      )}

      {wizardOpen && (
        <PlanWizard
          onCreate={createPlanFromWizard}
          onClose={() => setWizardOpen(false)}
          onCreateBlank={createBlankPlan}
        />
      )}
    </div>
  )
}

export default App
