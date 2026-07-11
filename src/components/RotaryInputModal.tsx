import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RotaryKnob } from './RotaryKnob';

interface RotaryInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}

export function RotaryInputModal(props: RotaryInputModalProps) {
  // 開いている間だけ中身をマウントすることで、開くたびにローカル状態が value で初期化される
  // （エフェクト内での setState を避け、カスケードレンダリングを防ぐ）。
  if (!props.isOpen) return null;
  // かんたんウィザード等の overflow-y-auto なスクロールコンテナや backdrop-filter を持つ
  // 親の内側にレンダリングされると、iOS Safari でモーダル下部（保存/キャンセル）の
  // タップ判定・重なり順が壊れる。document.body 直下へポータルして親の影響から切り離す。
  return createPortal(<RotaryInputModalContent {...props} />, document.body);
}

function RotaryInputModalContent({
  onClose,
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: Omit<RotaryInputModalProps, 'isOpen'>) {
  // ローカルドラフト（保存確定時のみ適用するため、親の値を汚さないローカル状態）
  const [localValue, setLocalValue] = useState(value);
  // テンキー入力用の一時バッファ
  const [numStr, setNumStr] = useState('');
  // 不正値（限界超過）への優しくカッコいいエラーアナウンス状態
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // モーダル表示中は背景スクロールを止める（マウント/アンマウントで制御）
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);


  // 内部数値の最大桁数などを定義する
  const handleKeyPadPress = (key: string) => {
    setErrorMessage(null); // キーを打つたびにエラーはクリア

    if (key === 'C') {
      setNumStr('');
      setLocalValue(0);
      return;
    }

    setNumStr((prev) => {
      let next = prev === '0' ? '' : prev;
      
      if (key === '00') {
        if (next === '' || next === '0') return '';
        next = next + '00';
      } else if (key === '.') {
        if (next.includes('.')) return prev;
        if (next === '') next = '0';
        next = next + '.';
      } else {
        if (next.length >= 8) return prev;
        next = next + key;
      }

      // 入力中の値をローカル値に解析保存（クランプは確定時まであえて行わない！）
      const parsed = Number(next);
      if (!Number.isNaN(parsed) && next !== '' && !next.endsWith('.')) {
        // 金利を800%のように非常識な限界超過状態にされたとき、
        // ダイヤルの表示角度計算(0〜1パーセンテージ)が破綻してグラフィックが千切れてしまわないよう、
        // ダイヤルノブ側（グラフィックモデル）に伝える内部バッファ値だけは最大値で防壁クランプします
        setLocalValue(Math.min(max * 1.5, Math.max(min, parsed)));
      }
      return next;
    });
  };

  const handleCommit = () => {
    let finalRaw = localValue;
    if (numStr !== '') {
      const parsed = Number(numStr);
      if (!Number.isNaN(parsed)) {
        finalRaw = parsed;
      }
    }

    // 確定しようとした値が規定範囲（min...max）を超えている場合、
    // 親画面に勝手に戻って丸めるのをやめ、液晶の直下にくっきりとしたエラーアナウンスを表示して警告します！
    if (finalRaw < min || finalRaw > max) {
      const minTxt = format ? format(min) : min.toLocaleString('ja-JP');
      const maxTxt = format ? format(max) : max.toLocaleString('ja-JP');
      setErrorMessage(`⚠️ 入力は${minTxt}以上、${maxTxt}以下にしてください`);
      return;
    }

    // 正確にステップにスナップ
    const finalVal = Math.round(finalRaw / step) * step;
    const decimals = (String(step).split('.')[1] || '').length;
    
    onChange(Number(finalVal.toFixed(decimals)));
    onClose();
  };

  // 常に整形された現在のローカル編集時数値を表示
  const typingDisplay = () => {
    if (numStr === '') {
      return format ? format(localValue) : localValue.toLocaleString('ja-JP');
    }
    if (numStr.endsWith('.')) {
      const base = Number(numStr.slice(0, -1)).toLocaleString('ja-JP') + '.';
      if (label.includes('金利') || label.includes('率')) return base + '%';
      return base;
    }
    const parsed = Number(numStr);
    if (Number.isNaN(parsed)) {
      return numStr;
    }
    return format ? format(parsed) : parsed.toLocaleString('ja-JP');
  };

  // 小数ステップを入力する項目（金利、昇給率、ボーナス数など）かどうか
  const isDecimalProject = step < 1;
  // 万円単位など大きく増やすための 00 ボタンを入れる項目かどうか（金額や貯蓄等）
  const isLargeRangeProject = max >= 1000;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:items-center md:p-4 animate-fade-in"
    >
      {/* モーダル外側タップで閉じるための非表示エリア（親の値を変更せず、優しくなめらかにキャンセル） */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* メインダイアログ (iPhone SE等の極小スマホに合わせた超省スペース・スリム化レイアウト) */}
      <div
        ref={modalRef}
        className="relative w-full max-h-[96vh] bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-xl md:max-w-sm shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200"
      >
        {/* モーダルヘッダー引っ張りバー（スマホ用） */}
        <div className="mx-auto my-2 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700 md:hidden" />

        {/* ヘッダー：コンパクトサイズに縮小 */}
        <div className="flex items-center justify-between px-4 pb-1 md:pt-2">
          <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
            🎛️ {label} の調整
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* 調整メイン領域：余白とマージンを引き締め、高さを制限 */}
        <div className="px-4 py-2 flex flex-col gap-3">
          
          {/* テロップディスプレイ (ライト/ダーク両調和・液晶表示部のみにミニマライズ) */}
          <div className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl p-2 md:p-3 text-center shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="text-2xl font-black text-indigo-650 dark:text-indigo-400 tracking-tight tabular-nums drop-shadow-[0_0_8px_rgba(99,102,241,0.25)]">
              {typingDisplay()}
            </div>
            {errorMessage && (
              <div className="text-[10px] md:text-xs font-bold text-rose-500 mt-1 dark:text-rose-400 animate-pulse whitespace-normal text-center bg-rose-50 dark:bg-rose-950/20 py-1.5 px-2 rounded-lg mt-1.5 border border-rose-100/40 dark:border-rose-900/40">
                {errorMessage}
              </div>
            )}
          </div>

          {/* つまみ（左）とテンキー（右）の並列コンパクトレイアウト */}
          <div className="grid grid-cols-2 gap-4 w-full items-center">
            
            {/* つまみ：枠サイズと余白を詰める */}
            <div className="flex flex-col items-center justify-center py-1.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-radial-none dark:bg-slate-950/10">
              <RotaryKnob
                value={localValue}
                min={min}
                max={max}
                step={step}
                onChange={(val) => {
                  setLocalValue(val);
                  // ノブの回転を検知したらテンキーの一時バッファをクリア（ノブのリアルタイム優先）
                  setNumStr('');
                }}
                label={label}
              />
            </div>

            {/* 電卓風 特製テンキーパッド：ボタンをスリムにして1画面に完璧に収める */}
            <div className="flex flex-col gap-1 w-full justify-center">
              <div className="grid grid-cols-3 gap-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeyPadPress(digit)}
                    className="h-8 text-sm font-bold rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition"
                  >
                    {digit}
                  </button>
                ))}
                
                {/* C（クリア）、0、万の代わりに「00」や「小数点」で機能性を何倍にも引き上げる */}
                <button
                  type="button"
                  onClick={() => handleKeyPadPress('C')}
                  className="h-8 text-sm font-bold rounded-lg border border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 hover:bg-red-100 active:scale-95 transition"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPadPress('0')}
                  className="h-8 text-sm font-bold rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition"
                >
                  0
                </button>
                
                {/* 借入類なら 00 キー、小数なら小数点キー、それ以外は無効化キーにインテリジェントに出し分け */}
                {isDecimalProject ? (
                  <button
                    type="button"
                    onClick={() => handleKeyPadPress('.')}
                    className="h-8 text-sm font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-400 hover:bg-indigo-100 active:scale-95 transition"
                    aria-label="小数点"
                  >
                    .
                  </button>
                ) : isLargeRangeProject ? (
                  <button
                    type="button"
                    onClick={() => handleKeyPadPress('00')}
                    className="h-8 text-xs font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-400 hover:bg-indigo-100 active:scale-95 transition"
                  >
                    00
                  </button>
                ) : (
                  <button
                    type="button"
                    className="h-8 rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-850 dark:border-slate-800 cursor-not-allowed opacity-30"
                    disabled
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 決定・キャンセルボタン（ポリシーに完璧に一致して左保存・右キャンセル、SE向け極スリム化） */}
        <div className="grid grid-cols-2 gap-2.5 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-b-2xl">
          <button
            type="button"
            onClick={handleCommit}
            className="py-2 text-xs font-extrabold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
          >
            設定を保存
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 text-xs font-bold rounded-lg border border-slate-205 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 transition"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
