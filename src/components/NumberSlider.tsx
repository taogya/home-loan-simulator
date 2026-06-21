import { useState } from 'react';

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-indigo-500"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function HelpTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold leading-none text-slate-500 transition hover:bg-indigo-500 hover:text-white dark:bg-slate-700 dark:text-slate-300"
        aria-label="説明を表示"
      >
        ?
      </button>
      {show && (
        <span
          role="tooltip"
          className="absolute top-full left-0 z-30 mt-1.5 w-52 rounded-lg bg-slate-800 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg dark:bg-slate-700"
        >
          {text}
        </span>
      )}
    </span>
  );
}

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
        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
          {label}
          {hint && <HelpTip text={hint} />}
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
            title="タップして数値を入力"
            className="group flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-lg font-bold tabular-nums text-slate-900 transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40"
          >
            {display}
            <PencilIcon />
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
    </div>
  );
}
