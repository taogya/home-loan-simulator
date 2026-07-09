import { useRef, useState } from 'react';
import { RotaryInputModal } from '../RotaryInputModal';

interface DecimalInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  /** 未フォーカス時の小数桁数（表示用） */
  decimals?: number;
  /** 右に添える単位（% など） */
  suffix?: string;
  ariaLabel: string;
  /** 入力欄の幅クラス（Tailwind） */
  widthClass?: string;
}

/** 未フォーカス時の表示文字列を作る（小数桁を固定）。 */
function display(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '';
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
}

/**
 * 数値入力欄。type="text" + inputMode="decimal" で自由に編集できる。
 * - フォーカス中は全選択して打ち替えやすく（先頭0が残らない）
 * - 途中の空欄・"."・"0" を許容し、確定できる値だけ onChange
 * - 未フォーカス時は指定桁数で整形表示（例: 1.00 / 1.25）
 */
export function DecimalInput({
  value,
  onChange,
  min = 0,
  max = 100,
  decimals = 2,
  suffix,
  ariaLabel,
  widthClass = 'w-20',
}: DecimalInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const formattedDisplay = display(value, decimals) + (suffix ?? '');

  return (
    <span className="inline-flex items-center gap-1">
      {/* スマホ用：タップ選択式、キーボードは出さずに専用ダイヤルテンキーを展開 */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`lg:hidden block cursor-pointer select-none rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-sm font-bold tabular-nums text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white transition hover:bg-slate-50 dark:hover:bg-slate-800 ${widthClass}`}
        title="タップして調整ダイヤルを開く"
        aria-label={`${ariaLabel}をダイヤル入力`}
      >
        {formattedDisplay}
      </button>

      {/* PC用：通常の手入力キーボード（従来どおり） */}
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={focused ? draft : display(value, decimals)}
        onFocus={(e) => {
          setFocused(true);
          setDraft(String(value));
          // 打ち替えやすいよう全選択（先頭0が残らない）
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          const raw = e.target.value;
          // 数字・小数点・マイナスのみ許容
          if (!/^-?\d*\.?\d*$/.test(raw)) return;
          setDraft(raw);
          if (raw.trim() !== '' && raw !== '.' && raw !== '-') {
            const n = Number(raw);
            if (!Number.isNaN(n)) onChange(clamp(n));
          }
        }}
        onBlur={() => {
          setFocused(false);
          const n = Number(draft);
          if (!(draft.trim() === '' || Number.isNaN(n))) onChange(clamp(n));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') ref.current?.blur();
        }}
        className={`${widthClass} hidden lg:block rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-sm font-bold tabular-nums text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white`}
        aria-label={ariaLabel}
      />
      {suffix && <span className="text-xs text-slate-400">{suffix}</span>}

      <RotaryInputModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        label={ariaLabel}
        value={value}
        min={min}
        max={max}
        step={1 / Math.pow(10, decimals)} // 小数第2位なら 0.01、第1位なら 0.1 をステップ単位にする
        onChange={onChange}
        format={(v) => display(v, decimals) + (suffix ?? '')}
      />
    </span>
  );
}
