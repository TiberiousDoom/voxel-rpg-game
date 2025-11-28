/**
 * NPCSkillSystem.test.js - Tests for NPC skill system
 */
import NPCSkillSystem, { SKILL_DEFINITIONS } from '../NPCSkillSystem.js';

describe('NPCSkillSystem', () => {
  let skillSystem, mockNPC;

  beforeEach(() => {
    skillSystem = new NPCSkillSystem();

    // Create a mock NPC with combat stats
    mockNPC = {
      id: 'npc1',
      name: 'Test NPC',
      combatLevel: 1,
      skillPoints: 10,
      combatStats: {
        health: { current: 100, max: 100 },
        damage: 10,
        defense: 0,
        speed: 3,
        critChance: 5,
        critDamage: 150,
        dodgeChance: 5
      },
      skills_combat: {
        combat: {
          powerStrike: 0,
          criticalHit: 0,
          deadlyBlow: 0
        },
        magic: {
          manaPool: 0,
          spellPower: 0,
          fastCasting: 0
        },
        defense: {
          ironSkin: 0,
          vitality: 0,
          evasion: 0
        },
        utility: {
          swiftness: 0,
          fortune: 0,
          regeneration: 0
        }
      }
    };
  });

  describe('Skill Definitions', () => {
    test('has all 4 categories', () => {
      expect(SKILL_DEFINITIONS).toHaveProperty('combat');
      expect(SKILL_DEFINITIONS).toHaveProperty('magic');
      expect(SKILL_DEFINITIONS).toHaveProperty('defense');
      expect(SKILL_DEFINITIONS).toHaveProperty('utility');
    });

    test('has 12 total skills', () => {
      const totalSkills = Object.values(SKILL_DEFINITIONS).reduce(
        (sum, category) => sum + Object.keys(category).length,
        0
      );
      expect(totalSkills).toBe(12);
    });

    test('all skills have required properties', () => {
      for (const [category, skills] of Object.entries(SKILL_DEFINITIONS)) {
        for (const [skillName, skill] of Object.entries(skills)) {
          expect(skill).toHaveProperty('name');
          expect(skill).toHaveProperty('maxLevel');
          expect(skill).toHaveProperty('cost');
          expect(skill).toHaveProperty('bonus');
          expect(skill).toHaveProperty('type');
          expect(skill).toHaveProperty('description');
          expect(skill).toHaveProperty('apply');
          expect(typeof skill.apply).toBe('function');
        }
      }
    });
  });

  describe('getSkillDefinition', () => {
    test('returns skill definition', () => {
      const skill = skillSystem.getSkillDefinition('combat', 'powerStrike');
      expect(skill).toBeDefined();
      expect(skill.name).toBe('Power Strike');
    });

    test('returns null for invalid skill', () => {
      const skill = skillSystem.getSkillDefinition('invalid', 'invalid');
      expect(skill).toBeNull();
    });
  });

  describe('getAllSkills', () => {
    test('returns all skill definitions', () => {
      const skills = skillSystem.getAllSkills();
      expect(skills).toEqual(SKILL_DEFINITIONS);
    });
  });

  describe('upgradeSkill', () => {
    test('upgrades skill successfully', () => {
      const result = skillSystem.upgradeSkill(mockNPC, 'combat', 'powerStrike');

      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(1);
      expect(result.skillPointsRemaining).toBe(9);
      expect(mockNPC.skills_combat.combat.powerStrike).toBe(1);
      expect(mockNPC.skillPoints).toBe(9);
    });

    test('applies flat skill bonuses immediately', () => {
      skillSystem.upgradeSkill(mockNPC, 'defense', 'ironSkin');

      expect(mockNPC.combatStats.defense).toBe(2);
    });

    test('applies multiple levels of flat bonuses', () => {
      skillSystem.upgradeSkill(mockNPC, 'defense', 'vitality');
      skillSystem.upgradeSkill(mockNPC, 'defense', 'vitality');

      expect(mockNPC.combatStats.health.max).toBe(150); // 100 + 25 + 25
    });

    test('prevents upgrading with insufficient skill points', () => {
      mockNPC.skillPoints = 0;
      const result = skillSystem.upgradeSkill(mockNPC, 'combat', 'powerStrike');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not enough skill points');
    });

    test('prevents upgrading beyond max level', () => {
      mockNPC.skills_combat.combat.powerStrike = 5;
      const result = skillSystem.upgradeSkill(mockNPC, 'combat', 'powerStrike');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Skill already max level');
    });

    test('prevents upgrading invalid skill', () => {
      const result = skillSystem.upgradeSkill(mockNPC, 'invalid', 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Skill not found');
    });

    test('costs 2 skill points for expensive skills', () => {
      skillSystem.upgradeSkill(mockNPC, 'combat', 'deadlyBlow');

      expect(mockNPC.skillPoints).toBe(8); // 10 - 2
      expect(mockNPC.combatStats.critDamage).toBe(160); // 150 + 10
    });

    test('creates mana pool when upgrading manaPool skill', () => {
      expect(mockNPC.combatStats.mana).toBeUndefined();

      skillSystem.upgradeSkill(mockNPC, 'magic', 'manaPool');

      expect(mockNPC.combatStats.mana).toBeDefined();
      expect(mockNPC.combatStats.mana.max).toBe(120); // 100 + 20
      expect(mockNPC.combatStats.mana.current).toBe(120);
    });
  });

  describe('getSkillBonuses', () => {
    test('returns default bonuses with no skills', () => {
      const bonuses = skillSystem.getSkillBonuses(mockNPC);

      expect(bonuses.damageMultiplier).toBe(1);
      expect(bonuses.spellDamageMultiplier).toBe(1);
      expect(bonuses.cooldownReduction).toBe(0);
      expect(bonuses.lootMultiplier).toBe(1);
      expect(bonuses.healthRegen).toBe(0);
    });

    test('calculates percentage bonuses for powerStrike', () => {
      mockNPC.skills_combat.combat.powerStrike = 3;

      const bonuses = skillSystem.getSkillBonuses(mockNPC);

      expect(bonuses.damageMultiplier).toBe(1.15); // 1 + (3 * 0.05)
    });

    test('calculates spell power bonuses', () => {
      mockNPC.skills_combat.magic.spellPower = 2;

      const bonuses = skillSystem.getSkillBonuses(mockNPC);

      expect(bonuses.spellDamageMultiplier).toBe(1.20); // 1 + (2 * 0.10)
    });

    test('calculates loot bonuses', () => {
      mockNPC.skills_combat.utility.fortune = 4;

      const bonuses = skillSystem.getSkillBonuses(mockNPC);

      expect(bonuses.lootMultiplier).toBe(1.60); // 1 + (4 * 0.15)
    });

    test('calculates health regen bonuses', () => {
      mockNPC.skills_combat.utility.regeneration = 2;

      const bonuses = skillSystem.getSkillBonuses(mockNPC);

      expect(bonuses.healthRegen).toBe(1.0); // 2 * 0.5
    });

    test('combines multiple percentage bonuses', () => {
      mockNPC.skills_combat.combat.powerStrike = 5;
      mockNPC.skills_combat.magic.spellPower = 3;
      mockNPC.skills_combat.utility.fortune = 2;

      const bonuses = skillSystem.getSkillBonuses(mockNPC);

      expect(bonuses.damageMultiplier).toBe(1.25); // 1 + (5 * 0.05)
      expect(bonuses.spellDamageMultiplier).toBe(1.30); // 1 + (3 * 0.10)
      expect(bonuses.lootMultiplier).toBe(1.30); // 1 + (2 * 0.15)
    });

    test('handles NPC without skills_combat', () => {
      delete mockNPC.skills_combat;

      const bonuses = skillSystem.getSkillBonuses(mockNPC);

      expect(bonuses.damageMultiplier).toBe(1);
    });
  });

  describe('resetSkills', () => {
    beforeEach(() => {
      // Upgrade some skills
      skillSystem.upgradeSkill(mockNPC, 'combat', 'powerStrike');
      skillSystem.upgradeSkill(mockNPC, 'combat', 'powerStrike');
      skillSystem.upgradeSkill(mockNPC, 'defense', 'ironSkin');
      skillSystem.upgradeSkill(mockNPC, 'combat', 'deadlyBlow');
    });

    test('refunds all skill points', () => {
      const initialPoints = mockNPC.skillPoints; // Should be 10 - 1 - 1 - 1 - 2 = 5
      const refunded = skillSystem.resetSkills(mockNPC);

      expect(refunded).toBe(5); // 2*1 + 1*1 + 1*2
      expect(mockNPC.skillPoints).toBe(10); // 5 + 5 = 10
    });

    test('resets all skills to level 0', () => {
      skillSystem.resetSkills(mockNPC);

      for (const category of Object.values(mockNPC.skills_combat)) {
        for (const level of Object.values(category)) {
          expect(level).toBe(0);
        }
      }
    });

    test('resets stats to base values', () => {
      skillSystem.resetSkills(mockNPC);

      expect(mockNPC.combatStats.health.max).toBe(100);
      expect(mockNPC.combatStats.damage).toBe(10);
      expect(mockNPC.combatStats.defense).toBe(0);
      expect(mockNPC.combatStats.speed).toBe(3);
      expect(mockNPC.combatStats.critChance).toBe(5);
      expect(mockNPC.combatStats.critDamage).toBe(150);
      expect(mockNPC.combatStats.dodgeChance).toBe(5);
    });

    test('calculates base stats based on level', () => {
      mockNPC.combatLevel = 5;

      skillSystem.resetSkills(mockNPC);

      expect(mockNPC.combatStats.health.max).toBe(180); // 100 + (5-1)*20
      expect(mockNPC.combatStats.damage).toBe(30); // 10 + (5-1)*5
      expect(mockNPC.combatStats.speed).toBeCloseTo(3.4); // 3 + (5-1)*0.1
    });

    test('handles NPC without skills_combat', () => {
      delete mockNPC.skills_combat;

      const refunded = skillSystem.resetSkills(mockNPC);

      expect(refunded).toBe(0);
    });
  });

  describe('reapplySkills', () => {
    test('reapplies flat skill bonuses', () => {
      mockNPC.skills_combat.defense.ironSkin = 3;
      mockNPC.skills_combat.defense.vitality = 2;

      skillSystem.reapplySkills(mockNPC);

      expect(mockNPC.combatStats.defense).toBe(6); // 3 * 2
      expect(mockNPC.combatStats.health.max).toBe(150); // 100 + 2*25
    });

    test('does not reapply percentage bonuses', () => {
      mockNPC.skills_combat.combat.powerStrike = 5;

      const initialDamage = mockNPC.combatStats.damage;
      skillSystem.reapplySkills(mockNPC);

      // Damage should not change (percentage bonuses calculated dynamically)
      expect(mockNPC.combatStats.damage).toBe(initialDamage);
    });

    test('handles NPC without skills_combat', () => {
      delete mockNPC.skills_combat;

      expect(() => {
        skillSystem.reapplySkills(mockNPC);
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    test('complete skill upgrade flow', () => {
      // Start with 10 skill points
      expect(mockNPC.skillPoints).toBe(10);

      // Upgrade powerStrike to level 3 (3 points)
      skillSystem.upgradeSkill(mockNPC, 'combat', 'powerStrike');
      skillSystem.upgradeSkill(mockNPC, 'combat', 'powerStrike');
      skillSystem.upgradeSkill(mockNPC, 'combat', 'powerStrike');

      expect(mockNPC.skillPoints).toBe(7);
      expect(mockNPC.skills_combat.combat.powerStrike).toBe(3);

      // Upgrade ironSkin to level 2 (2 points)
      skillSystem.upgradeSkill(mockNPC, 'defense', 'ironSkin');
      skillSystem.upgradeSkill(mockNPC, 'defense', 'ironSkin');

      expect(mockNPC.skillPoints).toBe(5);
      expect(mockNPC.combatStats.defense).toBe(4);

      // Get bonuses
      const bonuses = skillSystem.getSkillBonuses(mockNPC);
      expect(bonuses.damageMultiplier).toBe(1.15);

      // Reset
      skillSystem.resetSkills(mockNPC);
      expect(mockNPC.skillPoints).toBe(10);
      expect(mockNPC.combatStats.defense).toBe(0);
    });
  });
});
