/**
 * NPCIdentityGenerator.js — Generates unique NPC identities for settlers
 *
 * Each NPC gets:
 *   - A unique full name (first + surname)
 *   - Appearance parameters (skin tone, hair color, clothing color)
 *   - 2-3 personality traits from NPCPersonality
 *   - A preferred job type derived from personality
 *   - Base skill levels (0.5–1.5) influenced by personality
 *
 * Used by ImmigrationManager when accepting a new settler.
 */

import { generateUniqueName } from '../../data/npcNames.js';
import { Personality, PersonalityTrait } from '../npc-system/NPCPersonality.js';

// ── Appearance Constants ────────────────────────────────────────

export const SKIN_TONES = [
  { index: 0, name: 'pale',     color: 0xffe0bd },
  { index: 1, name: 'light',    color: 0xf1c27d },
  { index: 2, name: 'medium',   color: 0xc68642 },
  { index: 3, name: 'tan',      color: 0xa0785a },
  { index: 4, name: 'dark',     color: 0x8d5524 },
  { index: 5, name: 'deep',     color: 0x5c3310 },
];

export const HAIR_COLORS = [
  { index: 0, name: 'black',    color: 0x1a1a1a },
  { index: 1, name: 'brown',    color: 0x4a2912 },
  { index: 2, name: 'auburn',   color: 0x7c3f1a },
  { index: 3, name: 'red',      color: 0xb5451b },
  { index: 4, name: 'blonde',   color: 0xd4a853 },
  { index: 5, name: 'platinum', color: 0xe8dcc8 },
  { index: 6, name: 'grey',     color: 0x9e9e9e },
  { index: 7, name: 'white',    color: 0xe0e0e0 },
];

export const CLOTHING_COLORS = [
  { index: 0, name: 'brown',    color: 0x6b4226 },
  { index: 1, name: 'green',    color: 0x3d6b3d },
  { index: 2, name: 'blue',     color: 0x3a5a8c },
  { index: 3, name: 'red',      color: 0x8c3a3a },
  { index: 4, name: 'grey',     color: 0x6e6e6e },
  { index: 5, name: 'tan',      color: 0xa08060 },
  { index: 6, name: 'purple',   color: 0x6a3d7a },
  { index: 7, name: 'teal',     color: 0x3a7a7a },
  { index: 8, name: 'orange',   color: 0xb0703a },
  { index: 9, name: 'white',    color: 0xd0d0d0 },
];

// ── Job Preference Mapping ──────────────────────────────────────

/**
 * Maps dominant personality traits to preferred job types.
 * Each entry lists jobs in order of preference.
 */
const TRAIT_JOB_PREFERENCES = {
  [PersonalityTrait.INDUSTRIOUS]: ['mining', 'building'],
  [PersonalityTrait.PERFECTIONIST]: ['building', 'crafting'],
  [PersonalityTrait.BRAVE]: ['guarding', 'combat'],
  [PersonalityTrait.SOCIAL]: ['hauling', 'trading'],
  [PersonalityTrait.OPTIMISTIC]: ['gathering', 'farming'],
};

// Fallback when no strong trait maps to a job
const DEFAULT_JOB_PREFERENCE = 'general';

// ── Skill Generation ────────────────────────────────────────────

/**
 * Base skill keys that settlers start with.
 * Each gets a random 0.5–1.5 multiplier, biased by personality.
 */
const SKILL_KEYS = ['mining', 'building', 'combat', 'gathering', 'farming', 'crafting'];

/**
 * Which personality traits boost which skills.
 */
const TRAIT_SKILL_BOOSTS = {
  [PersonalityTrait.INDUSTRIOUS]: { mining: 0.3, building: 0.2 },
  [PersonalityTrait.PERFECTIONIST]: { building: 0.3, crafting: 0.3 },
  [PersonalityTrait.BRAVE]: { combat: 0.4 },
  [PersonalityTrait.SOCIAL]: { gathering: 0.2, farming: 0.1 },
  [PersonalityTrait.OPTIMISTIC]: { farming: 0.2, gathering: 0.2 },
};

// ── Generator ───────────────────────────────────────────────────

class NPCIdentityGenerator {
  constructor() {
    /** @type {Set<string>} Names currently in use */
    this._usedNames = new Set();
  }

  /**
   * Register an existing NPC name so it won't be reused.
   * Call this when loading saved NPCs.
   * @param {string} fullName
   */
  registerName(fullName) {
    if (fullName) this._usedNames.add(fullName);
  }

  /**
   * Release a name when an NPC dies or is removed.
   * @param {string} fullName
   */
  releaseName(fullName) {
    this._usedNames.delete(fullName);
  }

