/**
 * NPCPersonality.js - Personality and relationship system for NPCs
 *
 * Implements Phase 3 of NPC Control Redesign:
 * - Personality traits affecting behavior
 * - NPC-NPC relationships and interactions
 * - Skill preferences and affinities
 * - Memory and decision-making modifiers
 */

/**
 * Personality Traits
 */
export const PersonalityTrait = {
  INDUSTRIOUS: 'INDUSTRIOUS',     // Works harder, rests less
  LAZY: 'LAZY',                   // Works slower, rests more
  SOCIAL: 'SOCIAL',               // Prefers being near others
  SHY: 'SHY',                     // Avoids crowds
  BRAVE: 'BRAVE',                 // Takes risky tasks, doesn't fear
  CAUTIOUS: 'CAUTIOUS',           // Avoids danger, hesitant
  OPTIMISTIC: 'OPTIMISTIC',       // Maintains higher morale
  PESSIMISTIC: 'PESSIMISTIC',     // Loses morale easily
  PERFECTIONIST: 'PERFECTIONIST', // Works slower but better quality
  SLOPPY: 'SLOPPY',               // Works faster but lower quality
  LEADER: 'LEADER',               // Inspires nearby NPCs
  FOLLOWER: 'FOLLOWER',           // Performs better when following
};

/**
 * Relationship Status
 */
export const RelationshipStatus = {
  STRANGER: 'STRANGER',     // 0-20: Don't know each other
  ACQUAINTANCE: 'ACQUAINTANCE', // 21-40: Met a few times
  FRIEND: 'FRIEND',         // 41-70: Get along well
  CLOSE_FRIEND: 'CLOSE_FRIEND', // 71-90: Very close
  BEST_FRIEND: 'BEST_FRIEND',   // 91-100: Inseparable
  DISLIKE: 'DISLIKE',       // -20 to 0: Don't get along
  RIVAL: 'RIVAL',           // -50 to -21: Competitive/antagonistic
  ENEMY: 'ENEMY',           // -100 to -51: Hostile
};

/**
 * Personality class defining NPC traits and preferences
 */
export class Personality {
  /**
   * Create a personality
   * @param {Object} config - Personality configuration
   */
  constructor(config = {}) {
    // Personality traits (0-1 scale)
    this.traits = {
      [PersonalityTrait.INDUSTRIOUS]: config.industrious || 0.5,
      [PersonalityTrait.SOCIAL]: config.social || 0.5,
      [PersonalityTrait.BRAVE]: config.brave || 0.5,
      [PersonalityTrait.OPTIMISTIC]: config.optimistic || 0.5,
      [PersonalityTrait.PERFECTIONIST]: config.perfectionist || 0.5,
    };

    // Skill preferences (which skills NPC enjoys)
    this.skillPreferences = {
      farming: config.farmingPreference || 0.5,
      crafting: config.craftingPreference || 0.5,
      defense: config.defensePreference || 0.5,
      general: config.generalPreference || 0.5,
    };

    // Work preferences
    this.preferredBuildingTypes = config.preferredBuildings || [];
    this.workPaceModifier = this._calculateWorkPace();
    this.qualityModifier = this._calculateQuality();

    // Social preferences
    this.socialRadius = this._calculateSocialRadius(); // How close NPC likes to be to others
    this.maxFriends = Math.floor(3 + this.traits[PersonalityTrait.SOCIAL] * 7); // 3-10 friends

    // Decision-making modifiers
    this.riskTolerance = this.traits[PersonalityTrait.BRAVE];
    this.restThreshold = 30 + (1 - this.traits[PersonalityTrait.INDUSTRIOUS]) * 20; // 30-50
  }

  /**
   * Calculate work pace based on traits
   * @private
   * @returns {number} Work pace multiplier (0.5 - 1.5)
   */
  _calculateWorkPace() {
    let pace = 1.0;

    // Industrious NPCs work faster
    pace += (this.traits[PersonalityTrait.INDUSTRIOUS] - 0.5) * 0.5;

    // Perfectionists work slower
    pace -= (this.traits[PersonalityTrait.PERFECTIONIST] - 0.5) * 0.3;

    return Math.max(0.5, Math.min(1.5, pace));
  }

  /**
   * Calculate work quality based on traits
   * @private
   * @returns {number} Quality multiplier (0.8 - 1.2)
   */
  _calculateQuality() {
    let quality = 1.0;

    // Perfectionists produce higher quality
    quality += (this.traits[PersonalityTrait.PERFECTIONIST] - 0.5) * 0.4;

    return Math.max(0.8, Math.min(1.2, quality));
  }

  /**
   * Calculate preferred social radius
   * @private
   * @returns {number} Social radius (1-5 units)
   */
  _calculateSocialRadius() {
    // Social NPCs like being closer to others
    const social = this.traits[PersonalityTrait.SOCIAL];
    return 1 + social * 4; // 1-5 units
  }

