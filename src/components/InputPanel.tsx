import { useState } from 'react';
import { NumberSlider } from './NumberSlider';
import { CollapsibleSection } from './CollapsibleSection';
import { formatManLabel } from '../lib/format';
import type { FormState, LifeEvent, ExpenseItem } from '../types';

const EXPENSE_PRESETS: { label: string; amountMan: number }[] = [
  { label: '生活費', amountMan: 20 },
  { label: '食費', amountMan: 5 },
  { label: '日用品', amountMan: 1 },
  { label: '水道光熱費', amountMan: 2 },
  { label: '通信費', amountMan: 1 },
  { label: 'サブスク', amountMan: 0.5 },
  { label: '車の維持費', amountMan: 2 },
  { label: '車のローン', amountMan: 3 },
  { label: '保険', amountMan: 2 },
  { label: '固定資産税', amountMan: 1 },
  { label: '修繕・管理費', amountMan: 1.5 },
  { label: '教育費', amountMan: 3 },
  { label: '奨学金返済', amountMan: 2 },
  { label: '医療費', amountMan: 1 },
  { label: '被服費', amountMan: 1 },
  { label: '交際費', amountMan: 2 },
  { label: '娯楽・趣味', amountMan: 2 },
  { label: 'こづかい', amountMan: 3 },
];

const LIFE_EVENT_PRESETS: {
  label: string;
  amountMan: number;
  yearsLater: number;
}[] = [
  { label: '車の買い替え', amountMan: 150, yearsLater: 7 },
  { label: 'リフォーム', amountMan: 300, yearsLater: 15 },
  { label: '外壁・屋根の修繕', amountMan: 150, yearsLater: 12 },
  { label: '給湯器の交換', amountMan: 30, yearsLater: 12 },
  { label: 'エアコン買い替え', amountMan: 15, yearsLater: 10 },
  { label: '出産', amountMan: 50, yearsLater: 2 },
  { label: '入学（大学）', amountMan: 100, yearsLater: 18 },
  { label: '結婚式', amountMan: 300, yearsLater: 3 },
  { label: '家族旅行', amountMan: 30, yearsLater: 5 },
  { label: '家電の買い替え', amountMan: 20, yearsLater: 8 },
];

