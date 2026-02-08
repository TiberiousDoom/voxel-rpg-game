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

const RiftController = () => {
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

    // Add spawned enemies to store
    for (const spawn of spawns) {
      state.addRiftEnemy({
        ...spawn.monsterData,
        position: spawn.position,
        riftId: spawn.riftId,
      });
    }
  });

  return null;
};

export default RiftController;
