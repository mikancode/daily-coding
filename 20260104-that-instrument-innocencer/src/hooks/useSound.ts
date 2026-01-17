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
 * 音の再生
 */
const playSound = (frequency: number = 220) => {
    synthRef.current?.triggerAttack(frequency);
  };

/**
 * 音の停止
 */
  const stopSound = () => {
    synthRef.current?.triggerRelease();
  };

  return {
    startAudio,
    playSound,
    stopSound,
  };
}
