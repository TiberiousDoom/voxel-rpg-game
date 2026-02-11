/**
 * SettlementTick — Invisible tick component (returns null) that drives
 * campfire detection, attractiveness recalculation, immigration spawning,
 * and NPC needs/state updates.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';
import { BlockTypes } from '../../systems/chunks/blockTypes';
import { CHUNK_SIZE, CHUNK_SIZE_Y, VOXEL_SIZE } from '../../systems/chunks/coordinates';
import { calculateAttractiveness } from '../../systems/settlement/AttractivenessCalculator';
import { generateNPCIdentity } from '../../data/npcIdentity';
import {
  ATTRACT_RECALC_INTERVAL,
  IMMIGRATION_CHECK_INTERVAL,
  IMMIGRATION_THRESHOLD,
  IMMIGRATION_THRESHOLD_PER_NPC,
  IMMIGRATION_SPAWN_MIN_DIST,
  IMMIGRATION_SPAWN_MAX_DIST,
  IMMIGRATION_MAX_NPCS,
  NPC_HUNGER_DECAY_RATE,
  NPC_REST_DECAY_RATE,
  NPC_HUNGER_CRITICAL,
  NPC_REST_CRITICAL,
  NPC_WANDER_RADIUS,
  NPC_NEEDS_TICK_INTERVAL,
} from '../../data/tuning';
import { isSolid } from '../../systems/chunks/blockTypes';

// Monotonic counter for NPC IDs
let _npcIdCounter = 0;

function getTerrainYAt(chunkManager, wx, wz) {
  if (!chunkManager) return 10;
  for (let vy = CHUNK_SIZE_Y - 1; vy >= 0; vy--) {
    const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
    const block = chunkManager.getBlock(wx, worldY, wz);
    if (isSolid(block)) {
      return (vy + 1) * VOXEL_SIZE;
    }
  }
  return 2;
}

export default function SettlementTick({ chunkManager }) {
  const campfireCheckAccum = useRef(0);
  const attractAccum = useRef(0);
  const immigrationAccum = useRef(0);
  const needsAccum = useRef(0);

  useFrame((_, delta) => {
    if (!chunkManager) return;

    const store = useGameStore.getState();
    if (store.gameState !== 'playing') return;

    const settlement = store.settlement;

    // ── 1. Campfire detection (every 5s, until center is found) ──
    if (!settlement.settlementCenter) {
      campfireCheckAccum.current += delta;
      if (campfireCheckAccum.current >= 5) {
        campfireCheckAccum.current = 0;

        // Scan loaded chunks for any CAMPFIRE block
        for (const [, chunk] of chunkManager.chunks) {
          if (!chunk.blocks) continue;
          for (let y = 0; y < CHUNK_SIZE_Y; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
              for (let x = 0; x < CHUNK_SIZE; x++) {
                if (chunk.blocks[x + (z << 4) + (y << 8)] === BlockTypes.CAMPFIRE) {
                  const wx = (chunk.x * CHUNK_SIZE + x) * VOXEL_SIZE + VOXEL_SIZE / 2;
                  const wy = y * VOXEL_SIZE + VOXEL_SIZE / 2;
                  const wz = (chunk.z * CHUNK_SIZE + z) * VOXEL_SIZE + VOXEL_SIZE / 2;
                  store.setSettlementCenter([wx, wy, wz]);
                  return; // Early exit this frame
                }
              }
            }
          }
        }
      }
      return; // No center yet — skip other ticks
    }

    const center = settlement.settlementCenter;

    // ── 2. Attractiveness recalc ──
    attractAccum.current += delta;
    if (attractAccum.current >= ATTRACT_RECALC_INTERVAL) {
      attractAccum.current = 0;
      const score = calculateAttractiveness(center, chunkManager, store);
      store.updateSettlementAttractiveness(score);
      store.updateSettlementTimestamps({ lastAttractivenessCalc: Date.now() });
    }

    // ── 3. Immigration check ──
    immigrationAccum.current += delta;
    if (immigrationAccum.current >= IMMIGRATION_CHECK_INTERVAL) {
      immigrationAccum.current = 0;
      const npcCount = settlement.npcs.length;
      const threshold = IMMIGRATION_THRESHOLD + npcCount * IMMIGRATION_THRESHOLD_PER_NPC;

      if (settlement.attractiveness >= threshold && npcCount < IMMIGRATION_MAX_NPCS) {
        // Spawn immigrant
        const angle = Math.random() * Math.PI * 2;
        const dist = IMMIGRATION_SPAWN_MIN_DIST +
          Math.random() * (IMMIGRATION_SPAWN_MAX_DIST - IMMIGRATION_SPAWN_MIN_DIST);
        const spawnX = center[0] + Math.cos(angle) * dist;
        const spawnZ = center[2] + Math.sin(angle) * dist;
        const spawnY = getTerrainYAt(chunkManager, spawnX, spawnZ);

        const seed = Date.now() ^ (++_npcIdCounter * 2654435761);
        const identity = generateNPCIdentity(seed);

        const npc = {
          id: `npc_${Date.now()}_${_npcIdCounter}`,
          ...identity,
          position: [spawnX, spawnY, spawnZ],
          targetPosition: [...center],
          facingAngle: 0,
          state: 'APPROACHING',
          stateTimer: 0,
          hunger: 80,
          rest: 80,
          currentJob: null,
          arrivedAtSettlement: false,
        };

        store.addSettlementNPC(npc);
        store.updateSettlementTimestamps({ lastImmigrationCheck: Date.now() });
      }
    }

    // ── 4. NPC needs update ──
    needsAccum.current += delta;
    if (needsAccum.current >= NPC_NEEDS_TICK_INTERVAL) {
      const tickDelta = needsAccum.current;
      needsAccum.current = 0;

      for (const npc of settlement.npcs) {
        // Skip NPCs still approaching
        if (npc.state === 'APPROACHING') continue;

        const updates = {};
        let newHunger = npc.hunger - NPC_HUNGER_DECAY_RATE * tickDelta;
        let newRest = npc.rest - NPC_REST_DECAY_RATE * tickDelta;
        newHunger = Math.max(0, Math.min(100, newHunger));
        newRest = Math.max(0, Math.min(100, newRest));
        updates.hunger = newHunger;
        updates.rest = newRest;

        // State machine
        const timer = (npc.stateTimer || 0) + tickDelta;
        updates.stateTimer = timer;

        switch (npc.state) {
          case 'IDLE':
            if (newHunger < NPC_HUNGER_CRITICAL) {
              updates.state = 'EATING';
              updates.stateTimer = 0;
            } else if (newRest < NPC_REST_CRITICAL) {
              updates.state = 'SLEEPING';
              updates.stateTimer = 0;
            } else if (timer > 5 + Math.random() * 10) {
              // Random wander
              updates.state = 'WANDERING';
              updates.stateTimer = 0;
              const wanderAngle = Math.random() * Math.PI * 2;
              const wanderDist = Math.random() * NPC_WANDER_RADIUS;
              updates.targetPosition = [
                center[0] + Math.cos(wanderAngle) * wanderDist,
                center[1],
                center[2] + Math.sin(wanderAngle) * wanderDist,
              ];
            }
            break;

          case 'EATING':
            updates.hunger = Math.min(100, newHunger + 5 * tickDelta);
            if (updates.hunger >= 80) {
              updates.state = 'IDLE';
              updates.stateTimer = 0;
            }
            break;

          case 'SLEEPING':
            updates.rest = Math.min(100, newRest + 8 * tickDelta);
            if (updates.rest >= 80) {
              updates.state = 'IDLE';
              updates.stateTimer = 0;
            }
            break;

          case 'WANDERING':
            // SettlerNPC component handles movement; when target is reached it sets IDLE
            if (!npc.targetPosition || timer > 15) {
              updates.state = 'IDLE';
              updates.stateTimer = 0;
              updates.targetPosition = null;
            }
            break;

          default:
            break;
        }

        store.updateSettlementNPC(npc.id, updates);
      }

      store.updateSettlementTimestamps({ lastNeedsUpdate: Date.now() });
    }
  });

  return null;
}
