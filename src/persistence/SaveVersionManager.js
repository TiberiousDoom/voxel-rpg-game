/**
 * SaveVersionManager.js
 * Handles save file versioning and migration between versions
 *
 * CRITICAL SYSTEM: Protects player save data during character system rollout
 *
 * Features:
 * - Automatic version detection
 * - v1 → v2 migration with retroactive attribute/skill points
 * - Automatic backups before migration
 * - Rollback capability on migration failure
 * - Validation at every step
 */

const SAVE_VERSION = {
  V1: 1, // Original save format (no character system)
  V2: 2, // Character system with attributes and skills
  CURRENT: 2,
};

const POINTS_PER_LEVEL = {
  ATTRIBUTE_POINTS: 5,
  SKILL_POINTS: 2,
};

/**
 * Default character data structure for v2 saves
 */
const getDefaultCharacterData = () => ({
  attributes: {
    leadership: 0,
    construction: 0,
    exploration: 0,
    combat: 0,
    magic: 0,
    endurance: 0,
  },
  attributePoints: 0,
  skills: {
    activeNodes: [],
    unlockedNodes: [],
  },
  skillPoints: 0,
});

/**
 * SaveVersionManager class
 * Handles all save file versioning and migration logic
 */
class SaveVersionManager {
  /**
   * Detect save file version
   * @param {object} saveData - The save data to check
   * @returns {number} Version number
   */
  static detectVersion(saveData) {
    if (!saveData || typeof saveData !== 'object') {
      return SAVE_VERSION.V1; // Assume v1 if invalid
    }

    // Check for explicit version field
    if (saveData.version) {
      return saveData.version;
    }

    // Check for v2 character data
    if (saveData.character && saveData.character.attributes) {
      return SAVE_VERSION.V2;
    }

    // Default to v1
    return SAVE_VERSION.V1;
  }

  /**
   * Check if save needs migration
   * @param {object} saveData - The save data to check
   * @returns {boolean} True if migration needed
   */
  static needsMigration(saveData) {
    const currentVersion = this.detectVersion(saveData);
    return currentVersion < SAVE_VERSION.CURRENT;
  }

  /**
   * Migrate save data to current version
   * @param {object} saveData - The save data to migrate
   * @returns {object} Migrated save data
   */
  static migrate(saveData) {
    const currentVersion = this.detectVersion(saveData);

    if (currentVersion === SAVE_VERSION.CURRENT) {
      return saveData; // Already current version
    }

    console.log(`[SaveVersionManager] Migrating save from v${currentVersion} to v${SAVE_VERSION.CURRENT}`);

    let migratedData = { ...saveData };

    // Migrate v1 → v2
    if (currentVersion === SAVE_VERSION.V1) {
      migratedData = this.migrateV1ToV2(migratedData);
    }

    // Future migrations would go here (v2 → v3, etc.)

    return migratedData;
  }

  /**
   * Migrate v1 save to v2 (add character system)
   * @param {object} v1Save - The v1 save data
   * @returns {object} v2 save data
   */
  static migrateV1ToV2(v1Save) {
    console.log('[SaveVersionManager] Migrating v1 → v2: Adding character system');

    // Create base v2 save structure
    const v2Save = {
      ...v1Save,
      version: SAVE_VERSION.V2,
      character: getDefaultCharacterData(),
    };

    // Calculate retroactive attribute and skill points based on player level
    const playerLevel = v1Save.player?.level || 1;
    v2Save.character.attributePoints = playerLevel * POINTS_PER_LEVEL.ATTRIBUTE_POINTS;
    v2Save.character.skillPoints = playerLevel * POINTS_PER_LEVEL.SKILL_POINTS;

    console.log(`[SaveVersionManager] Granted retroactive points for level ${playerLevel}:`);
    console.log(`  - Attribute Points: ${v2Save.character.attributePoints}`);
    console.log(`  - Skill Points: ${v2Save.character.skillPoints}`);

    // Initialize derived stats (will be recalculated when game loads)
    if (v2Save.player) {
      // Preserve existing player data, add character reference
      v2Save.player.characterDataVersion = SAVE_VERSION.V2;
    }

    return v2Save;
  }

