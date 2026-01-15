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


  const playSound = () => {
    synthRef.current?.triggerAttack('A6');
  };

  const stopSound = () => {
    synthRef.current?.triggerRelease();
  };

  return {
    startAudio,
    playSound,
    stopSound,
  };
}
