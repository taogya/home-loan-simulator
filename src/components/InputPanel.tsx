import { useState } from 'react';
import { NumberSlider } from './NumberSlider';
import { CollapsibleSection } from './CollapsibleSection';
import { formatManLabel } from '../lib/format';
import type {
  FormState,
  LifeEvent,
  ExpenseItem,
  IncomeItem,
  IncomeOwner,
  IncomeKind,
} from '../types';

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
  { label: '教育費（幼稚園）', amountMan: 1.5 },
  { label: '教育費（小学校）', amountMan: 3 },
  { label: '教育費（中学校）', amountMan: 5 },
  { label: '教育費（高校）', amountMan: 4.5 },
  { label: '教育費（大学）', amountMan: 4.5 },
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
  intervalYears?: number;
  untilAge?: number;
}[] = [
  { label: '車の買い替え', amountMan: 150, yearsLater: 10, intervalYears: 10, untilAge: 75 },
  { label: 'リフォーム', amountMan: 300, yearsLater: 30, intervalYears: 30, untilAge: 100 },
  { label: '外壁・屋根の修繕', amountMan: 150, yearsLater: 15, intervalYears: 15, untilAge: 100 },
  { label: '給湯器の交換', amountMan: 50, yearsLater: 15, intervalYears: 15, untilAge: 100 },
  { label: 'エアコン買い替え', amountMan: 15, yearsLater: 10, intervalYears: 10, untilAge: 100 },
  { label: '出産', amountMan: 20, yearsLater: 2 },
  { label: '大学入学金', amountMan: 30, yearsLater: 18 },
  { label: '結婚式', amountMan: 300, yearsLater: 3 },
  { label: '家族旅行', amountMan: 30, yearsLater: 5 },
  { label: '家電の買い替え', amountMan: 50, yearsLater: 10, intervalYears: 10, untilAge: 100 },
];

const INCOME_GROUPS: { owner: IncomeOwner; label: string; short: string }[] = [
  { owner: 'self', label: '本人の収入', short: '本人' },
  { owner: 'spouse', label: '配偶者の収入', short: '配偶者' },
  { owner: 'other', label: 'その他の収入', short: 'その他' },
];

const INCOME_KINDS: { kind: IncomeKind; label: string }[] = [
  { kind: 'salary', label: '給与' },
  { kind: 'pension', label: '年金' },
  { kind: 'retirement', label: '退職金' },
  { kind: 'other', label: 'その他' },
];

interface IncomePreset {
  owner: IncomeOwner;
  kind: IncomeKind;
  label: string;
  basis: 'monthly' | 'annual';
  isGross: boolean;
  amountMan: number;
  /** 開始＝現在の年齢にする */
  fromNow?: boolean;
  /** 絶対年齢（fromNow でないとき） */
  startAge?: number;
  endAge?: number;
  oneTime?: boolean;
  bonusMonths?: number;
  raiseRatePct?: number;
  raiseStopAge?: number;
}

const INCOME_PRESETS: IncomePreset[] = [
  // 本人
  { owner: 'self', kind: 'salary', label: '本人給与', basis: 'monthly', isGross: true, amountMan: 30, fromNow: true, endAge: 64, bonusMonths: 4, raiseRatePct: 1.5, raiseStopAge: 55 },
  { owner: 'self', kind: 'pension', label: '年金', basis: 'monthly', isGross: false, amountMan: 15, startAge: 65 },
  { owner: 'self', kind: 'retirement', label: '退職金', basis: 'annual', isGross: false, amountMan: 1000, startAge: 65, oneTime: true },
  // 配偶者
  { owner: 'spouse', kind: 'salary', label: '配偶者給与', basis: 'annual', isGross: true, amountMan: 300, fromNow: true, endAge: 64 },
  { owner: 'spouse', kind: 'pension', label: '配偶者の年金', basis: 'monthly', isGross: false, amountMan: 6, startAge: 65 },
  { owner: 'spouse', kind: 'retirement', label: '配偶者の退職金', basis: 'annual', isGross: false, amountMan: 500, startAge: 65, oneTime: true },
  // その他
  { owner: 'other', kind: 'other', label: '副業', basis: 'annual', isGross: false, amountMan: 50, fromNow: true },
  { owner: 'other', kind: 'other', label: '家賃収入', basis: 'annual', isGross: false, amountMan: 60, fromNow: true },
  { owner: 'other', kind: 'other', label: '投資・配当', basis: 'annual', isGross: false, amountMan: 30, fromNow: true },
];

