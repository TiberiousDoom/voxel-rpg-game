/**
 * useVoxelInput.js - Input handling for voxel interactions
 *
 * Handles mouse/keyboard input for voxel building system:
 * - Click/drag to designate mining
 * - Click to place blueprints
 * - Drag to create stockpile zones
 *
 * Part of Phase 20: Player Interaction
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { VoxelToolMode } from './useVoxelRenderingLayer.js';

/**
 * Voxel input hook
 *
 * @param {object} options - Configuration
 * @returns {object} Input handlers and state
 */
export const useVoxelInput = (options = {}) => {
  const {
    voxelRenderingLayer = null,
    voxelOrchestrator = null,
    canvasToWorld = null, // Function to convert canvas coords to world coords
    enabled = true,
    tileSize = 40
  } = options;

  // Input state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [lastHoveredTile, setLastHoveredTile] = useState(null);

  // Refs for event handlers
  const canvasRef = useRef(null);

  /**
   * Convert mouse event to world coordinates
   */
  const getWorldCoords = useCallback((e) => {
    if (!canvasToWorld || !canvasRef.current) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    return canvasToWorld(canvasX, canvasY);
  }, [canvasToWorld]);

  /**
   * Handle mouse down
   */
  const handleMouseDown = useCallback((e) => {
    if (!enabled || !voxelRenderingLayer) return;
    if (e.button !== 0) return; // Left click only

    const worldCoords = getWorldCoords(e);
    if (!worldCoords) return;

    const toolMode = voxelRenderingLayer.toolMode;

    if (toolMode !== VoxelToolMode.NONE) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart(worldCoords);
      voxelRenderingLayer.startSelection(worldCoords.x, worldCoords.z);
    }
  }, [enabled, voxelRenderingLayer, getWorldCoords]);

  /**
   * Handle mouse move
   */
  const handleMouseMove = useCallback((e) => {
    if (!enabled || !voxelRenderingLayer) return;

    const worldCoords = getWorldCoords(e);
    if (!worldCoords) return;

    // Update hover state
    const newTile = { x: worldCoords.x, y: worldCoords.z };
    if (!lastHoveredTile ||
        lastHoveredTile.x !== newTile.x ||
        lastHoveredTile.y !== newTile.y) {
      setLastHoveredTile(newTile);
      voxelRenderingLayer.updateSelection(worldCoords.x, worldCoords.z);
    }

    // Update drag selection
    if (isDragging) {
      voxelRenderingLayer.updateSelection(worldCoords.x, worldCoords.z);
    }
  }, [enabled, voxelRenderingLayer, getWorldCoords, isDragging, lastHoveredTile]);

  /**
   * Handle mouse up
   */
  const handleMouseUp = useCallback((e) => {
    if (!enabled || !voxelRenderingLayer) return;
    if (!isDragging) return;

    const selection = voxelRenderingLayer.endSelection();

    if (selection) {
      // Apply the tool action
      const success = voxelRenderingLayer.applyTool(selection);

      if (success) {
        // Clear selection after successful action
        voxelRenderingLayer.clearSelection();
      }
    }

    setIsDragging(false);
    setDragStart(null);
  }, [enabled, voxelRenderingLayer, isDragging]);

  /**
   * Handle right click (cancel/context menu)
   */
  const handleContextMenu = useCallback((e) => {
    if (!enabled || !voxelRenderingLayer) return;

    const toolMode = voxelRenderingLayer.toolMode;

    if (toolMode !== VoxelToolMode.NONE) {
      e.preventDefault();

      // Cancel current action
      if (isDragging) {
        voxelRenderingLayer.clearSelection();
        setIsDragging(false);
        setDragStart(null);
      }

      // Check if clicking on an existing designation to cancel it
      const worldCoords = getWorldCoords(e);
      if (worldCoords && voxelOrchestrator) {
        const z = voxelRenderingLayer.currentZ;

        // Try to cancel mining at this position
        if (toolMode === VoxelToolMode.MINE) {
          voxelOrchestrator.cancelMining(worldCoords.x, worldCoords.z, z);
        }
      }
    }
  }, [enabled, voxelRenderingLayer, voxelOrchestrator, isDragging, getWorldCoords]);

  /**
   * Handle wheel for Z-level navigation
   */
  const handleWheel = useCallback((e) => {
    if (!enabled || !voxelRenderingLayer) return;

    // Shift + wheel for Z-level
    if (e.shiftKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        voxelRenderingLayer.changeZ(1);
      } else {
        voxelRenderingLayer.changeZ(-1);
      }
    }
  }, [enabled, voxelRenderingLayer]);

  /**
   * Attach event listeners to canvas
   */
  const attachToCanvas = useCallback((canvas) => {
    canvasRef.current = canvas;

    if (!canvas) return () => {};

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleContextMenu, handleWheel]);

  return {
    // State
    isDragging,
    dragStart,
    lastHoveredTile,

    // Methods
    attachToCanvas,

    // Direct handlers for React event props
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onContextMenu: handleContextMenu,
    onWheel: handleWheel
  };
};

export default useVoxelInput;
