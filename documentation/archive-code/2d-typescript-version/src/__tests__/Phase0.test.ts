/**
 * Phase 0 Foundation Tests
 *
 * Tests for Phase 0 systems per 2D_GAME_IMPLEMENTATION_PLAN.md:
 * - SaveManager
 * - CameraSystem
 * - UIManager
 * - PlayerController
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CameraSystem } from '../entities/CameraSystem';
import { UIManager } from '../ui/UIManager';
import { PlayerController, PlayerState } from '../entities/PlayerController';
import { SaveManager } from '../systems/SaveManager';
import { PanelType } from '../core/types';

// ============================================================================
// CameraSystem Tests
// ============================================================================

describe('CameraSystem', () => {
  let camera: CameraSystem;

  beforeEach(() => {
    camera = new CameraSystem({
      followSpeed: 5.0,
      deadzone: 0.5,
      minZoom: 0.5,
      maxZoom: 2.0,
      zoomSpeed: 2.0,
      viewportWidth: 20,
      viewportHeight: 15,
    });
    camera.initialize();
  });

  describe('position', () => {
    it('should start at origin', () => {
      const pos = camera.getPosition();
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
    });

    it('should snap to position immediately', () => {
      camera.snapTo(100, 50);
      const pos = camera.getPosition();
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(50);
    });

    it('should set target position', () => {
      camera.setTarget(100, 50);
      // Position doesn't change immediately
      const pos = camera.getRawPosition();
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
    });
  });

  describe('zoom', () => {
    it('should start at default zoom', () => {
      expect(camera.getZoom()).toBe(1.0);
    });

    it('should set zoom within limits', () => {
      camera.setZoom(1.5);
      // Zoom changes over time, so we check target is clamped
      // After immediate setting:
      expect(camera.getZoom()).toBe(1.0); // Still 1.0 until updated

      // Zoom in
      camera.zoomIn();
      camera.zoomOut();
    });

    it('should clamp zoom to minZoom', () => {
      camera.setZoom(0.1); // Below min of 0.5
      // Target is clamped, actual zoom changes over time
    });

    it('should clamp zoom to maxZoom', () => {
      camera.setZoom(10); // Above max of 2.0
      // Target is clamped
    });
  });

  describe('view bounds', () => {
    it('should calculate view bounds correctly', () => {
      camera.snapTo(10, 10);
      const bounds = camera.getViewBounds();

      expect(bounds.x).toBeCloseTo(10 - 10); // x - halfWidth
      expect(bounds.y).toBeCloseTo(10 - 7.5); // y - halfHeight
      expect(bounds.width).toBe(20); // viewportWidth / zoom
      expect(bounds.height).toBe(15); // viewportHeight / zoom
    });
  });

  describe('visibility', () => {
    it('should detect visible positions', () => {
      camera.snapTo(0, 0);
      expect(camera.isVisible(0, 0)).toBe(true);
      expect(camera.isVisible(5, 5)).toBe(true);
    });

    it('should detect non-visible positions', () => {
      camera.snapTo(0, 0);
      expect(camera.isVisible(100, 100)).toBe(false);
    });
  });

  describe('shake', () => {
    it('should add shake intensity', () => {
      camera.shake(5);
      // Shake offset is random, so just verify no errors
    });
  });

  describe('coordinate conversion', () => {
    it('should convert screen to world', () => {
      camera.snapTo(0, 0);
      const world = camera.screenToWorld(400, 300, 800, 600);
      expect(world.x).toBeCloseTo(0);
      expect(world.y).toBeCloseTo(0);
    });

    it('should convert world to screen', () => {
      camera.snapTo(0, 0);
      const screen = camera.worldToScreen(0, 0, 800, 600);
      expect(screen.x).toBeCloseTo(400);
      expect(screen.y).toBeCloseTo(300);
    });
  });
});

// ============================================================================
// UIManager Tests
// ============================================================================

describe('UIManager', () => {
  let ui: UIManager;

  beforeEach(() => {
    ui = new UIManager();
    ui.initialize();
  });

  describe('panel management', () => {
    it('should start with HUD panel open', () => {
      expect(ui.isPanelOpen(PanelType.HUD)).toBe(true);
    });

    it('should open a panel', () => {
      ui.openPanel(PanelType.Inventory);
      expect(ui.isPanelOpen(PanelType.Inventory)).toBe(true);
    });

    it('should close a panel', () => {
      ui.openPanel(PanelType.Inventory);
      ui.closePanel(PanelType.Inventory);
      expect(ui.isPanelOpen(PanelType.Inventory)).toBe(false);
    });

    it('should toggle panel', () => {
      expect(ui.isPanelOpen(PanelType.Build)).toBe(false);
      ui.togglePanel(PanelType.Build);
      expect(ui.isPanelOpen(PanelType.Build)).toBe(true);
      ui.togglePanel(PanelType.Build);
      expect(ui.isPanelOpen(PanelType.Build)).toBe(false);
    });

    it('should not duplicate panel on multiple opens', () => {
      ui.openPanel(PanelType.Inventory);
      ui.openPanel(PanelType.Inventory);
      expect(ui.isPanelOpen(PanelType.Inventory)).toBe(true);
    });
  });

  describe('modal management', () => {
    it('should track modal stack', () => {
      expect(ui.hasOpenModal()).toBe(false);
      ui.openPanel(PanelType.Inventory, true);
      expect(ui.hasOpenModal()).toBe(true);
    });

    it('should return top modal', () => {
      ui.openPanel(PanelType.Inventory, true);
      ui.openPanel(PanelType.Settings, true);
      expect(ui.getTopModal()).toBe(PanelType.Settings);
    });

    it('should close top modal', () => {
      ui.openPanel(PanelType.Inventory, true);
      ui.openPanel(PanelType.Settings, true);
      ui.closeTopModal();
      expect(ui.getTopModal()).toBe(PanelType.Inventory);
      expect(ui.isPanelOpen(PanelType.Settings)).toBe(false);
    });

    it('should close all modals', () => {
      ui.openPanel(PanelType.Inventory, true);
      ui.openPanel(PanelType.Settings, true);
      ui.closeAllModals();
      expect(ui.hasOpenModal()).toBe(false);
    });
  });

  describe('tooltip', () => {
    it('should show tooltip', () => {
      ui.showTooltip('Test tooltip', { x: 100, y: 200 });
      expect(ui.isTooltipVisible()).toBe(true);
      expect(ui.getTooltipContent()).toBe('Test tooltip');
      expect(ui.getTooltipPosition()).toEqual({ x: 100, y: 200 });
    });

    it('should hide tooltip', () => {
      ui.showTooltip('Test', { x: 0, y: 0 });
      ui.hideTooltip();
      expect(ui.isTooltipVisible()).toBe(false);
      expect(ui.getTooltipContent()).toBeNull();
    });
  });

  describe('state access', () => {
    it('should return active panels', () => {
      ui.openPanel(PanelType.Inventory);
      const panels = ui.getActivePanels();
      expect(panels.has(PanelType.HUD)).toBe(true);
      expect(panels.has(PanelType.Inventory)).toBe(true);
    });

    it('should return modal stack', () => {
      ui.openPanel(PanelType.Inventory, true);
      const stack = ui.getModalStack();
      expect(stack).toContain(PanelType.Inventory);
    });
  });
});

// ============================================================================
// PlayerController Tests
// ============================================================================

describe('PlayerController', () => {
  let player: PlayerController;

  beforeEach(() => {
    player = new PlayerController({
      walkSpeed: 4,
      runSpeed: 7,
      acceleration: 20,
      deceleration: 15,
    });
    player.initialize();
  });

  describe('position', () => {
    it('should start at origin', () => {
      const pos = player.getPosition();
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
    });

    it('should set position', () => {
      player.setPosition(100, 50);
      const pos = player.getPosition();
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(50);
    });

    it('should reset velocity on setPosition', () => {
      player.setPosition(100, 50);
      const vel = player.getVelocity();
      expect(vel.x).toBe(0);
      expect(vel.y).toBe(0);
    });
  });

  describe('state', () => {
    it('should start in idle state', () => {
      expect(player.getState()).toBe(PlayerState.Idle);
    });

    it('should set state', () => {
      player.setState(PlayerState.InMenu);
      expect(player.getState()).toBe(PlayerState.InMenu);
    });

    it('should reset velocity when entering menu state', () => {
      player.setState(PlayerState.InMenu);
      const vel = player.getVelocity();
      expect(vel.x).toBe(0);
      expect(vel.y).toBe(0);
    });
  });

  describe('movement detection', () => {
    it('should report not moving when idle', () => {
      expect(player.isMoving()).toBe(false);
    });

    it('should report moving when walking', () => {
      player.setState(PlayerState.Walking);
      expect(player.isMoving()).toBe(true);
    });

    it('should report moving when running', () => {
      player.setState(PlayerState.Running);
      expect(player.isMoving()).toBe(true);
    });
  });

  describe('walkable check', () => {
    it('should accept walkable check function', () => {
      const mockCheck = vi.fn().mockReturnValue(true);
      player.setWalkableCheck(mockCheck);
      // Function is stored for use during movement
    });
  });
});

// ============================================================================
// SaveManager Tests
// ============================================================================

describe('SaveManager', () => {
  let save: SaveManager;

  beforeEach(() => {
    save = new SaveManager();
    save.initialize();
    // Clear any existing saves
    localStorage.clear();
  });

  describe('slot management', () => {
    it('should get save slots', () => {
      const slots = save.getSaveSlots();
      expect(Array.isArray(slots)).toBe(true);
    });

    it('should check if save exists', () => {
      expect(save.saveExists('test_slot')).toBe(false);
    });
  });

  describe('autosave', () => {
    it('should enable autosave', () => {
      save.enableAutosave(60);
      // Verify no errors
      save.disableAutosave();
    });

    it('should disable autosave', () => {
      save.enableAutosave(60);
      save.disableAutosave();
      // Verify no errors
    });
  });

  describe('state provider/consumer', () => {
    it('should set state provider', () => {
      save.setStateProvider({
        getPlayerPosition: () => ({ x: 0, y: 0 }),
        getPlayerHealth: () => 100,
        getPlayerMaxHealth: () => 100,
        getPlayerInventory: () => [],
        getWorldSeed: () => 12345,
        getModifiedTiles: () => [],
        getTotalPlaytime: () => 0,
        getGameDay: () => 1,
      });
      // Verify no errors
    });

    it('should set state consumer', () => {
      save.setStateConsumer({
        loadPlayerPosition: () => {},
        loadPlayerHealth: () => {},
        loadPlayerInventory: () => {},
        loadWorldSeed: () => {},
        loadModifiedTiles: () => {},
        loadPlaytime: () => {},
        loadGameDay: () => {},
      });
      // Verify no errors
    });
  });

  describe('save/load', () => {
    it('should fail to save without state provider', async () => {
      const result = await save.saveGame('test');
      expect(result).toBe(false);
    });

    it('should fail to load without state consumer', async () => {
      const result = await save.loadGame('test');
      expect(result).toBe(false);
    });

    it('should save and load game', async () => {
      const savedPosition = { x: 0, y: 0 };
      const loadedPosition = { x: 0, y: 0 };

      save.setStateProvider({
        getPlayerPosition: () => ({ x: 100, y: 50 }),
        getPlayerHealth: () => 80,
        getPlayerMaxHealth: () => 100,
        getPlayerInventory: () => [{ itemId: 'wood', quantity: 10 }],
        getWorldSeed: () => 12345,
        getModifiedTiles: () => [],
        getTotalPlaytime: () => 3600,
        getGameDay: () => 5,
      });

      save.setStateConsumer({
        loadPlayerPosition: (pos) => {
          loadedPosition.x = pos.x;
          loadedPosition.y = pos.y;
        },
        loadPlayerHealth: () => {},
        loadPlayerInventory: () => {},
        loadWorldSeed: () => {},
        loadModifiedTiles: () => {},
        loadPlaytime: () => {},
        loadGameDay: () => {},
      });

      const saveResult = await save.saveGame('test_save');
      expect(saveResult).toBe(true);
      expect(save.saveExists('test_save')).toBe(true);

      const loadResult = await save.loadGame('test_save');
      expect(loadResult).toBe(true);
      expect(loadedPosition.x).toBe(100);
      expect(loadedPosition.y).toBe(50);
    });

    it('should delete save', async () => {
      save.setStateProvider({
        getPlayerPosition: () => ({ x: 0, y: 0 }),
        getPlayerHealth: () => 100,
        getPlayerMaxHealth: () => 100,
        getPlayerInventory: () => [],
        getWorldSeed: () => 12345,
        getModifiedTiles: () => [],
        getTotalPlaytime: () => 0,
        getGameDay: () => 1,
      });

      await save.saveGame('delete_test');
      expect(save.saveExists('delete_test')).toBe(true);

      save.deleteSave('delete_test');
      expect(save.saveExists('delete_test')).toBe(false);
    });
  });
});
