import { useEffect, useRef, useState } from 'react';
import type { Plan } from '../types';
import { PLAN_COLORS } from '../lib/planColors';

function TabIcon({ d, className }: { d: string[]; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-4 w-4'}
      aria-hidden
    >
      {d.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

interface PlanTabsProps {
  plans: Plan[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onRename: (id: string, name: string) => void;
  onReorder: (fromId: string, toId: string) => void;
}

export function PlanTabs({
  plans,
  activeId,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  onRename,
  onReorder,
}: PlanTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [reorderOpen, setReorderOpen] = useState(false);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = activeRef.current;
    const container = el?.parentElement;
    if (el && container) {
      const target =
        el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
      container.scrollTo({ left: target, behavior: 'smooth' });
    }
  }, [activeId]);

  const startRename = (id: string, current: string) => {
    setEditingId(id);
    setDraftName(current);
  };
  const commitRename = () => {
    if (editingId && draftName.trim()) onRename(editingId, draftName.trim());
    setEditingId(null);
  };

  const pointerStart = useRef<{
    x: number;
    y: number;
    id: string;
    moved: boolean;
    fired: boolean;
  } | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // タップで選択、長押しで並び替えダイアログを開く。横方向の動きはスクロールに任せる。
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (editingId) return;
    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      id,
      moved: false,
      fired: false,
    };
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      const s = pointerStart.current;
      if (!s || s.id !== id || s.moved) return;
      s.fired = true;
      setReorderOpen(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    }, 500);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    const start = pointerStart.current;
    if (!start || start.moved) return;
    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (dist > 8) {
      start.moved = true;
      clearLongPress();
    }
  };
  const handlePointerUp = (id: string) => {
    clearLongPress();
    const start = pointerStart.current;
    pointerStart.current = null;
    if (start && !start.moved && !start.fired) {
      onSelect(id);
    }
  };
  const handlePointerCancel = () => {
    clearLongPress();
    pointerStart.current = null;
  };

  const movePlan = (id: string, dir: -1 | 1) => {
    const idx = plans.findIndex((p) => p.id === id);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= plans.length) return;
    onReorder(id, plans[target].id);
  };

  const iconBtn =
    'flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="scrollbar-hide flex flex-1 gap-1.5 overflow-x-auto pb-1">
        {plans.map((p, idx) =>
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
              ref={p.id === activeId ? activeRef : null}
              type="button"
              data-plan-id={p.id}
              onPointerDown={(e) => handlePointerDown(e, p.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={() => handlePointerUp(p.id)}
              onPointerCancel={handlePointerCancel}
              onDoubleClick={() => startRename(p.id, p.name)}
              title="タップで選択／長押しで並び替え"
              className={`flex shrink-0 select-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                p.id === activeId
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length] }}
              />
              {p.name}
            </button>
          ),
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onAdd}
          className={iconBtn}
          title="プランを追加"
          aria-label="プランを追加"
        >
          <TabIcon d={['M12 5v14', 'M5 12h14']} />
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className={iconBtn}
          title="複製"
          aria-label="プランを複製"
        >
          <TabIcon
            d={[
              'M9 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z',
              'M5 15V5a2 2 0 0 1 2-2h8',
            ]}
          />
        </button>
        <button
          type="button"
          onClick={() => {
            const target = plans.find((p) => p.id === activeId);
            if (target) startRename(target.id, target.name);
          }}
          className={iconBtn}
          title="名前変更"
          aria-label="プラン名を変更"
        >
          <TabIcon d={['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z']} />
        </button>
        {plans.length > 1 && (
          <button
            type="button"
            onClick={() => setReorderOpen(true)}
            className={iconBtn}
            title="並び替え"
            aria-label="プランを並び替え"
          >
            <TabIcon
              d={['M7 4v16', 'M4 7l3-3 3 3', 'M17 20V4', 'M14 17l3 3 3-3']}
            />
          </button>
        )}
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
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-rose-50 hover:text-rose-500 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-950/40"
            title="削除"
            aria-label="プランを削除"
          >
            <TabIcon
              d={[
                'M3 6h18',
                'M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2',
                'M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6',
                'M10 11v6M14 11v6',
              ]}
            />
          </button>
        )}
      </div>
      {reorderOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="閉じる"
            className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setReorderOpen(false)}
          />
          <div className="relative z-10 max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600 sm:hidden" />
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                プランの並び替え
              </p>
              <button
                type="button"
                onClick={() => setReorderOpen(false)}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400"
              >
                完了
              </button>
            </div>
            <ul className="space-y-1.5">
              {plans.map((p, idx) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length] }}
                  />
                  <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                    {p.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => movePlan(p.id, -1)}
                    disabled={idx === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-white disabled:opacity-30 dark:border-slate-700 dark:text-slate-400"
                    aria-label="上へ"
                  >
                    <TabIcon d={['M18 15l-6-6-6 6']} className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePlan(p.id, 1)}
                    disabled={idx === plans.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-white disabled:opacity-30 dark:border-slate-700 dark:text-slate-400"
                    aria-label="下へ"
                  >
                    <TabIcon d={['M6 9l6 6 6-6']} className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
