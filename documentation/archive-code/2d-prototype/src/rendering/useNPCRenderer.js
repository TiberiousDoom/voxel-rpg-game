/**
 * useNPCRenderer - React hook for NPC rendering integration
 *
 * Provides a simple interface to integrate NPCRenderer with React components.
 * Manages renderer lifecycle, animation frames, and configuration.
 */

import { useRef, useEffect, useCallback } from 'react';
import NPCRenderer from './NPCRenderer.js';

/**
 * useNPCRenderer Hook
 * Manages NPCRenderer instance and provides render function for GameViewport
 *
 * @param {Object} config - Renderer configuration
 * @param {number} config.tileSize - Tile size in pixels (default: 40)
 * @param {boolean} config.showHealthBars - Show health bars (default: true)
 * @param {boolean} config.showRoleBadges - Show role badges (default: true)
 * @param {boolean} config.showStatusIndicators - Show status indicators (default: true)
 * @param {boolean} config.enableAnimations - Enable animations (default: true)
 * @param {boolean} config.debugMode - Enable debug visualization (default: false)
 * @returns {Object} Renderer interface
 */
export function useNPCRenderer(config = {}) {
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(Date.now());

  // Initialize renderer
  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = new NPCRenderer(config);
    }

    // Capture current animation frame ID for cleanup (must be outside cleanup function)
    const currentAnimationFrame = animationFrameRef.current;

    // Cleanup on unmount
    return () => {
      if (currentAnimationFrame) {
        cancelAnimationFrame(currentAnimationFrame);
      }
      if (rendererRef.current) {
        rendererRef.current.clear();
      }
    };
  }, [config]);

  // Update renderer config when it changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.config = {
        ...rendererRef.current.config,
        ...config
      };
    }
  }, [config]);

  /**
   * Update NPC positions (called in animation frame)
   * @param {Array<Object>} npcs - Array of NPC objects
   */
  const updatePositions = useCallback((npcs) => {
    if (!rendererRef.current || !npcs) return;

    const now = Date.now();
    const deltaTime = now - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = now;

    rendererRef.current.updatePositions(npcs, deltaTime);
  }, []);

  /**
   * Render NPCs on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<Object>} npcs - Array of NPC objects
   * @param {Function} worldToCanvas - Function to convert world coords to canvas coords
   */
  const renderNPCs = useCallback((ctx, npcs, worldToCanvas) => {
    if (!rendererRef.current) return;

    rendererRef.current.renderNPCs(ctx, npcs, worldToCanvas);
  }, []);

  /**
   * Render pathfinding paths (debug mode)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<Object>} npcs - Array of NPC objects
   * @param {Function} worldToCanvas - Function to convert world coords to canvas coords
   */
  const renderPaths = useCallback((ctx, npcs, worldToCanvas) => {
    if (!rendererRef.current) return;

    rendererRef.current.renderAllPaths(ctx, npcs, worldToCanvas);
  }, []);

  /**
   * Set debug mode
   * @param {boolean} enabled - Enable debug mode
   */
  const setDebugMode = useCallback((enabled) => {
    if (rendererRef.current) {
      rendererRef.current.setDebugMode(enabled);
    }
  }, []);

  /**
   * Remove NPC from renderer
   * @param {string} npcId - NPC ID
   */
  const removeNPC = useCallback((npcId) => {
    if (rendererRef.current) {
      rendererRef.current.removeNPC(npcId);
    }
  }, []);

  /**
   * Clear all NPCs
   */
  const clear = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.clear();
    }
  }, []);

  /**
   * Get renderer statistics
   * @returns {Object} Statistics
   */
  const getStats = useCallback(() => {
    if (!rendererRef.current) {
      return {
        npcCount: 0,
        lastRenderTime: 0,
        renderCount: 0,
        debugMode: false
      };
    }

    return rendererRef.current.getStats();
  }, []);

  return {
    updatePositions,
    renderNPCs,
    renderPaths,
    setDebugMode,
    removeNPC,
    clear,
    getStats
  };
}

/**
 * useNPCAnimation Hook
 * Manages animation loop for NPC position updates
 *
 * @param {Array<Object>} npcs - Array of NPC objects
 * @param {Function} updatePositions - Update function from useNPCRenderer
 * @param {boolean} enabled - Enable animation loop (default: true)
 */
export function useNPCAnimation(npcs, updatePositions, enabled = true) {
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!enabled || !updatePositions) return;

    const animate = () => {
      updatePositions(npcs);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [npcs, updatePositions, enabled]);
}

export default useNPCRenderer;
