/**
 * AutoSaveManager.test.js - Unit tests for AutoSaveManager
 */

import { AutoSaveManager } from '../AutoSaveManager';

describe('AutoSaveManager', () => {
  let mockGameManager;
  let autoSaveManager;
  let onSaveStartMock;
  let onSaveSuccessMock;
  let onSaveErrorMock;

  beforeEach(() => {
    // Mock game manager
    mockGameManager = {
      saveGame: jest.fn().mockResolvedValue({ success: true })
    };

    // Mock callbacks
    onSaveStartMock = jest.fn();
    onSaveSuccessMock = jest.fn();
    onSaveErrorMock = jest.fn();

    // Clear all timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (autoSaveManager) {
      autoSaveManager.destroy();
    }
    jest.useRealTimers();
  });

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);

      expect(autoSaveManager.gameManager).toBe(mockGameManager);
      expect(autoSaveManager.options.interval).toBe(60000);
      expect(autoSaveManager.options.enabled).toBe(true);
      expect(autoSaveManager.isRunning).toBe(false);
    });

    it('should create instance with custom options', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager, {
        interval: 30000,
        enabled: false,
        slotName: 'custom-slot'
      });

      expect(autoSaveManager.options.interval).toBe(30000);
      expect(autoSaveManager.options.enabled).toBe(false);
      expect(autoSaveManager.options.slotName).toBe('custom-slot');
    });

    it('should throw error if no game manager provided', () => {
      expect(() => {
        new AutoSaveManager(null);
      }).toThrow('AutoSaveManager requires a GameManager instance');
    });
  });

  describe('start()', () => {
    it('should start auto-save timer', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);

      const result = autoSaveManager.start();

      expect(result).toBe(true);
      expect(autoSaveManager.isRunning).toBe(true);
      expect(autoSaveManager.intervalId).not.toBeNull();
    });

    it('should not start if already running', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);
      autoSaveManager.start();

      const result = autoSaveManager.start();

      expect(result).toBe(false);
    });

    it('should not start if disabled', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager, { enabled: false });

      const result = autoSaveManager.start();

      expect(result).toBe(false);
      expect(autoSaveManager.isRunning).toBe(false);
    });
  });

  describe('stop()', () => {
    it('should stop auto-save timer', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);
      autoSaveManager.start();

      const result = autoSaveManager.stop();

      expect(result).toBe(true);
      expect(autoSaveManager.isRunning).toBe(false);
      expect(autoSaveManager.intervalId).toBeNull();
    });

    it('should not stop if not running', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);

      const result = autoSaveManager.stop();

      expect(result).toBe(false);
    });
  });

  describe('performSave()', () => {
    it('should perform successful save', async () => {
      autoSaveManager = new AutoSaveManager(mockGameManager, {
        onSaveStart: onSaveStartMock,
        onSaveSuccess: onSaveSuccessMock
      });

      const result = await autoSaveManager.performSave();

      expect(result.success).toBe(true);
      expect(onSaveStartMock).toHaveBeenCalled();
      expect(onSaveSuccessMock).toHaveBeenCalled();
      expect(autoSaveManager.lastSaveStatus).toBe('success');
      expect(autoSaveManager.saveCount).toBe(1);
    });

    it('should handle save failure', async () => {
      mockGameManager.saveGame.mockResolvedValue({
        success: false,
        message: 'Save failed'
      });

      autoSaveManager = new AutoSaveManager(mockGameManager, {
        onSaveStart: onSaveStartMock,
        onSaveError: onSaveErrorMock
      });

      const result = await autoSaveManager.performSave();

      expect(result.success).toBe(false);
      expect(onSaveErrorMock).toHaveBeenCalled();
      expect(autoSaveManager.lastSaveStatus).toBe('error');
      expect(autoSaveManager.lastError).toBe('Save failed');
    });

    it('should not save if already saving', async () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);
      autoSaveManager.isSaving = true;

      const result = await autoSaveManager.performSave();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Save already in progress');
      expect(mockGameManager.saveGame).not.toHaveBeenCalled();
    });
  });

  describe('manualSave()', () => {
    it('should trigger manual save', async () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);

      const result = await autoSaveManager.manualSave();

      expect(result.success).toBe(true);
      expect(mockGameManager.saveGame).toHaveBeenCalledWith(
        'autosave',
        expect.stringContaining('Auto-save at')
      );
    });
  });

  describe('enable() and disable()', () => {
    it('should enable auto-save', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager, { enabled: false });

      autoSaveManager.enable();

      expect(autoSaveManager.options.enabled).toBe(true);
      expect(autoSaveManager.isRunning).toBe(true);
    });

    it('should disable auto-save', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);
      autoSaveManager.start();

      autoSaveManager.disable();

      expect(autoSaveManager.options.enabled).toBe(false);
      expect(autoSaveManager.isRunning).toBe(false);
    });
  });

  describe('setInterval()', () => {
    it('should update interval and restart timer', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);
      autoSaveManager.start();

      autoSaveManager.setInterval(120000);

      expect(autoSaveManager.options.interval).toBe(120000);
      expect(autoSaveManager.isRunning).toBe(true);
    });

    it('should enforce minimum interval of 10 seconds', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);

      autoSaveManager.setInterval(5000);

      expect(autoSaveManager.options.interval).toBe(10000);
    });
  });

  describe('getStatus()', () => {
    it('should return current status', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);
      autoSaveManager.lastSaveTime = Date.now();
      autoSaveManager.lastSaveStatus = 'success';
      autoSaveManager.saveCount = 5;

      const status = autoSaveManager.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.isSaving).toBe(false);
      expect(status.lastSaveStatus).toBe('success');
      expect(status.saveCount).toBe(5);
      expect(status.interval).toBe(60000);
    });
  });

  describe('destroy()', () => {
    it('should cleanup and reset state', () => {
      autoSaveManager = new AutoSaveManager(mockGameManager);
      autoSaveManager.start();
      autoSaveManager.lastSaveTime = Date.now();
      autoSaveManager.saveCount = 3;

      autoSaveManager.destroy();

      expect(autoSaveManager.isRunning).toBe(false);
      expect(autoSaveManager.gameManager).toBeNull();
      expect(autoSaveManager.lastSaveTime).toBeNull();
      expect(autoSaveManager.saveCount).toBe(0);
    });
  });
});
