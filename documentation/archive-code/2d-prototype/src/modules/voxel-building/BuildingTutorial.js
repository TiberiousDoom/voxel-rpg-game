/**
 * BuildingTutorial.js - Tutorial and onboarding system
 *
 * Provides interactive tutorials, tooltips, and guided
 * experiences for new players learning the voxel building system.
 *
 * Part of Phase 27: Tutorial & Onboarding
 */

/**
 * Tutorial step types
 */
export const TutorialStepType = {
  INFO: 'info',
  HIGHLIGHT: 'highlight',
  ACTION: 'action',
  WAIT: 'wait',
  CHECKPOINT: 'checkpoint'
};

/**
 * Tutorial categories
 */
export const TutorialCategory = {
  BASICS: 'basics',
  MINING: 'mining',
  STOCKPILES: 'stockpiles',
  CONSTRUCTION: 'construction',
  WORKERS: 'workers',
  ADVANCED: 'advanced'
};

/**
 * Tutorial definitions
 */
export const TUTORIALS = {
  basics: {
    id: 'basics',
    name: 'Building Basics',
    category: TutorialCategory.BASICS,
    description: 'Learn the fundamentals of the building system',
    steps: [
      {
        type: TutorialStepType.INFO,
        title: 'Welcome to Building Mode',
        message: 'This tutorial will teach you how to build and manage your settlement.',
        duration: 5000
      },
      {
        type: TutorialStepType.HIGHLIGHT,
        title: 'Z-Level Navigation',
        message: 'Use PageUp/PageDown or . and , to navigate between Z-levels (vertical layers).',
        highlight: 'z-indicator',
        action: 'Press PageUp or PageDown to change Z-level'
      },
      {
        type: TutorialStepType.ACTION,
        title: 'Try It!',
        message: 'Navigate up and down a few Z-levels to see different terrain layers.',
        requiredAction: 'change_z_level',
        completionCount: 3
      },
      {
        type: TutorialStepType.CHECKPOINT,
        title: 'Great Progress!',
        message: 'You can now navigate the 3D world!',
        saveProgress: true
      }
    ]
  },

  mining: {
    id: 'mining',
    name: 'Mining Operations',
    category: TutorialCategory.MINING,
    description: 'Learn to designate blocks for mining',
    prerequisite: 'basics',
    steps: [
      {
        type: TutorialStepType.INFO,
        title: 'Mining Overview',
        message: 'Mining allows you to harvest resources from the terrain. NPCs will automatically mine designated blocks.',
        duration: 5000
      },
      {
        type: TutorialStepType.HIGHLIGHT,
        title: 'Mining Tool',
        message: 'Press M or click the mining tool button to activate mining mode.',
        highlight: 'mining-tool',
        action: 'Press M to activate mining mode'
      },
      {
        type: TutorialStepType.ACTION,
        title: 'Activate Mining',
        message: 'Switch to mining mode now.',
        requiredAction: 'activate_mining_tool',
        completionCount: 1
      },
      {
        type: TutorialStepType.INFO,
        title: 'Designating Blocks',
        message: 'Click and drag to select blocks for mining. Selected blocks will be marked with an X.',
        duration: 4000
      },
      {
        type: TutorialStepType.ACTION,
        title: 'Designate Mining Area',
        message: 'Click and drag to designate at least 4 blocks for mining.',
        requiredAction: 'designate_mining',
        completionCount: 4
      },
      {
        type: TutorialStepType.WAIT,
        title: 'Watch Your Workers',
        message: 'NPCs will now travel to the mining area and begin work.',
        waitFor: 'mining_started',
        timeout: 30000
      },
      {
        type: TutorialStepType.CHECKPOINT,
        title: 'Mining Complete!',
        message: 'You\'ve learned how to mine resources. Mined materials will be collected by haulers.',
        saveProgress: true
      }
    ]
  },

  stockpiles: {
    id: 'stockpiles',
    name: 'Resource Storage',
    category: TutorialCategory.STOCKPILES,
    description: 'Learn to create and manage stockpiles',
    prerequisite: 'mining',
    steps: [
      {
        type: TutorialStepType.INFO,
        title: 'Stockpiles',
        message: 'Stockpiles are areas where NPCs store collected resources. You need stockpiles to organize your materials.',
        duration: 5000
      },
      {
        type: TutorialStepType.HIGHLIGHT,
        title: 'Stockpile Tool',
        message: 'Press S or click the stockpile button to create storage areas.',
        highlight: 'stockpile-tool'
      },
      {
        type: TutorialStepType.ACTION,
        title: 'Create a Stockpile',
        message: 'Draw a stockpile zone on a flat surface. Make it at least 3x3 tiles.',
        requiredAction: 'create_stockpile',
        completionCount: 1
      },
      {
        type: TutorialStepType.INFO,
        title: 'Stockpile Filters',
        message: 'You can filter what resources a stockpile accepts by clicking on it.',
        duration: 4000
      },
      {
        type: TutorialStepType.CHECKPOINT,
        title: 'Storage Ready!',
        message: 'Your stockpile is ready. Haulers will now bring mined resources here.',
        saveProgress: true
      }
    ]
  },

  construction: {
    id: 'construction',
    name: 'Building Structures',
    category: TutorialCategory.CONSTRUCTION,
    description: 'Learn to construct buildings and structures',
    prerequisite: 'stockpiles',
    steps: [
      {
        type: TutorialStepType.INFO,
        title: 'Construction',
        message: 'With resources in stockpiles, you can build structures! Let\'s construct a simple building.',
        duration: 5000
      },
      {
        type: TutorialStepType.HIGHLIGHT,
        title: 'Build Tool',
        message: 'Press B or click the build button to enter construction mode.',
        highlight: 'build-tool'
      },
      {
        type: TutorialStepType.ACTION,
        title: 'Select Blueprint',
        message: 'Choose a blueprint from the building menu.',
        requiredAction: 'select_blueprint',
        completionCount: 1
      },
      {
        type: TutorialStepType.INFO,
        title: 'Placement Preview',
        message: 'Move your cursor to see where the building will be placed. Press R to rotate.',
        duration: 4000
      },
      {
        type: TutorialStepType.ACTION,
        title: 'Place Building',
        message: 'Click to place your building on a valid location.',
        requiredAction: 'place_building',
        completionCount: 1
      },
      {
        type: TutorialStepType.WAIT,
        title: 'Construction in Progress',
        message: 'Workers will now bring materials and construct the building.',
        waitFor: 'construction_progress',
        timeout: 60000
      },
      {
        type: TutorialStepType.CHECKPOINT,
        title: 'Builder Achievement!',
        message: 'You\'ve built your first structure! Keep building to expand your settlement.',
        saveProgress: true
      }
    ]
  },

  workers: {
    id: 'workers',
    name: 'Managing Workers',
    category: TutorialCategory.WORKERS,
    description: 'Learn to assign and manage NPC workers',
    prerequisite: 'construction',
    steps: [
      {
        type: TutorialStepType.INFO,
        title: 'Worker Management',
        message: 'NPCs automatically work on available tasks, but you can prioritize work areas.',
        duration: 5000
      },
      {
        type: TutorialStepType.HIGHLIGHT,
        title: 'Work Areas',
        message: 'Create priority zones to control where NPCs focus their efforts.',
        highlight: 'work-area-panel'
      },
      {
        type: TutorialStepType.INFO,
        title: 'Priority Levels',
        message: 'Work areas can be set to Urgent, High, Normal, Low, or Paused priority.',
        duration: 4000
      },
      {
        type: TutorialStepType.ACTION,
        title: 'Create Priority Zone',
        message: 'Create a work area and set it to High priority.',
        requiredAction: 'create_work_area',
        completionCount: 1
      },
      {
        type: TutorialStepType.CHECKPOINT,
        title: 'Workforce Organized!',
        message: 'You can now effectively manage your workforce. Watch efficiency improve!',
        saveProgress: true
      }
    ]
  }
};

