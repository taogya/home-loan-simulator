// 金額・数値の表示フォーマット（日本語向け）

/** 円をカンマ区切りの文字列にする（例: 103,250） */
export function formatYen(value: number): string {
  return Math.round(value).toLocaleString('ja-JP');
}

/**
 * 円を「○億○○万円」形式のコンパクト表示にする。
 * 例: 35,000,000 -> "3,500万円", 123,400,000 -> "1億2,340万円"
 */
export function formatJpyCompact(value: number): string {
  const rounded = Math.round(value / 10000) * 10000;
  const oku = Math.floor(rounded / 100000000);
  const man = Math.round((rounded % 100000000) / 10000);
  const parts: string[] = [];
  if (oku > 0) parts.push(`${oku.toLocaleString('ja-JP')}億`);
  if (man > 0 || oku === 0) parts.push(`${man.toLocaleString('ja-JP')}万`);
  return `${parts.join('')}円`;
}

/** 万円単位の数値を「3,500万円」のように表示する */
export function formatManLabel(man: number): string {
  return `${(man ?? 0).toLocaleString('ja-JP')}万円`;
}
