/**
 * SaveMigration.js - Version migration system for save file compatibility
 *
 * Handles:
 * - Save file version upgrades
 * - Backward compatibility
 * - Schema transformations
 * - Data migration strategies
 */

class SaveMigration {
  /**
   * Current save format version
   */
  static CURRENT_VERSION = 1;

  /**
   * Migration strategies by version
   */
  static MIGRATIONS = {
    // Future migrations go here
    // 1: { from: 1, to: 2, migrate: (data) => { ... } }
  };

  /**
   * Migrate save data to current version
   * @param {Object} data - Save data (potentially old version)
   * @returns {Object} {success, data, migratedFrom, warnings}
   */
  static migrateToCurrentVersion(data) {
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'Invalid save data'
      };
    }

    const saveVersion = data.version || 1;
    const warnings = [];

    // Already current version
    if (saveVersion === this.CURRENT_VERSION) {
      return {
        success: true,
        data,
        migratedFrom: saveVersion,
        warnings: []
      };
    }

    let migratedData = { ...data };

    // Migrate through versions
    let currentVersion = saveVersion;

    while (currentVersion < this.CURRENT_VERSION) {
      const migration = this.MIGRATIONS[currentVersion];

      if (!migration) {
        warnings.push(`No migration found from version ${currentVersion}`);
        break;
      }

      try {
        migratedData = migration.migrate(migratedData);
        migratedData.version = migration.to;
        currentVersion = migration.to;
      } catch (err) {
        return {
          success: false,
          error: `Migration from v${saveVersion} to v${this.CURRENT_VERSION} failed: ${err.message}`
        };
      }
    }

    return {
      success: true,
      data: migratedData,
      migratedFrom: saveVersion,
      migratedTo: this.CURRENT_VERSION,
      warnings
    };
  }

  /**
   * Check if save needs migration
   * @param {Object} data - Save data to check
   * @returns {boolean}
   */
  static needsMigration(data) {
    if (!data) return false;
    const version = data.version || 1;
    return version < this.CURRENT_VERSION;
  }

  /**
   * Get migration path for version
   * @param {number} fromVersion - Starting version
   * @returns {Array} Array of version transitions needed
   */
  static getMigrationPath(fromVersion) {
    const path = [];

    let current = fromVersion;
    while (current < this.CURRENT_VERSION) {
      const migration = this.MIGRATIONS[current];
      if (!migration) break;

      path.push({
        from: migration.from,
        to: migration.to
      });

      current = migration.to;
    }

    return path;
  }

  /**
   * Register new migration
   * @param {number} fromVersion - Source version
   * @param {number} toVersion - Target version
   * @param {Function} migrationFn - Migration function(data) => newData
   */
  static registerMigration(fromVersion, toVersion, migrationFn) {
    if (fromVersion >= toVersion) {
      throw new Error('fromVersion must be less than toVersion');
    }

    if (typeof migrationFn !== 'function') {
      throw new Error('migrationFn must be a function');
    }

    this.MIGRATIONS[fromVersion] = {
      from: fromVersion,
      to: toVersion,
      migrate: migrationFn
    };
  }

  /**
   * Version history with descriptions
   */
  static VERSION_DESCRIPTIONS = {
    1: 'Initial save format with all 13 modules'
  };

  /**
   * Get version description
   * @param {number} version - Version to describe
   * @returns {string}
   */
  static getVersionDescription(version) {
    return this.VERSION_DESCRIPTIONS[version] || 'Unknown version';
  }

  /**
   * Get all available versions
   * @returns {Array} Sorted array of version numbers
   */
  static getAvailableVersions() {
    const versions = Object.keys(this.VERSION_DESCRIPTIONS)
      .map(v => parseInt(v))
      .sort((a, b) => a - b);

    return versions;
  }
}

module.exports = SaveMigration;
