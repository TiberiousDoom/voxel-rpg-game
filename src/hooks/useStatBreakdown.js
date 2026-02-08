/**
 * useStatBreakdown.js
 * Hook to calculate detailed stat breakdowns for tooltips
 */

import { useMemo } from 'react';
import useGameStore from '../stores/useGameStore';

/**
 * Calculate stat breakdown showing base + attributes + equipment
 * @returns {object} Stat breakdowns for all stats
 */
export function useStatBreakdown() {
  const player = useGameStore((state) => state.player);
  const character = useGameStore((state) => state.character);
  const equipment = useGameStore((state) => state.equipment);

  return useMemo(() => {
    // Health breakdown
    const healthBreakdown = {
      base: 100,
      attributes: {
        endurance: character.attributes.endurance * 15,
      },
      equipment: {},
      total: player.maxHealth,
    };

    // Add equipment health bonuses (stats are nested in item.stats)
    if (equipment.armor?.stats?.health) {
      healthBreakdown.equipment.armor = equipment.armor.stats.health;
    }
    if (equipment.helmet?.stats?.health) {
      healthBreakdown.equipment.helmet = equipment.helmet.stats.health;
    }
    if (equipment.ring1?.stats?.health) {
      healthBreakdown.equipment.ring1 = equipment.ring1.stats.health;
    }
    if (equipment.ring2?.stats?.health) {
      healthBreakdown.equipment.ring2 = equipment.ring2.stats.health;
    }
    if (equipment.amulet?.stats?.health) {
      healthBreakdown.equipment.amulet = equipment.amulet.stats.health;
    }

    // Mana breakdown
    const manaBreakdown = {
      base: 100,
      attributes: {
        magic: character.attributes.magic * 10,
      },
      equipment: {},
      total: player.maxMana,
    };

    // Add equipment mana bonuses
    if (equipment.amulet?.stats?.mana) {
      manaBreakdown.equipment.amulet = equipment.amulet.stats.mana;
    }
    if (equipment.ring1?.stats?.mana) {
      manaBreakdown.equipment.ring1 = equipment.ring1.stats.mana;
    }
    if (equipment.ring2?.stats?.mana) {
      manaBreakdown.equipment.ring2 = equipment.ring2.stats.mana;
    }

    // Stamina breakdown
    const staminaBreakdown = {
      base: 100,
      attributes: {
        endurance: character.attributes.endurance * 5,
      },
      equipment: {},
      total: player.maxStamina,
    };

    // Damage breakdown
    const damageBreakdown = {
      base: 10 + player.level * 0.8,
      attributes: {
        combat: character.attributes.combat * 1.5,
      },
      equipment: {},
      skills: 0,
      total: player.damage,
    };

    // Add weapon damage
    if (equipment.weapon?.stats?.damage) {
      damageBreakdown.equipment.weapon = equipment.weapon.stats.damage;
    }
    if (equipment.ring1?.stats?.damage) {
      damageBreakdown.equipment.ring1 = equipment.ring1.stats.damage;
    }
    if (equipment.ring2?.stats?.damage) {
      damageBreakdown.equipment.ring2 = equipment.ring2.stats.damage;
    }
    if (equipment.gloves?.stats?.damage) {
      damageBreakdown.equipment.gloves = equipment.gloves.stats.damage;
    }

    // Defense breakdown
    const defenseBreakdown = {
      base: 0,
      attributes: {
        endurance: character.attributes.endurance * 0.5,
      },
      equipment: {},
      total: player.defense,
    };

    // Add armor defense (check all armor pieces)
    if (equipment.armor?.stats?.defense) {
      defenseBreakdown.equipment.armor = equipment.armor.stats.defense;
    }
    if (equipment.helmet?.stats?.defense) {
      defenseBreakdown.equipment.helmet = equipment.helmet.stats.defense;
    }
    if (equipment.boots?.stats?.defense) {
      defenseBreakdown.equipment.boots = equipment.boots.stats.defense;
    }
    if (equipment.gloves?.stats?.defense) {
      defenseBreakdown.equipment.gloves = equipment.gloves.stats.defense;
    }
    if (equipment.offhand?.stats?.defense) {
      defenseBreakdown.equipment.offhand = equipment.offhand.stats.defense;
    }

    // Speed breakdown
    const speedBreakdown = {
      base: 5,
      attributes: {
        exploration: character.attributes.exploration * 0.1,
      },
      equipment: {},
      total: player.speed,
    };

    // Add boots speed
    if (equipment.boots?.stats?.speed) {
      speedBreakdown.equipment.boots = equipment.boots.stats.speed;
    }
    if (equipment.ring1?.stats?.speed) {
      speedBreakdown.equipment.ring1 = equipment.ring1.stats.speed;
    }
    if (equipment.ring2?.stats?.speed) {
      speedBreakdown.equipment.ring2 = equipment.ring2.stats.speed;
    }

    // Crit chance breakdown
    const critChanceBreakdown = {
      base: 5, // 5% base
      attributes: {
        combat: character.attributes.combat * 0.3, // 0.3% per point
      },
      equipment: {},
      total: player.critChance,
    };

    // Add crit chance from equipment
    if (equipment.weapon?.stats?.critChance) {
      critChanceBreakdown.equipment.weapon = equipment.weapon.stats.critChance;
    }
    if (equipment.ring1?.stats?.critChance) {
      critChanceBreakdown.equipment.ring1 = equipment.ring1.stats.critChance;
    }
    if (equipment.ring2?.stats?.critChance) {
      critChanceBreakdown.equipment.ring2 = equipment.ring2.stats.critChance;
    }
    if (equipment.amulet?.stats?.critChance) {
      critChanceBreakdown.equipment.amulet = equipment.amulet.stats.critChance;
    }

    // Check for soft caps
    const checkSoftCap = (attrValue) => attrValue > 50;

    return {
      health: {
        ...healthBreakdown,
        softCapped: checkSoftCap(character.attributes.endurance),
      },
      mana: {
        ...manaBreakdown,
        softCapped: checkSoftCap(character.attributes.magic),
      },
      stamina: {
        ...staminaBreakdown,
        softCapped: checkSoftCap(character.attributes.endurance),
      },
      damage: {
        ...damageBreakdown,
        softCapped: checkSoftCap(character.attributes.combat),
      },
      defense: {
        ...defenseBreakdown,
        softCapped: checkSoftCap(character.attributes.endurance),
      },
      speed: {
        ...speedBreakdown,
        softCapped: checkSoftCap(character.attributes.exploration),
      },
      critChance: {
        ...critChanceBreakdown,
        softCapped: checkSoftCap(character.attributes.combat),
      },
    };
  }, [player, character, equipment]);
}

export default useStatBreakdown;
