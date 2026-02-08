/**
 * RiftManager.js — Deterministic rift placement + dynamic monster spawning
 *
 * Rifts are tear-like portals that spawn monsters. They are placed
 * deterministically based on world seed, and become more active at night.
 */

import {
  RIFT_DENSITY,
  RIFT_MIN_SPAWN_DISTANCE,
  RIFT_MIN_SEPARATION,
  RIFT_SPAWN_RADIUS,
  RIFT_SPAWN_INTERVAL_DAY,
  RIFT_SPAWN_INTERVAL_DUSK,
  RIFT_SPAWN_INTERVAL_NIGHT,
  RIFT_POP_CAP_DAY,
  RIFT_POP_CAP_NIGHT,
  RIFT_ACTIVE_RANGE,
  RIFT_NOCTURNAL_DAMAGE_MULT,
  RIFT_NOCTURNAL_SPEED_MULT,
} from '../../data/tuning';

// Simple seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONSTER_TYPES = {
  slime: { name: 'Slime', health: 40, damage: 5, speed: 1.5, color: '#44cc44', xp: 20, nocturnalOnly: false },
  goblin: { name: 'Goblin', health: 60, damage: 8, speed: 2.5, color: '#88aa44', xp: 30, nocturnalOnly: false },
  skeleton: { name: 'Skeleton', health: 80, damage: 12, speed: 2.0, color: '#cccccc', xp: 45, nocturnalOnly: true },
  shadow: { name: 'Shadow Creeper', health: 50, damage: 15, speed: 3.0, color: '#442266', xp: 50, nocturnalOnly: true },
};

// Spawn weights: [type, weight]
const SPAWN_TABLE_DAY = [
  ['slime', 60],
  ['goblin', 40],
];

const SPAWN_TABLE_NIGHT = [
  ['slime', 25],
  ['goblin', 20],
  ['skeleton', 30],
  ['shadow', 25],
];

function pickFromTable(table, rand) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let roll = rand() * total;
  for (const [type, weight] of table) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return table[0][0];
}

export class RiftManager {
  constructor(seed, playerSpawnPos = [0, 0, 0]) {
    this.seed = seed;
    this.playerSpawnPos = playerSpawnPos;
    this.rifts = [];
    this.nextMonsterId = 1;
    this._generateRifts();
  }

  _generateRifts() {
    const rand = mulberry32(this.seed);
    const CHUNK_SIZE = 32; // world units per chunk (16 blocks * 2 voxel size)
    const GRID_RANGE = 8; // Generate rifts in an 8-chunk radius

    const candidates = [];

    for (let cx = -GRID_RANGE; cx <= GRID_RANGE; cx++) {
      for (let cz = -GRID_RANGE; cz <= GRID_RANGE; cz++) {
        // Use density as probability per chunk
        if (rand() > RIFT_DENSITY) continue;

        const x = cx * CHUNK_SIZE + rand() * CHUNK_SIZE;
        const z = cz * CHUNK_SIZE + rand() * CHUNK_SIZE;

        // Check min distance from player spawn
        const dx = x - this.playerSpawnPos[0];
        const dz = z - this.playerSpawnPos[2];
        if (Math.sqrt(dx * dx + dz * dz) < RIFT_MIN_SPAWN_DISTANCE) continue;

        candidates.push({ x, z });
      }
    }

    // Filter by minimum separation
    const accepted = [];
    for (const c of candidates) {
      let tooClose = false;
      for (const a of accepted) {
        const dx = c.x - a.x;
        const dz = c.z - a.z;
        if (Math.sqrt(dx * dx + dz * dz) < RIFT_MIN_SEPARATION) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) accepted.push(c);
    }

    this.rifts = accepted.map((pos, i) => ({
      id: `rift-${i}`,
      x: pos.x,
      z: pos.z,
      spawnedMonsterIds: [],
      lastSpawnTime: 0,
      isDormant: false,
      dormantUntil: 0,
    }));
  }

