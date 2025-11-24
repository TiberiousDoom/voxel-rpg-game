/**
 * NoiseGenerator.js - Procedural Noise Generation for Terrain
 *
 * Implements Perlin and Simplex noise algorithms for procedural terrain generation.
 * Supports multi-octave noise for realistic terrain features.
 *
 * Part of Phase 1: Core Terrain Generation System
 *
 * Usage:
 *   const generator = new NoiseGenerator(seed);
 *   const height = generator.perlin2D(x, z, {octaves: 4, scale: 0.02});
 *   const biome = generator.simplex2D(x, z, {octaves: 3, scale: 0.01});
 */

export class NoiseGenerator {
  /**
   * Create a noise generator with a specific seed
   * @param {number} seed - Random seed for deterministic generation (same seed = same terrain)
   */
  constructor(seed = 12345) {
    this.seed = seed;
    this.permutation = this.generatePermutationTable(seed);

    // Gradient vectors for Perlin noise (unit vectors in 8 directions)
    this.gradients2D = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [0, 1], [0, -1]
    ];

    // Simplex noise constants
    this.F2 = 0.5 * (Math.sqrt(3.0) - 1.0);  // Skew factor
    this.G2 = (3.0 - Math.sqrt(3.0)) / 6.0;  // Unskew factor
  }

  /**
   * Generate permutation table from seed for deterministic randomness
   * @param {number} seed
   * @returns {Uint8Array} 512-length permutation table
   */
  generatePermutationTable(seed) {
    // Create base permutation array (0-255)
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Seeded shuffle using Linear Congruential Generator
    let random = seed;
    for (let i = 255; i > 0; i--) {
      random = (random * 1103515245 + 12345) & 0x7fffffff;
      const j = random % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }

    // Duplicate to avoid buffer overflow (512 length)
    const permutation = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      permutation[i] = p[i & 255];
    }

    return permutation;
  }

  /**
   * 2D Perlin Noise
   * Classic gradient noise algorithm by Ken Perlin
   *
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @param {object} options - Generation options
   * @param {number} options.octaves - Number of octaves (layers of detail) [default: 1]
   * @param {number} options.persistence - Amplitude multiplier per octave [default: 0.5]
   * @param {number} options.lacunarity - Frequency multiplier per octave [default: 2.0]
   * @param {number} options.scale - Overall feature scale (lower = larger features) [default: 1.0]
   * @returns {number} Noise value in range [-1, 1]
   */
  perlin2D(x, z, options = {}) {
    const {
      octaves = 1,
      persistence = 0.5,
      lacunarity = 2.0,
      scale = 1.0
    } = options;

    // Single octave case (fast path)
    if (octaves === 1) {
      return this.perlin2DBase(x * scale, z * scale);
    }

    // Multi-octave fractal noise
    let total = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0; // Normalization factor

    for (let i = 0; i < octaves; i++) {
      total += this.perlin2DBase(x * frequency, z * frequency) * amplitude;
      maxValue += amplitude;

      amplitude *= persistence;
      frequency *= lacunarity;
    }

    // Normalize to [-1, 1]
    return total / maxValue;
  }

  /**
   * Alias for perlin2D - provides a simpler API
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @param {object} options - Generation options (same as perlin2D)
   * @returns {number} Noise value in range [-1, 1]
   */
  noise2D(x, z, options = {}) {
    return this.perlin2D(x, z, options);
  }

  /**
   * Base Perlin noise function (single octave)
   * @private
   */
  perlin2DBase(x, z) {
    // Find grid cell coordinates
    const X = Math.floor(x) & 255;
    const Z = Math.floor(z) & 255;

    // Relative position within cell (0-1)
    const xf = x - Math.floor(x);
    const zf = z - Math.floor(z);

    // Fade curves for smooth interpolation (6t^5 - 15t^4 + 10t^3)
    const u = this.fade(xf);
    const v = this.fade(zf);

    // Hash coordinates of the 4 cube corners
    const aa = this.permutation[this.permutation[X] + Z];
    const ab = this.permutation[this.permutation[X] + Z + 1];
    const ba = this.permutation[this.permutation[X + 1] + Z];
    const bb = this.permutation[this.permutation[X + 1] + Z + 1];

    // Calculate gradients at corners
    const g00 = this.gradient2D(aa, xf, zf);
    const g10 = this.gradient2D(ba, xf - 1, zf);
    const g01 = this.gradient2D(ab, xf, zf - 1);
    const g11 = this.gradient2D(bb, xf - 1, zf - 1);

    // Bilinear interpolation
    const x1 = this.lerp(g00, g10, u);
    const x2 = this.lerp(g01, g11, u);
    return this.lerp(x1, x2, v);
  }

  /**
   * 2D Simplex Noise
   * Improved noise algorithm by Ken Perlin (faster than Perlin, fewer artifacts)
   *
   * @param {number} x - X coordinate
   * @param {number} z - Z coordinate
   * @param {object} options - Generation options (same as perlin2D)
   * @returns {number} Noise value in range [-1, 1]
   */
  simplex2D(x, z, options = {}) {
    const {
      octaves = 1,
      persistence = 0.5,
      lacunarity = 2.0,
      scale = 1.0
    } = options;

    // Single octave case (fast path)
    if (octaves === 1) {
      return this.simplex2DBase(x * scale, z * scale);
    }

    // Multi-octave fractal noise
    let total = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.simplex2DBase(x * frequency, z * frequency) * amplitude;
      maxValue += amplitude;

      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  /**
   * Base Simplex noise function (single octave)
   * @private
   */
  simplex2DBase(xin, zin) {
    // Skew input space to determine simplex cell
    const s = (xin + zin) * this.F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(zin + s);

    // Unskew cell origin back to (x,z) space
    const t = (i + j) * this.G2;
    const X0 = i - t;
    const Z0 = j - t;
    const x0 = xin - X0;
    const z0 = zin - Z0;

    // Determine which simplex we're in (lower or upper triangle)
    let i1, j1;
    if (x0 > z0) {
      i1 = 1; j1 = 0; // Lower triangle
    } else {
      i1 = 0; j1 = 1; // Upper triangle
    }

    // Offsets for middle and last corners
    const x1 = x0 - i1 + this.G2;
    const z1 = z0 - j1 + this.G2;
    const x2 = x0 - 1.0 + 2.0 * this.G2;
    const z2 = z0 - 1.0 + 2.0 * this.G2;

    // Work out hashed gradient indices
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permutation[ii + this.permutation[jj]] % 8;
    const gi1 = this.permutation[ii + i1 + this.permutation[jj + j1]] % 8;
    const gi2 = this.permutation[ii + 1 + this.permutation[jj + 1]] % 8;

    // Calculate contribution from three corners
    let n0 = 0, n1 = 0, n2 = 0;

    // First corner
    let t0 = 0.5 - x0 * x0 - z0 * z0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot2D(this.gradients2D[gi0], x0, z0);
    }

    // Second corner
    let t1 = 0.5 - x1 * x1 - z1 * z1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot2D(this.gradients2D[gi1], x1, z1);
    }

    // Third corner
    let t2 = 0.5 - x2 * x2 - z2 * z2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot2D(this.gradients2D[gi2], x2, z2);
    }

    // Sum contributions and scale to [-1, 1]
    return 70.0 * (n0 + n1 + n2);
  }

  /**
   * Generate height value normalized to [0, 1]
   * Convenience method for terrain height generation
   *
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @param {object} options - Noise options
   * @param {string} options.type - 'perlin' or 'simplex' [default: 'perlin']
   * @returns {number} Height value in range [0, 1]
   */
  height(x, z, options = {}) {
    const { type = 'perlin', ...noiseOptions } = options;

    let value;
    if (type === 'simplex') {
      value = this.simplex2D(x, z, noiseOptions);
    } else {
      value = this.perlin2D(x, z, noiseOptions);
    }

    // Convert from [-1, 1] to [0, 1]
    return (value + 1) * 0.5;
  }

  /**
   * Generate moisture value (for biome determination)
   * Uses different frequency than height for variety
   *
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {number} Moisture value in range [0, 1]
   */
  moisture(x, z) {
    return this.height(x, z, {
      type: 'simplex',
      octaves: 3,
      scale: 0.015, // Slightly different scale than terrain
      persistence: 0.6
    });
  }

  /**
   * Generate temperature value (for biome determination)
   * @param {number} x - World X coordinate
   * @param {number} z - World Z coordinate
   * @returns {number} Temperature value in range [0, 1]
   */
  temperature(x, z) {
    return this.height(x, z, {
      type: 'simplex',
      octaves: 2,
      scale: 0.008, // Large-scale temperature zones
      persistence: 0.5
    });
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Fade function for smooth interpolation (Perlin's improved version)
   * f(t) = 6t^5 - 15t^4 + 10t^3
   * @private
   */
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * Linear interpolation
   * @private
   */
  lerp(a, b, t) {
    return a + t * (b - a);
  }

  /**
   * Gradient dot product for Perlin noise
   * @private
   */
  gradient2D(hash, x, z) {
    const h = hash & 7; // Convert to 0-7
    const grad = this.gradients2D[h];
    return grad[0] * x + grad[1] * z;
  }

  /**
   * Dot product for Simplex noise
   * @private
   */
  dot2D(grad, x, z) {
    return grad[0] * x + grad[1] * z;
  }

  /**
   * Export generator state for saving
   * @returns {object}
   */
  toJSON() {
    return {
      seed: this.seed
    };
  }

  /**
   * Restore generator from saved state
   * @param {object} data
   * @returns {NoiseGenerator}
   */
  static fromJSON(data) {
    return new NoiseGenerator(data.seed);
  }
}

/**
 * Preset configurations for common use cases
 */
export const NoisePresets = {
  // Terrain height (large-scale features)
  TERRAIN_HEIGHT: {
    type: 'perlin',
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2.0,
    scale: 0.02
  },

  // Detail layer (small-scale variation)
  TERRAIN_DETAIL: {
    type: 'perlin',
    octaves: 3,
    persistence: 0.4,
    lacunarity: 2.5,
    scale: 0.08
  },

  // Biome regions (very large-scale)
  BIOME_REGIONS: {
    type: 'simplex',
    octaves: 3,
    persistence: 0.6,
    lacunarity: 2.0,
    scale: 0.01
  },

  // Resource distribution
  RESOURCE_CLUSTERS: {
    type: 'simplex',
    octaves: 2,
    persistence: 0.5,
    lacunarity: 2.0,
    scale: 0.05
  },

  // Smooth variation (for moisture/temperature)
  SMOOTH_VARIATION: {
    type: 'simplex',
    octaves: 2,
    persistence: 0.5,
    lacunarity: 2.0,
    scale: 0.015
  }
};
