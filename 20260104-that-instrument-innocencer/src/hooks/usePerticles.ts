import { useState, useCallback } from 'react';

// エフェクトの型定義
/**
 * 視覚効果エフェクトのデータ構造
 * @interface VisualEffect
 * @property id 個別識別用
 * @property type 図形の種類 ('circle', 'square', 'triangle', 'line' のいずれか)
 * @property x 発生したX座標
 * @property y 発生したY座標
 * @property size 現在の大きさ
 * @property rotation 現在の回転角
 * @property opacity 透明度 (1.0 -> 0.0)
 * @property lineWidth 線の太さ
 */
export interface VisualEffect {
  id: number;
  type: 'circle' | 'square' | 'triangle' | 'line';
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  lineWidth: number;
}

/**
 * 視覚効果エフェクトを管理するカスタムフック
 * @function useVisualEffects
 * @returns {effects, addEffect, updateEffects}
 */
export function useVisualEffects() {
  const [effects, setEffects] = useState<VisualEffect[]>([]);

// 新しいエフェクトを追加する関数
  const addEffect = useCallback((x: number, y: number, type: VisualEffect['type']) => {
    const newEffect: VisualEffect = {
      id: Date.now(),
      type,
      x,
      y,
      size: 30,
      rotation: 0,
      opacity: 1,
      lineWidth: 2,
    };
    setEffects(prev => [...prev, newEffect]);
  }, []);

  // 全てのエフェクトの状態を更新（アニメーション）
  const updateEffects = useCallback(() => {
    setEffects(prev => 
      prev
        .map(effect => ({
          ...effect,
          size: effect.size + 2,        // 徐々に大きく
          opacity: effect.opacity - 0.02, // 徐々に透明に
          rotation: effect.rotation + 0.05 // 回転
        }))
        .filter(effect => effect.opacity > 0) // 消えたら削除
    );
  }, []);

  return { effects, addEffect, updateEffects };
}
