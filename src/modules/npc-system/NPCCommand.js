/**
 * NPCCommand.js - Command system for direct NPC control
 *
 * Implements Phase 2 of NPC Control Redesign:
 * - Player-issued commands (move, follow, patrol, rally)
 * - Command queue management
 * - Command execution and completion
 * - Three-tier control: Strategic, Tactical, Autonomous
 */

/**
 * Command Types
 */
export const CommandType = {
  // Movement commands
  MOVE_TO: 'MOVE_TO',           // Move to specific position
  FOLLOW: 'FOLLOW',             // Follow another NPC
  PATROL: 'PATROL',             // Patrol between waypoints
  RALLY: 'RALLY',               // Move to rally point

  // Work commands
  PRIORITIZE_BUILDING: 'PRIORITIZE_BUILDING', // Prefer working at specific building
  WORK_AT: 'WORK_AT',           // Work at specific building (like assign but via command)
  IDLE: 'IDLE',                 // Stop current activity and idle

  // Group commands
  FORM_GROUP: 'FORM_GROUP',     // Join a group formation
  LEAVE_GROUP: 'LEAVE_GROUP',   // Leave current group
};

/**
 * Command Priority Levels
 */
export const CommandPriority = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  URGENT: 3,
};

/**
 * Command Status
 */
export const CommandStatus = {
  QUEUED: 'QUEUED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

/**
 * Base Command class
 */
export class Command {
  /**
   * Create a command
   * @param {string} type - Command type from CommandType
   * @param {Object} params - Command parameters
   * @param {number} priority - Command priority (default NORMAL)
   */
  constructor(type, params = {}, priority = CommandPriority.NORMAL) {
    this.id = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.params = params;
    this.priority = priority;
    this.status = CommandStatus.QUEUED;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.progress = 0; // 0-1 completion percentage
    this.error = null;
  }

  /**
   * Check if command is complete
   * @returns {boolean}
   */
  isComplete() {
    return this.status === CommandStatus.COMPLETED ||
           this.status === CommandStatus.FAILED ||
           this.status === CommandStatus.CANCELLED;
  }

  /**
   * Mark command as active
   */
  activate() {
    this.status = CommandStatus.ACTIVE;
    this.startedAt = Date.now();
  }

  /**
   * Mark command as completed
   */
  complete() {
    this.status = CommandStatus.COMPLETED;
    this.completedAt = Date.now();
    this.progress = 1.0;
  }

  /**
   * Mark command as failed
   * @param {string} error - Error message
   */
  fail(error) {
    this.status = CommandStatus.FAILED;
    this.completedAt = Date.now();
    this.error = error;
  }

  /**
   * Cancel command
   */
  cancel() {
    this.status = CommandStatus.CANCELLED;
    this.completedAt = Date.now();
  }

  /**
   * Update progress
   * @param {number} progress - Progress 0-1
   */
  updateProgress(progress) {
    this.progress = Math.max(0, Math.min(1, progress));
  }

  /**
   * Get command summary
   * @returns {Object}
   */
  getSummary() {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      priority: this.priority,
      progress: this.progress,
      params: this.params,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      error: this.error,
    };
  }
}

/**
 * Command Queue for managing NPC commands
 */
export class CommandQueue {
  constructor() {
    this.commands = [];
    this.activeCommand = null;
  }

