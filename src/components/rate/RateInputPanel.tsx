import { NumberSlider } from '../NumberSlider';
import { formatManLabel } from '../../lib/format';
import { RATE_TEMPLATES } from '../../data/rateTemplates';
import type { RateSimInput } from '../../lib/rate';

interface RateInputPanelProps {
  input: RateSimInput;
  templateId: string;
  onChangeInput: (patch: Partial<RateSimInput>) => void;
  onSelectTemplate: (templateId: string) => void;
}

/** 金利シミュレータの借入条件＋テンプレート選択。 */
export function RateInputPanel({
  input,
  templateId,
  onChangeInput,
  onSelectTemplate,
}: RateInputPanelProps) {
  const active = RATE_TEMPLATES.find((t) => t.id === templateId) ?? RATE_TEMPLATES[0];

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-white">
          金利テンプレート
        </h3>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          銀行ごとの金利水準の目安を「比較」欄に読み込みます（数値は編集でき、編集中の金利シナリオは保持されます）。
        </p>
        <div className="flex flex-wrap gap-2">
          {RATE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTemplate(t.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                t.id === templateId
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {active.note}
        </p>
      </div>

      <div className="card space-y-5 p-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          借入条件
        </h3>
        <NumberSlider
          label="借入額"
          value={input.loanAmountMan}
          min={0}
          max={1000000}
          step={50}
          onChange={(v) => onChangeInput({ loanAmountMan: v })}
          format={formatManLabel}
          hint="借り入れる金額（万円）。頭金を引いたローンの元金です。"
        />
        <NumberSlider
          label="返済期間"
          value={input.years}
          min={1}
          max={50}
          step={1}
          onChange={(v) => onChangeInput({ years: v })}
          format={(v) => `${v}年`}
          hint="完済までの年数。全期間固定は最長35年が一般的です。"
        />
        <NumberSlider
          label="借入時の年齢"
          value={input.age}
          min={18}
          max={80}
          step={1}
          onChange={(v) => onChangeInput({ age: v })}
          format={(v) => `${v}歳`}
          hint="借入を始めるときの年齢（表示用）。"
        />
      </div>
    </div>
  );
}
