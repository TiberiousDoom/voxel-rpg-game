/**
 * BatchActions.test.js - Unit tests for BatchActions
 */

import { BatchActions } from '../BatchActions';

describe('BatchActions', () => {
  let mockGameManager;
  let batchActions;

  const mockNPCs = [
    { id: 'npc1', role: 'WORKER', assignedBuilding: null },
    { id: 'npc2', role: 'WORKER', assignedBuilding: 'building1' },
    { id: 'npc3', role: 'FARMER', assignedBuilding: null },
    { id: 'npc4', role: 'MINER', assignedBuilding: 'building2' }
  ];

  beforeEach(() => {
    mockGameManager = {
      orchestrator: {
        gameState: {
          npcs: mockNPCs
        }
      },
      assignNPC: jest.fn().mockReturnValue({ success: true }),
      unassignNPC: jest.fn().mockReturnValue({ success: true }),
      autoAssignNPCs: jest.fn().mockReturnValue({ success: true, assigned: 2 })
    };

    batchActions = new BatchActions(mockGameManager);
  });

  afterEach(() => {
    if (batchActions) {
      batchActions.destroy();
    }
  });

  describe('Constructor', () => {
    it('should create instance with game manager', () => {
      expect(batchActions.gameManager).toBe(mockGameManager);
      expect(batchActions.selectedNPCs.size).toBe(0);
    });

    it('should throw error if no game manager provided', () => {
      expect(() => {
        new BatchActions(null);
      }).toThrow('BatchActions requires a GameManager instance');
    });
  });

  describe('selectNPC()', () => {
    it('should select an NPC', () => {
      const result = batchActions.selectNPC('npc1');

      expect(result).toBe(true);
      expect(batchActions.isSelected('npc1')).toBe(true);
      expect(batchActions.getSelectionCount()).toBe(1);
    });

    it('should trigger onSelectionChange callback', () => {
      const callback = jest.fn();
      batchActions.on('onSelectionChange', callback);

      batchActions.selectNPC('npc1');

      expect(callback).toHaveBeenCalledWith({
        selected: ['npc1'],
        count: 1
      });
    });

    it('should return false for invalid NPC ID', () => {
      const result = batchActions.selectNPC(null);

      expect(result).toBe(false);
    });
  });

  describe('deselectNPC()', () => {
    it('should deselect an NPC', () => {
      batchActions.selectNPC('npc1');

      const result = batchActions.deselectNPC('npc1');

      expect(result).toBe(true);
      expect(batchActions.isSelected('npc1')).toBe(false);
      expect(batchActions.getSelectionCount()).toBe(0);
    });

    it('should return false if NPC not selected', () => {
      const result = batchActions.deselectNPC('npc1');

      expect(result).toBe(false);
    });
  });

  describe('toggleNPC()', () => {
    it('should toggle NPC selection on', () => {
      const result = batchActions.toggleNPC('npc1');

      expect(result).toBe(true);
      expect(batchActions.isSelected('npc1')).toBe(true);
    });

    it('should toggle NPC selection off', () => {
      batchActions.selectNPC('npc1');

      const result = batchActions.toggleNPC('npc1');

      expect(result).toBe(false);
      expect(batchActions.isSelected('npc1')).toBe(false);
    });
  });

  describe('selectMultiple()', () => {
    it('should select multiple NPCs', () => {
      const count = batchActions.selectMultiple(['npc1', 'npc2', 'npc3']);

      expect(count).toBe(3);
      expect(batchActions.getSelectionCount()).toBe(3);
      expect(batchActions.isSelected('npc1')).toBe(true);
      expect(batchActions.isSelected('npc2')).toBe(true);
      expect(batchActions.isSelected('npc3')).toBe(true);
    });

    it('should return 0 for invalid input', () => {
      const count = batchActions.selectMultiple(null);

      expect(count).toBe(0);
    });
  });

  describe('selectAll()', () => {
    it('should select all NPCs', () => {
      const count = batchActions.selectAll(mockNPCs);

      expect(count).toBe(4);
      expect(batchActions.getSelectionCount()).toBe(4);
    });
  });

  describe('selectByRole()', () => {
    it('should select NPCs by role', () => {
      const count = batchActions.selectByRole('WORKER');

      expect(count).toBe(2);
      expect(batchActions.isSelected('npc1')).toBe(true);
      expect(batchActions.isSelected('npc2')).toBe(true);
    });
  });

  describe('selectIdle()', () => {
    it('should select idle NPCs (not assigned)', () => {
      const count = batchActions.selectIdle();

      expect(count).toBe(2);
      expect(batchActions.isSelected('npc1')).toBe(true);
      expect(batchActions.isSelected('npc3')).toBe(true);
    });
  });

  describe('clearSelection()', () => {
    it('should clear all selections', () => {
      batchActions.selectMultiple(['npc1', 'npc2', 'npc3']);

      const count = batchActions.clearSelection();

      expect(count).toBe(3);
      expect(batchActions.getSelectionCount()).toBe(0);
    });
  });

  describe('getSelected()', () => {
    it('should return array of selected NPC IDs', () => {
      batchActions.selectMultiple(['npc1', 'npc3']);

      const selected = batchActions.getSelected();

      expect(selected).toEqual(['npc1', 'npc3']);
    });
  });

  describe('assignSelected()', () => {
    it('should batch assign selected NPCs to building', async () => {
      batchActions.selectMultiple(['npc1', 'npc3']);

      const result = await batchActions.assignSelected('building1');

      expect(result.success).toBe(true);
      expect(result.assigned).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockGameManager.assignNPC).toHaveBeenCalledTimes(2);
    });

    it('should handle assignment failures', async () => {
      mockGameManager.assignNPC
        .mockReturnValueOnce({ success: true })
        .mockReturnValueOnce({ success: false, message: 'Building full' });

      batchActions.selectMultiple(['npc1', 'npc3']);

      const result = await batchActions.assignSelected('building1');

      expect(result.success).toBe(false);
      expect(result.assigned).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should return error if no building specified', async () => {
      batchActions.selectNPC('npc1');

      const result = await batchActions.assignSelected(null);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No building specified');
    });

    it('should return error if no NPCs selected', async () => {
      const result = await batchActions.assignSelected('building1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('No NPCs selected');
    });
  });

  describe('unassignSelected()', () => {
    it('should batch unassign selected NPCs', async () => {
      batchActions.selectMultiple(['npc2', 'npc4']);

      const result = await batchActions.unassignSelected();

      expect(result.success).toBe(true);
      expect(result.unassigned).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockGameManager.unassignNPC).toHaveBeenCalledTimes(2);
    });

    it('should return error if no NPCs selected', async () => {
      const result = await batchActions.unassignSelected();

      expect(result.success).toBe(false);
      expect(result.message).toBe('No NPCs selected');
    });
  });

  describe('getSelectedNPCsData()', () => {
    it('should return full data for selected NPCs', () => {
      batchActions.selectMultiple(['npc1', 'npc3']);

      const data = batchActions.getSelectedNPCsData();

      expect(data).toHaveLength(2);
      expect(data[0]).toEqual(mockNPCs[0]);
      expect(data[1]).toEqual(mockNPCs[2]);
    });
  });

  describe('destroy()', () => {
    it('should cleanup and reset state', () => {
      batchActions.selectMultiple(['npc1', 'npc2']);

      batchActions.destroy();

      expect(batchActions.getSelectionCount()).toBe(0);
      expect(batchActions.gameManager).toBeNull();
    });
  });
});
