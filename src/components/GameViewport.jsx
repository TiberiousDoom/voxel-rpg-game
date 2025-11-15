/**
 * GameViewport.jsx - Main game viewport for rendering voxel grid
 *
 * Displays:
 * - Voxel grid (game world)
 * - Buildings (WF3: Enhanced rendering with BuildingRenderer)
 * - NPCs (WF4: Will add NPCRenderer)
 * - Selection/placement preview
 *
 * COORDINATION: WF3 and WF4 share this file
 * - WF3 owns: Building rendering via useBuildingRenderer()
 * - WF4 owns: NPC rendering via useNPCRenderer() (to be added)
 */

import React, { useState, useRef } from 'react';
import { useBuildingRenderer } from '../rendering/useBuildingRenderer.js'; // WF3
import { useNPCRenderer, useNPCAnimation } from '../rendering/useNPCRenderer.js'; // WF4
import './GameViewport.css';

// Grid constants
const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;
const TILE_SIZE = 40;
const CANVAS_WIDTH = GRID_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * TILE_SIZE;

// Color constants (moved outside component to prevent re-creation on every render)
const BUILDING_COLORS = {
  FARM: '#90EE90',
  HOUSE: '#D2B48C',
  WAREHOUSE: '#A9A9A9',
  TOWN_CENTER: '#FFD700',
  WATCHTOWER: '#8B4513',
  CAMPFIRE: '#FF8C00'
};

// NPC color based on status
const NPC_STATUS_COLORS = {
  WORKING: '#4CAF50',    // Green
  IDLE: '#FFC107',       // Yellow/Amber
  LOW_HEALTH: '#F44336', // Red
  DEFAULT: '#FF6B6B'     // Pink
};

// Building state colors
const STATE_COLORS = {
  BLUEPRINT: 'rgba(150, 150, 150, 0.5)',
  UNDER_CONSTRUCTION: 'rgba(33, 150, 243, 0.7)',
  COMPLETE: null, // Use building-type color
  COMPLETED: null, // Use building-type color
  DAMAGED: null, // Use darkened building-type color
  DESTROYED: '#000000'
};

const GRID_COLOR = '#E0E0E0';
// eslint-disable-next-line no-unused-vars -- Reserved for WF4: NPC selection highlighting
const SELECTED_COLOR = '#FF4444';

/**
 * Helper: Darken a hex color
 */
