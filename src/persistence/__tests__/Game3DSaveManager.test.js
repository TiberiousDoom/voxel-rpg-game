/**
 * Game3DSaveManager — save/load round trips through the real store and a
 * synchronous ChunkManager (fake-indexeddb).
 */
import useGameStore from '../../stores/useGameStore';
import Game3DSaveManager, { validateSaveData } from '../Game3DSaveManager';
import { ChunkManager } from '../../systems/chunks/ChunkManager';

async function loadChunksAround(cm, x, z) {
  cm.updatePlayerPosition(x, z);
  for (let i = 0; i < 60; i++) {
    cm.update(0.016);
    await Promise.resolve();
  }
}

describe('Game3DSaveManager', () => {
  let manager;

  beforeEach(() => {
    useGameStore.getState().reset();
    manager = new Game3DSaveManager();
  });

  test('restores player, camera and character when given the store hook', async () => {
    const store = useGameStore.getState();
    store.updatePlayer({ position: [100, 30, 200], level: 7, xp: 55, health: 42, skillPoints: 3 });
    useGameStore.setState({ character: { ...store.character, attributePoints: 9 } });
    store.updateCamera({ distance: 33 });
    useGameStore.setState({ unlockedSpells: ['fireball', 'meteor'] });

    expect((await manager.saveGame(useGameStore, null, 'slotA')).success).toBe(true);

    useGameStore.getState().reset();
    const result = await manager.loadGame(useGameStore, null, 'slotA');
    expect(result.success).toBe(true);

    const s = useGameStore.getState();
    expect(s.player.position).toEqual([100, 30, 200]);
    expect(s.player.level).toBe(7);
    expect(s.player.xp).toBe(55);
    expect(s.player.health).toBe(42);
    expect(s.player.skillPoints).toBe(3);
    expect(s.camera.distance).toBe(33);
    expect(s.character.attributePoints).toBe(9);
    expect(s.unlockedSpells).toEqual(['fireball', 'meteor']);
    // Physics body is moved via an explicit teleport request
    expect(s.pendingTeleport).toEqual([100, 30, 200]);
  });

  test('does not persist transient combat state', async () => {
    useGameStore.getState().updatePlayer({ isInvincible: true, comboCount: 5, spellCooldowns: { fireball: 2 } });
    await manager.saveGame(useGameStore, null, 'slotB');
    const result = await manager.loadGame(useGameStore, null, 'slotB');
    expect(result.success).toBe(true);
    const p = useGameStore.getState().player;
    expect(p.isInvincible).toBe(false);
    expect(p.spellCooldowns).toEqual({});
  });

  test('saves world edits in unloaded chunks and reverts edits made after the save', async () => {
    const cm = new ChunkManager({ seed: 7, viewDistance: 2 });
    await loadChunksAround(cm, 0, 0);

    // Edit near spawn, then walk away so the chunk unloads
    expect(cm.setBlock(1, 61, 1, 5)).toBe(true);
    await loadChunksAround(cm, 5000, 5000);
    expect(cm.getChunk(0, 0)).toBeUndefined();

    // Edit far away too, then save (one loaded edit, one unloaded edit)
    expect(cm.setBlock(5001, 61, 5001, 4)).toBe(true);
    const saved = await manager.saveGame(useGameStore, cm, 'slotC');
    expect(saved.chunksSaved).toBe(2);

    // A post-save edit should be reverted on load
    cm.setBlock(5011, 61, 5001, 6);

    const loaded = await manager.loadGame(useGameStore, cm, 'slotC');
    expect(loaded.success).toBe(true);
    await loadChunksAround(cm, 5000, 5000);
    expect(cm.getBlock(5001, 61, 5001)).toBe(4);
    expect(cm.getBlock(5011, 61, 5001)).toBe(0);

    // The unloaded edit comes back when the player returns
    await loadChunksAround(cm, 0, 0);
    expect(cm.getBlock(1, 61, 1)).toBe(5);
  });

  test('rejects corrupted saves', () => {
    expect(validateSaveData(null)).not.toHaveLength(0);
    expect(validateSaveData({ player: { position: [1, 2] }, inventory: {} })).toContain('Invalid player position');
    expect(validateSaveData({ player: { position: [1, 2, 3] }, inventory: { materials: {} } })).toEqual([]);
  });
});
