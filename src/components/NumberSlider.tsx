import { useState, useEffect } from 'react';
import { RotaryKnob } from './RotaryKnob';
import { RotaryInputModal } from './RotaryInputModal';

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

function DialIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v10" />
      <path d="M12 12l4 4" />
    </svg>
  );
}

function SliderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <circle cx="14" cy="9" r="2.5" className="fill-white dark:fill-slate-800" />
      <circle cx="8" cy="15" r="2.5" className="fill-white dark:fill-slate-800" />
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDialMode, setIsDialMode] = useState(false);

  const display = format ? format(value) : value.toLocaleString('ja-JP');

  useEffect(() => {
    const handleDialChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setIsDialMode(customEvent.detail);
    };
    window.addEventListener('prefer-dial-change', handleDialChange);
    return () => {
      window.removeEventListener('prefer-dial-change', handleDialChange);
    };
  }, []);

  const toggleDialMode = () => {
    const newMode = !isDialMode;
    localStorage.setItem('prefer-dial', String(newMode));
    setIsDialMode(newMode);
    window.dispatchEvent(new CustomEvent('prefer-dial-change', { detail: newMode }));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
          {label}
          {hint && <HelpTip text={hint} />}
        </label>
        <div className="flex items-center gap-2">
          {/* ダイヤル・スライダー切り替えトグル (スマホではスペース節約のため隠し、PCのみ) */}
          <button
            type="button"
            onClick={toggleDialMode}
            title={isDialMode ? 'スライダー操作に切り替え' : 'ダイヤル操作に切り替え'}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 shadow-sm transition hover:border-indigo-300 hover:bg-slate-100 hover:text-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40"
            aria-label={isDialMode ? 'スライダー操作に切り替え' : 'ダイヤル操作に切り替え'}
          >
            {isDialMode ? <SliderIcon /> : <DialIcon />}
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            title="タップして詳細調整を開く"
            className="group flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-lg font-bold tabular-nums text-slate-900 transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40"
          >
            {display}
            <PencilIcon />
          </button>
        </div>
      </div>
      {/* PC（lg以上）でのみインラインの調整コントローラー（つまみ/スライダー）を表示し、スマホでは非表示にしてスッキリ並べる */}
      {isDialMode ? (
        <div className="hidden lg:block">
          <RotaryKnob
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={onChange}
            label={label}
          />
        </div>
      ) : (
        <div className="hidden lg:flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange(Math.min(max, Math.max(min, value - step)))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:active:bg-slate-900"
            aria-label={`${label}を減らす`}
          >
            −
          </button>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 dark:bg-slate-700"
            aria-label={label}
          />
          <button
            type="button"
            onClick={() => onChange(Math.min(max, Math.max(min, value + step)))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:active:bg-slate-900"
            aria-label={`${label}を増やす`}
          >
            ＋
          </button>
        </div>
      )}
      <RotaryInputModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        format={format}
      />
    </div>
  );
}