const darkenColor = (hex, factor = 0.6) => {
  const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Helper: Get NPC color based on status
 */
const getNPCColor = (npc) => {
  const health = npc.health || 100;
  const isWorking = npc.status === 'WORKING' || npc.isWorking;

  if (health < 30) return NPC_STATUS_COLORS.LOW_HEALTH;
  if (isWorking) return NPC_STATUS_COLORS.WORKING;
  return NPC_STATUS_COLORS.IDLE;
};

/**
 * Helper: Get building color based on state
 * NOTE: Currently using WF3's BuildingRenderer, but keeping this as fallback
 */
// eslint-disable-next-line no-unused-vars -- Fallback renderer for legacy support
const getBuildingColor = (building) => {
  const state = building.state || 'COMPLETE';
  const baseColor = BUILDING_COLORS[building.type] || '#CCCCCC';

  // Special states override base color
  if (STATE_COLORS[state]) {
    return STATE_COLORS[state];
  }

  // Damaged buildings use darkened color
  if (state === 'DAMAGED') {
    return darkenColor(baseColor);
  }

  // Default to base color
  return baseColor;
};

/**
 * GameViewport Component
 * Renders the voxel game world with buildings and NPCs
 */
function GameViewport({
  buildings = [],
  npcs = [],
  selectedBuildingType = null,
  onPlaceBuilding = () => {},
  onSelectTile = () => {},
  onBuildingClick = () => {},
  debugMode = false
}) {
  const [hoveredPosition, setHoveredPosition] = useState(null);
  // eslint-disable-next-line no-unused-vars -- Reserved for WF4: Building selection feature
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null); // requestAnimationFrame reference
  const lastHoverUpdateRef = useRef(0); // Throttle hover updates

  // WF3: Building rendering hook
  const {
    renderBuildings: renderBuildingsWF3,
    // eslint-disable-next-line no-unused-vars -- Reserved for WF3: Hover effects not yet implemented
    renderHoverEffect,
    renderPlacementPreview
  } = useBuildingRenderer({
    tileSize: TILE_SIZE,
    showHealthBars: true,
    showProgressBars: true,
    showShadows: true,
    showOverlays: true
  });

  // WF4: NPC Renderer integration
  const npcRenderer = useNPCRenderer({
    tileSize: TILE_SIZE,
    showHealthBars: true,
    showRoleBadges: true,
    showStatusIndicators: true,
    enableAnimations: true,
    debugMode: debugMode
  });

  // WF4: Update NPC positions for smooth interpolation
  useNPCAnimation(npcs, npcRenderer.updatePositions, true);
  /**
   * Convert world position to canvas coordinates
   */
  const worldToCanvas = (x, z) => {
    // Simple 2D projection (top-down view)
    return {
      x: (x % GRID_WIDTH) * TILE_SIZE,
      y: (z % GRID_HEIGHT) * TILE_SIZE
    };
  };

  /**
   * Convert canvas coordinates to grid position
   */
  const canvasToWorld = (canvasX, canvasY) => {
    return {
      x: Math.floor(canvasX / TILE_SIZE),
      z: Math.floor(canvasY / TILE_SIZE)
    };
  };

  /**
   * Draw the game world
   * Memoized to prevent unnecessary re-renders
   */
  const drawViewport = React.useCallback((ctx) => {
    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_WIDTH; i++) {
      ctx.beginPath();
      ctx.moveTo(i * TILE_SIZE, 0);
      ctx.lineTo(i * TILE_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i <= GRID_HEIGHT; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * TILE_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * TILE_SIZE);
      ctx.stroke();
    }

    // WF3: Render buildings using new BuildingRenderer
    renderBuildingsWF3(ctx, buildings, worldToCanvas);

    // WF4: Render NPCs using NPCRenderer
    // This uses the new rendering system with smooth interpolation and animations
    npcRenderer.renderNPCs(ctx, npcs, worldToCanvas);

    // WF4: Render pathfinding visualization in debug mode
    if (debugMode) {
      npcRenderer.renderPaths(ctx, npcs, worldToCanvas);
    }

    // WF3: Draw hover preview using new renderer
    if (hoveredPosition && selectedBuildingType) {
      // TODO: Add validation check to determine if placement is valid
      const isValid = true; // Placeholder - should check collision/placement rules
      renderPlacementPreview(ctx, hoveredPosition, selectedBuildingType, isValid, worldToCanvas);
    }
  }, [buildings, npcs, hoveredPosition, selectedBuildingType, renderBuildingsWF3, renderPlacementPreview]);

  /**
   * Handle canvas click for placement (mouse and touch)
   */
  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();

    // Account for canvas scaling (CSS vs internal resolution)
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    // Support both mouse and touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const position = canvasToWorld(canvasX, canvasY);

    if (selectedBuildingType) {
      // Building placement mode
      onPlaceBuilding({
        x: position.x,
        y: 0, // Ground level
        z: position.z
      });
    } else {
      // Check if a building was clicked
      const clickedBuilding = buildings.find(b =>
        b && b.position &&
        b.position.x === position.x &&
        b.position.z === position.z
      );

      if (clickedBuilding) {
        onBuildingClick(clickedBuilding);
      } else {
        onSelectTile(position);
      }
    }
  };

  /**
   * Handle touch start for mobile (treat as click)
   */
  const handleTouchStart = (e) => {
    e.preventDefault(); // Prevent default touch behavior
    handleCanvasClick(e);
  };

  /**
   * Handle canvas mouse move for hover (throttled for performance)
   */
  const handleCanvasMouseMove = (e) => {
    if (!canvasRef.current) return;

    // Throttle: Only update at most every 16ms (60 FPS)
    const now = Date.now();
    if (now - lastHoverUpdateRef.current < 16) {
      return;
    }
    lastHoverUpdateRef.current = now;

    const rect = canvasRef.current.getBoundingClientRect();

    // Account for canvas scaling (CSS vs internal resolution)
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const position = canvasToWorld(canvasX, canvasY);

    // Only update if position actually changed (avoid redundant setState)
    const posChanged =
      !hoveredPosition ||
      hoveredPosition.x !== position.x ||
      hoveredPosition.z !== position.z;

    // Clamp to grid bounds
    if (
      position.x >= 0 &&
      position.x < GRID_WIDTH &&
      position.z >= 0 &&
      position.z < GRID_HEIGHT
    ) {
      if (posChanged) {
        setHoveredPosition(position);
      }
    } else {
      if (hoveredPosition !== null) {
        setHoveredPosition(null);
      }
    }
  };

  /**
   * Handle canvas mouse leave
   */
  const handleCanvasMouseLeave = () => {
    setHoveredPosition(null);
  };

  /**
   * Optimized canvas rendering using requestAnimationFrame
   * Only renders when state changes, but caps at 60 FPS
   */
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // Schedule render on next animation frame (max 60 FPS)
    rafRef.current = requestAnimationFrame(() => {
      drawViewport(ctx);
      rafRef.current = null;
    });

    // Cleanup on unmount
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [drawViewport]);

  return (
    <div className="game-viewport">
      <div className="viewport-header">
        <h2>Game World</h2>
        {selectedBuildingType && (
          <span className="building-type-indicator">
            Placing: <strong>{selectedBuildingType}</strong>
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="viewport-canvas"
        onClick={handleCanvasClick}
        onTouchStart={handleTouchStart}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
      />
      <div className="viewport-footer">
        <p className="viewport-hint">
          {selectedBuildingType
            ? `Click to place ${selectedBuildingType} building`
            : 'Select a building type from the menu to start building'}
        </p>
        <div className="building-legend">
          <h4>Buildings:</h4>
          <ul>
            {Object.entries(BUILDING_COLORS).map(([type, color]) => (
              <li key={type}>
                <span
                  className="legend-color"
                  style={{ backgroundColor: color }}
                />
                {type}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default GameViewport;
