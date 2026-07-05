// 過去の住宅ローン金利推移（店頭＝基準金利）と、主要な日銀の金融政策イベント。
//
// 【重要】ここに載せる金利は「店頭金利（基準金利）」の近似値です。
// 実際に借りる人が払う「適用金利（優遇後）」は、これより 1〜2% 程度低いのが一般的です。
// 出典の考え方：住宅金融支援機構「民間金融機関の住宅ローン金利推移」。
// 年次の代表値に近似しており、正確な月次系列ではありません（傾向の把握用）。

export interface RateHistoryPoint {
  /** 西暦（年初想定の代表値） */
  year: number;
  /** 変動金利型・店頭金利（%）。null=データなし（線を止める） */
  variable: number | null;
  /** 固定金利期間選択型（3年）・店頭金利（%）。null=データなし */
  fixed3: number | null;
  /** 固定金利期間選択型（10年）・店頭金利（%）。null=データなし */
  fixed10: number | null;
}

export interface RateHistoryEvent {
  /** 西暦 */
  year: number;
  /** 月（任意） */
  month?: number;
  /** イベント名 */
  label: string;
  /** 変動の背景・要因（任意） */
  detail?: string;
}

/**
 * 変動・固定3年・固定10年の店頭金利の年次近似（1984〜2025）。
 * 直近の値は添付資料（2024年2月時点：変動2.475% / 固定3年3.310% / 固定10年3.790%）に合わせている。
 */
export const RATE_HISTORY: RateHistoryPoint[] = [
  { year: 1984, variable: 8.4, fixed3: 8.4, fixed10: 8.5 },
  { year: 1985, variable: 8.4, fixed3: 8.4, fixed10: 8.5 },
  { year: 1986, variable: 7.14, fixed3: 7.3, fixed10: 7.5 },
  { year: 1987, variable: 5.64, fixed3: 5.9, fixed10: 6.1 },
  { year: 1988, variable: 5.64, fixed3: 5.9, fixed10: 6.1 },
  { year: 1989, variable: 6.24, fixed3: 6.5, fixed10: 6.8 },
  { year: 1990, variable: 8.5, fixed3: 8.5, fixed10: 8.5 },
  { year: 1991, variable: 8.5, fixed3: 8.4, fixed10: 8.4 },
  { year: 1992, variable: 6.88, fixed3: 6.9, fixed10: 7.0 },
  { year: 1993, variable: 4.9, fixed3: 5.1, fixed10: 5.3 },
  { year: 1994, variable: 4.0, fixed3: 4.3, fixed10: 4.6 },
  { year: 1995, variable: 3.375, fixed3: 3.6, fixed10: 3.9 },
  { year: 1996, variable: 2.625, fixed3: 3.0, fixed10: 3.6 },
  { year: 1997, variable: 2.625, fixed3: 2.9, fixed10: 3.5 },
  { year: 1998, variable: 2.5, fixed3: 2.8, fixed10: 3.4 },
  { year: 1999, variable: 2.375, fixed3: 2.7, fixed10: 3.3 },
  { year: 2000, variable: 2.375, fixed3: 2.75, fixed10: 3.5 },
  { year: 2001, variable: 2.375, fixed3: 2.7, fixed10: 3.35 },
  { year: 2002, variable: 2.375, fixed3: 2.65, fixed10: 3.3 },
  { year: 2003, variable: 2.375, fixed3: 2.6, fixed10: 3.1 },
  { year: 2004, variable: 2.375, fixed3: 2.7, fixed10: 3.4 },
  { year: 2005, variable: 2.375, fixed3: 2.7, fixed10: 3.35 },
  { year: 2006, variable: 2.625, fixed3: 3.0, fixed10: 3.8 },
  { year: 2007, variable: 2.875, fixed3: 3.3, fixed10: 4.0 },
  { year: 2008, variable: 2.875, fixed3: 3.3, fixed10: 4.0 },
  { year: 2009, variable: 2.475, fixed3: 3.0, fixed10: 3.6 },
  { year: 2010, variable: 2.475, fixed3: 2.9, fixed10: 3.35 },
  { year: 2011, variable: 2.475, fixed3: 2.85, fixed10: 3.3 },
  { year: 2012, variable: 2.475, fixed3: 2.85, fixed10: 3.25 },
  { year: 2013, variable: 2.475, fixed3: 2.9, fixed10: 3.35 },
  { year: 2014, variable: 2.475, fixed3: 2.9, fixed10: 3.35 },
  { year: 2015, variable: 2.475, fixed3: 2.85, fixed10: 3.3 },
  { year: 2016, variable: 2.475, fixed3: 2.8, fixed10: 3.1 },
  { year: 2017, variable: 2.475, fixed3: 2.85, fixed10: 3.3 },
  { year: 2018, variable: 2.475, fixed3: 2.9, fixed10: 3.35 },
  { year: 2019, variable: 2.475, fixed3: 2.9, fixed10: 3.35 },
  { year: 2020, variable: 2.475, fixed3: 2.9, fixed10: 3.35 },
  { year: 2021, variable: 2.475, fixed3: 2.9, fixed10: 3.35 },
  { year: 2022, variable: 2.475, fixed3: 2.95, fixed10: 3.4 },
  { year: 2023, variable: 2.475, fixed3: 3.1, fixed10: 3.6 },
  { year: 2024, variable: 2.475, fixed3: 3.31, fixed10: 3.79 },
  { year: 2025, variable: 2.625, fixed3: 3.45, fixed10: 3.95 },
  { year: 2026, variable: 2.875, fixed3: 3.6, fixed10: 4.1 },
];

