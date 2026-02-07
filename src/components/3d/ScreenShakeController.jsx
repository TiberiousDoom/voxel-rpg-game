import { useEffect, useRef } from 'react';
import { useScreenShake } from '../../hooks/useScreenShake';
import useGameStore from '../../stores/useGameStore';

/**
 * ScreenShakeController - Bridges the store-based screen shake triggers
 * with the useScreenShake hook that operates within the Three.js context.
 */
const ScreenShakeController = () => {
  const shake = useScreenShake();
  const screenShake = useGameStore((state) => state.screenShake);
  const clearScreenShake = useGameStore((state) => state.clearScreenShake);
  const lastTimestamp = useRef(0);

  useEffect(() => {
    if (screenShake && screenShake.timestamp !== lastTimestamp.current) {
      // New shake requested
      lastTimestamp.current = screenShake.timestamp;
      shake(screenShake.intensity, screenShake.duration);
      // Clear the shake state after triggering
      clearScreenShake();
    }
  }, [screenShake, shake, clearScreenShake]);

  return null; // This component doesn't render anything
};

export default ScreenShakeController;