  /**
   * Update rifts and return spawn requests.
   * @param {number} now - Current time in seconds (elapsed)
   * @param {number[]} playerPos - [x, y, z]
   * @param {{ period: string, isNight: boolean }} worldTime
   * @param {Set<string>} aliveMonsterIds - Set of currently alive monster IDs
   * @returns {Array<{ riftId, position, monsterType, monsterData }>}
   */
  update(now, playerPos, worldTime, aliveMonsterIds) {
    const spawnRequests = [];

    for (const rift of this.rifts) {
      // Skip dormant rifts
      if (rift.isDormant && now < rift.dormantUntil) continue;
      if (rift.isDormant) rift.isDormant = false;

      // Check distance to player
      const dx = rift.x - playerPos[0];
      const dz = rift.z - playerPos[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > RIFT_ACTIVE_RANGE) continue;

      // Clean dead monsters from rift tracking
      rift.spawnedMonsterIds = rift.spawnedMonsterIds.filter((id) => aliveMonsterIds.has(id));

      // Determine spawn interval and pop cap
      const { period, isNight } = worldTime;
      let interval, popCap;
      if (isNight) {
        interval = RIFT_SPAWN_INTERVAL_NIGHT;
        popCap = RIFT_POP_CAP_NIGHT;
      } else if (period === 'dusk' || period === 'dawn') {
        interval = RIFT_SPAWN_INTERVAL_DUSK;
        popCap = Math.ceil((RIFT_POP_CAP_DAY + RIFT_POP_CAP_NIGHT) / 2);
      } else {
        interval = RIFT_SPAWN_INTERVAL_DAY;
        popCap = RIFT_POP_CAP_DAY;
      }

      // Check pop cap
      if (rift.spawnedMonsterIds.length >= popCap) continue;

      // Check spawn interval
      if (now - rift.lastSpawnTime < interval) continue;

      // Spawn a monster
      const rand = mulberry32(this.seed + Math.floor(now * 1000) + rift.id.charCodeAt(5));
      const table = isNight ? SPAWN_TABLE_NIGHT : SPAWN_TABLE_DAY;
      const monsterTypeKey = pickFromTable(table, rand);
      const template = MONSTER_TYPES[monsterTypeKey];

      // Apply nocturnal buffs
      const isNocturnal = isNight && template.nocturnalOnly;
      const damage = isNocturnal ? Math.round(template.damage * RIFT_NOCTURNAL_DAMAGE_MULT) : template.damage;
      const speed = isNocturnal ? template.speed * RIFT_NOCTURNAL_SPEED_MULT : template.speed;

      // Random position within spawn radius
      const angle = rand() * Math.PI * 2;
      const radius = rand() * RIFT_SPAWN_RADIUS;
      const spawnX = rift.x + Math.cos(angle) * radius;
      const spawnZ = rift.z + Math.sin(angle) * radius;

      const monsterId = `rift-mob-${this.nextMonsterId++}`;

      rift.spawnedMonsterIds.push(monsterId);
      rift.lastSpawnTime = now;

      spawnRequests.push({
        riftId: rift.id,
        position: [spawnX, 12, spawnZ], // Spawn above terrain, physics will drop it
        monsterType: monsterTypeKey,
        monsterData: {
          id: monsterId,
          type: monsterTypeKey,
          name: template.name,
          health: template.health,
          maxHealth: template.health,
          damage,
          speed,
          color: template.color,
          xp: template.xp,
          isNocturnal,
        },
      });
    }

    return spawnRequests;
  }

  /**
   * Get rift positions for rendering (nearest N to player).
   */
  getNearestRifts(playerPos, maxCount = 3) {
    return this.rifts
      .map((r) => {
        const dx = r.x - playerPos[0];
        const dz = r.z - playerPos[2];
        return { ...r, distance: Math.sqrt(dx * dx + dz * dz) };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxCount);
  }
}
