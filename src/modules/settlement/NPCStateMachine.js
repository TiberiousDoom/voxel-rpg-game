/**
 * NPCStateMachine.js — Pure-function NPC needs decay and state machine.
 *
 * Extracted from SettlementTick.jsx. No store access, no side effects.
 * Receives NPC + context, returns updates + notifications.
 */

import {
  NPC_HUNGER_DECAY_RATE,
  NPC_REST_DECAY_RATE,
  NPC_HUNGER_CRITICAL,
  NPC_REST_CRITICAL,
  NPC_WANDER_RADIUS,
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
  IMMIGRATION_THRESHOLD,
  IMMIGRATION_SPAWN_MAX_DIST,
} from '../../data/tuning';

// ── Personality helpers ─────────────────────────────────────

export function getIdleTimerRange(personality) {
  switch (personality) {
    case 'diligent': return [3, 8];
    case 'lazy': return [10, 20];
    case 'curious': return [3, 8];
    default: return [5, 15];
  }
}

export function getWanderRadiusMult(personality) {
  switch (personality) {
    case 'brave': return 2.0;
    case 'cautious': return 0.5;
    default: return 1.0;
  }
}

export function getSocialDecayMult(personality) {
  if (personality === 'stoic') return 0.5;
  return 1.0;
}

export function getPersonalityHappinessBonus(personality) {
  switch (personality) {
    case 'cheerful': return 10;
    case 'grumpy': return -10;
    default: return 0;
  }
}

/**
 * 2D distance between two [x,y,z] positions (ignoring Y).
 * Returns Infinity if either position is missing.
 */