/**
 * TutorialManager - Manages tutorial progression and state
 */
export class TutorialManager {
  constructor(config = {}) {
    this.currentTutorial = null;
    this.currentStepIndex = 0;
    this.completedTutorials = new Set();
    this.completedSteps = new Map(); // stepId -> completion data
    this.actionCounts = new Map(); // action -> count
    this.onStepChange = config.onStepChange || null;
    this.onTutorialComplete = config.onTutorialComplete || null;
    this.enabled = true;
    this.autoAdvance = config.autoAdvance !== false;
    this.pendingTimeout = null;
  }

  /**
   * Start a tutorial
   * @param {string} tutorialId
   * @returns {boolean} Success
   */
  startTutorial(tutorialId) {
    const tutorial = TUTORIALS[tutorialId];
    if (!tutorial) return false;

    // Check prerequisite
    if (tutorial.prerequisite && !this.completedTutorials.has(tutorial.prerequisite)) {
      return false;
    }

    this.currentTutorial = tutorial;
    this.currentStepIndex = 0;
    this.actionCounts.clear();
    this._emitStepChange();

    return true;
  }

  /**
   * Get current step
   * @returns {object|null}
   */
  getCurrentStep() {
    if (!this.currentTutorial) return null;
    return this.currentTutorial.steps[this.currentStepIndex] || null;
  }

