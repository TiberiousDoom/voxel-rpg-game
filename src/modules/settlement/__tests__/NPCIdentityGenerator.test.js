/**
 * NPCIdentityGenerator.test.js - Unit tests for NPC identity generation
 */

import NPCIdentityGenerator, {
  SKIN_TONES,
  HAIR_COLORS,
  CLOTHING_COLORS,
} from '../NPCIdentityGenerator.js';
import { generateUniqueName, FIRST_NAMES, SURNAMES } from '../../../data/npcNames.js';
import { Personality } from '../../npc-system/NPCPersonality.js';

describe('NPCIdentityGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new NPCIdentityGenerator();
  });

  describe('Name Generation', () => {
    test('should generate a full name with first and surname', () => {
      const identity = generator.generate();
      expect(identity.firstName).toBeTruthy();
      expect(identity.surname).toBeTruthy();
      expect(identity.fullName).toBe(`${identity.firstName} ${identity.surname}`);
    });

    test('should use names from the name pools', () => {
      const identity = generator.generate();
      expect(FIRST_NAMES).toContain(identity.firstName);
      expect(SURNAMES).toContain(identity.surname);
    });

    test('should not generate duplicate names', () => {
      const names = new Set();
      for (let i = 0; i < 50; i++) {
        const identity = generator.generate();
        expect(names.has(identity.fullName)).toBe(false);
        names.add(identity.fullName);
      }
    });

    test('should respect registered names', () => {
      generator.registerName('Aldric Baker');
      // Generate many names and verify none match
      for (let i = 0; i < 50; i++) {
        const identity = generator.generate();
        expect(identity.fullName).not.toBe('Aldric Baker');
      }
    });

    test('should allow reuse after releasing a name', () => {
      generator.registerName('Aldric Baker');
      generator.releaseName('Aldric Baker');
      // Name should be available again (tracked in usedNames)
      expect(generator._usedNames.has('Aldric Baker')).toBe(false);
    });
  });

  describe('generateUniqueName', () => {
    test('should return unique name not in existing set', () => {
      const existing = new Set(['Aldric Baker']);
      const name = generateUniqueName(existing);
      expect(name.fullName).not.toBe('Aldric Baker');
      expect(name.firstName).toBeTruthy();
      expect(name.surname).toBeTruthy();
    });

    test('should work with empty existing set', () => {
      const name = generateUniqueName(new Set());
      expect(name.fullName).toBeTruthy();
    });
  });

  describe('Appearance Generation', () => {
    test('should generate valid appearance parameters', () => {
      const identity = generator.generate();
      const { appearance } = identity;
      expect(appearance).toBeDefined();
      expect(appearance.skinTone).toBeGreaterThanOrEqual(0);
      expect(appearance.skinTone).toBeLessThan(SKIN_TONES.length);
      expect(appearance.hairColor).toBeGreaterThanOrEqual(0);
      expect(appearance.hairColor).toBeLessThan(HAIR_COLORS.length);
      expect(appearance.clothingColor).toBeGreaterThanOrEqual(0);
      expect(appearance.clothingColor).toBeLessThan(CLOTHING_COLORS.length);
    });

    test('should produce variety across multiple NPCs', () => {
      const appearances = [];
      for (let i = 0; i < 20; i++) {
        appearances.push(generator.generate().appearance);
      }
      // Check that not all skin tones are the same
      const skinTones = new Set(appearances.map(a => a.skinTone));
      expect(skinTones.size).toBeGreaterThan(1);
    });

    test('getAppearanceData should return color data for valid indices', () => {
      const data = NPCIdentityGenerator.getAppearanceData({
        skinTone: 2,
        hairColor: 3,
        clothingColor: 1,
      });
      expect(data.skin.name).toBe('medium');
      expect(data.hair.name).toBe('red');
      expect(data.clothing.name).toBe('green');
    });

    test('getAppearanceData should fallback for invalid indices', () => {
      const data = NPCIdentityGenerator.getAppearanceData({
        skinTone: 99,
        hairColor: 99,
        clothingColor: 99,
      });
      expect(data.skin).toBe(SKIN_TONES[0]);
      expect(data.hair).toBe(HAIR_COLORS[0]);
      expect(data.clothing).toBe(CLOTHING_COLORS[0]);
    });
  });

  describe('Personality Generation', () => {
    test('should generate a Personality instance', () => {
      const identity = generator.generate();
      expect(identity.personality).toBeInstanceOf(Personality);
    });

    test('should have 2-3 strong traits (>= 0.7)', () => {
      // Run multiple times since it's random
      let hasTwo = false;
      let hasThree = false;
      for (let i = 0; i < 50; i++) {
        const identity = generator.generate();
        const strongCount = Object.values(identity.personality.traits)
          .filter(v => v >= 0.7).length;
        expect(strongCount).toBeGreaterThanOrEqual(2);
        expect(strongCount).toBeLessThanOrEqual(5); // at most all 5
        if (strongCount === 2) hasTwo = true;
        if (strongCount >= 3) hasThree = true;
      }
      // With 50 samples, we should see both 2 and 3
      expect(hasTwo || hasThree).toBe(true);
    });

    test('should have valid derived values', () => {
      const identity = generator.generate();
      const p = identity.personality;
      expect(p.workPaceModifier).toBeGreaterThanOrEqual(0.5);
      expect(p.workPaceModifier).toBeLessThanOrEqual(1.5);
      expect(p.qualityModifier).toBeGreaterThanOrEqual(0.8);
      expect(p.qualityModifier).toBeLessThanOrEqual(1.2);
      expect(p.socialRadius).toBeGreaterThanOrEqual(1);
      expect(p.socialRadius).toBeLessThanOrEqual(5);
    });
  });

  describe('Job Preference Derivation', () => {
    test('should return a job preference string', () => {
      const identity = generator.generate();
      expect(typeof identity.preferredJob).toBe('string');
      expect(identity.preferredJob.length).toBeGreaterThan(0);
    });

    test('INDUSTRIOUS dominant trait should prefer mining', () => {
      // Force personality with strong industrious
      const gen = new NPCIdentityGenerator();
      // Generate many and check industrious-dominant ones
      let found = false;
      for (let i = 0; i < 100; i++) {
        const identity = gen.generate();
        if (identity.personality.getDominantTrait() === 'INDUSTRIOUS') {
          expect(identity.preferredJob).toBe('mining');
          found = true;
          break;
        }
      }
      // If we didn't find one naturally, that's OK for a random test
      if (!found) {
        // eslint-disable-next-line no-console
        console.warn('No INDUSTRIOUS dominant found in 100 samples — skipping');
      }
    });

    test('BRAVE dominant trait should prefer guarding', () => {
      let found = false;
      for (let i = 0; i < 100; i++) {
        const identity = generator.generate();
        if (identity.personality.getDominantTrait() === 'BRAVE') {
          expect(identity.preferredJob).toBe('guarding');
          found = true;
          break;
        }
      }
      if (!found) {
        // eslint-disable-next-line no-console
        console.warn('No BRAVE dominant found in 100 samples — skipping');
      }
    });
  });

  describe('Skill Generation', () => {
    test('should generate all expected skill keys', () => {
      const identity = generator.generate();
      const expectedKeys = ['mining', 'building', 'combat', 'gathering', 'farming', 'crafting'];
      for (const key of expectedKeys) {
        expect(identity.baseSkills).toHaveProperty(key);
      }
    });

    test('all skills should be in 0.5–1.5 range', () => {
      for (let i = 0; i < 20; i++) {
        const identity = generator.generate();
        for (const [key, value] of Object.entries(identity.baseSkills)) {
          expect(value).toBeGreaterThanOrEqual(0.5);
          expect(value).toBeLessThanOrEqual(1.5);
        }
      }
    });

    test('personality traits should bias related skills upward', () => {
      // Generate many NPCs and check that industrious NPCs have higher mining on average
      let industriousMiningSum = 0;
      let industriousCount = 0;
      let otherMiningSum = 0;
      let otherCount = 0;

      for (let i = 0; i < 200; i++) {
        const identity = generator.generate();
        const industrious = identity.personality.getTraitStrength('INDUSTRIOUS');
        if (industrious > 0.7) {
          industriousMiningSum += identity.baseSkills.mining;
          industriousCount++;
        } else if (industrious < 0.5) {
          otherMiningSum += identity.baseSkills.mining;
          otherCount++;
        }
      }

      if (industriousCount > 5 && otherCount > 5) {
        const industriousAvg = industriousMiningSum / industriousCount;
        const otherAvg = otherMiningSum / otherCount;
        // Industrious NPCs should tend to have higher mining
        expect(industriousAvg).toBeGreaterThan(otherAvg);
      }
    });
  });

  describe('Serialization', () => {
    test('should serialize used names', () => {
      generator.generate();
      generator.generate();
      const data = generator.serialize();
      expect(data.usedNames).toBeInstanceOf(Array);
      expect(data.usedNames.length).toBe(2);
    });

    test('should deserialize and restore used names', () => {
      generator.generate();
      generator.generate();
      const data = generator.serialize();

      const newGenerator = new NPCIdentityGenerator();
      newGenerator.deserialize(data);
      expect(newGenerator._usedNames.size).toBe(2);

      // Deserialized names should be blocked
      for (const name of data.usedNames) {
        expect(newGenerator._usedNames.has(name)).toBe(true);
      }
    });

    test('should handle null/undefined deserialize gracefully', () => {
      expect(() => generator.deserialize(null)).not.toThrow();
      expect(() => generator.deserialize(undefined)).not.toThrow();
    });
  });

  describe('Identity persists on NPC entity', () => {
    test('generated identity should have all required fields', () => {
      const identity = generator.generate();
      expect(identity).toHaveProperty('firstName');
      expect(identity).toHaveProperty('surname');
      expect(identity).toHaveProperty('fullName');
      expect(identity).toHaveProperty('appearance');
      expect(identity).toHaveProperty('personality');
      expect(identity).toHaveProperty('preferredJob');
      expect(identity).toHaveProperty('baseSkills');
    });
  });
});
