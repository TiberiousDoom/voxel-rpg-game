/**
 * ChunkManager — world edits survive unload/reload, unload-queue race, Y bounds.
 */
import { ChunkManager } from '../ChunkManager';

async function settle(cm, x, z, frames = 60) {
  cm.updatePlayerPosition(x, z);
  for (let i = 0; i < frames; i++) {
    cm.update(0.016);
    await Promise.resolve();
  }
}

describe('ChunkManager edit persistence', () => {
  test('block edits survive the chunk unloading and reloading', async () => {
    const cm = new ChunkManager({ seed: 1, viewDistance: 2 });
    await settle(cm, 0, 0);
    expect(cm.setBlock(1, 61, 1, 5)).toBe(true);

    await settle(cm, 5000, 5000);
    expect(cm.getChunk(0, 0)).toBeUndefined();

    await settle(cm, 0, 0);
    expect(cm.getBlock(1, 61, 1)).toBe(5);
  });

  test('chunks needed again before the unload queue drains stay loaded', async () => {
    const cm = new ChunkManager({ seed: 1, viewDistance: 2 });
    await settle(cm, 0, 0);
    const before = cm.chunks.size;

    cm.updatePlayerPosition(32 * 3, 0); // queue unloads
    cm.updatePlayerPosition(0, 0);      // come straight back
    await settle(cm, 0, 0);

    expect(cm.chunks.size).toBe(before);
    expect(cm.getChunk(-2, 0)).toBeDefined();
  });

  test('reads/writes outside the world height are air / rejected', async () => {
    const cm = new ChunkManager({ seed: 1, viewDistance: 1 });
    await settle(cm, 0, 0);
    const bottom = cm.getBlock(1, 1, 1);
    expect(cm.getBlock(1, -5, 1)).toBe(0);
    expect(cm.setBlock(1, -5, 1, 2)).toBe(false);
    expect(cm.getBlock(1, 1, 1)).toBe(bottom); // bedrock layer untouched
    expect(cm.getBlock(1, 100000, 1)).toBe(0);
  });

  test('failed loads are retried', async () => {
    vi.useFakeTimers();
    try {
      let calls = 0;
      const cm = new ChunkManager({ seed: 1, viewDistance: 0 });
      cm.setWorkerPool({
        execute: () => {
          calls++;
          if (calls === 1) return Promise.reject(new Error('worker crashed'));
          return Promise.resolve({ blocks: new Uint8Array(16 * 16 * 32) });
        },
      });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      cm.updatePlayerPosition(0, 0);
      cm.update(0.016);
      await vi.advanceTimersByTimeAsync(10);
      expect(cm.getChunk(0, 0)).toBeUndefined();
      await vi.advanceTimersByTimeAsync(1000);
      cm.update(0.016);
      await vi.advanceTimersByTimeAsync(10);
      expect(calls).toBe(2);
      expect(cm.getChunk(0, 0)).toBeDefined();
      warn.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });
});