interface InputPanelProps {
  value: FormState;
  onChange: (patch: Partial<FormState>) => void;
  events: LifeEvent[];
  onAddEvent: (event: LifeEvent) => void;
  onRemoveEvent: (id: string) => void;
  onUpdateEvent: (id: string, patch: Partial<LifeEvent>) => void;
  expenses: ExpenseItem[];
  onAddExpense: (item: ExpenseItem) => void;
  onRemoveExpense: (id: string) => void;
  onUpdateExpense: (id: string, patch: Partial<ExpenseItem>) => void;
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3 text-slate-400 transition group-hover:text-indigo-500"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function PanelChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-5 w-5 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function InputPanel({
  value,
  onChange,
  events,
  onAddEvent,
  onRemoveEvent,
  onUpdateEvent,
  expenses,
  onAddExpense,
  onRemoveExpense,
  onUpdateExpense,
}: InputPanelProps) {
  const [open, setOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [evYearsLater, setEvYearsLater] = useState('5');
  const [evLabel, setEvLabel] = useState('');
  const [evError, setEvError] = useState(false);
  const [evSheetOpen, setEvSheetOpen] = useState(false);
  const [evAmount, setEvAmount] = useState('100');
  const [evRecurring, setEvRecurring] = useState(false);
  const [evInterval, setEvInterval] = useState('10');
  const [evUntilAge, setEvUntilAge] = useState(String(value.age + 30));
  const [customExpenseLabel, setCustomExpenseLabel] = useState('');
  const [expenseError, setExpenseError] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseDraft, setExpenseDraft] = useState('');

  const resetEventForm = () => {
    setEditingId(null);
    setEvYearsLater('5');
    setEvLabel('');
    setEvError(false);
    setEvAmount('100');
    setEvRecurring(false);
    setEvInterval('10');
    setEvUntilAge(String(value.age + 30));
  };

  const closeEvSheet = () => {
    resetEventForm();
    setEvSheetOpen(false);
  };

  const openPresetSheet = (preset: (typeof LIFE_EVENT_PRESETS)[number]) => {
    setEditingId(null);
    setEvYearsLater(String(preset.yearsLater));
    setEvLabel(preset.label);
    setEvError(false);
    setEvAmount(String(preset.amountMan));
    setEvRecurring(false);
    setEvInterval('10');
    setEvUntilAge(String(value.age + 30));
    setEvSheetOpen(true);
  };

  const startEditEvent = (e: LifeEvent) => {
    setEditingId(e.id);
    setEvYearsLater(String(Math.max(0, e.atAge - value.age)));
    setEvLabel(e.label);
    setEvError(false);
    setEvSheetOpen(true);
    setEvAmount(String(e.amountMan));
    setEvRecurring((e.intervalYears ?? 0) > 0);
    setEvInterval(String(e.intervalYears || 10));
    setEvUntilAge(String(e.untilAge ?? value.age + 30));
  };

  const handleSubmitEvent = () => {
    const label = evLabel.trim();
    if (!label) {
      setEvError(true);
      return;
    }
    const atAge = value.age + (Number(evYearsLater) || 0);
    const recurring = evRecurring;
    const payload = {
      atAge,
      label,
      amountMan: Number(evAmount) || 0,
      intervalYears: recurring ? Math.max(1, Number(evInterval) || 1) : 0,
      untilAge: recurring ? Math.max(atAge, Number(evUntilAge) || atAge) : undefined,
    };
    if (editingId) {
      onUpdateEvent(editingId, payload);
    } else {
      onAddEvent({ id: crypto.randomUUID(), ...payload });
    }
    resetEventForm();
    setEvSheetOpen(false);
  };

  const availablePresets = EXPENSE_PRESETS.filter(
    (p) => !expenses.some((e) => e.label === p.label),
  );
  const totalExpenseMan = expenses.reduce((sum, e) => sum + e.amountMan, 0);

  const handleAddCustomExpense = () => {
    const label = customExpenseLabel.trim();
    if (!label) {
      setExpenseError(true);
      return;
    }
    onAddExpense({ id: crypto.randomUUID(), label, amountMan: 3 });
    setCustomExpenseLabel('');
  };

  const startEditExpense = (id: string, current: number) => {
    setExpenseDraft(String(current));
    setEditingExpenseId(id);
  };
  const commitExpense = (id: string) => {
    const n = Number(expenseDraft);
    if (!Number.isNaN(n) && expenseDraft.trim() !== '') {
      onUpdateExpense(id, { amountMan: Math.max(0, n) });
    }
    setEditingExpenseId(null);
  };

  return (
    <div className="card p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            条件を入力
          </h2>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            まずは基本だけ。詳細は見出しを開いて調整できます
          </p>
        </div>
        <span className="text-slate-400 dark:text-slate-500">
          <PanelChevron open={open} />
        </span>
      </button>

      {open && (
        <div className="mt-6 space-y-6">
          <CollapsibleSection title="基本" defaultOpen>
      <NumberSlider
        label="借入額"
        value={value.loanAmountMan}
        min={0}
        max={10000}
        step={50}
        onChange={(v) => onChange({ loanAmountMan: v })}
        format={formatManLabel}
        hint="物件価格から頭金を引いた額"
      />
      <NumberSlider
        label="金利（年）"
        value={value.ratePct}
        min={0}
        max={5}
        step={0.05}
        onChange={(v) => onChange({ ratePct: v })}
        format={(v) => `${v.toFixed(2)}%`}
        hint="固定は変動より高め。金融機関によって異なります"
      />
      <NumberSlider
        label="返済期間"
        value={value.years}
        min={1}
        max={50}
        step={1}
        onChange={(v) => onChange({ years: v })}
        format={(v) => `${v}年`}
        hint="最長35年が一般的"
      />
      <NumberSlider

        label="借入時の年齢"
        value={value.age}
        min={18}
        max={70}
        step={1}
        onChange={(v) => onChange({ age: v })}
        format={(v) => `${v}歳`}
        hint="完済年齢の計算に使います"
      />
          </CollapsibleSection>

      {/* 収入（折りたたみ） */}
      <CollapsibleSection title="収入">
        <NumberSlider
          label="月給（額面）"
          value={value.monthlySalaryMan}
          min={10}
          max={200}
          step={1}
          onChange={(v) => onChange({ monthlySalaryMan: v })}
          format={formatManLabel}
          hint="税引き前の月給。手取りは自動で計算します"
        />
        <NumberSlider
          label="年間ボーナス（月給の何ヶ月分）"
          value={value.bonusMonths}
          min={0}
          max={8}
          step={0.5}
          onChange={(v) => onChange({ bonusMonths: v })}
          format={(v) => `${v}ヶ月`}
          hint="夏・冬あわせた年間の合計"
        />
        <NumberSlider
          label="昇給率"
          value={value.raiseRatePct}
          min={0}
          max={5}
          step={0.1}
          onChange={(v) => onChange({ raiseRatePct: v })}
          format={(v) => `${v.toFixed(1)}%`}
          hint="1年で年収が上がる割合（夏冬合算）"
        />
        <NumberSlider
          label="昇給停止年齢"
          value={value.raiseStopAge}
          min={40}
          max={70}
          step={1}
          onChange={(v) => onChange({ raiseStopAge: v })}
          format={(v) => `${v}歳`}
          hint="この年齢で昇給が止まり、以降の年収は横ばいになります"
        />
        <NumberSlider
          label="配偶者の年収"
          value={value.spouseIncomeMan}
          min={0}
          max={1500}
          step={10}
          onChange={(v) => onChange({ spouseIncomeMan: v })}
          format={formatManLabel}
          hint="なければ 0 のまま"
        />
        <NumberSlider
          label="副収入"
          value={value.sideIncomeMan}
          min={0}
          max={500}
          step={10}
          onChange={(v) => onChange({ sideIncomeMan: v })}
          format={formatManLabel}
          hint="副業・家賃収入など（年）"
        />
      </CollapsibleSection>

      {/* 定年・年金（折りたたみ） */}
      <CollapsibleSection title="定年・年金">
        <NumberSlider
          label="定年退職の年齢"
          value={value.retireAge}
          min={55}
          max={75}
          step={1}
          onChange={(v) => onChange({ retireAge: v })}
          format={(v) => `${v}歳`}
          hint="給与収入が止まる年齢"
        />
        <NumberSlider
          label="退職金"
          value={value.retirementBonusMan}
          min={0}
          max={5000}
          step={100}
          onChange={(v) => onChange({ retirementBonusMan: v })}
          format={formatManLabel}
          hint="定年時に受け取る一時金（目安1,000〜2,000万円）"
        />
        <NumberSlider
          label="年金（手取り月額）"
          value={value.pensionMonthlyMan}
          min={0}
          max={40}
          step={1}
          onChange={(v) => onChange({ pensionMonthlyMan: v })}
          format={formatManLabel}
          hint="目安：夫婦で約22万円／単身で約15万円"
        />
        <NumberSlider
          label="年金の受給開始"
          value={value.pensionStartAge}
          min={60}
          max={75}
          step={1}
          onChange={(v) => onChange({ pensionStartAge: v })}
          format={(v) => `${v}歳`}
          hint="原則65歳。定年より遅いと無収入期間が出ます"
        />
      </CollapsibleSection>

      {/* 毎月の支出（追加式） */}
      <CollapsibleSection title="毎月の支出">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            項目ごとに月額を調整。定番から追加・自由に追加できます
          </p>
          <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-white">
            計 {formatManLabel(totalExpenseMan)}
          </span>
        </div>

        {expenses.length > 0 && (
          <div className="space-y-3">
            {expenses.map((e) => (
              <div key={e.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {e.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {editingExpenseId === e.id ? (
                      <input
                        type="number"
                        value={expenseDraft}
                        min={0}
                        step={0.5}
                        autoFocus
                        onChange={(ev) => setExpenseDraft(ev.target.value)}
                        onBlur={() => commitExpense(e.id)}
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter') commitExpense(e.id);
                          if (ev.key === 'Escape') setEditingExpenseId(null);
                        }}
                        className="w-20 rounded-lg border border-indigo-300 bg-white px-2 py-0.5 text-right text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-indigo-600 dark:bg-slate-950 dark:text-white"
                        aria-label={`${e.label}の月額を入力`}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditExpense(e.id, e.amountMan)}
                        title="タップして入力"
                        className="group flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-sm font-semibold text-slate-900 transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {formatManLabel(e.amountMan)}
                        <PencilIcon />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveExpense(e.id)}
                      className="text-xs text-slate-400 transition hover:text-rose-500"
                    >
                      削除
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={0.5}
                  value={e.amountMan}
                  onChange={(ev) =>
                    onUpdateExpense(e.id, { amountMan: Number(ev.target.value) })
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 dark:bg-slate-700"
                  aria-label={`${e.label}の月額`}
                />
                <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <span>期間</span>
                  <input
                    type="number"
                    value={e.startAfterYears ? e.startAfterYears : ''}
                    min={0}
                    max={50}
                    placeholder="0"
                    onChange={(ev) =>
                      onUpdateExpense(e.id, {
                        startAfterYears: ev.target.value
                          ? Number(ev.target.value)
                          : 0,
                      })
                    }
                    className="w-12 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-right text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    aria-label={`${e.label}を何年後から`}
                  />
                  <span>年後（{value.age + (e.startAfterYears ?? 0)}歳）から</span>
                  <input
                    type="number"
                    value={e.durationYears ? e.durationYears : ''}
                    min={0}
                    max={60}
                    placeholder="ずっと"
                    onChange={(ev) =>
                      onUpdateExpense(e.id, {
                        durationYears: ev.target.value
                          ? Number(ev.target.value)
                          : undefined,
                      })
                    }
                    className="w-16 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-right text-slate-700 placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    aria-label={`${e.label}を何年間`}
                  />
                  <span>{e.durationYears ? '年間' : '（空＝ずっと）'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {availablePresets.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              定番から追加
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availablePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    onAddExpense({
                      id: crypto.randomUUID(),
                      label: preset.label,
                      amountMan: preset.amountMan,
                    })
                  }
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700"
                >
                  ＋ {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={customExpenseLabel}
            placeholder="例: 習い事"
            onChange={(e) => {
              setCustomExpenseLabel(e.target.value);
              if (expenseError) setExpenseError(false);
            }}
            className={`min-w-0 flex-1 rounded-lg border bg-white px-2 py-1 text-sm dark:bg-slate-900 ${
              expenseError
                ? 'border-rose-400 ring-1 ring-rose-300 dark:border-rose-500'
                : 'border-slate-200 dark:border-slate-700'
            }`}
            aria-label="支出項目名"
          />
          <button
            type="button"
            onClick={handleAddCustomExpense}
            className="rounded-lg bg-indigo-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            追加
          </button>
          {expenseError && (
            <p className="w-full text-xs font-medium text-rose-500">
              支出項目名を入力してください
            </p>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="貯金・繰上げ・ボーナス払い">
        <NumberSlider
          label="ボーナス払い（1回の返済額）"
          value={value.bonusRepayMan}
          min={0}
          max={50}
          step={1}
          onChange={(v) => onChange({ bonusRepayMan: v })}
          format={formatManLabel}
          hint="ボーナス月だけ月々返済に＋して返します。月々が軽くなり、返済期間は変わりません"
        />
        <NumberSlider
          label="いまの貯金"
          value={value.initialSavingsMan}
          min={0}
          max={3000}
          step={50}
          onChange={(v) => onChange({ initialSavingsMan: v })}
          format={formatManLabel}
          hint="貯金推移の出発点になります"
        />

        <div className="space-y-3">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            繰上げ返済（積立方式）
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                ['none', 'しない'],
                ['saveup', '積み立てて繰上げ'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ prepayMode: mode })}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                  value.prepayMode === mode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {value.prepayMode === 'saveup' && (
            <>
              <NumberSlider
                label="毎年の積立額"
                value={value.prepaySaveupPerYearMan}
                min={0}
                max={200}
                step={5}
                onChange={(v) => onChange({ prepaySaveupPerYearMan: v })}
                format={formatManLabel}
                hint="繰上げ用に毎年ためる額"
              />
              <NumberSlider
                label="繰上げを実行する額"
                value={value.prepayTriggerMan}
                min={10}
                max={500}
                step={10}
                onChange={(v) => onChange({ prepayTriggerMan: v })}
                format={formatManLabel}
                hint="この額がたまったら、まとめて繰上げ"
              />
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="ライフイベント">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          車買い替え・リフォームなど一時的な出費を「何年後」で追加（グラフに縦線で表示されます）
        </p>
        {events.length > 0 && (
          <ul className="space-y-1.5">
            {[...events]
              .sort((a, b) => a.atAge - b.atAge)
              .map((e) => {
                const yearsLater = e.atAge - value.age;
                const editing = editingId === e.id;
                return (
                  <li
                    key={e.id}
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm ${
                      editing
                        ? 'bg-indigo-50 ring-1 ring-indigo-300 dark:bg-indigo-950/40 dark:ring-indigo-700'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <span className="text-slate-700 dark:text-slate-200">
                      <span className="font-semibold">
                        {yearsLater <= 0 ? '今' : `${yearsLater}年後`}
                      </span>
                      <span className="ml-1 text-xs text-slate-400">
                        （{e.atAge}歳）
                      </span>{' '}
                      {e.label}
                      {e.intervalYears && e.intervalYears > 0 ? (
                        <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                          {e.intervalYears}年ごと
                          {e.untilAge ? `〜${e.untilAge}歳` : ''}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-slate-500 dark:text-slate-400">
                        {formatManLabel(e.amountMan)}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditEvent(e)}
                        className="text-xs text-slate-400 transition hover:text-indigo-500"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingId === e.id) resetEventForm();
                          onRemoveEvent(e.id);
                        }}
                        className="text-xs text-slate-400 transition hover:text-rose-500"
                      >
                        削除
                      </button>
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            定番から追加
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LIFE_EVENT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => openPresetSheet(preset)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700"
              >
                ＋ {preset.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            resetEventForm();
            setEvSheetOpen(true);
          }}
          className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-indigo-700"
        >
          ＋ 自由に追加（詳細を設定）
        </button>
        {evSheetOpen && (
          <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
            <button
              type="button"
              aria-label="閉じる"
              className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-sm"
              onClick={closeEvSheet}
            />
            <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600 sm:hidden" />
              <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {editingId ? 'イベントを編集' : 'イベントを追加'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              value={evYearsLater}
              min={0}
              max={60}
              onChange={(e) => setEvYearsLater(e.target.value)}
              className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
              aria-label="何年後"
            />
            <span className="text-xs text-slate-400">
              年後（{value.age + (Number(evYearsLater) || 0)}歳）
            </span>
            <input
              type="text"
              value={evLabel}
              placeholder="例: 車買い替え"
              onChange={(e) => {
                setEvLabel(e.target.value);
                if (evError) setEvError(false);
              }}
              className={`min-w-0 flex-1 rounded-lg border bg-white px-2 py-1 text-sm dark:bg-slate-950 ${
                evError
                  ? 'border-rose-400 ring-1 ring-rose-300 dark:border-rose-500'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
              aria-label="イベント名"
            />
            <input
              type="number"
              value={evAmount}
              min={0}
              step={10}
              onChange={(e) => setEvAmount(e.target.value)}
              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
              aria-label="金額（万円）"
            />
            <span className="text-xs text-slate-400">万円</span>
            <div className="flex w-full flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-400">くりかえし</span>
              <button
                type="button"
                onClick={() => setEvRecurring(false)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  !evRecurring
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                単発
              </button>
              <button
                type="button"
                onClick={() => setEvRecurring(true)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  evRecurring
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                定期
              </button>
              {evRecurring && (
                <>
                  <input
                    type="number"
                    value={evInterval}
                    min={1}
                    max={40}
                    placeholder="10"
                    onChange={(e) => setEvInterval(e.target.value)}
                    className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
                    aria-label="何年ごと"
                  />
                  <span className="text-xs text-slate-400">年ごと・</span>
                  <input
                    type="number"
                    value={evUntilAge}
                    min={value.age}
                    max={100}
                    placeholder={String(value.age + 30)}
                    onChange={(e) => setEvUntilAge(e.target.value)}
                    className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
                    aria-label="終了年齢"
                  />
                  <span className="text-xs text-slate-400">歳まで</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmitEvent}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              {editingId ? '更新' : '追加'}
            </button>
            <button
              type="button"
              onClick={closeEvSheet}
              className="rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
            >
              キャンセル
            </button>
            {evError && (
              <p className="w-full text-xs font-medium text-rose-500">
                イベント名を入力してください
              </p>
            )}
              </div>
            </div>
          </div>
        )}
      </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
