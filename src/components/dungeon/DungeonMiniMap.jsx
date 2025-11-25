/**
 * DungeonMiniMap.jsx - Mini-map showing dungeon room layout
 *
 * Features:
 * - Room-based grid view
 * - Current room indicator
 * - Explored/unexplored rooms
 * - Doors and connections
 * - Boss room marker
 */

import React, { useRef, useEffect, useState, memo } from 'react';
import useDungeonStore from '../../stores/useDungeonStore';

/**
 * Room type colors
 */
const ROOM_COLORS = {
  ENTRANCE: '#4ade80',      // Green
  CORRIDOR: '#94a3b8',      // Gray
  CHAMBER: '#60a5fa',       // Blue
  BOSS: '#ef4444',          // Red
  TREASURE: '#fbbf24',      // Yellow
  default: '#64748b'        // Slate
};

/**
 * Room size in pixels
 */
const ROOM_SIZE = 24;
const ROOM_GAP = 4;
const CONNECTION_WIDTH = 3;

/**
 * DungeonMiniMap Component
 */
const DungeonMiniMap = memo(function DungeonMiniMap({
  size = 180,
  position = 'top-right'
}) {
  const canvasRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    rooms,
    currentRoomId,
    showMiniMap,
    status
  } = useDungeonStore();

  // Calculate position styles
  const positionStyles = {
    'top-right': { top: '80px', right: '20px' },
    'top-left': { top: '80px', left: '20px' },
    'bottom-right': { bottom: '100px', right: '20px' },
    'bottom-left': { bottom: '100px', left: '20px' }
  };

  // Draw the mini-map
  useEffect(() => {
    if (!canvasRef.current || !rooms || rooms.length === 0 || isCollapsed) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Find bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    rooms.forEach(room => {
      const pos = room.gridPosition || { x: 0, y: 0 };
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    });

    // Calculate scale to fit
    const gridWidth = maxX - minX + 1;
    const gridHeight = maxY - minY + 1;
    const cellSize = ROOM_SIZE + ROOM_GAP;
    const totalWidth = gridWidth * cellSize;
    const totalHeight = gridHeight * cellSize;

    const scale = Math.min(
      (size - 20) / totalWidth,
      (size - 20) / totalHeight,
      1
    );

    // Center offset
    const offsetX = (size - totalWidth * scale) / 2;
    const offsetY = (size - totalHeight * scale) / 2;

    // Helper to get canvas position for room
    const getRoomPos = (room) => {
      const pos = room.gridPosition || { x: 0, y: 0 };
      return {
        x: offsetX + (pos.x - minX) * cellSize * scale,
        y: offsetY + (pos.y - minY) * cellSize * scale
      };
    };

    // Draw connections first
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = CONNECTION_WIDTH * scale;
    ctx.lineCap = 'round';

    rooms.forEach(room => {
      if (!room.explored && room.id !== currentRoomId) return;

      const connections = room.connections;
      if (!connections) return;

      const roomPos = getRoomPos(room);
      const roomCenter = {
        x: roomPos.x + (ROOM_SIZE * scale) / 2,
        y: roomPos.y + (ROOM_SIZE * scale) / 2
      };

      // Handle both Map and object formats
      const connectedIds = connections instanceof Map
        ? Array.from(connections.values())
        : Object.values(connections);

      connectedIds.forEach(connectedId => {
        const connectedRoom = rooms.find(r => r.id === connectedId);
        if (!connectedRoom) return;
        if (!connectedRoom.explored && connectedRoom.id !== currentRoomId) return;

        const connectedPos = getRoomPos(connectedRoom);
        const connectedCenter = {
          x: connectedPos.x + (ROOM_SIZE * scale) / 2,
          y: connectedPos.y + (ROOM_SIZE * scale) / 2
        };

        ctx.beginPath();
        ctx.moveTo(roomCenter.x, roomCenter.y);
        ctx.lineTo(connectedCenter.x, connectedCenter.y);
        ctx.stroke();
      });
    });

    // Draw rooms
    rooms.forEach(room => {
      const pos = getRoomPos(room);
      const roomSize = ROOM_SIZE * scale;
      const isCurrentRoom = room.id === currentRoomId;
      const isExplored = room.explored || isCurrentRoom;

      // Skip unexplored rooms (fog of war)
      if (!isExplored) {
        // Draw mystery indicator for adjacent rooms
        const adjacentToCurrent = rooms.find(r => {
          if (r.id !== currentRoomId) return false;
          const conns = r.connections;
          if (!conns) return false;
          const ids = conns instanceof Map
            ? Array.from(conns.values())
            : Object.values(conns);
          return ids.includes(room.id);
        });

        if (adjacentToCurrent) {
          ctx.fillStyle = '#374151';
          ctx.fillRect(pos.x, pos.y, roomSize, roomSize);
          ctx.fillStyle = '#6b7280';
          ctx.font = `bold ${12 * scale}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', pos.x + roomSize / 2, pos.y + roomSize / 2);
        }
        return;
      }

      // Get room color
      const roomColor = ROOM_COLORS[room.type] || ROOM_COLORS.default;

      // Draw room background
      ctx.fillStyle = isCurrentRoom ? roomColor : adjustAlpha(roomColor, 0.7);
      ctx.fillRect(pos.x, pos.y, roomSize, roomSize);

      // Draw room border
      ctx.strokeStyle = isCurrentRoom ? '#fff' : '#1e293b';
      ctx.lineWidth = isCurrentRoom ? 2 : 1;
      ctx.strokeRect(pos.x, pos.y, roomSize, roomSize);

      // Draw room icon
      if (room.type === 'BOSS' || room.type === 'TREASURE' || room.type === 'ENTRANCE') {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${10 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let icon = '';
        if (room.type === 'BOSS') icon = '💀';
        else if (room.type === 'TREASURE') icon = '💎';
        else if (room.type === 'ENTRANCE') icon = '🚪';

        ctx.fillText(icon, pos.x + roomSize / 2, pos.y + roomSize / 2);
      }

      // Draw cleared indicator
      if (room.cleared && room.type !== 'ENTRANCE') {
        ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
        ctx.fillRect(pos.x, pos.y, roomSize, roomSize);

        ctx.fillStyle = '#4ade80';
        ctx.font = `bold ${8 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', pos.x + roomSize / 2, pos.y + roomSize / 2);
      }

      // Draw player indicator in current room
      if (isCurrentRoom) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(
          pos.x + roomSize / 2,
          pos.y + roomSize / 2,
          3 * scale,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Pulsing border
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(pos.x - 2, pos.y - 2, roomSize + 4, roomSize + 4);
      }
    });

  }, [rooms, currentRoomId, size, isCollapsed]);

  if (!showMiniMap || status === 'INACTIVE') {
    return null;
  }

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        style={{
          position: 'fixed',
          ...positionStyles[position],
          width: '40px',
          height: '40px',
          background: 'rgba(30, 30, 46, 0.95)',
          border: '2px solid #4a5568',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500,
          fontSize: '18px'
        }}
        title="Show Mini-Map"
      >
        🗺️
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        width: `${size}px`,
        background: 'rgba(30, 30, 46, 0.95)',
        border: '2px solid #4a5568',
        borderRadius: '12px',
        padding: '8px',
        zIndex: 1500,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>🗺️</span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold' }}>
            Dungeon Map
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '0 4px',
            lineHeight: '1'
          }}
        >
          ×
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={size - 16}
        height={size - 16}
        style={{
          width: `${size - 16}px`,
          height: `${size - 16}px`,
          borderRadius: '6px',
          border: '1px solid #374151'
        }}
      />

      {/* Legend */}
      <div
        style={{
          marginTop: '6px',
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          fontSize: '0.65rem',
          color: '#94a3b8'
        }}
      >
        <span>🚪 Start</span>
        <span>💀 Boss</span>
        <span>💎 Loot</span>
      </div>
    </div>
  );
});

/**
 * Adjust color alpha
 */
function adjustAlpha(hexColor, alpha) {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default DungeonMiniMap;
