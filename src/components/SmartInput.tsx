import { useState } from 'react';
import { RotaryInputModal } from './RotaryInputModal';

interface SmartInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  format?: (value: number) => string;
  className?: string;
  placeholder?: string;
}

export function SmartInput({
  value,
  onChange,
  min,
  max,
  step,
  label,
  format,
  className = '',
  placeholder,
}: SmartInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 表示文字列
  const displayVal = format ? format(value) : value.toLocaleString('ja-JP');

  return (
    <>
      {/* スマホ用：キーボードが出ない、タップして専用ロータリーテンキーを立ち上げるボタン */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`lg:hidden block text-right border border-slate-200 bg-white px-2 py-1 text-sm font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg transition hover:bg-slate-50 dark:hover:bg-slate-800 ${className}`}
        title="タップして調整ダイヤルを開く"
        aria-label={`${label}をダイヤル入力`}
      >
        {value === 0 && placeholder ? placeholder : displayVal}
      </button>

      {/* PC用：通常のマウスでのキーボード数値入力 */}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value === 0 ? '' : value}
        onChange={(e) => {
          const val = Number(e.target.value);
          if (!Number.isNaN(val)) {
            onChange(Math.min(max, Math.max(min, val)));
          }
        }}
        placeholder={placeholder}
        className={`hidden lg:block text-right ${className}`}
        aria-label={label}
      />

      {/* 共通特製ロータリーモーダル */}
      <RotaryInputModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        format={format}
      />
    </>
  );
}
