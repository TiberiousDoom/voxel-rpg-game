/**
 * SaveMigrationIntegration.js
 * Integration layer between SaveVersionManager and existing save system
 *
 * This module handles:
 * - Automatic save version detection
 * - v1 → v2 migration during load
 * - Retroactive point calculation
 * - Backup creation before migration
 */

/* eslint-disable no-console */
import { SaveVersionManager, SAVE_VERSION } from './SaveVersionManager';

/**
 * Integrate SaveVersionManager with game load process
 * This function should be called AFTER loading save data but BEFORE deserializing
 *
 * @param {object} saveData - The loaded save data
 * @returns {object} { success: boolean, data: object, wasMigrated: boolean, errors: string[] }
 */
export function migrateSaveIfNeeded(saveData) {
  console.log('[SaveMigrationIntegration] Checking save version...');

  // Detect version
  const version = SaveVersionManager.detectVersion(saveData);
  console.log(`[SaveMigrationIntegration] Save version detected: v${version}`);

  // Check if migration needed
  if (!SaveVersionManager.needsMigration(saveData)) {
    console.log('[SaveMigrationIntegration] Save is current version, no migration needed');
    return {
      success: true,
      data: saveData,
      wasMigrated: false,
      errors: [],
    };
  }

  console.log('[SaveMigrationIntegration] Migration required, starting safe migration...');

  // Perform safe migration
  const result = SaveVersionManager.safeMigrate(saveData);

  if (!result.success) {
    console.error('[SaveMigrationIntegration] Migration failed:', result.errors);
    return {
      success: false,
      data: result.backup, // Return original data
      wasMigrated: false,
      errors: result.errors,
    };
  }

  console.log('[SaveMigrationIntegration] Migration successful!');

  return {
    success: true,
    data: result.data,
    wasMigrated: true,
    backup: result.backup,
    errors: [],
  };
}

/**
 * Apply character data to game state after deserialization
 * This updates the game store with migrated character data
 *
 * @param {object} migratedSave - The migrated save data
 * @param {object} gameStore - The Zustand game store
 */
export function applyCharacterDataToStore(migratedSave, gameStore) {
  if (!migratedSave.character) {
    console.log('[SaveMigrationIntegration] No character data in save');
    return;
  }

  console.log('[SaveMigrationIntegration] Applying character data to game store...');

  // Update character state
  gameStore.setState((state) => ({
    character: {
      ...state.character,
      ...migratedSave.character,
    },
  }));

  // If retroactive points were granted, notify player
  if (migratedSave.character.attributePoints > 0 || migratedSave.character.skillPoints > 0) {
    const level = migratedSave.player?.level || 1;
    console.log(
      `[SaveMigrationIntegration] Retroactive points granted for level ${level}:`,
      `${migratedSave.character.attributePoints} attribute, ${migratedSave.character.skillPoints} skill`
    );

    // Store migration notification for UI
    if (typeof window !== 'undefined') {
      window.__characterSystemMigration = {
        wasV1Save: true,
        level,
        attributePoints: migratedSave.character.attributePoints,
        skillPoints: migratedSave.character.skillPoints,
      };
    }
  }

  console.log('[SaveMigrationIntegration] Character data applied successfully');
}

/**
 * Check if migration notification should be shown
 * @returns {object|null} Migration info or null
 */
export function getMigrationNotification() {
  if (typeof window === 'undefined') return null;

  const notification = window.__characterSystemMigration;
  if (!notification) return null;

  // Clear notification after reading
  delete window.__characterSystemMigration;

  return notification;
}

/**
 * Prepare save data for saving (ensure v2 structure)
 * This ensures character data is included when saving
 *
 * @param {object} saveData - The save data to prepare
 * @param {object} gameStore - The Zustand game store
 * @returns {object} Prepared save data with character system
 */
export function prepareSaveDataWithCharacter(saveData, gameStore) {
  const state = gameStore.getState();

  // Ensure version field
  if (!saveData.version) {
    saveData.version = SAVE_VERSION.CURRENT;
  }

  // Ensure character data
  if (!saveData.character && state.character) {
    saveData.character = state.character;
  }

  return saveData;
}

