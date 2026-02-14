// 共通パラメータ
const COMMON_CONFIG = {
  initialOpacity: 1,
  initialSize: 30,
  lineWidth: 20,
  rotationDelta: 1,
  sizeDelta: 2000,
  opacityDelta: 1,
  color: '#00ffcc',
};

// 個別パラメータ（typeごとに上書き）
export const PARTICLE_CONFIG = {
  circle: {
    ...COMMON_CONFIG,
  },
  square: {
    ...COMMON_CONFIG,
  },
  triangle: {
    ...COMMON_CONFIG,
  },
  line: {
    ...COMMON_CONFIG,
    lineWidth: 40,
    sizeDelta: -1,
  },
};
import { useState, useCallback } from 'react';

// 「値」としての配列
export const PARTICLE_TYPES = ['circle', 'square', 'triangle', 'line'] as const;
// 配列から「型」を作る
export type ParticleType = typeof PARTICLE_TYPES[number];

// エフェクトの型定義
/**
 * 視覚効果エフェクトのデータ構造
 * @interface Particle
 * @property id 個別識別用
 * @property type 図形の種類 ('circle', 'square', 'triangle', 'line' のいずれか)
 * @property x 発生したX座標
 * @property y 発生したY座標
 * @property size 現在の大きさ
 * @property rotation 現在の回転角
 * @property opacity 透明度 (1.0 -> 0.0)
 * @property lineWidth 線の太さ
 */
export interface Particle {
  id: number;
  type: ParticleType;
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  lineWidth: number;
}

/**
 * 視覚効果エフェクトを管理するカスタムフック
 * @function useParticles
 * @returns {particles, addParticle, updateParticles}
 */
export function useParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

// 新しいエフェクトを追加する関数
  const addParticle = useCallback((x: number, y: number, type: Particle['type']) => {
    const config = PARTICLE_CONFIG[type] || PARTICLE_CONFIG.circle;
    const newEffect: Particle = {
      id: Date.now(),
      type,
      x,
      y,
      size: config.initialSize,
      rotation: Math.random() * Math.PI * 2,
      opacity: config.initialOpacity,
      lineWidth: config.lineWidth,
    };
    setParticles(prev => [...prev, newEffect]);
  }, []);

  // 全てのエフェクトの状態を更新（アニメーション）
  const updateParticles = useCallback((deltaTime = 1) => {
    setParticles(prev =>
      prev
        .map(particle => {
          const config = PARTICLE_CONFIG[particle.type] || PARTICLE_CONFIG.circle;
          return {
            ...particle,
            size: particle.size + config.sizeDelta * deltaTime,
            opacity: particle.opacity - config.opacityDelta * deltaTime,
            rotation: particle.rotation + config.rotationDelta * deltaTime,
          };
        })
        .filter(particle => particle.opacity > 0)
    );
  }, []);

  return { particles: particles, addParticle: addParticle, updateParticles: updateParticles };
}
