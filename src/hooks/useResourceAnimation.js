/**
 * useResourceAnimation.js - Hook for animating resource value changes
 *
 * Provides smooth count-up/count-down animations when resource values change.
 * Uses requestAnimationFrame for smooth 60fps animations.
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for animating resource value changes
 *
 * @param {number} targetValue - The target value to animate towards
 * @param {Object} options - Animation configuration
 * @param {number} options.duration - Animation duration in milliseconds (default: 500)
 * @param {string} options.easing - Easing function ('linear', 'easeOut', 'easeInOut') (default: 'easeOut')
 * @returns {number} - The current animated value
 */
export function useResourceAnimation(targetValue, options = {}) {
  const { duration = 500, easing = 'easeOut' } = options;

  const [displayValue, setDisplayValue] = useState(targetValue);
  const animationRef = useRef(null);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef(null);

  useEffect(() => {
    // If target value hasn't changed, no animation needed
    if (targetValue === displayValue) {
      return;
    }

    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Set up new animation
    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Apply easing function
      let easedProgress;
      switch (easing) {
        case 'linear':
          easedProgress = progress;
          break;
        case 'easeOut':
          easedProgress = 1 - Math.pow(1 - progress, 3);
          break;
        case 'easeInOut':
          easedProgress = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          break;
        default:
          easedProgress = progress;
      }

      // Calculate current value
      const currentValue = startValueRef.current + (targetValue - startValueRef.current) * easedProgress;
      setDisplayValue(currentValue);

      // Continue animation if not complete
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at target value
        setDisplayValue(targetValue);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount or when target changes
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration, easing, displayValue]);

  return displayValue;
}

/**
 * Hook for tracking resource change rate (production/consumption per second)
 *
 * @param {number} currentValue - Current resource value
 * @param {number} sampleInterval - How often to sample the value (ms, default: 1000)
 * @returns {number} - Rate of change per second (positive for production, negative for consumption)
 */
export function useResourceTrend(currentValue, sampleInterval = 1000) {
  const [trend, setTrend] = useState(0);
  const previousValueRef = useRef(currentValue);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeDelta = (now - lastUpdateRef.current) / 1000; // Convert to seconds
      const valueDelta = currentValue - previousValueRef.current;

      // Calculate rate per second
      const rate = timeDelta > 0 ? valueDelta / timeDelta : 0;

      setTrend(rate);
      previousValueRef.current = currentValue;
      lastUpdateRef.current = now;
    }, sampleInterval);

    return () => clearInterval(interval);
  }, [currentValue, sampleInterval]);

  return trend;
}

export default useResourceAnimation;
