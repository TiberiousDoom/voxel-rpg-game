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

// Building state colors
const BUILDING_STATE_COLORS = {
  BLUEPRINT: 'rgba(100, 149, 237, 0.4)',      // Light blue, semi-transparent
  UNDER_CONSTRUCTION: 'rgba(255, 215, 0, 0.6)', // Gold, semi-transparent
  COMPLETED: null,                             // Use default building color
  DAMAGED: 'rgba(255, 69, 0, 0.7)'            // Red-orange overlay
};

// NPC status colors
const NPC_STATUS_COLORS = {
  WORKING: '#4CAF50',    // Green - productive
  RESTING: '#2196F3',    // Blue - recovering
  HUNGRY: '#FF9800',     // Orange - needs food
  IDLE: '#9E9E9E',       // Gray - waiting for task
  MOVING: '#00BCD4',     // Cyan - in transit
  DEFAULT: '#FF6B6B'     // Red - default/unknown
};

// NPC role badge colors
const NPC_ROLE_COLORS = {
  WORKER: '#8BC34A',     // Light green
  FARMER: '#CDDC39',     // Lime
  GUARD: '#F44336',      // Red
  BUILDER: '#FF9800',    // Orange
  DEFAULT: '#607D8B'     // Blue gray
};

const GRID_COLOR = '#E0E0E0';
const SELECTED_COLOR = '#FF4444';
const HEALTH_BAR_BG = 'rgba(0, 0, 0, 0.3)';
const HEALTH_BAR_GREEN = '#4CAF50';
const HEALTH_BAR_YELLOW = '#FFC107';
const HEALTH_BAR_RED = '#F44336';
const PROGRESS_BAR_BG = 'rgba(0, 0, 0, 0.2)';
const PROGRESS_BAR_FILL = '#2196F3';

/**
 * Helper function: Get NPC status color based on state
 */
const getNPCStatusColor = (npc) => {
  if (!npc.alive) return NPC_STATUS_COLORS.DEFAULT;
  if (npc.hungry) return NPC_STATUS_COLORS.HUNGRY;
  if (npc.isWorking) return NPC_STATUS_COLORS.WORKING;
  if (npc.isResting) return NPC_STATUS_COLORS.RESTING;
  if (npc.isMoving) return NPC_STATUS_COLORS.MOVING;
  return NPC_STATUS_COLORS.IDLE;
};

/**
 * Helper function: Get health bar color based on health percentage
 */
const getHealthBarColor = (healthPercent) => {
  if (healthPercent > 0.6) return HEALTH_BAR_GREEN;
  if (healthPercent > 0.3) return HEALTH_BAR_YELLOW;
  return HEALTH_BAR_RED;
};

/**
 * Helper function: Draw health bar
 */
const drawHealthBar = (ctx, x, y, width, currentHealth, maxHealth) => {
  const barHeight = 4;
  const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth));

  // Background
  ctx.fillStyle = HEALTH_BAR_BG;
  ctx.fillRect(x, y, width, barHeight);

  // Health fill
  ctx.fillStyle = getHealthBarColor(healthPercent);
  ctx.fillRect(x, y, width * healthPercent, barHeight);

  // Border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, barHeight);
};

/**
 * Helper function: Draw progress bar
 */
const drawProgressBar = (ctx, x, y, width, progress) => {
  const barHeight = 4;
  const progressPercent = Math.max(0, Math.min(1, progress / 100));

  // Background
  ctx.fillStyle = PROGRESS_BAR_BG;
  ctx.fillRect(x, y, width, barHeight);

  // Progress fill
  ctx.fillStyle = PROGRESS_BAR_FILL;
  ctx.fillRect(x, y, width * progressPercent, barHeight);

  // Border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, barHeight);
};

/**
 * Helper function: Draw worker count indicator
 */
const drawWorkerCount = (ctx, x, y, assignedCount, maxSlots) => {
  const text = `${assignedCount}/${maxSlots}`;
  const fontSize = 10;
  const padding = 3;

  // Measure text
  ctx.font = `${fontSize}px Arial`;
  const textWidth = ctx.measureText(text).width;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(x, y, textWidth + padding * 2, fontSize + padding * 2);

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x + padding, y + padding);
};

/**
 * Helper function: Draw role badge
 */
