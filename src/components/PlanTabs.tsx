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
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
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
    dragging: boolean;
    immediate: boolean;
  } | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (editingId) return;
    const pointerId = e.pointerId;
    const target = e.currentTarget;
    const isMouse = e.pointerType === 'mouse';
    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      id,
      dragging: false,
      immediate: isMouse,
    };
    clearLongPress();
    if (isMouse) {
      // マウスは即ドラッグ可（少し動かすと並び替え開始）
      try {
        target.setPointerCapture(pointerId);
      } catch {
        // 非対応でも続行
      }
      return;
    }
    // タッチは長押し（約450ms静止）で並び替え。通常タッチは横スクロール。
    longPressTimer.current = window.setTimeout(() => {
      const s = pointerStart.current;
      if (!s || s.id !== id) return;
      s.dragging = true;
      setDragId(id);
      try {
        target.setPointerCapture(pointerId);
      } catch {
        // 非対応でも続行
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    }, 450);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    const start = pointerStart.current;
    if (!start) return;
    if (!start.dragging) {
      const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (start.immediate) {
        // マウス：少し動かすと並び替え開始
        if (dist > 6) {
          start.dragging = true;
          setDragId(start.id);
        }
      } else if (dist > 8) {
        // タッチ：動いたら横スクロール優先（長押しをキャンセル）
        clearLongPress();
        pointerStart.current = null;
        return;
      }
      if (!start.dragging) return;
    }
    // 並び替え中：スクロールを抑制してドラッグ
    e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const tab = el?.closest('[data-plan-id]') as HTMLElement | null;
    const overPlanId = tab?.dataset.planId ?? null;
    setOverId(overPlanId && overPlanId !== start.id ? overPlanId : null);
  };
  const handlePointerUp = (id: string) => {
    clearLongPress();
    const start = pointerStart.current;
    pointerStart.current = null;
    if (start && !start.dragging) {
      onSelect(id);
    } else if (dragId && overId && dragId !== overId) {
      onReorder(dragId, overId);
    }
    setDragId(null);
    setOverId(null);
  };
  const handlePointerCancel = () => {
    clearLongPress();
    pointerStart.current = null;
    setDragId(null);
    setOverId(null);
  };

  const iconBtn =
    'flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
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
              title="長押しで並び替え／ダブルクリックで名前変更"
              style={{ touchAction: dragId === p.id ? 'none' : 'pan-x' }}
              className={`flex shrink-0 cursor-grab select-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition active:cursor-grabbing ${
                p.id === activeId
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
              } ${dragId === p.id ? 'opacity-40' : ''} ${
                overId === p.id ? 'ring-2 ring-indigo-400' : ''
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
    </div>
  );
}
