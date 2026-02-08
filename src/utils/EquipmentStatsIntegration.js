/**
 * EquipmentStatsIntegration.js
 * Integration between equipment system and character-derived stats
 *
 * This module ensures equipment changes trigger stat recalculation
 * with the new attribute-based system
 */

import { calculateDerivedStats } from '../modules/character/CharacterSystem';

/**
 * Recalculate player stats when equipment changes
 * This should be called whenever equipment is equipped/unequipped
 *
 * @param {object} gameStore - The Zustand game store
 */
export function recalculateStatsAfterEquipmentChange(gameStore) {
  const state = gameStore.getState();

  // Calculate new derived stats
  const derivedStats = calculateDerivedStats(
    state.character,
    state.player,
    state.equipment
  );

  // Update player stats (but preserve current health/mana/stamina values)
  gameStore.setState({
    player: {
      ...state.player,
      // Update max values
      maxHealth: derivedStats.maxHealth,
      maxMana: derivedStats.maxMana,
      maxStamina: derivedStats.maxStamina,

      // Clamp current values to new max
      health: Math.min(state.player.health, derivedStats.maxHealth),
      mana: Math.min(state.player.mana, derivedStats.maxMana),
      stamina: Math.min(state.player.stamina, derivedStats.maxStamina),

      // Update other stats
      damage: derivedStats.damage,
      defense: derivedStats.defense,
      critChance: derivedStats.critChance,
      speed: derivedStats.speed,
    },
  });

  // eslint-disable-next-line no-console
  console.log('[EquipmentStatsIntegration] Stats recalculated after equipment change');
}

/**
 * Create enhanced equipment actions that integrate with character system
 * These replace the basic equipItem/unequipItem actions
 *
 * @param {object} gameStore - The Zustand game store
 * @returns {object} Enhanced equipment actions
 */
export function createEnhancedEquipmentActions(gameStore) {
  return {
    /**
     * Equip item with stat recalculation
     */
    equipItemWithStats: (slot, item) => {
      // First, equip the item
      gameStore.setState((state) => ({
        equipment: { ...state.equipment, [slot]: item },
      }));

      // Then recalculate stats
      recalculateStatsAfterEquipmentChange(gameStore);

      // eslint-disable-next-line no-console
      console.log(`[EquipmentStatsIntegration] Equipped ${item.name} to ${slot}`);
    },

    /**
     * Unequip item with stat recalculation
     */
    unequipItemWithStats: (slot) => {
      const state = gameStore.getState();
      const unequippedItem = state.equipment[slot];

      // First, unequip the item
      gameStore.setState((state) => ({
        equipment: { ...state.equipment, [slot]: null },
      }));

      // Then recalculate stats
      recalculateStatsAfterEquipmentChange(gameStore);

      // eslint-disable-next-line no-console
      console.log(`[EquipmentStatsIntegration] Unequipped from ${slot}`);

      return unequippedItem;
    },

    /**
     * Get total stats including equipment and attributes
     */
    getTotalStatsWithEquipment: () => {
      const state = gameStore.getState();
      return calculateDerivedStats(state.character, state.player, state.equipment);
    },
  };
}

/**
 * Hook to watch for equipment changes and auto-recalculate
 * This can be used in React components
 *
 * @param {object} gameStore - The Zustand game store
 */
export function setupEquipmentStatsWatcher(gameStore) {
  let lastEquipment = JSON.stringify(gameStore.getState().equipment);

  // Subscribe to store changes
  const unsubscribe = gameStore.subscribe((state) => {
    const currentEquipment = JSON.stringify(state.equipment);

    if (currentEquipment !== lastEquipment) {
      // eslint-disable-next-line no-console
      console.log('[EquipmentStatsIntegration] Equipment changed, recalculating stats...');
      recalculateStatsAfterEquipmentChange(gameStore);
      lastEquipment = currentEquipment;
    }
  });

  return unsubscribe;
}

/**
 * Compare stats before and after equipment change (for UI feedback)
 *
 * @param {object} currentEquipment - Current equipment
 * @param {string} slot - Slot to change
 * @param {object|null} newItem - New item to equip (null to unequip)
 * @param {object} character - Character data
 * @param {object} player - Player data
 * @returns {object} Stat differences
 */
export function compareStatsWithItem(currentEquipment, slot, newItem, character, player) {
  // Calculate current stats
  const currentStats = calculateDerivedStats(character, player, currentEquipment);

  // Calculate stats with new item
  const newEquipment = {
    ...currentEquipment,
    [slot]: newItem,
  };
  const newStats = calculateDerivedStats(character, player, newEquipment);

  // Calculate differences (only compare numeric stats, skip objects like skillEffects)
  const diff = {};
  for (const stat in currentStats) {
    if (typeof currentStats[stat] !== 'number' || typeof newStats[stat] !== 'number') continue;
    const change = newStats[stat] - currentStats[stat];
    if (change !== 0) {
      diff[stat] = {
        current: currentStats[stat],
        new: newStats[stat],
        change,
        isPositive: change > 0,
      };
    }
  }

  return diff;
}

/**
 * Format stat difference for display
 * Example: "+15 Health" or "-2.5 Attack Speed"
 *
 * @param {string} statName - Name of the stat
 * @param {object} difference - Stat difference object
 * @returns {string} Formatted string
 */
export function formatStatDifference(statName, difference) {
  const { change, isPositive } = difference;
  const sign = isPositive ? '+' : '';
  const color = isPositive ? 'green' : 'red';

  let formatted = `${sign}${change.toFixed(1)}`;

  // Add percentage symbol for percentage stats
  const percentageStats = ['critChance', 'elementalResistance', 'rareFindChance'];
  if (percentageStats.includes(statName)) {
    formatted += '%';
  }

  return { text: formatted, color, isPositive };
}

/**
 * Get equipment bonus summary (for tooltip)
 *
 * @param {object} equipment - Equipment object
 * @param {object} character - Character data
 * @param {object} player - Player data
 * @returns {object} Bonus summary
 */
export function getEquipmentBonusSummary(equipment, character, player) {
  // Calculate stats without equipment
  const baseStats = calculateDerivedStats(character, player, {});

  // Calculate stats with equipment
  const totalStats = calculateDerivedStats(character, player, equipment);

  // Calculate bonuses from equipment
  const bonuses = {};
  for (const stat in baseStats) {
    const bonus = totalStats[stat] - baseStats[stat];
    if (bonus !== 0) {
      bonuses[stat] = bonus;
    }
  }

  return {
    hasEquipment: Object.keys(equipment).some(slot => equipment[slot] !== null),
    bonuses,
    totalBonus: Object.values(bonuses).reduce((sum, val) => sum + Math.abs(val), 0),
  };
}

const EquipmentStatsIntegration = {
  recalculateStatsAfterEquipmentChange,
  createEnhancedEquipmentActions,
  setupEquipmentStatsWatcher,
  compareStatsWithItem,
  formatStatDifference,
  getEquipmentBonusSummary,
};

export default EquipmentStatsIntegration;
