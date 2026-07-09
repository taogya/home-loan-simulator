import React, { useState, useEffect, useRef } from 'react';
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

export function RotaryInputModal({
  isOpen,
  onClose,
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: RotaryInputModalProps) {
  // テンキー入力用の一時バッファ
  const [numStr, setNumStr] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // モーダル表示時に背後のスクロールをロック
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDisplay = format ? format(value) : value.toLocaleString('ja-JP');

  // 内部数値の最大桁数などを定義する
  const handleKeyPadPress = (key: string) => {
    if (key === 'C') {
      setNumStr('');
      return;
    }

    // 「万」ボタン等のショートカット
    if (key === '万') {
      setNumStr((prev) => {
        if (prev === '') return '';
        // 「35」 -> 「3500」 (2つのゼロを追加)
        if (prev.length <= 2) {
          return prev + '00';
        }
        return prev;
      });
      return;
    }

    // 通常の数字入力
    setNumStr((prev) => {
      if (prev.length >= 6) return prev;
      return prev + key;
    });
  };

  const handleCommit = () => {
    if (numStr !== '') {
      const parsed = Number(numStr);
      if (!Number.isNaN(parsed)) {
        let finalVal = Math.max(min, Math.min(max, parsed));
        // ステップにスナップ
        finalVal = Math.round(finalVal / step) * step;
        const decimals = (String(step).split('.')[1] || '').length;
        onChange(Number(finalVal.toFixed(decimals)));
      }
    }
    onClose();
  };

  // 数字入力中の表示テキスト
  const typingDisplay = () => {
    if (numStr === '') return currentDisplay;
    const tempNum = Number(numStr);
    return format ? format(tempNum) : tempNum.toLocaleString('ja-JP');
  };

  const isLargeRange = max > 1000;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm p-0 md:items-center md:p-4 animate-fade-in"
    >
      {/* モーダル外側タップで閉じるための非表示エリア */}
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
          </div>

          {/* つまみ（左）とテンキー（右）の並列コンパクトレイアウト */}
          <div className="grid grid-cols-2 gap-4 w-full items-center">
            
            {/* つまみ：枠サイズと余白を詰める */}
            <div className="flex flex-col items-center justify-center py-1.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-radial-none dark:bg-slate-950/10">
              <RotaryKnob
                value={numStr !== '' ? Number(numStr) : value}
                min={min}
                max={max}
                step={step}
                onChange={(val) => {
                  onChange(val);
                  setNumStr(''); // ダイヤル回した時はプレーンテキストをリセット
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
                
                {/* C（クリア）、0、万（単位スナップ） */}
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
                <button
                  type="button"
                  onClick={() => handleKeyPadPress('万')}
                  className={`h-8 text-xs font-bold rounded-lg border transition active:scale-95
                    ${
                      isLargeRange
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-400 hover:bg-indigo-100'
                        : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-800'
                    }
                  `}
                  disabled={!isLargeRange}
                >
                  万
                </button>
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
            設定を保存 (確定)
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
