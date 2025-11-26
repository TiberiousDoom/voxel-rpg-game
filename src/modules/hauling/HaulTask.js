/**
 * HaulTask.js - Task for carrying materials between locations
 *
 * A haul task represents the work of moving resources from one location
 * (typically a stockpile) to another (typically a construction site).
 *
 * Part of Phase 5: Hauling System
 *
 * Task Lifecycle:
 * 1. PENDING - Task created but not started
 * 2. TRAVELING_TO_PICKUP - NPC moving to source location
 * 3. PICKING_UP - NPC picking up resource
 * 4. TRAVELING_TO_DROPOFF - NPC carrying resource to destination
 * 5. DROPPING_OFF - NPC depositing resource
 * 6. COMPLETED / CANCELLED / FAILED
 */

/**
 * Haul task status
 */
export const HaulTaskStatus = {
  PENDING: 'pending',
  TRAVELING_TO_PICKUP: 'traveling_to_pickup',
  PICKING_UP: 'picking_up',
  TRAVELING_TO_DROPOFF: 'traveling_to_dropoff',
  DROPPING_OFF: 'dropping_off',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed'
};

/**
 * Haul task priority levels
 */
export const HaulPriority = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4
};

/**
 * HaulTask - Represents a single hauling job
 */
export class HaulTask {
  static nextId = 1;

  /**
   * Create a haul task
   * @param {object} config - Task configuration
   */
  constructor(config = {}) {
    this.id = config.id || `haul_${HaulTask.nextId++}`;

    // Resource information
    this.resourceType = config.resourceType;
    this.quantity = config.quantity || 1;
    this.quantityPickedUp = 0;

    // Source location (stockpile slot)
    this.source = {
      stockpileId: config.sourceStockpileId,
      position: config.sourcePosition ? { ...config.sourcePosition } : null,
      slotKey: config.sourceSlotKey
    };

    // Destination (construction site block)
    this.destination = {
      siteId: config.destinationSiteId,
      position: config.destinationPosition ? { ...config.destinationPosition } : null,
      blockKey: config.destinationBlockKey
    };

    // Task state
    this.status = HaulTaskStatus.PENDING;
    this.priority = config.priority || HaulPriority.NORMAL;
    this.assignedNpcId = null;

    // Timing
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;

    // Action durations (in seconds)
    this.pickupDuration = config.pickupDuration || 1.0;
    this.dropoffDuration = config.dropoffDuration || 1.0;
    this.actionTimer = 0;

    // Callbacks
    this.onComplete = config.onComplete || null;
    this.onFail = config.onFail || null;
    this.onCancel = config.onCancel || null;
  }

  /**
   * Start the task
   * @param {string} npcId - ID of assigned NPC
   * @returns {boolean} Success
   */
  start(npcId) {
    if (this.status !== HaulTaskStatus.PENDING) {
      return false;
    }

    this.assignedNpcId = npcId;
    this.status = HaulTaskStatus.TRAVELING_TO_PICKUP;
    this.startedAt = Date.now();
    return true;
  }

  /**
   * Update task progress
   * @param {number} deltaTime - Time elapsed in seconds
   * @param {object} context - Game context with NPC position, etc.
   * @returns {string} Current status
   */
  update(deltaTime, context) {
    if (this.isTerminal()) {
      return this.status;
    }

    switch (this.status) {
      case HaulTaskStatus.TRAVELING_TO_PICKUP:
        this._updateTravelToPickup(context);
        break;

      case HaulTaskStatus.PICKING_UP:
        this._updatePickingUp(deltaTime, context);
        break;

      case HaulTaskStatus.TRAVELING_TO_DROPOFF:
        this._updateTravelToDropoff(context);
        break;

      case HaulTaskStatus.DROPPING_OFF:
        this._updateDroppingOff(deltaTime, context);
        break;
    }

    return this.status;
  }

  /**
   * Check if NPC has arrived at pickup location
   * @private
   */
  _updateTravelToPickup(context) {
    if (!context.npcPosition || !this.source.position) return;

    const distance = this._calculateDistance(context.npcPosition, this.source.position);
    if (distance <= (context.arrivalThreshold || 1.5)) {
      this.status = HaulTaskStatus.PICKING_UP;
      this.actionTimer = 0;
    }
  }

  /**
   * Handle pickup animation/timer
   * @private
   */
  _updatePickingUp(deltaTime, context) {
    this.actionTimer += deltaTime;

    if (this.actionTimer >= this.pickupDuration) {
      // Actually pick up the resource
      if (context.stockpileManager && this.source.stockpileId) {
        const stockpile = context.stockpileManager.getStockpile(this.source.stockpileId);
        if (stockpile && this.source.position) {
          const result = stockpile.withdraw(
            this.source.position.x,
            this.source.position.y,
            this.quantity,
            this.assignedNpcId
          );

          if (result) {
            this.quantityPickedUp = result.quantity;
          } else {
            this._fail('Resource no longer available');
            return;
          }
        }
      } else {
        // Simulated pickup for testing
        this.quantityPickedUp = this.quantity;
      }

      this.status = HaulTaskStatus.TRAVELING_TO_DROPOFF;
      this.actionTimer = 0;
    }
  }