  /**
   * Validate save data structure
   * @param {object} saveData - The save data to validate
   * @returns {object} { valid: boolean, errors: string[] }
   */
  static validate(saveData) {
    const errors = [];

    // Check basic structure
    if (!saveData || typeof saveData !== 'object') {
      errors.push('Save data is not a valid object');
      return { valid: false, errors };
    }

    // Check version
    const version = this.detectVersion(saveData);
    if (version < SAVE_VERSION.V1 || version > SAVE_VERSION.CURRENT) {
      errors.push(`Invalid save version: ${version}`);
    }

    // Validate v2 structure
    if (version === SAVE_VERSION.V2) {
      if (!saveData.character) {
        errors.push('Missing character data in v2 save');
      } else {
        // Validate character structure
        if (!saveData.character.attributes) {
          errors.push('Missing character attributes');
        } else {
          const requiredAttributes = ['leadership', 'construction', 'exploration', 'combat', 'magic', 'endurance'];
          requiredAttributes.forEach((attr) => {
            if (typeof saveData.character.attributes[attr] !== 'number') {
              errors.push(`Missing or invalid attribute: ${attr}`);
            }
          });
        }

        if (typeof saveData.character.attributePoints !== 'number') {
          errors.push('Missing or invalid attributePoints');
        }

        if (!saveData.character.skills) {
          errors.push('Missing skills data');
        } else {
          if (!Array.isArray(saveData.character.skills.activeNodes)) {
            errors.push('skills.activeNodes must be an array');
          }
          if (!Array.isArray(saveData.character.skills.unlockedNodes)) {
            errors.push('skills.unlockedNodes must be an array');
          }
        }

        if (typeof saveData.character.skillPoints !== 'number') {
          errors.push('Missing or invalid skillPoints');
        }
      }
    }

    // Validate player data
    if (!saveData.player) {
      errors.push('Missing player data');
    } else {
      if (typeof saveData.player.level !== 'number') {
        errors.push('Missing or invalid player level');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create backup of save data
   * @param {object} saveData - The save data to backup
   * @returns {object} Backup copy
   */
  static createBackup(saveData) {
    return JSON.parse(JSON.stringify(saveData));
  }

  /**
   * Migrate and validate save data
   * Safe migration with automatic backup and rollback on failure
   * @param {object} saveData - The save data to migrate
   * @returns {object} { success: boolean, data: object, backup: object, errors: string[] }
   */
  static safeMigrate(saveData) {
    console.log('[SaveVersionManager] Starting safe migration...');

    // Create backup
    const backup = this.createBackup(saveData);
    console.log('[SaveVersionManager] Backup created');

    try {
      // Validate input
      const inputValidation = this.validate(saveData);
      if (!inputValidation.valid) {
        console.warn('[SaveVersionManager] Input validation failed:', inputValidation.errors);
        // Continue anyway - we might be able to fix it through migration
      }

      // Migrate
      const migratedData = this.migrate(saveData);

      // Validate output
      const outputValidation = this.validate(migratedData);
      if (!outputValidation.valid) {
        console.error('[SaveVersionManager] Migration failed validation:', outputValidation.errors);
        return {
          success: false,
          data: backup,
          backup,
          errors: outputValidation.errors,
        };
      }

      console.log('[SaveVersionManager] Migration successful');
      return {
        success: true,
        data: migratedData,
        backup,
        errors: [],
      };
    } catch (error) {
      console.error('[SaveVersionManager] Migration error:', error);
      return {
        success: false,
        data: backup,
        backup,
        errors: [error.message],
      };
    }
  }

  /**
   * Get save version info
   * @param {object} saveData - The save data to check
   * @returns {object} Version information
   */
  static getVersionInfo(saveData) {
    const version = this.detectVersion(saveData);
    const needsMigration = this.needsMigration(saveData);

    return {
      version,
      versionName: this.getVersionName(version),
      current: SAVE_VERSION.CURRENT,
      needsMigration,
      canMigrate: version < SAVE_VERSION.CURRENT,
      description: this.getVersionDescription(version),
    };
  }

  /**
   * Get human-readable version name
   * @param {number} version - Version number
   * @returns {string} Version name
   */
  static getVersionName(version) {
    switch (version) {
      case SAVE_VERSION.V1:
        return 'v1.0 (Original)';
      case SAVE_VERSION.V2:
        return 'v2.0 (Character System)';
      default:
        return `v${version} (Unknown)`;
    }
  }

  /**
   * Get version description
   * @param {number} version - Version number
   * @returns {string} Description
   */
  static getVersionDescription(version) {
    switch (version) {
      case SAVE_VERSION.V1:
        return 'Original save format without character system';
      case SAVE_VERSION.V2:
        return 'Save format with character attributes and skill trees';
      default:
        return 'Unknown save format version';
    }
  }

  /**
   * Calculate retroactive points for a level
   * Useful for showing players what they'll receive
   * @param {number} level - Player level
   * @returns {object} Points breakdown
   */
  static calculateRetroactivePoints(level) {
    return {
      level,
      attributePoints: level * POINTS_PER_LEVEL.ATTRIBUTE_POINTS,
      skillPoints: level * POINTS_PER_LEVEL.SKILL_POINTS,
      breakdown: {
        attributePointsPerLevel: POINTS_PER_LEVEL.ATTRIBUTE_POINTS,
        skillPointsPerLevel: POINTS_PER_LEVEL.SKILL_POINTS,
      },
    };
  }

  /**
   * Check if save data is empty or corrupted
   * @param {object} saveData - The save data to check
   * @returns {boolean} True if empty/corrupted
   */
  static isEmpty(saveData) {
    if (!saveData) return true;
    if (typeof saveData !== 'object') return true;
    if (Object.keys(saveData).length === 0) return true;
    if (!saveData.player) return true;
    return false;
  }

  /**
   * Repair corrupted save data (best effort)
   * @param {object} saveData - Potentially corrupted save data
   * @returns {object} Repaired save data (or default if unrepairable)
   */
  static repair(saveData) {
    console.log('[SaveVersionManager] Attempting to repair save data...');

    // If completely empty, return null (can't repair)
    if (!saveData) {
      console.error('[SaveVersionManager] Cannot repair null save data');
      return null;
    }

    const repaired = { ...saveData };

    // Ensure version field
    if (!repaired.version) {
      repaired.version = this.detectVersion(repaired);
    }

    // Ensure player data
    if (!repaired.player) {
      console.warn('[SaveVersionManager] Missing player data - initializing defaults');
      repaired.player = {
        level: 1,
        xp: 0,
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        stamina: 100,
        maxStamina: 100,
        position: [0, 10, 0],
      };
    }

    // Ensure character data for v2
    if (repaired.version === SAVE_VERSION.V2 && !repaired.character) {
      console.warn('[SaveVersionManager] Missing character data in v2 save - initializing');
      repaired.character = getDefaultCharacterData();
      const points = this.calculateRetroactivePoints(repaired.player.level || 1);
      repaired.character.attributePoints = points.attributePoints;
      repaired.character.skillPoints = points.skillPoints;
    }

    console.log('[SaveVersionManager] Repair complete');
    return repaired;
  }
}

// Export for use in save managers
export {
  SaveVersionManager,
  SAVE_VERSION,
  POINTS_PER_LEVEL,
  getDefaultCharacterData,
};
