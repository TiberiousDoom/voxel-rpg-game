/**
 * VoxelIdleTasks.js - Voxel work integration with idle task system
 *
 * Provides idle task types for voxel work, allowing NPCs to
 * automatically pick up mining, hauling, and building tasks
 * when they have nothing else to do.
 *
 * Part of Phase 18: Connect NPC AI to Building System
 */

/**
 * Voxel idle task types for integration with IdleTaskManager
 */
export const VoxelIdleTaskType = {
  VOXEL_MINE: 'VOXEL_MINE',
  VOXEL_HAUL: 'VOXEL_HAUL',
  VOXEL_BUILD: 'VOXEL_BUILD'
};

/**
 * Voxel idle task definitions
 * Compatible with IdleTaskManager format
 */
export const VOXEL_IDLE_TASKS = {
  [VoxelIdleTaskType.VOXEL_MINE]: {
    type: VoxelIdleTaskType.VOXEL_MINE,
    name: 'Mine Block',
    description: 'Mine a designated block',
    duration: { min: 10, max: 60 }, // Variable based on block hardness
    effects: {
      happiness: 0.2,
      fatigue: 5,
      skillGain: { terrain_work: 0.5 }
    },
    requirements: {
      minSkill: { terrain_work: 0 },
      needsTarget: true
    },
    priority: 60
  },

  [VoxelIdleTaskType.VOXEL_HAUL]: {
    type: VoxelIdleTaskType.VOXEL_HAUL,
    name: 'Haul Resources',
    description: 'Transport resources to stockpile',
    duration: { min: 5, max: 30 },
    effects: {
      happiness: 0.1,
      fatigue: 3,
      skillGain: { general: 0.2 }
    },
    requirements: {
      minSkill: { general: 0 },
      needsTarget: true
    },
    priority: 55
  },

  [VoxelIdleTaskType.VOXEL_BUILD]: {
    type: VoxelIdleTaskType.VOXEL_BUILD,
    name: 'Build Structure',
    description: 'Work on construction site',
    duration: { min: 15, max: 90 },
    effects: {
      happiness: 0.5,
      fatigue: 4,
      skillGain: { crafting: 0.5, general: 0.2 }
    },
    requirements: {
      minSkill: { crafting: 0 },
      needsTarget: true
    },
    priority: 65
  }
};

/**
 * VoxelIdleTaskProvider - Provides voxel tasks to idle NPCs
 */
export class VoxelIdleTaskProvider {
  /**
   * Create provider
   * @param {object} config - Configuration
   */
  constructor(config = {}) {
    this.voxelOrchestrator = config.voxelOrchestrator || null;
    this.voxelWorkerBehavior = config.voxelWorkerBehavior || null;
    this.enabled = true;
  }

  /**
   * Set references
   * @param {object} refs - External references
   */
  setReferences(refs) {
    if (refs.voxelOrchestrator) this.voxelOrchestrator = refs.voxelOrchestrator;
    if (refs.voxelWorkerBehavior) this.voxelWorkerBehavior = refs.voxelWorkerBehavior;
  }

  /**
   * Check if voxel work is available for an NPC
   * @param {object} npc - NPC object
   * @returns {object|null} Task definition if available
   */
  getAvailableTask(npc) {
    if (!this.enabled || !this.voxelOrchestrator) {
      return null;
    }

    const position = npc.position;

    // Check for mining tasks first (usually most pressing)
    const miningTask = this._checkMiningTasks(npc, position);
    if (miningTask) return miningTask;

    // Check for hauling tasks
    const haulingTask = this._checkHaulingTasks(npc, position);
    if (haulingTask) return haulingTask;

    // Check for building tasks
    const buildingTask = this._checkBuildingTasks(npc, position);
    if (buildingTask) return buildingTask;

    return null;
  }

  /**
   * Check for available mining tasks
   * @private
   */
  _checkMiningTasks(npc, position) {
    const gatheringManager = this.voxelOrchestrator.gatheringManager;
    if (!gatheringManager) return null;

    const task = gatheringManager.getAvailableTask(npc.id, position);
    if (!task) return null;

    return {
      ...VOXEL_IDLE_TASKS[VoxelIdleTaskType.VOXEL_MINE],
      targetTask: task,
      targetPosition: task.position,
      estimatedDuration: task.totalMiningTime
    };
  }

  /**
   * Check for available hauling tasks
   * @private
   */
  _checkHaulingTasks(npc, position) {
    const haulingManager = this.voxelOrchestrator.haulingManager;
    if (!haulingManager || !haulingManager.getAvailableTask) return null;

    const task = haulingManager.getAvailableTask(npc.id, position);
    if (!task) return null;

    return {
      ...VOXEL_IDLE_TASKS[VoxelIdleTaskType.VOXEL_HAUL],
      targetTask: task,
      targetPosition: task.sourcePosition,
      estimatedDuration: 20 // Estimated travel + pickup + delivery
    };
  }

  /**
   * Check for available building tasks
   * @private
   */
  _checkBuildingTasks(npc, position) {
    const constructionManager = this.voxelOrchestrator.constructionManager;
    if (!constructionManager || !constructionManager.getAvailableSite) return null;

    const site = constructionManager.getAvailableSite(npc.id, position);
    if (!site) return null;

    return {
      ...VOXEL_IDLE_TASKS[VoxelIdleTaskType.VOXEL_BUILD],
      targetTask: site,
      targetPosition: site.position,
      estimatedDuration: 30 // Varies by construction size
    };
  }

  /**
   * Start a voxel task for an NPC
   * @param {object} npc - NPC object
   * @param {object} task - Task from getAvailableTask
   * @returns {boolean} Success
   */
  startTask(npc, task) {
    if (!this.voxelWorkerBehavior) return false;

    // Register worker if not already
    if (!this.voxelWorkerBehavior.isWorkerRegistered(npc.id)) {
      this.voxelWorkerBehavior.registerWorker(npc.id);
    }

    // The worker behavior will pick up the task on next update
    return true;
  }

  /**
   * Check if NPC is currently doing voxel work
   * @param {string} npcId - NPC ID
   * @returns {boolean}
   */
  isDoingVoxelWork(npcId) {
    if (!this.voxelWorkerBehavior) return false;

    const state = this.voxelWorkerBehavior.getWorkerState(npcId);
    return state && state !== 'idle';
  }

  /**
   * Get task priority for decision system
   * @param {string} taskType - VoxelIdleTaskType
   * @returns {number} Priority (0-100)
   */
  getTaskPriority(taskType) {
    const taskDef = VOXEL_IDLE_TASKS[taskType];
    return taskDef ? taskDef.priority : 50;
  }

  /**
   * Enable/disable provider
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

/**
 * Create a decision context for voxel work
 * Compatible with AutonomousDecision system
 */
export function createVoxelWorkDecision(npc, voxelOrchestrator) {
  if (!voxelOrchestrator) return null;

  const provider = new VoxelIdleTaskProvider({ voxelOrchestrator });
  const task = provider.getAvailableTask(npc);

  if (!task) return null;

  return {
    type: 'WORK',
    priority: task.priority,
    action: task.type,
    target: task.targetPosition,
    data: task
  };
}

export default VoxelIdleTaskProvider;