  /**
   * Get dominant trait
   * @returns {string} Dominant trait name
   */
  getDominantTrait() {
    let maxValue = 0;
    let dominantTrait = PersonalityTrait.INDUSTRIOUS;

    for (const [trait, value] of Object.entries(this.traits)) {
      if (Math.abs(value - 0.5) > Math.abs(maxValue - 0.5)) {
        maxValue = value;
        dominantTrait = trait;
      }
    }

    return dominantTrait;
  }

  /**
   * Check if NPC has a specific trait (above 0.7)
   * @param {string} trait - Trait to check
   * @returns {boolean}
   */
  hasTrait(trait) {
    return this.traits[trait] >= 0.7;
  }

  /**
   * Get trait strength
   * @param {string} trait - Trait to get
   * @returns {number} Trait value (0-1)
   */
  getTraitStrength(trait) {
    return this.traits[trait] || 0.5;
  }

  /**
   * Get personality summary
   * @returns {Object}
   */
  getSummary() {
    return {
      dominantTrait: this.getDominantTrait(),
      traits: { ...this.traits },
      skillPreferences: { ...this.skillPreferences },
      workPaceModifier: this.workPaceModifier,
      qualityModifier: this.qualityModifier,
      socialRadius: this.socialRadius,
      maxFriends: this.maxFriends,
    };
  }

  /**
   * Generate random personality
   * @returns {Personality}
   */
  static generateRandom() {
    return new Personality({
      industrious: Math.random(),
      social: Math.random(),
      brave: Math.random(),
      optimistic: Math.random(),
      perfectionist: Math.random(),
      farmingPreference: Math.random(),
      craftingPreference: Math.random(),
      defensePreference: Math.random(),
      generalPreference: Math.random(),
    });
  }

  /**
   * Create personality from archetype
   * @param {string} archetype - Archetype name
   * @returns {Personality}
   */
  static fromArchetype(archetype) {
    const archetypes = {
      WORKER: {
        industrious: 0.8,
        social: 0.4,
        brave: 0.5,
        optimistic: 0.6,
        perfectionist: 0.4,
      },
      SOCIALITE: {
        industrious: 0.4,
        social: 0.9,
        brave: 0.5,
        optimistic: 0.7,
        perfectionist: 0.3,
      },
      CRAFTSMAN: {
        industrious: 0.7,
        social: 0.3,
        brave: 0.4,
        optimistic: 0.5,
        perfectionist: 0.9,
      },
      GUARD: {
        industrious: 0.6,
        social: 0.5,
        brave: 0.9,
        optimistic: 0.5,
        perfectionist: 0.6,
      },
      FARMER: {
        industrious: 0.7,
        social: 0.5,
        brave: 0.4,
        optimistic: 0.6,
        perfectionist: 0.5,
      },
    };

    const config = archetypes[archetype] || archetypes.WORKER;
    return new Personality(config);
  }
}

/**
 * Relationship between two NPCs
 */
export class Relationship {
  /**
   * Create a relationship
   * @param {string} npc1Id - First NPC ID
   * @param {string} npc2Id - Second NPC ID
   */
  constructor(npc1Id, npc2Id) {
    this.npc1Id = npc1Id;
    this.npc2Id = npc2Id;
    this.value = 0; // -100 to 100
    this.interactions = 0; // Number of interactions
    this.lastInteraction = 0; // Timestamp
    this.sharedMemories = []; // Shared experiences
  }

  /**
   * Modify relationship value
   * @param {number} delta - Change amount (-100 to 100)
   */
  modify(delta) {
    this.value = Math.max(-100, Math.min(100, this.value + delta));
    this.interactions++;
    this.lastInteraction = Date.now();
  }

  /**
   * Add shared memory
   * @param {string} memory - Memory description
   */
  addMemory(memory) {
    this.sharedMemories.push({
      description: memory,
      timestamp: Date.now(),
    });

    // Keep only last 10 memories
    if (this.sharedMemories.length > 10) {
      this.sharedMemories.shift();
    }
  }

  /**
   * Get relationship status
   * @returns {string} Status from RelationshipStatus
   */
  getStatus() {
    if (this.value >= 91) return RelationshipStatus.BEST_FRIEND;
    if (this.value >= 71) return RelationshipStatus.CLOSE_FRIEND;
    if (this.value >= 41) return RelationshipStatus.FRIEND;
    if (this.value >= 21) return RelationshipStatus.ACQUAINTANCE;
    if (this.value >= 0) return RelationshipStatus.STRANGER;
    if (this.value >= -20) return RelationshipStatus.DISLIKE;
    if (this.value >= -50) return RelationshipStatus.RIVAL;
    return RelationshipStatus.ENEMY;
  }

