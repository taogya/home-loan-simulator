import { useState } from 'react';

interface PlanMenuProps {
  onExport: () => void;
  onImport: (file: File) => void;
}

export function PlanMenu({ onExport, onImport }: PlanMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        メニュー
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                onExport();
                setOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              ファイルに保存
            </button>
            <label className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
              ファイルから読み込み
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImport(file);
                  setOpen(false);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
