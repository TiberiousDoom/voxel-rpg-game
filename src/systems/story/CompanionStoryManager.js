/**
 * CompanionStoryManager.js — Manages the companion discovery event and
 * bond-milestone progression (teaching spells, revealing lore).
 *
 * Story: A wounded mage is found near a rift. The player helps them,
 * and the companion joins. As bond grows, the companion teaches spells
 * and reveals the origin of the rifts.
 */

import companionDialogue from '../../config/dialogue/companion-dialogue.json';

// Deterministic story rift offset from player spawn
const STORY_RIFT_OFFSET_X = 120;
const STORY_RIFT_OFFSET_Z = 80;
const DISCOVERY_RANGE = 20; // World units — player must be within to discover

class CompanionStoryManager {
  constructor() {
    this.discovered = false;
    this.helped = false;
    this.storyRiftPosition = null;
    this.companionName = 'Aria';

    // Bond milestone tracking
    this.milestones = {
      bond30: false, // Companion says "feeling stronger"
      bond50: false, // Teaches Frost Nova
      bond80: false, // Reveals rift lore
    };
  }

  /**
   * Initialize story rift position based on player spawn.
   * @param {number[]} playerSpawn - [x, y, z]
   */
  initialize(playerSpawn) {
    this.storyRiftPosition = [
      playerSpawn[0] + STORY_RIFT_OFFSET_X,
      playerSpawn[1],
      playerSpawn[2] + STORY_RIFT_OFFSET_Z,
    ];
  }

  /**
   * Check if player is near the story rift and companion hasn't been discovered.
   * @param {number[]} playerPos
   * @returns {boolean}
   */
  checkDiscovery(playerPos) {
    if (this.discovered || !this.storyRiftPosition) return false;
    const dx = playerPos[0] - this.storyRiftPosition[0];
    const dz = playerPos[2] - this.storyRiftPosition[2];
    return Math.sqrt(dx * dx + dz * dz) < DISCOVERY_RANGE;
  }

  /**
   * Player chose to help the companion. Activates the companion.
   * @param {Object} store - useGameStore.getState()
   * @returns {boolean}
   */
  helpCompanion(store) {
    if (this.helped) return false;

    // Check player has food to give
    const materials = store.inventory?.materials;
    if (!materials) return false;
    const hasFood = (materials.berry || 0) >= 1 || (materials.meat || 0) >= 1;
    if (!hasFood) return false;

    // Consume one food item
    if ((materials.berry || 0) >= 1) {
      store.removeMaterial('berry', 1);
    } else {
      store.removeMaterial('meat', 1);
    }

    this.discovered = true;
    this.helped = true;

    // Activate companion in store
    store.setCompanionState({
      active: true,
      type: 'MAGE',
      name: this.companionName,
      position: [...this.storyRiftPosition],
      state: 'FOLLOWING',
      health: 25,       // Wounded — 25% HP
      maxHealth: 100,
      bondLevel: 10,     // Starting bond
      command: 'FOLLOW',
    });

    return true;
  }

  /**
   * Check bond milestones and trigger rewards.
   * @param {Object} store - useGameStore.getState()
   * @returns {{ milestone: string, dialogue: Object }|null}
   */
  checkMilestones(store) {
    const bond = store.companion.bondLevel;
    if (!store.companion.active) return null;

    if (bond >= 30 && !this.milestones.bond30) {
      this.milestones.bond30 = true;
      return {
        milestone: 'bond30',
        dialogue: this.getDialogue('bond_30'),
      };
    }

    if (bond >= 50 && !this.milestones.bond50) {
      this.milestones.bond50 = true;
      store.unlockSpell('frostNova');
      return {
        milestone: 'bond50',
        dialogue: this.getDialogue('bond_50'),
      };
    }

    if (bond >= 80 && !this.milestones.bond80) {
      this.milestones.bond80 = true;
      store.unlockSpell('arcaneBarrage');
      return {
        milestone: 'bond80',
        dialogue: this.getDialogue('bond_80'),
      };
    }

    return null;
  }

  /**
   * Get dialogue tree for a specific node.
   * @param {string} nodeId
   * @returns {Object|null}
   */
  getDialogue(nodeId) {
    return companionDialogue[nodeId] || null;
  }

  /**
   * Get the discovery dialogue tree.
   * @returns {Object}
   */
  getDiscoveryDialogue() {
    return companionDialogue.discovery || null;
  }

  serialize() {
    return {
      discovered: this.discovered,
      helped: this.helped,
      storyRiftPosition: this.storyRiftPosition,
      milestones: { ...this.milestones },
    };
  }

  deserialize(state) {
    if (!state) return;
    this.discovered = state.discovered || false;
    this.helped = state.helped || false;
    this.storyRiftPosition = state.storyRiftPosition || null;
    if (state.milestones) {
      this.milestones = { ...this.milestones, ...state.milestones };
    }
  }
}

export default CompanionStoryManager;
