/**
 * SettlementTick — Invisible tick component (returns null) that drives
 * campfire detection, attractiveness recalculation, immigration spawning,
 * NPC needs/state updates, and NPC work loop.
 *
 * Also provides a SettlementBridge hook for the SettlementModule's
 * tickSettlementCore to sync results back to the Zustand store.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';
import SettlementBridge from '../../modules/settlement/SettlementBridge';
import { BlockTypes } from '../../systems/chunks/blockTypes';
import { CHUNK_SIZE, CHUNK_SIZE_Y, VOXEL_SIZE } from '../../systems/chunks/coordinates';
import { calculateAttractiveness } from '../../systems/settlement/AttractivenessCalculator';
import { generateNPCIdentity } from '../../data/npcIdentity';
import { calculateDrops } from '../../data/blockDrops';
import { scanMiningZone } from '../../systems/settlement/MiningZoneScanner';
import {
  scanForTasks,
  findBestTask,
  claimTask,
  releaseTask,
  completeTask,
  getTask,
} from '../../systems/settlement/TaskAssignmentEngine';
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
  WORK_SCAN_INTERVAL,
  NPC_MINE_DURATION,
  NPC_BUILD_DURATION,
  NPC_WORK_RANGE,
  NPC_MINE_TOOL_TIER,
  NPC_THOUGHT_DURATION,
  NPC_SKILL_GROWTH,
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

// Helper: handle needs interrupt for working NPCs
function checkNeedsInterrupt(npc, newHunger, newRest, updates, store) {
  if (newHunger < NPC_HUNGER_CRITICAL) {
    // Try to find food
    let consumed = false;
    for (const zone of store.zones) {
      if (zone.type !== 'STOCKPILE' || !zone.storage) continue;
      for (const foodSrc of NPC_FOOD_SOURCES) {
        if ((zone.storage.items[foodSrc.material] || 0) > 0) {
          store.consumeFromStockpile(zone.id, foodSrc.material, 1);
          updates.savedTaskId = npc.currentTaskId;
          updates.savedWorkTimer = npc.workTimer || 0;
          updates.savedHaulPhase = npc.haulPhase || null;
          updates.savedCarryingItem = npc.carryingItem || null;
          if (npc.currentTaskId) releaseTask(npc.currentTaskId);
          updates.currentTaskId = null;
          updates.state = 'EATING';
          updates.stateTimer = 0;
          updates.eatingRestore = foodSrc.restore;
          updates.workTimer = 0;
          updates.targetPosition = null;
          updates.thoughtBubble = { type: 'hungry', timer: NPC_THOUGHT_DURATION };
          consumed = true;
          break;
        }
      }
      if (consumed) break;
    }
    if (!consumed) {
      // Try player inventory
      const mats = store.inventory?.materials;
      if (mats) {
        for (const src of NPC_FOOD_SOURCES) {
          if ((mats[src.material] || 0) >= 1) {
            store.removeMaterial(src.material, 1);
            updates.savedTaskId = npc.currentTaskId;
            updates.savedWorkTimer = npc.workTimer || 0;
            updates.savedHaulPhase = npc.haulPhase || null;
            updates.savedCarryingItem = npc.carryingItem || null;
            if (npc.currentTaskId) releaseTask(npc.currentTaskId);
            updates.currentTaskId = null;
            updates.state = 'EATING';
            updates.stateTimer = 0;
            updates.eatingRestore = src.restore;
            updates.workTimer = 0;
            updates.targetPosition = null;
            updates.thoughtBubble = { type: 'hungry', timer: NPC_THOUGHT_DURATION };
            consumed = true;
            break;
          }
        }
      }
    }
    return consumed;
  }
  if (newRest < NPC_REST_CRITICAL) {
    updates.savedTaskId = npc.currentTaskId;
    updates.savedWorkTimer = npc.workTimer || 0;
    updates.savedHaulPhase = npc.haulPhase || null;
    updates.savedCarryingItem = npc.carryingItem || null;
    if (npc.currentTaskId) releaseTask(npc.currentTaskId);
    updates.currentTaskId = null;
    updates.state = 'SLEEPING';
    updates.stateTimer = 0;
    updates.workTimer = 0;
    updates.targetPosition = null;
    updates.thoughtBubble = { type: 'sleeping', timer: NPC_THOUGHT_DURATION };
    return true;
  }
  return false;
}

// Helper: try to resume saved task after needs satisfied
function tryResumeTask(npc, updates) {
  const savedId = npc.savedTaskId;
  if (!savedId) return;

  const task = getTask(savedId);
  if (task && !task.claimedBy) {
    if (claimTask(savedId, npc.id)) {
      const workState = task.type === 'MINE' ? 'WORKING_MINE'
        : task.type === 'HAUL' ? 'WORKING_HAUL'
        : 'WORKING_BUILD';
      updates.state = workState;
      updates.stateTimer = 0;
      updates.currentTaskId = savedId;
      updates.workTimer = npc.savedWorkTimer || 0;
      updates.targetPosition = [...task.position];
      // Restore haul state
      if (task.type === 'HAUL' && npc.savedHaulPhase) {
        updates.haulPhase = npc.savedHaulPhase;
        updates.carryingItem = npc.savedCarryingItem || null;
        if (npc.savedHaulPhase === 'deliver' && task._sitePosition) {
          updates.targetPosition = [...task._sitePosition];
        }
      }
      const thoughtType = task.type === 'MINE' ? 'mining' : task.type === 'HAUL' ? 'hauling' : 'building';
      updates.thoughtBubble = { type: thoughtType, timer: NPC_THOUGHT_DURATION };
    }
  }
  updates.savedTaskId = null;
  updates.savedWorkTimer = 0;
  updates.savedHaulPhase = null;
  updates.savedCarryingItem = null;
}

export default function SettlementTick({ chunkManager }) {
  const bridgeRef = useRef(null);

  // Create bridge once, connected to the settlement module
  useEffect(() => {
    const module = useGameStore.getState()._settlementModule;
    if (module) {
      bridgeRef.current = new SettlementBridge(module);
    }
  }, []);

  // Update chunk adapter when chunkManager changes
  useEffect(() => {
    if (bridgeRef.current && chunkManager) {
      bridgeRef.current.setChunkAdapter(chunkManager);
    }
  }, [chunkManager]);

  const campfireCheckAccum = useRef(0);
  const campfireScanIdx = useRef(0);
  const attractAccum = useRef(0);
  const immigrationAccum = useRef(0);
  const needsAccum = useRef(0);
  const workScanAccum = useRef(0);

  useFrame((_, delta) => {
    if (!chunkManager) return;

    const store = useGameStore.getState();
    if (store.gameState !== 'playing') return;

    // If the settlement module + bridge are available, run the module tick
    const module = store._settlementModule;
    if (module && bridgeRef.current) {
      const snapshot = bridgeRef.current.getGameState();
      const results = module.tickSettlementCore(delta, snapshot);
      bridgeRef.current.syncToStore(results);
    }

    const settlement = store.settlement;
    if (!settlement) return;

    // ── 1. Campfire detection ──
    campfireCheckAccum.current += delta;
    if (!settlement.settlementCenter) {
      // Clear stale warning set from previous game sessions
      if (_warnedNPCs.size > 0) _warnedNPCs.clear();

      if (campfireCheckAccum.current >= 2) {
        campfireCheckAccum.current = 0;

        // Scan one chunk per interval to amortize cost
        const chunkEntries = Array.from(chunkManager.chunks.values());
        const scanIdx = campfireScanIdx.current % chunkEntries.length;
        campfireScanIdx.current = scanIdx + 1;
        const chunk = chunkEntries[scanIdx];
        if (chunk?.blocks) {
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

    // ── 3b. Work task scan ──
    workScanAccum.current += delta;
    if (workScanAccum.current >= WORK_SCAN_INTERVAL) {
      workScanAccum.current = 0;
      scanForTasks(store.zones, store.constructionSites, chunkManager);
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
      let anyTaskCompleted = false;

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

        // Tick thought bubble timer
        if (npc.thoughtBubble) {
          const newTimer = (npc.thoughtBubble.timer || 0) - tickDelta;
          if (newTimer <= 0) {
            updates.thoughtBubble = null;
          } else {
            updates.thoughtBubble = { ...npc.thoughtBubble, timer: newTimer };
          }
        }

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
            if (npc.currentTaskId) releaseTask(npc.currentTaskId);
            updates.currentTaskId = null;
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
            // 1) Critical needs first
            if (newHunger < NPC_HUNGER_CRITICAL) {
              let consumed = false;

              // Try stockpile food first
              for (const zone of store.zones) {
                if (zone.type !== 'STOCKPILE' || !zone.storage) continue;
                for (const foodSrc of NPC_FOOD_SOURCES) {
                  if ((zone.storage.items[foodSrc.material] || 0) > 0) {
                    store.consumeFromStockpile(zone.id, foodSrc.material, 1);
                    updates.state = 'EATING';
                    updates.stateTimer = 0;
                    updates.eatingRestore = foodSrc.restore;
                    updates.thoughtBubble = { type: 'hungry', timer: NPC_THOUGHT_DURATION };
                    consumed = true;
                    break;
                  }
                }
                if (consumed) break;
              }

              // Fall back to player inventory if no stockpile food
              if (!consumed) {
                const mats = store.inventory?.materials;
                if (mats) {
                  for (const src of NPC_FOOD_SOURCES) {
                    if ((mats[src.material] || 0) >= 1) {
                      store.removeMaterial(src.material, 1);
                      updates.state = 'EATING';
                      updates.stateTimer = 0;
                      updates.eatingRestore = src.restore;
                      updates.thoughtBubble = { type: 'hungry', timer: NPC_THOUGHT_DURATION };
                      consumed = true;
                      break;
                    }
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
              updates.thoughtBubble = { type: 'sleeping', timer: NPC_THOUGHT_DURATION };
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
                updates.thoughtBubble = { type: 'socializing', timer: NPC_THOUGHT_DURATION };
              }
            } else {
              // 2) Try to find work
              const task = findBestTask(npc);
              if (task && claimTask(task.id, npc.id)) {
                const workState = task.type === 'MINE' ? 'WORKING_MINE'
                  : task.type === 'HAUL' ? 'WORKING_HAUL'
                  : 'WORKING_BUILD';
                updates.state = workState;
                updates.stateTimer = 0;
                updates.currentTaskId = task.id;
                updates.workTimer = 0;
                updates.targetPosition = [...task.position];
                if (task.type === 'HAUL') {
                  updates.haulPhase = 'pickup';
                  updates.carryingItem = null;
                }
                const thoughtType = task.type === 'MINE' ? 'mining' : task.type === 'HAUL' ? 'hauling' : 'building';
                updates.thoughtBubble = { type: thoughtType, timer: NPC_THOUGHT_DURATION };
              } else if (timer > idleMin + Math.random() * (idleMax - idleMin)) {
                // 3) Random wander if no work found
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
              // Try to resume saved task
              tryResumeTask(npc, updates);
            }
            break;
          }

          case 'SLEEPING':
            updates.rest = Math.min(100, newRest + 8 * tickDelta);
            if (updates.rest >= 80) {
              updates.state = 'IDLE';
              updates.stateTimer = 0;
              // Try to resume saved task
              tryResumeTask(npc, updates);
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

          // ── WORKING_MINE ──
          case 'WORKING_MINE': {
            // Needs interrupt
            if (checkNeedsInterrupt(npc, newHunger, newRest, updates, store)) break;

            const task = getTask(npc.currentTaskId);
            if (!task) {
              // Task gone — return to IDLE
              updates.state = 'IDLE';
              updates.stateTimer = 0;
              updates.currentTaskId = null;
              updates.workTimer = 0;
              updates.targetPosition = null;
              break;
            }

            // Check if at target
            const dx = (task.position[0] || 0) - (npc.position[0] || 0);
            const dz = (task.position[2] || 0) - (npc.position[2] || 0);
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > NPC_WORK_RANGE) {
              // Still walking — SettlerNPC handles movement
              updates.targetPosition = [...task.position];
              break;
            }

            // At target — mine
            const miningSkill = npc.skills?.mining || 0.5;
            const adjustedDuration = NPC_MINE_DURATION / miningSkill;
            const wt = (npc.workTimer || 0) + tickDelta;
            updates.workTimer = wt;

            if (wt >= adjustedDuration) {
              // Mine the block
              const [bx, by, bz] = task.position;
              const blockType = chunkManager.getBlock(bx, by, bz);

              if (blockType && blockType !== 0) {
                chunkManager.setBlock(bx, by, bz, BlockTypes.AIR);

                // Calculate drops
                const drops = calculateDrops(blockType, NPC_MINE_TOOL_TIER);

                // Deposit to nearest stockpile or player inventory
                let deposited = false;
                // Re-read zones fresh to avoid stale capacity from concurrent deposits
                const freshZones = useGameStore.getState().zones;
                for (const zone of freshZones) {
                  if (zone.type !== 'STOCKPILE' || !zone.storage) continue;
                  const spaceLeft = zone.storage.capacity - zone.storage.usedCapacity;
                  if (spaceLeft > 0) {
                    for (const drop of drops) {
                      // Re-read zone each deposit to get latest capacity
                      const freshZone = useGameStore.getState().zones.find(zz => zz.id === zone.id);
                      if (freshZone?.storage) {
                        const newItems = { ...freshZone.storage.items };
                        newItems[drop.material] = (newItems[drop.material] || 0) + drop.amount;
                        store.updateZone(zone.id, {
                          storage: {
                            ...freshZone.storage,
                            items: newItems,
                            usedCapacity: freshZone.storage.usedCapacity + drop.amount,
                          },
                        });
                      }
                    }
                    deposited = true;
                    break;
                  }
                }
                if (!deposited) {
                  // Fallback: add to player inventory
                  for (const drop of drops) {
                    store.addMaterial(drop.material, drop.amount);
                  }
                }
              }

              // Mark mining task as done in zone
              if (task.zoneId) {
                const zone = store.zones.find(z => z.id === task.zoneId);
                if (zone?.miningTasks) {
                  const newTasks = [...zone.miningTasks];
                  if (task._miningTaskIndex !== undefined && newTasks[task._miningTaskIndex]) {
                    newTasks[task._miningTaskIndex] = { ...newTasks[task._miningTaskIndex], status: 'done' };
                  }
                  // Rescan the column for newly exposed blocks
                  const rescanned = scanMiningZone(zone.bounds, chunkManager);
                  // Merge: keep done tasks, add new pending ones
                  const donePositions = new Set(
                    newTasks.filter(t => t.status === 'done').map(t => `${t.wx},${t.wy},${t.wz}`)
                  );
                  const merged = [
                    ...newTasks.filter(t => t.status === 'done'),
                    ...rescanned.filter(t => !donePositions.has(`${t.wx},${t.wy},${t.wz}`)),
                  ];
                  store.updateZone(zone.id, { miningTasks: merged });
                }
              }

              // Complete task, grow skill
              completeTask(npc.currentTaskId);
              anyTaskCompleted = true;
              const newSkills = { ...(npc.skills || {}) };
              newSkills.mining = Math.min(1.0, (newSkills.mining || 0.3) + NPC_SKILL_GROWTH);
              updates.skills = newSkills;
              updates.currentTaskId = null;
              updates.workTimer = 0;
              updates.state = 'IDLE';
              updates.stateTimer = 0;
              updates.targetPosition = null;
            }
            break;
          }

          // ── WORKING_HAUL ──
          case 'WORKING_HAUL': {
            // Needs interrupt
            if (checkNeedsInterrupt(npc, newHunger, newRest, updates, store)) break;

            const task = getTask(npc.currentTaskId);
            if (!task) {
              updates.state = 'IDLE';
              updates.stateTimer = 0;
              updates.currentTaskId = null;
              updates.workTimer = 0;
              updates.carryingItem = null;
              updates.haulPhase = null;
              updates.targetPosition = null;
              break;
            }

            const phase = npc.haulPhase || 'pickup';

            if (phase === 'pickup') {
              // Walk to stockpile
              const dx = (task.position[0] || 0) - (npc.position[0] || 0);
              const dz = (task.position[2] || 0) - (npc.position[2] || 0);
              const dist = Math.sqrt(dx * dx + dz * dz);

              if (dist > NPC_WORK_RANGE) {
                updates.targetPosition = [...task.position];
                break;
              }

              // At stockpile — pick up materials
              const zone = store.zones.find(z => z.id === task.zoneId);
              if (zone?.storage) {
                const stored = zone.storage.items[task.material] || 0;
                const toTake = Math.min(task.amount, stored);
                if (toTake > 0) {
                  store.consumeFromStockpile(zone.id, task.material, toTake);
                  updates.carryingItem = { material: task.material, amount: toTake };
                  updates.haulPhase = 'deliver';
                  if (task._sitePosition) {
                    updates.targetPosition = [...task._sitePosition];
                  }
                } else {
                  // Nothing to pick up — abandon
                  completeTask(npc.currentTaskId);
                  anyTaskCompleted = true;
                  updates.state = 'IDLE';
                  updates.stateTimer = 0;
                  updates.currentTaskId = null;
                  updates.carryingItem = null;
                  updates.haulPhase = null;
                  updates.targetPosition = null;
                }
              }
            } else {
              // deliver phase — walk to construction site
              const sitePos = task._sitePosition || task.position;
              const dx = (sitePos[0] || 0) - (npc.position[0] || 0);
              const dz = (sitePos[2] || 0) - (npc.position[2] || 0);
              const dist = Math.sqrt(dx * dx + dz * dz);

              if (dist > NPC_WORK_RANGE) {
                updates.targetPosition = [sitePos[0], sitePos[1], sitePos[2]];
                break;
              }

              // At site — deliver
              const carrying = npc.carryingItem;
              if (carrying && task.siteId) {
                store.npcDeliverToConstruction(task.siteId, carrying.material, carrying.amount);
              }

              completeTask(npc.currentTaskId);
              anyTaskCompleted = true;
              const newSkills = { ...(npc.skills || {}) };
              newSkills.gathering = Math.min(1.0, (newSkills.gathering || 0.3) + NPC_SKILL_GROWTH);
              updates.skills = newSkills;
              updates.state = 'IDLE';
              updates.stateTimer = 0;
              updates.currentTaskId = null;
              updates.carryingItem = null;
              updates.haulPhase = null;
              updates.workTimer = 0;
              updates.targetPosition = null;
            }
            break;
          }

          // ── WORKING_BUILD ──
          case 'WORKING_BUILD': {
            // Needs interrupt
            if (checkNeedsInterrupt(npc, newHunger, newRest, updates, store)) break;

            const task = getTask(npc.currentTaskId);
            if (!task) {
              updates.state = 'IDLE';
              updates.stateTimer = 0;
              updates.currentTaskId = null;
              updates.workTimer = 0;
              updates.targetPosition = null;
              break;
            }

            // Check site still exists and is BUILDING
            const site = store.constructionSites.find(s => s.id === task.siteId);
            if (!site || site.status === 'COMPLETE') {
              completeTask(npc.currentTaskId);
              anyTaskCompleted = true;
              updates.state = 'IDLE';
              updates.stateTimer = 0;
              updates.currentTaskId = null;
              updates.workTimer = 0;
              updates.targetPosition = null;
              break;
            }

            // Walk to site
            const dx = (task.position[0] || 0) - (npc.position[0] || 0);
            const dz = (task.position[2] || 0) - (npc.position[2] || 0);
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > NPC_WORK_RANGE) {
              updates.targetPosition = [...task.position];
              break;
            }

            if (site.status !== 'BUILDING') {
              // Site not ready yet (still PLACED)
              break;
            }

            // At site and BUILDING — advance construction
            const buildSkill = npc.skills?.building || 0.5;
            const adjustedDuration = NPC_BUILD_DURATION / buildSkill;
            const wt = (npc.workTimer || 0) + tickDelta;
            updates.workTimer = wt;

            if (wt >= adjustedDuration) {
              store.advanceConstruction(site.id);
              updates.workTimer = 0;

              // Check if complete now (use local math — store snapshot is stale after advanceConstruction)
              if (site.blocksPlaced + 1 >= site.totalBlocks) {
                completeTask(npc.currentTaskId);
                anyTaskCompleted = true;
                const newSkills = { ...(npc.skills || {}) };
                newSkills.building = Math.min(1.0, (newSkills.building || 0.3) + NPC_SKILL_GROWTH);
                updates.skills = newSkills;
                updates.state = 'IDLE';
                updates.stateTimer = 0;
                updates.currentTaskId = null;
                updates.targetPosition = null;
                store.addPickupText('Building complete!', '#44ff44');
              }
            }
            break;
          }

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

      // If any NPC completed a task, re-scan immediately so idle NPCs
      // find new work on the next tick instead of waiting for WORK_SCAN_INTERVAL.
      // Must use fresh state since zone miningTasks were updated during this tick.
      if (anyTaskCompleted) {
        const fresh = useGameStore.getState();
        scanForTasks(fresh.zones, fresh.constructionSites, chunkManager);
        workScanAccum.current = 0;
      }

      store.updateSettlementTimestamps({ lastNeedsUpdate: Date.now() });
    }
  });

  return null;
}
