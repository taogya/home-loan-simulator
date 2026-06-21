import { useState } from 'react';
import type { ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/60"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {title}
        </span>
        <span className="text-slate-400 dark:text-slate-500">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <div className="space-y-5 border-t border-slate-200/80 px-4 pb-4 pt-4 dark:border-slate-700/60">
          {children}
        </div>
      )}
    </div>
  );
}
