/**
 * TaskAssignmentEngine.test.js — Tests for idle NPC task assignment.
 */

import TaskAssignmentEngine from '../TaskAssignmentEngine';

function makeNPC(overrides = {}) {
  return {
    id: 'npc_1',
    state: 'IDLE',
    currentJob: null,
    position: [50, 2, 50],
    ...overrides,
  };
}

describe('TaskAssignmentEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new TaskAssignmentEngine({});
  });

  test('returns empty array before interval', () => {
    const result = engine.update(1, [makeNPC()], [50, 2, 50]);
    expect(result).toEqual([]);
  });

  test('skips non-idle NPCs', () => {
    const npcs = [
      makeNPC({ state: 'EATING' }),
      makeNPC({ id: 'npc_2', state: 'SLEEPING' }),
    ];
    const result = engine.update(4, npcs, [50, 2, 50]);
    expect(result).toEqual([]);
  });

  test('skips NPCs with currentJob', () => {
    const npcs = [makeNPC({ currentJob: 'haul_site1' })];
    const result = engine.update(4, npcs, [50, 2, 50]);
    expect(result).toEqual([]);
  });

  test('assigns HAULING when construction site needs materials', () => {
    const mockSite = {
      id: 'site_1',
      getBlocksNeedingMaterials: () => [{ id: 'block_1' }],
      getBlocksReadyToBuild: () => [],
      materialDropoff: { x: 10, y: 2, z: 20 },
      position: { x: 10, y: 2, z: 20 },
    };
    engine.constructionManager = {
      getActiveSites: () => [mockSite],
    };

    const result = engine.update(4, [makeNPC()], [50, 2, 50]);
    expect(result).toHaveLength(1);
    expect(result[0].state).toBe('HAULING');
    expect(result[0].currentJob).toBe('haul_site_1');
    expect(result[0].npcId).toBe('npc_1');
  });

  test('assigns BUILDING when construction site has buildable blocks', () => {
    const mockSite = {
      id: 'site_2',
      getBlocksNeedingMaterials: () => [],
      getBlocksReadyToBuild: () => [{ id: 'block_1' }],
      position: { x: 5, y: 0, z: 5 },
    };
    engine.constructionManager = {
      getActiveSites: () => [mockSite],
    };

    const result = engine.update(4, [makeNPC()], [50, 2, 50]);
    expect(result).toHaveLength(1);
    expect(result[0].state).toBe('BUILDING');
    expect(result[0].currentJob).toBe('build_site_2');
  });

  test('returns empty when no tasks available', () => {
    engine.constructionManager = {
      getActiveSites: () => [],
    };
    const result = engine.update(4, [makeNPC()], [50, 2, 50]);
    expect(result).toEqual([]);
  });

  test('serializes and deserializes accumulator', () => {
    engine._assignAccum = 2.5;
    const data = engine.serialize();
    const engine2 = new TaskAssignmentEngine({});
    engine2.deserialize(data);
    expect(engine2._assignAccum).toBe(2.5);
  });
});
