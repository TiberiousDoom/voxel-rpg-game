/**
 * SettlementBridge.test.js — Tests for the store↔module bridge.
 */

import SettlementBridge from '../SettlementBridge';

// Mock useGameStore
const mockStoreState = {
  gameState: 'playing',
  settlement: {
    npcs: [],
    attractiveness: 0,
    wallCount: 0,
    settlementCenter: null,
  },
  inventory: { materials: { meat: 5 } },
  worldTime: { elapsed: 100 },
  setSettlementCenter: jest.fn(),
  updateSettlementAttractiveness: jest.fn(),
  updateSettlementTimestamps: jest.fn(),
  addSettlementNPC: jest.fn(),
  removeMaterial: jest.fn(),
  batchUpdateSettlementNPCs: jest.fn(),
  removeSettlementNPC: jest.fn(),
};

jest.mock('../../../stores/useGameStore', () => ({
  __esModule: true,
  default: {
    getState: () => mockStoreState,
  },
}));

describe('SettlementBridge', () => {
  let bridge;
  let mockModule;

  beforeEach(() => {
    jest.clearAllMocks();
    mockModule = {
      setChunkAdapter: jest.fn(),
    };
    bridge = new SettlementBridge(mockModule);
  });

  describe('setChunkAdapter', () => {
    test('creates adapter and passes to module', () => {
      const mockChunkManager = {
        chunks: new Map([['0,0', { blocks: new Uint8Array(10) }]]),
        getBlock: jest.fn(),
      };
      bridge.setChunkAdapter(mockChunkManager);
      expect(mockModule.setChunkAdapter).toHaveBeenCalledTimes(1);
      const adapter = mockModule.setChunkAdapter.mock.calls[0][0];
      expect(adapter.iterateChunks).toBeDefined();
      expect(adapter.getBlock).toBeDefined();
      expect(adapter.getRawChunkManager).toBeDefined();
      expect(adapter.getRawChunkManager()).toBe(mockChunkManager);
    });
  });

  describe('getGameState', () => {
    test('reads correct fields from store', () => {
      const snapshot = bridge.getGameState();
      expect(snapshot.gameState).toBe('playing');
      expect(snapshot.settlement).toBe(mockStoreState.settlement);
      expect(snapshot.inventory).toBe(mockStoreState.inventory);
      expect(snapshot.worldTimeElapsed).toBe(100);
    });
  });

  describe('syncToStore', () => {
    test('handles null results gracefully', () => {
      bridge.syncToStore(null);
      expect(mockStoreState.setSettlementCenter).not.toHaveBeenCalled();
    });

    test('sets settlement center and returns early', () => {
      bridge.syncToStore({ campfireCenter: [10, 5, 20] });
      expect(mockStoreState.setSettlementCenter).toHaveBeenCalledWith([10, 5, 20]);
      // Should NOT proceed to other updates
      expect(mockStoreState.batchUpdateSettlementNPCs).not.toHaveBeenCalled();
    });

    test('updates attractiveness when attractivenessUpdated', () => {
      bridge.syncToStore({
        campfireCenter: null,
        attractivenessUpdated: true,
        attractiveness: 42,
        wallCount: 50,
        batchUpdates: {},
        removeIds: [],
        notifications: [],
        foodConsumptions: [],
        timestamps: {},
      });
      expect(mockStoreState.updateSettlementAttractiveness).toHaveBeenCalledWith(42);
      expect(mockStoreState.updateSettlementTimestamps).toHaveBeenCalledWith(
        expect.objectContaining({ wallCount: 50 })
      );
    });

    test('adds new NPC from immigration', () => {
      const newNPC = { id: 'npc_1', fullName: 'Test' };
      bridge.syncToStore({
        campfireCenter: null,
        newNPC,
        batchUpdates: {},
        removeIds: [],
        notifications: [],
        foodConsumptions: [],
        timestamps: {},
      });
      expect(mockStoreState.addSettlementNPC).toHaveBeenCalledWith(newNPC);
    });

    test('consumes food before NPC updates', () => {
      const callOrder = [];
      mockStoreState.removeMaterial.mockImplementation(() => callOrder.push('removeMaterial'));
      mockStoreState.batchUpdateSettlementNPCs.mockImplementation(() => callOrder.push('batchUpdate'));

      bridge.syncToStore({
        campfireCenter: null,
        batchUpdates: { npc_1: { hunger: 50 } },
        removeIds: [],
        notifications: [],
        foodConsumptions: [{ material: 'meat', qty: 1 }],
        timestamps: {},
      });

      expect(callOrder).toEqual(['removeMaterial', 'batchUpdate']);
    });

    test('removes NPCs', () => {
      bridge.syncToStore({
        campfireCenter: null,
        batchUpdates: {},
        removeIds: ['npc_1', 'npc_2'],
        notifications: [],
        foodConsumptions: [],
        timestamps: {},
      });
      expect(mockStoreState.removeSettlementNPC).toHaveBeenCalledWith('npc_1');
      expect(mockStoreState.removeSettlementNPC).toHaveBeenCalledWith('npc_2');
    });

    test('dispatches notifications', () => {
      const origAddNotification = window.addNotification;
      window.addNotification = jest.fn();

      bridge.syncToStore({
        campfireCenter: null,
        batchUpdates: {},
        removeIds: [],
        notifications: [
          { type: 'success', title: 'New Settler!', message: 'Test joined!' },
        ],
        foodConsumptions: [],
        timestamps: {},
      });

      expect(window.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', title: 'New Settler!' })
      );

      window.addNotification = origAddNotification;
    });

    test('updates timestamps', () => {
      bridge.syncToStore({
        campfireCenter: null,
        batchUpdates: {},
        removeIds: [],
        notifications: [],
        foodConsumptions: [],
        timestamps: { lastNeedsUpdate: 12345 },
      });
      expect(mockStoreState.updateSettlementTimestamps).toHaveBeenCalledWith({ lastNeedsUpdate: 12345 });
    });
  });
});