function incomeAmountLabel(inc: IncomeItem): string {
  const amt = formatManLabel(inc.amountMan);
  if (inc.oneTime) return amt;
  return inc.basis === 'monthly' ? `月${amt}` : `年${amt}`;
}

function incomeAgeLabel(inc: IncomeItem): string {
  if (inc.oneTime) return `${inc.startAge}歳`;
  if (inc.endAge != null && inc.endAge > 0) return `${inc.startAge}〜${inc.endAge}歳`;
  return `${inc.startAge}歳〜`;
}

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
  incomes: IncomeItem[];
  onAddIncome: (item: IncomeItem) => void;
  onRemoveIncome: (id: string) => void;
  onUpdateIncome: (id: string, patch: Partial<IncomeItem>) => void;
  onToggleCommonIncome: (id: string) => void;
  onToggleCommonExpense: (id: string) => void;
  onToggleCommonEvent: (id: string) => void;
  commonIds: Set<string>;
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

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <line x1="12" x2="12" y1="17" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}

function PinButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        active
          ? 'プラン共通（タップでこのプラン専用に）'
          : 'このプラン専用（タップで全プラン共通に）'
      }
      aria-label={active ? 'プラン共通を解除' : 'プラン共通にする'}
      aria-pressed={active}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${
        active
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400'
      }`}
    >
      <PinIcon filled={active} />
    </button>
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
  incomes,
  onAddIncome,
  onRemoveIncome,
  onUpdateIncome,
  onToggleCommonIncome,
  onToggleCommonExpense,
  onToggleCommonEvent,
  commonIds,
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
    const recurring = (preset.intervalYears ?? 0) > 0;
    setEvRecurring(recurring);
    setEvInterval(String(preset.intervalYears ?? 10));
    setEvUntilAge(String(preset.untilAge ?? value.age + 30));
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

  // 収入シート（追加式）
  const [incSheetOpen, setIncSheetOpen] = useState(false);
  const [incEditingId, setIncEditingId] = useState<string | null>(null);
  const [incError, setIncError] = useState(false);
  const [incOwner, setIncOwner] = useState<IncomeOwner>('self');
  const [incKind, setIncKind] = useState<IncomeKind>('salary');
  const [incLabel, setIncLabel] = useState('');
  const [incAmount, setIncAmount] = useState('30');
  const [incBasis, setIncBasis] = useState<'monthly' | 'annual'>('monthly');
  const [incGross, setIncGross] = useState(true);
  const [incStartAge, setIncStartAge] = useState(String(value.age));
  const [incEndAge, setIncEndAge] = useState('');
  const [incBonusMonths, setIncBonusMonths] = useState('4');
  const [incRaiseRate, setIncRaiseRate] = useState('1.5');
  const [incRaiseStopAge, setIncRaiseStopAge] = useState('55');

  const closeIncSheet = () => {
    setIncSheetOpen(false);
    setIncEditingId(null);
    setIncError(false);
  };

  const fillIncomeDraft = (src: {
    owner: IncomeOwner;
    kind: IncomeKind;
    label: string;
    amountMan: number;
    basis: 'monthly' | 'annual';
    isGross: boolean;
    startAge: number;
    endAge?: number;
    bonusMonths?: number;
    raiseRatePct?: number;
    raiseStopAge?: number;
  }) => {
    setIncOwner(src.owner);
    setIncKind(src.kind);
    setIncLabel(src.label);
    setIncAmount(String(src.amountMan));
    setIncBasis(src.basis);
    setIncGross(src.isGross);
    setIncStartAge(String(src.startAge));
    setIncEndAge(src.endAge != null ? String(src.endAge) : '');
    setIncBonusMonths(String(src.bonusMonths ?? 4));
    setIncRaiseRate(String(src.raiseRatePct ?? 1.5));
    setIncRaiseStopAge(String(src.raiseStopAge ?? 55));
    setIncError(false);
  };

  const openIncomePreset = (preset: IncomePreset) => {
    setIncEditingId(null);
    fillIncomeDraft({
      owner: preset.owner,
      kind: preset.kind,
      label: preset.label,
      amountMan: preset.amountMan,
      basis: preset.basis,
      isGross: preset.isGross,
      startAge: preset.fromNow ? value.age : preset.startAge ?? value.age,
      endAge: preset.endAge,
      bonusMonths: preset.bonusMonths,
      raiseRatePct: preset.raiseRatePct,
      raiseStopAge: preset.raiseStopAge,
    });
    setIncSheetOpen(true);
  };

  const openIncomeCustom = (owner: IncomeOwner) => {
    setIncEditingId(null);
    fillIncomeDraft({
      owner,
      kind: owner === 'other' ? 'other' : 'salary',
      label: '',
      amountMan: owner === 'other' ? 10 : 30,
      basis: owner === 'other' ? 'annual' : 'monthly',
      isGross: owner !== 'other',
      startAge: value.age,
      endAge: owner === 'other' ? undefined : 64,
    });
    setIncSheetOpen(true);
  };

  const startEditIncome = (inc: IncomeItem) => {
    setIncEditingId(inc.id);
    fillIncomeDraft(inc);
    setIncSheetOpen(true);
  };

  const handleSubmitIncome = () => {
    const label = incLabel.trim();
    if (!label) {
      setIncError(true);
      return;
    }
    const owner = incOwner;
    const kind: IncomeKind = owner === 'other' ? 'other' : incKind;
    const isSalary = kind === 'salary';
    const oneTime = kind === 'retirement';
    const startAge = Number(incStartAge) || value.age;
    const endNum = Number(incEndAge);
    const endAge =
      oneTime || incEndAge.trim() === '' || !Number.isFinite(endNum)
        ? undefined
        : Math.max(startAge, endNum);
    const payload: Omit<IncomeItem, 'id'> = {
      owner,
      kind,
      label,
      startAge,
      endAge,
      amountMan: Number(incAmount) || 0,
      basis: oneTime ? 'annual' : incBasis,
      isGross: isSalary ? incGross : false,
      oneTime: oneTime || undefined,
      bonusMonths:
        isSalary && incBasis === 'monthly' ? Number(incBonusMonths) || 0 : undefined,
      raiseRatePct: isSalary ? Number(incRaiseRate) || 0 : undefined,
      raiseStopAge: isSalary ? Number(incRaiseStopAge) || undefined : undefined,
    };
    if (incEditingId) onUpdateIncome(incEditingId, payload);
    else onAddIncome({ id: crypto.randomUUID(), ...payload });
    closeIncSheet();
  };

  const incEffectiveKind: IncomeKind = incOwner === 'other' ? 'other' : incKind;
  const incIsSalary = incEffectiveKind === 'salary';
  const incIsRetirement = incEffectiveKind === 'retirement';

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
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
        {(
          [
            { id: 'own', label: '持ち家・ローン' },
            { id: 'rent', label: '賃貸' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange({ housingType: opt.id })}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              value.housingType === opt.id
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value.housingType === 'own' ? (
        <>
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
        </>
      ) : (
        <>
          <NumberSlider
            label="家賃（月額）"
            value={value.rentMan}
            min={0}
            max={50}
            step={1}
            onChange={(v) => onChange({ rentMan: v })}
            format={(v) => `${v}万円/月`}
            hint="管理費・共益費も含めた毎月の支払い"
          />
          <NumberSlider
            label="更新料"
            value={value.renewalFeeMan}
            min={0}
            max={50}
            step={1}
            onChange={(v) => onChange({ renewalFeeMan: v })}
            format={formatManLabel}
            hint="更新時にかかる費用（家賃1〜2ヶ月分が目安）"
          />
          <NumberSlider
            label="更新間隔"
            value={value.renewalIntervalYears}
            min={1}
            max={5}
            step={1}
            onChange={(v) => onChange({ renewalIntervalYears: v })}
            format={(v) => `${v}年ごと`}
            hint="一般的な賃貸は2年ごと"
          />
        </>
      )}
      <NumberSlider
        label="現在の年齢"
        value={value.age}
        min={18}
        max={70}
        step={1}
        onChange={(v) => onChange({ age: v })}
        format={(v) => `${v}歳`}
        hint="シミュレーション開始の年齢"
      />
          </CollapsibleSection>

      {/* 収入（追加式・本人/配偶者/その他） */}
      <CollapsibleSection title="収入">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          給与・年金・退職金などを追加。本人・配偶者の給与は「額面」から手取りを自動で概算します（税額は概算）。年齢はすべて本人の年齢が基準です
        </p>
        {INCOME_GROUPS.map((group) => {
          const items = incomes.filter((i) => i.owner === group.owner);
          const usablePresets = INCOME_PRESETS.filter(
            (p) =>
              p.owner === group.owner && !items.some((i) => i.label === p.label),
          );
          return (
            <div key={group.owner} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {group.label}
                </span>
                {group.owner === 'other' && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    手取り・税計算なし
                  </span>
                )}
              </div>
              {items.length > 0 && (
                <ul className="space-y-1.5">
                  {[...items]
                    .sort((a, b) => a.startAge - b.startAge)
                    .map((inc) => (
                      <li
                        key={inc.id}
                        className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm dark:bg-slate-900"
                      >
                        <PinButton
                          active={commonIds.has(inc.id)}
                          onClick={() => onToggleCommonIncome(inc.id)}
                        />
                        <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
                          <span className="font-medium">{inc.label}</span>
                          <span className="ml-1.5 text-xs text-slate-400">
                            {incomeAgeLabel(inc)}
                          </span>
                          {inc.owner !== 'other' && inc.isGross && (
                            <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                              額面
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            {incomeAmountLabel(inc)}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditIncome(inc)}
                            className="text-xs text-slate-400 transition hover:text-indigo-500"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveIncome(inc.id)}
                            className="text-xs text-slate-400 transition hover:text-rose-500"
                          >
                            削除
                          </button>
                        </span>
                      </li>
                    ))}
                </ul>
              )}
              {usablePresets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {usablePresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => openIncomePreset(preset)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700"
                    >
                      ＋ {preset.label}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => openIncomeCustom(group.owner)}
                className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:text-slate-400 dark:hover:border-indigo-700"
              >
                ＋ 自由に追加
              </button>
            </div>
          );
        })}

        {incSheetOpen && (
          <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
            <button
              type="button"
              aria-label="閉じる"
              className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-sm"
              onClick={closeIncSheet}
            />
            <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600 sm:hidden" />
              <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {incEditingId ? '収入を編集' : '収入を追加'}
              </p>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    持ち主
                  </p>
                  <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
                    {INCOME_GROUPS.map((g) => (
                      <button
                        key={g.owner}
                        type="button"
                        onClick={() => setIncOwner(g.owner)}
                        className={`flex-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                          incOwner === g.owner
                            ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {g.short}
                      </button>
                    ))}
                  </div>
                </div>

                {incOwner !== 'other' && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      種類
                    </p>
                    <div className="grid grid-cols-4 gap-1">
                      {INCOME_KINDS.map((k) => (
                        <button
                          key={k.kind}
                          type="button"
                          onClick={() => setIncKind(k.kind)}
                          className={`rounded-lg px-1 py-1 text-xs font-medium transition ${
                            incKind === k.kind
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {k.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    名前
                  </p>
                  <input
                    type="text"
                    value={incLabel}
                    placeholder="例: 本人給与"
                    onChange={(e) => {
                      setIncLabel(e.target.value);
                      if (incError) setIncError(false);
                    }}
                    className={`w-full rounded-lg border bg-white px-2 py-1 text-sm dark:bg-slate-950 ${
                      incError
                        ? 'border-rose-400 ring-1 ring-rose-300 dark:border-rose-500'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                    aria-label="収入の名前"
                  />
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    金額
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {!incIsRetirement && (
                      <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/60">
                        {(
                          [
                            ['monthly', '月額'],
                            ['annual', '年額'],
                          ] as const
                        ).map(([b, l]) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setIncBasis(b)}
                            className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                              incBasis === b
                                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      type="number"
                      value={incAmount}
                      min={0}
                      step={1}
                      onChange={(e) => setIncAmount(e.target.value)}
                      className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
                      aria-label="金額（万円）"
                    />
                    <span className="text-xs text-slate-400">
                      万円{incIsRetirement ? '（一度だけ）' : ''}
                    </span>
                  </div>
                </div>

                {incIsSalary && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      入力する金額
                    </p>
                    <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/60">
                      {(
                        [
                          [true, '額面（手取り自動）'],
                          [false, '手取り'],
                        ] as const
                      ).map(([g, l]) => (
                        <button
                          key={String(g)}
                          type="button"
                          onClick={() => setIncGross(g)}
                          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                            incGross === g
                              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    受け取る期間（本人の年齢が基準）
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <input
                      type="number"
                      value={incStartAge}
                      min={0}
                      max={120}
                      onChange={(e) => setIncStartAge(e.target.value)}
                      className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
                      aria-label="開始年齢"
                    />
                    <span className="text-xs text-slate-400">
                      歳から{incIsRetirement ? 'の年に一度だけ' : ''}
                    </span>
                    {!incIsRetirement && (
                      <>
                        <input
                          type="number"
                          value={incEndAge}
                          min={0}
                          max={120}
                          placeholder="ずっと"
                          onChange={(e) => setIncEndAge(e.target.value)}
                          className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-950"
                          aria-label="終了年齢"
                        />
                        <span className="text-xs text-slate-400">
                          {incEndAge.trim() ? '歳まで' : '歳まで（空＝ずっと）'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {incIsSalary && (
                  <div className="space-y-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/40">
                    {incBasis === 'monthly' && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ボーナス（月給の何ヶ月分／年）
                        </span>
                        <input
                          type="number"
                          value={incBonusMonths}
                          min={0}
                          step={0.5}
                          onChange={(e) => setIncBonusMonths(e.target.value)}
                          className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
                          aria-label="ボーナス月数"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        昇給率（％／年）
                      </span>
                      <input
                        type="number"
                        value={incRaiseRate}
                        min={0}
                        step={0.1}
                        onChange={(e) => setIncRaiseRate(e.target.value)}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
                        aria-label="昇給率"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        昇給停止年齢
                      </span>
                      <input
                        type="number"
                        value={incRaiseStopAge}
                        min={0}
                        max={120}
                        onChange={(e) => setIncRaiseStopAge(e.target.value)}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
                        aria-label="昇給停止年齢"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSubmitIncome}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    {incEditingId ? '更新' : '追加'}
                  </button>
                  <button
                    type="button"
                    onClick={closeIncSheet}
                    className="rounded-lg px-2 py-1.5 text-sm text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    キャンセル
                  </button>
                  {incError && (
                    <p className="text-xs font-medium text-rose-500">
                      名前を入力してください
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <PinButton
                      active={commonIds.has(e.id)}
                      onClick={() => onToggleCommonExpense(e.id)}
                    />
                    <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                      {e.label}
                    </span>
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
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
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                      editing
                        ? 'bg-indigo-50 ring-1 ring-indigo-300 dark:bg-indigo-950/40 dark:ring-indigo-700'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <PinButton
                      active={commonIds.has(e.id)}
                      onClick={() => onToggleCommonEvent(e.id)}
                    />
                    <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
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
          ＋ 自由に追加
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
