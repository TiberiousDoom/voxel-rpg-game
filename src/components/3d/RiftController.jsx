/**
 * RiftController.jsx — Invisible R3F component that ticks the RiftManager
 *
 * Spawns monsters from rifts, tracks alive enemies, and provides
 * rift positions for visual rendering.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';
import { RiftManager } from '../../systems/survival/RiftManager';
import { VOXEL_SIZE, CHUNK_SIZE_Y } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';

/**
 * Find the terrain surface Y for spawning at a given world (x, z).
 * Returns world Y (top of highest solid block) + 1 unit clearance, or null if chunk not loaded.
 */
function getSpawnY(chunkManager, wx, wz) {
  if (!chunkManager) return null;
  const maxVoxelY = CHUNK_SIZE_Y - 1;
  for (let vy = maxVoxelY; vy >= 0; vy--) {
    const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
    const block = chunkManager.getBlock(wx, worldY, wz);
    if (isSolid(block)) {
      // Spawn on top of this block with clearance
      return (vy + 1) * VOXEL_SIZE + 1;
    }
  }
  return null;
}

const RiftController = ({ chunkManager }) => {
  const riftManagerRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // Initialize rift manager once
  useEffect(() => {
    if (!riftManagerRef.current) {
      riftManagerRef.current = new RiftManager(12345, [0, 0, 0]);
      // Store rift positions for visual rendering
      useGameStore.getState().setRifts(
        riftManagerRef.current.rifts.map((r) => ({ id: r.id, x: r.x, z: r.z }))
      );
    }
  }, []);

  useFrame(() => {
    const rm = riftManagerRef.current;
    if (!rm) return;

    const state = useGameStore.getState();
    if (state.gameState !== 'playing') return;

    // Throttle to every 2 seconds
    const now = state.worldTime.elapsed;
    if (now - lastUpdateRef.current < 2) return;
    lastUpdateRef.current = now;

    // Build set of alive monster IDs
    const aliveIds = new Set(state.enemies.map((e) => e.id));

    // Get spawn requests
    const spawns = rm.update(now, state.player.position, state.worldTime, aliveIds);

    // Add spawned enemies to store, adjusting Y to terrain surface
    for (const spawn of spawns) {
      const [sx, , sz] = spawn.position;
      const terrainY = chunkManager ? getSpawnY(chunkManager, sx, sz) : null;
      if (terrainY == null) {
        // Chunk not loaded at spawn position — skip this spawn
        continue;
      }
      state.addRiftEnemy({
        ...spawn.monsterData,
        position: [sx, terrainY, sz],
        riftId: spawn.riftId,
      });
    }
  });

  return null;
};

export default RiftController;
