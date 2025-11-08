/**
 * Module Orchestrator
 *
 * Coordinates interactions between the four game modules:
 * 1. Foundation (Core game state - buildings, players, terrain)
 * 2. Building Types & Progression (Building definitions, visual assets, tier progression)
 * 3. Resource Economy (Resources, crafting, economy mechanics)
 * 4. Territory & Town Planning (Territory control, town management, NPC systems)
 *
 * The orchestrator ensures:
 * - Modules maintain clear separation of concerns
 * - Cross-module interactions are validated and logged
 * - Single source of truth for critical data (shared/config.js)
 * - Proper initialization order and dependencies
 */

/**
 * ModuleOrchestrator - Manages interactions between game modules
 */
class ModuleOrchestrator {
  constructor() {
    this.modules = new Map();
    this.initialized = false;
    this.validationErrors = [];
    this.logs = [];
  }

  /**
   * Register a module with the orchestrator
   * @param {string} moduleName - Name of the module (FOUNDATION, MODULE2, MODULE3, MODULE4)
   * @param {Object} moduleExports - The module's exports/interface
   * @returns {Object} Registration result { success, message }
   */
  registerModule(moduleName, moduleExports) {
    if (!moduleName || !moduleExports) {
      const error = `Cannot register module: Missing name or exports`;
      this.validationErrors.push(error);
      return { success: false, message: error };
    }

    // Validate module has required interface
    const requiredMethods = {
      FOUNDATION: ['getBuilding', 'addBuilding', 'removeBuilding'],
      MODULE2: ['getBuildingDefinition', 'getTierDefinition'],
      MODULE3: ['checkResourceAvailability', 'consumeResources'],
      MODULE4: ['createTerritory', 'assignNPC'],
    };

    const required = requiredMethods[moduleName] || [];
    const missing = required.filter(method => typeof moduleExports[method] !== 'function');

    if (missing.length > 0) {
      const error = `Module ${moduleName} missing required methods: ${missing.join(', ')}`;
      this.validationErrors.push(error);
      return { success: false, message: error };
    }

    this.modules.set(moduleName, moduleExports);
    this.log(`Module registered: ${moduleName}`);
    return { success: true, message: `${moduleName} registered successfully` };
  }

  /**
   * Initialize all registered modules
   * Validates module initialization order and dependencies
   * @returns {Object} Initialization result { success, details }
   */
  initializeModules() {
    // Required initialization order (dependency chain)
    const initOrder = ['FOUNDATION', 'MODULE2', 'MODULE3', 'MODULE4'];

    const details = {
      initialized: [],
      failed: [],
      missing: [],
    };

    for (const moduleName of initOrder) {
      if (!this.modules.has(moduleName)) {
        details.missing.push(moduleName);
        const error = `Required module not registered: ${moduleName}`;
        this.validationErrors.push(error);
        continue;
      }

      const module = this.modules.get(moduleName);

      // Call module's init if it exists
      if (typeof module.initialize === 'function') {
        try {
          const initResult = module.initialize();
          if (initResult && initResult.success === false) {
            details.failed.push(`${moduleName}: ${initResult.message}`);
            this.validationErrors.push(`Failed to initialize ${moduleName}: ${initResult.message}`);
          } else {
            details.initialized.push(moduleName);
            this.log(`Module initialized: ${moduleName}`);
          }
        } catch (error) {
          details.failed.push(`${moduleName}: ${error.message}`);
          this.validationErrors.push(`Error initializing ${moduleName}: ${error.message}`);
        }
      } else {
        details.initialized.push(moduleName);
      }
    }

    const success = details.failed.length === 0 && details.missing.length === 0;
    this.initialized = success;

    return {
      success,
      details,
      message: success ? 'All modules initialized' : 'Some modules failed to initialize',
    };
  }

