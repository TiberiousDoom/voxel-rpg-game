/**
 * BossAI.test.js - Tests for BossAI system
 */

import { BossAI, BOSS_AI_STATES } from '../BossAI.js';
import { BossMonster } from '../../entities/BossMonster.js';

// Mock the game store
jest.mock('../../stores/useGameStore.js', () => ({
  __esModule: true,
  default: {
    getState: () => ({
      dealDamageToPlayer: jest.fn()
    })
  }
}));

describe('BossAI', () => {
  let bossAI;
  let boss;
  let gameState;

  beforeEach(() => {
    bossAI = new BossAI({ updateInterval: 0 }); // No throttling for tests
    boss = new BossMonster('BROOD_MOTHER', { x: 0, y: 0 });
    gameState = {
      player: {
        position: { x: 10, y: 10 },
        health: 100,
        maxHealth: 100
      }
    };
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const ai = new BossAI();

      expect(ai.updateInterval).toBe(100);
      expect(ai.lastUpdateTime).toBe(0);
    });

    it('should accept custom update interval', () => {
      const ai = new BossAI({ updateInterval: 50 });

      expect(ai.updateInterval).toBe(50);
    });
  });

  describe('update', () => {
    it('should not update dead boss', () => {
      boss.alive = false;
      const initialState = boss.aiState;

      bossAI.update(boss, gameState, 100);

      expect(boss.aiState).toBe(initialState);
    });

    it('should not update without player', () => {
      const noPlayerState = { player: null };
      const initialState = boss.aiState;

      bossAI.update(boss, noPlayerState, 100);

      expect(boss.aiState).toBe(initialState);
    });

    it('should throttle updates based on interval', () => {
      const ai = new BossAI({ updateInterval: 100 });
      boss.aiState = BOSS_AI_STATES.IDLE;

      // First update - not enough time
      ai.update(boss, gameState, 50);
      expect(boss.aiState).toBe(BOSS_AI_STATES.IDLE);

      // Second update - enough accumulated time
      ai.update(boss, gameState, 60);
      expect(boss.aiState).toBe(BOSS_AI_STATES.CHASE);
    });
  });

  describe('IDLE state', () => {
    it('should transition to CHASE when player in aggro range', () => {
      boss.aiState = BOSS_AI_STATES.IDLE;
      gameState.player.position = { x: 5, y: 5 }; // Within aggro range (15)

      bossAI.update(boss, gameState, 100);

      expect(boss.aiState).toBe(BOSS_AI_STATES.CHASE);
      expect(boss.targetId).toBe('player');
    });

    it('should stay IDLE when player out of aggro range', () => {
      boss.aiState = BOSS_AI_STATES.IDLE;
      gameState.player.position = { x: 100, y: 100 }; // Way outside aggro range

      bossAI.update(boss, gameState, 100);

      expect(boss.aiState).toBe(BOSS_AI_STATES.IDLE);
    });

    it('should emit aggro event when engaging', () => {
      boss.aiState = BOSS_AI_STATES.IDLE;
      const aggroHandler = jest.fn();
      boss.on('aggro', aggroHandler);

      bossAI.update(boss, gameState, 100);

      expect(aggroHandler).toHaveBeenCalledWith({ bossId: boss.id });
    });
  });

  describe('CHASE state', () => {
    beforeEach(() => {
      boss.aiState = BOSS_AI_STATES.CHASE;
      boss.targetId = 'player';
    });

    it('should transition to ATTACK when in attack range', () => {
      gameState.player.position = { x: 1, y: 1 }; // Within attack range (2.0)

      bossAI.update(boss, gameState, 100);

      expect(boss.aiState).toBe(BOSS_AI_STATES.ATTACK);
    });

    it('should move toward player', () => {
      const initialX = boss.position.x;
      const initialY = boss.position.y;
      gameState.player.position = { x: 10, y: 0 }; // Player to the right

      bossAI.update(boss, gameState, 1000); // 1 second

      expect(boss.position.x).toBeGreaterThan(initialX);
      expect(boss.animationState).toBe('walk');
    });

    it('should update facing angle toward player', () => {
      gameState.player.position = { x: 10, y: 0 };

      bossAI.update(boss, gameState, 100);

      // Facing right should be angle 0
      expect(boss.facingAngle).toBeCloseTo(0, 1);
    });
  });

  describe('ATTACK state', () => {
    beforeEach(() => {
      boss.aiState = BOSS_AI_STATES.ATTACK;
      boss.targetId = 'player';
      boss.lastAttackTime = 0;
      gameState.player.position = { x: 1, y: 1 };
    });

    it('should transition to CHASE when player out of range', () => {
      gameState.player.position = { x: 20, y: 20 }; // Way outside attack range

      bossAI.update(boss, gameState, 100);

      expect(boss.aiState).toBe(BOSS_AI_STATES.CHASE);
    });

    it('should stop moving when attacking', () => {
      bossAI.update(boss, gameState, 100);

      expect(boss.velocity.x).toBe(0);
      expect(boss.velocity.y).toBe(0);
    });

    it('should perform attack when cooldown ready', () => {
      const attackHandler = jest.fn();
      boss.on('attack', attackHandler);

      bossAI.update(boss, gameState, 2000); // Enough time for attack

      expect(attackHandler).toHaveBeenCalled();
    });

    it('should set animation state to attack', () => {
      bossAI.update(boss, gameState, 100);

      expect(boss.animationState).toBe('attack');
    });
  });

  describe('CASTING state', () => {
    beforeEach(() => {
      boss.aiState = BOSS_AI_STATES.CASTING;
      boss.castProgress = 0;
      bossAI.castingAbility = { name: 'SHADOW_BOLT', damage: 35 };
      bossAI.castDuration = 1000;
    });

    it('should stop movement while casting', () => {
      bossAI.update(boss, gameState, 100);

      expect(boss.velocity.x).toBe(0);
      expect(boss.velocity.y).toBe(0);
    });

    it('should update cast progress', () => {
      bossAI.update(boss, gameState, 500);

      expect(boss.castProgress).toBe(500);
    });

    it('should execute ability when cast complete', () => {
      const abilityHandler = jest.fn();
      boss.on('ability:executed', abilityHandler);

      bossAI.update(boss, gameState, 1100); // Complete cast

      expect(boss.aiState).toBe(BOSS_AI_STATES.ATTACK);
      expect(boss.castProgress).toBe(0);
    });

    it('should set animation state to casting', () => {
      bossAI.update(boss, gameState, 100);

      expect(boss.animationState).toBe('casting');
    });
  });

  describe('SUMMONING state', () => {
    beforeEach(() => {
      boss.aiState = BOSS_AI_STATES.SUMMONING;
      boss.castProgress = 0;
    });

    it('should complete after 1 second', () => {
      bossAI.update(boss, gameState, 1100);

      expect(boss.aiState).toBe(BOSS_AI_STATES.ATTACK);
      expect(boss.castProgress).toBe(0);
    });

    it('should set animation state to summoning', () => {
      bossAI.update(boss, gameState, 100);

      expect(boss.animationState).toBe('summoning');
    });
  });

  describe('PHASE_TRANSITION state', () => {
    beforeEach(() => {
      boss.aiState = BOSS_AI_STATES.PHASE_TRANSITION;
      boss.castProgress = 0;
    });

    it('should complete after 2 seconds', () => {
      bossAI.update(boss, gameState, 2100);

      expect(boss.aiState).toBe(BOSS_AI_STATES.ATTACK);
    });

    it('should set animation state to phase_transition', () => {
      bossAI.update(boss, gameState, 100);

      expect(boss.animationState).toBe('phase_transition');
    });
  });

  describe('ability usage', () => {
    beforeEach(() => {
      boss.aiState = BOSS_AI_STATES.ATTACK;
      gameState.player.position = { x: 1, y: 1 };
    });

    it('should try to use abilities during ATTACK state', () => {
      // Make sure VENOM_SPIT is off cooldown
      boss.abilityCooldowns.clear();
      const abilityHandler = jest.fn();
      boss.on('ability:used', abilityHandler);

      // Run multiple updates to give chance for ability use
      for (let i = 0; i < 20; i++) {
        bossAI.update(boss, gameState, 100);
      }

      // At least one ability should have been attempted
      // (probabilistic, so we check cooldowns)
      expect(boss.abilityCooldowns.size).toBeGreaterThan(0);
    });

    it('should transition to SUMMONING when using summon ability', () => {
      // Force phase 1 to have SPAWN_SPIDERLINGS available
      boss.currentPhase = 1;
      boss.phases[1] = { abilities: ['SPAWN_SPIDERLINGS'] };
      boss.abilityCooldowns.clear();
      boss.summons = []; // Empty summons to trigger summon

      // Call the handler directly for deterministic test
      bossAI._handleAbilityUse(boss, {
        type: 'SUMMON',
        spawnCount: 3,
        spawnType: 'CAVE_SPIDER'
      }, gameState.player, gameState.player.position);

      expect(boss.aiState).toBe(BOSS_AI_STATES.SUMMONING);
    });
  });

  describe('summon creation', () => {
    it('should create summons around boss', () => {
      const summonHandler = jest.fn();
      boss.on('summon:created', summonHandler);

      bossAI._createSummons(boss, {
        spawnCount: 3,
        spawnType: 'CAVE_SPIDER'
      });

      expect(summonHandler).toHaveBeenCalled();
      const summons = summonHandler.mock.calls[0][0].summons;
      expect(summons.length).toBe(3);
      expect(boss.summons.length).toBe(3);
    });

    it('should position summons in a circle', () => {
      bossAI._createSummons(boss, {
        spawnCount: 4,
        spawnType: 'CAVE_SPIDER'
      });

      // Summons should be at different angles around boss
      const positions = boss.summons.map(s => s.position);
      const uniquePositions = new Set(positions.map(p => `${p.x},${p.y}`));
      expect(uniquePositions.size).toBe(4);
    });
  });

  describe('phase transition handling', () => {
    it('should set PHASE_TRANSITION state', () => {
      boss.aiState = BOSS_AI_STATES.ATTACK;

      bossAI.onPhaseTransition(boss, 0, 1);

      expect(boss.aiState).toBe(BOSS_AI_STATES.PHASE_TRANSITION);
      expect(boss.castProgress).toBe(0);
    });

    it('should clear casting state', () => {
      boss.castingAbility = 'TEST';
      bossAI.castingAbility = 'TEST';

      bossAI.onPhaseTransition(boss, 0, 1);

      expect(boss.castingAbility).toBeNull();
      expect(bossAI.castingAbility).toBeNull();
    });
  });

  describe('target selection', () => {
    it('should return player position as best target', () => {
      const target = bossAI.getBestTarget(boss, {}, gameState);

      expect(target.x).toBe(gameState.player.position.x);
    });

    it('should return null without player', () => {
      const target = bossAI.getBestTarget(boss, {}, { player: null });

      expect(target).toBeNull();
    });
  });

  describe('enrage check', () => {
    it('should return true when threshold reached', () => {
      boss.enraged = false;
      boss.enrageTimer = boss.enrageThreshold + 1000;

      expect(bossAI.shouldEnrage(boss)).toBe(true);
    });

    it('should return false when already enraged', () => {
      boss.enraged = true;
      boss.enrageTimer = boss.enrageThreshold + 1000;

      expect(bossAI.shouldEnrage(boss)).toBe(false);
    });

    it('should return false before threshold', () => {
      boss.enraged = false;
      boss.enrageTimer = 1000;

      expect(bossAI.shouldEnrage(boss)).toBe(false);
    });
  });

  describe('BOSS_AI_STATES export', () => {
    it('should export all states', () => {
      expect(BOSS_AI_STATES.IDLE).toBe('IDLE');
      expect(BOSS_AI_STATES.CHASE).toBe('CHASE');
      expect(BOSS_AI_STATES.ATTACK).toBe('ATTACK');
      expect(BOSS_AI_STATES.CASTING).toBe('CASTING');
      expect(BOSS_AI_STATES.SUMMONING).toBe('SUMMONING');
      expect(BOSS_AI_STATES.PHASE_TRANSITION).toBe('PHASE_TRANSITION');
      expect(BOSS_AI_STATES.DEATH).toBe('DEATH');
    });
  });
});
