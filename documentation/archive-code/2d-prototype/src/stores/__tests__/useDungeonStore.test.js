/**
 * useDungeonStore.test.js - Tests for dungeon store
 */

import useDungeonStore, { DUNGEON_STATES } from '../useDungeonStore';

describe('useDungeonStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useDungeonStore.getState().resetDungeon();
  });

  describe('initial state', () => {
    it('should have INACTIVE status', () => {
      const state = useDungeonStore.getState();
      expect(state.status).toBe(DUNGEON_STATES.INACTIVE);
    });

    it('should have no dungeon data', () => {
      const state = useDungeonStore.getState();
      expect(state.dungeonType).toBeNull();
      expect(state.layout).toBeNull();
      expect(state.rooms).toEqual([]);
    });
  });

  describe('startDungeon', () => {
    it('should start a new dungeon', () => {
      const mockLayout = {
        rooms: new Map([
          ['room1', { id: 'room1', type: 'ENTRANCE', gridPosition: { x: 0, y: 0 } }],
          ['room2', { id: 'room2', type: 'CHAMBER', gridPosition: { x: 1, y: 0 } }]
        ]),
        entranceRoomId: 'room1'
      };

      useDungeonStore.getState().startDungeon('CAVE', 1, mockLayout, 12345);

      const state = useDungeonStore.getState();
      expect(state.status).toBe(DUNGEON_STATES.EXPLORING);
      expect(state.dungeonType).toBe('CAVE');
      expect(state.dungeonLevel).toBe(1);
      expect(state.seed).toBe(12345);
      expect(state.rooms.length).toBe(2);
      expect(state.currentRoomId).toBe('room1');
      expect(state.roomsTotal).toBe(2);
      expect(state.roomsExplored).toBe(1);
    });

    it('should reset loot and stats', () => {
      useDungeonStore.setState({ loot: [{ id: 'old' }], goldCollected: 100 });

      useDungeonStore.getState().startDungeon('CAVE', 1, null, 1);

      const state = useDungeonStore.getState();
      expect(state.loot).toEqual([]);
      expect(state.goldCollected).toBe(0);
      expect(state.xpGained).toBe(0);
    });
  });

  describe('endDungeon', () => {
    beforeEach(() => {
      useDungeonStore.getState().startDungeon('CAVE', 1, null, 1);
      useDungeonStore.setState({
        goldCollected: 100,
        xpGained: 500,
        loot: [{ id: 'item1' }],
        roomsExplored: 5,
        roomsCleared: 4
      });
    });

    it('should end dungeon successfully', () => {
      const result = useDungeonStore.getState().endDungeon(true);

      expect(result.success).toBe(true);
      expect(result.goldCollected).toBe(100);
      expect(result.xpGained).toBe(500);
      expect(result.loot.length).toBe(1);
      expect(useDungeonStore.getState().status).toBe(DUNGEON_STATES.CLEARED);
    });

    it('should end dungeon as failed', () => {
      const result = useDungeonStore.getState().endDungeon(false);

      expect(result.success).toBe(false);
      expect(useDungeonStore.getState().status).toBe(DUNGEON_STATES.FAILED);
    });
  });

  describe('enterRoom', () => {
    beforeEach(() => {
      useDungeonStore.setState({
        status: DUNGEON_STATES.EXPLORING,
        rooms: [
          { id: 'room1', type: 'ENTRANCE' },
          { id: 'room2', type: 'CHAMBER' }
        ],
        currentRoomId: 'room1',
        roomsExplored: 1
      });
    });

    it('should enter a new room', () => {
      useDungeonStore.getState().enterRoom('room2', []);

      const state = useDungeonStore.getState();
      expect(state.currentRoomId).toBe('room2');
      expect(state.previousRoomId).toBe('room1');
      expect(state.status).toBe(DUNGEON_STATES.IN_ROOM);
      expect(state.roomsExplored).toBe(2);
    });

    it('should enter combat if enemies present', () => {
      const enemies = [{ id: 'enemy1', health: 50 }];

      useDungeonStore.getState().enterRoom('room2', enemies);

      const state = useDungeonStore.getState();
      expect(state.status).toBe(DUNGEON_STATES.COMBAT);
      expect(state.enemies.length).toBe(1);
      expect(state.enemiesRemaining).toBe(1);
    });

    it('should show boss health for boss room', () => {
      useDungeonStore.setState({
        rooms: [
          { id: 'room1', type: 'ENTRANCE' },
          { id: 'boss', type: 'BOSS' }
        ]
      });

      useDungeonStore.getState().enterRoom('boss', []);

      expect(useDungeonStore.getState().showBossHealth).toBe(true);
    });
  });

  describe('clearRoom', () => {
    it('should clear current room', () => {
      useDungeonStore.setState({
        status: DUNGEON_STATES.COMBAT,
        enemies: [{ id: 'enemy1' }],
        enemiesRemaining: 1,
        roomsCleared: 2
      });

      useDungeonStore.getState().clearRoom();

      const state = useDungeonStore.getState();
      expect(state.status).toBe(DUNGEON_STATES.IN_ROOM);
      expect(state.enemies).toEqual([]);
      expect(state.enemiesRemaining).toBe(0);
      expect(state.roomsCleared).toBe(3);
    });
  });

  describe('boss fight', () => {
    it('should start boss fight', () => {
      const boss = { id: 'boss1', name: 'Test Boss', health: 500 };

      useDungeonStore.getState().startBossFight(boss);

      const state = useDungeonStore.getState();
      expect(state.status).toBe(DUNGEON_STATES.BOSS_FIGHT);
      expect(state.boss).toEqual(boss);
      expect(state.bossHealthPercent).toBe(100);
      expect(state.showBossHealth).toBe(true);
    });

    it('should update boss state', () => {
      useDungeonStore.setState({
        boss: { id: 'boss1', health: 500 },
        bossHealthPercent: 100,
        bossPhase: 0
      });

      useDungeonStore.getState().updateBoss({
        healthPercent: 50,
        phase: 1,
        enraged: true
      });

      const state = useDungeonStore.getState();
      expect(state.bossHealthPercent).toBe(50);
      expect(state.bossPhase).toBe(1);
      expect(state.bossEnraged).toBe(true);
    });

    it('should defeat boss', () => {
      useDungeonStore.setState({
        status: DUNGEON_STATES.BOSS_FIGHT,
        boss: { id: 'boss1' },
        loot: [],
        xpGained: 0,
        goldCollected: 0,
        roomsCleared: 4
      });

      const loot = [{ id: 'item1' }, { id: 'item2' }];
      useDungeonStore.getState().defeatBoss(loot, 1000, 500);

      const state = useDungeonStore.getState();
      expect(state.status).toBe(DUNGEON_STATES.IN_ROOM);
      expect(state.boss).toBeNull();
      expect(state.showBossHealth).toBe(false);
      expect(state.loot.length).toBe(2);
      expect(state.xpGained).toBe(1000);
      expect(state.goldCollected).toBe(500);
      expect(state.roomsCleared).toBe(5);
    });
  });

  describe('combat', () => {
    beforeEach(() => {
      useDungeonStore.setState({
        status: DUNGEON_STATES.COMBAT,
        enemies: [
          { id: 'enemy1', health: 100 },
          { id: 'enemy2', health: 100 }
        ],
        enemiesRemaining: 2
      });
    });

    it('should update enemy', () => {
      useDungeonStore.getState().updateEnemy('enemy1', { health: 50 });

      const enemies = useDungeonStore.getState().enemies;
      expect(enemies.find(e => e.id === 'enemy1').health).toBe(50);
    });

    it('should remove defeated enemy', () => {
      useDungeonStore.getState().removeEnemy('enemy1');

      const state = useDungeonStore.getState();
      expect(state.enemies.length).toBe(1);
      expect(state.enemiesRemaining).toBe(1);
    });

    it('should clear room when all enemies defeated', () => {
      useDungeonStore.setState({
        enemies: [{ id: 'enemy1' }],
        enemiesRemaining: 1
      });

      useDungeonStore.getState().removeEnemy('enemy1');

      expect(useDungeonStore.getState().status).toBe(DUNGEON_STATES.IN_ROOM);
    });

    it('should record damage dealt', () => {
      useDungeonStore.setState({ damageDealt: 100 });

      useDungeonStore.getState().recordDamageDealt(50);

      expect(useDungeonStore.getState().damageDealt).toBe(150);
    });

    it('should record damage taken', () => {
      useDungeonStore.setState({ damageTaken: 50 });

      useDungeonStore.getState().recordDamageTaken(25);

      expect(useDungeonStore.getState().damageTaken).toBe(75);
    });
  });

  describe('loot', () => {
    it('should add loot item', () => {
      useDungeonStore.setState({ loot: [] });

      useDungeonStore.getState().addLoot({ id: 'sword', name: 'Iron Sword' });

      const state = useDungeonStore.getState();
      expect(state.loot.length).toBe(1);
      expect(state.showLootPopup).toBe(true);
      expect(state.pendingLoot.name).toBe('Iron Sword');
    });

    it('should add gold', () => {
      useDungeonStore.setState({ goldCollected: 50 });

      useDungeonStore.getState().addGold(100);

      expect(useDungeonStore.getState().goldCollected).toBe(150);
    });

    it('should add XP', () => {
      useDungeonStore.setState({ xpGained: 200 });

      useDungeonStore.getState().addXP(300);

      expect(useDungeonStore.getState().xpGained).toBe(500);
    });

    it('should close loot popup', () => {
      useDungeonStore.setState({
        showLootPopup: true,
        pendingLoot: { id: 'item' }
      });

      useDungeonStore.getState().closeLootPopup();

      const state = useDungeonStore.getState();
      expect(state.showLootPopup).toBe(false);
      expect(state.pendingLoot).toBeNull();
    });
  });

  describe('player', () => {
    it('should update player position', () => {
      useDungeonStore.getState().updatePlayerPosition(5, 7);

      expect(useDungeonStore.getState().playerPosition).toEqual({ x: 5, y: 7 });
    });

    it('should update player facing', () => {
      useDungeonStore.getState().updatePlayerFacing(Math.PI / 2);

      expect(useDungeonStore.getState().playerFacing).toBe(Math.PI / 2);
    });
  });

  describe('UI', () => {
    it('should toggle mini-map', () => {
      useDungeonStore.setState({ showMiniMap: true });

      useDungeonStore.getState().toggleMiniMap();
      expect(useDungeonStore.getState().showMiniMap).toBe(false);

      useDungeonStore.getState().toggleMiniMap();
      expect(useDungeonStore.getState().showMiniMap).toBe(true);
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      useDungeonStore.setState({
        status: DUNGEON_STATES.EXPLORING,
        rooms: [
          {
            id: 'room1',
            type: 'ENTRANCE',
            connections: { EAST: 'room2' }
          },
          {
            id: 'room2',
            type: 'CHAMBER',
            connections: { WEST: 'room1' }
          }
        ],
        currentRoomId: 'room1',
        roomsExplored: 3,
        roomsTotal: 10,
        roomsCleared: 2
      });
    });

    it('should get current room', () => {
      const room = useDungeonStore.getState().getCurrentRoom();

      expect(room.id).toBe('room1');
      expect(room.type).toBe('ENTRANCE');
    });

    it('should get connected rooms', () => {
      const connected = useDungeonStore.getState().getConnectedRooms();

      expect(connected.length).toBe(1);
      expect(connected[0].id).toBe('room2');
    });

    it('should check if active', () => {
      expect(useDungeonStore.getState().isActive()).toBe(true);

      useDungeonStore.setState({ status: DUNGEON_STATES.INACTIVE });
      expect(useDungeonStore.getState().isActive()).toBe(false);
    });

    it('should check if in combat', () => {
      useDungeonStore.setState({ status: DUNGEON_STATES.COMBAT });
      expect(useDungeonStore.getState().isInCombat()).toBe(true);

      useDungeonStore.setState({ status: DUNGEON_STATES.BOSS_FIGHT });
      expect(useDungeonStore.getState().isInCombat()).toBe(true);

      useDungeonStore.setState({ status: DUNGEON_STATES.EXPLORING });
      expect(useDungeonStore.getState().isInCombat()).toBe(false);
    });

    it('should get progress', () => {
      const progress = useDungeonStore.getState().getProgress();

      expect(progress.explored).toBe(3);
      expect(progress.total).toBe(10);
      expect(progress.cleared).toBe(2);
      expect(progress.percent).toBe(30);
    });
  });

  describe('DUNGEON_STATES', () => {
    it('should export all states', () => {
      expect(DUNGEON_STATES.INACTIVE).toBe('INACTIVE');
      expect(DUNGEON_STATES.EXPLORING).toBe('EXPLORING');
      expect(DUNGEON_STATES.IN_ROOM).toBe('IN_ROOM');
      expect(DUNGEON_STATES.COMBAT).toBe('COMBAT');
      expect(DUNGEON_STATES.BOSS_FIGHT).toBe('BOSS_FIGHT');
      expect(DUNGEON_STATES.CLEARED).toBe('CLEARED');
      expect(DUNGEON_STATES.FAILED).toBe('FAILED');
      expect(DUNGEON_STATES.RETREATING).toBe('RETREATING');
    });
  });
});
