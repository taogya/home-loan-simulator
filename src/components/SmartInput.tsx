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
      {/* スマホ・PC 共通：数値をタップ/クリックすると専用のロータリー＋テンキーを開く */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-end whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-right text-sm font-bold tabular-nums text-indigo-600 shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40 ${className}`}
        title="タップして調整ダイヤル＋テンキーを開く"
        aria-label={`${label}をダイヤル入力`}
      >
        {value === 0 && placeholder ? placeholder : displayVal}
      </button>

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
