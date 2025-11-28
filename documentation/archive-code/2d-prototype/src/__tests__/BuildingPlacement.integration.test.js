/**
 * Building Placement Integration Tests
 * Tests the complete building placement flow through all systems
 */

import GameManager from '../GameManager';
import { waitFor } from '../test-utils';

describe('Building Placement Integration', () => {
  let gameManager;

  beforeEach(() => {
    gameManager = new GameManager();
    gameManager.initialize();
  });

  afterEach(async () => {
    if (gameManager && gameManager.gameState === GameManager.GAME_STATE.RUNNING) {
      await gameManager.stopGame();
    }
  });

  describe('Place Building Flow', () => {
    test('places building and updates game state', () => {
      const result = gameManager.placeBuilding('FARM', { x: 5, y: 0, z: 5 });

      expect(result.success).toBe(true);
      expect(result.buildingId).toBeDefined();

      const buildings = gameManager.orchestrator.gameState.buildings;
      expect(buildings.length).toBeGreaterThan(0);
    });

    test('prevents overlapping buildings', () => {
      gameManager.placeBuilding('FARM', { x: 5, y: 0, z: 5 });

      const result = gameManager.placeBuilding('HOUSE', { x: 5, y: 0, z: 5 });

      expect(result.success).toBe(false);
      expect(result.message || result.error).toBeDefined();
    });

    test('validates position bounds', () => {
      const result = gameManager.placeBuilding('FARM', { x: 150, y: 0, z: 5 });

      expect(result.success).toBe(false);
      expect(result.message || result.error).toBeDefined();
    });

    test('emits building:placed event', (done) => {
      jest.setTimeout(10000);

      gameManager.on('building:placed', (data) => {
        expect(data.buildingId).toBeDefined();
        expect(data.type).toBe('FARM');
        done();
      });

      gameManager.placeBuilding('FARM', { x: 5, y: 0, z: 5 });
    });

    test('removes building through orchestrator', () => {
      const { buildingId } = gameManager.placeBuilding('FARM', { x: 5, y: 0, z: 5 });

      const result = gameManager.orchestrator.removeBuilding(buildingId);

      expect(result).toBe(true);
    });

    test('allows building at previous location after removal', () => {
      const position = { x: 5, y: 0, z: 5 };

      const { buildingId } = gameManager.placeBuilding('FARM', position);

      gameManager.orchestrator.removeBuilding(buildingId);

      const result = gameManager.placeBuilding('HOUSE', position);

      expect(result.success).toBe(true);
    });
  });

  describe('Multiple Buildings', () => {
    test('places multiple buildings successfully', async () => {
      // Place different building types to avoid ID collisions (IDs use Date.now())
      const result1 = gameManager.placeBuilding('FARM', { x: 0, y: 0, z: 0 });
      expect(result1.success).toBe(true);

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 5));

      const result2 = gameManager.placeBuilding('HOUSE', { x: 3, y: 0, z: 0 });
      expect(result2.success).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 5));

      const result3 = gameManager.placeBuilding('WAREHOUSE', { x: 6, y: 0, z: 0 });
      expect(result3.success).toBe(true);

      expect(gameManager.orchestrator.gameState.buildings.length).toBe(3);
    });

    test('handles mixed success/failure', async () => {
      // Place a FARM at position (5,5)
      const farm = gameManager.placeBuilding('FARM', { x: 5, y: 0, z: 5 });
      expect(farm.success).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 5));

      // Try to place HOUSE at non-overlapping position
      const house1 = gameManager.placeBuilding('HOUSE', { x: 8, y: 0, z: 8 });
      expect(house1.success).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 5));

      // Try to place WAREHOUSE at same position as FARM (should fail)
      const warehouse = gameManager.placeBuilding('WAREHOUSE', { x: 5, y: 0, z: 5 });
      expect(warehouse.success).toBe(false);

      await new Promise(resolve => setTimeout(resolve, 5));

      // Try another building at non-overlapping position
      const townCenter = gameManager.placeBuilding('TOWN_CENTER', { x: 10, y: 0, z: 10 });
      expect(townCenter.success).toBe(true);

      // Count successful placements: 1 FARM + 1 HOUSE + 1 TOWN_CENTER = 3 total
      const buildingCount = gameManager.orchestrator.gameState.buildings.length;
      expect(buildingCount).toBe(3);
    });
  });

  describe('Building and NPC Interaction', () => {
    test('places buildings and spawns NPCs together', async () => {
      gameManager.placeBuilding('FARM', { x: 5, y: 0, z: 5 });
      await new Promise(resolve => setTimeout(resolve, 5));

      gameManager.placeBuilding('HOUSE', { x: 6, y: 0, z: 5 });
      await new Promise(resolve => setTimeout(resolve, 5));

      gameManager.spawnNPC();
      await new Promise(resolve => setTimeout(resolve, 5));

      gameManager.spawnNPC();

      const state = gameManager.orchestrator.gameState;
      expect(state.buildings.length).toBe(2);
      expect(state.npcs.length).toBe(2);
    });
  });
});
