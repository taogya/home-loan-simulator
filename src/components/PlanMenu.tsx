import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [isMobile, setIsMobile] = useState(false);

  // ウィンドウ幅を監視して、モバイルドロワーとPC用ドロップダウンをJSで完全に切り分ける
  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const isRate = screen === 'rate';
  const exportLabel = isRate ? '金利シナリオを保存' : 'プランをファイルに保存';
  const importLabel = isRate ? '金利シナリオを読み込み' : 'プランをファイルから読み込み';

  // メニュー内のマークアップ要素
  const menuContent = (
    <div className={
      isMobile
        ? "fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-slate-205 bg-white p-4 pb-8 shadow-2xl transition-transform duration-350 dark:border-slate-705 dark:bg-slate-800"
        : "absolute right-0 z-50 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800"
    }>
      {/* モバイル用開閉ノッチ */}
      {isMobile && (
        <div className="mx-auto mb-3.5 h-1.5 w-12 rounded-full bg-slate-250 dark:bg-slate-600" />
      )}
      
      {isMobile && (
        <div className="flex items-center justify-between px-4 pb-2 border-b border-dashed border-slate-100 dark:border-slate-700/50 mb-2">
          <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">操作メニュー</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer"
          >
            閉じる
          </button>
        </div>
      )}

      <p className="px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-405 dark:text-slate-500">
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
          className={`block w-full px-4 py-2.5 text-left rounded-lg transition cursor-pointer ${
            screen === n.id
              ? 'bg-indigo-50 dark:bg-indigo-950/30'
              : 'hover:bg-slate-50 dark:hover:bg-slate-700/60'
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
          <span className="mt-0.5 block text-xs text-slate-405 dark:text-slate-500">
            {n.desc}
          </span>
        </button>
      ))}

      <div className="my-1.5 border-t border-slate-100 dark:border-slate-700" />
      <p className="px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-405 dark:text-slate-500">
        {isRate ? '金利シナリオ' : 'プラン'}
      </p>
      <button
        type="button"
        onClick={() => {
          onExport();
          setOpen(false);
        }}
        className="block w-full px-4 py-2.5 text-left text-sm rounded-lg text-slate-700 font-bold hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60 transition cursor-pointer"
      >
        {exportLabel}
      </button>
      <label className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm rounded-lg text-slate-700 font-bold hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60 transition">
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
  );

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        メニュー
      </button>
      {open && (
        <>
          {/* 
            【極上アクセシビリティハック】：
            外側タップでメニューを閉じる「バックドロップ（画面全体を覆う不可視/半透明のレイヤー）」は、
            モバイル・PCを問わず、必ずスタッキングコンテキストの影響を受けない最上位 (document.body 直下) へポータルとして強制マウントさせます！
            これにより、ヘッダー外のメインコンテンツ部分、入力パーツ、チャート、フッターなど、
            画面全体のどこをとっても、クリック・タップした瞬間に 100% 確実にメニューがシュッと閉じます！
          */}
          {createPortal(
            <div
              className={`fixed inset-0 z-40 transition-opacity cursor-default ${
                isMobile ? 'bg-slate-900/60 backdrop-blur-xs' : 'bg-transparent'
              }`}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />,
            document.body
          )}

          {/* 
            実体メニューコンテナ：
            - モバイル時は、親のレイアウト干渉を避けて画面最下部にフィットさせるため、body 直下にポータル展開。
            - デスクトップ時は、ボタン直下へのぴったりな absolute 吸着配置を活かすためインライン描画。
          */}
          {isMobile ? createPortal(menuContent, document.body) : menuContent}
        </>
      )}
    </div>
  );
}
