/**
 * SharedResourceManager - Manages resources across game modes
 * Extends StorageManager functionality
 */
class SharedResourceManager {
  constructor(storageManager, unifiedState) {
    this.storage = storageManager;
    this.state = unifiedState;

    // Track resource sources
    this.resourceSources = new Map(); // Map<resource, Map<source, amount>>
  }

  /**
   * Add resources from expedition
   * @param {string} resource - Resource type
   * @param {number} amount - Amount to add
   * @param {string} expeditionId - Source expedition ID
   */
  addResourceFromExpedition(resource, amount, expeditionId) {
    // Add to storage
    this.storage.addResource(resource, amount);

    // Update shared state
    if (this.state.sharedResources[resource] !== undefined) {
      this.state.sharedResources[resource] += amount;
    }

    // Track source
    this._trackSource(resource, `expedition:${expeditionId}`, amount);
  }

  /**
   * Check if can afford expedition requirements
   * @param {Object} requirements - { resource: amount }
   * @returns {Object} { canAfford: boolean, missing: Object }
   */
  canAffordExpedition(requirements) {
    const missing = {};
    let canAfford = true;

    for (const [resource, required] of Object.entries(requirements)) {
      const available = this.storage.getResource(resource);
      if (available < required) {
        canAfford = false;
        missing[resource] = required - available;
      }
    }

    return { canAfford, missing };
  }

  /**
   * Consume resources for expedition
   * @param {Object} requirements - { resource: amount }
   * @returns {boolean} Success
   */
  consumeForExpedition(requirements) {
    const check = this.canAffordExpedition(requirements);
    if (!check.canAfford) {
      return false;
    }

    for (const [resource, amount] of Object.entries(requirements)) {
      this.storage.removeResource(resource, amount);
      if (this.state.sharedResources[resource] !== undefined) {
        this.state.sharedResources[resource] -= amount;
      }
    }

    return true;
  }

  /**
   * Sync resources from storage to unified state
   */
  syncResources() {
    const resources = this.storage.getStorage();
    for (const [resource, amount] of Object.entries(resources)) {
      if (this.state.sharedResources[resource] !== undefined) {
        this.state.sharedResources[resource] = amount;
      }
    }
  }

  /**
   * Get resource statistics
   * @returns {Object} Stats by source
   */
  getResourceStats() {
    const stats = {
      total: { ...this.state.sharedResources },
      sources: {}
    };

    for (const [resource, sources] of this.resourceSources.entries()) {
      stats.sources[resource] = Object.fromEntries(sources);
    }

    return stats;
  }

  /**
   * Track resource source
   * @private
   */
  _trackSource(resource, source, amount) {
    if (!this.resourceSources.has(resource)) {
      this.resourceSources.set(resource, new Map());
    }
    const sources = this.resourceSources.get(resource);
    const current = sources.get(source) || 0;
    sources.set(source, current + amount);
  }
}

export default SharedResourceManager;
