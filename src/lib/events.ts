import type { LifeEvent } from '../types';

export interface EventMarker {
  atAge: number;
  label: string;
  count: number;
  totalMan: number;
  items: { label: string; amountMan: number }[];
}

/** そのイベントが指定年齢で発生するか（定期=N年ごとを考慮） */
export function eventOccursAt(e: LifeEvent, age: number): boolean {
  if (age < e.atAge) return false;
  const interval = e.intervalYears ?? 0;
  if (interval <= 0) return age === e.atAge;
  if (e.untilAge !== undefined && age > e.untilAge) return false;
  return (age - e.atAge) % interval === 0;
}

/**
 * ライフイベントを年齢ごとにまとめる。定期（N年ごと）は範囲内で展開し、
 * 同じ年に複数あればラベルを「○○ 他N件」に集約する。
 */
export function groupEventsByAge(
  events: LifeEvent[] | undefined,
  startAge: number,
  endAge: number,
): EventMarker[] {
  const map = new Map<number, { label: string; amountMan: number }[]>();
  const add = (atAge: number, label: string, amountMan: number) => {
    const list = map.get(atAge) ?? [];
    list.push({ label, amountMan });
    map.set(atAge, list);
  };
  for (const e of events ?? []) {
    const interval = e.intervalYears ?? 0;
    if (interval <= 0) {
      if (e.atAge >= startAge && e.atAge <= endAge) add(e.atAge, e.label, e.amountMan);
    } else {
      const until = e.untilAge ?? endAge;
      for (let age = e.atAge; age <= Math.min(until, endAge); age += interval) {
        if (age >= startAge) add(age, e.label, e.amountMan);
      }
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([atAge, list]) => ({
      atAge,
      label:
        list.length > 1
          ? `${list[0].label} 他${list.length - 1}件`
          : list[0].label,
      count: list.length,
      totalMan: list.reduce((sum, e) => sum + e.amountMan, 0),
      items: list,
    }));
}
