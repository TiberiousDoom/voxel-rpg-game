/**
 * TaskAssignmentEngine.js — Assigns idle settlement NPCs to available work.
 *
 * Scans for tasks from hauling, construction, mining, and farming systems.
 * Scores tasks by priority and distance, then assigns the best task to each
 * idle NPC. Runs on an internal accumulator (every ~3s).
 *
 * Returns assignment descriptors — the bridge applies them as NPC state updates.
 */

const ASSIGN_INTERVAL = 3; // seconds between assignment scans

class TaskAssignmentEngine {
  /**
   * @param {Object} deps
   * @param {Object} deps.haulingManager
   * @param {Object} deps.constructionManager
   * @param {Object} deps.miningBehavior
   * @param {Object} deps.farmingBehavior
   */
  constructor(deps = {}) {
    this.haulingManager = deps.haulingManager || null;
    this.constructionManager = deps.constructionManager || null;
    this.miningBehavior = deps.miningBehavior || null;
    this.farmingBehavior = deps.farmingBehavior || null;

    this._assignAccum = 0;
  }

  /**
   * Tick the assignment engine. Returns an array of assignments to apply.
   *
   * @param {number} deltaSeconds - Frame delta
   * @param {Object[]} npcs - settlement.npcs array from store
   * @param {number[]} center - Settlement center [x, y, z]
   * @returns {Array<{npcId: string, state: string, currentJob: string, targetPosition?: number[]}>}
   */
  update(deltaSeconds, npcs, center) {
    this._assignAccum += deltaSeconds;
    if (this._assignAccum < ASSIGN_INTERVAL) return [];
    this._assignAccum = 0;

    const assignments = [];
    const idleNPCs = npcs.filter(
      (n) => n.state === 'IDLE' && !n.currentJob
    );

    for (const npc of idleNPCs) {
      const task = this._findBestTask(npc, center);
      if (task) {
        assignments.push({ npcId: npc.id, ...task });
      }
    }

    return assignments;
  }

  /**
   * Find the best available task for an NPC.
   * Priority: hauling > building > mining > farming.
   *
   * @param {Object} npc
   * @param {number[]} center
   * @returns {{state: string, currentJob: string, targetPosition?: number[]}|null}
   */
  _findBestTask(npc, center) {
    // Try hauling first (highest priority — keeps construction moving)
    if (this.constructionManager) {
      const activeSites = this.constructionManager.getActiveSites
        ? this.constructionManager.getActiveSites()
        : [];

      for (const site of activeSites) {
        // Check if site needs hauling
        if (site.getBlocksNeedingMaterials && site.getBlocksNeedingMaterials().length > 0) {
          const pos = site.materialDropoff || site.position;
          return {
            state: 'HAULING',
            currentJob: `haul_${site.id}`,
            targetPosition: pos ? [pos.x || pos[0] || 0, pos.y || pos[1] || 0, pos.z || pos[2] || 0] : null,
          };
        }

        // Check if site needs builders
        if (site.getBlocksReadyToBuild && site.getBlocksReadyToBuild().length > 0) {
          const pos = site.position;
          return {
            state: 'BUILDING',
            currentJob: `build_${site.id}`,
            targetPosition: pos ? [pos.x || pos[0] || 0, pos.y || pos[1] || 0, pos.z || pos[2] || 0] : null,
          };
        }
      }
    }

    // No construction tasks available — NPC stays idle (wander logic handles this)
    return null;
  }

  serialize() {
    return {
      assignAccum: this._assignAccum,
    };
  }

  deserialize(state) {
    if (state && state.assignAccum != null) {
      this._assignAccum = state.assignAccum;
    }
  }
}

export default TaskAssignmentEngine;