const drawRoleBadge = (ctx, x, y, role) => {
  const roleChar = (role || 'W')[0].toUpperCase();
  const badgeSize = 10;
  const color = NPC_ROLE_COLORS[role] || NPC_ROLE_COLORS.DEFAULT;

  // Circle background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, badgeSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Letter
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 8px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(roleChar, x, y);
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

      // Base color from building type
      let color = BUILDING_COLORS[building.type] || '#CCCCCC';

      // Apply state-based color overlay
      const status = building.status || 'COMPLETED';
      const stateColor = BUILDING_STATE_COLORS[status];

      // Draw base building
      ctx.fillStyle = stateColor || color;
      ctx.fillRect(
        canvas.x + 2,
        canvas.y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );

      // Draw border with state-specific styling
      ctx.strokeStyle = status === 'BLUEPRINT' ? 'rgba(100, 149, 237, 0.8)' : '#000000';
      ctx.lineWidth = status === 'BLUEPRINT' ? 1 : 2;
      if (status === 'BLUEPRINT') {
        ctx.setLineDash([5, 3]); // Dashed line for blueprints
      }
      ctx.strokeRect(
        canvas.x + 2,
        canvas.y + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );
      ctx.setLineDash([]); // Reset line dash

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

      // Draw construction progress bar for buildings under construction
      if (status === 'UNDER_CONSTRUCTION' && building.constructionProgress !== undefined) {
        drawProgressBar(
          ctx,
          canvas.x + 4,
          canvas.y + TILE_SIZE - 8,
          TILE_SIZE - 8,
          building.constructionProgress
        );
      }

      // Draw worker count indicator for staffed buildings
      const workSlots = building.workSlots || 0;
      const assignedNPCs = building.assignedNPCs || [];
      const assignedCount = Array.isArray(assignedNPCs) ? assignedNPCs.length : 0;

      if (workSlots > 0 && status === 'COMPLETED') {
        drawWorkerCount(
          ctx,
          canvas.x + 3,
          canvas.y + 3,
          assignedCount,
          workSlots
        );
      }

      // Draw health bar for damaged buildings or buildings with health < max
      const currentHealth = building.health || building.maxHealth || 100;
      const maxHealth = building.maxHealth || 100;
      const isHealthy = currentHealth >= maxHealth;

      if (!isHealthy || status === 'DAMAGED') {
        drawHealthBar(
          ctx,
          canvas.x + 4,
          canvas.y + TILE_SIZE - 14,
          TILE_SIZE - 8,
          currentHealth,
          maxHealth
        );
      }
    });

    // Draw NPCs
    npcs.forEach((npc) => {
      if (!npc || !npc.position) return;
      const canvas = worldToCanvas(npc.position.x, npc.position.z);

      // Get NPC status color
      const statusColor = getNPCStatusColor(npc);

      // Draw NPC as circle with status color
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(canvas.x + TILE_SIZE / 2, canvas.y + TILE_SIZE / 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Draw circle outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw role badge (small badge at top-right of NPC)
      if (npc.role) {
        drawRoleBadge(
          ctx,
          canvas.x + TILE_SIZE / 2 + 5,
          canvas.y + TILE_SIZE / 2 - 5,
          npc.role
        );
      }

      // Draw health bar above NPC
      const npcHealth = npc.health || npc.maxHealth || 100;
      const npcMaxHealth = npc.maxHealth || 100;
      const healthPercent = npcHealth / npcMaxHealth;

      // Only show health bar if not at full health or if in combat/damaged
      if (healthPercent < 1.0 || npc.hungry) {
        drawHealthBar(
          ctx,
          canvas.x + TILE_SIZE / 2 - 10,
          canvas.y + TILE_SIZE / 2 - 12,
          20,
          npcHealth,
          npcMaxHealth
        );
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
      <div className="viewport-legend">
        <div className="legend-section">
          <h4>NPC Status</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: NPC_STATUS_COLORS.WORKING }}></span>
              <span>Working</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: NPC_STATUS_COLORS.RESTING }}></span>
              <span>Resting</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: NPC_STATUS_COLORS.HUNGRY }}></span>
              <span>Hungry</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: NPC_STATUS_COLORS.IDLE }}></span>
              <span>Idle</span>
            </div>
          </div>
        </div>
        <div className="legend-section">
          <h4>Building Status</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-square" style={{ backgroundColor: BUILDING_STATE_COLORS.BLUEPRINT }}></span>
              <span>Blueprint</span>
            </div>
            <div className="legend-item">
              <span className="legend-square" style={{ backgroundColor: BUILDING_STATE_COLORS.UNDER_CONSTRUCTION }}></span>
              <span>Building</span>
            </div>
            <div className="legend-item">
              <span className="legend-square" style={{ backgroundColor: BUILDING_STATE_COLORS.DAMAGED }}></span>
              <span>Damaged</span>
            </div>
          </div>
        </div>
        <div className="legend-section">
          <h4>Indicators</h4>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-bar" style={{ backgroundColor: PROGRESS_BAR_FILL }}></span>
              <span>Build Progress</span>
            </div>
            <div className="legend-item">
              <span className="legend-bar" style={{ backgroundColor: HEALTH_BAR_GREEN }}></span>
              <span>Health</span>
            </div>
            <div className="legend-item">
              <span className="legend-text">2/3</span>
              <span>Workers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameViewport;
