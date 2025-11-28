/**
 * NPCVisualFeedback.js - Visual feedback system for NPCs
 *
 * Implements Phase 4 of NPC Control Redesign:
 * - Thought bubbles showing NPC state
 * - Path preview visualization
 * - Command progress indicators
 * - Formation visualization
 * - Selection and status UI data
 */

/**
 * Thought bubble types
 */
export const ThoughtType = {
  WORK: 'WORK',           // Working on task
  REST: 'REST',           // Resting/tired
  HUNGER: 'HUNGER',       // Hungry
  HAPPY: 'HAPPY',         // Content/happy
  SAD: 'SAD',             // Unhappy
  SOCIAL: 'SOCIAL',       // Social interaction
  COMMAND: 'COMMAND',     // Following command
  CONFUSED: 'CONFUSED',   // Can't path/stuck
  SICK: 'SICK',           // Low health
};

/**
 * Thought bubble icon mapping
 */
export const ThoughtIcons = {
  [ThoughtType.WORK]: '⚒️',
  [ThoughtType.REST]: '💤',
  [ThoughtType.HUNGER]: '🍖',
  [ThoughtType.HAPPY]: '😊',
  [ThoughtType.SAD]: '😢',
  [ThoughtType.SOCIAL]: '💬',
  [ThoughtType.COMMAND]: '📋',
  [ThoughtType.CONFUSED]: '❓',
  [ThoughtType.SICK]: '🤒',
};

/**
 * Thought bubble class
 */
export class ThoughtBubble {
  /**
   * Create a thought bubble
   * @param {string} type - Thought type from ThoughtType
   * @param {string} message - Thought message
   * @param {number} duration - Display duration in ms (default 3000)
   */
  constructor(type, message, duration = 3000) {
    this.type = type;
    this.message = message;
    this.icon = ThoughtIcons[type] || '💭';
    this.createdAt = Date.now();
    this.duration = duration;
    this.priority = this._getPriority(type);
  }

  /**
   * Get priority for thought type
   * @private
   * @param {string} type - Thought type
   * @returns {number} Priority (higher = more important)
   */
  _getPriority(type) {
    const priorities = {
      [ThoughtType.HUNGER]: 9,
      [ThoughtType.SICK]: 9,
      [ThoughtType.CONFUSED]: 8,
      [ThoughtType.REST]: 7,
      [ThoughtType.COMMAND]: 6,
      [ThoughtType.WORK]: 5,
      [ThoughtType.SOCIAL]: 4,
      [ThoughtType.HAPPY]: 3,
      [ThoughtType.SAD]: 3,
    };

    return priorities[type] || 1;
  }

  /**
   * Check if thought bubble is expired
   * @returns {boolean}
   */
  isExpired() {
    return Date.now() - this.createdAt > this.duration;
  }

  /**
   * Get remaining time in ms
   * @returns {number}
   */
  getRemainingTime() {
    return Math.max(0, this.duration - (Date.now() - this.createdAt));
  }

  /**
   * Get thought bubble data for rendering
   * @returns {Object}
   */
  toRenderData() {
    return {
      type: this.type,
      icon: this.icon,
      message: this.message,
      priority: this.priority,
      remainingTime: this.getRemainingTime(),
      opacity: Math.min(1, this.getRemainingTime() / 1000), // Fade out in last second
    };
  }
}

/**
 * Visual state for an NPC
 */
export class NPCVisualState {
  constructor(npcId) {
    this.npcId = npcId;
    this.thoughts = []; // Array of ThoughtBubble
    this.isSelected = false;
    this.isHovered = false;
    this.pathPreview = null; // Path to visualize
    this.commandProgress = null; // Command progress data
    this.formationPreview = null; // Formation visualization data
    this.statusIndicators = []; // Array of status icons
  }

  /**
   * Add a thought bubble
   * @param {ThoughtBubble} thought - Thought bubble to add
   */
  addThought(thought) {
    // Remove expired thoughts
    this.thoughts = this.thoughts.filter(t => !t.isExpired());

    // Add new thought
    this.thoughts.push(thought);

    // Keep only top 3 thoughts by priority
    this.thoughts.sort((a, b) => b.priority - a.priority);
    if (this.thoughts.length > 3) {
      this.thoughts = this.thoughts.slice(0, 3);
    }
  }

  /**
   * Get current active thought (highest priority)
   * @returns {ThoughtBubble|null}
   */
  getCurrentThought() {
    this.thoughts = this.thoughts.filter(t => !t.isExpired());
    return this.thoughts.length > 0 ? this.thoughts[0] : null;
  }

