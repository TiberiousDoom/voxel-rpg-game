/**
 * NPCEquipmentManager - Manages NPC equipment (weapons, armor, accessories)
 */
class NPCEquipmentManager {
  constructor(sharedInventory) {
    this.sharedInventory = sharedInventory;
  }

  /**
   * Equip item to NPC
   * @param {Object} npc - NPC object
   * @param {Object} item - Equipment item
   * @param {string} slot - 'weapon' | 'armor' | 'accessory'
   * @returns {Object} Result { success, error, unequipped }
   */
  equipItem(npc, item, slot) {
    // Validate slot
    if (!['weapon', 'armor', 'accessory'].includes(slot)) {
      return { success: false, error: 'Invalid slot' };
    }

    // Validate item type matches slot
    if (item.type !== slot) {
      return { success: false, error: `Item type ${item.type} doesn't match slot ${slot}` };
    }

    // Check tier restriction
    if (item.tier > npc.combatLevel) {
      return { success: false, error: `Requires combat level ${item.tier}` };
    }

    // Unequip current item (if any)
    const currentItem = npc.equipment[slot];
    if (currentItem) {
      this._unapplyStats(npc, currentItem);
      this.sharedInventory.addEquipment(currentItem);
    }

    // Equip new item
    npc.equipment[slot] = item;
    this._applyStats(npc, item);

    // Remove from shared inventory
    this.sharedInventory.removeItem('equipment', item.id);

    return {
      success: true,
      unequipped: currentItem || null
    };
  }

  /**
   * Unequip item from NPC
   * @param {Object} npc - NPC object
   * @param {string} slot - Equipment slot
   * @returns {Object} Result { success, item, error }
   */
  unequipItem(npc, slot) {
    const item = npc.equipment[slot];
    if (!item) {
      return { success: false, error: 'No item in slot' };
    }

    // Remove stats
    this._unapplyStats(npc, item);

    // Clear slot
    npc.equipment[slot] = null;

    // Return to shared inventory
    this.sharedInventory.addEquipment(item);

    return { success: true, item };
  }

  /**
   * Get total equipment bonuses
   * @param {Object} npc - NPC object
   * @returns {Object} Bonuses
   */
  getEquipmentBonuses(npc) {
    const bonuses = {
      damage: 0,
      defense: 0,
      critChance: 0,
      critDamage: 0,
      dodgeChance: 0,
      healthBonus: 0,
      speedBonus: 0
    };

    for (const slot of ['weapon', 'armor', 'accessory']) {
      const item = npc.equipment[slot];
      if (!item) continue;

      bonuses.damage += item.damage || 0;
      bonuses.defense += item.defense || 0;
      bonuses.critChance += item.critChance || 0;
      bonuses.critDamage += item.critDamage || 0;
      bonuses.dodgeChance += item.dodgeChance || 0;
      bonuses.healthBonus += item.healthBonus || 0;
      bonuses.speedBonus += item.speedBonus || 0;
    }

    return bonuses;
  }

  /**
   * Damage equipment durability
   * @param {Object} npc - NPC object
   * @param {number} amount - Durability loss
   * @returns {Array} Broken items
   */
  damageEquipment(npc, amount = 1) {
    const brokenItems = [];

    for (const slot of ['weapon', 'armor', 'accessory']) {
      const item = npc.equipment[slot];
      if (!item || !item.durability) continue;

      item.durability.current -= amount;

      // Item broken
      if (item.durability.current <= 0) {
        const result = this.unequipItem(npc, slot);
        if (result.success) {
          brokenItems.push({ slot, item: result.item });
        }
      }
    }

    return brokenItems;
  }

  /**
   * Repair equipment
   * @param {Object} item - Equipment item
   * @param {number} amount - Durability to restore (default: full repair)
   * @returns {Object} Result { success, newDurability }
   */
  repairEquipment(item, amount = null) {
    if (!item.durability) {
      return { success: false, error: 'Item has no durability' };
    }

    if (amount === null) {
      item.durability.current = item.durability.max;
    } else {
      item.durability.current = Math.min(
        item.durability.current + amount,
        item.durability.max
      );
    }

    return {
      success: true,
      newDurability: item.durability.current
    };
  }

  /**
   * Get equipment summary for NPC
   * @param {Object} npc - NPC object
   * @returns {Object} Equipment summary
   */
  getEquipmentSummary(npc) {
    const summary = {
      weapon: npc.equipment.weapon || null,
      armor: npc.equipment.armor || null,
      accessory: npc.equipment.accessory || null,
      totalBonuses: this.getEquipmentBonuses(npc),
      equipmentValue: 0,
      avgDurability: 0
    };

    let totalDurability = 0;
    let itemsWithDurability = 0;

    for (const slot of ['weapon', 'armor', 'accessory']) {
      const item = npc.equipment[slot];
      if (item) {
        summary.equipmentValue += item.value || 0;

        if (item.durability) {
          totalDurability += (item.durability.current / item.durability.max) * 100;
          itemsWithDurability++;
        }
      }
    }

    if (itemsWithDurability > 0) {
      summary.avgDurability = Math.floor(totalDurability / itemsWithDurability);
    }

    return summary;
  }

  /**
   * Apply equipment stats to NPC
   * @private
   */
  _applyStats(npc, item) {
    npc.combatStats.damage += item.damage || 0;
    npc.combatStats.defense += item.defense || 0;
    npc.combatStats.critChance += item.critChance || 0;
    npc.combatStats.critDamage += item.critDamage || 0;
    npc.combatStats.dodgeChance += item.dodgeChance || 0;
    npc.combatStats.health.max += item.healthBonus || 0;
    npc.combatStats.speed += item.speedBonus || 0;
  }

  /**
   * Remove equipment stats from NPC
   * @private
   */
  _unapplyStats(npc, item) {
    npc.combatStats.damage -= item.damage || 0;
    npc.combatStats.defense -= item.defense || 0;
    npc.combatStats.critChance -= item.critChance || 0;
    npc.combatStats.critDamage -= item.critDamage || 0;
    npc.combatStats.dodgeChance -= item.dodgeChance || 0;
    npc.combatStats.health.max -= item.healthBonus || 0;
    npc.combatStats.speed -= item.speedBonus || 0;
  }
}

export default NPCEquipmentManager;