  /**
   * Advance to next step
   * @returns {boolean} Has more steps
   */
  nextStep() {
    if (!this.currentTutorial) return false;

    this.currentStepIndex++;

    if (this.currentStepIndex >= this.currentTutorial.steps.length) {
      this._completeTutorial();
      return false;
    }

    this._emitStepChange();
    this._setupStepHandler();
    return true;
  }

  /**
   * Go to previous step
   * @returns {boolean} Success
   */
  previousStep() {
    if (!this.currentTutorial || this.currentStepIndex === 0) return false;

    this.currentStepIndex--;
    this._emitStepChange();
    return true;
  }

  /**
   * Skip current step
   */
  skipStep() {
    this.nextStep();
  }

  /**
   * Skip entire tutorial
   */
  skipTutorial() {
    if (this.currentTutorial) {
      this.completedTutorials.add(this.currentTutorial.id);
      this.currentTutorial = null;
      this.currentStepIndex = 0;
    }
  }

  /**
   * Record an action for tutorial progress
   * @param {string} action - Action type
   * @param {object} data - Action data
   */
  recordAction(action, data = {}) {
    if (!this.enabled || !this.currentTutorial) return;

    const currentCount = this.actionCounts.get(action) || 0;
    this.actionCounts.set(action, currentCount + 1);

    const step = this.getCurrentStep();
    if (!step) return;

    // Check if action completes current step
    if (step.type === TutorialStepType.ACTION && step.requiredAction === action) {
      const required = step.completionCount || 1;
      if (this.actionCounts.get(action) >= required) {
        if (this.autoAdvance) {
          this.nextStep();
        }
      }
    }

    // Check wait conditions
    if (step.type === TutorialStepType.WAIT && step.waitFor === action) {
      if (this.autoAdvance) {
        this.nextStep();
      }
    }
  }

  /**
   * Setup handlers for current step
   * @private
   */
  _setupStepHandler() {
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }

    const step = this.getCurrentStep();
    if (!step) return;

    // Auto-advance for INFO steps
    if (step.type === TutorialStepType.INFO && step.duration && this.autoAdvance) {
      this.pendingTimeout = setTimeout(() => {
        this.nextStep();
      }, step.duration);
    }

    // Timeout for WAIT steps
    if (step.type === TutorialStepType.WAIT && step.timeout) {
      this.pendingTimeout = setTimeout(() => {
        this.nextStep();
      }, step.timeout);
    }

    // Auto-advance for CHECKPOINT steps
    if (step.type === TutorialStepType.CHECKPOINT && this.autoAdvance) {
      this.pendingTimeout = setTimeout(() => {
        this.nextStep();
      }, 3000);
    }
  }

  /**
   * Complete current tutorial
   * @private
   */
  _completeTutorial() {
    if (!this.currentTutorial) return;

    this.completedTutorials.add(this.currentTutorial.id);

    if (this.onTutorialComplete) {
      this.onTutorialComplete(this.currentTutorial);
    }

    this.currentTutorial = null;
    this.currentStepIndex = 0;
  }

  /**
   * Emit step change event
   * @private
   */
  _emitStepChange() {
    if (this.onStepChange) {
      this.onStepChange(this.getCurrentStep(), this.currentStepIndex);
    }
    this._setupStepHandler();
  }

  /**
   * Check if tutorial is available
   * @param {string} tutorialId
   * @returns {boolean}
   */
  isTutorialAvailable(tutorialId) {
    const tutorial = TUTORIALS[tutorialId];
    if (!tutorial) return false;
    if (this.completedTutorials.has(tutorialId)) return false;
    if (tutorial.prerequisite && !this.completedTutorials.has(tutorial.prerequisite)) {
      return false;
    }
    return true;
  }

  /**
   * Get available tutorials
   * @returns {Array}
   */
  getAvailableTutorials() {
    return Object.values(TUTORIALS).filter(t => this.isTutorialAvailable(t.id));
  }

  /**
   * Get completed tutorials
   * @returns {Array}
   */
  getCompletedTutorials() {
    return Array.from(this.completedTutorials);
  }

  /**
   * Get progress for current tutorial
   * @returns {object}
   */
  getProgress() {
    if (!this.currentTutorial) return null;

    return {
      tutorialId: this.currentTutorial.id,
      tutorialName: this.currentTutorial.name,
      currentStep: this.currentStepIndex,
      totalSteps: this.currentTutorial.steps.length,
      progress: this.currentStepIndex / this.currentTutorial.steps.length
    };
  }

  /**
   * Export state
   * @returns {object}
   */
  toJSON() {
    return {
      completedTutorials: Array.from(this.completedTutorials),
      currentTutorial: this.currentTutorial?.id || null,
      currentStepIndex: this.currentStepIndex
    };
  }

  /**
   * Import state
   * @param {object} data
   */
  fromJSON(data) {
    if (data.completedTutorials) {
      this.completedTutorials = new Set(data.completedTutorials);
    }
    if (data.currentTutorial) {
      this.startTutorial(data.currentTutorial);
      this.currentStepIndex = data.currentStepIndex || 0;
    }
  }

  /**
   * Enable/disable tutorials
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Reset all progress
   */
  reset() {
    this.currentTutorial = null;
    this.currentStepIndex = 0;
    this.completedTutorials.clear();
    this.actionCounts.clear();
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
  }
}

