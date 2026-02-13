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
  NPC_SOCIAL_DECAY_RATE,
  NPC_SOCIAL_CRITICAL,
  NPC_SOCIAL_RESTORE,
  NPC_SOCIAL_DURATION,
  NPC_EVALUATION_DURATION,
  NPC_EATING_DURATION,
  NPC_FOOD_SOURCES,
  NPC_LEAVE_HAPPINESS_THRESHOLD,
  NPC_LEAVE_WARNING_DAYS,
  NPC_LEAVE_DEPARTURE_DAYS,
  DAY_LENGTH_SECONDS,
} from '../../data/tuning';
import { isSolid } from '../../systems/chunks/blockTypes';

// Monotonic counter for NPC IDs
let _npcIdCounter = 0;

// Track which NPCs have had their departure warning fired (avoid repeat notifications)
const _warnedNPCs = new Set();

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

// Personality-based idle timer range
function getIdleTimerRange(personality) {
  switch (personality) {
    case 'diligent': return [3, 8];
    case 'lazy': return [10, 20];
    case 'curious': return [3, 8];
    default: return [5, 15];
  }
}

// Personality-based wander radius multiplier
function getWanderRadiusMult(personality) {
  switch (personality) {
    case 'brave': return 2.0;
    case 'cautious': return 0.5;
    default: return 1.0;
  }
}

// Personality-based social decay multiplier
function getSocialDecayMult(personality) {
  if (personality === 'stoic') return 0.5;
  return 1.0;
}