  /**
   * Validate that a building can be placed in Module 2
   * Cross-check with Module 1 (Foundation) for conflicts
   * Cross-check with Module 3 (Resource Economy) for costs
   * Cross-check with Module 4 (Territory) for territory restrictions
   *
   * @param {Object} buildingData - { type, position, territoryId }
   * @returns {Object} Validation result { valid, errors }
   */
  validateBuildingPlacement(buildingData) {
    const errors = [];

    // Check Module 2 for valid building type
    if (this.modules.has('MODULE2')) {
      const module2 = this.modules.get('MODULE2');
      if (typeof module2.getBuildingDefinition === 'function') {
        const def = module2.getBuildingDefinition(buildingData.type);
        if (!def) {
          errors.push(`Invalid building type: ${buildingData.type}`);
        }
      }
    }

    // Check Module 1 for position conflicts
    if (this.modules.has('FOUNDATION')) {
      const foundation = this.modules.get('FOUNDATION');
      if (typeof foundation.checkPositionConflict === 'function') {
        const conflict = foundation.checkPositionConflict(buildingData.position);
        if (conflict) {
          errors.push(`Position conflict: ${conflict}`);
        }
      }
    }

    // Check Module 3 for resource availability
    if (this.modules.has('MODULE3')) {
      const module3 = this.modules.get('MODULE3');
      if (typeof module3.getBuildingCost === 'function') {
        const cost = module3.getBuildingCost(buildingData.type);
        if (cost && typeof module3.checkResourceAvailability === 'function') {
          const hasResources = module3.checkResourceAvailability(cost);
          if (!hasResources) {
            errors.push(`Insufficient resources for ${buildingData.type}`);
          }
        }
      }
    }

    // Check Module 4 for territory restrictions
    if (this.modules.has('MODULE4') && buildingData.territoryId) {
      const module4 = this.modules.get('MODULE4');
      if (typeof module4.isPositionInTerritory === 'function') {
        const inTerritory = module4.isPositionInTerritory(buildingData.position, buildingData.territoryId);
        if (!inTerritory) {
          errors.push(`Position not in territory ${buildingData.territoryId}`);
        }
      }
    }

    this.log(`Building placement validation: ${errors.length} errors`);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate tier progression across modules
   * Checks that building, resource, and time requirements are met
   *
   * @param {string} tier - Tier to unlock
   * @param {Object} progressData - Progress metrics
   * @returns {Object} Validation result { canUnlock, progress, details }
   */
  validateTierProgression(tier, progressData) {
    // Module 3 is the source of truth for tier progression
    if (!this.modules.has('MODULE3')) {
      const error = 'Module 3 (Resource Economy) not initialized';
      this.validationErrors.push(error);
      return { canUnlock: false, error };
    }

    const module3 = this.modules.get('MODULE3');
    if (typeof module3.checkTierUnlockConditions !== 'function') {
      const error = 'Module 3 missing checkTierUnlockConditions method';
      this.validationErrors.push(error);
      return { canUnlock: false, error };
    }

    try {
      const result = module3.checkTierUnlockConditions(tier, progressData);
      this.log(`Tier progression check for ${tier}: ${result.canUnlock ? 'PASS' : 'FAIL'}`);
      return result;
    } catch (error) {
      const errorMsg = `Error checking tier progression: ${error.message}`;
      this.validationErrors.push(errorMsg);
      return { canUnlock: false, error: errorMsg };
    }
  }

  /**
   * Process building construction across all modules
   * Updates state in each module that needs to know about the building
   *
   * @param {Object} buildingData - { type, position, territoryId, owner }
   * @returns {Object} Result { success, buildingId, errors }
   */
  processBuildingConstruction(buildingData) {
    const errors = [];
    let buildingId = null;

    // Validate first
    const validation = this.validateBuildingPlacement(buildingData);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        message: 'Building placement validation failed',
      };
    }

    // Module 3: Consume resources
    if (this.modules.has('MODULE3')) {
      const module3 = this.modules.get('MODULE3');
      if (typeof module3.consumeResources === 'function') {
        try {
          const cost = module3.getBuildingCost(buildingData.type);
          const result = module3.consumeResources(cost);
          if (!result.success) {
            errors.push(`Failed to consume resources: ${result.error}`);
          } else {
            this.log(`Resources consumed for ${buildingData.type}`);
          }
        } catch (error) {
          errors.push(`Error consuming resources: ${error.message}`);
        }
      }
    }

    // Module 1: Add building to world
    if (this.modules.has('FOUNDATION')) {
      const foundation = this.modules.get('FOUNDATION');
      if (typeof foundation.addBuilding === 'function') {
        try {
          const result = foundation.addBuilding(buildingData);
          if (result && result.id) {
            buildingId = result.id;
            this.log(`Building added to foundation: ${buildingId}`);
          } else {
            errors.push('Failed to add building to foundation');
          }
        } catch (error) {
          errors.push(`Error adding building to foundation: ${error.message}`);
        }
      }
    }

    // Module 4: Register with territory if applicable
    if (this.modules.has('MODULE4') && buildingData.territoryId && buildingId) {
      const module4 = this.modules.get('MODULE4');
      if (typeof module4.registerBuildingInTerritory === 'function') {
        try {
          const result = module4.registerBuildingInTerritory(buildingId, buildingData.territoryId);
          if (!result.success) {
            errors.push(`Failed to register building in territory: ${result.error}`);
          } else {
            this.log(`Building registered in territory`);
          }
        } catch (error) {
          errors.push(`Error registering building in territory: ${error.message}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      buildingId,
      errors,
      message: errors.length === 0 ? 'Building construction successful' : 'Building construction completed with errors',
    };
  }

  /**
   * Get module status report
   * @returns {Object} Status report with all modules and any errors
   */
  getStatus() {
    return {
      initialized: this.initialized,
      modulesRegistered: Array.from(this.modules.keys()),
      validationErrors: this.validationErrors,
      recentLogs: this.logs.slice(-20), // Last 20 logs
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log a message
   * @param {string} message - Message to log
   */
  log(message) {
    const timestamp = new Date().toISOString();
    this.logs.push(`[${timestamp}] ${message}`);

    // Keep logs manageable (max 1000)
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }
  }

  /**
   * Clear validation errors
   */
  clearErrors() {
    this.validationErrors = [];
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }
}

// Create and export singleton instance
const orchestrator = new ModuleOrchestrator();

export default orchestrator;
export { ModuleOrchestrator };