/**
 * TooltipManager - Contextual help tooltips
 */
export class TooltipManager {
  constructor() {
    this.tooltips = new Map();
    this.activeTooltip = null;
    this.enabled = true;
    this.seenTooltips = new Set();
    this._initializeTooltips();
  }

  /**
   * Initialize default tooltips
   * @private
   */
  _initializeTooltips() {
    const defaultTooltips = [
      {
        id: 'z-level',
        target: 'z-indicator',
        title: 'Z-Level',
        content: 'Shows current vertical layer. Use PageUp/Down to navigate.',
        position: 'bottom'
      },
      {
        id: 'mining-tool',
        target: 'mining-tool',
        title: 'Mining Tool (M)',
        content: 'Click and drag to designate blocks for mining.',
        position: 'right'
      },
      {
        id: 'build-tool',
        target: 'build-tool',
        title: 'Build Tool (B)',
        content: 'Place blueprints and construct buildings.',
        position: 'right'
      },
      {
        id: 'stockpile-tool',
        target: 'stockpile-tool',
        title: 'Stockpile Tool (S)',
        content: 'Create storage areas for resources.',
        position: 'right'
      },
      {
        id: 'worker-indicator',
        target: 'worker-indicator',
        title: 'Worker Status',
        content: 'Shows what task this NPC is performing.',
        position: 'top'
      },
      {
        id: 'resource-info',
        target: 'resource-panel',
        title: 'Resources',
        content: 'Shows available materials for construction.',
        position: 'left'
      }
    ];

    for (const tooltip of defaultTooltips) {
      this.tooltips.set(tooltip.id, tooltip);
    }
  }

  /**
   * Show a tooltip
   * @param {string} id - Tooltip ID
   * @returns {object|null} Tooltip data
   */
  show(id) {
    if (!this.enabled) return null;

    const tooltip = this.tooltips.get(id);
    if (!tooltip) return null;

    this.activeTooltip = tooltip;
    this.seenTooltips.add(id);
    return tooltip;
  }

  /**
   * Hide active tooltip
   */
  hide() {
    this.activeTooltip = null;
  }

  /**
   * Get active tooltip
   * @returns {object|null}
   */
  getActive() {
    return this.activeTooltip;
  }

  /**
   * Check if tooltip has been seen
   * @param {string} id
   * @returns {boolean}
   */
  hasSeen(id) {
    return this.seenTooltips.has(id);
  }

  /**
   * Add custom tooltip
   * @param {object} tooltip
   */
  addTooltip(tooltip) {
    this.tooltips.set(tooltip.id, tooltip);
  }

  /**
   * Enable/disable tooltips
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.activeTooltip = null;
    }
  }

  /**
   * Reset seen state
   */
  reset() {
    this.seenTooltips.clear();
    this.activeTooltip = null;
  }

  /**
   * Export state
   * @returns {object}
   */
  toJSON() {
    return {
      seenTooltips: Array.from(this.seenTooltips)
    };
  }

  /**
   * Import state
   * @param {object} data
   */
  fromJSON(data) {
    if (data.seenTooltips) {
      this.seenTooltips = new Set(data.seenTooltips);
    }
  }
}

/**
 * TutorialRenderer - Renders tutorial UI elements
 */
export class TutorialRenderer {
  constructor(config = {}) {
    this.tutorialManager = config.tutorialManager || null;
    this.tooltipManager = config.tooltipManager || null;
    this.tileSize = config.tileSize || 40;
  }

