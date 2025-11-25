/**
 * useWildlifeRenderer.js - React hook for WildlifeRenderer
 *
 * Provides a React hook that manages WildlifeRenderer lifecycle
 */

import { useRef, useEffect } from 'react';
import { WildlifeRenderer } from './WildlifeRenderer.js';

/**
 * React hook to use WildlifeRenderer
 * @param {Object} config - Renderer configuration
 * @returns {WildlifeRenderer} WildlifeRenderer instance
 */
export const useWildlifeRenderer = (config = {}) => {
  const rendererRef = useRef(null);

  // Initialize renderer once
  if (!rendererRef.current) {
    rendererRef.current = new WildlifeRenderer(config);
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

export default useWildlifeRenderer;
