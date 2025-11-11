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
    if (gameManager.isRunning) {
      await gameManager.stopGame();
    }
  });

  describe('Place Building Flow', () => {
    test('places building and updates game state', () => {
      const result = gameManager.placeBuilding({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 }
      });

      expect(result.success).toBe(true);
      expect(result.buildingId).toBeDefined();

      const buildings = gameManager.getGameState().buildings;
      expect(buildings).toHaveLength(1);
      expect(buildings[0].type).toBe('FARM');
    });

    test('prevents overlapping buildings', () => {
      gameManager.placeBuilding({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 }
      });

      const result = gameManager.placeBuilding({
        type: 'HOUSE',
        position: { x: 5, y: 0, z: 5 }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('occupied');

      const buildings = gameManager.getGameState().buildings;
      expect(buildings).toHaveLength(1);
    });

    test('validates building type', () => {
      const result = gameManager.placeBuilding({
        type: 'INVALID_TYPE',
        position: { x: 5, y: 0, z: 5 }
      });

      expect(result.success).toBe(false);
    });

    test('validates position bounds', () => {
      const result = gameManager.placeBuilding({
        type: 'FARM',
        position: { x: 150, y: 0, z: 5 }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('bounds');
    });

    test('emits building:placed event', (done) => {
      gameManager.on('building:placed', (data) => {
        expect(data.buildingId).toBeDefined();
        expect(data.type).toBe('FARM');
        done();
      });

      gameManager.placeBuilding({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 }
      });
    });

    test('removes building successfully', () => {
      const { buildingId } = gameManager.placeBuilding({
        type: 'FARM',
        position: { x: 5, y: 0, z: 5 }
      });

      const result = gameManager.removeBuilding(buildingId);

      expect(result.success).toBe(true);
      expect(gameManager.getGameState().buildings).toHaveLength(0);
    });

    test('allows building at previous location after removal', () => {
      const position = { x: 5, y: 0, z: 5 };

      const { buildingId } = gameManager.placeBuilding({
        type: 'FARM',
        position
      });

      gameManager.removeBuilding(buildingId);

      const result = gameManager.placeBuilding({
        type: 'HOUSE',
        position
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Multiple Buildings', () => {
    test('places multiple buildings successfully', () => {
      const positions = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 }
      ];

      positions.forEach(position => {
        const result = gameManager.placeBuilding({
          type: 'FARM',
          position
        });
        expect(result.success).toBe(true);
      });

      expect(gameManager.getGameState().buildings).toHaveLength(3);
    });

    test('handles mixed success/failure', () => {
      gameManager.placeBuilding({ type: 'FARM', position: { x: 5, y: 0, z: 5 } });

      const results = [
        gameManager.placeBuilding({ type: 'HOUSE', position: { x: 6, y: 0, z: 5 } }),
        gameManager.placeBuilding({ type: 'HOUSE', position: { x: 5, y: 0, z: 5 } }), // Overlap
        gameManager.placeBuilding({ type: 'HOUSE', position: { x: 7, y: 0, z: 5 } })
      ];

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);

      expect(gameManager.getGameState().buildings).toHaveLength(3);
    });
  });

  describe('Building and NPC Interaction', () => {
    test('places buildings and spawns NPCs together', () => {
      gameManager.placeBuilding({ type: 'FARM', position: { x: 5, y: 0, z: 5 } });
      gameManager.placeBuilding({ type: 'HOUSE', position: { x: 6, y: 0, z: 5 } });
      gameManager.spawnNPC();
      gameManager.spawnNPC();

      const state = gameManager.getGameState();
      expect(state.buildings).toHaveLength(2);
      expect(state.npcs).toHaveLength(2);
    });
  });
});
