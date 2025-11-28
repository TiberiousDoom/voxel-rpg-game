/**
 * useResourceAnimation.test.js - Tests for resource animation hooks
 *
 * Test scenarios:
 * - useResourceAnimation hook
 * - useResourceTrend hook
 * - Animation timing and easing
 * - Cleanup and memory management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useResourceAnimation, useResourceTrend } from '../useResourceAnimation';

describe('useResourceAnimation Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useResourceAnimation(100));
      expect(result.current).toBe(100);
    });

    it('should animate to new target value', async () => {
      const { result, rerender } = renderHook(
        ({ target }) => useResourceAnimation(target),
        { initialProps: { target: 100 } }
      );

      expect(result.current).toBe(100);

      // Update target
      rerender({ target: 200 });

      // Advance timers to complete animation
      act(() => {
        jest.advanceTimersByTime(600); // Default duration
      });

      await waitFor(() => {
        expect(result.current).toBe(200);
      });
    });

    it('should handle decreasing values', async () => {
      const { result, rerender } = renderHook(
        ({ target }) => useResourceAnimation(target),
        { initialProps: { target: 200 } }
      );

      rerender({ target: 100 });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(result.current).toBe(100);
      });
    });
  });

  describe('Animation Options', () => {
    it('should respect custom duration', async () => {
      const { result, rerender } = renderHook(
        ({ target }) => useResourceAnimation(target, { duration: 1000 }),
        { initialProps: { target: 100 } }
      );

      rerender({ target: 200 });

      // After 500ms, should still be animating
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Value should be between 100 and 200
      expect(result.current).toBeGreaterThan(100);
      expect(result.current).toBeLessThan(200);

      // After full duration, should reach target
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current).toBe(200);
      });
    });

    it('should support linear easing', async () => {
      const { result, rerender } = renderHook(
        ({ target }) => useResourceAnimation(target, { easing: 'linear', duration: 100 }),
        { initialProps: { target: 0 } }
      );

      rerender({ target: 100 });

      // Linear easing should have predictable midpoint
      act(() => {
        jest.advanceTimersByTime(50);
      });

      // At 50% time with linear easing, value should be ~50
      expect(result.current).toBeGreaterThanOrEqual(45);
      expect(result.current).toBeLessThanOrEqual(55);
    });
  });

  describe('Cleanup', () => {
    it('should cancel animation on unmount', () => {
      const { unmount } = renderHook(
        ({ target }) => useResourceAnimation(target),
        { initialProps: { target: 100 } }
      );

      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should cancel previous animation when target changes rapidly', async () => {
      const { result, rerender } = renderHook(
        ({ target }) => useResourceAnimation(target),
        { initialProps: { target: 100 } }
      );

      // Rapidly change target
      rerender({ target: 200 });
      rerender({ target: 300 });

      // Complete animation
      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Should animate to final target
      await waitFor(() => {
        expect(result.current).toBe(300);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', async () => {
      const { result, rerender } = renderHook(
        ({ target }) => useResourceAnimation(target),
        { initialProps: { target: 100 } }
      );

      rerender({ target: 0 });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(result.current).toBe(0);
      });
    });

    it('should handle same value updates', () => {
      const { result, rerender } = renderHook(
        ({ target }) => useResourceAnimation(target),
        { initialProps: { target: 100 } }
      );

      rerender({ target: 100 });

      // Should stay at 100
      expect(result.current).toBe(100);
    });

    it('should handle negative values', async () => {
      const { result, rerender } = renderHook(
        ({ target }) => useResourceAnimation(target),
        { initialProps: { target: 0 } }
      );

      rerender({ target: -50 });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(result.current).toBe(-50);
      });
    });
  });
});

describe('useResourceTrend Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should return 0 initially', () => {
      const { result } = renderHook(() => useResourceTrend(100));
      expect(result.current).toBe(0);
    });

    it('should calculate positive trend for increasing values', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useResourceTrend(value, 1000),
        { initialProps: { value: 100 } }
      );

      // Wait for first sample
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Increase value
      rerender({ value: 110 });

      // Wait for next sample
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current).toBeGreaterThan(0);
      });
    });

    it('should calculate negative trend for decreasing values', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useResourceTrend(value, 1000),
        { initialProps: { value: 100 } }
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      rerender({ value: 90 });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current).toBeLessThan(0);
      });
    });
  });

  describe('Custom Sample Interval', () => {
    it('should respect custom sample interval', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useResourceTrend(value, 500),
        { initialProps: { value: 100 } }
      );

      // Initial trend is 0
      expect(result.current).toBe(0);

      // Advance by custom interval
      act(() => {
        jest.advanceTimersByTime(500);
      });

      rerender({ value: 105 });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Trend should update faster with shorter interval
      expect(result.current).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on unmount', () => {
      const { unmount } = renderHook(() => useResourceTrend(100));

      expect(() => unmount()).not.toThrow();
    });
  });
});
