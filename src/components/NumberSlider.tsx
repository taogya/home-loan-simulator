import { useState } from 'react';

interface NumberSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** 表示値の整形（例: 3500 -> "3,500万円"） */
  format?: (value: number) => string;
  /** 補足説明 */
  hint?: string;
}

export function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
}: NumberSliderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const display = format ? format(value) : value.toLocaleString('ja-JP');

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
  };
  const commit = () => {
    const n = Number(draft);
    if (!Number.isNaN(n) && draft.trim() !== '') {
      onChange(Math.min(max, Math.max(min, n)));
    }
    setEditing(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {label}
        </label>
        {editing ? (
          <input
            type="number"
            value={draft}
            min={min}
            max={max}
            step={step}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="w-28 rounded-lg border border-indigo-300 bg-white px-2 py-0.5 text-right text-lg font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-indigo-600 dark:bg-slate-900 dark:text-white"
            aria-label={`${label}を数値で入力`}
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            title="クリックで直接入力"
            className="rounded text-lg font-bold tabular-nums text-slate-900 underline decoration-dotted decoration-slate-300 underline-offset-4 transition hover:text-indigo-600 hover:decoration-indigo-400 dark:text-white dark:hover:text-indigo-400"
          >
            {display}
          </button>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 dark:bg-slate-700"
        aria-label={label}
      />
      {hint && (
        <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}
