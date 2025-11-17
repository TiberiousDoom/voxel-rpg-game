/**
 * useBuildingRenderer.js - React hook for building rendering
 *
 * Provides a simple interface for rendering buildings with
 * the BuildingRenderer system in React components.
 *
 * Part of WF3: Building Rendering & Visual Effects
 * Coordinates with WF4 for NPC rendering (separate hook)
 */

import { useRef, useEffect, useCallback } from 'react';
import { createBuildingRenderer } from './BuildingRenderer.js';

/**
 * Custom hook for building rendering
 * @param {object} options - Renderer options
 * @returns {object} Renderer functions
 */
export function useBuildingRenderer(options = {}) {
  const rendererRef = useRef(null);

  // Initialize renderer
  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = createBuildingRenderer({
        tileSize: options.tileSize || 40,
        showHealthBars: options.showHealthBars !== false,
        showProgressBars: options.showProgressBars !== false,
        showShadows: options.showShadows !== false,
        showOverlays: options.showOverlays !== false
      });
    }
  }, [options]);

  /**
   * Render all buildings on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array} buildings - Array of building objects
   * @param {Function} worldToCanvas - Function to convert world coords to canvas coords
   * @param {Object} viewportBounds - Optional viewport bounds for culling {left, right, top, bottom}
   * @returns {number} Number of buildings rendered
   */
  const renderBuildings = useCallback((ctx, buildings, worldToCanvas, viewportBounds = null) => {
    if (!rendererRef.current || !buildings) return 0;

    const renderer = rendererRef.current;
    let renderedCount = 0;

    buildings.forEach(building => {
      if (!building || !building.position) return;

      // Viewport culling if bounds provided
      if (viewportBounds) {
        if (building.position.x < viewportBounds.left ||
            building.position.x > viewportBounds.right ||
            building.position.z < viewportBounds.top ||
            building.position.z > viewportBounds.bottom) {
          return; // Skip rendering off-screen buildings
        }
      }

      const canvasPos = worldToCanvas(building.position.x, building.position.z);
      renderer.renderBuilding(ctx, building, canvasPos);
      renderedCount++;
    });

    return renderedCount;
  }, []);

  /**
   * Render hover effect for a position
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {object} position - World position
   * @param {string} buildingType - Building type for preview
   * @param {Function} worldToCanvas - Function to convert world coords to canvas coords
   */
  const renderHoverEffect = useCallback((ctx, position, buildingType, worldToCanvas) => {
    if (!rendererRef.current || !position) return;

    const renderer = rendererRef.current;
    const canvasPos = worldToCanvas(position.x, position.z);
    renderer.renderHoverEffect(ctx, canvasPos, buildingType);
  }, []);

  /**
   * Render selection effect for a building
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {object} building - Building object
   * @param {Function} worldToCanvas - Function to convert world coords to canvas coords
   */
  const renderSelectionEffect = useCallback((ctx, building, worldToCanvas) => {
    if (!rendererRef.current || !building || !building.position) return;

    const renderer = rendererRef.current;
    const canvasPos = worldToCanvas(building.position.x, building.position.z);
    renderer.renderSelectionEffect(ctx, canvasPos);
  }, []);

  /**
   * Render placement preview
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {object} position - World position
   * @param {string} buildingType - Building type to preview
   * @param {boolean} isValid - Whether placement is valid
   * @param {Function} worldToCanvas - Function to convert world coords to canvas coords
   */
  const renderPlacementPreview = useCallback((ctx, position, buildingType, isValid, worldToCanvas) => {
    if (!rendererRef.current || !position || !buildingType) return;

    const renderer = rendererRef.current;
    const canvasPos = worldToCanvas(position.x, position.z);
    renderer.renderPlacementPreview(ctx, canvasPos, buildingType, isValid);
  }, []);

  /**
   * Get renderer instance (for advanced usage)
   * @returns {BuildingRenderer} Renderer instance
   */
  const getRenderer = useCallback(() => {
    return rendererRef.current;
  }, []);

  return {
    renderBuildings,
    renderHoverEffect,
    renderSelectionEffect,
    renderPlacementPreview,
    getRenderer
  };
}

export default useBuildingRenderer;