  /**
   * Render tutorial overlay
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   */
  render(ctx, canvasWidth, canvasHeight) {
    const step = this.tutorialManager?.getCurrentStep();
    if (!step) return;

    // Render step content
    this._renderStepPanel(ctx, step, canvasWidth, canvasHeight);

    // Render highlight if specified
    if (step.highlight) {
      this._renderHighlight(ctx, step.highlight, canvasWidth, canvasHeight);
    }

    // Render progress indicator
    this._renderProgress(ctx, canvasWidth, canvasHeight);
  }

  /**
   * Render step panel
   * @private
   */
  _renderStepPanel(ctx, step, canvasWidth, canvasHeight) {
    const panelWidth = Math.min(400, canvasWidth - 40);
    const panelHeight = 120;
    const panelX = (canvasWidth - panelWidth) / 2;
    const panelY = canvasHeight - panelHeight - 20;

    // Panel background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.95)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(step.title || 'Tutorial', panelX + 15, panelY + 28);

    // Message
    ctx.fillStyle = '#cccccc';
    ctx.font = '14px sans-serif';
    const words = (step.message || '').split(' ');
    let line = '';
    let lineY = panelY + 52;
    const maxWidth = panelWidth - 30;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, panelX + 15, lineY);
        line = word + ' ';
        lineY += 20;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, panelX + 15, lineY);

    // Action hint
    if (step.action) {
      ctx.fillStyle = '#4a9eff';
      ctx.font = 'italic 12px sans-serif';
      ctx.fillText(step.action, panelX + 15, panelY + panelHeight - 15);
    }

    // Skip button
    ctx.fillStyle = '#666666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Press ESC to skip', panelX + panelWidth - 15, panelY + panelHeight - 15);
  }

  /**
   * Render highlight effect
   * @private
   */
  _renderHighlight(ctx, highlightId, canvasWidth, canvasHeight) {
    // Render pulsing highlight around target area
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 3) * 0.3 + 0.7;

    ctx.strokeStyle = `rgba(74, 158, 255, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);

    // Placeholder highlight box (actual position would come from UI element)
    const highlightX = canvasWidth / 2 - 50;
    const highlightY = 50;
    const highlightW = 100;
    const highlightH = 40;

    ctx.strokeRect(highlightX - 5, highlightY - 5, highlightW + 10, highlightH + 10);
    ctx.setLineDash([]);
  }

  /**
   * Render progress indicator
   * @private
   */
  _renderProgress(ctx, canvasWidth, canvasHeight) {
    const progress = this.tutorialManager?.getProgress();
    if (!progress) return;

    const progressWidth = 200;
    const progressHeight = 4;
    const progressX = (canvasWidth - progressWidth) / 2;
    const progressY = canvasHeight - 140;

    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(progressX, progressY, progressWidth, progressHeight);

    // Progress bar
    ctx.fillStyle = '#4a9eff';
    ctx.fillRect(progressX, progressY, progressWidth * progress.progress, progressHeight);

    // Step counter
    ctx.fillStyle = '#888888';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Step ${progress.currentStep + 1} of ${progress.totalSteps}`,
      canvasWidth / 2,
      progressY - 8
    );
  }

  /**
   * Render tooltip
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} tooltip
   * @param {number} x - Target X position
   * @param {number} y - Target Y position
   */
  renderTooltip(ctx, tooltip, x, y) {
    if (!tooltip) return;

    const padding = 10;
    const maxWidth = 200;

    ctx.font = '12px sans-serif';
    const titleWidth = ctx.measureText(tooltip.title || '').width;
    const contentWidth = Math.min(maxWidth, ctx.measureText(tooltip.content || '').width);
    const width = Math.max(titleWidth, contentWidth) + padding * 2;
    const height = 50;

    // Position based on preference
    let tooltipX = x;
    let tooltipY = y;

    switch (tooltip.position) {
      case 'top':
        tooltipY = y - height - 10;
        break;
      case 'bottom':
        tooltipY = y + 30;
        break;
      case 'left':
        tooltipX = x - width - 10;
        break;
      case 'right':
        tooltipX = x + 30;
        break;
    }

    // Background
    ctx.fillStyle = 'rgba(30, 30, 40, 0.95)';
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, width, height, 4);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(tooltip.title || '', tooltipX + padding, tooltipY + 18);

    // Content
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '11px sans-serif';
    ctx.fillText(tooltip.content || '', tooltipX + padding, tooltipY + 36);
  }
}

export default {
  TutorialStepType,
  TutorialCategory,
  TUTORIALS,
  TutorialManager,
  TooltipManager,
  TutorialRenderer
};
