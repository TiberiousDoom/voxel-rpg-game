/**
 * ZoneOverlay - Renders all finalized zone rectangles as colored planes on terrain.
 * Drag preview is rendered inside ZoneInteraction for real-time updates.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { ZONE_COLORS } from '../../data/zoneTypes';
import { VOXEL_SIZE, CHUNK_SIZE_Y, worldToChunk } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';

function getTerrainY(chunkManager, wx, wz) {
  if (!chunkManager) return 2;
  const { chunkX, chunkZ } = worldToChunk(wx, wz);
  const chunk = chunkManager.getChunk(chunkX, chunkZ);
  if (!chunk) return 2;
  const maxVoxelY = CHUNK_SIZE_Y - 1;
  for (let vy = maxVoxelY; vy >= 0; vy--) {
    const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
    const block = chunkManager.getBlock(wx, worldY, wz);
    if (isSolid(block)) {
      return (vy + 1) * VOXEL_SIZE;
    }
  }
  return 2;
}

/**
 * Single zone plane with wireframe border
 */
const ZonePlane = React.memo(({ zone, chunkManager }) => {
  const { bounds, type } = zone;
  const colors = ZONE_COLORS[type] || ZONE_COLORS.MINING;

  const sizeX = bounds.maxX - bounds.minX;
  const sizeZ = bounds.maxZ - bounds.minZ;
  const centerX = bounds.minX + sizeX / 2;
  const centerZ = bounds.minZ + sizeZ / 2;
  const terrainY = getTerrainY(chunkManager, centerX, centerZ);

  const planeGeo = useMemo(() => new THREE.PlaneGeometry(sizeX, sizeZ), [sizeX, sizeZ]);
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(planeGeo), [planeGeo]);

  return (
    <group position={[centerX, terrainY + 0.05, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={planeGeo}>
        <meshBasicMaterial
          color={colors.fill}
          transparent
          opacity={colors.opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial color={colors.border} linewidth={2} />
      </lineSegments>
    </group>
  );
});

export default function ZoneOverlay({ chunkManager }) {
  const zones = useGameStore((state) => state.zones);

  return (
    <>
      {zones.map((zone) => (
        <ZonePlane key={zone.id} zone={zone} chunkManager={chunkManager} />
      ))}
    </>
  );
}