  /**
   * Set path preview
   * @param {Array<Object>} path - Path waypoints
   */
  setPathPreview(path) {
    this.pathPreview = path;
  }

  /**
   * Clear path preview
   */
  clearPathPreview() {
    this.pathPreview = null;
  }

  /**
   * Update command progress
   * @param {Object} progress - Command progress data
   */
  updateCommandProgress(progress) {
    this.commandProgress = progress;
  }

  /**
   * Update formation visualization
   * @param {Object} formationData - Formation data
   */
  updateFormationPreview(formationData) {
    this.formationPreview = formationData;
  }

  /**
   * Add status indicator
   * @param {string} type - Indicator type
   * @param {string} icon - Icon/emoji
   */
  addStatusIndicator(type, icon) {
    // Remove existing indicator of same type
    this.statusIndicators = this.statusIndicators.filter(i => i.type !== type);

    this.statusIndicators.push({ type, icon, timestamp: Date.now() });

    // Keep only last 5 indicators
    if (this.statusIndicators.length > 5) {
      this.statusIndicators.shift();
    }
  }

  /**
   * Get render data for this NPC
   * @returns {Object}
   */
  getRenderData() {
    return {
      npcId: this.npcId,
      isSelected: this.isSelected,
      isHovered: this.isHovered,
      currentThought: this.getCurrentThought()?.toRenderData() || null,
      allThoughts: this.thoughts.map(t => t.toRenderData()),
      pathPreview: this.pathPreview,
      commandProgress: this.commandProgress,
      formationPreview: this.formationPreview,
      statusIndicators: this.statusIndicators,
    };
  }
}

/**
 * Visual feedback manager
 */
export class NPCVisualFeedbackManager {
  constructor() {
    this.npcVisualStates = new Map(); // npcId -> NPCVisualState
    this.selectedNPCId = null;
    this.hoveredNPCId = null;
  }

  /**
   * Get or create visual state for NPC
   * @param {string} npcId - NPC ID
   * @returns {NPCVisualState}
   */
  getVisualState(npcId) {
    if (!this.npcVisualStates.has(npcId)) {
      this.npcVisualStates.set(npcId, new NPCVisualState(npcId));
    }

    return this.npcVisualStates.get(npcId);
  }

  /**
   * Add thought to NPC
   * @param {string} npcId - NPC ID
   * @param {string} type - Thought type
   * @param {string} message - Thought message
   * @param {number} duration - Duration in ms
   */
  addThought(npcId, type, message, duration) {
    const visualState = this.getVisualState(npcId);
    const thought = new ThoughtBubble(type, message, duration);
    visualState.addThought(thought);
  }

  /**
   * Update path preview for NPC
   * @param {string} npcId - NPC ID
   * @param {Array<Object>} path - Path waypoints
   */
  updatePathPreview(npcId, path) {
    const visualState = this.getVisualState(npcId);
    visualState.setPathPreview(path);
  }

  /**
   * Update command progress for NPC
   * @param {string} npcId - NPC ID
   * @param {Object} commandStatus - Command status
   */
  updateCommandProgress(npcId, commandStatus) {
    const visualState = this.getVisualState(npcId);

    if (commandStatus && commandStatus.activeCommand) {
      visualState.updateCommandProgress({
        type: commandStatus.activeCommand.type,
        progress: commandStatus.activeCommand.progress,
        status: commandStatus.activeCommand.status,
      });
    } else {
      visualState.updateCommandProgress(null);
    }
  }

  /**
   * Select NPC
   * @param {string} npcId - NPC ID (null to deselect)
   */
  selectNPC(npcId) {
    // Deselect previous
    if (this.selectedNPCId) {
      const prevState = this.getVisualState(this.selectedNPCId);
      prevState.isSelected = false;
    }

    // Select new
    this.selectedNPCId = npcId;
    if (npcId) {
      const visualState = this.getVisualState(npcId);
      visualState.isSelected = true;
    }
  }

  /**
   * Set hovered NPC
   * @param {string} npcId - NPC ID (null to clear)
   */
  setHoveredNPC(npcId) {
    // Clear previous hover
    if (this.hoveredNPCId) {
      const prevState = this.getVisualState(this.hoveredNPCId);
      prevState.isHovered = false;
    }

    // Set new hover
    this.hoveredNPCId = npcId;
    if (npcId) {
      const visualState = this.getVisualState(npcId);
      visualState.isHovered = true;
    }
  }

