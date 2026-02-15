
import { useRef } from 'react';
import * as Tone from 'tone';

/**
 * pointerIdごとにSynthを管理し、複数音同時再生を可能にするカスタムフック
 */
export function useSound() {
  // pointerIdごとにSynthを管理
  const synthMapRef = useRef<Map<number, Tone.Synth>>(new Map());
  const isStartedRef = useRef(false);

  // AudioContextの初期化
  const startAudio = async () => {
    if (!isStartedRef.current) {
      await Tone.start();
      isStartedRef.current = true;
    }
  };

  /**
   * 指定pointerIdで音を再生
   * @param pointerId pointer/touchのID
   * @param frequency 周波数
   */
  const playSound = (pointerId: number, frequency: number = 220) => {
    if (!synthMapRef.current.has(pointerId)) {
      const synth = new Tone.Synth().toDestination();
      synth.triggerAttack(frequency);
      synthMapRef.current.set(pointerId, synth);
    }
  };

  /**
   * pointerIdごとに音の高さを変更
   * @param pointerId pointer/touchのID
   * @param frequency 周波数
   */
  const setFrequency = (pointerId: number, frequency: number) => {
    const synth = synthMapRef.current.get(pointerId);
    if (synth) {
      synth.setNote(frequency);
    }
  };

  /**
   * 指定pointerIdの音を停止
   * @param pointerId pointer/touchのID
   */
  const stopSound = (pointerId: number) => {
    const synth = synthMapRef.current.get(pointerId);
    if (synth) {
      synth.triggerRelease();
      synthMapRef.current.delete(pointerId);
    }
  };

  return {
    startAudio,
    playSound,
    setFrequency,
    stopSound,
  };
}
