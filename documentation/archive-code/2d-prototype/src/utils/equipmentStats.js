/**
 * Equipment Stats Calculator
 * Calculates total player stats including equipped items
 */

export const calculateEquipmentStats = (equipment) => {
  const stats = {
    damage: 0,
    defense: 0,
    maxHealth: 0,
    maxMana: 0,
    maxStamina: 0,
    critChance: 0,
    critDamage: 0,
    dodgeChance: 0,
    speed: 0,
  };

  // Iterate through all equipment slots
  Object.values(equipment).forEach((item) => {
    if (item && item.stats) {
      Object.entries(item.stats).forEach(([stat, value]) => {
        if (stats.hasOwnProperty(stat)) {
          stats[stat] += value;
        }
      });
    }
  });

  return stats;
};

export const applyEquipmentStats = (baseStats, equipmentStats) => {
  return {
    ...baseStats,
    damage: baseStats.damage + equipmentStats.damage,
    defense: baseStats.defense + equipmentStats.defense,
    maxHealth: baseStats.maxHealth + equipmentStats.maxHealth,
    maxMana: baseStats.maxMana + equipmentStats.maxMana,
    maxStamina: baseStats.maxStamina + equipmentStats.maxStamina,
    critChance: baseStats.critChance + equipmentStats.critChance,
    critDamage: baseStats.critDamage + equipmentStats.critDamage,
    dodgeChance: baseStats.dodgeChance + equipmentStats.dodgeChance,
    speed: baseStats.speed + equipmentStats.speed,
  };
};

export const getTotalStats = (player, equipment) => {
  const equipmentStats = calculateEquipmentStats(equipment);
  return applyEquipmentStats(player, equipmentStats);
};