// Personality happiness bonus
function getPersonalityHappinessBonus(personality) {
  switch (personality) {
    case 'cheerful': return 10;
    case 'grumpy': return -10;
    default: return 0;
  }
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
      const result = calculateAttractiveness(center, chunkManager, store);
      store.updateSettlementAttractiveness(result.score);
      store.updateSettlementTimestamps({
        lastAttractivenessCalc: Date.now(),
        wallCount: result.wallCount,
      });
    }

    // ── 3. Immigration check ──
    immigrationAccum.current += delta;
    if (immigrationAccum.current >= IMMIGRATION_CHECK_INTERVAL) {
      immigrationAccum.current = 0;
      const npcCount = settlement.npcs.length;
      const threshold = IMMIGRATION_THRESHOLD + npcCount * IMMIGRATION_THRESHOLD_PER_NPC;

      // Housing-based population cap
      const housingSlots = Math.floor((settlement.wallCount || 0) / 25);
      const maxNPCs = Math.min(IMMIGRATION_MAX_NPCS, Math.max(3, housingSlots));

      if (settlement.attractiveness >= threshold && npcCount < maxNPCs) {
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
          social: 80,
          happiness: 65,
          unhappyDays: 0,
          dayCheckpoint: store.worldTime.elapsed,
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

      const worldTimeElapsed = store.worldTime.elapsed;

      // Collect all NPC updates into a single batch to minimize store writes
      const batchUpdates = {};
      const removeIds = [];

      for (const npc of settlement.npcs) {
        // APPROACHING — tick timer; if stuck for 60s, force to LEAVING
        if (npc.state === 'APPROACHING') {
          const timer = (npc.stateTimer || 0) + tickDelta;
          if (timer > 60) {
            batchUpdates[npc.id] = {
              state: 'LEAVING',
              stateTimer: 0,
              targetPosition: [
                center[0] + (Math.random() - 0.5) * IMMIGRATION_SPAWN_MAX_DIST * 2,
                center[1],
                center[2] + (Math.random() - 0.5) * IMMIGRATION_SPAWN_MAX_DIST * 2,
              ],
            };
          } else {
            batchUpdates[npc.id] = { stateTimer: timer };
          }
          continue;
        }
        // LEAVING — tick timer; if stuck for 30s, force-remove
        if (npc.state === 'LEAVING') {
          const timer = (npc.stateTimer || 0) + tickDelta;
          if (timer > 30) {
            removeIds.push(npc.id);
          } else {
            batchUpdates[npc.id] = { stateTimer: timer };
          }
          continue;
        }

        const updates = {};
        const personality = npc.personality || 'stoic';

        // Decay needs
        let newHunger = npc.hunger - NPC_HUNGER_DECAY_RATE * tickDelta;
        let newRest = npc.rest - NPC_REST_DECAY_RATE * tickDelta;
        let newSocial = (npc.social ?? 80) - NPC_SOCIAL_DECAY_RATE * getSocialDecayMult(personality) * tickDelta;
        newHunger = Math.max(0, Math.min(100, newHunger));
        newRest = Math.max(0, Math.min(100, newRest));
        newSocial = Math.max(0, Math.min(100, newSocial));
        updates.hunger = newHunger;
        updates.rest = newRest;
        updates.social = newSocial;

        // Compute happiness
        const happinessBonus = getPersonalityHappinessBonus(personality);
        updates.happiness = Math.max(0, Math.min(100,
          newHunger * 0.35 + newRest * 0.3 + newSocial * 0.2 + 15 + happinessBonus
        ));

        // ── Unhappy day tracking & departure ──
        const dayCheckpoint = npc.dayCheckpoint ?? worldTimeElapsed;
        let unhappyDays = npc.unhappyDays ?? 0;

        // Check if a full in-game day has passed since last checkpoint
        if (worldTimeElapsed - dayCheckpoint >= DAY_LENGTH_SECONDS) {
          updates.dayCheckpoint = worldTimeElapsed;
          if (updates.happiness < NPC_LEAVE_HAPPINESS_THRESHOLD) {
            unhappyDays++;
          } else {
            unhappyDays = Math.max(0, unhappyDays - 1); // recover
          }
          updates.unhappyDays = unhappyDays;

          // Warning notification (once)
          if (unhappyDays >= NPC_LEAVE_WARNING_DAYS && !_warnedNPCs.has(npc.id)) {
            _warnedNPCs.add(npc.id);
            if (window.addNotification) {
              window.addNotification({
                type: 'warning',
                title: 'Unhappy Settler',
                message: `${npc.fullName} is unhappy and may leave soon!`,
              });
            }
          }

          // Departure
          if (unhappyDays >= NPC_LEAVE_DEPARTURE_DAYS) {
            const leaveAngle = Math.random() * Math.PI * 2;
            const leaveDist = IMMIGRATION_SPAWN_MAX_DIST + 20;
            updates.state = 'LEAVING';
            updates.stateTimer = 0;
            updates.targetPosition = [
              center[0] + Math.cos(leaveAngle) * leaveDist,
              center[1],
              center[2] + Math.sin(leaveAngle) * leaveDist,
            ];
            if (window.addNotification) {
              window.addNotification({
                type: 'error',
                title: 'Settler Leaving',
                message: `${npc.fullName} has decided to leave your settlement.`,
              });
            }
            _warnedNPCs.delete(npc.id);
            batchUpdates[npc.id] = updates;
            continue;
          }
        }

        // Reset warning if happiness recovered
        if (unhappyDays < NPC_LEAVE_WARNING_DAYS) {
          _warnedNPCs.delete(npc.id);
        }

        // State machine
        const timer = (npc.stateTimer || 0) + tickDelta;
        updates.stateTimer = timer;

        switch (npc.state) {
          case 'EVALUATING':
            // NPC evaluating settlement — after duration, join or leave
            if (timer >= NPC_EVALUATION_DURATION) {
              // Simple check: if attractiveness > threshold, join
              const joinThreshold = IMMIGRATION_THRESHOLD;
              if (settlement.attractiveness >= joinThreshold) {
                updates.state = 'IDLE';
                updates.stateTimer = 0;
                // Arrival notification
                if (window.addNotification) {
                  window.addNotification({
                    type: 'success',
                    title: 'New Settler!',
                    message: `${npc.fullName} has joined your settlement!`,
                  });
                }
              } else {
                // Rejected — leave
                const leaveAngle = Math.random() * Math.PI * 2;
                const leaveDist = IMMIGRATION_SPAWN_MAX_DIST + 20;
                updates.state = 'LEAVING';
                updates.stateTimer = 0;
                updates.targetPosition = [
                  center[0] + Math.cos(leaveAngle) * leaveDist,
                  center[1],
                  center[2] + Math.sin(leaveAngle) * leaveDist,
                ];
                if (window.addNotification) {
                  window.addNotification({
                    type: 'warning',
                    title: 'Settler Rejected',
                    message: `${npc.fullName} didn't like what they saw and left.`,
                  });
                }
              }
            }
            break;

          case 'IDLE': {
            const [idleMin, idleMax] = getIdleTimerRange(personality);
            if (newHunger < NPC_HUNGER_CRITICAL) {
              // Try to consume food from player's stockpile
              const mats = store.inventory?.materials;
              let consumed = false;
              if (mats) {
                for (const src of NPC_FOOD_SOURCES) {
                  if ((mats[src.material] || 0) >= 1) {
                    store.removeMaterial(src.material, 1);
                    updates.state = 'EATING';
                    updates.stateTimer = 0;
                    updates.eatingRestore = src.restore;
                    consumed = true;
                    break;
                  }
                }
              }
              // No food available — NPC stays IDLE and hungry
              if (!consumed && !npc._hungryWarned) {
                updates._hungryWarned = true;
                if (window.addNotification) {
                  window.addNotification({
                    type: 'warning',
                    title: 'No Food',
                    message: `${npc.fullName} is hungry but there's no food!`,
                  });
                }
              } else if (consumed) {
                updates._hungryWarned = false;
              }
            } else if (newRest < NPC_REST_CRITICAL) {
              updates.state = 'SLEEPING';
              updates.stateTimer = 0;
            } else if (newSocial < NPC_SOCIAL_CRITICAL && settlement.npcs.length > 1) {
              // Find nearest other NPC within 20 world units to socialize with
              let nearestDist = 20;
              let nearestNPC = null;
              for (const other of settlement.npcs) {
                if (other.id === npc.id || other.state === 'APPROACHING' || other.state === 'LEAVING') continue;
                const dx = (other.position[0] || 0) - (npc.position[0] || 0);
                const dz = (other.position[2] || 0) - (npc.position[2] || 0);
                const d = Math.sqrt(dx * dx + dz * dz);
                if (d < nearestDist) {
                  nearestDist = d;
                  nearestNPC = other;
                }
              }
              if (nearestNPC) {
                updates.state = 'SOCIALIZING';
                updates.stateTimer = 0;
                updates.targetPosition = [...nearestNPC.position];
              }
            } else if (timer > idleMin + Math.random() * (idleMax - idleMin)) {
              // Random wander
              updates.state = 'WANDERING';
              updates.stateTimer = 0;
              const wanderAngle = Math.random() * Math.PI * 2;
              const wanderMult = getWanderRadiusMult(personality);
              const wanderDist = Math.random() * NPC_WANDER_RADIUS * wanderMult;
              updates.targetPosition = [
                center[0] + Math.cos(wanderAngle) * wanderDist,
                center[1],
                center[2] + Math.sin(wanderAngle) * wanderDist,
              ];
            }
            break;
          }

          case 'EATING': {
            // Restore hunger over NPC_EATING_DURATION using consumed food value
            const restoreTotal = npc.eatingRestore || 10;
            const restoreRate = restoreTotal / NPC_EATING_DURATION;
            updates.hunger = Math.min(100, newHunger + restoreRate * tickDelta);
            if (timer >= NPC_EATING_DURATION) {
              updates.state = 'IDLE';
              updates.stateTimer = 0;
              updates.eatingRestore = 0;
            }
            break;
          }

          case 'SLEEPING':
            updates.rest = Math.min(100, newRest + 8 * tickDelta);
            if (updates.rest >= 80) {
              updates.state = 'IDLE';
              updates.stateTimer = 0;
            }
            break;

          case 'SOCIALIZING':
            updates.social = Math.min(100, newSocial + (NPC_SOCIAL_RESTORE / NPC_SOCIAL_DURATION) * tickDelta);
            if (timer >= NPC_SOCIAL_DURATION) {
              updates.state = 'IDLE';
              updates.stateTimer = 0;
              updates.targetPosition = null;
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

        batchUpdates[npc.id] = updates;
      }

      // Single store write for all NPC updates
      if (Object.keys(batchUpdates).length > 0) {
        store.batchUpdateSettlementNPCs(batchUpdates);
      }
      // Remove departed NPCs
      for (const id of removeIds) {
        store.removeSettlementNPC(id);
      }

      store.updateSettlementTimestamps({ lastNeedsUpdate: Date.now() });
    }
  });

  return null;
}
