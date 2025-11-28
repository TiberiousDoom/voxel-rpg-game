/**
 * Pathfinding System Tests
 *
 * Tests for Phase 1 NPC Control Redesign:
 * - A* pathfinding algorithm
 * - Path smoothing and optimization
 * - NPC movement along paths
 * - Collision avoidance
 */

import PathfindingService from '../PathfindingService';
import { NPCManager } from '../NPCManager';
import GridManager from '../../foundation/GridManager';
import TownManager from '../../territory-town/TownManager';
import BuildingConfig from '../../building-types/BuildingConfig';

describe('PathfindingService', () => {
  let gridManager;
  let pathfindingService;

  beforeEach(() => {
    gridManager = new GridManager(10, 50);
    pathfindingService = new PathfindingService(gridManager);
  });

  test('should find a simple straight path', () => {
    const start = { x: 0, y: 25, z: 0 };
    const goal = { x: 5, y: 25, z: 0 };

    const path = pathfindingService.findPath(start, goal);

    expect(path).toBeTruthy();
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ x: 0, y: 25, z: 0 }); // Start
    expect(path[path.length - 1]).toEqual({ x: 5, y: 25, z: 0 }); // Goal
  });

  test('should find path around obstacle', () => {
    // Place obstacle in the middle
    gridManager.placeBuilding(
      { x: 2, y: 25, z: 2 },
      'test-building',
      { type: 'FARM' }
    );

    const start = { x: 0, y: 25, z: 2 };
    const goal = { x: 5, y: 25, z: 2 };

    const path = pathfindingService.findPath(start, goal);

    expect(path).toBeTruthy();
    expect(path.length).toBeGreaterThan(0);

    // Path should not go through obstacle at (2, 25, 2)
    const passesThrough = path.some(p =>
      p.x === 2 && p.y === 25 && p.z === 2
    );
    expect(passesThrough).toBe(false);
  });

  test('should smooth path to remove unnecessary waypoints', () => {
    const start = { x: 0, y: 25, z: 0 };
    const goal = { x: 5, y: 25, z: 5 };

    const path = pathfindingService.findPath(start, goal);
    const smoothed = pathfindingService.smoothPath(path);

    expect(smoothed).toBeTruthy();
    expect(smoothed.length).toBeLessThanOrEqual(path.length);
    expect(smoothed[0]).toEqual(path[0]); // Start unchanged
    expect(smoothed[smoothed.length - 1]).toEqual(path[path.length - 1]); // Goal unchanged
  });

  test('should find nearby walkable cell when goal occupied', () => {
    // Occupy the goal position
    gridManager.placeBuilding(
      { x: 5, y: 25, z: 5 },
      'test-building',
      { type: 'FARM' }
    );

    const nearbyCell = pathfindingService.findNearbyWalkableCell(5, 25, 5, 2);

    expect(nearbyCell).toBeTruthy();
    expect(nearbyCell.x).toBeGreaterThanOrEqual(3);
    expect(nearbyCell.x).toBeLessThanOrEqual(7);
    expect(nearbyCell.z).toBeGreaterThanOrEqual(3);
    expect(nearbyCell.z).toBeLessThanOrEqual(7);
  });

  test('should calculate path statistics', () => {
    const path = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 3, y: 0, z: 0 }
    ];

    const stats = pathfindingService.getPathStats(path);

    expect(stats.waypoints).toBe(4);
    expect(stats.distance).toBe('3.00');
    expect(stats.start).toEqual({ x: 0, y: 0, z: 0 });
    expect(stats.goal).toEqual({ x: 3, y: 0, z: 0 });
  });

  test('should return null for unreachable goal', () => {
    // Surround goal with obstacles
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;
        gridManager.placeBuilding(
          { x: 5 + dx, y: 25, z: 5 + dz },
          `obstacle-${dx}-${dz}`,
          { type: 'FARM' }
        );
      }
    }
    gridManager.placeBuilding(
      { x: 5, y: 25, z: 5 },
      'center',
      { type: 'FARM' }
    );

    const start = { x: 0, y: 25, z: 0 };
    const goal = { x: 5, y: 25, z: 5 };

    const path = pathfindingService.findPath(start, goal, {
      allowPartialPath: false
    });

    expect(path).toBeNull();
  });
});