  /**
   * Get compatibility score (0-1)
   * @returns {number}
   */
  getCompatibility() {
    return (this.value + 100) / 200;
  }

  /**
   * Check if relationship is positive
   * @returns {boolean}
   */
  isPositive() {
    return this.value > 0;
  }

  /**
   * Get relationship summary
   * @returns {Object}
   */
  getSummary() {
    return {
      value: this.value,
      status: this.getStatus(),
      interactions: this.interactions,
      lastInteraction: this.lastInteraction,
      memoriesCount: this.sharedMemories.length,
    };
  }
}

/**
 * Relationship manager for tracking NPC relationships
 */
export class RelationshipManager {
  constructor() {
    this.relationships = new Map(); // "npcId1-npcId2" -> Relationship
  }

  /**
   * Get relationship key
   * @private
   * @param {string} npc1Id - First NPC ID
   * @param {string} npc2Id - Second NPC ID
   * @returns {string} Relationship key
   */
  _getKey(npc1Id, npc2Id) {
    // Sort IDs to ensure consistent key
    return npc1Id < npc2Id ? `${npc1Id}-${npc2Id}` : `${npc2Id}-${npc1Id}`;
  }

  /**
   * Get or create relationship
   * @param {string} npc1Id - First NPC ID
   * @param {string} npc2Id - Second NPC ID
   * @returns {Relationship}
   */
  getRelationship(npc1Id, npc2Id) {
    if (npc1Id === npc2Id) return null; // Can't have relationship with self

    const key = this._getKey(npc1Id, npc2Id);

    if (!this.relationships.has(key)) {
      this.relationships.set(key, new Relationship(npc1Id, npc2Id));
    }

    return this.relationships.get(key);
  }

  /**
   * Modify relationship between two NPCs
   * @param {string} npc1Id - First NPC ID
   * @param {string} npc2Id - Second NPC ID
   * @param {number} delta - Change amount
   */
  modifyRelationship(npc1Id, npc2Id, delta) {
    const relationship = this.getRelationship(npc1Id, npc2Id);
    if (relationship) {
      relationship.modify(delta);
    }
  }

  /**
   * Record interaction between NPCs
   * @param {string} npc1Id - First NPC ID
   * @param {string} npc2Id - Second NPC ID
   * @param {string} type - Interaction type
   * @param {number} impact - Relationship impact (-10 to +10)
   */
  recordInteraction(npc1Id, npc2Id, type, impact = 1) {
    const relationship = this.getRelationship(npc1Id, npc2Id);
    if (relationship) {
      relationship.modify(impact);
      relationship.addMemory(`${type} interaction`);
    }
  }

  /**
   * Get all relationships for an NPC
   * @param {string} npcId - NPC ID
   * @returns {Array<Object>} Array of {otherId, relationship}
   */
  getNPCRelationships(npcId) {
    const results = [];

    for (const [key, relationship] of this.relationships.entries()) {
      if (key.includes(npcId)) {
        const otherId = relationship.npc1Id === npcId ? relationship.npc2Id : relationship.npc1Id;
        results.push({
          otherId,
          relationship: relationship.getSummary(),
        });
      }
    }

    return results;
  }

  /**
   * Get NPCs with positive relationships
   * @param {string} npcId - NPC ID
   * @returns {Array<string>} Array of NPC IDs
   */
  getFriends(npcId) {
    return this.getNPCRelationships(npcId)
      .filter(r => r.relationship.value > 40)
      .map(r => r.otherId);
  }

  /**
   * Get NPCs with negative relationships
   * @param {string} npcId - NPC ID
   * @returns {Array<string>} Array of NPC IDs
   */
  getRivals(npcId) {
    return this.getNPCRelationships(npcId)
      .filter(r => r.relationship.value < -20)
      .map(r => r.otherId);
  }

  /**
   * Clear all relationships for an NPC (when NPC dies/removed)
   * @param {string} npcId - NPC ID
   */
  clearNPCRelationships(npcId) {
    const keysToDelete = [];

    for (const key of this.relationships.keys()) {
      if (key.includes(npcId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.relationships.delete(key));
  }

  /**
   * Get relationship statistics
   * @returns {Object}
   */
  getStatistics() {
    let totalRelationships = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let friendships = 0;
    let rivalries = 0;

    for (const relationship of this.relationships.values()) {
      totalRelationships++;

      if (relationship.value > 0) positiveCount++;
      if (relationship.value < 0) negativeCount++;
      if (relationship.value >= 41) friendships++;
      if (relationship.value <= -21) rivalries++;
    }

    return {
      totalRelationships,
      positiveCount,
      negativeCount,
      friendships,
      rivalries,
    };
  }
}

export default {
  PersonalityTrait,
  RelationshipStatus,
  Personality,
  Relationship,
  RelationshipManager,
};
