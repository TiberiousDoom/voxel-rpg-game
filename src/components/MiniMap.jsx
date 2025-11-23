import React, { useRef, useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

/**
 * Biome colors for mini-map (simplified palette)
 */
const MINIMAP_BIOME_COLORS = {
  ocean: '#1E3A8A',
  beach: '#F5DEB3',
  plains: '#90EE90',
  forest: '#228B22',
  desert: '#F4A460',
  mountains: '#8B7355',
  tundra: '#E0FFFF',
  swamp: '#556B2F',
  jungle: '#006400',
  savanna: '#DAA520',
};

/**
 * MiniMap Component
 * Displays a small overhead view showing biomes, structures, water, and player position
 *
 * Phase 3 Integration: Mini-map with biomes/structures/water
 */
const MiniMap = ({ terrainSystem, cameraX, cameraZ, size = 200, zoom = 0.5 }) => {
  const canvasRef = useRef(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!canvasRef.current || !terrainSystem) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate world bounds for mini-map
    const tileSize = 4 * zoom; // Each tile is 4px at zoom=1
    const tilesX = Math.floor(canvas.width / tileSize);
    const tilesZ = Math.floor(canvas.height / tileSize);
    const startX = Math.floor(cameraX - tilesX / 2);
    const startZ = Math.floor(cameraZ - tilesZ / 2);

    // Draw biomes
    for (let z = 0; z < tilesZ; z++) {
      for (let x = 0; x < tilesX; x++) {
        const worldX = startX + x;
        const worldZ = startZ + z;

        // Get biome at this position
        const biome = terrainSystem.getBiome?.(worldX, worldZ) || 'plains';
        const color = MINIMAP_BIOME_COLORS[biome] || MINIMAP_BIOME_COLORS.plains;

        // Get height for shading
        const height = terrainSystem.getHeight?.(worldX, worldZ) || 5;
        const heightFactor = 0.8 + (height / 20) * 0.4; // 0.8 to 1.2

        // Apply height-based shading
        const shadedColor = adjustBrightness(color, (heightFactor - 1) * 50);

        ctx.fillStyle = shadedColor;
        ctx.fillRect(
          centerX - (tilesX / 2) * tileSize + x * tileSize,
          centerY - (tilesZ / 2) * tileSize + z * tileSize,
          tileSize,
          tileSize
        );
      }
    }

    // Draw water bodies
    if (terrainSystem.getWaterBodiesInRegion) {
      const waterBodies = terrainSystem.getWaterBodiesInRegion(
        startX,
        startZ,
        tilesX,
        tilesZ
      );

      ctx.fillStyle = '#4FC3F7';
      for (const waterBody of waterBodies) {
        const relX = waterBody.position.x - startX;
        const relZ = waterBody.position.z - startZ;
        const canvasX = centerX - (tilesX / 2) * tileSize + relX * tileSize;
        const canvasZ = centerY - (tilesZ / 2) * tileSize + relZ * tileSize;
        const radius = waterBody.radius * tileSize;

        ctx.beginPath();
        ctx.arc(canvasX, canvasZ, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw rivers
    if (terrainSystem.getRiversInRegion) {
      const rivers = terrainSystem.getRiversInRegion(startX, startZ, tilesX, tilesZ);

      ctx.strokeStyle = '#5FA8D3';
      ctx.lineWidth = 2 * zoom;
      ctx.lineCap = 'round';

      for (const river of rivers) {
        if (river.segments.length < 2) continue;

        ctx.beginPath();
        for (let i = 0; i < river.segments.length; i++) {
          const segment = river.segments[i];
          const relX = segment.x - startX;
          const relZ = segment.z - startZ;
          const canvasX = centerX - (tilesX / 2) * tileSize + relX * tileSize;
          const canvasZ = centerY - (tilesZ / 2) * tileSize + relZ * tileSize;

          if (i === 0) {
            ctx.moveTo(canvasX, canvasZ);
          } else {
            ctx.lineTo(canvasX, canvasZ);
          }
        }
        ctx.stroke();
      }
    }

    // Draw structures
    if (terrainSystem.getStructuresInRegion) {
      const structures = terrainSystem.getStructuresInRegion(startX, startZ, tilesX, tilesZ);

      for (const structure of structures) {
        const relX = structure.position.x - startX;
        const relZ = structure.position.z - startZ;
        const canvasX = centerX - (tilesX / 2) * tileSize + relX * tileSize;
        const canvasZ = centerY - (tilesZ / 2) * tileSize + relZ * tileSize;

        // Draw structure as a colored square
        const structureColor = getStructureColor(structure.type || structure.name);
        ctx.fillStyle = structureColor;
        ctx.fillRect(
          canvasX - 3 * zoom,
          canvasZ - 3 * zoom,
          6 * zoom,
          6 * zoom
        );

        // Border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          canvasX - 3 * zoom,
          canvasZ - 3 * zoom,
          6 * zoom,
          6 * zoom
        );
      }
    }

    // Draw player position (center)
    ctx.fillStyle = '#FF0000';
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5 * zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw directional indicator (north)
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${12 * zoom}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('N', centerX, 15 * zoom);

  }, [terrainSystem, cameraX, cameraZ, size, zoom]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          background: 'rgba(26, 26, 46, 0.9)',
          border: '2px solid #4dabf7',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        }}
      >
        <MapPin size={24} color="#4dabf7" />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: `${size}px`,
        background: 'rgba(26, 26, 46, 0.95)',
        border: '2px solid #4dabf7',
        borderRadius: '12px',
        padding: '10px',
        zIndex: 1500,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={18} color="#4dabf7" />
          <span style={{ color: '#4dabf7', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Mini-Map
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '0 5px',
            lineHeight: '1',
          }}
        >
          ×
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '8px',
          border: '1px solid #4a5568',
        }}
      />

      {/* Legend */}
      <div
        style={{
          marginTop: '8px',
          padding: '6px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '6px',
          fontSize: '0.7rem',
          color: '#cbd5e0',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', background: '#FF0000', borderRadius: '50%' }} />
            <span>Player</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', background: '#4FC3F7', borderRadius: '50%' }} />
            <span>Water</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', background: '#FFD700', borderRadius: '2px' }} />
            <span>Structures</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', background: '#228B22', borderRadius: '2px' }} />
            <span>Biomes</span>
          </div>
        </div>
      </div>

      {/* Coordinates */}
      <div
        style={{
          marginTop: '6px',
          textAlign: 'center',
          fontSize: '0.7rem',
          color: '#a0aec0',
        }}
      >
        X: {Math.floor(cameraX)}, Z: {Math.floor(cameraZ)}
      </div>
    </div>
  );
};

/**
 * Adjust color brightness
 */
function adjustBrightness(hexColor, percent) {
  // Handle rgb() format
  if (hexColor.startsWith('rgb')) {
    return hexColor;
  }

  const num = parseInt(hexColor.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent));

  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/**
 * Get structure color based on type
 */
function getStructureColor(structureType) {
  const colors = {
    village: '#FFD700',
    temple: '#9370DB',
    ruins: '#A0522D',
    tower: '#CD5C5C',
    dungeon: '#8B0000',
    shrine: '#DDA0DD',
    camp: '#DAA520',
    fort: '#696969',
  };

  return colors[structureType] || '#FFD700';
}

export default MiniMap;
