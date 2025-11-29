/**
 * NoiseGenerator - Procedural noise functions for world generation
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md - Phase 1 World Generation:
 * - Perlin noise for height maps (4 octaves, scale 0.01)
 * - Simplex noise for moisture (3 octaves, scale 0.015)
 */

// ============================================================================
// Noise Configuration
// ============================================================================

export interface NoiseConfig {
  seed: number;
  octaves: number;
  scale: number;
  persistence: number;  // Amplitude reduction per octave (0-1)
  lacunarity: number;   // Frequency multiplier per octave
}

const DEFAULT_PERLIN_CONFIG: NoiseConfig = {
  seed: 12345,
  octaves: 4,
  scale: 0.01,
  persistence: 0.5,
  lacunarity: 2.0,
};

const DEFAULT_SIMPLEX_CONFIG: NoiseConfig = {
  seed: 54321,
  octaves: 3,
  scale: 0.015,
  persistence: 0.5,
  lacunarity: 2.0,
};

// ============================================================================
// Permutation Table (for reproducible noise)
// ============================================================================

function createPermutationTable(seed: number): Uint8Array {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);

  // Initialize with values 0-255
  for (let i = 0; i < 256; i++) {
    p[i] = i;
  }

  // Shuffle using seed
  let n = seed;
  for (let i = 255; i > 0; i--) {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    const j = n % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }

  // Duplicate for wrapping
  for (let i = 0; i < 256; i++) {
    perm[i] = p[i];
    perm[i + 256] = p[i];
  }

  return perm;
}

// ============================================================================
// Gradient Vectors
// ============================================================================

const GRAD3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

// ============================================================================
// NoiseGenerator Implementation
// ============================================================================

export class NoiseGenerator {
  private perm: Uint8Array;
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
    this.perm = createPermutationTable(seed);
  }

  /**
   * Get the seed used for this generator
   */
  public getSeed(): number {
    return this.seed;
  }

  /**
   * Reseed the generator
   */
  public reseed(seed: number): void {
    this.seed = seed;
    this.perm = createPermutationTable(seed);
  }

  // ==========================================================================
  // Perlin Noise
  // ==========================================================================

  /**
   * 2D Perlin noise at a single point
   * Returns value in range [-1, 1]
   */
  public perlin2D(x: number, y: number): number {
    // Find unit grid cell
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    // Relative position in cell
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    // Fade curves
    const u = this.fade(xf);
    const v = this.fade(yf);

    // Hash coordinates of the 4 corners
    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    // Gradient values at corners
    const gradAA = this.grad2D(aa, xf, yf);
    const gradBA = this.grad2D(ba, xf - 1, yf);
    const gradAB = this.grad2D(ab, xf, yf - 1);
    const gradBB = this.grad2D(bb, xf - 1, yf - 1);

    // Interpolate
    const x1 = this.lerp(gradAA, gradBA, u);
    const x2 = this.lerp(gradAB, gradBB, u);

    return this.lerp(x1, x2, v);
  }

  /**
   * Fractal Brownian Motion using Perlin noise
   * Returns value in range [0, 1]
   */
  public perlinFBM(
    x: number,
    y: number,
    config: Partial<NoiseConfig> = {}
  ): number {
    const { octaves, scale, persistence, lacunarity } = {
      ...DEFAULT_PERLIN_CONFIG,
      ...config,
    };

    let total = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.perlin2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    // Normalize to [0, 1]
    return (total / maxValue + 1) / 2;
  }

  // ==========================================================================
  // Simplex Noise
  // ==========================================================================

  /**
   * 2D Simplex noise at a single point
   * Returns value in range [-1, 1]
   */
  public simplex2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    // Skew input space
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    // Unskew cell origin
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    // Determine which simplex we're in
    let i1: number, j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    // Offsets for corners
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    // Hash indices
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

    // Calculate contributions
    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot2D(GRAD3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot2D(GRAD3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot2D(GRAD3[gi2], x2, y2);
    }

    // Scale to [-1, 1]
    return 70 * (n0 + n1 + n2);
  }

  /**
   * Fractal Brownian Motion using Simplex noise
   * Returns value in range [0, 1]
   */
  public simplexFBM(
    x: number,
    y: number,
    config: Partial<NoiseConfig> = {}
  ): number {
    const { octaves, scale, persistence, lacunarity } = {
      ...DEFAULT_SIMPLEX_CONFIG,
      ...config,
    };

    let total = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.simplex2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    // Normalize to [0, 1]
    return (total / maxValue + 1) / 2;
  }

  // ==========================================================================
  // Voronoi Noise (for biome regions)
  // ==========================================================================

  /**
   * 2D Voronoi noise (cellular noise)
   * Returns the distance to nearest cell point, normalized to [0, 1]
   */
  public voronoi2D(x: number, y: number, scale: number = 0.005): number {
    const sx = x * scale;
    const sy = y * scale;

    const cellX = Math.floor(sx);
    const cellY = Math.floor(sy);

    let minDist = 10;

    // Check neighboring cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighborX = cellX + dx;
        const neighborY = cellY + dy;

        // Get reproducible random point in this cell
        const hash = this.perm[(neighborX & 255) + this.perm[neighborY & 255]];
        const px = neighborX + (hash / 256);
        const py = neighborY + ((hash * 7) % 256) / 256;

        // Calculate distance
        const distX = sx - px;
        const distY = sy - py;
        const dist = Math.sqrt(distX * distX + distY * distY);

        if (dist < minDist) {
          minDist = dist;
        }
      }
    }

    // Normalize to [0, 1]
    return Math.min(minDist / 1.5, 1);
  }

  /**
   * Get the cell ID for Voronoi (useful for biome assignment)
   * Returns a stable ID for the cell containing this point
   */
  public voronoiCellId(x: number, y: number, scale: number = 0.005): number {
    const sx = x * scale;
    const sy = y * scale;

    const cellX = Math.floor(sx);
    const cellY = Math.floor(sy);

    let minDist = 10;
    let closestHash = 0;

    // Check neighboring cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighborX = cellX + dx;
        const neighborY = cellY + dy;

        const hash = this.perm[(neighborX & 255) + this.perm[neighborY & 255]];
        const px = neighborX + (hash / 256);
        const py = neighborY + ((hash * 7) % 256) / 256;

        const distX = sx - px;
        const distY = sy - py;
        const dist = Math.sqrt(distX * distX + distY * distY);

        if (dist < minDist) {
          minDist = dist;
          closestHash = (neighborX * 73856093) ^ (neighborY * 19349663);
        }
      }
    }

    return Math.abs(closestHash);
  }

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad2D(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private dot2D(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }
}

// ============================================================================
// Default Noise Configurations (per spec)
// ============================================================================

export const NOISE_CONFIGS = {
  height: {
    octaves: 4,
    scale: 0.01,
    persistence: 0.5,
    lacunarity: 2.0,
  },
  moisture: {
    octaves: 3,
    scale: 0.015,
    persistence: 0.5,
    lacunarity: 2.0,
  },
  temperature: {
    octaves: 2,
    scale: 0.008,
    persistence: 0.6,
    lacunarity: 2.0,
  },
};
