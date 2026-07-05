// 過去の金利データ（推移＋イベント）のインポート／初期化。
// 内蔵データ（data/rateHistory.ts）を既定とし、ユーザーが読み込んだデータがあれば
// それを優先する。「初期状態に戻す」で内蔵データへ復帰できる。

import {
  RATE_EVENTS,
  RATE_HISTORY,
  type RateHistoryEvent,
  type RateHistoryPoint,
} from '../data/rateHistory';

const HISTORY_KEY = 'hlp-rate-history';
export const RATE_HISTORY_KIND = 'home-loan-rate-history';

export interface RateHistoryData {
  /** スキーマ識別子 */
  kind: 'home-loan-rate-history';
  /** データ構造のバージョン */
  version: number;
  /** 金利推移（年次） */
  points: RateHistoryPoint[];
  /** 金融政策イベント */
  events: RateHistoryEvent[];
}

/** 内蔵データを返す。 */
export function builtinHistory(): RateHistoryData {
  return {
    kind: RATE_HISTORY_KIND,
    version: 1,
    points: RATE_HISTORY,
    events: RATE_EVENTS,
  };
}

/** 履歴データが妥当か（インポート時の検証）。 */
export function isValidHistory(value: unknown): value is RateHistoryData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.points) || v.points.length === 0) return false;
  return v.points.every(
    (p) =>
      typeof p === 'object' &&
      p !== null &&
      typeof (p as Record<string, unknown>).year === 'number',
  );
}

/** インポートした履歴データを安全に正規化する。 */
export function normalizeHistory(raw: RateHistoryData): RateHistoryData {
  const points: RateHistoryPoint[] = (raw.points ?? [])
    .filter((p) => Number.isFinite(p.year))
    .map((p) => ({
      year: Math.round(p.year),
      variable: Number.isFinite(p.variable) ? Number(p.variable) : null,
      fixed3: Number.isFinite(p.fixed3) ? Number(p.fixed3) : null,
      fixed10: Number.isFinite(p.fixed10) ? Number(p.fixed10) : null,
    }))
    .sort((a, b) => a.year - b.year);
  const events: RateHistoryEvent[] = Array.isArray(raw.events)
    ? raw.events
        .filter(
          (e) => Number.isFinite(e.year) && typeof e.label === 'string' && e.label,
        )
        .map((e) => ({
          year: Math.round(e.year),
          month: Number.isFinite(e.month) ? Math.round(e.month as number) : undefined,
          label: String(e.label),
          detail: typeof e.detail === 'string' ? e.detail : undefined,
        }))
        .sort((a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0))
    : [];
  return { kind: RATE_HISTORY_KIND, version: 1, points, events };
}

/** 履歴データを読み込む（カスタムがあればそれを、無ければ内蔵）。 */
export function loadHistoryData(): { data: RateHistoryData; custom: boolean } {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidHistory(parsed)) {
        return { data: normalizeHistory(parsed), custom: true };
      }
    }
  } catch {
    // 壊れていたら内蔵へ
  }
  return { data: builtinHistory(), custom: false };
}

/** カスタム履歴データを保存する。 */
export function saveHistoryData(data: RateHistoryData): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
  } catch {
    // 保存できない場合は無視
  }
}

/** カスタム履歴データを消去して内蔵へ戻す。 */
export function clearHistoryData(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // 無視
  }
}