export function getDistance2D(pos, target) {
  if (!pos || !target) return Infinity;
  const dx = pos[0] - target[0];
  const dz = pos[2] - target[2];
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Tick a single NPC's needs and state machine (pure function).
 *
 * @param {Object} npc - Flat NPC object from store.settlement.npcs
 * @param {number} tickDelta - Seconds since last needs tick
 * @param {Object} context
 * @param {number[]} context.center - Settlement center [x, y, z]
 * @param {number} context.attractiveness - Current attractiveness score
 * @param {Object[]} context.npcs - All settlement NPCs (for socializing neighbor search)
 * @param {Object} context.inventory - store.inventory (has .materials)
 * @param {number} context.worldTimeElapsed - store.worldTime.elapsed
 * @param {Set} context.warnedNPCs - Set of NPC ids that have been warned (mutated in place)
 * @returns {{ updates: Object, remove?: boolean, notifications?: Array, consumeFood?: { material: string, qty: number } }}
 */
export function tickNPC(npc, tickDelta, context) {
  const { center, attractiveness, npcs, inventory, worldTimeElapsed, warnedNPCs } = context;
  const notifications = [];

  // ── APPROACHING — check arrival or timeout ──
  if (npc.state === 'APPROACHING') {
    const timer = (npc.stateTimer || 0) + tickDelta;
    const dist = getDistance2D(npc.position, npc.targetPosition);

    // Arrived at settlement
    if (dist < 1.5) {
      return {
        updates: {
          state: 'EVALUATING',
          stateTimer: 0,
          targetPosition: null,
          arrivedAtSettlement: true,
        },
        notifications,
      };
    }

    // Stuck timeout
    if (timer > 60) {
      return {
        updates: {
          state: 'LEAVING',
          stateTimer: 0,
          targetPosition: [
            center[0] + (Math.random() - 0.5) * IMMIGRATION_SPAWN_MAX_DIST * 2,
            center[1],
            center[2] + (Math.random() - 0.5) * IMMIGRATION_SPAWN_MAX_DIST * 2,
          ],
        },
        notifications,
      };
    }
    return { updates: { stateTimer: timer }, notifications };
  }

  // ── LEAVING — check reached edge or timeout ──
  if (npc.state === 'LEAVING') {
    const timer = (npc.stateTimer || 0) + tickDelta;
    const dist = getDistance2D(npc.position, npc.targetPosition);

    // Reached edge or stuck timeout
    if (dist < 3 || timer > 30) {
      return { updates: {}, remove: true, notifications };
    }
    return { updates: { stateTimer: timer }, notifications };
  }

  // ── Settled NPC: decay needs ──
  const updates = {};
  const personality = npc.personality || 'stoic';

  let newHunger = npc.hunger - NPC_HUNGER_DECAY_RATE * tickDelta;
  let newRest = npc.rest - NPC_REST_DECAY_RATE * tickDelta;
  let newSocial = (npc.social ?? 80) - NPC_SOCIAL_DECAY_RATE * getSocialDecayMult(personality) * tickDelta;
  newHunger = Math.max(0, Math.min(100, newHunger));
  newRest = Math.max(0, Math.min(100, newRest));
  newSocial = Math.max(0, Math.min(100, newSocial));
  updates.hunger = newHunger;
  updates.rest = newRest;
  updates.social = newSocial;

  // ── Compute happiness ──
  const happinessBonus = getPersonalityHappinessBonus(personality);
  updates.happiness = Math.max(0, Math.min(100,
    newHunger * 0.35 + newRest * 0.3 + newSocial * 0.2 + 15 + happinessBonus
  ));

  // ── Unhappy day tracking & departure ──
  const dayCheckpoint = npc.dayCheckpoint ?? worldTimeElapsed;
  let unhappyDays = npc.unhappyDays ?? 0;
  let consumeFood = null;

  if (worldTimeElapsed - dayCheckpoint >= DAY_LENGTH_SECONDS) {
    updates.dayCheckpoint = worldTimeElapsed;
    if (updates.happiness < NPC_LEAVE_HAPPINESS_THRESHOLD) {
      unhappyDays++;
    } else {
      unhappyDays = Math.max(0, unhappyDays - 1);
    }
    updates.unhappyDays = unhappyDays;

    // Warning notification (once)
    if (unhappyDays >= NPC_LEAVE_WARNING_DAYS && !warnedNPCs.has(npc.id)) {
      warnedNPCs.add(npc.id);
      notifications.push({
        type: 'warning',
        title: 'Unhappy Settler',
        message: `${npc.fullName} is unhappy and may leave soon!`,
      });
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
      notifications.push({
        type: 'error',
        title: 'Settler Leaving',
        message: `${npc.fullName} has decided to leave your settlement.`,
      });
      warnedNPCs.delete(npc.id);
      return { updates, notifications };
    }
  }

  // Reset warning if happiness recovered
  if (unhappyDays < NPC_LEAVE_WARNING_DAYS) {
    warnedNPCs.delete(npc.id);
  }

  // ── State machine ──
  const timer = (npc.stateTimer || 0) + tickDelta;
  updates.stateTimer = timer;

  switch (npc.state) {
    case 'EVALUATING':
      if (timer >= NPC_EVALUATION_DURATION) {
        const joinThreshold = IMMIGRATION_THRESHOLD;
        if (attractiveness >= joinThreshold) {
          updates.state = 'IDLE';
          updates.stateTimer = 0;
          notifications.push({
            type: 'success',
            title: 'New Settler!',
            message: `${npc.fullName} has joined your settlement!`,
          });
        } else {
          const leaveAngle = Math.random() * Math.PI * 2;
          const leaveDist = IMMIGRATION_SPAWN_MAX_DIST + 20;
          updates.state = 'LEAVING';
          updates.stateTimer = 0;
          updates.targetPosition = [
            center[0] + Math.cos(leaveAngle) * leaveDist,
            center[1],
            center[2] + Math.sin(leaveAngle) * leaveDist,
          ];
          notifications.push({
            type: 'warning',
            title: 'Settler Rejected',
            message: `${npc.fullName} didn't like what they saw and left.`,
          });
        }
      }
      break;

    case 'IDLE': {
      const [idleMin, idleMax] = getIdleTimerRange(personality);
      if (newHunger < NPC_HUNGER_CRITICAL) {
        // Try to consume food from player's stockpile
        const mats = inventory?.materials;
        let consumed = false;
        if (mats) {
          for (const src of NPC_FOOD_SOURCES) {
            if ((mats[src.material] || 0) >= 1) {
              consumeFood = { material: src.material, qty: 1 };
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
          notifications.push({
            type: 'warning',
            title: 'No Food',
            message: `${npc.fullName} is hungry but there's no food!`,
          });
        } else if (consumed) {
          updates._hungryWarned = false;
        }
      } else if (newRest < NPC_REST_CRITICAL) {
        updates.state = 'SLEEPING';
        updates.stateTimer = 0;
      } else if (newSocial < NPC_SOCIAL_CRITICAL && npcs.length > 1) {
        // Find nearest other NPC within 20 world units to socialize with
        let nearestDist = 20;
        let nearestNPC = null;
        for (const other of npcs) {
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

    case 'WANDERING': {
      const wanderDist = getDistance2D(npc.position, npc.targetPosition);
      if (!npc.targetPosition || wanderDist < 1.5 || timer > 15) {
        updates.state = 'IDLE';
        updates.stateTimer = 0;
        updates.targetPosition = null;
      }
      break;
    }

    case 'HAULING':
    case 'BUILDING': {
      // NPC is working on a task. Task progress is managed externally by
      // TaskAssignmentEngine / HaulingManager / ConstructionManager.
      // State machine only handles critical need interrupts.
      if (newHunger < NPC_HUNGER_CRITICAL) {
        const mats = inventory?.materials;
        let consumed = false;
        if (mats) {
          for (const src of NPC_FOOD_SOURCES) {
            if ((mats[src.material] || 0) >= 1) {
              consumeFood = { material: src.material, qty: 1 };
              updates.state = 'EATING';
              updates.stateTimer = 0;
              updates.eatingRestore = src.restore;
              updates.currentJob = null;
              consumed = true;
              break;
            }
          }
        }
        if (!consumed) {
          // No food — revert to IDLE so NPC can warn
          updates.state = 'IDLE';
          updates.stateTimer = 0;
          updates.currentJob = null;
        }
      } else if (newRest < NPC_REST_CRITICAL) {
        updates.state = 'SLEEPING';
        updates.stateTimer = 0;
        updates.currentJob = null;
      }
      // Otherwise stay in work state — task manages sub-state externally
      break;
    }

    default:
      break;
  }

  const result = { updates, notifications };
  if (consumeFood) result.consumeFood = consumeFood;
  return result;
}
