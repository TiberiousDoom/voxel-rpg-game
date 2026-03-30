/**
 * TaskAssignmentEngine — Ephemeral task registry for NPC work.
 *
 * Module-level singleton Map<taskId, Task> — NOT stored in Zustand.
 * Rebuilt from zone/construction state every WORK_SCAN_INTERVAL.
 *
 * Task types: MINE, HAUL, BUILD
 */

import {
  NPC_SKILL_WEIGHT,
  NPC_DISTANCE_WEIGHT,
  NPC_PRIORITY_WEIGHT,
  NPC_JOB_PREF_BONUS,
} from '../../data/tuning';

// ── Task Registry (module-level singleton) ──
const _tasks = new Map();
let _nextTaskId = 0;

function makeTaskId() {
  return `task_${++_nextTaskId}`;
}

// ── Skill mapping ──
const TASK_SKILL = {
  MINE: 'mining',
  HAUL: 'gathering',
  BUILD: 'building',
};

const TASK_JOB = {
  MINE: 'miner',
  HAUL: 'gatherer',
  BUILD: 'builder',
};

/**
 * Rebuild the task list from current zone + construction state.
 */
export function scanForTasks(zones, constructionSites, chunkManager) {
  // Keep track of existing claimed tasks so we don't lose assignments
  const claimedTasks = new Map();
  for (const [id, task] of _tasks) {
    if (task.claimedBy) {
      claimedTasks.set(taskKey(task), { id, claimedBy: task.claimedBy });
    }
  }

  _tasks.clear();

  // ── MINE tasks: from MINING zones' miningTasks with status 'pending' ──
  for (const zone of zones) {
    if (zone.type !== 'MINING' || !zone.miningTasks) continue;
    for (let i = 0; i < zone.miningTasks.length; i++) {
      const mt = zone.miningTasks[i];
      if (mt.status !== 'pending') continue;
      // Verify block still exists
      if (chunkManager) {
        const block = chunkManager.getBlock(mt.wx, mt.wy, mt.wz);
        if (!block || block === 0) continue; // AIR = 0
      }
      const key = `MINE:${mt.wx},${mt.wy},${mt.wz}`;
      const existing = claimedTasks.get(key);
      const id = existing ? existing.id : makeTaskId();
      _tasks.set(id, {
        id,
        type: 'MINE',
        zoneId: zone.id,
        siteId: null,
        position: [mt.wx, mt.wy, mt.wz],
        blockType: mt.blockType,
        material: null,
        amount: 0,
        claimedBy: existing ? existing.claimedBy : null,
        priority: 1,
        _miningTaskIndex: i,
      });
    }
  }

  // ── HAUL tasks: construction sites needing materials from stockpiles ──
  const stockpiles = zones.filter(z => z.type === 'STOCKPILE' && z.storage);
  for (const site of constructionSites) {
    if (site.status !== 'PLACED') continue;
    for (const [mat, required] of Object.entries(site.materialsRequired)) {
      const delivered = site.materialsDelivered[mat] || 0;
      const needed = required - delivered;
      if (needed <= 0) continue;
      // Check if any stockpile has this material
      let sourceZone = null;
      let available = 0;
      for (const sp of stockpiles) {
        const stored = sp.storage.items[mat] || 0;
        if (stored > 0) {
          sourceZone = sp;
          available = stored;
          break;
        }
      }
      if (!sourceZone) continue;
      const amount = Math.min(needed, available);
      const cx = (sourceZone.bounds.minX + sourceZone.bounds.maxX) / 2;
      const cz = (sourceZone.bounds.minZ + sourceZone.bounds.maxZ) / 2;
      const key = `HAUL:${site.id}:${mat}`;
      const existing = claimedTasks.get(key);
      const id = existing ? existing.id : makeTaskId();
      _tasks.set(id, {
        id,
        type: 'HAUL',
        zoneId: sourceZone.id,
        siteId: site.id,
        position: [cx, site.position[1], cz],
        blockType: null,
        material: mat,
        amount,
        claimedBy: existing ? existing.claimedBy : null,
        priority: 2,
        _sitePosition: site.position,
      });
    }
  }

  // ── BUILD tasks: construction sites in BUILDING status ──
  for (const site of constructionSites) {
    if (site.status !== 'BUILDING') continue;
    const key = `BUILD:${site.id}`;
    const existing = claimedTasks.get(key);
    const id = existing ? existing.id : makeTaskId();
    _tasks.set(id, {
      id,
      type: 'BUILD',
      zoneId: null,
      siteId: site.id,
      position: [...site.position],
      blockType: null,
      material: null,
      amount: 0,
      claimedBy: existing ? existing.claimedBy : null,
      priority: 3,
    });
  }
}

/** Generate a dedup key for preserving claims across scans */
function taskKey(task) {
  if (task.type === 'MINE') return `MINE:${task.position[0]},${task.position[1]},${task.position[2]}`;
  if (task.type === 'HAUL') return `HAUL:${task.siteId}:${task.material}`;
  if (task.type === 'BUILD') return `BUILD:${task.siteId}`;
  return task.id;
}

/**
 * Score and return the best unclaimed task for an NPC.
 */
export function findBestTask(npc) {
  let bestTask = null;
  let bestScore = -Infinity;

  const npcPos = npc.position || [0, 0, 0];
  const npcSkills = npc.skills || {};
  const npcJob = npc.preferredJob || '';

  for (const task of _tasks.values()) {
    if (task.claimedBy) continue;

    const requiredSkill = TASK_SKILL[task.type] || 'gathering';
    const skillMatch = npcSkills[requiredSkill] || 0.3;
    const jobPrefMatch = TASK_JOB[task.type] === npcJob;

    const dx = (task.position[0] || 0) - (npcPos[0] || 0);
    const dz = (task.position[2] || 0) - (npcPos[2] || 0);
    const distance = Math.sqrt(dx * dx + dz * dz);

    const score =
      skillMatch * NPC_SKILL_WEIGHT +
      task.priority * NPC_PRIORITY_WEIGHT -
      distance * NPC_DISTANCE_WEIGHT +
      (jobPrefMatch ? NPC_JOB_PREF_BONUS : 0);

    if (score > bestScore) {
      bestScore = score;
      bestTask = task;
    }
  }

  return bestTask;
}

/**
 * Atomic claim. Returns true if successful.
 */
export function claimTask(taskId, npcId) {
  const task = _tasks.get(taskId);
  if (!task || task.claimedBy) return false;
  task.claimedBy = npcId;
  return true;
}

/**
 * Release a task claim (for interrupts).
 */
export function releaseTask(taskId) {
  const task = _tasks.get(taskId);
  if (task) task.claimedBy = null;
}

/**
 * Complete and remove a task.
 */
export function completeTask(taskId) {
  _tasks.delete(taskId);
}

/**
 * Look up a task by ID.
 */
export function getTask(taskId) {
  return _tasks.get(taskId) || null;
}

/**
 * Check if a construction site has an NPC working BUILD on it.
 */
export function siteHasNPCBuilder(siteId) {
  for (const task of _tasks.values()) {
    if (task.type === 'BUILD' && task.siteId === siteId && task.claimedBy) {
      return true;
    }
  }
  return false;
}
