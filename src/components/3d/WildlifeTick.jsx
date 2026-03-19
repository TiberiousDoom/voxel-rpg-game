import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';
import { WILDLIFE_TYPES, WILDLIFE_TYPE_KEYS } from '../../data/wildlifeTypes';
import {
  WILDLIFE_MAX_POPULATION,
  WILDLIFE_SPAWN_INTERVAL,
  WILDLIFE_SPAWN_RANGE_MIN,
  WILDLIFE_SPAWN_RANGE_MAX,
  WILDLIFE_DESPAWN_RANGE,
  WILDLIFE_FLY_HEIGHT_MIN,
  WILDLIFE_FLY_HEIGHT_MAX,
} from '../../data/tuning';
import { VOXEL_SIZE, CHUNK_SIZE_Y } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';

// Seeded hash for consistent biome per world position
function getBiome(wx, wz) {
  // Use chunk-scale coords for biome consistency
  const cx = Math.floor(wx / 32);
  const cz = Math.floor(wz / 32);
  const hash = ((cx * 73856093) ^ (cz * 19349663)) >>> 0;
  const t = ((hash & 0xFF) / 255) * 2 - 1;
  const m = (((hash >> 8) & 0xFF) / 255) * 2 - 1;
  if (t < -0.3) return 'snow';
  if (t > 0.3 && m < -0.2) return 'desert';
  if (m > 0.3) return 'wetland';
  return (hash & 1) ? 'forest' : 'plains';
}

function getTerrainHeight(chunkManager, wx, wz) {
  if (!chunkManager) return null;
  for (let vy = CHUNK_SIZE_Y - 1; vy >= 0; vy--) {
    const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
    const block = chunkManager.getBlock(wx, worldY, wz);
    if (isSolid(block)) {
      return (vy + 1) * VOXEL_SIZE;
    }
  }
  return null;
}

let nextWildlifeId = 1;

export default function WildlifeTick({ chunkManager }) {
  const spawnTimer = useRef(0);
  const despawnTimer = useRef(0);

  useFrame((_, delta) => {
    if (!chunkManager) return;
    const store = useGameStore.getState();
    const playerPos = store.player.position;
    if (!playerPos) return;
    const px = playerPos[0];
    const pz = playerPos[2];

    // --- Despawn check every ~2 seconds ---
    despawnTimer.current += delta;
    if (despawnTimer.current >= 2) {
      despawnTimer.current = 0;
      const wildlife = store.wildlife;
      for (let i = wildlife.length - 1; i >= 0; i--) {
        const a = wildlife[i];
        const dx = a.position[0] - px;
        const dz = a.position[2] - pz;
        if (dx * dx + dz * dz > WILDLIFE_DESPAWN_RANGE * WILDLIFE_DESPAWN_RANGE) {
          store.removeWildlife(a.id);
        }
      }
    }

    // --- Spawn check every SPAWN_INTERVAL ---
    spawnTimer.current += delta;
    if (spawnTimer.current < WILDLIFE_SPAWN_INTERVAL) return;
    spawnTimer.current = 0;

    if (store.wildlife.length >= WILDLIFE_MAX_POPULATION) return;

    // Pick random position around player
    const angle = Math.random() * Math.PI * 2;
    const dist = WILDLIFE_SPAWN_RANGE_MIN + Math.random() * (WILDLIFE_SPAWN_RANGE_MAX - WILDLIFE_SPAWN_RANGE_MIN);
    const wx = px + Math.cos(angle) * dist;
    const wz = pz + Math.sin(angle) * dist;

    // Determine biome
    const biome = getBiome(wx, wz);

    // Filter types by biome
    const isNight = store.worldTime.isNight;
    const candidates = WILDLIFE_TYPE_KEYS.filter((key) => {
      const t = WILDLIFE_TYPES[key];
      // Biome match
      if (!t.biomes.includes('all') && !t.biomes.includes(biome)) return false;
      // Nocturnal filter: nocturnal animals only at night, diurnal anytime
      if (t.nocturnal && !isNight) return false;
      return true;
    });

    if (candidates.length === 0) return;

    // Pick random type
    const typeKey = candidates[Math.floor(Math.random() * candidates.length)];
    const typeDef = WILDLIFE_TYPES[typeKey];

    let spawnY;
    if (typeDef.ground) {
      // Ground animal: find terrain height
      const terrainY = getTerrainHeight(chunkManager, wx, wz);
      if (terrainY == null) return; // Chunk not loaded
      spawnY = terrainY;
    } else {
      // Flying animal: random altitude
      const terrainY = getTerrainHeight(chunkManager, wx, wz);
      const baseY = terrainY != null ? terrainY : 20;
      spawnY = baseY + WILDLIFE_FLY_HEIGHT_MIN + Math.random() * (WILDLIFE_FLY_HEIGHT_MAX - WILDLIFE_FLY_HEIGHT_MIN);
    }

    const id = `wildlife_${nextWildlifeId++}`;
    store.spawnWildlife({
      id,
      type: typeKey,
      position: [wx, spawnY, wz],
      spawnPosition: [wx, spawnY, wz],
      state: 'IDLE',
      wanderTimer: 0,
      targetPosition: null,
      alive: true,
    });
  });

  return null;
}