  /**
   * Get selected NPC ID
   * @returns {string|null}
   */
  getSelectedNPC() {
    return this.selectedNPCId;
  }

  /**
   * Add status indicator to NPC
   * @param {string} npcId - NPC ID
   * @param {string} type - Indicator type
   * @param {string} icon - Icon/emoji
   */
  addStatusIndicator(npcId, type, icon) {
    const visualState = this.getVisualState(npcId);
    visualState.addStatusIndicator(type, icon);
  }

  /**
   * Update NPC visual state from game state
   * @param {Object} npc - NPC object
   */
  updateFromNPCState(npc) {
    if (!npc || !npc.alive) return;

    const visualState = this.getVisualState(npc.id);

    // Auto-generate thoughts based on state
    if (npc.hungry && npc.health < 50) {
      this.addThought(npc.id, ThoughtType.HUNGER, 'I need food!', 4000);
    } else if (npc.health < 30) {
      this.addThought(npc.id, ThoughtType.SICK, 'I don\'t feel well...', 4000);
    } else if (npc.fatigued) {
      this.addThought(npc.id, ThoughtType.REST, 'I need rest', 3000);
    } else if (npc.isWorking) {
      this.addThought(npc.id, ThoughtType.WORK, 'Working hard!', 2000);
    } else if (npc.currentMood === 'happy') {
      this.addThought(npc.id, ThoughtType.HAPPY, 'Life is good', 2000);
    } else if (npc.currentMood === 'sad') {
      this.addThought(npc.id, ThoughtType.SAD, 'Feeling down...', 2000);
    }

    // Update path preview
    if (npc.currentPath) {
      visualState.setPathPreview(npc.currentPath);
    } else {
      visualState.clearPathPreview();
    }

    // Update status indicators
    if (npc.isWorking) {
      visualState.addStatusIndicator('working', '⚒️');
    }
    if (npc.isResting) {
      visualState.addStatusIndicator('resting', '💤');
    }
    if (npc.commandQueue && !npc.commandQueue.isEmpty()) {
      visualState.addStatusIndicator('command', '📋');
    }
    if (npc.formationId) {
      visualState.addStatusIndicator('formation', '🛡️');
    }
  }

  /**
   * Get all NPC render data
   * @returns {Map<string, Object>} Map of npcId -> render data
   */
  getAllRenderData() {
    const renderData = new Map();

    for (const [npcId, visualState] of this.npcVisualStates.entries()) {
      renderData.set(npcId, visualState.getRenderData());
    }

    return renderData;
  }

  /**
   * Clear visual state for NPC (when removed/dead)
   * @param {string} npcId - NPC ID
   */
  clearNPCVisualState(npcId) {
    this.npcVisualStates.delete(npcId);

    if (this.selectedNPCId === npcId) {
      this.selectedNPCId = null;
    }

    if (this.hoveredNPCId === npcId) {
      this.hoveredNPCId = null;
    }
  }

  /**
   * Get selection panel data for selected NPC
   * @param {Object} npc - NPC object
   * @returns {Object|null} Selection panel data
   */
  getSelectionPanelData(npc) {
    if (!npc) return null;

    const visualState = this.getVisualState(npc.id);

    return {
      npc: {
        id: npc.id,
        name: npc.name,
        role: npc.role,
        position: npc.position,
        health: npc.health,
        happiness: npc.happiness,
        mood: npc.currentMood,
      },
      status: {
        isWorking: npc.isWorking,
        isMoving: npc.isMoving,
        isResting: npc.isResting,
        hungry: npc.hungry,
        fatigued: npc.fatigued,
      },
      personality: npc.personality ? {
        dominantTrait: npc.personality.getDominantTrait(),
        traits: npc.personality.traits,
        workPace: npc.personality.workPaceModifier,
        quality: npc.personality.qualityModifier,
      } : null,
      commands: npc.commandQueue ? npc.commandQueue.getStatus() : null,
      formation: npc.formationId,
      thoughts: visualState.thoughts.map(t => t.toRenderData()),
      statusIndicators: visualState.statusIndicators,
    };
  }
}

const NPCVisualFeedbackModule = {
  ThoughtType,
  ThoughtIcons,
  ThoughtBubble,
  NPCVisualState,
  NPCVisualFeedbackManager,
};

export default NPCVisualFeedbackModule;
