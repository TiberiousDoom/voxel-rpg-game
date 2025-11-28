/**
 * ExpeditionManager.test.js - Tests for expedition lifecycle management
 */
import ExpeditionManager from '../ExpeditionManager.js';

describe('ExpeditionManager', () => {
  let expeditionManager, partyManager, npcManager, npc1, npc2;

  beforeEach(() => {
    // Mock NPCManager
    npcManager = {
      npcs: new Map(),
      getNPC: jest.fn((id) => npcManager.npcs.get(id)),
      awardCombatXP: jest.fn(),
      checkVeteranStatus: jest.fn()
    };

    // Create test NPCs
    npc1 = {
      id: 'npc1',
      name: 'Fighter',
      alive: true,
      onExpedition: false,
      expeditionCount: 0,
      kills: 0,
      combatStats: {
        health: { current: 100, max: 100 },
        damage: 20
      }
    };

    npc2 = {
      id: 'npc2',
      name: 'Mage',
      alive: true,
      onExpedition: false,
      expeditionCount: 0,
      kills: 0,
      combatStats: {
        health: { current: 80, max: 80 },
        damage: 30
      }
    };

    npcManager.npcs.set('npc1', npc1);
    npcManager.npcs.set('npc2', npc2);

    // Mock PartyManager
    partyManager = {
      currentParty: {
        id: 'party1',
        members: [
          { npcId: 'npc1', role: 'tank', position: 0 },
          { npcId: 'npc2', role: 'damage', position: 1 }
        ],
        leader: 'npc1',
        formation: 'balanced'
      },
      getParty: jest.fn(() => partyManager.currentParty),
      validateParty: jest.fn(() => ({ valid: true, errors: [] }))
    };

    expeditionManager = new ExpeditionManager(partyManager, npcManager);
  });

  describe('startExpedition', () => {
    test('starts expedition successfully', () => {
      const result = expeditionManager.startExpedition({
        difficulty: 2,
        dungeonType: 'dungeon',
        maxFloor: 3
      });

      expect(result.success).toBe(true);
      expect(result.expedition).toBeDefined();
      expect(result.expedition.id).toContain('expedition_');
      expect(result.expedition.status).toBe('active');
      expect(result.expedition.config.difficulty).toBe(2);
      expect(result.expedition.config.dungeonType).toBe('dungeon');
      expect(result.expedition.state.currentFloor).toBe(1);
      expect(result.expedition.state.maxFloor).toBe(3);
    });

    test('marks NPCs as on expedition', () => {
      expeditionManager.startExpedition({ difficulty: 1 });

      expect(npc1.onExpedition).toBe(true);
      expect(npc2.onExpedition).toBe(true);
    });

    test('uses default values for config', () => {
      const result = expeditionManager.startExpedition({});

      expect(result.expedition.config.difficulty).toBe(1);
      expect(result.expedition.config.dungeonType).toBe('cave');
      expect(result.expedition.state.maxFloor).toBe(5);
    });

    test('fails when party validation fails', () => {
      partyManager.validateParty.mockReturnValue({
        valid: false,
        errors: ['Party is empty', 'NPC is dead']
      });

      const result = expeditionManager.startExpedition({ difficulty: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Party validation failed');
      expect(result.error).toContain('Party is empty');
    });

    test('fails when expedition already in progress', () => {
      expeditionManager.startExpedition({ difficulty: 1 });
      const result = expeditionManager.startExpedition({ difficulty: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Expedition already in progress');
    });

    test('emits expedition:started event', () => {
      const listener = jest.fn();
      expeditionManager.on('expedition:started', listener);

      expeditionManager.startExpedition({ difficulty: 1 });

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0]).toHaveProperty('expeditionId');
      expect(listener.mock.calls[0][0]).toHaveProperty('party');
    });
  });

  describe('updateExpedition', () => {
    beforeEach(() => {
      expeditionManager.startExpedition({ difficulty: 1 });
    });

    test('updates expedition state', () => {
      expeditionManager.updateExpedition({
        currentFloor: 2,
        enemiesKilled: 5,
        goldEarned: 100
      });

      expect(expeditionManager.activeExpedition.state.currentFloor).toBe(2);
      expect(expeditionManager.activeExpedition.state.enemiesKilled).toBe(5);
      expect(expeditionManager.activeExpedition.state.goldEarned).toBe(100);
    });

    test('emits expedition:updated event', () => {
      const listener = jest.fn();
      expeditionManager.on('expedition:updated', listener);

      expeditionManager.updateExpedition({ currentFloor: 2 });

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].updates).toEqual({ currentFloor: 2 });
    });

    test('does nothing when no active expedition', () => {
      expeditionManager.activeExpedition = null;

      expect(() => {
        expeditionManager.updateExpedition({ currentFloor: 2 });
      }).not.toThrow();
    });
  });

  describe('completeExpedition', () => {
    beforeEach(() => {
      expeditionManager.startExpedition({ difficulty: 1 });
      expeditionManager.updateExpedition({ enemiesKilled: 10, goldEarned: 200 });
    });

    test('completes expedition successfully', () => {
      const result = expeditionManager.completeExpedition({
        totalXP: 150,
        enemiesKilled: 10
      });

      expect(result.success).toBe(true);
      expect(result.expedition.status).toBe('completed');
      expect(result.expedition.state.endTime).toBeDefined();
    });

    test('awards XP to party members', () => {
      expeditionManager.completeExpedition({ totalXP: 150 });

      expect(npcManager.awardCombatXP).toHaveBeenCalledWith('npc1', 150);
      expect(npcManager.awardCombatXP).toHaveBeenCalledWith('npc2', 150);
    });

    test('increments expedition count', () => {
      expeditionManager.completeExpedition({ totalXP: 150, enemiesKilled: 10 });

      expect(npc1.expeditionCount).toBe(1);
      expect(npc2.expeditionCount).toBe(1);
    });

    test('updates kill count', () => {
      expeditionManager.completeExpedition({ totalXP: 150, enemiesKilled: 10 });

      expect(npc1.kills).toBe(10);
      expect(npc2.kills).toBe(10);
    });

    test('marks NPCs as not on expedition', () => {
      expeditionManager.completeExpedition({ totalXP: 150 });

      expect(npc1.onExpedition).toBe(false);
      expect(npc2.onExpedition).toBe(false);
    });

    test('checks veteran status', () => {
      expeditionManager.completeExpedition({ totalXP: 150 });

      expect(npcManager.checkVeteranStatus).toHaveBeenCalledWith('npc1');
      expect(npcManager.checkVeteranStatus).toHaveBeenCalledWith('npc2');
    });

    test('saves to history', () => {
      expeditionManager.completeExpedition({ totalXP: 150 });

      expect(expeditionManager.expeditionHistory).toHaveLength(1);
      expect(expeditionManager.expeditionHistory[0].status).toBe('completed');
    });

    test('clears active expedition', () => {
      expeditionManager.completeExpedition({ totalXP: 150 });

      expect(expeditionManager.activeExpedition).toBeNull();
    });

    test('emits expedition:completed event', () => {
      const listener = jest.fn();
      expeditionManager.on('expedition:completed', listener);

      expeditionManager.completeExpedition({ totalXP: 150 });

      expect(listener).toHaveBeenCalled();
    });

    test('uses default XP when not provided', () => {
      expeditionManager.completeExpedition({});

      expect(npcManager.awardCombatXP).toHaveBeenCalledWith('npc1', 100);
    });

    test('fails when no active expedition', () => {
      expeditionManager.activeExpedition = null;

      const result = expeditionManager.completeExpedition({ totalXP: 150 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active expedition');
    });
  });

  describe('failExpedition', () => {
    beforeEach(() => {
      expeditionManager.startExpedition({ difficulty: 1 });
    });

    test('fails expedition successfully', () => {
      const result = expeditionManager.failExpedition({
        reason: 'Party wiped'
      });

      expect(result.success).toBe(true);
      expect(result.expedition.status).toBe('failed');
      expect(result.expedition.state.endTime).toBeDefined();
    });

    test('marks NPCs as not on expedition', () => {
      expeditionManager.failExpedition({});

      expect(npc1.onExpedition).toBe(false);
      expect(npc2.onExpedition).toBe(false);
    });

    test('injures NPCs (reduces health)', () => {
      const initialHealth1 = npc1.combatStats.health.current;
      const initialHealth2 = npc2.combatStats.health.current;

      expeditionManager.failExpedition({ permaDeath: false });

      expect(npc1.combatStats.health.current).toBeLessThan(initialHealth1);
      expect(npc2.combatStats.health.current).toBeLessThan(initialHealth2);
      expect(npc1.combatStats.health.current).toBeGreaterThan(0);
    });

    test('saves to history', () => {
      expeditionManager.failExpedition({});

      expect(expeditionManager.expeditionHistory).toHaveLength(1);
      expect(expeditionManager.expeditionHistory[0].status).toBe('failed');
    });

    test('clears active expedition', () => {
      expeditionManager.failExpedition({});

      expect(expeditionManager.activeExpedition).toBeNull();
    });

    test('emits expedition:failed event', () => {
      const listener = jest.fn();
      expeditionManager.on('expedition:failed', listener);

      expeditionManager.failExpedition({});

      expect(listener).toHaveBeenCalled();
    });

    test('fails when no active expedition', () => {
      expeditionManager.activeExpedition = null;

      const result = expeditionManager.failExpedition({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active expedition');
    });
  });

  describe('abandonExpedition', () => {
    beforeEach(() => {
      expeditionManager.startExpedition({ difficulty: 1 });
    });

    test('abandons expedition successfully', () => {
      const result = expeditionManager.abandonExpedition();

      expect(result.success).toBe(true);
      expect(result.expedition.status).toBe('abandoned');
      expect(result.expedition.state.endTime).toBeDefined();
    });

    test('marks NPCs as not on expedition', () => {
      expeditionManager.abandonExpedition();

      expect(npc1.onExpedition).toBe(false);
      expect(npc2.onExpedition).toBe(false);
    });

    test('does not injure NPCs', () => {
      const initialHealth1 = npc1.combatStats.health.current;
      const initialHealth2 = npc2.combatStats.health.current;

      expeditionManager.abandonExpedition();

      expect(npc1.combatStats.health.current).toBe(initialHealth1);
      expect(npc2.combatStats.health.current).toBe(initialHealth2);
    });

    test('saves to history', () => {
      expeditionManager.abandonExpedition();

      expect(expeditionManager.expeditionHistory).toHaveLength(1);
      expect(expeditionManager.expeditionHistory[0].status).toBe('abandoned');
    });

    test('clears active expedition', () => {
      expeditionManager.abandonExpedition();

      expect(expeditionManager.activeExpedition).toBeNull();
    });

    test('emits expedition:abandoned event', () => {
      const listener = jest.fn();
      expeditionManager.on('expedition:abandoned', listener);

      expeditionManager.abandonExpedition();

      expect(listener).toHaveBeenCalled();
    });

    test('fails when no active expedition', () => {
      expeditionManager.activeExpedition = null;

      const result = expeditionManager.abandonExpedition();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active expedition');
    });
  });

  describe('getActiveExpedition', () => {
    test('returns active expedition', () => {
      expeditionManager.startExpedition({ difficulty: 1 });

      const expedition = expeditionManager.getActiveExpedition();

      expect(expedition).toBeDefined();
      expect(expedition.status).toBe('active');
    });

    test('returns null when no active expedition', () => {
      const expedition = expeditionManager.getActiveExpedition();

      expect(expedition).toBeNull();
    });
  });

  describe('getHistory', () => {
    test('returns empty array initially', () => {
      const history = expeditionManager.getHistory();

      expect(history).toEqual([]);
    });

    test('returns expedition history', () => {
      expeditionManager.startExpedition({ difficulty: 1 });
      expeditionManager.completeExpedition({ totalXP: 100 });

      expeditionManager.startExpedition({ difficulty: 2 });
      expeditionManager.failExpedition({});

      const history = expeditionManager.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].status).toBe('completed');
      expect(history[1].status).toBe('failed');
    });

    test('returns copy of history', () => {
      expeditionManager.startExpedition({ difficulty: 1 });
      expeditionManager.completeExpedition({ totalXP: 100 });

      const history1 = expeditionManager.getHistory();
      const history2 = expeditionManager.getHistory();

      expect(history1).not.toBe(history2);
      expect(history1).toEqual(history2);
    });
  });

  describe('getStatistics', () => {
    test('returns zero statistics initially', () => {
      const stats = expeditionManager.getStatistics();

      expect(stats.totalExpeditions).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.abandoned).toBe(0);
    });

    test('calculates statistics correctly', () => {
      // Completed expedition
      expeditionManager.startExpedition({ difficulty: 1 });
      expeditionManager.updateExpedition({ enemiesKilled: 5, goldEarned: 100 });
      expeditionManager.completeExpedition({ totalXP: 100, enemiesKilled: 5 });

      // Failed expedition
      expeditionManager.startExpedition({ difficulty: 2 });
      expeditionManager.updateExpedition({ enemiesKilled: 3, goldEarned: 50 });
      expeditionManager.failExpedition({});

      // Abandoned expedition
      expeditionManager.startExpedition({ difficulty: 1 });
      expeditionManager.abandonExpedition();

      const stats = expeditionManager.getStatistics();

      expect(stats.totalExpeditions).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.abandoned).toBe(1);
      expect(stats.totalEnemiesKilled).toBe(8);
      expect(stats.totalGoldEarned).toBe(150);
    });
  });

  describe('canStartExpedition', () => {
    test('allows starting when conditions are met', () => {
      const result = expeditionManager.canStartExpedition();

      expect(result.canStart).toBe(true);
    });

    test('prevents starting when expedition in progress', () => {
      expeditionManager.startExpedition({ difficulty: 1 });

      const result = expeditionManager.canStartExpedition();

      expect(result.canStart).toBe(false);
      expect(result.reason).toBe('Expedition already in progress');
    });

    test('prevents starting when party invalid', () => {
      partyManager.validateParty.mockReturnValue({
        valid: false,
        errors: ['Party is empty']
      });

      const result = expeditionManager.canStartExpedition();

      expect(result.canStart).toBe(false);
      expect(result.reason).toContain('Party is empty');
    });
  });

  describe('Integration', () => {
    test('complete expedition flow', () => {
      // Start expedition
      const startResult = expeditionManager.startExpedition({
        difficulty: 2,
        dungeonType: 'dungeon',
        maxFloor: 3
      });

      expect(startResult.success).toBe(true);
      expect(npc1.onExpedition).toBe(true);

      // Update progress
      expeditionManager.updateExpedition({
        currentFloor: 2,
        enemiesKilled: 5,
        goldEarned: 100
      });

      expect(expeditionManager.activeExpedition.state.currentFloor).toBe(2);

      // Complete expedition
      const completeResult = expeditionManager.completeExpedition({
        totalXP: 200,
        enemiesKilled: 5
      });

      expect(completeResult.success).toBe(true);
      expect(npc1.onExpedition).toBe(false);
      expect(npc1.expeditionCount).toBe(1);
      expect(expeditionManager.activeExpedition).toBeNull();
      expect(expeditionManager.expeditionHistory).toHaveLength(1);

      // Can start new expedition
      const canStart = expeditionManager.canStartExpedition();
      expect(canStart.canStart).toBe(true);
    });
  });
});
