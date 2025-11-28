/**
 * NPCPartyManager - Manages NPC parties for expeditions
 */
class NPCPartyManager {
  constructor(npcManager) {
    this.npcManager = npcManager;
    this.maxPartySize = 4;
    this.currentParty = null;
  }

  /**
   * Create a new party
   * @returns {Object} Party object
   */
  createParty() {
    this.currentParty = {
      id: `party_${Date.now()}`,
      members: [],
      leader: null,
      formation: 'balanced',
      createdAt: Date.now()
    };

    return this.currentParty;
  }

  /**
   * Add NPC to party
   * @param {string} npcId - NPC ID
   * @param {string} role - Party role ('tank' | 'damage' | 'support' | 'utility')
   * @returns {Object} Result { success, error }
   */
  addToParty(npcId, role) {
    if (!this.currentParty) {
      return { success: false, error: 'No active party' };
    }

    if (this.currentParty.members.length >= this.maxPartySize) {
      return { success: false, error: 'Party is full' };
    }

    const npc = this.npcManager.getNPC(npcId);
    if (!npc) {
      return { success: false, error: 'NPC not found' };
    }

    // Check if already in party
    if (this.currentParty.members.some(m => m.npcId === npcId)) {
      return { success: false, error: 'NPC already in party' };
    }

    // Add to party
    this.currentParty.members.push({
      npcId,
      role,
      position: this.currentParty.members.length
    });

    // Set leader if first member
    if (this.currentParty.members.length === 1) {
      this.currentParty.leader = npcId;
    }

    return { success: true };
  }

  /**
   * Remove NPC from party
   * @param {string} npcId - NPC ID
   * @returns {Object} Result { success, error }
   */
  removeFromParty(npcId) {
    if (!this.currentParty) {
      return { success: false, error: 'No active party' };
    }

    const index = this.currentParty.members.findIndex(m => m.npcId === npcId);
    if (index === -1) {
      return { success: false, error: 'NPC not in party' };
    }

    this.currentParty.members.splice(index, 1);

    // Update positions
    this.currentParty.members.forEach((member, idx) => {
      member.position = idx;
    });

    // Update leader if needed
    if (this.currentParty.leader === npcId && this.currentParty.members.length > 0) {
      this.currentParty.leader = this.currentParty.members[0].npcId;
    } else if (this.currentParty.members.length === 0) {
      this.currentParty.leader = null;
    }

    return { success: true };
  }

  /**
   * Set party leader
   * @param {string} npcId - NPC ID
   * @returns {Object} Result { success, error }
   */
  setLeader(npcId) {
    if (!this.currentParty) {
      return { success: false, error: 'No active party' };
    }

    const member = this.currentParty.members.find(m => m.npcId === npcId);
    if (!member) {
      return { success: false, error: 'NPC not in party' };
    }

    this.currentParty.leader = npcId;
    return { success: true };
  }

  /**
   * Set party formation
   * @param {string} formation - Formation type ('balanced' | 'offensive' | 'defensive')
   * @returns {Object} Result { success, error }
   */
  setFormation(formation) {
    if (!this.currentParty) {
      return { success: false, error: 'No active party' };
    }

    const validFormations = ['balanced', 'offensive', 'defensive'];
    if (!validFormations.includes(formation)) {
      return { success: false, error: 'Invalid formation' };
    }

    this.currentParty.formation = formation;
    return { success: true };
  }

  /**
   * Get current party
   * @returns {Object|null} Current party or null
   */
  getParty() {
    return this.currentParty;
  }

  /**
   * Disband current party
   * @returns {Object} Result { success }
   */
  disbandParty() {
    this.currentParty = null;
    return { success: true };
  }

  /**
   * Get party statistics
   * @returns {Object|null} Stats or null if no party
   */
  getPartyStats() {
    if (!this.currentParty || this.currentParty.members.length === 0) {
      return null;
    }

    const stats = {
      totalHealth: 0,
      totalDamage: 0,
      averageDefense: 0,
      averageSpeed: 0,
      critChance: 0,
      dodgeChance: 0,
      memberCount: this.currentParty.members.length
    };

    for (const member of this.currentParty.members) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (!npc) continue;

      stats.totalHealth += npc.combatStats.health.max;
      stats.totalDamage += npc.combatStats.damage;
      stats.averageDefense += npc.combatStats.defense;
      stats.averageSpeed += npc.combatStats.speed;
      stats.critChance += npc.combatStats.critChance;
      stats.dodgeChance += npc.combatStats.dodgeChance;
    }

    stats.averageDefense /= stats.memberCount;
    stats.averageSpeed /= stats.memberCount;
    stats.critChance /= stats.memberCount;
    stats.dodgeChance /= stats.memberCount;

    return stats;
  }

  /**
   * Validate party is ready for expedition
   * @returns {Object} { valid, errors }
   */
  validateParty() {
    const errors = [];

    if (!this.currentParty) {
      errors.push('No party created');
      return { valid: false, errors };
    }

    if (this.currentParty.members.length === 0) {
      errors.push('Party is empty');
    }

    if (this.currentParty.members.length > this.maxPartySize) {
      errors.push(`Party size exceeds maximum (${this.maxPartySize})`);
    }

    // Check all NPCs are alive and available
    for (const member of this.currentParty.members) {
      const npc = this.npcManager.getNPC(member.npcId);
      if (!npc) {
        errors.push(`NPC ${member.npcId} not found`);
        continue;
      }

      if (!npc.alive) {
        errors.push(`${npc.name} is dead`);
      }

      if (npc.combatStats.health.current <= 0) {
        errors.push(`${npc.name} has no health`);
      }

      if (npc.onExpedition) {
        errors.push(`${npc.name} is already on an expedition`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get party member by position
   * @param {number} position - Position (0-3)
   * @returns {Object|null} Member or null
   */
  getMemberAtPosition(position) {
    if (!this.currentParty) return null;

    return this.currentParty.members.find(m => m.position === position) || null;
  }

  /**
   * Swap member positions
   * @param {number} position1 - First position
   * @param {number} position2 - Second position
   * @returns {Object} Result { success, error }
   */
  swapPositions(position1, position2) {
    if (!this.currentParty) {
      return { success: false, error: 'No active party' };
    }

    const member1 = this.currentParty.members.find(m => m.position === position1);
    const member2 = this.currentParty.members.find(m => m.position === position2);

    if (!member1 || !member2) {
      return { success: false, error: 'Invalid positions' };
    }

    member1.position = position2;
    member2.position = position1;

    return { success: true };
  }

  /**
   * Get party composition summary
   * @returns {Object|null} Composition summary or null
   */
  getComposition() {
    if (!this.currentParty || this.currentParty.members.length === 0) {
      return null;
    }

    const composition = {
      tank: 0,
      damage: 0,
      support: 0,
      utility: 0
    };

    for (const member of this.currentParty.members) {
      if (composition[member.role] !== undefined) {
        composition[member.role]++;
      }
    }

    return composition;
  }
}

export default NPCPartyManager;
