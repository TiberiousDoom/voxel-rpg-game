/**
 * GameViewport.jsx - Main game viewport for rendering voxel grid
 *
 * Displays:
 * - Voxel grid (game world)
 * - Buildings
 * - NPCs
 * - Selection/placement preview
 */

import React, { useState, useRef } from 'react';
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
  WATCHTOWER: '#8B4513'
};

const NPC_COLOR = '#FF6B6B';
const GRID_COLOR = '#E0E0E0';
const SELECTED_COLOR = '#FF4444';

/**
 * GameViewport Component
 * Renders the voxel game world with buildings and NPCs
 */
function GameViewport({
  buildings = [],
  npcs = [],
  selectedBuildingType = null,
  onPlaceBuilding = () => {},
  onSelectTile = () => {}
}) {
  const [hoveredPosition, setHoveredPosition] = useState(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null); // requestAnimationFrame reference
  const lastHoverUpdateRef = useRef(0); // Throttle hover updates

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

    // Draw buildings
    buildings.forEach((building) => {
      if (!building || !building.position) return;
      const canvas = worldToCanvas(building.position.x, building.position.z);
      const color = BUILDING_COLORS[building.type] || '#CCCCCC';

      ctx.fillStyle = color;
      ctx.fillRect(
        canvas.x + 2,
        canvas.y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );

      // Draw border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        canvas.x + 2,
        canvas.y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );

      // Draw building type label
      ctx.fillStyle = '#000000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        building.type[0],
        canvas.x + TILE_SIZE / 2,
        canvas.y + TILE_SIZE / 2
      );
    });

    // Draw NPCs
    npcs.forEach((npc) => {
      if (!npc || !npc.position) return;
      const canvas = worldToCanvas(npc.position.x, npc.position.z);

      // Draw NPC as circle
      ctx.fillStyle = NPC_COLOR;
      ctx.beginPath();
      ctx.arc(canvas.x + TILE_SIZE / 2, canvas.y + TILE_SIZE / 2, 5, 0, Math.PI * 2);
      ctx.fill();

      // Draw circle outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw hover preview
    if (hoveredPosition && selectedBuildingType) {
      const canvas = worldToCanvas(hoveredPosition.x, hoveredPosition.z);
      const color = BUILDING_COLORS[selectedBuildingType] || '#CCCCCC';

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(
        canvas.x + 2,
        canvas.y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );
      ctx.globalAlpha = 1.0;

      ctx.strokeStyle = SELECTED_COLOR;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        canvas.x + 2,
        canvas.y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );
    }
  }, [buildings, npcs, hoveredPosition, selectedBuildingType]);

  /**
   * Handle canvas click for placement
   */
  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();

    // Account for canvas scaling (CSS vs internal resolution)
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const position = canvasToWorld(canvasX, canvasY);

    if (selectedBuildingType) {
      onPlaceBuilding({
        x: position.x,
        y: 25, // Fixed height (gridHeight is 50, so valid range is 0-49)
        z: position.z
      });
    } else {
      onSelectTile(position);
    }
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
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
      />
    </div>
  );
}

export default GameViewport;
