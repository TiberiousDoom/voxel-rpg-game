/**
 * RiftController.jsx — Invisible R3F component that ticks the RiftManager
 *
 * Spawns monsters from rifts, tracks alive enemies, manages rift closing,
 * corruption fade, reinforcement waves, and provides rift state for rendering.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';
import { RiftManager, RiftState } from '../../systems/survival/RiftManager';
import CorruptionManager from '../../systems/survival/CorruptionManager';
import { VOXEL_SIZE, CHUNK_SIZE_Y } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';


/**
 * Find the terrain surface Y for spawning at a given world (x, z).
 */
function getSpawnY(chunkManager, wx, wz) {
  if (!chunkManager) return null;
  const maxVoxelY = CHUNK_SIZE_Y - 1;
  for (let vy = maxVoxelY; vy >= 0; vy--) {
    const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
    const block = chunkManager.getBlock(wx, worldY, wz);
    if (isSolid(block)) {
      return (vy + 1) * VOXEL_SIZE + 1;
    }
  }
  return null;
}

const RiftController = ({ chunkManager }) => {
  const riftManagerRef = useRef(null);
  const corruptionManagerRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // Initialize rift manager + corruption manager once
  useEffect(() => {
    if (!riftManagerRef.current) {
      riftManagerRef.current = new RiftManager(12345, [0, 0, 0]);
      corruptionManagerRef.current = new CorruptionManager();

      // Store rift positions for visual rendering
      const rm = riftManagerRef.current;
      useGameStore.getState().setRifts(
        rm.rifts
          .filter(r => r.state !== RiftState.CLOSED)
          .map((r) => ({
            id: r.id, x: r.x, z: r.z,
            state: r.state,
            corruptionProgress: r.corruptionProgress,
            anchorHealth: r.anchorHealth,
          }))
      );
    }
  }, []);

  // Expose rift manager ref for E-key interaction (via proper store setter)
  useEffect(() => {
    if (riftManagerRef.current) {
      useGameStore.getState().setRiftManager(riftManagerRef.current);
    }
    return () => {
      useGameStore.getState().setRiftManager(null);
    };
  }, []);

  useFrame(() => {
    const rm = riftManagerRef.current;
    const cm = corruptionManagerRef.current;
    if (!rm) return;

    const state = useGameStore.getState();
    if (state.gameState !== 'playing') return;

    // Repopulate rift visuals if store was cleared
    if (state.rifts.length === 0 && rm.rifts.some(r => r.state !== RiftState.CLOSED)) {
      state.setRifts(rm.rifts
        .filter(r => r.state !== RiftState.CLOSED)
        .map((r) => ({
          id: r.id, x: r.x, z: r.z,
          state: r.state,
          corruptionProgress: r.corruptionProgress,
          anchorHealth: r.anchorHealth,
        }))
      );
    }

    // Throttle main update to every 2 seconds
    const now = state.worldTime.elapsed;

    if (now < lastUpdateRef.current) {
      lastUpdateRef.current = 0;
      for (const rift of rm.rifts) {
        rift.lastSpawnTime = 0;
      }
    }

    if (now - lastUpdateRef.current < 2) return;
    const delta = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    // Build set of alive monster IDs
    const aliveIds = new Set(state.enemies.map((e) => e.id));

    // ── Normal rift spawns ──
    const spawns = rm.update(now, state.player.position, state.worldTime, aliveIds);

    for (const spawn of spawns) {
      const [sx, , sz] = spawn.position;
      const terrainY = chunkManager ? getSpawnY(chunkManager, sx, sz) : null;
      if (terrainY == null) continue;
      state.addRiftEnemy({
        ...spawn.monsterData,
        position: [sx, terrainY, sz],
        riftId: spawn.riftId,
      });
    }

    // ── Corruption fade for closing rifts ──
    const closingRifts = rm.getClosingRifts();
    if (closingRifts.length > 0 && cm && chunkManager) {
      // Count NPC defenders near closing rifts
      const settlement = state.settlement;
      let npcDefenders = 0;
      if (settlement && settlement.npcs) {
        for (const npc of settlement.npcs) {
          if (npc.state === 'IDLE' || npc.state === 'WANDERING') {
            for (const rift of closingRifts) {
              const dx = (npc.position?.[0] || 0) - rift.x;
              const dz = (npc.position?.[2] || 0) - rift.z;
              if (Math.sqrt(dx * dx + dz * dz) < 32) {
                npcDefenders++;
                break;
              }
            }
          }
        }
      }

      const fadeResult = cm.update(
        delta, closingRifts, chunkManager, rm,
        state.player.position, npcDefenders
      );

      // Drop void shards
      if (fadeResult.shardsDropped > 0) {
        state.addMaterial('void_shard', fadeResult.shardsDropped);
      }

      // Close fully purified rifts
      for (const riftId of fadeResult.fullyPurified) {
        rm.closeRift(riftId);
        if (window.addNotification) {
          window.addNotification({
            type: 'success',
            title: 'Rift Closed!',
            message: 'A rift has been permanently sealed!',
          });
        }
      }

      // ── Reinforcement waves ──
      for (const rift of closingRifts) {
        const reinforcements = rm.getReinforcementSpawns(rift, now);
        for (const spawn of reinforcements) {
          const [sx, , sz] = spawn.position;
          const terrainY = chunkManager ? getSpawnY(chunkManager, sx, sz) : null;
          if (terrainY == null) continue;
          state.addRiftEnemy({
            ...spawn.monsterData,
            position: [sx, terrainY, sz],
            riftId: spawn.riftId,
            targetPosition: spawn.targetPosition, // Anchor position
          });
        }
      }
    }

    // ── Check for enemy anchor attacks ──
    for (const rift of closingRifts) {
      for (const enemy of state.enemies) {
        if (!enemy.targetPosition) continue;
        const dx = enemy.position[0] - rift.x;
        const dz = enemy.position[2] - rift.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 3) {
          const { destroyed } = rm.damageAnchor(rift.id);
          if (destroyed) {
            if (window.addNotification) {
              window.addNotification({
                type: 'error',
                title: 'Anchor Destroyed!',
                message: 'The purification anchor was destroyed. The rift is wounded but not lost.',
              });
            }
          }
        }
      }
    }

    // ── Sync rift state to store for rendering ──
    state.setRifts(rm.rifts
      .filter(r => r.state !== RiftState.CLOSED)
      .map((r) => ({
        id: r.id, x: r.x, z: r.z,
        state: r.state,
        corruptionProgress: r.corruptionProgress,
        anchorHealth: r.anchorHealth,
      }))
    );
  });

  return null;
};

export default RiftController;
