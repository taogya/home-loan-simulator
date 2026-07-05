import { useState } from 'react';

export type AppScreen = 'lifeplan' | 'rate';

interface PlanMenuProps {
  /** 現在の画面 */
  screen: AppScreen;
  /** 画面遷移 */
  onNavigate: (screen: AppScreen) => void;
  /** エクスポート（役割は画面ごとに異なる） */
  onExport: () => void;
  /** インポート（役割は画面ごとに異なる） */
  onImport: (file: File) => void;
}

const NAV: { id: AppScreen; label: string; desc: string }[] = [
  { id: 'lifeplan', label: 'ライフプラン', desc: '返済と暮らしのシミュレーション' },
  { id: 'rate', label: '金利シミュレータ', desc: 'プラン比較・金利シナリオ・過去の金利' },
];

export function PlanMenu({ screen, onNavigate, onExport, onImport }: PlanMenuProps) {
  const [open, setOpen] = useState(false);

  const isRate = screen === 'rate';
  const exportLabel = isRate ? '金利シナリオを保存' : 'プランをファイルに保存';
  const importLabel = isRate ? '金利シナリオを読み込み' : 'プランをファイルから読み込み';

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
          <div className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              画面
            </p>
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  onNavigate(n.id);
                  setOpen(false);
                }}
                className={`block w-full px-4 py-2 text-left transition ${
                  screen === n.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <span
                  className={`flex items-center gap-2 text-sm font-semibold ${
                    screen === n.id
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {screen === n.id && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3.5 w-3.5">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                  {n.label}
                </span>
                <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                  {n.desc}
                </span>
              </button>
            ))}

            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
            <p className="px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {isRate ? '金利シナリオ' : 'プラン'}
            </p>
            <button
              type="button"
              onClick={() => {
                onExport();
                setOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {exportLabel}
            </button>
            <label className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
              {importLabel}
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