describe('NPC Movement Integration', () => {
  let npcManager;
  let gridManager;
  let townManager;

  beforeEach(() => {
    gridManager = new GridManager(10, 50);
    const buildingConfig = new BuildingConfig();
    townManager = new TownManager(buildingConfig);
    npcManager = new NPCManager(townManager, gridManager);
  });

  test('NPCManager should initialize with pathfinding service', () => {
    expect(npcManager.pathfindingService).toBeTruthy();
  });

  test('should assign NPC with pathfinding', () => {
    // Spawn NPC
    const result = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });
    expect(result.success).toBe(true);

    const npcId = result.npcId;

    // Add building to buildings map
    const buildingId = 'test-building-1';
    npcManager.updateBuildingsMap([{
      id: buildingId,
      position: { x: 5, y: 25, z: 5 },
      type: 'FARM'
    }]);

    // Assign NPC to building
    npcManager.assignNPC(npcId, buildingId);

    const npc = npcManager.getNPC(npcId);
    expect(npc.isMoving).toBe(true);
    expect(npc.currentPath).toBeTruthy();
    expect(npc.currentPath.length).toBeGreaterThan(0);
  });

  test('should update NPC movement along path', () => {
    // Spawn NPC
    const result = npcManager.spawnNPC('WORKER', { x: 0, y: 25, z: 0 });
    const npcId = result.npcId;

    // Add building
    const buildingId = 'test-building-1';
    npcManager.updateBuildingsMap([{
      id: buildingId,
      position: { x: 3, y: 25, z: 3 },
      type: 'FARM'
    }]);

    // Assign NPC
    npcManager.assignNPC(npcId, buildingId);

    const npc = npcManager.getNPC(npcId);
    const startPos = { ...npc.position };

    // Simulate movement updates (60fps for 1 second)
    for (let i = 0; i < 60; i++) {
      npcManager.updateMovement(1 / 60); // 16.67ms per frame
    }

    // NPC should have moved
    const movedDistance = Math.sqrt(
      Math.pow(npc.position.x - startPos.x, 2) +
      Math.pow(npc.position.z - startPos.z, 2)
    );
    expect(movedDistance).toBeGreaterThan(0);
  });

  test('should apply collision avoidance between NPCs', () => {
    // Spawn two NPCs close together
    const npc1Result = npcManager.spawnNPC('WORKER', { x: 5, y: 25, z: 5 });
    const npc2Result = npcManager.spawnNPC('WORKER', { x: 5.5, y: 25, z: 5 });

    const npc1 = npcManager.getNPC(npc1Result.npcId);
    const npc2 = npcManager.getNPC(npc2Result.npcId);

    // Set them both moving
    npc1.isMoving = true;
    npc1.targetPosition = { x: 8, y: 25, z: 5 };
    npc2.isMoving = true;
    npc2.targetPosition = { x: 8, y: 25, z: 5 };

    const initialDistance = Math.sqrt(
      Math.pow(npc2.position.x - npc1.position.x, 2) +
      Math.pow(npc2.position.z - npc1.position.z, 2)
    );

    // Run movement with collision avoidance
    for (let i = 0; i < 10; i++) {
      npcManager.updateMovement(1 / 60);
    }

    const finalDistance = Math.sqrt(
      Math.pow(npc2.position.x - npc1.position.x, 2) +
      Math.pow(npc2.position.z - npc1.position.z, 2)
    );

    // NPCs should maintain or increase distance due to avoidance
    expect(finalDistance).toBeGreaterThanOrEqual(initialDistance * 0.9);
  });
});
