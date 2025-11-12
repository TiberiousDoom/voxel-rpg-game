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
 */
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
  onBuildingClick = () => {}
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
      const color = getBuildingColor(building);
      const state = building.state || 'COMPLETE';

      // Draw building rectangle
      ctx.fillStyle = color;
      ctx.fillRect(
        canvas.x + 2,
        canvas.y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );

      // Draw border
      ctx.strokeStyle = state === 'BLUEPRINT' ? '#666666' : '#000000';
      ctx.lineWidth = state === 'BLUEPRINT' ? 1 : 2;
      if (state === 'BLUEPRINT') {
        ctx.setLineDash([5, 3]);
      }
      ctx.strokeRect(
        canvas.x + 2,
        canvas.y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );
      ctx.setLineDash([]); // Reset dash

      // Draw health bar for damaged buildings
      const health = building.health || 100;
      const maxHealth = building.maxHealth || 100;
      if (health < maxHealth && state !== 'DESTROYED') {
        const healthPercent = health / maxHealth;
        const barWidth = TILE_SIZE - 8;
        const barHeight = 4;
        const barX = canvas.x + 4;
        const barY = canvas.y + TILE_SIZE - 8;

        // Health bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health bar fill
        const healthColor = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FF9800' : '#F44336';
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }

      // Draw build progress bar for under construction
      if (state === 'UNDER_CONSTRUCTION') {
        const progress = building.constructionProgress || 0;
        const constructionTime = building.constructionTime || 100;
        const progressPercent = Math.min(progress / constructionTime, 1);
        const barWidth = TILE_SIZE - 8;
        const barHeight = 4;
        const barX = canvas.x + 4;
        const barY = canvas.y + 4;

        // Progress bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Progress bar fill
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(barX, barY, barWidth * progressPercent, barHeight);
      }

      // Draw worker count indicator
      const workerCount = building.workerCount || 0;
      if (workerCount > 0 && state === 'COMPLETE') {
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(canvas.x + TILE_SIZE - 8, canvas.y + 8, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(workerCount, canvas.x + TILE_SIZE - 8, canvas.y + 8);
      }

      // Draw building type label (center)
      ctx.fillStyle = state === 'DESTROYED' ? '#FFFFFF' : '#000000';
      ctx.font = 'bold 12px Arial';
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
      const npcColor = getNPCColor(npc);
      const health = npc.health || 100;
      const maxHealth = npc.maxHealth || 100;

      // Draw NPC as circle
      ctx.fillStyle = npcColor;
      ctx.beginPath();
      ctx.arc(canvas.x + TILE_SIZE / 2, canvas.y + TILE_SIZE / 2, 8, 0, Math.PI * 2);
      ctx.fill();

      // Draw circle outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(canvas.x + TILE_SIZE / 2, canvas.y + TILE_SIZE / 2, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Draw role indicator (first letter)
      const role = npc.role || 'W';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        role[0],
        canvas.x + TILE_SIZE / 2,
        canvas.y + TILE_SIZE / 2
      );

      // Draw health bar if damaged
      if (health < maxHealth) {
        const healthPercent = health / maxHealth;
        const barWidth = 16;
        const barHeight = 3;
        const barX = canvas.x + TILE_SIZE / 2 - barWidth / 2;
        const barY = canvas.y + TILE_SIZE / 2 + 12;

        // Health bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health bar fill
        const healthColor = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FF9800' : '#F44336';
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }
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
      // Building placement mode
      onPlaceBuilding(selectedBuildingType, {
        x: position.x,
        y: 25, // Fixed height (gridHeight is 50, so valid range is 0-49)
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
