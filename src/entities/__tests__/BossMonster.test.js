/**
 * BossMonster.test.js - Tests for BossMonster entity
 */

import { BossMonster, BOSS_CONFIGS } from '../BossMonster.js';

describe('BossMonster', () => {
  describe('constructor', () => {
    it('should create a BROOD_MOTHER boss with correct stats', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 10, y: 20 });

      expect(boss.name).toBe('Brood Mother');
      expect(boss.bossType).toBe('BROOD_MOTHER');
      expect(boss.isBoss).toBe(true);
      expect(boss.health).toBe(500);
      expect(boss.maxHealth).toBe(500);
      expect(boss.damage).toBe(25);
      expect(boss.position.x).toBe(10);
      expect(boss.position.y).toBe(20);
    });

    it('should create a NECROMANCER boss with correct stats', () => {
      const boss = new BossMonster('NECROMANCER', { x: 0, y: 0 });

      expect(boss.name).toBe('The Necromancer');
      expect(boss.health).toBe(400);
      expect(boss.damage).toBe(30);
      expect(boss.attackRange).toBe(8.0);
    });

    it('should create a STONE_GOLEM boss with correct stats', () => {
      const boss = new BossMonster('STONE_GOLEM', { x: 0, y: 0 });

      expect(boss.name).toBe('Ancient Stone Golem');
      expect(boss.health).toBe(800);
      expect(boss.defense).toBe(20);
      expect(boss.moveSpeed).toBe(1.2);
    });

    it('should throw error for unknown boss type', () => {
      expect(() => {
        new BossMonster('UNKNOWN_BOSS', { x: 0, y: 0 });
      }).toThrow('Unknown boss type: UNKNOWN_BOSS');
    });

    it('should generate unique id', () => {
      const boss1 = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      const boss2 = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      expect(boss1.id).not.toBe(boss2.id);
    });

    it('should use provided id if given', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 }, { id: 'custom-id' });

      expect(boss.id).toBe('custom-id');
    });

    it('should scale stats to level', () => {
      const level1 = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 }, { level: 1 });
      const level5 = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 }, { level: 5 });

      // Level 5 should have 80% more stats (+20% per level above 1)
      expect(level5.maxHealth).toBe(Math.floor(500 * 1.8));
      expect(level5.damage).toBe(Math.floor(25 * 1.8));
      expect(level1.maxHealth).toBe(500);
    });

    it('should initialize with correct phase state', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      expect(boss.currentPhase).toBe(0);
      expect(boss.phases.length).toBe(3);
      expect(boss.phaseTransitioned).toEqual([true]);
    });
  });

  describe('takeDamage', () => {
    it('should reduce health by damage minus defense', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      const initialHealth = boss.health;

      const result = boss.takeDamage(50);

      // Damage is 50, defense is 10, so actual damage is 40
      expect(boss.health).toBe(initialHealth - 40);
      expect(result.damage).toBe(40);
      expect(result.killed).toBe(false);
    });

    it('should deal at least 1 damage', () => {
      const boss = new BossMonster('STONE_GOLEM', { x: 0, y: 0 }); // 20 defense
      const initialHealth = boss.health;

      const result = boss.takeDamage(5); // Less than defense

      expect(boss.health).toBe(initialHealth - 1);
      expect(result.damage).toBe(1);
    });

    it('should not go below 0 health', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      boss.takeDamage(10000);

      expect(boss.health).toBe(0);
    });

    it('should return killed: true when health reaches 0', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      const result = boss.takeDamage(10000);

      expect(result.killed).toBe(true);
      expect(boss.alive).toBe(false);
    });

    it('should emit damage event', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      const damageHandler = jest.fn();
      boss.on('damage', damageHandler);

      boss.takeDamage(50);

      expect(damageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          bossId: boss.id,
          damage: 40,
          health: boss.health,
          maxHealth: boss.maxHealth
        })
      );
    });

    it('should not take damage if already dead', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      boss.alive = false;

      const result = boss.takeDamage(100);

      expect(result.damage).toBe(0);
      expect(result.killed).toBe(false);
    });

    it('should apply damage reduction from buffs', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      boss.activeBuffs.set('DAMAGE_REDUCTION', { amount: 0.5 });
      const initialHealth = boss.health;

      boss.takeDamage(100); // 100 - 10 defense = 90, then * 0.5 = 45

      expect(boss.health).toBe(initialHealth - 45);
    });
  });

  describe('phase transitions', () => {
    it('should transition to phase 1 at 60% health', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      const phaseHandler = jest.fn();
      boss.on('phase:transition', phaseHandler);

      // Deal enough damage to go below 60% (300/500)
      // Need to deal > 200 damage after defense
      boss.takeDamage(250); // 250 - 10 = 240 damage, leaves 260 health (52%)

      expect(boss.currentPhase).toBe(1);
      expect(phaseHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          oldPhase: 0,
          newPhase: 1,
          phaseName: 'Swarm'
        })
      );
    });

    it('should transition to phase 2 at 30% health', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      // Deal enough to go below 30% (150/500)
      boss.takeDamage(400); // 400 - 10 = 390 damage, leaves 110 health (22%)

      expect(boss.currentPhase).toBe(2);
    });

    it('should apply damage multiplier on phase transition', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      const baseDamage = boss.baseDamage;

      boss.takeDamage(400); // Trigger phase 2 (Frenzy)

      expect(boss.damage).toBe(Math.floor(baseDamage * 1.5));
    });

    it('should apply speed multiplier on phase transition', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      const baseSpeed = boss.baseMoveSpeed;

      boss.takeDamage(400); // Trigger phase 2 (Frenzy)

      expect(boss.moveSpeed).toBe(baseSpeed * 1.3);
    });

    it('should not transition to same phase twice', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      const phaseHandler = jest.fn();
      boss.on('phase:transition', phaseHandler);

      // First hit below 60%
      boss.takeDamage(250);
      // Second hit still below 60%
      boss.takeDamage(10);

      // Phase transition should only fire once
      expect(phaseHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('abilities', () => {
    it('should return available abilities for current phase', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      const abilities = boss.getAvailableAbilities();

      expect(abilities).toContain('VENOM_SPIT');
      expect(abilities).toContain('WEB_TRAP');
      expect(abilities).not.toContain('SPAWN_SPIDERLINGS'); // Phase 2+ only
    });

    it('should check if ability is off cooldown', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      expect(boss.canUseAbility('VENOM_SPIT')).toBe(true);
    });

    it('should return false for unknown ability', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      expect(boss.canUseAbility('UNKNOWN_ABILITY')).toBe(false);
    });

    it('should use ability and set cooldown', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      const result = boss.useAbility('VENOM_SPIT');

      expect(result).not.toBeNull();
      expect(result.name).toBe('Venom Spit'); // Returns display name from ability config
      expect(boss.canUseAbility('VENOM_SPIT')).toBe(false);
    });

    it('should return null if ability on cooldown', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      boss.useAbility('VENOM_SPIT');

      const result = boss.useAbility('VENOM_SPIT');

      expect(result).toBeNull();
    });

    it('should emit ability:used event', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      const abilityHandler = jest.fn();
      boss.on('ability:used', abilityHandler);

      boss.useAbility('VENOM_SPIT');

      expect(abilityHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          bossId: boss.id,
          ability: 'VENOM_SPIT'
        })
      );
    });

    it('should apply buff when using buff ability', () => {
      const boss = new BossMonster('STONE_GOLEM', { x: 0, y: 0 });
      // Trigger phase 1 to get STONE_ARMOR
      boss.takeDamage(350); // Go below 60%

      boss.useAbility('STONE_ARMOR');

      expect(boss.activeBuffs.has('DAMAGE_REDUCTION')).toBe(true);
    });
  });

  describe('heal', () => {
    it('should increase health', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      boss.health = 300;

      boss.heal(50);

      expect(boss.health).toBe(350);
    });

    it('should not exceed max health', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      boss.heal(100);

      expect(boss.health).toBe(boss.maxHealth);
    });

    it('should not heal if dead', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      boss.alive = false;
      boss.health = 0;

      boss.heal(100);

      expect(boss.health).toBe(0);
    });

    it('should emit heal event', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      boss.health = 300;
      const healHandler = jest.fn();
      boss.on('heal', healHandler);

      boss.heal(50);

      expect(healHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          bossId: boss.id,
          amount: 50,
          health: 350
        })
      );
    });
  });

  describe('enrage', () => {
    it('should enrage after threshold time', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 }, {
        enrageTime: 1000 // 1 second for testing
      });
      const enrageHandler = jest.fn();
      boss.on('enrage', enrageHandler);

      boss.update(500);
      expect(boss.enraged).toBe(false);

      boss.update(600); // Total 1100ms

      expect(boss.enraged).toBe(true);
      expect(enrageHandler).toHaveBeenCalled();
    });

    it('should boost stats when enraged', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 }, {
        enrageTime: 100
      });
      const baseDamage = boss.damage;
      const baseAttackSpeed = boss.attackSpeed;
      const baseMoveSpeed = boss.moveSpeed;

      boss.update(150);

      expect(boss.damage).toBe(Math.floor(baseDamage * 1.5));
      expect(boss.attackSpeed).toBe(baseAttackSpeed * 1.5);
      expect(boss.moveSpeed).toBe(baseMoveSpeed * 1.2);
    });
  });

  describe('summons', () => {
    it('should add summon', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      const summon = { id: 'summon1', type: 'CAVE_SPIDER' };

      boss.addSummon(summon);

      expect(boss.summons).toContain(summon);
    });

    it('should not exceed max summons', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 }, { maxSummons: 2 });

      boss.addSummon({ id: '1' });
      boss.addSummon({ id: '2' });
      boss.addSummon({ id: '3' }); // Should not be added

      expect(boss.summons.length).toBe(2);
    });

    it('should remove summon by id', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      boss.addSummon({ id: '1' });
      boss.addSummon({ id: '2' });

      boss.removeSummon('1');

      expect(boss.summons.length).toBe(1);
      expect(boss.summons[0].id).toBe('2');
    });
  });

  describe('death', () => {
    it('should emit death event with rewards', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      const deathHandler = jest.fn();
      boss.on('death', deathHandler);

      boss.takeDamage(10000);

      expect(deathHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          bossId: boss.id,
          bossType: 'BROOD_MOTHER',
          xpReward: 500,
          goldReward: [200, 500],
          lootTable: 'boss_brood_mother',
          guaranteedDrops: ['BROOD_MOTHER_FANG']
        })
      );
    });

    it('should set aiState to DEATH', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      boss.takeDamage(10000);

      expect(boss.aiState).toBe('DEATH');
    });

    it('should set deathTime', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      boss.takeDamage(10000);

      expect(boss.deathTime).not.toBeNull();
    });
  });

  describe('utility methods', () => {
    it('should get health percent', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
      boss.health = 250;

      expect(boss.getHealthPercent()).toBe(0.5);
    });

    it('should check if in final phase', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      expect(boss.isInFinalPhase()).toBe(false);

      boss.takeDamage(400); // Trigger final phase

      expect(boss.isInFinalPhase()).toBe(true);
    });

    it('should get current phase info', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });

      const phase = boss.getCurrentPhase();

      expect(phase.index).toBe(0);
      expect(phase.name).toBe('Normal');
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const boss = new BossMonster('BROOD_MOTHER', { x: 10, y: 20 }, { id: 'test-boss' });
      boss.health = 300;
      boss.currentPhase = 1;
      boss.enraged = true;

      const json = boss.toJSON();

      expect(json.id).toBe('test-boss');
      expect(json.bossType).toBe('BROOD_MOTHER');
      expect(json.position).toEqual({ x: 10, y: 20 });
      expect(json.health).toBe(300);
      expect(json.currentPhase).toBe(1);
      expect(json.enraged).toBe(true);
    });

    it('should deserialize from JSON', () => {
      const data = {
        id: 'saved-boss',
        bossType: 'NECROMANCER',
        position: { x: 5, y: 10 },
        health: 200,
        maxHealth: 400,
        currentPhase: 1,
        phaseTransitioned: [true, true],
        enraged: false,
        enrageTimer: 5000,
        alive: true,
        level: 2,
        abilityCooldowns: [['SHADOW_BOLT', Date.now() + 1000]]
      };

      const boss = BossMonster.fromJSON(data);

      expect(boss.id).toBe('saved-boss');
      expect(boss.bossType).toBe('NECROMANCER');
      expect(boss.health).toBe(200);
      expect(boss.currentPhase).toBe(1);
      expect(boss.phaseTransitioned).toEqual([true, true]);
      expect(boss.enrageTimer).toBe(5000);
    });
  });

  describe('static methods', () => {
    it('should get boss config', () => {
      const config = BossMonster.getConfig('BROOD_MOTHER');

      expect(config.name).toBe('Brood Mother');
      expect(config.baseStats.health).toBe(500);
    });

    it('should return null for unknown boss config', () => {
      const config = BossMonster.getConfig('UNKNOWN');

      expect(config).toBeNull();
    });

    it('should get all boss types', () => {
      const types = BossMonster.getBossTypes();

      expect(types).toContain('BROOD_MOTHER');
      expect(types).toContain('NECROMANCER');
      expect(types).toContain('STONE_GOLEM');
      expect(types.length).toBe(3);
    });
  });
});