  /**
   * Check if NPC has arrived at dropoff location
   * @private
   */
  _updateTravelToDropoff(context) {
    if (!context.npcPosition || !this.destination.position) return;

    const distance = this._calculateDistance(context.npcPosition, this.destination.position);
    if (distance <= (context.arrivalThreshold || 1.5)) {
      this.status = HaulTaskStatus.DROPPING_OFF;
      this.actionTimer = 0;
    }
  }

  /**
   * Handle dropoff animation/timer
   * @private
   */
  _updateDroppingOff(deltaTime, context) {
    this.actionTimer += deltaTime;

    if (this.actionTimer >= this.dropoffDuration) {
      // Deliver to construction site
      if (context.constructionManager && this.destination.siteId) {
        const site = context.constructionManager.getSite(this.destination.siteId);
        if (site) {
          const delivered = site.deliverMaterial(
            this.resourceType,
            this.quantityPickedUp,
            this.destination.blockKey
          );

          if (!delivered) {
            this._fail('Could not deliver materials');
            return;
          }
        }
      }

      this._complete();
    }
  }

  /**
   * Calculate distance between two positions
   * @private
   */
  _calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = (pos1.z || 0) - (pos2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Mark task as completed
   * @private
   */
  _complete() {
    this.status = HaulTaskStatus.COMPLETED;
    this.completedAt = Date.now();

    if (this.onComplete) {
      this.onComplete(this);
    }
  }

  /**
   * Mark task as failed
   * @private
   */
  _fail(reason) {
    this.status = HaulTaskStatus.FAILED;
    this.failReason = reason;
    this.completedAt = Date.now();

    if (this.onFail) {
      this.onFail(this, reason);
    }
  }

  /**
   * Cancel the task
   * @param {string} reason - Reason for cancellation
   * @returns {boolean} Success
   */
  cancel(reason = 'Cancelled') {
    if (this.isTerminal()) {
      return false;
    }

    this.status = HaulTaskStatus.CANCELLED;
    this.cancelReason = reason;
    this.completedAt = Date.now();

    if (this.onCancel) {
      this.onCancel(this, reason);
    }

    return true;
  }

  /**
   * Check if task is in a terminal state
   * @returns {boolean}
   */
  isTerminal() {
    return this.status === HaulTaskStatus.COMPLETED ||
           this.status === HaulTaskStatus.CANCELLED ||
           this.status === HaulTaskStatus.FAILED;
  }

  /**
   * Check if task is active (started but not terminal)
   * @returns {boolean}
   */
  isActive() {
    return this.status !== HaulTaskStatus.PENDING && !this.isTerminal();
  }

  /**
   * Get the current target position for pathfinding
   * @returns {{x: number, y: number, z: number} | null}
   */
  getCurrentTargetPosition() {
    switch (this.status) {
      case HaulTaskStatus.PENDING:
      case HaulTaskStatus.TRAVELING_TO_PICKUP:
      case HaulTaskStatus.PICKING_UP:
        return this.source.position;

      case HaulTaskStatus.TRAVELING_TO_DROPOFF:
      case HaulTaskStatus.DROPPING_OFF:
        return this.destination.position;

      default:
        return null;
    }
  }

  /**
   * Check if NPC is carrying resources
   * @returns {boolean}
   */
  isCarrying() {
    return this.status === HaulTaskStatus.TRAVELING_TO_DROPOFF ||
           this.status === HaulTaskStatus.DROPPING_OFF;
  }

  /**
   * Get task duration so far
   * @returns {number} Duration in milliseconds
   */
  getDuration() {
    if (!this.startedAt) return 0;
    const endTime = this.completedAt || Date.now();
    return endTime - this.startedAt;
  }

  /**
   * Export task data
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      resourceType: this.resourceType,
      quantity: this.quantity,
      quantityPickedUp: this.quantityPickedUp,
      source: this.source,
      destination: this.destination,
      status: this.status,
      priority: this.priority,
      assignedNpcId: this.assignedNpcId,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt
    };
  }

  /**
   * Import task data
   * @param {object} data
   * @returns {HaulTask}
   */
  static fromJSON(data) {
    const task = new HaulTask({
      id: data.id,
      resourceType: data.resourceType,
      quantity: data.quantity,
      sourceStockpileId: data.source?.stockpileId,
      sourcePosition: data.source?.position,
      sourceSlotKey: data.source?.slotKey,
      destinationSiteId: data.destination?.siteId,
      destinationPosition: data.destination?.position,
      destinationBlockKey: data.destination?.blockKey,
      priority: data.priority
    });

    task.status = data.status;
    task.assignedNpcId = data.assignedNpcId;
    task.quantityPickedUp = data.quantityPickedUp || 0;
    task.createdAt = data.createdAt;
    task.startedAt = data.startedAt;
    task.completedAt = data.completedAt;

    return task;
  }
}
