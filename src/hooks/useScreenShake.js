import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * Hook for screen shake effect
 * @returns {Function} shake(intensity, duration) - Trigger a screen shake
 */
export function useScreenShake() {
  const { camera } = useThree();
  const shakeIntensity = useRef(0);
  const shakeDuration = useRef(0);
  const originalPosition = useRef(null);

  useFrame((state, delta) => {
    if (shakeDuration.current > 0) {
      // Store original position on first shake frame
      if (!originalPosition.current) {
        originalPosition.current = camera.position.clone();
      }

      // Apply random offset based on intensity
      const offsetX = (Math.random() - 0.5) * shakeIntensity.current;
      const offsetY = (Math.random() - 0.5) * shakeIntensity.current;
      const offsetZ = (Math.random() - 0.5) * shakeIntensity.current;

      camera.position.x = originalPosition.current.x + offsetX;
      camera.position.y = originalPosition.current.y + offsetY;
      camera.position.z = originalPosition.current.z + offsetZ;

      // Decrease shake over time
      shakeDuration.current -= delta;
      shakeIntensity.current *= 0.95;

      if (shakeDuration.current <= 0) {
        // Reset to original position
        if (originalPosition.current) {
          camera.position.copy(originalPosition.current);
          originalPosition.current = null;
        }
      }
    }
  });

  const shake = (intensity = 0.5, duration = 0.3) => {
    shakeIntensity.current = intensity;
    shakeDuration.current = duration;
  };

  return shake;
}
