import { useState } from 'react';
import { DEFAULT_FORM } from '../types';
import type { FormState, IncomeItem, ExpenseItem, LifeEvent } from '../types';
import { formatManLabel } from '../lib/format';

interface WizardInput {
  housingType: 'own' | 'rent';
  age: number;
  loanAmountMan: number;
  ratePct: number;
  years: number;
  rentMan: number;
  monthlySalaryMan: number;
  bonusMonths: number;
  hasSpouse: boolean;
  spouseIncomeMan: number;
  livingCostMan: number;
  childBirthOffsets: number[];
  hasCar: boolean;
  carCount: number;
  initialSavingsMan: number;
}

const uid = () => crypto.randomUUID();

/** 学校段階ごとの月額教育費（公立ベース）と子の年齢範囲 */
const EDU_STAGES = [
  { name: '幼稚園', from: 3, to: 5, monthlyMan: 1.5 },
  { name: '小学校', from: 6, to: 11, monthlyMan: 3 },
  { name: '中学校', from: 12, to: 14, monthlyMan: 5 },
  { name: '高校', from: 15, to: 17, monthlyMan: 4.5 },
  { name: '大学', from: 18, to: 21, monthlyMan: 4.5 },
];

/** ウィザードの代表入力から、収入・支出・ライフイベントを自動生成した FormState を作る。 */
function buildFormFromWizard(input: WizardInput): FormState {
  const { age } = input;

  const incomes: IncomeItem[] = [
    {
      id: uid(),
      owner: 'self',
      kind: 'salary',
      label: '本人給与',
      startAge: age,
      endAge: 64,
      amountMan: input.monthlySalaryMan,
      basis: 'monthly',
      isGross: true,
      bonusMonths: input.bonusMonths,
      raiseRatePct: 1.5,
      raiseStopAge: 55,
    },
    {
      id: uid(),
      owner: 'self',
      kind: 'pension',
      label: '年金',
      startAge: 65,
      amountMan: input.hasSpouse ? 22 : 15,
      basis: 'monthly',
      isGross: false,
    },
    {
      id: uid(),
      owner: 'self',
      kind: 'retirement',
      label: '退職金',
      startAge: 65,
      amountMan: 1000,
      basis: 'annual',
      isGross: false,
      oneTime: true,
    },
  ];
  if (input.hasSpouse && input.spouseIncomeMan > 0) {
    incomes.push({
      id: uid(),
      owner: 'spouse',
      kind: 'salary',
      label: '配偶者収入',
      startAge: age,
      endAge: 64,
      amountMan: input.spouseIncomeMan,
      basis: 'annual',
      isGross: true,
    });
  }

  const expenses: ExpenseItem[] = [
    { id: uid(), label: '生活費', amountMan: input.livingCostMan },
    { id: uid(), label: '保険', amountMan: 2 },
  ];
  if (input.hasCar) {
    expenses.push({
      id: uid(),
      label: '車の維持費',
      amountMan: 1.5 * input.carCount,
      durationYears: Math.max(1, 80 - age),
      group: '車',
    });
  }
  input.childBirthOffsets.forEach((off, i) => {
    // 学校段階ごとの月額教育費。すでに通った段階はスキップ、途中なら残り期間だけ
    EDU_STAGES.forEach((st) => {
      const startElapsed = off + st.from;
      const stageYears = st.to - st.from + 1;
      const duration = stageYears + Math.min(0, startElapsed);
      if (duration > 0) {
        expenses.push({
          id: uid(),
          label: st.name,
          amountMan: st.monthlyMan,
          startAfterYears: Math.max(0, startElapsed),
          durationYears: duration,
          group: `子${i + 1}の教育費`,
        });
      }
    });
  });

  const events: LifeEvent[] = [];
  if (input.hasCar) {
    const n = input.carCount;
    events.push({
      id: uid(),
      atAge: age + 2,
      label: '車検',
      amountMan: 20 * n,
      intervalYears: 2,
      untilAge: 80,
      group: '車',
    });
    events.push({
      id: uid(),
      atAge: age + 10,
      label: '車の買い替え',
      amountMan: 150 * n,
      intervalYears: 10,
      untilAge: 80,
      group: '車',
    });
  }
  if (input.housingType === 'own') {
    events.push({
      id: uid(),
      atAge: age + 15,
      label: '外壁・屋根の修繕',
      amountMan: 150,
      intervalYears: 15,
      untilAge: 100,
      group: '住まいの修繕',
    });
    events.push({
      id: uid(),
      atAge: age + 30,
      label: 'リフォーム',
      amountMan: 300,
      intervalYears: 30,
      untilAge: 100,
      group: '住まいの修繕',
    });
  }
  input.childBirthOffsets.forEach((off, i) => {
    const birthAge = age + off;
    // 出産はこれから生まれる子のみ追加（過去は除外）
    if (off >= 0) {
      events.push({
        id: uid(),
        atAge: birthAge,
        label: `出産（子${i + 1}）`,
        amountMan: 20,
        group: `子${i + 1}のイベント`,
      });
    }
    // 大学入学金はこれから迎える場合のみ
    const uniAge = birthAge + 18;
    if (uniAge >= age) {
      events.push({
        id: uid(),
        atAge: uniAge,
        label: `大学入学金（子${i + 1}）`,
        amountMan: 30,
        group: `子${i + 1}のイベント`,
      });
    }
  });

  return {
    ...DEFAULT_FORM,
    housingType: input.housingType,
    age,
    loanAmountMan: input.loanAmountMan,
    ratePct: input.ratePct,
    years: input.years,
    rentMan: input.rentMan,
    incomes,
    expenses,
    events,
    initialSavingsMan: input.initialSavingsMan,
  };
}