/** 主要な日銀の金融政策イベント（金利変動の背景）。グラフの変動点に対応。 */
export const RATE_EVENTS: RateHistoryEvent[] = [
  { year: 1990, label: 'バブル期の高金利（変動 約8.5%）', detail: '資産バブル抑制のための金融引き締め' },
  { year: 1991, label: 'バブル崩壊・金融緩和開始', detail: '公定歩合の連続引き下げ（景気後退入り）' },
  { year: 1995, month: 9, label: '超低金利時代へ（公定歩合0.5%）', detail: '円高・景気低迷への対応' },
  { year: 1999, month: 2, label: 'ゼロ金利政策 導入', detail: 'バブル崩壊後の景気低迷・デフレ懸念' },
  { year: 2000, month: 8, label: 'ゼロ金利政策 一時解除', detail: '景気回復期待（翌年に再び緩和へ）' },
  { year: 2001, month: 3, label: '量的緩和策 導入', detail: 'ITバブル崩壊・デフレの長期化' },
  { year: 2006, month: 3, label: '量的緩和策 解除', detail: '景気回復・デフレ脱却の兆し' },
  { year: 2006, month: 7, label: 'ゼロ金利政策 解除', detail: '景気拡大の継続を確認' },
  { year: 2007, month: 2, label: '日銀 追加利上げ', detail: '景気拡大の継続' },
  { year: 2008, month: 10, label: '日銀 利下げ', detail: 'リーマンショック（世界金融危機）' },
  { year: 2008, month: 12, label: '日銀 追加利下げ', detail: '世界的な景気後退・急速な円高' },
  { year: 2010, month: 10, label: '実質ゼロ金利政策', detail: '円高・景気減速への対応' },
  { year: 2013, month: 4, label: '量的・質的金融緩和', detail: 'アベノミクス・2%物価目標（デフレ脱却）' },
  { year: 2016, month: 1, label: 'マイナス金利政策', detail: '物価低迷への追加緩和' },
  { year: 2016, month: 9, label: '長短金利操作付き緩和', detail: 'イールドカーブ・コントロール導入' },
  { year: 2022, month: 12, label: '長期金利の上限引き上げ（緩和修正）', detail: '世界的インフレ・円安（固定金利が上昇）' },
  { year: 2024, month: 3, label: 'マイナス金利政策 解除', detail: '賃上げ・物価上昇の定着' },
  { year: 2024, month: 7, label: '日銀 追加利上げ', detail: '物価上昇・円安への対応' },
  { year: 2025, month: 1, label: '日銀 追加利上げ（政策金利0.5%）', detail: '物価・賃金の上昇が継続' },
];
