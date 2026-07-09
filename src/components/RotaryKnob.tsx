import React, { useRef, useState, useEffect } from 'react';

interface RotaryKnobProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label: string;
}

export function RotaryKnob({ value, min, max, step, onChange, label }: RotaryKnobProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rotAngle, setRotAngle] = useState(0); // つまみ自体の表示角度 (deg)

  // 直前のポインター角度
  const prevAngleRef = useRef<number | null>(null);
  const accumulatedAngleRef = useRef<number>(0); // 45度ステップ判定用の累積角度
  const lastTimeRef = useRef<number | null>(null);
  const moveHistoryRef = useRef<{ time: number; dAngle: number }[]>([]);

  // つまみ自身の物理回転角度（境界制限なしで、何周でもぐるぐる回り続ける）
  const physicalAngleRef = useRef<number>(0);

  // 現在の値をパーセンテージに換算 (0〜1)
  const range = max - min;
  const pct = range > 0 ? (value - min) / range : 0;

  // アンプつまみは通常下側が開いた約 270度 の範囲で回転する
  // 最小値: -135度 (左斜め下)、最大値: +135度 (右斜め下)
  const minAngle = -135;
  const maxAngle = 135;
  const angleRange = maxAngle - minAngle; // 270度

  // 値の割合からつまみの表示角度を決定する
  useEffect(() => {
    if (!isDragging) {
      const targetAngle = minAngle + pct * angleRange;
      setRotAngle(targetAngle);
      physicalAngleRef.current = targetAngle; // 物理回転角も同期
    }
  }, [value, min, max, isDragging, pct, angleRange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (knobRef.current) {
      knobRef.current.setPointerCapture(e.pointerId);
      setIsDragging(true);

      const rect = knobRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // 初回の角度 (ラジアン)
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      prevAngleRef.current = angle;
      accumulatedAngleRef.current = 0; // 開始時にズレをゼロリセット
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || prevAngleRef.current === null || !knobRef.current) return;

    const rect = knobRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    let dAngle = currentAngle - prevAngleRef.current;

    // 180度を跨いだときの補正
    if (dAngle > Math.PI) dAngle -= 2 * Math.PI;
    if (dAngle < -Math.PI) dAngle += 2 * Math.PI;

    prevAngleRef.current = currentAngle;

    // 1/8 回転 (45度 = Math.PI / 4) ごとに正確に 1ステップ 変化させる仕様。
    // スピードによる変化を排し、回した分だけ規則正しく連動するためバグっぽさが完全に消え、直感的。
    const ANGLE_PER_STEP = Math.PI / 4; // 45度
    accumulatedAngleRef.current += dAngle;

    if (Math.abs(accumulatedAngleRef.current) >= ANGLE_PER_STEP) {
      const steps = Math.trunc(accumulatedAngleRef.current / ANGLE_PER_STEP);
      accumulatedAngleRef.current -= steps * ANGLE_PER_STEP;

      let newValue = value + steps * step;
      newValue = Math.max(min, Math.min(max, newValue));
      const snappedValue = Math.round(newValue / step) * step;

      const stepDecimals = (String(step).split('.')[1] || '').length;
      const finalVal = Number(snappedValue.toFixed(stepDecimals));

      if (finalVal !== value) {
        onChange(finalVal);
      }
    }

    // つまみの表示上は、指のドラッグ角度に完全に追随して無限に回転させ続ける
    setRotAngle((prev) => prev + dAngle * (180 / Math.PI));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    prevAngleRef.current = null;
    accumulatedAngleRef.current = 0;
    // 指を離したタイミングで、表示角度を現在の値にマッチした本来のアンプ角にスナップ
    const targetAngle = minAngle + pct * angleRange;
    setRotAngle(targetAngle);
  };

  // 目盛り用の点 (270度を10等分して並べる)
  const ticks = [];
  const tickCount = 11; // 10区間
  for (let i = 0; i < tickCount; i++) {
    const tickPct = i / (tickCount - 1);
    const tickAngle = minAngle + tickPct * angleRange;
    // CSSの回転のためにラジアン換算
    const rad = ((tickAngle - 90) * Math.PI) / 180;
    const r = 40; // 目盛りの半径
    const tx = Math.cos(rad) * r;
    const ty = Math.sin(rad) * r;
    // この目盛りが現在の値以下かどうか
    const isActive = tickPct <= pct;
    ticks.push({ x: tx, y: ty, isActive });
  }

  return (
    <div className="relative h-28 w-28 flex items-center justify-center select-none">
      
      {/* 背景の光るゲージ、または目盛りドット */}
      <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100">
          {/* 目盛りドットを描画 */}
          {ticks.map((tick, idx) => (
            <circle
              key={idx}
              cx={50 + tick.x}
              cy={50 + tick.y}
              r={tick.isActive ? 2 : 1.5}
              className={`transition-colors duration-150 ${
                tick.isActive
                  ? 'fill-indigo-500 shadow-glow dark:fill-indigo-400'
                  : 'fill-slate-300 dark:fill-slate-700'
              }`}
            />
          ))}
          {/* LEDゲージ（円弧を描く） */}
          <path
            d="M 21.7 78.3 A 40 40 0 1 1 78.3 78.3"
            fill="none"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {pct > 0 && (
            <path
              d={`M 21.7 78.3 A 40 40 0 ${pct > 0.65 ? 1 : 0} 1 ${
                50 + Math.cos(((minAngle + pct * angleRange - 90) * Math.PI) / 180) * 40
              } ${50 + Math.sin(((minAngle + pct * angleRange - 90) * Math.PI) / 180) * 40}`}
              fill="none"
              stroke="url(#blue-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              className="drop-shadow-[0_0_2px_rgba(99,102,241,0.5)]"
            />
          )}
          <defs>
            <linearGradient id="blue-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>
        </svg>

        {/* 回すノブ */}
        <div
          ref={knobRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `rotate(${rotAngle}deg)`,
            touchAction: 'none',
          }}
          className={`h-18 w-18 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center relative
            border border-slate-300 dark:border-slate-800
            shadow-[0_4px_10px_rgba(0,0,0,0.15),inset_0_2px_4px_rgba(255,255,255,0.8)]
            dark:shadow-[0_4px_10px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.1)]
            bg-gradient-to-b from-slate-50 to-slate-200
            dark:from-slate-800 dark:to-slate-900
            transition-shadow duration-150
            ${isDragging ? 'shadow-[0_2px_6px_rgba(99,102,241,0.3)] ring-2 ring-indigo-500/20' : ''}
          `}
          aria-label={label}
        >
          {/* ヘアライン調メタル仕上げ（円形のスジ、同心円のグラデーション） */}
          <div className="absolute inset-0.5 rounded-full bg-gradient-to-tr from-slate-100 to-slate-800 opacity-10 pointer-events-none" />

          {/* 指のくぼみ（ダブレット/インジケーター） */}
          <div
            className={`absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full pointer-events-none transition-transform
              ${
                isDragging
                  ? 'bg-indigo-600 dark:bg-indigo-400 scale-125'
                  : 'bg-slate-400 dark:bg-slate-600'
              }
              shadow-sm
            `}
          />

          {/* レトロなアンプ風の立体スリット */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-slate-300 dark:bg-slate-700 pointer-events-none rounded" />
        </div>
      </div>
  );
}
