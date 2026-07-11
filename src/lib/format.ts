// 金額・数値の表示フォーマット（日本語向け）

/** 円をカンマ区切りの文字列にする（例: 103,250） */
export function formatYen(value: number): string {
  return Math.round(value).toLocaleString('ja-JP');
}

/**
 * 非常に大きな金額を、スマホやサマリーの限られたスペースに美しく収めるための自動ハイブリッド・フォーマッタ。
 * - 1,000万円（100,000,000円）以上：億＋万単位で短縮（例：「1億2,300万円」など）
 * - それ未満：通常のフルカンマ（例：「150,000円」）
 * 円表記とコンパクト表記を極上に自動連動させてはみ出しをゼロにする。
 */
export function formatFlexibleYen(value: number): string {
  const absVal = Math.abs(value);
  if (absVal >= 10000000) { // 1,000万円以上
    return formatJpyCompact(value);
  }
  return `${formatYen(value)}円`;
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

/** 万円単位の数値を「3,500万円」や「1億2,300万円」形式で、3桁カンマ付きで読みやすく表示する（マルチ億万フォーマッタ） */
export function formatManLabel(man: number): string {
  if (man === 0) return '0万円';
  const isNegative = man < 0;
  const absValue = Math.abs(man);
  const oku = Math.floor(absValue / 10000);
  const residualMan = Math.round(absValue % 10000);

  const parts: string[] = [];
  if (oku > 0) {
    parts.push(`${oku.toLocaleString('ja-JP')}億`);
    if (residualMan > 0) {
      parts.push(`${residualMan.toLocaleString('ja-JP')}万`);
    }
  } else {
    parts.push(`${residualMan.toLocaleString('ja-JP')}万`);
  }
  return `${isNegative ? '-' : ''}${parts.join('')}円`;
}

/**
 * 万円単位の数値をグラフのY軸目盛り用にコンパクトな日本語にフォーマットする。
 * 例: 50 -> "50万", 1000 -> "1,000万", 10000 -> "1億", 15000 -> "1.5億"
 */
export function formatChartManYAxis(man: number): string {
  if (man === 0) return '0';
  const isNegative = man < 0;
  const absValue = Math.abs(man);
  let label: string;

  if (absValue >= 10000) {
    const oku = absValue / 10000;
    if (Math.round(oku * 10) % 10 === 0) {
      label = `${Math.round(oku)}億`;
    } else {
      label = `${oku.toFixed(1)}億`;
    }
  } else {
    label = `${absValue.toLocaleString('ja-JP')}万`;
  }
  
  return isNegative ? `-${label}` : label;
}
