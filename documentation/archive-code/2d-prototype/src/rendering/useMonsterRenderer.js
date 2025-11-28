/**
 * useMonsterRenderer.js - React hook for MonsterRenderer
 *
 * Provides a React hook that manages MonsterRenderer lifecycle
 */

import { useRef, useEffect } from 'react';
import { MonsterRenderer } from './MonsterRenderer.js';

/**
 * React hook to use MonsterRenderer
 * @param {Object} config - Renderer configuration
 * @returns {MonsterRenderer} MonsterRenderer instance
 */
export const useMonsterRenderer = (config = {}) => {
  const rendererRef = useRef(null);

  // Initialize renderer once
  if (!rendererRef.current) {
    rendererRef.current = new MonsterRenderer(config);
  }

  // Update config if it changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.config = {
        ...rendererRef.current.config,
        ...config
      };
    }
  }, [config]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.clear();
      }
    };
  }, []);

  return rendererRef.current;
};

export default useMonsterRenderer;
