/**
 * BuildingRenderer Unit Tests
 * Tests for building rendering system
 *
 * Part of WF3: Building Rendering & Visual Effects
 */

import { BuildingRenderer, createBuildingRenderer, RENDER_STATES } from '../BuildingRenderer.js';
import { BUILDING_TYPES } from '../../shared/config.js';

describe('BuildingRenderer', () => {
  let renderer;
  let mockCtx;

  beforeEach(() => {
    renderer = new BuildingRenderer({ tileSize: 40 });

    // Create mock canvas context
    mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillText: jest.fn(),
      setLineDash: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      shadowBlur: 0,
      shadowColor: ''
    };
  });

  describe('Constructor', () => {
    test('creates renderer with default options', () => {
      const defaultRenderer = new BuildingRenderer();
      expect(defaultRenderer.tileSize).toBe(40);
      expect(defaultRenderer.showHealthBars).toBe(true);
      expect(defaultRenderer.showProgressBars).toBe(true);
      expect(defaultRenderer.showShadows).toBe(true);
      expect(defaultRenderer.showOverlays).toBe(true);
    });

    test('creates renderer with custom options', () => {
      const customRenderer = new BuildingRenderer({
        tileSize: 60,
        showHealthBars: false,
        showShadows: false
      });
      expect(customRenderer.tileSize).toBe(60);
      expect(customRenderer.showHealthBars).toBe(false);
      expect(customRenderer.showShadows).toBe(false);
    });
  });

  describe('State Normalization', () => {
    test('normalizes BUILDING to UNDER_CONSTRUCTION', () => {
      expect(renderer.normalizeState('BUILDING')).toBe('UNDER_CONSTRUCTION');
      expect(renderer.normalizeState('building')).toBe('UNDER_CONSTRUCTION');
    });

    test('normalizes COMPLETED to COMPLETE', () => {
      expect(renderer.normalizeState('COMPLETED')).toBe('COMPLETE');
      expect(renderer.normalizeState('completed')).toBe('COMPLETE');
    });

    test('handles uppercase states', () => {
      expect(renderer.normalizeState('blueprint')).toBe('BLUEPRINT');
      expect(renderer.normalizeState('damaged')).toBe('DAMAGED');
    });
  });

  describe('Building Rendering', () => {
    const mockBuilding = {
      id: 'test-building-1',
      type: BUILDING_TYPES.WALL,
      state: 'COMPLETE',
      position: { x: 0, y: 0, z: 0 },
      health: 100,
      maxHealth: 100
    };

    const mockCanvasPos = { x: 0, y: 0 };

    test('renders complete building', () => {
      renderer.renderBuilding(mockCtx, mockBuilding, mockCanvasPos);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    });

    test('renders blueprint with dashed border', () => {
      const blueprintBuilding = { ...mockBuilding, state: 'BLUEPRINT' };
      renderer.renderBuilding(mockCtx, blueprintBuilding, mockCanvasPos);

      expect(mockCtx.setLineDash).toHaveBeenCalledWith([5, 3]);
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([]); // Reset
    });

    test('renders damaged building with health bar', () => {
      const damagedBuilding = {
        ...mockBuilding,
        state: 'DAMAGED',
        health: 50,
        maxHealth: 100
      };
      renderer.renderBuilding(mockCtx, damagedBuilding, mockCanvasPos);

      // Should draw health bar
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    test('renders building under construction with progress bar', () => {
      const constructingBuilding = {
        ...mockBuilding,
        state: 'UNDER_CONSTRUCTION',
        constructionProgress: 50,
        constructionTime: 100
      };
      renderer.renderBuilding(mockCtx, constructingBuilding, mockCanvasPos);

      // Should draw progress bar
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    test('renders worker count indicator', () => {
      const buildingWithWorkers = {
        ...mockBuilding,
        workerCount: 3
      };
      renderer.renderBuilding(mockCtx, buildingWithWorkers, mockCanvasPos);

      // Should draw worker indicator circle
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    test('skips rendering for null building', () => {
      renderer.renderBuilding(mockCtx, null, mockCanvasPos);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    test('skips rendering for building without position', () => {
      const buildingNoPos = { ...mockBuilding, position: null };
      renderer.renderBuilding(mockCtx, buildingNoPos, mockCanvasPos);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });
  });

  describe('Effect Rendering', () => {
    const mockCanvasPos = { x: 100, y: 100 };

    test('renders hover effect', () => {
      renderer.renderHoverEffect(mockCtx, mockCanvasPos, BUILDING_TYPES.WALL);

      expect(mockCtx.strokeRect).toHaveBeenCalled();
      expect(mockCtx.strokeStyle).toBe('#FFD700');
      expect(mockCtx.shadowBlur).toBe(10);
    });

    test('renders selection effect with dashed line', () => {
      renderer.renderSelectionEffect(mockCtx, mockCanvasPos);

      expect(mockCtx.strokeRect).toHaveBeenCalled();
      expect(mockCtx.strokeStyle).toBe('#FF4444');
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([5, 5]);
    });

    test('renders placement preview with valid color', () => {
      renderer.renderPlacementPreview(mockCtx, mockCanvasPos, BUILDING_TYPES.WALL, true);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.strokeStyle).toBe('#00FF00');
    });

    test('renders placement preview with invalid color', () => {
      renderer.renderPlacementPreview(mockCtx, mockCanvasPos, BUILDING_TYPES.WALL, false);

      expect(mockCtx.strokeStyle).toBe('#FF0000');
    });
  });

  describe('Texture Overlays', () => {
    const mockBuilding = {
      type: BUILDING_TYPES.WALL,
      state: 'DAMAGED',
      position: { x: 0, y: 0, z: 0 },
      health: 30,
      maxHealth: 100
    };
    const mockCanvasPos = { x: 0, y: 0 };

    test('draws crack patterns for damaged buildings', () => {
      renderer.drawCracks = jest.fn();
      renderer.renderBuilding(mockCtx, mockBuilding, mockCanvasPos);

      // Overlay should be drawn
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    test('draws blueprint grid for blueprint state', () => {
      const blueprintBuilding = { ...mockBuilding, state: 'BLUEPRINT', health: 100 };
      renderer.renderBuilding(mockCtx, blueprintBuilding, mockCanvasPos);

      // Grid lines should be drawn
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    test('draws construction pattern for under construction', () => {
      const constructingBuilding = {
        ...mockBuilding,
        state: 'UNDER_CONSTRUCTION',
        health: 100
      };
      renderer.renderBuilding(mockCtx, constructingBuilding, mockCanvasPos);

      // Diagonal pattern should be drawn
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('Factory Function', () => {
    test('creates renderer instance via factory', () => {
      const factoryRenderer = createBuildingRenderer({ tileSize: 50 });

      expect(factoryRenderer).toBeInstanceOf(BuildingRenderer);
      expect(factoryRenderer.tileSize).toBe(50);
    });
  });

  describe('RENDER_STATES', () => {
    test('exports all render state constants', () => {
      expect(RENDER_STATES.BLUEPRINT).toBe('BLUEPRINT');
      expect(RENDER_STATES.UNDER_CONSTRUCTION).toBe('UNDER_CONSTRUCTION');
      expect(RENDER_STATES.COMPLETE).toBe('COMPLETE');
      expect(RENDER_STATES.DAMAGED).toBe('DAMAGED');
      expect(RENDER_STATES.DESTROYED).toBe('DESTROYED');
    });
  });
});
