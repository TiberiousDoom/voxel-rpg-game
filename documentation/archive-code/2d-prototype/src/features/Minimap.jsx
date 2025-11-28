/**
 * Minimap.jsx - Territory minimap with click-to-jump
 *
 * Features:
 * - Top-down view of game world
 * - Territory outline display
 * - Building markers
 * - NPC markers
 * - Click to jump to location
 * - Current viewport indicator
 * - Zoom and pan controls
 * - Collapsible/expandable
 *
 * Usage:
 * <Minimap
 *   gameState={gameState}
 *   cameraPosition={cameraPosition}
 *   onJumpTo={handleJumpTo}
 *   width={200}
 *   height={200}
 * />
 */

import React, { useRef, useEffect, useState } from 'react';
import './Minimap.css';

/**
 * Minimap component
 * @param {Object} props
 * @param {Object} props.gameState - Game state with buildings, NPCs, territory
 * @param {Object} props.cameraPosition - Current camera position {x, y}
 * @param {number} props.cameraZoom - Current camera zoom level
 * @param {Function} props.onJumpTo - Callback when clicking minimap
 * @param {number} props.width - Minimap width in pixels (default: 200)
 * @param {number} props.height - Minimap height in pixels (default: 200)
 * @param {number} props.worldWidth - World width (default: 1000)
 * @param {number} props.worldHeight - World height (default: 1000)
 * @param {boolean} props.showBuildings - Show building markers (default: true)
 * @param {boolean} props.showNPCs - Show NPC markers (default: true)
 * @param {boolean} props.showTerritory - Show territory outline (default: true)
 * @param {boolean} props.showViewport - Show viewport indicator (default: true)
 */
function Minimap({
  gameState = {},
  cameraPosition = { x: 0, y: 0 },
  cameraZoom = 1.0,
  onJumpTo = () => {},
  width = 200,
  height = 200,
  worldWidth = 1000,
  worldHeight = 1000,
  showBuildings = true,
  showNPCs = true,
  showTerritory = true,
  showViewport = true
}) {
  const canvasRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredPosition, setHoveredPosition] = useState(null);

  /**
   * Draw the minimap
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Scale factor for world to minimap coordinates
    const scaleX = width / worldWidth;
    const scaleY = height / worldHeight;

    /**
     * Convert world coordinates to minimap coordinates
     */
    const worldToMinimap = (worldPos) => ({
      x: (worldPos.x + worldWidth / 2) * scaleX,
      y: (worldPos.y + worldHeight / 2) * scaleY
    });

    // Draw territory outline
    if (showTerritory && gameState.territory) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);

      const bounds = gameState.territory.bounds || {
        x: -worldWidth / 4,
        y: -worldHeight / 4,
        width: worldWidth / 2,
        height: worldHeight / 2
      };

      const topLeft = worldToMinimap({ x: bounds.x, y: bounds.y });
      const terrWidth = bounds.width * scaleX;
      const terrHeight = bounds.height * scaleY;

      ctx.strokeRect(topLeft.x, topLeft.y, terrWidth, terrHeight);
      ctx.setLineDash([]);
    }

    // Draw grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;

    const gridSize = 100; // World units
    for (let x = 0; x < worldWidth; x += gridSize) {
      const px = x * scaleX;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }

    for (let y = 0; y < worldHeight; y += gridSize) {
      const py = y * scaleY;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();
    }

    // Draw buildings
    if (showBuildings && gameState.buildings) {
      gameState.buildings.forEach(building => {
        const pos = worldToMinimap(building.position || { x: 0, y: 0 });

        // Building marker
        ctx.fillStyle = getBuildingColor(building);
        ctx.fillRect(pos.x - 2, pos.y - 2, 4, 4);

        // Outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(pos.x - 2, pos.y - 2, 4, 4);
      });
    }

    // Draw NPCs
    if (showNPCs && gameState.npcs) {
      gameState.npcs.forEach(npc => {
        const pos = worldToMinimap(npc.position || { x: 0, y: 0 });

        // NPC marker (smaller dots)
        ctx.fillStyle = getNPCColor(npc);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw viewport indicator
    if (showViewport) {
      const viewportWidth = (window.innerWidth / cameraZoom) * scaleX;
      const viewportHeight = (window.innerHeight / cameraZoom) * scaleY;

      const viewportPos = worldToMinimap(cameraPosition);

      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(
        viewportPos.x - viewportWidth / 2,
        viewportPos.y - viewportHeight / 2,
        viewportWidth,
        viewportHeight
      );
      ctx.setLineDash([]);
    }

    // Draw hovered position
    if (hoveredPosition) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(hoveredPosition.x, hoveredPosition.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    gameState,
    cameraPosition,
    cameraZoom,
    width,
    height,
    worldWidth,
    worldHeight,
    showBuildings,
    showNPCs,
    showTerritory,
    showViewport,
    hoveredPosition
  ]);

  /**
   * Get building color based on type/state
   */
  const getBuildingColor = (building) => {
    // Color by building state
    if (building.state === 'DAMAGED') return '#ff6666';
    if (building.state === 'BUILDING') return '#ffaa00';

    // Color by building type
    switch (building.type) {
      case 'WALL': return '#8b4513';
      case 'STORAGE': return '#ffa500';
      case 'FARM': return '#90ee90';
      case 'MINE': return '#708090';
      case 'BARRACKS': return '#b22222';
      default: return '#4a90e2';
    }
  };

  /**
   * Get NPC color based on role
   */
  const getNPCColor = (npc) => {
    switch (npc.role) {
      case 'WORKER': return '#4a90e2';
      case 'FARMER': return '#90ee90';
      case 'MINER': return '#ffa500';
      case 'GUARD': return '#b22222';
      default: return '#ffffff';
    }
  };

  /**
   * Handle click on minimap
   */
  const handleMinimapClick = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert minimap coordinates to world coordinates
    const scaleX = worldWidth / width;
    const scaleY = worldHeight / height;

    const worldX = x * scaleX - worldWidth / 2;
    const worldY = y * scaleY - worldHeight / 2;

    onJumpTo({ x: worldX, y: worldY });
  };

  /**
   * Handle mouse move for hover effect
   */
  const handleMouseMove = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setHoveredPosition({ x, y });
  };

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = () => {
    setHoveredPosition(null);
  };

  /**
   * Toggle expanded/collapsed
   */
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`minimap ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Header */}
      <div className="minimap-header" onClick={toggleExpanded}>
        <h3 className="minimap-title">Map</h3>
        <button
          className="minimap-toggle"
          aria-label={isExpanded ? 'Collapse minimap' : 'Expand minimap'}
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {/* Canvas */}
      {isExpanded && (
        <div className="minimap-content">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="minimap-canvas"
            onClick={handleMinimapClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            title="Click to jump to location"
          />

          {/* Legend */}
          <div className="minimap-legend">
            {showBuildings && (
              <div className="minimap-legend-item">
                <div className="minimap-legend-icon building"></div>
                <span>Buildings</span>
              </div>
            )}
            {showNPCs && (
              <div className="minimap-legend-item">
                <div className="minimap-legend-icon npc"></div>
                <span>NPCs</span>
              </div>
            )}
            {showViewport && (
              <div className="minimap-legend-item">
                <div className="minimap-legend-icon viewport"></div>
                <span>View</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="minimap-info">
            <span className="minimap-info-text">Click to jump</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Minimap;
