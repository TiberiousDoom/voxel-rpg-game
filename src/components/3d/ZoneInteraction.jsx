/**
 * ZoneInteraction - Handles click-drag zone placement and deletion.
 *
 * Desktop: pointerdown → drag → pointerup to define zone rectangle
 * Mobile: tap corner1, tap corner2
 * Right-click on existing zone to delete it.
 *
 * Also renders the drag preview rectangle.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { VOXEL_SIZE, CHUNK_SIZE_Y, worldToChunk } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';
import { createZone, ZONE_COLORS } from '../../data/zoneTypes';
import { ZONE_MAX_COUNT, ZONE_MAX_SIDE_VOXELS, ZONE_MIN_SIDE_VOXELS } from '../../data/tuning';
import { scanMiningZone } from '../../systems/settlement/MiningZoneScanner';

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

/** Snap a world coordinate to the voxel grid edge */
function snapToGrid(value) {
  return Math.floor(value / VOXEL_SIZE) * VOXEL_SIZE;
}

/** Raycast against a horizontal plane at given Y to get world XZ from screen position */
function screenToWorldXZ(screenX, screenY, camera, gl, planeY) {
  const rect = gl.domElement.getBoundingClientRect();
  const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((screenY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);

  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
  const target = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(plane, target);

  if (!hit) return null;
  return [snapToGrid(target.x), snapToGrid(target.z)];
}

/**
 * Drag preview rectangle (rendered inside this component for real-time updates)
 */
function DragPreview({ start, end, zoneType, chunkManager }) {
  if (!start || !end) return null;

  const colors = ZONE_COLORS[zoneType] || ZONE_COLORS.MINING;
  const minX = Math.min(start[0], end[0]);
  const maxX = Math.max(start[0], end[0]) + VOXEL_SIZE;
  const minZ = Math.min(start[1], end[1]);
  const maxZ = Math.max(start[1], end[1]) + VOXEL_SIZE;

  const sizeX = maxX - minX;
  const sizeZ = maxZ - minZ;
  if (sizeX < 0.1 || sizeZ < 0.1) return null;

  const centerX = minX + sizeX / 2;
  const centerZ = minZ + sizeZ / 2;
  const terrainY = getTerrainY(chunkManager, centerX, centerZ);

  return (
    <group position={[centerX, terrainY + 0.1, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <planeGeometry args={[sizeX, sizeZ]} />
        <meshBasicMaterial
          color={colors.fill}
          transparent
          opacity={0.4}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(sizeX, sizeZ)]} />
        <lineBasicMaterial color={colors.border} linewidth={2} />
      </lineSegments>
    </group>
  );
}

export default function ZoneInteraction({ chunkManager }) {
  const { camera, gl } = useThree();
  const [previewEnd, setPreviewEnd] = useState(null);
  const isDragging = useRef(false);
  const pointerDownPos = useRef({ x: 0, y: 0 });

  const zoneMode = useGameStore((state) => state.zoneMode);
  const zoneDragStart = useGameStore((state) => state.zoneDragStart);
  const zoneTypeToPlace = useGameStore((state) => state.zoneTypeToPlace);

  const getPlaneY = useCallback(() => {
    const pos = useGameStore.getState().player.position;
    return pos[1];
  }, []);

  // Zone creation logic
  const finalizeZone = useCallback((corner1, corner2) => {
    const store = useGameStore.getState();
    if (!store.zoneMode || !store.zoneTypeToPlace) return;

    if (store.zones.length >= ZONE_MAX_COUNT) {
      store.addPickupText('Max zones reached!', '#ff4444');
      store.clearZoneDrag();
      return;
    }

    const minX = Math.min(corner1[0], corner2[0]);
    const maxX = Math.max(corner1[0], corner2[0]) + VOXEL_SIZE;
    const minZ = Math.min(corner1[1], corner2[1]);
    const maxZ = Math.max(corner1[1], corner2[1]) + VOXEL_SIZE;

    const sideVoxelsX = (maxX - minX) / VOXEL_SIZE;
    const sideVoxelsZ = (maxZ - minZ) / VOXEL_SIZE;

    if (sideVoxelsX < ZONE_MIN_SIDE_VOXELS || sideVoxelsZ < ZONE_MIN_SIDE_VOXELS) {
      store.addPickupText('Zone too small (min 2x2)', '#ff4444');
      store.clearZoneDrag();
      setPreviewEnd(null);
      return;
    }

    if (sideVoxelsX > ZONE_MAX_SIDE_VOXELS || sideVoxelsZ > ZONE_MAX_SIDE_VOXELS) {
      store.addPickupText('Zone too large (max 32x32)', '#ff4444');
      store.clearZoneDrag();
      setPreviewEnd(null);
      return;
    }

    const zone = createZone({
      type: store.zoneTypeToPlace,
      minX, minZ, maxX, maxZ,
    });

    store.addZone(zone);

    // Scan for mining tasks if MINING zone
    if (zone.type === 'MINING' && chunkManager) {
      const miningTasks = scanMiningZone(zone.bounds, chunkManager);
      store.updateZone(zone.id, { miningTasks });
      store.addPickupText(`Mining Zone created (${miningTasks.length} blocks)`, '#ff8c00');
    } else {
      store.addPickupText(`${zone.type} Zone created`, '#4488ff');
    }

    store.clearZoneDrag();
    setPreviewEnd(null);
  }, [chunkManager]);

  // Find which zone contains a world point
  const findZoneAtPoint = useCallback((worldX, worldZ) => {
    const zones = useGameStore.getState().zones;
    for (let i = zones.length - 1; i >= 0; i--) {
      const { bounds } = zones[i];
      if (worldX >= bounds.minX && worldX <= bounds.maxX &&
          worldZ >= bounds.minZ && worldZ <= bounds.maxZ) {
        return zones[i];
      }
    }
    return null;
  }, []);

  // Desktop event handlers
  useEffect(() => {
    if (!zoneMode) {
      setPreviewEnd(null);
      return;
    }

    const canvas = gl.domElement;

    const handlePointerDown = (event) => {
      if (!useGameStore.getState().zoneMode) return;

      const planeY = getPlaneY();

      // Right-click: delete zone
      if (event.button === 2) {
        event.preventDefault();
        const pos = screenToWorldXZ(event.clientX, event.clientY, camera, gl, planeY);
        if (pos) {
          const zone = findZoneAtPoint(pos[0], pos[1]);
          if (zone) {
            useGameStore.getState().removeZone(zone.id);
            useGameStore.getState().addPickupText('Zone removed', '#ff4444');
          }
        }
        return;
      }

      if (event.button !== 0) return;

      pointerDownPos.current = { x: event.clientX, y: event.clientY };

      const store = useGameStore.getState();
      const pos = screenToWorldXZ(event.clientX, event.clientY, camera, gl, planeY);
      if (!pos) return;

      // Delete mode: tap a zone to remove it
      if (store.zoneTypeToPlace === '__DELETE__') {
        const zone = findZoneAtPoint(pos[0], pos[1]);
        if (zone) {
          store.removeZone(zone.id);
          store.addPickupText('Zone removed', '#ff4444');
        }
        return;
      }

      if (!store.zoneDragStart) {
        // First corner
        store.setZoneDragStart(pos);
        setPreviewEnd(pos);
        isDragging.current = true;
      } else {
        // Second click (mobile-style two-tap)
        finalizeZone(store.zoneDragStart, pos);
        isDragging.current = false;
      }
    };

    const handlePointerMove = (event) => {
      const store = useGameStore.getState();
      if (!store.zoneMode || !store.zoneDragStart) return;

      const planeY = getPlaneY();
      const pos = screenToWorldXZ(event.clientX, event.clientY, camera, gl, planeY);
      if (pos) {
        setPreviewEnd(pos);
      }
    };

    const handlePointerUp = (event) => {
      if (event.button !== 0) return;
      if (!isDragging.current) return;

      const store = useGameStore.getState();
      if (!store.zoneMode || !store.zoneDragStart) return;

      // Check if it was a drag (moved at least a few pixels)
      const dx = event.clientX - pointerDownPos.current.x;
      const dy = event.clientY - pointerDownPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        // This was a drag — finalize
        const planeY = getPlaneY();
        const pos = screenToWorldXZ(event.clientX, event.clientY, camera, gl, planeY);
        if (pos) {
          finalizeZone(store.zoneDragStart, pos);
        }
        isDragging.current = false;
      }
      // If dist <= 10, treat as click — wait for second click to finalize
    };

    const handleContextMenu = (event) => {
      if (useGameStore.getState().zoneMode) {
        event.preventDefault();
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [zoneMode, camera, gl, getPlaneY, finalizeZone, findZoneAtPoint]);

  if (!zoneMode) return null;

  return (
    <DragPreview
      start={zoneDragStart}
      end={previewEnd}
      zoneType={zoneTypeToPlace}
      chunkManager={chunkManager}
    />
  );
}