/**
 * Validate save data structure before saving
 * @param {object} saveData - The save data to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateSaveBeforeSaving(saveData) {
  return SaveVersionManager.validate(saveData);
}

/**
 * Create emergency backup of current save
 * @param {string} slotName - Save slot name
 * @param {object} saveData - Save data to backup
 * @returns {boolean} Success
 */
export function createEmergencyBackup(slotName, saveData) {
  try {
    const backupKey = `voxel-rpg-backup-${slotName}-${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(saveData));

    console.log(`[SaveMigrationIntegration] Emergency backup created: ${backupKey}`);

    // Keep only last 3 backups per slot
    cleanupOldBackups(slotName);

    return true;
  } catch (err) {
    console.error('[SaveMigrationIntegration] Failed to create emergency backup:', err);
    return false;
  }
}

/**
 * Clean up old backups (keep only last 3)
 * @param {string} slotName - Save slot name
 */
function cleanupOldBackups(slotName) {
  try {
    const backups = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`voxel-rpg-backup-${slotName}-`)) {
        const timestamp = parseInt(key.split('-').pop(), 10);
        backups.push({ key, timestamp });
      }
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp - a.timestamp);

    // Remove old backups (keep only 3 most recent)
    for (let i = 3; i < backups.length; i++) {
      localStorage.removeItem(backups[i].key);
      console.log(`[SaveMigrationIntegration] Removed old backup: ${backups[i].key}`);
    }
  } catch (err) {
    console.error('[SaveMigrationIntegration] Failed to cleanup old backups:', err);
  }
}

/**
 * Restore from emergency backup
 * @param {string} slotName - Save slot name
 * @returns {object|null} Restored save data or null
 */
export function restoreFromBackup(slotName) {
  try {
    const backups = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`voxel-rpg-backup-${slotName}-`)) {
        const timestamp = parseInt(key.split('-').pop(), 10);
        backups.push({ key, timestamp });
      }
    }

    if (backups.length === 0) {
      console.log('[SaveMigrationIntegration] No backups found');
      return null;
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp - a.timestamp);

    // Restore most recent backup
    const latestBackup = backups[0];
    const backupData = localStorage.getItem(latestBackup.key);

    if (!backupData) {
      console.error('[SaveMigrationIntegration] Backup data is null');
      return null;
    }

    const saveData = JSON.parse(backupData);
    console.log(`[SaveMigrationIntegration] Restored from backup: ${latestBackup.key}`);

    return saveData;
  } catch (err) {
    console.error('[SaveMigrationIntegration] Failed to restore from backup:', err);
    return null;
  }
}

/**
 * Get migration statistics for debugging
 * @returns {object} Migration stats
 */
export function getMigrationStats() {
  const stats = {
    v1Saves: 0,
    v2Saves: 0,
    unknownSaves: 0,
    backupCount: 0,
  };

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (!key) continue;

      // Count backups
      if (key.startsWith('voxel-rpg-backup-')) {
        stats.backupCount++;
        continue;
      }

      // Count saves by version
      if (key.startsWith('voxel-rpg-save-')) {
        try {
          const saveData = JSON.parse(localStorage.getItem(key) || '{}');
          const version = SaveVersionManager.detectVersion(saveData);

          if (version === 1) stats.v1Saves++;
          else if (version === 2) stats.v2Saves++;
          else stats.unknownSaves++;
        } catch (err) {
          stats.unknownSaves++;
        }
      }
    }
  } catch (err) {
    console.error('[SaveMigrationIntegration] Failed to get migration stats:', err);
  }

  return stats;
}

const SaveMigrationIntegration = {
  migrateSaveIfNeeded,
  applyCharacterDataToStore,
  getMigrationNotification,
  prepareSaveDataWithCharacter,
  validateSaveBeforeSaving,
  createEmergencyBackup,
  restoreFromBackup,
  getMigrationStats,
};

export default SaveMigrationIntegration;
