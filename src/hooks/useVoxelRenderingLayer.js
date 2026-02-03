/**
 * useVoxelRenderingLayer.js - State management for voxel rendering
 *
 * Bridges the voxel building system with the rendering layer,
 * managing Z-level state and providing render data.
 *
 * Part of Phase 19: Voxel World Rendering
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useVoxelRenderer } from '../rendering/useVoxelRenderer.js';

/**
 * Tool modes for voxel interaction
 */
export const VoxelToolMode = {
  NONE: 'none',
  SELECT: 'select',
  MINE: 'mine',
  BUILD: 'build',
  STOCKPILE: 'stockpile'
};

/**
 * Voxel rendering layer hook
 *
 * @param {object} options - Configuration
 * @returns {object} Voxel rendering state and methods
 */
export const useVoxelRenderingLayer = (options = {}) => {
  const {
    voxelOrchestrator = null,
    initialZ = 0,
    maxZ = 16,
    tileSize = 40,
    enabled = true
  } = options;

  // Z-level state
  const [currentZ, setCurrentZ] = useState(initialZ);
  const [visibleLayers, setVisibleLayers] = useState(1); // Layers below to show

  // Tool state
  const [toolMode, setToolMode] = useState(VoxelToolMode.NONE);
  const [hoveredBlock, setHoveredBlock] = useState(null);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Blueprint placement state
  const [selectedBlueprint, setSelectedBlueprint] = useState(null);
  const [blueprintRotation, setBlueprintRotation] = useState(0);

  // Cache refs
  const renderDataCache = useRef({
    miningDesignations: [],
    constructionSites: [],
    stockpiles: [],
    workers: [],
    lastUpdate: 0
  });

  // Get the voxel renderer
  const voxelRenderer = useVoxelRenderer({
    tileSize,
    layersBelowVisible: visibleLayers,
    belowLayerOpacity: 0.3,
    showBlockBorders: false,
    showLightSources: true,
    ghostBlockOpacity: 0.4
  });

  // Update render data from orchestrator
  const updateRenderData = useCallback(() => {
    if (!voxelOrchestrator || !enabled) return;

    const now = Date.now();
    // Throttle updates to 10fps
    if (now - renderDataCache.current.lastUpdate < 100) return;

    // Get mining designations
    const gatheringManager = voxelOrchestrator.gatheringManager;
    if (gatheringManager) {
      const tasks = Array.from(gatheringManager.miningTasks.values());
      renderDataCache.current.miningDesignations = tasks.map(task => ({
        x: task.position.x,
        y: task.position.y,
        z: task.position.z,
        progress: task.getProgress?.() || 0,
        assigned: !!task.assignedNpcId
      }));
    }

    // Get construction ghost blocks
    const constructionManager = voxelOrchestrator.constructionManager;
    if (constructionManager?.getActiveSites) {
      const sites = constructionManager.getActiveSites();
      const ghostBlocks = [];
      sites.forEach(site => {
        if (site.blocks) {
          site.blocks.forEach(block => {
            ghostBlocks.push({
              x: block.x,
              y: block.y,
              z: block.z,
              blockType: block.blockType,
              status: block.status || 'pending'
            });
          });
        }
      });
      renderDataCache.current.constructionSites = ghostBlocks;
    }

    // Get stockpiles
    const stockpileManager = voxelOrchestrator.stockpileManager;
    if (stockpileManager?.getStockpiles) {
      renderDataCache.current.stockpiles = stockpileManager.getStockpiles().map(sp => ({
        bounds: sp.bounds,
        allowedResources: sp.allowedResources,
        slots: sp.slots
      }));
    }

    // Get worker positions
    const workerBehavior = voxelOrchestrator.voxelWorkerBehavior;
    if (workerBehavior) {
      const workers = [];
      for (const [npcId, task] of workerBehavior.workerTasks) {
        if (task?.targetPosition) {
          workers.push({
            x: task.targetPosition.x,
            y: task.targetPosition.y,
            z: task.targetPosition.z,
            state: workerBehavior.getWorkerState(npcId),
            taskType: task.type?.replace('voxel_', '') || 'unknown',
            npcId
          });
        }
      }
      renderDataCache.current.workers = workers;
    }

    renderDataCache.current.lastUpdate = now;
  }, [voxelOrchestrator, enabled]);

  // Z-level navigation
  const changeZ = useCallback((delta) => {
    setCurrentZ(prev => Math.max(0, Math.min(maxZ - 1, prev + delta)));
  }, [maxZ]);

  const goToZ = useCallback((z) => {
    setCurrentZ(Math.max(0, Math.min(maxZ - 1, z)));
  }, [maxZ]);

  // Tool mode management
  const activateTool = useCallback((mode) => {
    setToolMode(mode);
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  }, []);

  const deactivateTool = useCallback(() => {
    setToolMode(VoxelToolMode.NONE);
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
    setSelectedBlueprint(null);
  }, []);

  // Selection handling
  const startSelection = useCallback((worldX, worldY) => {
    setSelectionStart({ x: worldX, y: worldY });
    setSelectionEnd({ x: worldX, y: worldY });
    setIsSelecting(true);
  }, []);

  const updateSelection = useCallback((worldX, worldY) => {
    if (isSelecting) {
      setSelectionEnd({ x: worldX, y: worldY });
    }
    setHoveredBlock({ x: worldX, y: worldY, z: currentZ });
  }, [isSelecting, currentZ]);

  const endSelection = useCallback(() => {
    setIsSelecting(false);
    // Return the selection for processing
    if (selectionStart && selectionEnd) {
      return {
        min: {
          x: Math.min(selectionStart.x, selectionEnd.x),
          y: Math.min(selectionStart.y, selectionEnd.y),
          z: currentZ
        },
        max: {
          x: Math.max(selectionStart.x, selectionEnd.x),
          y: Math.max(selectionStart.y, selectionEnd.y),
          z: currentZ
        }
      };
    }
    return null;
  }, [selectionStart, selectionEnd, currentZ]);

  const clearSelection = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  }, []);

  // Blueprint placement
  const selectBlueprint = useCallback((blueprint) => {
    setSelectedBlueprint(blueprint);
    setToolMode(VoxelToolMode.BUILD);
  }, []);

  const rotateBlueprint = useCallback(() => {
    setBlueprintRotation(prev => (prev + 90) % 360);
  }, []);

  // Apply tool action
  const applyTool = useCallback((selection) => {
    if (!voxelOrchestrator || !selection) return false;

    const { min, max } = selection;

    switch (toolMode) {
      case VoxelToolMode.MINE:
        voxelOrchestrator.designateMiningRegion(min, max);
        return true;

      case VoxelToolMode.BUILD:
        if (selectedBlueprint) {
          voxelOrchestrator.startConstruction(selectedBlueprint.id, min);
          return true;
        }
        return false;

      case VoxelToolMode.STOCKPILE:
        voxelOrchestrator.createStockpile({
          x: min.x,
          y: min.y,
          z: min.z,
          width: max.x - min.x + 1,
          depth: max.y - min.y + 1
        });
        return true;

      default:
        return false;
    }
  }, [voxelOrchestrator, toolMode, selectedBlueprint]);

  // Render function
  const render = useCallback((ctx, worldToCanvas, viewportBounds) => {
    if (!ctx || !enabled) return;

    // Update cached data
    updateRenderData();

    const voxelWorld = voxelOrchestrator?.voxelWorld;

    // Render voxel world
    if (voxelWorld) {
      voxelRenderer.renderVoxelWorld(ctx, voxelWorld, worldToCanvas, viewportBounds, currentZ);
      voxelRenderer.renderNavigationIndicators(ctx, voxelWorld, worldToCanvas, viewportBounds, currentZ);
    }

    // Render stockpile zones
    if (renderDataCache.current.stockpiles.length > 0) {
      voxelRenderer.renderStockpileZones(ctx, renderDataCache.current.stockpiles, worldToCanvas, currentZ);
    }

    // Render construction ghost blocks
    if (renderDataCache.current.constructionSites.length > 0) {
      voxelRenderer.renderGhostBlocks(ctx, renderDataCache.current.constructionSites, worldToCanvas, currentZ);
    }

    // Render mining designations
    if (renderDataCache.current.miningDesignations.length > 0) {
      voxelRenderer.renderMiningDesignations(ctx, renderDataCache.current.miningDesignations, worldToCanvas, currentZ);
    }

    // Render worker indicators
    if (renderDataCache.current.workers.length > 0) {
      voxelRenderer.renderWorkerIndicators(ctx, renderDataCache.current.workers, worldToCanvas, currentZ);
    }

    // Render selection
    if (isSelecting && selectionStart && selectionEnd) {
      voxelRenderer.renderRegionSelection(ctx, selectionStart, selectionEnd, worldToCanvas, toolMode);
    } else if (hoveredBlock && toolMode !== VoxelToolMode.NONE) {
      voxelRenderer.renderBlockSelection(ctx, hoveredBlock, worldToCanvas, currentZ, toolMode);
    }
  }, [
    enabled,
    voxelOrchestrator,
    voxelRenderer,
    currentZ,
    updateRenderData,
    isSelecting,
    selectionStart,
    selectionEnd,
    hoveredBlock,
    toolMode
  ]);

  // Render Z-level indicator (separate for UI overlay)
  const renderZIndicator = useCallback((ctx, x, y) => {
    if (!ctx || !enabled) return;
    voxelRenderer.renderZLevelIndicator(ctx, currentZ, maxZ, x, y);
  }, [enabled, voxelRenderer, currentZ, maxZ]);

  // Keyboard shortcuts effect
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Z-level navigation
      if (e.key === 'PageUp' || e.key === '.') {
        e.preventDefault();
        changeZ(1);
      } else if (e.key === 'PageDown' || e.key === ',') {
        e.preventDefault();
        changeZ(-1);
      }

      // Tool shortcuts
      if (e.key === 'm' || e.key === 'M') {
        activateTool(toolMode === VoxelToolMode.MINE ? VoxelToolMode.NONE : VoxelToolMode.MINE);
      } else if (e.key === 'b' || e.key === 'B') {
        activateTool(toolMode === VoxelToolMode.BUILD ? VoxelToolMode.NONE : VoxelToolMode.BUILD);
      } else if (e.key === 's' || e.key === 'S') {
        activateTool(toolMode === VoxelToolMode.STOCKPILE ? VoxelToolMode.NONE : VoxelToolMode.STOCKPILE);
      } else if (e.key === 'Escape') {
        deactivateTool();
      }

      // Blueprint rotation
      if (e.key === 'r' || e.key === 'R') {
        if (selectedBlueprint) {
          rotateBlueprint();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, changeZ, activateTool, deactivateTool, toolMode, selectedBlueprint, rotateBlueprint]);

  // Return memoized API
  return useMemo(() => ({
    // State
    currentZ,
    maxZ,
    visibleLayers,
    toolMode,
    hoveredBlock,
    isSelecting,
    selectionStart,
    selectionEnd,
    selectedBlueprint,
    blueprintRotation,

    // Z-level controls
    changeZ,
    goToZ,
    setVisibleLayers,

    // Tool controls
    activateTool,
    deactivateTool,

    // Selection
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    applyTool,

    // Blueprint
    selectBlueprint,
    rotateBlueprint,

    // Rendering
    render,
    renderZIndicator,

    // Data access
    getMiningDesignations: () => renderDataCache.current.miningDesignations,
    getConstructionSites: () => renderDataCache.current.constructionSites,
    getStockpiles: () => renderDataCache.current.stockpiles,
    getWorkers: () => renderDataCache.current.workers
  }), [
    currentZ,
    maxZ,
    visibleLayers,
    toolMode,
    hoveredBlock,
    isSelecting,
    selectionStart,
    selectionEnd,
    selectedBlueprint,
    blueprintRotation,
    changeZ,
    goToZ,
    activateTool,
    deactivateTool,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    applyTool,
    selectBlueprint,
    rotateBlueprint,
    render,
    renderZIndicator
  ]);
};

export default useVoxelRenderingLayer;
