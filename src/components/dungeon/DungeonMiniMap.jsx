/**
 * DungeonMiniMap.jsx - Mini-map component for dungeon navigation
 *
 * Shows:
 * - Explored rooms
 * - Current room highlighted
 * - Room types (entrance, boss, treasure, etc.)
 * - Connections between rooms
 */

import React, { useMemo, memo } from 'react';
import './DungeonMiniMap.css';

const ROOM_SIZE = 20;
const ROOM_GAP = 8;

/**
 * Room type colors
 */
const ROOM_COLORS = {
  ENTRANCE: '#4a6fa5',
  CORRIDOR: '#5a5a6a',
  CHAMBER: '#6a5a5a',
  BOSS: '#8a2a2a',
  TREASURE: '#8a7a2a'
};

/**
 * DungeonMiniMap Component
 */
const DungeonMiniMap = memo(function DungeonMiniMap({ dungeon, currentRoomId, exploredRooms }) {
  // Calculate room positions and connections
  const { rooms, connections, bounds } = useMemo(() => {
    if (!dungeon) {
      return { rooms: [], connections: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
    }

    const allRooms = dungeon.getAllRooms();
    const roomList = [];
    const connectionList = [];
    const exploredSet = exploredRooms instanceof Set ? exploredRooms : new Set(exploredRooms);

    // Calculate bounds
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    allRooms.forEach(room => {
      const x = room.gridPosition.x;
      const y = room.gridPosition.y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const isExplored = exploredSet.has(room.id);
      const isCurrent = room.id === currentRoomId;

      roomList.push({
        id: room.id,
        x,
        y,
        type: room.type,
        explored: isExplored,
        current: isCurrent,
        cleared: room.cleared
      });

      // Add connections
      room.getConnectionDirections().forEach(dir => {
        const targetId = room.getConnection(dir);
        // Only add connection if not already added (avoid duplicates)
        const connectionKey = [room.id, targetId].sort().join('-');
        if (!connectionList.some(c => c.key === connectionKey)) {
          const targetRoom = dungeon.getRoom(targetId);
          if (targetRoom && (isExplored || exploredSet.has(targetId))) {
            connectionList.push({
              key: connectionKey,
              x1: x,
              y1: y,
              x2: targetRoom.gridPosition.x,
              y2: targetRoom.gridPosition.y,
              visible: isExplored && exploredSet.has(targetId)
            });
          }
        }
      });
    });

    return {
      rooms: roomList,
      connections: connectionList,
      bounds: { minX, minY, maxX, maxY }
    };
  }, [dungeon, currentRoomId, exploredRooms]);

  if (!dungeon) {
    return (
      <div className="dungeon-minimap">
        <h3>Map</h3>
        <div className="minimap-empty">No dungeon active</div>
      </div>
    );
  }

  // Calculate SVG viewBox
  const width = (bounds.maxX - bounds.minX + 1) * (ROOM_SIZE + ROOM_GAP) + ROOM_GAP * 2;
  const height = (bounds.maxY - bounds.minY + 1) * (ROOM_SIZE + ROOM_GAP) + ROOM_GAP * 2;
  const offsetX = -bounds.minX * (ROOM_SIZE + ROOM_GAP) + ROOM_GAP;
  const offsetY = -bounds.minY * (ROOM_SIZE + ROOM_GAP) + ROOM_GAP;

  return (
    <div className="dungeon-minimap">
      <h3>Map</h3>
      <svg
        className="minimap-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Connections */}
        {connections.map(conn => (
          <line
            key={conn.key}
            x1={conn.x1 * (ROOM_SIZE + ROOM_GAP) + ROOM_SIZE / 2 + offsetX}
            y1={conn.y1 * (ROOM_SIZE + ROOM_GAP) + ROOM_SIZE / 2 + offsetY}
            x2={conn.x2 * (ROOM_SIZE + ROOM_GAP) + ROOM_SIZE / 2 + offsetX}
            y2={conn.y2 * (ROOM_SIZE + ROOM_GAP) + ROOM_SIZE / 2 + offsetY}
            className={`minimap-connection ${conn.visible ? 'visible' : 'hidden'}`}
          />
        ))}

        {/* Rooms */}
        {rooms.map(room => {
          const rx = room.x * (ROOM_SIZE + ROOM_GAP) + offsetX;
          const ry = room.y * (ROOM_SIZE + ROOM_GAP) + offsetY;

          return (
            <g key={room.id}>
              <rect
                x={rx}
                y={ry}
                width={ROOM_SIZE}
                height={ROOM_SIZE}
                rx={3}
                ry={3}
                fill={room.explored ? ROOM_COLORS[room.type] : '#333'}
                stroke={room.current ? '#fff' : room.explored ? '#666' : '#444'}
                strokeWidth={room.current ? 3 : 1}
                className={`minimap-room ${room.explored ? 'explored' : 'hidden'} ${room.current ? 'current' : ''}`}
              />
              {room.explored && room.cleared && (
                <text
                  x={rx + ROOM_SIZE / 2}
                  y={ry + ROOM_SIZE / 2 + 4}
                  textAnchor="middle"
                  className="room-cleared-mark"
                >
                  ✓
                </text>
              )}
              {room.current && (
                <circle
                  cx={rx + ROOM_SIZE / 2}
                  cy={ry + ROOM_SIZE / 2}
                  r={4}
                  fill="#fff"
                  className="current-marker"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="minimap-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: ROOM_COLORS.ENTRANCE }} />
          <span>Entrance</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: ROOM_COLORS.BOSS }} />
          <span>Boss</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: ROOM_COLORS.TREASURE }} />
          <span>Treasure</span>
        </div>
      </div>
    </div>
  );
});

export default DungeonMiniMap;
