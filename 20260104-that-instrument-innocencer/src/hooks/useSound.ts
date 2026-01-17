import { useRef } from 'react';
import * as Tone from 'tone';

export function useSound() {
  const synthRef = useRef<Tone.Synth | null>(null);
  const isStartedRef = useRef(false);

  const startAudio = async () => {
    if (!isStartedRef.current) {
        await Tone.start();
        isStartedRef.current = true;
    }

    if (!synthRef.current) {
        synthRef.current = new Tone.Synth().toDestination();
    }
  };

/**
 * 特定の周波数で音を再生する関数
 * @param frequency 音の高さ（周波数）
 */
const playSound = (frequency: number = 220) => {
    synthRef.current?.triggerAttack(frequency);
  };

/**
 * 音の高さをリアルタイムに変えるための関数
 * @param frequency 音の高さ（周波数）
 */
  const setFrequency = (frequency: number) => {
    synthRef.current?.setNote(frequency);
  };

/**
 * 音を停止する関数
 */
  const stopSound = () => {
    synthRef.current?.triggerRelease();
  };

  return {
    startAudio,
    playSound,
    setFrequency,
    stopSound,
  };
}
