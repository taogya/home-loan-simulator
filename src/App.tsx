import { useEffect, useMemo, useState } from 'react'
import { InputPanel } from './components/InputPanel'
import { StatHighlight } from './components/StatHighlight'
import { BalanceChart } from './components/BalanceChart'
import { CashFlowChart } from './components/CashFlowChart'
import { SavingsChart } from './components/SavingsChart'
import { PlanTabs } from './components/PlanTabs'
import { ComparePanel } from './components/ComparePanel'
import { PlanMenu } from './components/PlanMenu'
import { simulatePlan } from './lib/plan'
import { loadPlans, savePlans } from './lib/storage'
import { formatYen } from './lib/format'
import { DEFAULT_FORM } from './types'
import type { ExpenseItem, FormState, LifeEvent, Plan, PlansState } from './types'
import { useTheme } from './hooks/useTheme'

const CHART_TABS = [
  { id: 'balance', label: '残高' },
  { id: 'cashflow', label: 'キャッシュフロー' },
  { id: 'savings', label: '貯金' },
] as const

type ChartTabId = (typeof CHART_TABS)[number]['id']

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

function App() {
  const { theme, toggle } = useTheme()
  const [plansState, setPlansState] = useState<PlansState>(loadPlans)
  const [chartTab, setChartTab] = useState<ChartTabId>('balance')
  const [viewMode, setViewMode] = useState<'edit' | 'compare'>('edit')

  useEffect(() => {
    savePlans(plansState)
  }, [plansState])

  const { plans, activeId } = plansState
  const activePlan = plans.find((p) => p.id === activeId) ?? plans[0]
  const form = activePlan.form

  const update = (patch: Partial<FormState>) =>
    setPlansState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === prev.activeId ? { ...p, form: { ...p.form, ...patch } } : p,
      ),
    }))

  const addEvent = (event: LifeEvent) =>
    setPlansState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === prev.activeId
          ? { ...p, form: { ...p.form, events: [...p.form.events, event] } }
          : p,
      ),
    }))

  const removeEvent = (id: string) =>
    setPlansState((prev) => ({
      ...prev,
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
    }))

  const updateEvent = (id: string, patch: Partial<LifeEvent>) =>
    setPlansState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === prev.activeId
          ? {
              ...p,
              form: {
                ...p.form,
                events: p.form.events.map((e) =>
                  e.id === id ? { ...e, ...patch } : e,
                ),
              },
            }
          : p,
      ),
    }))

  const addExpense = (item: ExpenseItem) =>
    setPlansState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === prev.activeId
          ? { ...p, form: { ...p.form, expenses: [...p.form.expenses, item] } }
          : p,
      ),
    }))

  const removeExpense = (id: string) =>
    setPlansState((prev) => ({
      ...prev,
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
    }))

  const updateExpense = (id: string, patch: Partial<ExpenseItem>) =>
    setPlansState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === prev.activeId
          ? {
              ...p,
              form: {
                ...p.form,
                expenses: p.form.expenses.map((e) =>
                  e.id === id ? { ...e, ...patch } : e,
                ),
              },
            }
          : p,
      ),
    }))

  const selectPlan = (id: string) =>
    setPlansState((prev) => ({ ...prev, activeId: id }))

  const addPlan = () =>
    setPlansState((prev) => {
      const plan: Plan = {
        id: crypto.randomUUID(),
        name: `プラン${String.fromCharCode(65 + prev.plans.length)}`,
        form: DEFAULT_FORM,
      }
      return { ...prev, plans: [...prev.plans, plan], activeId: plan.id }
    })

  const duplicatePlan = () =>
    setPlansState((prev) => {
      const src = prev.plans.find((p) => p.id === prev.activeId) ?? prev.plans[0]
      const plan: Plan = {
        id: crypto.randomUUID(),
        name: `${src.name}のコピー`,
        form: { ...src.form, events: [...src.form.events] },
      }
      return { ...prev, plans: [...prev.plans, plan], activeId: plan.id }
    })

  const removePlan = () =>
    setPlansState((prev) => {
      if (prev.plans.length <= 1) return prev
      const plans = prev.plans.filter((p) => p.id !== prev.activeId)
      return { ...prev, plans, activeId: plans[0].id }
    })

  const renamePlan = (id: string, name: string) =>
    setPlansState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => (p.id === id ? { ...p, name } : p)),
    }))

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
            plans: parsed.plans.map((p) => ({
              ...p,
              form: { ...DEFAULT_FORM, ...p.form },
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

  const result = useMemo(() => simulatePlan(form), [form])

  const burdenColor =
    result.repaymentBurdenPct < 25
      ? 'text-emerald-600 dark:text-emerald-400'
      : result.repaymentBurdenPct < 35
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400'

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              おうちとお金の未来シミュレータ
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              住宅ローンを「返す」ためのライフプラン
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <PlanMenu onExport={exportJson} onImport={importJson} />
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

      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <LockIcon />
          入力内容はこの端末の中だけに保存され、外部には送信されません
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-3">
        <PlanTabs
          plans={plans}
          activeId={activeId}
          onSelect={selectPlan}
          onAdd={addPlan}
          onDuplicate={duplicatePlan}
          onRemove={removePlan}
          onRename={renamePlan}
        />
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {viewMode === 'compare' ? (
          <ComparePanel plans={plans} theme={theme} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <InputPanel
            value={form}
            onChange={update}
            events={form.events}
            onAddEvent={addEvent}
            onRemoveEvent={removeEvent}
            onUpdateEvent={updateEvent}
            expenses={form.expenses}
            onAddExpense={addExpense}
            onRemoveExpense={removeExpense}
            onUpdateExpense={updateExpense}
          />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <StatHighlight result={result} />
          <div className="space-y-3">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
              {CHART_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setChartTab(t.id)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    chartTab === t.id
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {chartTab === 'balance' && (
              <BalanceChart
                schedule={result.schedule}
                theme={theme}
                events={form.events}
              />
            )}
            {chartTab === 'cashflow' && (
              <CashFlowChart data={result.schedule} theme={theme} />
            )}
            {chartTab === 'savings' && (
              <SavingsChart
                data={result.schedule}
                theme={theme}
                events={form.events}
              />
            )}
          </div>
        </div>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2">
        <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-600">
          本ツールの計算結果は概算です。実際の借入条件・税制・手数料・ボーナス払い等とは異なる場合があります。
          借入や投資の判断は、金融機関や専門家にご相談ください。
        </p>
      </footer>

      {/* スクロール追従の結果サマリー */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-around gap-3 px-4 py-2">
          <div className="text-center">
            <p className="text-[10px] leading-tight text-slate-400 dark:text-slate-500">
              完済予定
            </p>
            <p className="text-base font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
              {result.payoffAge}歳
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="text-center">
            <p className="text-[10px] leading-tight text-slate-400 dark:text-slate-500">
              毎月返済
            </p>
            <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
              {formatYen(result.monthlyPayment)}円
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="text-center">
            <p className="text-[10px] leading-tight text-slate-400 dark:text-slate-500">
              返済負担率
            </p>
            <p className={`text-base font-bold tabular-nums ${burdenColor}`}>
              {result.repaymentBurdenPct.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
