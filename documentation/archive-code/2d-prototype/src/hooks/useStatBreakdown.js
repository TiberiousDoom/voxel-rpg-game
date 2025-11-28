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

    // Add equipment health bonuses
    if (equipment.armor?.health) {
      healthBreakdown.equipment.armor = equipment.armor.health;
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
    if (equipment.amulet?.mana) {
      manaBreakdown.equipment.amulet = equipment.amulet.mana;
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
    if (equipment.weapon?.damage) {
      damageBreakdown.equipment.weapon = equipment.weapon.damage;
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

    // Add armor defense
    if (equipment.armor?.defense) {
      defenseBreakdown.equipment.armor = equipment.armor.defense;
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
    if (equipment.boots?.speed) {
      speedBreakdown.equipment.boots = equipment.boots.speed;
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
