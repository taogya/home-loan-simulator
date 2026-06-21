import { useState } from 'react';
import type { Plan } from '../types';

interface PlanTabsProps {
  plans: Plan[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onRename: (id: string, name: string) => void;
}

export function PlanTabs({
  plans,
  activeId,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  onRename,
}: PlanTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const startRename = (id: string, current: string) => {
    setEditingId(id);
    setDraftName(current);
  };
  const commitRename = () => {
    if (editingId && draftName.trim()) onRename(editingId, draftName.trim());
    setEditingId(null);
  };

  const btnBase =
    'rounded-lg border border-slate-200 px-2 py-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1">
        {plans.map((p) =>
          editingId === p.id ? (
            <input
              key={p.id}
              value={draftName}
              autoFocus
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="w-32 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-indigo-600 dark:bg-slate-900 dark:text-white"
              aria-label="プラン名を入力"
            />
          ) : (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              onDoubleClick={() => startRename(p.id, p.name)}
              title="ダブルクリックで名前変更"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                p.id === activeId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
              }`}
            >
              {p.name}
            </button>
          ),
        )}
      </div>
      <div className="flex items-center gap-1 text-xs">
        <button type="button" onClick={onAdd} className={btnBase}>
          ＋追加
        </button>
        <button type="button" onClick={onDuplicate} className={btnBase}>
          複製
        </button>
        <button
          type="button"
          onClick={() => {
            const target = plans.find((p) => p.id === activeId);
            if (target) startRename(target.id, target.name);
          }}
          className={btnBase}
        >
          名前変更
        </button>
        {plans.length > 1 && (
          <button
            type="button"
            onClick={() => {
              const target = plans.find((p) => p.id === activeId);
              if (
                window.confirm(
                  `「${target?.name ?? ''}」を削除しますか？この操作は元に戻せません。`,
                )
              ) {
                onRemove();
              }
            }}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-500 dark:border-slate-700 dark:text-slate-400"
          >
            削除
          </button>
        )}
      </div>
    </div>
  );
}