  /**
   * Generate a complete identity for a new settler NPC.
   * @returns {Object} Identity data to merge into NPC entity
   */
  generate() {
    const name = generateUniqueName(this._usedNames);
    this._usedNames.add(name.fullName);

    const appearance = this._generateAppearance();
    const personality = this._generatePersonality();
    const preferredJob = this._deriveJobPreference(personality);
    const baseSkills = this._generateSkills(personality);

    return {
      firstName: name.firstName,
      surname: name.surname,
      fullName: name.fullName,
      appearance,
      personality,
      preferredJob,
      baseSkills,
    };
  }

  /**
   * Generate random appearance parameters.
   * @returns {{ skinTone: number, hairColor: number, clothingColor: number }}
   */
  _generateAppearance() {
    return {
      skinTone: Math.floor(Math.random() * SKIN_TONES.length),
      hairColor: Math.floor(Math.random() * HAIR_COLORS.length),
      clothingColor: Math.floor(Math.random() * CLOTHING_COLORS.length),
    };
  }

  /**
   * Generate a personality with 2-3 strong traits (>= 0.7).
   * Uses Personality.generateRandom() then boosts 2-3 traits.
   * @returns {Personality}
   */
  _generatePersonality() {
    const personality = Personality.generateRandom();

    // Pick 2-3 traits to emphasize
    const traitKeys = Object.keys(personality.traits);
    const numStrong = 2 + (Math.random() < 0.5 ? 1 : 0);

    // Shuffle trait keys
    const shuffled = [...traitKeys].sort(() => Math.random() - 0.5);
    const emphasized = shuffled.slice(0, numStrong);

    for (const trait of emphasized) {
      // Push toward 0.7–1.0 range
      personality.traits[trait] = 0.7 + Math.random() * 0.3;
    }

    // Recalculate derived values after trait changes
    personality.workPaceModifier = personality._calculateWorkPace();
    personality.qualityModifier = personality._calculateQuality();
    personality.socialRadius = personality._calculateSocialRadius();
    personality.maxFriends = Math.floor(3 + personality.traits[PersonalityTrait.SOCIAL] * 7);
    personality.riskTolerance = personality.traits[PersonalityTrait.BRAVE];
    personality.restThreshold = 30 + (1 - personality.traits[PersonalityTrait.INDUSTRIOUS]) * 20;

    return personality;
  }

  /**
   * Derive preferred job from personality traits.
   * @param {Personality} personality
   * @returns {string} Job preference string
   */
  _deriveJobPreference(personality) {
    const dominant = personality.getDominantTrait();
    const jobs = TRAIT_JOB_PREFERENCES[dominant];
    if (jobs && jobs.length > 0) {
      return jobs[0];
    }
    return DEFAULT_JOB_PREFERENCE;
  }

  /**
   * Generate base skill levels (0.5–1.5) biased by personality.
   * @param {Personality} personality
   * @returns {Object<string, number>}
   */
  _generateSkills(personality) {
    const skills = {};

    for (const key of SKILL_KEYS) {
      // Base random value: 0.5–1.2
      skills[key] = 0.5 + Math.random() * 0.7;
    }

    // Apply trait-based boosts
    for (const [trait, boosts] of Object.entries(TRAIT_SKILL_BOOSTS)) {
      const traitValue = personality.getTraitStrength(trait);
      // Only apply boost if trait is above average (0.5)
      if (traitValue > 0.5) {
        const strength = (traitValue - 0.5) * 2; // 0–1 scale for how strong the trait is
        for (const [skill, maxBoost] of Object.entries(boosts)) {
          if (skills[skill] !== undefined) {
            skills[skill] += maxBoost * strength;
          }
        }
      }
    }

    // Clamp all skills to 0.5–1.5
    for (const key of SKILL_KEYS) {
      skills[key] = Math.max(0.5, Math.min(1.5, skills[key]));
    }

    return skills;
  }

  /**
   * Get appearance lookup data for rendering.
   * @param {Object} appearance - { skinTone, hairColor, clothingColor }
   * @returns {{ skin: Object, hair: Object, clothing: Object }}
   */
  static getAppearanceData(appearance) {
    return {
      skin: SKIN_TONES[appearance.skinTone] || SKIN_TONES[0],
      hair: HAIR_COLORS[appearance.hairColor] || HAIR_COLORS[0],
      clothing: CLOTHING_COLORS[appearance.clothingColor] || CLOTHING_COLORS[0],
    };
  }

  // ── Serialization ───────────────────────────────────────────

  serialize() {
    return {
      usedNames: Array.from(this._usedNames),
    };
  }

  deserialize(data) {
    if (!data) return;
    this._usedNames = new Set(data.usedNames || []);
  }
}

export default NPCIdentityGenerator;
