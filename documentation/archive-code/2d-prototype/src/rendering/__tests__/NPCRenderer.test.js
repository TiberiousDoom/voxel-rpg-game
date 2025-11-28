/**
 * NPCRenderer.test.js - Unit tests for NPCRenderer
 */

import NPCRenderer from '../NPCRenderer.js';

describe('NPCRenderer', () => {
  let renderer;
  let mockCanvas;
  let mockCtx;

  beforeEach(() => {
    // Create mock canvas context
    mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      setLineDash: jest.fn()
    };

    renderer = new NPCRenderer({
      tileSize: 40,
      debugMode: false
    });
  });

  afterEach(() => {
    renderer.clear();
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      const defaultRenderer = new NPCRenderer();
      expect(defaultRenderer.config.tileSize).toBe(40);
      expect(defaultRenderer.config.showHealthBars).toBe(true);
      expect(defaultRenderer.config.enableAnimations).toBe(true);
    });

    test('should initialize with custom config', () => {
      const customRenderer = new NPCRenderer({
        tileSize: 50,
        showHealthBars: false,
        debugMode: true
      });

      expect(customRenderer.config.tileSize).toBe(50);
      expect(customRenderer.config.showHealthBars).toBe(false);
      expect(customRenderer.config.debugMode).toBe(true);
    });
  });

  describe('Position Management', () => {
    test('should create position interpolator for new NPC', () => {
      const npcs = [{
        id: 'npc1',
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER',
        health: 100,
        maxHealth: 100
      }];

      renderer.updatePositions(npcs, 16);
      expect(renderer.positionInterpolators.size).toBe(1);
      expect(renderer.positionInterpolators.has('npc1')).toBe(true);
    });

    test('should update position when NPC moves', () => {
      const npc = {
        id: 'npc1',
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER'
      };

      renderer.updatePositions([npc], 16);
      const interpolator = renderer.positionInterpolators.get('npc1');
      const pos1 = { ...interpolator.currentPosition };

      // Move NPC
      npc.position = { x: 7, y: 0, z: 7 };
      renderer.updatePositions([npc], 16);

      const pos2 = interpolator.currentPosition;

      // Position should have changed (interpolating toward target)
      expect(pos2.x).not.toBe(pos1.x);
      expect(pos2.z).not.toBe(pos1.z);
    });

    test('should remove NPC data when NPC is removed', () => {
      const npcs = [{
        id: 'npc1',
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER'
      }];

      renderer.updatePositions(npcs, 16);
      expect(renderer.positionInterpolators.size).toBe(1);

      renderer.removeNPC('npc1');
      expect(renderer.positionInterpolators.size).toBe(0);
      expect(renderer.animationManagers.size).toBe(0);
    });
  });

  describe('Rendering', () => {
    const worldToCanvas = (x, z) => ({
      x: x * 40,
      y: z * 40
    });

    test('should render NPCs on canvas', () => {
      const npcs = [{
        id: 'npc1',
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER',
        health: 100,
        maxHealth: 100,
        alive: true
      }];

      renderer.renderNPCs(mockCtx, npcs, worldToCanvas);

      // Should have called drawing methods
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    test('should skip dead NPCs', () => {
      const npcs = [{
        id: 'npc1',
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER',
        health: 0,
        alive: false
      }];

      renderer.renderNPCs(mockCtx, npcs, worldToCanvas);

      // Should not draw anything for dead NPCs
      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    test('should render health bar for damaged NPCs', () => {
      const damagedRenderer = new NPCRenderer({
        showHealthBars: true
      });

      const npcs = [{
        id: 'npc1',
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER',
        health: 50,
        maxHealth: 100,
        alive: true
      }];

      damagedRenderer.renderNPCs(mockCtx, npcs, worldToCanvas);

      // Should have drawn health bar
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    test('should not render if context is null', () => {
      const npcs = [{ id: 'npc1', position: { x: 5, y: 0, z: 5 } }];

      // Should not throw error
      expect(() => {
        renderer.renderNPCs(null, npcs, worldToCanvas);
      }).not.toThrow();
    });
  });

  describe('Pathfinding Visualization', () => {
    const worldToCanvas = (x, z) => ({ x: x * 40, y: z * 40 });

    test('should render pathfinding paths in debug mode', () => {
      const debugRenderer = new NPCRenderer({ debugMode: true });

      const npcs = [{
        id: 'npc1',
        position: { x: 0, y: 0, z: 0 },
        role: 'FARMER',
        currentPath: [
          { x: 1, y: 0, z: 1 },
          { x: 2, y: 0, z: 2 },
          { x: 3, y: 0, z: 3 }
        ],
        pathIndex: 0,
        alive: true
      }];

      debugRenderer.renderAllPaths(mockCtx, npcs, worldToCanvas);

      // Should have drawn path
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    test('should not render paths when debug mode is off', () => {
      const regularRenderer = new NPCRenderer({ debugMode: false });

      const npcs = [{
        id: 'npc1',
        position: { x: 0, y: 0, z: 0 },
        currentPath: [{ x: 1, y: 0, z: 1 }],
        alive: true
      }];

      regularRenderer.renderAllPaths(mockCtx, npcs, worldToCanvas);

      // Should not draw in non-debug mode
      expect(mockCtx.stroke).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    test('should track render statistics', () => {
      const npcs = [{
        id: 'npc1',
        position: { x: 5, y: 0, z: 5 },
        role: 'FARMER',
        alive: true
      }];

      const worldToCanvas = (x, z) => ({ x: x * 40, y: z * 40 });

      renderer.renderNPCs(mockCtx, npcs, worldToCanvas);

      const stats = renderer.getStats();
      expect(stats.npcCount).toBe(1);
      expect(stats.renderCount).toBeGreaterThan(0);
      expect(stats.debugMode).toBe(false);
    });

    test('should toggle debug mode', () => {
      expect(renderer.config.debugMode).toBe(false);

      renderer.setDebugMode(true);
      expect(renderer.config.debugMode).toBe(true);

      renderer.setDebugMode(false);
      expect(renderer.config.debugMode).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should clear all NPC data', () => {
      const npcs = [
        { id: 'npc1', position: { x: 5, y: 0, z: 5 }, role: 'FARMER' },
        { id: 'npc2', position: { x: 6, y: 0, z: 6 }, role: 'GUARD' }
      ];

      renderer.updatePositions(npcs, 16);
      expect(renderer.positionInterpolators.size).toBe(2);

      renderer.clear();
      expect(renderer.positionInterpolators.size).toBe(0);
      expect(renderer.animationManagers.size).toBe(0);
    });
  });
});