  /**
   * Add command to queue
   * @param {Command} command - Command to add
   */
  addCommand(command) {
    this.commands.push(command);
    // Sort by priority (higher first)
    this.commands.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get next command from queue
   * @returns {Command|null}
   */
  getNextCommand() {
    // Clear completed active command
    if (this.activeCommand && this.activeCommand.isComplete()) {
      this.activeCommand = null;
    }

    // Return active command if still running
    if (this.activeCommand) {
      return this.activeCommand;
    }

    // Get next queued command
    const nextCommand = this.commands.find(cmd => cmd.status === CommandStatus.QUEUED);
    if (nextCommand) {
      nextCommand.activate();
      this.activeCommand = nextCommand;
      return nextCommand;
    }

    return null;
  }

  /**
   * Cancel current command
   */
  cancelCurrent() {
    if (this.activeCommand) {
      this.activeCommand.cancel();
      this.activeCommand = null;
    }
  }

  /**
   * Cancel all commands
   */
  cancelAll() {
    this.cancelCurrent();
    this.commands.forEach(cmd => {
      if (cmd.status === CommandStatus.QUEUED) {
        cmd.cancel();
      }
    });
  }

  /**
   * Clear completed commands
   */
  clearCompleted() {
    this.commands = this.commands.filter(cmd => !cmd.isComplete());
  }

  /**
   * Get queue status
   * @returns {Object}
   */
  getStatus() {
    return {
      activeCommand: this.activeCommand ? this.activeCommand.getSummary() : null,
      queuedCount: this.commands.filter(cmd => cmd.status === CommandStatus.QUEUED).length,
      completedCount: this.commands.filter(cmd => cmd.status === CommandStatus.COMPLETED).length,
      failedCount: this.commands.filter(cmd => cmd.status === CommandStatus.FAILED).length,
    };
  }

  /**
   * Check if queue is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.commands.filter(cmd => cmd.status === CommandStatus.QUEUED).length === 0 &&
           this.activeCommand === null;
  }
}

/**
 * Formation types for group movement
 */
export const FormationType = {
  LINE: 'LINE',           // NPCs in a line
  COLUMN: 'COLUMN',       // NPCs in a column
  WEDGE: 'WEDGE',         // V-formation
  BOX: 'BOX',             // Square formation
  CIRCLE: 'CIRCLE',       // Circle around leader
  SCATTERED: 'SCATTERED', // Loose formation
};

/**
 * Formation configuration
 */
export class Formation {
  /**
   * Create a formation
   * @param {string} type - Formation type
   * @param {string} leaderId - Leader NPC ID
   */
  constructor(type = FormationType.LINE, leaderId = null) {
    this.id = `formation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.leaderId = leaderId;
    this.memberIds = [];
    this.spacing = 1.5; // Units between NPCs
  }

  /**
   * Add member to formation
   * @param {string} npcId - NPC ID
   */
  addMember(npcId) {
    if (!this.memberIds.includes(npcId)) {
      this.memberIds.push(npcId);
    }
  }

  /**
   * Remove member from formation
   * @param {string} npcId - NPC ID
   */
  removeMember(npcId) {
    this.memberIds = this.memberIds.filter(id => id !== npcId);
  }

  /**
   * Calculate formation positions relative to leader
   * @param {Object} leaderPosition - Leader position {x, y, z}
   * @param {Object} leaderDirection - Leader direction vector {x, z} (normalized)
   * @returns {Map} Map of npcId -> position
   */
  calculatePositions(leaderPosition, leaderDirection = { x: 0, z: 1 }) {
    const positions = new Map();
    const spacing = this.spacing;

    // Normalize direction
    const dirLength = Math.sqrt(leaderDirection.x ** 2 + leaderDirection.z ** 2);
    const dir = {
      x: leaderDirection.x / dirLength,
      z: leaderDirection.z / dirLength,
    };

    // Perpendicular direction (right)
    const perp = { x: -dir.z, z: dir.x };

    switch (this.type) {
      case FormationType.LINE: {
        // Horizontal line behind leader
        const halfCount = Math.floor(this.memberIds.length / 2);
        this.memberIds.forEach((npcId, index) => {
          const offset = index - halfCount;
          positions.set(npcId, {
            x: leaderPosition.x - dir.x * spacing + perp.x * offset * spacing,
            y: leaderPosition.y,
            z: leaderPosition.z - dir.z * spacing + perp.z * offset * spacing,
          });
        });
        break;
      }

      case FormationType.COLUMN: {
        // Vertical column behind leader
        this.memberIds.forEach((npcId, index) => {
          positions.set(npcId, {
            x: leaderPosition.x - dir.x * (index + 1) * spacing,
            y: leaderPosition.y,
            z: leaderPosition.z - dir.z * (index + 1) * spacing,
          });
        });
        break;
      }

      case FormationType.WEDGE: {
        // V-formation
        const rows = Math.ceil(Math.sqrt(this.memberIds.length));
        let memberIndex = 0;
        for (let row = 1; row <= rows && memberIndex < this.memberIds.length; row++) {
          const npcsInRow = row * 2;
          for (let col = -row; col <= row && memberIndex < this.memberIds.length; col++) {
            if (Math.abs(col) !== row) continue; // Only edges of triangle
            const npcId = this.memberIds[memberIndex++];
            positions.set(npcId, {
              x: leaderPosition.x - dir.x * row * spacing + perp.x * col * spacing * 0.5,
              y: leaderPosition.y,
              z: leaderPosition.z - dir.z * row * spacing + perp.z * col * spacing * 0.5,
            });
          }
        }
        break;
      }

      case FormationType.BOX: {
        // Square formation
        const side = Math.ceil(Math.sqrt(this.memberIds.length));
        this.memberIds.forEach((npcId, index) => {
          const row = Math.floor(index / side);
          const col = index % side;
          positions.set(npcId, {
            x: leaderPosition.x - dir.x * (row + 1) * spacing + perp.x * (col - side / 2) * spacing,
            y: leaderPosition.y,
            z: leaderPosition.z - dir.z * (row + 1) * spacing + perp.z * (col - side / 2) * spacing,
          });
        });
        break;
      }

      case FormationType.CIRCLE: {
        // Circle around leader
        const radius = spacing * 2;
        this.memberIds.forEach((npcId, index) => {
          const angle = (index / this.memberIds.length) * Math.PI * 2;
          positions.set(npcId, {
            x: leaderPosition.x + Math.cos(angle) * radius,
            y: leaderPosition.y,
            z: leaderPosition.z + Math.sin(angle) * radius,
          });
        });
        break;
      }

      case FormationType.SCATTERED: {
        // Random scattered positions around leader
        this.memberIds.forEach((npcId, index) => {
          const angle = Math.random() * Math.PI * 2;
          const dist = spacing + Math.random() * spacing;
          positions.set(npcId, {
            x: leaderPosition.x + Math.cos(angle) * dist - dir.x * spacing,
            y: leaderPosition.y,
            z: leaderPosition.z + Math.sin(angle) * dist - dir.z * spacing,
          });
        });
        break;
      }
    }

    return positions;
  }

  /**
   * Get formation summary
   * @returns {Object}
   */
  getSummary() {
    return {
      id: this.id,
      type: this.type,
      leaderId: this.leaderId,
      memberCount: this.memberIds.length,
      spacing: this.spacing,
    };
  }
}

/**
 * Helper functions for creating commands
 */
export const CommandFactory = {
  /**
   * Create a move to command
   * @param {Object} position - Target position {x, y, z}
   * @param {number} priority - Command priority
   * @returns {Command}
   */
  moveTo(position, priority = CommandPriority.NORMAL) {
    return new Command(CommandType.MOVE_TO, { position }, priority);
  },

  /**
   * Create a follow command
   * @param {string} targetId - NPC ID to follow
   * @param {number} distance - Follow distance (default 2.0)
   * @param {number} priority - Command priority
   * @returns {Command}
   */
  follow(targetId, distance = 2.0, priority = CommandPriority.NORMAL) {
    return new Command(CommandType.FOLLOW, { targetId, distance }, priority);
  },

  /**
   * Create a patrol command
   * @param {Array<Object>} waypoints - Array of positions to patrol
   * @param {boolean} loop - Loop patrol (default true)
   * @param {number} priority - Command priority
   * @returns {Command}
   */
  patrol(waypoints, loop = true, priority = CommandPriority.NORMAL) {
    return new Command(CommandType.PATROL, { waypoints, loop, currentIndex: 0 }, priority);
  },

  /**
   * Create a rally command
   * @param {Object} position - Rally point position
   * @param {number} priority - Command priority
   * @returns {Command}
   */
  rally(position, priority = CommandPriority.HIGH) {
    return new Command(CommandType.RALLY, { position }, priority);
  },

  /**
   * Create a prioritize building command
   * @param {string} buildingId - Building ID to prioritize
   * @param {number} priority - Command priority
   * @returns {Command}
   */
  prioritizeBuilding(buildingId, priority = CommandPriority.NORMAL) {
    return new Command(CommandType.PRIORITIZE_BUILDING, { buildingId }, priority);
  },

  /**
   * Create an idle command
   * @param {number} priority - Command priority
   * @returns {Command}
   */
  idle(priority = CommandPriority.LOW) {
    return new Command(CommandType.IDLE, {}, priority);
  },
};

export default {
  CommandType,
  CommandPriority,
  CommandStatus,
  Command,
  CommandQueue,
  FormationType,
  Formation,
  CommandFactory,
};
