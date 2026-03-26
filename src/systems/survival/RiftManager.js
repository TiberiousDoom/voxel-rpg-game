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
  RIFT_ANCHOR_HEALTH,
  RIFT_ANCHOR_ENEMY_DAMAGE,
  RIFT_CORRUPTION_FADE_SPEED,
  RIFT_FADE_PROXIMITY_RANGE,
  RIFT_FADE_MIN_SPEED_MULT,
  RIFT_WOUNDED_SPAWN_MULT,
  RIFT_CHAIN_REACTION_RANGE,
  RIFT_CHAIN_SPAWN_BOOST,
  RIFT_REINFORCEMENT_INTERVAL,
  RIFT_NPC_DEFENDER_SPEED_BONUS,
  RIFT_REINFORCEMENT_COUNT_BASE,
  RIFT_REINFORCEMENT_ESCALATION,
} from '../../data/tuning';

// Rift states
export const RiftState = {
  ACTIVE: 'ACTIVE',
  CLOSING: 'CLOSING',
  WOUNDED: 'WOUNDED',
  CLOSED: 'CLOSED',
};

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
      // Rift closing state
      state: RiftState.ACTIVE,
      anchorHealth: 0,
      corruptionProgress: 1.0, // 1.0 = full corruption, 0.0 = purified
      lastReinforcementTime: 0,
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
      // Skip closed rifts permanently
      if (rift.state === RiftState.CLOSED) continue;

      // Skip CLOSING rifts (no normal spawns while closing)
      if (rift.state === RiftState.CLOSING) continue;

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

      // WOUNDED rifts spawn slower
      if (rift.state === RiftState.WOUNDED) {
        interval /= RIFT_WOUNDED_SPAWN_MULT; // Double the interval (slower spawns)
      }

      // Chain reaction boost from nearby closing rift
      if (rift._chainBoost && rift._chainBoost > 1) {
        interval /= rift._chainBoost; // Faster spawns
      }

      // Check spawn interval
      if (now - rift.lastSpawnTime < interval) continue;

      // Spawn a monster — seed with rift index * large prime for good differentiation
      const riftIndex = parseInt(rift.id.split('-')[1], 10) || 0;
      const rand = mulberry32(this.seed * 31 + Math.floor(now * 100) + riftIndex * 7919);
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

  // ── Rift Closing System ────────────────────────────────────

  /**
   * Begin closing a rift. Called when player presses E near an empty rift.
   * Places a purification anchor and starts corruption fade.
   * @param {string} riftId
   * @param {number} now - worldTime.elapsed
   */
  beginClosing(riftId, now) {
    const rift = this.rifts.find(r => r.id === riftId);
    if (!rift || rift.state !== RiftState.ACTIVE) return false;
    if (rift.spawnedMonsterIds.length > 0) return false;

    rift.state = RiftState.CLOSING;
    rift.anchorHealth = RIFT_ANCHOR_HEALTH;
    rift.lastReinforcementTime = now;

    // Chain reaction: boost nearby active rifts
    for (const other of this.rifts) {
      if (other.id === riftId || other.state !== RiftState.ACTIVE) continue;
      const dx = other.x - rift.x;
      const dz = other.z - rift.z;
      if (Math.sqrt(dx * dx + dz * dz) < RIFT_CHAIN_REACTION_RANGE) {
        other._chainBoost = RIFT_CHAIN_SPAWN_BOOST;
      }
    }

    return true;
  }

  /**
   * Resume closing a wounded rift (player presses E again after anchor destroyed).
   * @param {string} riftId
   * @param {number} now
   */
  resumeClosing(riftId, now) {
    const rift = this.rifts.find(r => r.id === riftId);
    if (!rift || rift.state !== RiftState.WOUNDED) return false;
    if (rift.spawnedMonsterIds.length > 0) return false;

    rift.state = RiftState.CLOSING;
    rift.anchorHealth = RIFT_ANCHOR_HEALTH;
    rift.lastReinforcementTime = now;
    return true;
  }

  /**
   * Damage the anchor of a closing rift (called when enemy reaches anchor).
   * If anchor health reaches 0, rift enters WOUNDED state.
   * @param {string} riftId
   * @param {number} damage
   * @returns {{ destroyed: boolean }}
   */
  damageAnchor(riftId, damage = RIFT_ANCHOR_ENEMY_DAMAGE) {
    const rift = this.rifts.find(r => r.id === riftId);
    if (!rift || rift.state !== RiftState.CLOSING) return { destroyed: false };

    rift.anchorHealth = Math.max(0, rift.anchorHealth - damage);
    if (rift.anchorHealth <= 0) {
      rift.state = RiftState.WOUNDED;
      rift.anchorHealth = 0;
      return { destroyed: true };
    }
    return { destroyed: false };
  }

  /**
   * Mark a rift as permanently closed (called when corruption fully fades).
   * @param {string} riftId
   */
  closeRift(riftId) {
    const rift = this.rifts.find(r => r.id === riftId);
    if (!rift) return;
    rift.state = RiftState.CLOSED;
    rift.corruptionProgress = 0;
    rift.spawnedMonsterIds = [];
  }

  /**
   * Tick corruption fade for a closing rift.
   * @param {Object} rift
   * @param {number} delta - seconds
   * @param {number[]} playerPos
   * @param {number} npcDefenderCount - NPCs near the rift
   * @returns {number} New corruptionProgress (0.0 = fully purified)
   */
  tickCorruptionFade(rift, delta, playerPos, npcDefenderCount = 0) {
    if (rift.state !== RiftState.CLOSING) return rift.corruptionProgress;

    const dx = rift.x - playerPos[0];
    const dz = rift.z - playerPos[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Proximity-based speed: full speed within range, minimum speed beyond
    const proximityMult = dist < RIFT_FADE_PROXIMITY_RANGE
      ? 1.0
      : RIFT_FADE_MIN_SPEED_MULT;

    const npcBonus = npcDefenderCount * RIFT_NPC_DEFENDER_SPEED_BONUS;
    const fadeSpeed = RIFT_CORRUPTION_FADE_SPEED * (proximityMult + npcBonus);

    rift.corruptionProgress = Math.max(0, rift.corruptionProgress - fadeSpeed * delta);
    return rift.corruptionProgress;
  }

  /**
   * Get reinforcement spawn requests from nearby active rifts for a closing rift.
   * Escalates enemy types as corruption shrinks.
   * @param {Object} closingRift
   * @param {number} now
   * @returns {Array<{ riftId, position, monsterType, monsterData, targetPosition }>}
   */
  getReinforcementSpawns(closingRift, now) {
    if (closingRift.state !== RiftState.CLOSING) return [];
    if (now - closingRift.lastReinforcementTime < RIFT_REINFORCEMENT_INTERVAL) return [];

    closingRift.lastReinforcementTime = now;
    const spawns = [];

    // Find nearby active rifts to send reinforcements from
    const sources = this.rifts.filter(r => {
      if (r.id === closingRift.id) return false;
      if (r.state === RiftState.CLOSED) return false;
      const dx = r.x - closingRift.x;
      const dz = r.z - closingRift.z;
      return Math.sqrt(dx * dx + dz * dz) < RIFT_CHAIN_REACTION_RANGE;
    });

    if (sources.length === 0) return [];

    // Determine escalation tier based on corruption progress
    const progress = closingRift.corruptionProgress;
    let tierTypes;
    if (progress > 0.6) {
      tierTypes = ['slime', 'goblin']; // scouts
    } else if (progress > 0.3) {
      tierTypes = ['skeleton', 'goblin']; // soldiers
    } else {
      tierTypes = ['shadow', 'skeleton']; // elites
    }

    // Calculate wave size (escalates as corruption shrinks)
    const escalation = Math.floor((1 - progress) * RIFT_REINFORCEMENT_ESCALATION);
    const waveSize = RIFT_REINFORCEMENT_COUNT_BASE + escalation;

    // Pick a random source rift
    const source = sources[Math.floor(Math.random() * sources.length)];
    const rand = mulberry32(this.seed * 37 + Math.floor(now * 100));

    for (let i = 0; i < waveSize; i++) {
      const typeKey = tierTypes[Math.floor(rand() * tierTypes.length)];
      const template = MONSTER_TYPES[typeKey];
      if (!template) continue;

      // Spawn near the source rift
      const angle = rand() * Math.PI * 2;
      const radius = rand() * RIFT_SPAWN_RADIUS;
      const spawnX = source.x + Math.cos(angle) * radius;
      const spawnZ = source.z + Math.sin(angle) * radius;

      // Elites get +50% health/damage
      const isElite = progress < 0.3;
      const healthMult = isElite ? 1.5 : 1.0;
      const damageMult = isElite ? 1.5 : 1.0;

      const monsterId = `rift-reinforce-${this.nextMonsterId++}`;
      source.spawnedMonsterIds.push(monsterId);

      spawns.push({
        riftId: source.id,
        position: [spawnX, 12, spawnZ],
        monsterType: typeKey,
        monsterData: {
          id: monsterId,
          type: typeKey,
          name: isElite ? `Elite ${template.name}` : template.name,
          health: Math.round(template.health * healthMult),
          maxHealth: Math.round(template.health * healthMult),
          damage: Math.round(template.damage * damageMult),
          speed: template.speed,
          color: template.color,
          xp: Math.round(template.xp * (isElite ? 2 : 1)),
          isNocturnal: false,
        },
        // Reinforcements target the anchor, not the player
        targetPosition: [closingRift.x, 0, closingRift.z],
        sourceRiftId: source.id,
      });
    }

    return spawns;
  }

  /**
   * Get all rifts currently being closed.
   * @returns {Object[]}
   */
  getClosingRifts() {
    return this.rifts.filter(r => r.state === RiftState.CLOSING);
  }

  /**
   * Get rift positions for rendering (nearest N to player).
   */
  getNearestRifts(playerPos, maxCount = 3) {
    return this.rifts
      .filter(r => r.state !== RiftState.CLOSED)
      .map((r) => {
        const dx = r.x - playerPos[0];
        const dz = r.z - playerPos[2];
        return {
          id: r.id, x: r.x, z: r.z,
          state: r.state,
          corruptionProgress: r.corruptionProgress,
          anchorHealth: r.anchorHealth,
          spawnedMonsterCount: r.spawnedMonsterIds.length,
          distance: Math.sqrt(dx * dx + dz * dz),
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxCount);
  }
}
