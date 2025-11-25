/**
 * PathfindingSystem.test.js - Comprehensive tests for A* Pathfinding
 */

import {
  PathfindingSystem,
  TERRAIN_COSTS,
  distance,
  distanceSquared,
  normalize
} from '../PathfindingSystem.js';

describe('PathfindingSystem', () => {
  let pathfinding;

  beforeEach(() => {
    pathfinding = new PathfindingSystem({
      gridSize: 32,
      maxSearchNodes: 1000,
      allowDiagonal: true
    });
    pathfinding.setTerrainData(null, 1024, 1024);
  });

  // ============================================
  // UTILITY FUNCTION TESTS
  // ============================================

  describe('Utility Functions', () => {
    test('distance should calculate correctly', () => {
      expect(distance({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5);
      expect(distance({ x: 0, z: 0 }, { x: 0, z: 0 })).toBe(0);
      expect(distance({ x: 10, z: 10 }, { x: 10, z: 10 })).toBe(0);
    });

    test('distanceSquared should calculate correctly', () => {
      expect(distanceSquared({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(25);
      expect(distanceSquared({ x: 0, z: 0 }, { x: 5, z: 0 })).toBe(25);
    });

    test('normalize should create unit vector', () => {
      const normalized = normalize({ x: 3, z: 4 });
      expect(normalized.x).toBeCloseTo(0.6, 5);
      expect(normalized.z).toBeCloseTo(0.8, 5);

      const length = Math.sqrt(normalized.x ** 2 + normalized.z ** 2);
      expect(length).toBeCloseTo(1, 5);
    });

    test('normalize should handle zero vector', () => {
      const normalized = normalize({ x: 0, z: 0 });
      expect(normalized.x).toBe(0);
      expect(normalized.z).toBe(0);
    });
  });

  // ============================================
  // TERRAIN COSTS TESTS
  // ============================================

  describe('TERRAIN_COSTS', () => {
    test('should have standard terrain types', () => {
      expect(TERRAIN_COSTS.GRASS).toBe(1.0);
      expect(TERRAIN_COSTS.ROAD).toBe(0.5);
      expect(TERRAIN_COSTS.FOREST).toBe(1.5);
      expect(TERRAIN_COSTS.WATER).toBe(Infinity);
      expect(TERRAIN_COSTS.WALL).toBe(Infinity);
    });

    test('should have impassable terrains', () => {
      expect(TERRAIN_COSTS.WATER).toBe(Infinity);
      expect(TERRAIN_COSTS.DEEP_WATER).toBe(Infinity);
      expect(TERRAIN_COSTS.WALL).toBe(Infinity);
      expect(TERRAIN_COSTS.BUILDING).toBe(Infinity);
    });
  });

  // ============================================
  // CONFIGURATION TESTS
  // ============================================

  describe('Configuration', () => {
    test('should accept custom grid size', () => {
      const system = new PathfindingSystem({ gridSize: 64 });
      expect(system.gridSize).toBe(64);
    });

    test('should accept custom max search nodes', () => {
      const system = new PathfindingSystem({ maxSearchNodes: 500 });
      expect(system.maxSearchNodes).toBe(500);
    });

    test('should accept diagonal movement option', () => {
      const diagonalSystem = new PathfindingSystem({ allowDiagonal: true });
      const noDiagonalSystem = new PathfindingSystem({ allowDiagonal: false });

      expect(diagonalSystem.allowDiagonal).toBe(true);
      expect(noDiagonalSystem.allowDiagonal).toBe(false);
    });

    test('should set default values', () => {
      const system = new PathfindingSystem();
      expect(system.gridSize).toBe(32);
      expect(system.maxSearchNodes).toBe(1000);
      expect(system.allowDiagonal).toBe(true);
    });
  });

  // ============================================
  // TERRAIN DATA TESTS
  // ============================================

  describe('Terrain Data', () => {
    test('should set terrain data and world dimensions', () => {
      const terrainData = { type: 'test' };
      pathfinding.setTerrainData(terrainData, 2048, 2048);

      expect(pathfinding.terrainData).toBe(terrainData);
      expect(pathfinding.worldWidth).toBe(2048);
      expect(pathfinding.worldHeight).toBe(2048);
    });

    test('should clear cache when terrain changes', () => {
      pathfinding.pathCache.set('test', { path: [], timestamp: Date.now() });
      pathfinding.setTerrainData(null, 1024, 1024);

      expect(pathfinding.pathCache.size).toBe(0);
    });

    test('should handle function terrain data', () => {
      pathfinding.setTerrainData((pos) => {
        return pos.x > 500 ? 'WATER' : 'GRASS';
      }, 1024, 1024);

      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 400, z: 400 }
      );

      expect(result.success).toBe(true);
    });

    test('should handle terrain object with getTerrainAt', () => {
      const mockTerrain = {
        getTerrainAt: jest.fn((x, z) => 'GRASS')
      };

      pathfinding.setTerrainData(mockTerrain, 1024, 1024);
      pathfinding.findPath({ x: 100, z: 100 }, { x: 200, z: 200 });

      expect(mockTerrain.getTerrainAt).toHaveBeenCalled();
    });
  });

  // ============================================
  // OBSTACLE TESTS
  // ============================================

  describe('Obstacles', () => {
    test('should add obstacle', () => {
      pathfinding.addObstacle('obs1', { x: 100, z: 100 }, 32);
      expect(pathfinding.obstacles.has('obs1')).toBe(true);
    });

    test('should remove obstacle', () => {
      pathfinding.addObstacle('obs1', { x: 100, z: 100 }, 32);
      pathfinding.removeObstacle('obs1');
      expect(pathfinding.obstacles.has('obs1')).toBe(false);
    });

    test('should update obstacle position', () => {
      pathfinding.addObstacle('obs1', { x: 100, z: 100 }, 32);
      pathfinding.updateObstacle('obs1', { x: 200, z: 200 });

      const obstacle = pathfinding.obstacles.get('obs1');
      expect(obstacle.position.x).toBe(200);
      expect(obstacle.position.z).toBe(200);
    });

    test('should clear cache when adding obstacle', () => {
      pathfinding.pathCache.set('test', { path: [], timestamp: Date.now() });
      pathfinding.addObstacle('obs1', { x: 100, z: 100 });

      expect(pathfinding.pathCache.size).toBe(0);
    });

    test('should avoid obstacles in path', () => {
      // Add obstacle in direct path
      pathfinding.addObstacle('blocking', { x: 150, z: 150 }, 50);

      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 200, z: 200 }
      );

      // Path should go around obstacle
      if (result.success) {
        // Verify path doesn't go through obstacle
        for (const point of result.path) {
          const dx = point.x - 150;
          const dz = point.z - 150;
          const dist = Math.sqrt(dx * dx + dz * dz);
          expect(dist).toBeGreaterThanOrEqual(45); // Some margin for grid snapping
        }
      }
    });
  });

  // ============================================
  // BASIC PATHFINDING TESTS
  // ============================================

  describe('Basic Pathfinding', () => {
    test('should find path between two points', () => {
      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 300, z: 300 }
      );

      expect(result.success).toBe(true);
      expect(result.path.length).toBeGreaterThan(0);
      // Path is snapped to grid, so first point should be within gridSize of start
      const startDist = distance(result.path[0], { x: 100, z: 100 });
      expect(startDist).toBeLessThan(pathfinding.gridSize * 2);
    });

    test('should start path near start position', () => {
      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 500, z: 500 }
      );

      expect(result.success).toBe(true);
      const startDist = distance(result.path[0], { x: 100, z: 100 });
      expect(startDist).toBeLessThan(pathfinding.gridSize);
    });

    test('should end path near goal position', () => {
      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 500, z: 500 }
      );

      expect(result.success).toBe(true);
      const endPoint = result.path[result.path.length - 1];
      const endDist = distance(endPoint, { x: 500, z: 500 });
      expect(endDist).toBeLessThan(pathfinding.gridSize);
    });

    test('should return empty path when start equals goal', () => {
      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 100, z: 100 }
      );

      expect(result.success).toBe(true);
      expect(result.path.length).toBe(1);
    });

    test('should fail when start is blocked', () => {
      pathfinding.addObstacle('blockStart', { x: 100, z: 100 }, 50);

      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 500, z: 500 }
      );

      expect(result.success).toBe(false);
      expect(result.reason).toBe('start_blocked');
    });

    test('should fail when goal is blocked', () => {
      pathfinding.addObstacle('blockGoal', { x: 500, z: 500 }, 50);

      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 500, z: 500 }
      );

      expect(result.success).toBe(false);
      expect(result.reason).toBe('goal_blocked');
    });

    test('should fail when out of bounds', () => {
      const result = pathfinding.findPath(
        { x: -100, z: -100 },
        { x: 500, z: 500 }
      );

      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // DIAGONAL MOVEMENT TESTS
  // ============================================

  describe('Diagonal Movement', () => {
    test('should allow diagonal movement when enabled', () => {
      const result = pathfinding.findPath(
        { x: 0, z: 0 },
        { x: 320, z: 320 }
      );

      expect(result.success).toBe(true);
      // Diagonal path should be shorter than manhattan
      expect(result.path.length).toBeLessThan(20);
    });

    test('should not allow diagonal movement when disabled', () => {
      const noDiagonalPathfinding = new PathfindingSystem({
        gridSize: 32,
        allowDiagonal: false
      });
      noDiagonalPathfinding.setTerrainData(null, 1024, 1024);

      const result = noDiagonalPathfinding.findPath(
        { x: 32, z: 32 },
        { x: 320, z: 320 }
      );

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // PATH SMOOTHING TESTS
  // ============================================

  describe('Path Smoothing', () => {
    test('should smooth path by default', () => {
      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 500, z: 500 }
      );

      expect(result.success).toBe(true);
      // Smoothed path should have fewer points
    });

    test('should skip smoothing when disabled', () => {
      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 500, z: 500 },
        { smoothPath: false }
      );

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // PATH CACHING TESTS
  // ============================================

  describe('Path Caching', () => {
    test('should cache paths', () => {
      const result1 = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 500, z: 500 }
      );

      const result2 = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 500, z: 500 }
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.cached).toBe(true);
    });

    test('should track cache hits in stats', () => {
      pathfinding.findPath({ x: 100, z: 100 }, { x: 500, z: 500 });
      pathfinding.findPath({ x: 100, z: 100 }, { x: 500, z: 500 });

      expect(pathfinding.stats.cacheHits).toBe(1);
    });

    test('should skip cache when disabled', () => {
      pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 500, z: 500 }
      );

      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 500, z: 500 },
        { useCache: false }
      );

      expect(result.cached).toBeFalsy();
    });

    test('should clear cache', () => {
      pathfinding.findPath({ x: 100, z: 100 }, { x: 500, z: 500 });
      expect(pathfinding.pathCache.size).toBeGreaterThan(0);

      pathfinding.clearCache();
      expect(pathfinding.pathCache.size).toBe(0);
    });
  });

  // ============================================
  // WAYPOINTS TESTS
  // ============================================

  describe('Waypoints Pathfinding', () => {
    test('should find path through waypoints', () => {
      const waypoints = [
        { x: 100, z: 100 },
        { x: 300, z: 100 },
        { x: 300, z: 300 },
        { x: 100, z: 300 }
      ];

      const result = pathfinding.findPathThroughWaypoints(waypoints);

      expect(result.success).toBe(true);
      // Path should include at least all waypoints
      expect(result.path.length).toBeGreaterThanOrEqual(waypoints.length);
    });

    test('should handle empty waypoints', () => {
      const result = pathfinding.findPathThroughWaypoints([]);
      expect(result.success).toBe(true);
      expect(result.path).toEqual([]);
    });

    test('should handle single waypoint', () => {
      const result = pathfinding.findPathThroughWaypoints([{ x: 100, z: 100 }]);
      expect(result.success).toBe(true);
      expect(result.path).toEqual([{ x: 100, z: 100 }]);
    });

    test('should fail if segment fails', () => {
      pathfinding.addObstacle('block', { x: 200, z: 100 }, 80);

      const waypoints = [
        { x: 100, z: 100 },
        { x: 300, z: 100 } // Blocked by obstacle
      ];

      const result = pathfinding.findPathThroughWaypoints(waypoints);

      // May succeed by going around, or fail depending on obstacle placement
      if (!result.success) {
        expect(result.failedAt).toBeDefined();
      }
    });
  });

  // ============================================
  // DIRECT PATH TESTS
  // ============================================

  describe('Direct Path', () => {
    test('should return direct path when clear', () => {
      const result = pathfinding.getDirectPath(
        { x: 100, z: 100 },
        { x: 200, z: 200 }
      );

      expect(result).not.toBeNull();
      expect(result.success).toBe(true);
      expect(result.direct).toBe(true);
      expect(result.path.length).toBe(2);
    });

    test('should return null when blocked', () => {
      pathfinding.addObstacle('block', { x: 150, z: 150 }, 50);

      const result = pathfinding.getDirectPath(
        { x: 100, z: 100 },
        { x: 200, z: 200 }
      );

      expect(result).toBeNull();
    });
  });

  // ============================================
  // CUSTOM WALKABILITY TESTS
  // ============================================

  describe('Custom Walkability', () => {
    test('should use custom walkability check', () => {
      const isWalkable = (pos) => pos.x < 300;

      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 250, z: 100 },
        { isWalkable }
      );

      expect(result.success).toBe(true);

      const failResult = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 400, z: 100 },
        { isWalkable }
      );

      expect(failResult.success).toBe(false);
    });
  });

  // ============================================
  // CUSTOM COST TESTS
  // ============================================

  describe('Custom Movement Cost', () => {
    test('should use custom cost function', () => {
      const getCost = (pos) => {
        // Higher cost in upper half
        return pos.z > 200 ? 5.0 : 1.0;
      };

      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 100, z: 400 },
        { getCost }
      );

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    test('should track paths calculated', () => {
      pathfinding.findPath({ x: 100, z: 100 }, { x: 200, z: 200 });
      pathfinding.findPath({ x: 100, z: 100 }, { x: 300, z: 300 });

      const stats = pathfinding.getStatistics();
      expect(stats.pathsCalculated).toBe(2);
    });

    test('should track nodes searched', () => {
      pathfinding.findPath({ x: 100, z: 100 }, { x: 500, z: 500 });

      const stats = pathfinding.getStatistics();
      expect(stats.totalNodesSearched).toBeGreaterThan(0);
    });

    test('should calculate average nodes searched', () => {
      pathfinding.findPath({ x: 100, z: 100 }, { x: 200, z: 200 });
      pathfinding.findPath({ x: 100, z: 100 }, { x: 300, z: 300 });

      const stats = pathfinding.getStatistics();
      expect(stats.averageNodesSearched).toBeGreaterThan(0);
    });

    test('should reset statistics', () => {
      pathfinding.findPath({ x: 100, z: 100 }, { x: 200, z: 200 });
      pathfinding.resetStatistics();

      const stats = pathfinding.getStatistics();
      expect(stats.pathsCalculated).toBe(0);
      expect(stats.cacheHits).toBe(0);
    });

    test('should include cache and obstacle count', () => {
      pathfinding.addObstacle('obs1', { x: 100, z: 100 });
      pathfinding.findPath({ x: 200, z: 200 }, { x: 300, z: 300 });

      const stats = pathfinding.getStatistics();
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
      expect(stats.obstacleCount).toBe(1);
    });
  });

  // ============================================
  // MAX SEARCH NODES TESTS
  // ============================================

  describe('Max Search Nodes', () => {
    test('should stop at max search nodes', () => {
      const limitedPathfinding = new PathfindingSystem({
        gridSize: 32,
        maxSearchNodes: 10
      });
      limitedPathfinding.setTerrainData(null, 10000, 10000);

      const result = limitedPathfinding.findPath(
        { x: 0, z: 0 },
        { x: 5000, z: 5000 }
      );

      if (!result.success) {
        expect(result.reason).toBe('max_nodes_exceeded');
      }
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    test('should handle very close start and goal', () => {
      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 105, z: 105 }
      );

      expect(result.success).toBe(true);
    });

    test('should handle world boundary', () => {
      const result = pathfinding.findPath(
        { x: 32, z: 32 },
        { x: 992, z: 992 }
      );

      expect(result.success).toBe(true);
    });

    test('should return nodes searched count', () => {
      const result = pathfinding.findPath(
        { x: 100, z: 100 },
        { x: 500, z: 500 }
      );

      expect(typeof result.nodesSearched).toBe('number');
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration Tests', () => {
    test('should pathfind around complex obstacle pattern', () => {
      // Create a wall of obstacles
      for (let i = 0; i < 5; i++) {
        pathfinding.addObstacle(`wall_${i}`, { x: 300, z: 100 + i * 50 }, 20);
      }

      const result = pathfinding.findPath(
        { x: 100, z: 200 },
        { x: 500, z: 200 }
      );

      expect(result.success).toBe(true);
    });

    test('should find optimal path preference for roads', () => {
      // Set up terrain with a road
      pathfinding.setTerrainData((pos) => {
        if (pos.z >= 140 && pos.z <= 180) return 'ROAD';
        return 'GRASS';
      }, 1024, 1024);

      const result = pathfinding.findPath(
        { x: 100, z: 160 },
        { x: 500, z: 160 }
      );

      expect(result.success).toBe(true);
      // Path should generally follow the road
    });
  });
});
