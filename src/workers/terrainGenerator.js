/**
 * Terrain Generator - Procedural terrain generation
 *
 * Uses simplex noise to generate natural-looking terrain with:
 * - Height variation
 * - Multiple biomes
 * - Ore distribution
 * - Cave systems (TODO)
 */

// Constants - must match coordinates.js
const CHUNK_SIZE = 16;
const CHUNK_SIZE_Y = 16;

// Block types - must match blockTypes.js
const BlockTypes = {
  AIR: 0,
  STONE: 1,
  DIRT: 2,
  GRASS: 3,
  SAND: 4,
  WATER: 5,
  WOOD: 6,
  LEAVES: 7,
  BEDROCK: 8,
  GRAVEL: 9,
  COAL_ORE: 10,
  IRON_ORE: 11,
  GOLD_ORE: 12,
  CLAY: 13,
  SNOW: 14,
  ICE: 15,
};

/**
 * Simple seeded random number generator
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Simplex-like noise (simplified Perlin-ish noise)
 * Good enough for terrain, fast to compute
 */
class SimplexNoise {
  constructor(seed) {
    this.seed = seed;
    this.permutation = this.buildPermutation(seed);
  }

  buildPermutation(seed) {
    const perm = new Uint8Array(512);
    const random = new SeededRandom(seed);

    // Create initial permutation
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;

    // Shuffle
    for (let i = 255; i > 0; i--) {
      const j = random.nextInt(0, i);
      [p[i], p[j]] = [p[j], p[i]];
    }

    // Duplicate for overflow
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
    }

    return perm;
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(a, b, t) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  noise2D(x, y) {
    const perm = this.permutation;

    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const A = perm[X] + Y;
    const B = perm[X + 1] + Y;

    return this.lerp(
      this.lerp(this.grad(perm[A], x, y), this.grad(perm[B], x - 1, y), u),
      this.lerp(this.grad(perm[A + 1], x, y - 1), this.grad(perm[B + 1], x - 1, y - 1), u),
      v
    );
  }

  /**
   * Fractal brownian motion - multiple octaves of noise
   */
  fbm(x, y, octaves = 4, lacunarity = 2, persistence = 0.5) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }
}

/**
 * Generate terrain for a chunk
 * @param {Object} params
 * @param {number} params.chunkX - Chunk X coordinate
 * @param {number} params.chunkZ - Chunk Z coordinate
 * @param {number} params.seed - World seed
 * @returns {Object} Generated terrain data
 */
export function generateTerrain(params) {
  const { chunkX, chunkZ, seed } = params;

  const noise = new SimplexNoise(seed);
  const random = new SeededRandom(seed + chunkX * 31337 + chunkZ * 7919);

  const blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE_Y);

  // Base terrain parameters
  const seaLevel = 6;
  const baseHeight = 8;
  const heightVariation = 6;

  for (let x = 0; x < CHUNK_SIZE; x++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      const worldX = chunkX * CHUNK_SIZE + x;
      const worldZ = chunkZ * CHUNK_SIZE + z;

      // Generate height using multiple octaves
      const heightNoise = noise.fbm(worldX * 0.02, worldZ * 0.02, 4, 2, 0.5);
      const height = Math.floor(baseHeight + heightNoise * heightVariation);

      // Biome determination (simple temperature/moisture)
      const temperature = noise.fbm(worldX * 0.005 + 1000, worldZ * 0.005, 2);
      const moisture = noise.fbm(worldX * 0.005 + 2000, worldZ * 0.005 + 1000, 2);

      // Determine surface block based on biome
      let surfaceBlock = BlockTypes.GRASS;
      let subsurfaceBlock = BlockTypes.DIRT;

      if (temperature < -0.3) {
        // Cold biome
        surfaceBlock = BlockTypes.SNOW;
      } else if (temperature > 0.3 && moisture < -0.2) {
        // Desert
        surfaceBlock = BlockTypes.SAND;
        subsurfaceBlock = BlockTypes.SAND;
      } else if (moisture > 0.3) {
        // Wet areas near water
        if (height <= seaLevel + 1) {
          surfaceBlock = BlockTypes.CLAY;
        }
      }

      // Fill column
      for (let y = 0; y < CHUNK_SIZE_Y; y++) {
        const index = x + (z << 4) + (y << 8);
        let blockType = BlockTypes.AIR;

        if (y === 0) {
          // Bedrock at bottom
          blockType = BlockTypes.BEDROCK;
        } else if (y < height - 4) {
          // Deep stone
          blockType = BlockTypes.STONE;

          // Ore generation
          const oreNoise = noise.noise2D(worldX * 0.1 + y * 0.1, worldZ * 0.1);
          if (y < 8 && oreNoise > 0.7 && random.next() < 0.3) {
            // Gold ore (deep only)
            blockType = BlockTypes.GOLD_ORE;
          } else if (y < 12 && oreNoise > 0.6 && random.next() < 0.4) {
            // Iron ore
            blockType = BlockTypes.IRON_ORE;
          } else if (oreNoise > 0.5 && random.next() < 0.5) {
            // Coal ore (any depth)
            blockType = BlockTypes.COAL_ORE;
          }
        } else if (y < height) {
          // Subsurface (dirt/sand)
          blockType = subsurfaceBlock;
        } else if (y === height) {
          // Surface block
          blockType = surfaceBlock;
        } else if (y <= seaLevel && height < seaLevel) {
          // Water
          blockType = BlockTypes.WATER;
        }

        blocks[index] = blockType;
      }

      // Tree generation (simple)
      if (surfaceBlock === BlockTypes.GRASS &&
          height > seaLevel &&
          height < CHUNK_SIZE_Y - 5 &&
          random.next() < 0.02) {
        generateTree(blocks, x, height + 1, z, random);
      }
    }
  }

  return {
    blocks,
    chunkX,
    chunkZ,
  };
}

/**
 * Generate a simple tree
 */
function generateTree(blocks, x, baseY, z, random) {
  const trunkHeight = random.nextInt(3, 5);

  // Check bounds
  if (baseY + trunkHeight + 2 >= CHUNK_SIZE_Y) return;
  if (x < 2 || x >= CHUNK_SIZE - 2 || z < 2 || z >= CHUNK_SIZE - 2) return;

  // Trunk
  for (let y = 0; y < trunkHeight; y++) {
    const index = x + (z << 4) + ((baseY + y) << 8);
    blocks[index] = BlockTypes.WOOD;
  }

  // Leaves (simple sphere-ish shape)
  const leafY = baseY + trunkHeight;
  for (let dy = 0; dy <= 2; dy++) {
    const radius = dy === 2 ? 1 : 2;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const lx = x + dx;
        const ly = leafY + dy;
        const lz = z + dz;

        if (lx >= 0 && lx < CHUNK_SIZE &&
            ly >= 0 && ly < CHUNK_SIZE_Y &&
            lz >= 0 && lz < CHUNK_SIZE) {
          const dist = Math.abs(dx) + Math.abs(dz);
          if (dist <= radius && random.next() > 0.2) {
            const index = lx + (lz << 4) + (ly << 8);
            if (blocks[index] === BlockTypes.AIR) {
              blocks[index] = BlockTypes.LEAVES;
            }
          }
        }
      }
    }
  }
}

export default generateTerrain;