function getLivingCostPresets(hasSpouse: boolean, childCount: number): { modest: number; standard: number; luxury: number } {
  if (!hasSpouse && childCount === 0) {
    return { modest: 11, standard: 14, luxury: 18 };
  }
  if (hasSpouse && childCount === 0) {
    return { modest: 15, standard: 18, luxury: 22 };
  }
  if (childCount <= 2) {
    return { modest: 16, standard: 20, luxury: 25 };
  }
  return { modest: 18, standard: 22, luxury: 28 };
}

interface PlanWizardProps {
  onCreate: (form: FormState) => void;
  onClose: () => void;
  /** 空のプランを作る（自分で詳細入力したい人向け） */
  onCreateBlank: () => void;
}

const numInput =
  'w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-right dark:border-slate-700 dark:bg-slate-950';

export function PlanWizard({ onCreate, onClose, onCreateBlank }: PlanWizardProps) {
  const [housingType, setHousingType] = useState<'own' | 'rent'>('own');
  const [age, setAge] = useState('35');
  const [loanAmountMan, setLoanAmountMan] = useState('3500');
  const [ratePct, setRatePct] = useState('1.0');
  const [years, setYears] = useState('35');
  const [rentMan, setRentMan] = useState('12');
  const [monthlySalaryMan, setMonthlySalaryMan] = useState('30');
  const [bonusMonths, setBonusMonths] = useState('4');
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spouseIncomeMan, setSpouseIncomeMan] = useState('300');
  const [children, setChildren] = useState<{ born: boolean; value: string }[]>([]);
  const [livingCostLevel, setLivingCostLevel] = useState<'modest' | 'standard' | 'luxury' | 'custom'>('standard');
  const [customLivingCostMan, setCustomLivingCostMan] = useState('14');
  const [hasCar, setHasCar] = useState(true);
  const [carCount, setCarCount] = useState(1);
  const [savings, setSavings] = useState('300');

  const currentPresets = getLivingCostPresets(hasSpouse, children.length);

  // 依存ステートが変わるたびに自動で目安金額をアップデートする効果
  const lastStateKey = `${hasSpouse}-${children.length}-${livingCostLevel}`;
  const [lastTrackedKey, setLastStateKey] = useState(lastStateKey);
  if (lastTrackedKey !== lastStateKey) {
    setLastStateKey(lastStateKey);
    if (livingCostLevel !== 'custom') {
      setCustomLivingCostMan(String(currentPresets[livingCostLevel]));
    }
  }

  const setCount = (n: number) => {
    const next = Math.max(0, Math.min(5, n));
    setChildren((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push({ born: false, value: '2' });
      arr.length = next;
      return arr;
    });
  };

  const handleCreate = () => {
    const ageNum = Number(age) || 35;
    onCreate(
      buildFormFromWizard({
        housingType,
        age: ageNum,
        loanAmountMan: Number(loanAmountMan) || 0,
        ratePct: Number(ratePct) || 0,
        years: Number(years) || 35,
        rentMan: Number(rentMan) || 0,
        monthlySalaryMan: Number(monthlySalaryMan) || 0,
        bonusMonths: Number(bonusMonths) || 0,
        hasSpouse,
        spouseIncomeMan: hasSpouse ? Number(spouseIncomeMan) || 0 : 0,
        livingCostMan: Number(customLivingCostMan) || 14,
        childBirthOffsets: children.map((c) => {
          const v = Number(c.value) || 0;
          return c.born ? -v : v;
        }),
        hasCar,
        carCount,
        initialSavingsMan: Number(savings) || 0,
      }),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 cursor-default bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600 sm:hidden" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          かんたんプラン作成
        </h2>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          代表的な項目だけ入力すれば、教育費・修繕費・車の買い替えなどを自動で追加します（あとで自由に調整できます）
        </p>

        <div className="mt-4 space-y-4">
          {/* 住まい */}
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              住まい
            </p>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
              {(
                [
                  ['own', '持ち家・ローン'],
                  ['rent', '賃貸'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setHousingType(id)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    housingType === id
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 年齢 */}
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-700 dark:text-slate-200">
              現在の年齢
            </span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                value={age}
                min={18}
                max={70}
                onChange={(e) => setAge(e.target.value)}
                className={numInput}
              />
              <span className="text-xs text-slate-400">歳</span>
            </span>
          </label>

          {/* 住居費 */}
          {housingType === 'own' ? (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
              <label className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  借入額
                </span>
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    value={loanAmountMan}
                    min={0}
                    step={50}
                    onChange={(e) => setLoanAmountMan(e.target.value)}
                    className={numInput}
                  />
                  <span className="text-xs text-slate-400">万円</span>
                </span>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  金利（年）
                </span>
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    value={ratePct}
                    min={0}
                    step={0.05}
                    onChange={(e) => setRatePct(e.target.value)}
                    className={numInput}
                  />
                  <span className="text-xs text-slate-400">%</span>
                </span>
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  返済期間
                </span>
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    value={years}
                    min={1}
                    max={50}
                    onChange={(e) => setYears(e.target.value)}
                    className={numInput}
                  />
                  <span className="text-xs text-slate-400">年</span>
                </span>
              </label>
            </div>
          ) : (
            <label className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-700 dark:text-slate-200">
                家賃（月額）
              </span>
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  value={rentMan}
                  min={0}
                  onChange={(e) => setRentMan(e.target.value)}
                  className={numInput}
                />
                <span className="text-xs text-slate-400">万円</span>
              </span>
            </label>
          )}

          {/* 収入 */}
          <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <label className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-700 dark:text-slate-200">
                月給（額面）
              </span>
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  value={monthlySalaryMan}
                  min={0}
                  onChange={(e) => setMonthlySalaryMan(e.target.value)}
                  className={numInput}
                />
                <span className="text-xs text-slate-400">万円</span>
              </span>
            </label>
            <label className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-700 dark:text-slate-200">
                ボーナス（月給の何ヶ月分）
              </span>
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  value={bonusMonths}
                  min={0}
                  step={0.5}
                  onChange={(e) => setBonusMonths(e.target.value)}
                  className={numInput}
                />
                <span className="text-xs text-slate-400">ヶ月</span>
              </span>
            </label>
          </div>

          {/* 生活費 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                生活費（月・教育費を除く）
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={customLivingCostMan}
                  min={1}
                  max={100}
                  onChange={(e) => {
                    setCustomLivingCostMan(e.target.value);
                    setLivingCostLevel('custom');
                  }}
                  className={numInput}
                  aria-label="生活費の直接変更"
                />
                <span className="text-xs text-slate-400 font-medium">万円/月</span>
              </div>
            </div>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
              {(
                [
                  ['modest', 'ひかえめ', currentPresets.modest],
                  ['standard', '標準', currentPresets.standard],
                  ['luxury', 'ゆとり', currentPresets.luxury],
                ] as const
              ).map(([level, label, amount]) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setLivingCostLevel(level);
                    setCustomLivingCostMan(String(amount));
                  }}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                    livingCostLevel === level
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {label}
                  <span className="ml-1 text-[10px] font-normal">{amount}万</span>
                </button>
              ))}
            </div>
          </div>

          {/* 配偶者 */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                配偶者
              </span>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/60">
                {(
                  [
                    [false, 'なし'],
                    [true, 'あり'],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setHasSpouse(v)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      hasSpouse === v
                        ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {hasSpouse && (
              <label className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  配偶者の年収（額面）
                </span>
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    value={spouseIncomeMan}
                    min={0}
                    step={10}
                    onChange={(e) => setSpouseIncomeMan(e.target.value)}
                    className={numInput}
                  />
                  <span className="text-xs text-slate-400">万円</span>
                </span>
              </label>
            )}
          </div>

          {/* 子ども */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                子どもの人数
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCount(children.length - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
                  disabled={children.length <= 0}
                  aria-label="子どもを減らす"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {children.length}
                </span>
                <button
                  type="button"
                  onClick={() => setCount(children.length + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
                  disabled={children.length >= 5}
                  aria-label="子どもを増やす"
                >
                  ＋
                </button>
              </div>
            </div>
            {children.length > 0 && (
              <div className="mt-2 space-y-2">
                {children.map((c, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      子{i + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/60">
                        {(
                          [
                            [true, 'もう生まれた'],
                            [false, 'これから'],
                          ] as const
                        ).map(([b, l]) => (
                          <button
                            key={String(b)}
                            type="button"
                            onClick={() =>
                              setChildren((prev) =>
                                prev.map((x, j) =>
                                  j === i ? { ...x, born: b } : x,
                                ),
                              )
                            }
                            className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${
                              c.born === b
                                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={c.value}
                        min={0}
                        max={30}
                        onChange={(e) =>
                          setChildren((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, value: e.target.value } : x,
                            ),
                          )
                        }
                        className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-sm dark:border-slate-700 dark:bg-slate-950"
                        aria-label={`子${i + 1}の${c.born ? '年齢' : '誕生まで'}`}
                      />
                      <span className="text-xs text-slate-400">
                        {c.born ? '歳' : '年後'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 車 */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                車
              </span>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800/60">
                {(
                  [
                    [true, '持つ'],
                    [false, '持たない'],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setHasCar(v)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                      hasCar === v
                        ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {hasCar && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  台数
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCarCount((n) => Math.max(1, n - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
                    disabled={carCount <= 1}
                    aria-label="台数を減らす"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {carCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCarCount((n) => Math.min(3, n + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
                    disabled={carCount >= 3}
                    aria-label="台数を増やす"
                  >
                    ＋
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 貯金 */}
          <label className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-700 dark:text-slate-200">
              いまの貯金
            </span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                value={savings}
                min={0}
                step={50}
                onChange={(e) => setSavings(e.target.value)}
                className={numInput}
              />
              <span className="text-xs text-slate-400">万円</span>
            </span>
          </label>

          <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            このあと自動で追加:{' '}
            {hasCar ? `車検・車の買い替え・車の維持費（${carCount}台分）・` : ''}
            {housingType === 'own' ? '外壁修繕・リフォーム・' : ''}
            {children.length > 0
              ? `教育費 幼〜大（子${children.length}人分）・出産・大学入学金・`
              : ''}
            年金（{hasSpouse ? '月22万' : '月15万'}）・退職金（{formatManLabel(1000)}）
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreate}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            このプランを作成
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:hover:text-slate-200"
          >
            キャンセル
          </button>
        </div>
        <button
          type="button"
          onClick={onCreateBlank}
          className="mt-2 w-full text-center text-xs font-medium text-slate-400 underline-offset-2 transition hover:text-indigo-600 hover:underline dark:text-slate-500"
        >
          空のプランを作って自分で入力する
        </button>
      </div>
    </div>
  );
}
