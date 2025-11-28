/**
 * Save/Load Integration Tests
 * Tests the complete persistence flow
 */

import GameManager from '../GameManager';

describe('Save/Load System Integration', () => {
  let gameManager;

  beforeEach(() => {
    gameManager = new GameManager({ enableAutoSave: false });
    gameManager.initialize();
  });

  afterEach(async () => {
    if (gameManager && gameManager.gameState === GameManager.GAME_STATE.RUNNING) {
      await gameManager.stopGame();
    }

    // Clean up test saves
    try {
      const saves = await gameManager.saveManager.listSaves();
      for (const save of saves) {
        if (save.name.startsWith('test-')) {
          await gameManager.saveManager.deleteSave(save.name);
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Save/Load', () => {
    test('saves game state successfully', async () => {
      gameManager.placeBuilding('FARM', { x: 5, y: 0, z: 5 });
      gameManager.spawnNPC();

      const result = await gameManager.saveGame('test-save-1');

      expect(result.success).toBe(true);
    });

    test('loads game state successfully', async () => {
      gameManager.placeBuilding('FARM', { x: 5, y: 0, z: 5 });
      await new Promise(resolve => setTimeout(resolve, 5));

      gameManager.placeBuilding('HOUSE', { x: 6, y: 0, z: 5 });
      await new Promise(resolve => setTimeout(resolve, 5));

      gameManager.spawnNPC();
      await new Promise(resolve => setTimeout(resolve, 5));

      gameManager.spawnNPC();
      await new Promise(resolve => setTimeout(resolve, 5));

      await gameManager.saveGame('test-save-2');

      // Create new game manager and load
      const newGM = new GameManager();
      newGM.initialize();

      const loadResult = await newGM.loadGame('test-save-2');

      expect(loadResult.success).toBe(true);
      expect(newGM.orchestrator.gameState.buildings.length).toBe(2);
      expect(newGM.orchestrator.gameState.npcs.length).toBe(2);
    });

    test('preserves building properties', async () => {
      const originalBuilding = gameManager.placeBuilding('FARM', { x: 5, y: 0, z: 5 });

      await gameManager.saveGame('test-save-3');

      const newGM = new GameManager();
      newGM.initialize();
      await newGM.loadGame('test-save-3');

      const loadedBuilding = newGM.orchestrator.gameState.buildings[0];

      expect(loadedBuilding.id).toBe(originalBuilding.buildingId);
      expect(loadedBuilding.type).toBe('FARM');
      expect(loadedBuilding.position).toEqual({ x: 5, y: 0, z: 5 });
    });

    test('preserves resource values', async () => {
      gameManager.orchestrator.gameState.resources = {
        food: 150,
        wood: 75,
        stone: 50,
        gold: 25
      };

      await gameManager.saveGame('test-save-4');

      const newGM = new GameManager();
      newGM.initialize();
      await newGM.loadGame('test-save-4');

      expect(newGM.orchestrator.gameState.resources).toEqual({
        food: 150,
        wood: 75,
        stone: 50,
        gold: 25
      });
    });
  });

  describe('Error Handling', () => {
    test('handles loading non-existent save', async () => {
      const result = await gameManager.loadGame('non-existent-save');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('validates save data', async () => {
      // Save is expected to validate data
      gameManager.placeBuilding({ type: 'FARM', position: { x: 5, y: 0, z: 5 } });

      const result = await gameManager.saveGame('test-save-validation');

      expect(result.success).toBe(true);
    });
  });

  describe('Multiple Saves', () => {
    test('manages multiple save slots', async () => {
      gameManager.placeBuilding('FARM', { x: 0, y: 0, z: 0 });
      await new Promise(resolve => setTimeout(resolve, 5));
      await gameManager.saveGame('test-slot-1');

      gameManager.placeBuilding('HOUSE', { x: 1, y: 0, z: 0 });
      await new Promise(resolve => setTimeout(resolve, 5));
      await gameManager.saveGame('test-slot-2');

      gameManager.placeBuilding('WAREHOUSE', { x: 2, y: 0, z: 0 });
      await new Promise(resolve => setTimeout(resolve, 5));
      await gameManager.saveGame('test-slot-3');

      const saves = await gameManager.saveManager.listSaves();
      const testSaves = saves.filter(s => s.name.startsWith('test-slot-'));

      expect(testSaves.length).toBeGreaterThanOrEqual(3);
    });

    test('overwrites existing save slot', async () => {
      gameManager.placeBuilding('FARM', { x: 0, y: 0, z: 0 });
      await new Promise(resolve => setTimeout(resolve, 5));
      await gameManager.saveGame('test-overwrite');

      gameManager.placeBuilding('HOUSE', { x: 1, y: 0, z: 0 });
      await new Promise(resolve => setTimeout(resolve, 5));
      await gameManager.saveGame('test-overwrite');

      const newGM = new GameManager();
      newGM.initialize();
      await newGM.loadGame('test-overwrite');

      expect(newGM.orchestrator.gameState.buildings.length).toBe(2);
    });

    test('deletes save slot', async () => {
      await gameManager.saveGame('test-delete');

      const deleteResult = await gameManager.saveManager.deleteSave('test-delete');
      expect(deleteResult.success).toBe(true);

      const loadResult = await gameManager.loadGame('test-delete');
      expect(loadResult.success).toBe(false);
    });
  });
});
