/**
 * DungeonIntegration.test.js - Tests for dungeon integration service
 */

import { DungeonIntegration } from '../DungeonIntegration';
import useDungeonStore, { DUNGEON_STATES } from '../../stores/useDungeonStore';

// Mock the game store
jest.mock('../../stores/useGameStore', () => ({
  __esModule: true,
  default: {
    getState: () => ({
      player: {
        position: { x: 0, y: 0 },
        health: 100,
        maxHealth: 100,
        damage: 10
      },
      addXP: jest.fn()
    })
  }
}));

describe('DungeonIntegration', () => {
  let integration;

  beforeEach(() => {
    // Reset dungeon store
    useDungeonStore.getState().resetDungeon();
    integration = new DungeonIntegration({ seed: 12345 });
  });

  afterEach(() => {
    integration = null;
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const di = new DungeonIntegration();
      expect(di.layoutGenerator).toBeDefined();
      expect(di.bossAI).toBeDefined();
      expect(di.activeBoss).toBeNull();
    });

    it('should accept quest manager', () => {
      const mockQuestManager = { onDungeonEntered: jest.fn() };
      const di = new DungeonIntegration({ questManager: mockQuestManager });
      expect(di.questManager).toBe(mockQuestManager);
    });
  });

  describe('startDungeon', () => {
    it('should start a CAVE dungeon', () => {
      const result = integration.startDungeon('CAVE', 1);

      expect(result.dungeonType).toBe('CAVE');
      expect(result.level).toBe(1);
      expect(result.layout).toBeDefined();

      const storeState = useDungeonStore.getState();
      expect(storeState.status).toBe(DUNGEON_STATES.EXPLORING);
      expect(storeState.dungeonType).toBe('CAVE');
    });

    it('should start a CRYPT dungeon', () => {
      const result = integration.startDungeon('CRYPT', 2);

      expect(result.dungeonType).toBe('CRYPT');
      expect(result.level).toBe(2);
    });

    it('should start a RUINS dungeon', () => {
      const result = integration.startDungeon('RUINS', 3);

      expect(result.dungeonType).toBe('RUINS');
      expect(result.level).toBe(3);
    });

    it('should populate rooms with enemies', () => {
      integration.startDungeon('CAVE', 1);

      expect(integration.activeMonsters.size).toBeGreaterThan(0);
    });

    it('should create a boss', () => {
      integration.startDungeon('CAVE', 1);

      expect(integration.activeBoss).not.toBeNull();
      expect(integration.activeBoss.bossType).toBe('BROOD_MOTHER');
    });

    it('should notify quest manager', () => {
      const mockQuestManager = { onDungeonEntered: jest.fn() };
      integration.questManager = mockQuestManager;

      integration.startDungeon('CAVE', 1);

      expect(mockQuestManager.onDungeonEntered).toHaveBeenCalledWith('CAVE', 1);
    });

    it('should emit dungeonStarted event', () => {
      const handler = jest.fn();
      integration.on('dungeonStarted', handler);

      integration.startDungeon('CAVE', 1);

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].type).toBe('CAVE');
    });
  });

  describe('getEnemiesForRoom', () => {
    beforeEach(() => {
      integration.startDungeon('CAVE', 1);
    });

    it('should have active monsters populated', () => {
      // After starting dungeon, there should be active monsters
      expect(integration.activeMonsters.size).toBeGreaterThan(0);

      // Monsters should have proper structure
      const monsters = Array.from(integration.activeMonsters.values());
      expect(monsters[0]).toHaveProperty('id');
      expect(monsters[0]).toHaveProperty('health');
      expect(monsters[0]).toHaveProperty('alive', true);
    });

    it('should return empty array for entrance room', () => {
      const rooms = useDungeonStore.getState().rooms;
      const entrance = rooms.find(r => r.type === 'ENTRANCE');

      const enemies = integration.getEnemiesForRoom(entrance.id);
      expect(enemies.length).toBe(0);
    });

    it('should return empty array for unknown room', () => {
      const enemies = integration.getEnemiesForRoom('unknown-room');
      expect(enemies.length).toBe(0);
    });
  });

  describe('enterBossRoom', () => {
    beforeEach(() => {
      integration.startDungeon('CAVE', 1);
    });

    it('should start boss fight', () => {
      const rooms = useDungeonStore.getState().rooms;
      const bossRoom = rooms.find(r => r.type === 'BOSS');

      integration.enterBossRoom(bossRoom.id);

      const state = useDungeonStore.getState();
      expect(state.status).toBe(DUNGEON_STATES.BOSS_FIGHT);
      expect(state.boss).not.toBeNull();
    });

    it('should emit bossFightStarted event', () => {
      const handler = jest.fn();
      integration.on('bossFightStarted', handler);

      const rooms = useDungeonStore.getState().rooms;
      const bossRoom = rooms.find(r => r.type === 'BOSS');

      integration.enterBossRoom(bossRoom.id);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('endDungeon', () => {
    beforeEach(() => {
      integration.startDungeon('CAVE', 1);
    });

    it('should end dungeon successfully', () => {
      const result = integration.endDungeon(true);

      expect(result.success).toBe(true);
      expect(result.dungeonType).toBe('CAVE');
      expect(integration.activeBoss).toBeNull();
      expect(integration.activeMonsters.size).toBe(0);
    });

    it('should end dungeon as failed', () => {
      const result = integration.endDungeon(false);

      expect(result.success).toBe(false);
    });

    it('should notify quest manager on success', () => {
      const mockQuestManager = { onDungeonCleared: jest.fn() };
      integration.questManager = mockQuestManager;

      integration.endDungeon(true);

      expect(mockQuestManager.onDungeonCleared).toHaveBeenCalled();
    });

    it('should notify quest manager on failure', () => {
      const mockQuestManager = { onDungeonFailed: jest.fn() };
      integration.questManager = mockQuestManager;

      integration.endDungeon(false);

      expect(mockQuestManager.onDungeonFailed).toHaveBeenCalled();
    });

    it('should emit dungeonEnded event', () => {
      const handler = jest.fn();
      integration.on('dungeonEnded', handler);

      integration.endDungeon(true);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('save and load', () => {
    it('should save dungeon state', () => {
      integration.startDungeon('CAVE', 1);

      const saved = integration.save();

      expect(saved.status).toBe(DUNGEON_STATES.EXPLORING);
      expect(saved.dungeonType).toBe('CAVE');
      expect(saved.boss).not.toBeNull();
      expect(saved.monsters.length).toBeGreaterThan(0);
    });

    it('should load dungeon state', () => {
      integration.startDungeon('CAVE', 1);
      const saved = integration.save();

      // Reset
      integration.endDungeon(false);
      useDungeonStore.getState().resetDungeon();

      // Load
      integration.load(saved);

      const state = useDungeonStore.getState();
      expect(state.status).toBe(DUNGEON_STATES.EXPLORING);
      expect(state.dungeonType).toBe('CAVE');
    });

    it('should not load inactive state', () => {
      integration.load({ status: 'INACTIVE' });

      expect(useDungeonStore.getState().status).toBe(DUNGEON_STATES.INACTIVE);
    });

    it('should restore boss on load', () => {
      integration.startDungeon('CAVE', 1);
      const saved = integration.save();

      integration.endDungeon(false);
      expect(integration.activeBoss).toBeNull();

      integration.load(saved);
      expect(integration.activeBoss).not.toBeNull();
    });
  });

  describe('event listeners', () => {
    it('should add and trigger event listeners', () => {
      const handler = jest.fn();
      integration.on('testEvent', handler);

      integration._emit('testEvent', { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should remove event listeners', () => {
      const handler = jest.fn();
      integration.on('testEvent', handler);
      integration.off('testEvent', handler);

      integration._emit('testEvent', { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('boss type mapping', () => {
    it('should create BROOD_MOTHER for CAVE dungeon', () => {
      integration.startDungeon('CAVE', 1);
      expect(integration.activeBoss.bossType).toBe('BROOD_MOTHER');
    });

    it('should create NECROMANCER for CRYPT dungeon', () => {
      integration.startDungeon('CRYPT', 1);
      expect(integration.activeBoss.bossType).toBe('NECROMANCER');
    });

    it('should create STONE_GOLEM for RUINS dungeon', () => {
      integration.startDungeon('RUINS', 1);
      expect(integration.activeBoss.bossType).toBe('STONE_GOLEM');
    });
  });

  describe('enemy creation', () => {
    beforeEach(() => {
      integration.startDungeon('CAVE', 1);
    });

    it('should create enemies with correct properties', () => {
      const enemies = Array.from(integration.activeMonsters.values());

      enemies.forEach(enemy => {
        expect(enemy.id).toBeDefined();
        expect(enemy.type).toBeDefined();
        expect(enemy.health).toBeGreaterThan(0);
        expect(enemy.maxHealth).toBe(enemy.health);
        expect(enemy.damage).toBeGreaterThan(0);
        expect(enemy.alive).toBe(true);
      });
    });

    it('should scale enemy stats with level', () => {
      const level1Integration = new DungeonIntegration({ seed: 1 });
      level1Integration.startDungeon('CAVE', 1);
      const level1Enemies = Array.from(level1Integration.activeMonsters.values());

      const level5Integration = new DungeonIntegration({ seed: 1 });
      level5Integration.startDungeon('CAVE', 5);
      const level5Enemies = Array.from(level5Integration.activeMonsters.values());

      if (level1Enemies.length > 0 && level5Enemies.length > 0) {
        expect(level5Enemies[0].health).toBeGreaterThan(level1Enemies[0].health);
        expect(level5Enemies[0].damage).toBeGreaterThan(level1Enemies[0].damage);
      }
    });
  });
});
