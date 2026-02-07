/**
 * PoolManager - Object pooling for frequently allocated objects
 *
 * Reduces garbage collection overhead by reusing objects.
 * Particularly important for:
 * - Vector3 (position, direction calculations)
 * - Matrix4 (transform calculations)
 * - Color (rendering)
 * - Arrays (mesh building)
 */

import * as THREE from 'three';

/**
 * Generic object pool
 */
class ObjectPool {
  constructor(factory, reset, initialSize = 10) {
    this.factory = factory;
    this.reset = reset;
    this.pool = [];
    this.active = 0;

    // Pre-allocate
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }

  acquire() {
    this.active++;
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return this.factory();
  }

  release(obj) {
    this.active--;
    this.reset(obj);
    this.pool.push(obj);
  }

  get size() {
    return this.pool.length;
  }

  get activeCount() {
    return this.active;
  }

  clear() {
    this.pool = [];
    this.active = 0;
  }
}

/**
 * Specialized Vector3 pool
 */
class Vector3Pool extends ObjectPool {
  constructor(initialSize = 50) {
    super(
      () => new THREE.Vector3(),
      (v) => v.set(0, 0, 0),
      initialSize
    );
  }

  acquire(x = 0, y = 0, z = 0) {
    const v = super.acquire();
    return v.set(x, y, z);
  }
}

/**
 * Specialized Matrix4 pool
 */
class Matrix4Pool extends ObjectPool {
  constructor(initialSize = 20) {
    super(
      () => new THREE.Matrix4(),
      (m) => m.identity(),
      initialSize
    );
  }
}

/**
 * Specialized Color pool
 */
class ColorPool extends ObjectPool {
  constructor(initialSize = 30) {
    super(
      () => new THREE.Color(),
      (c) => c.setRGB(0, 0, 0),
      initialSize
    );
  }

  acquire(r = 0, g = 0, b = 0) {
    const c = super.acquire();
    if (typeof r === 'string') {
      return c.set(r);
    }
    return c.setRGB(r, g, b);
  }
}

/**
 * Float32Array pool for mesh building
 */
class Float32ArrayPool {
  constructor() {
    this.pools = new Map(); // size -> array of buffers
  }

  acquire(size) {
    const roundedSize = this._roundSize(size);
    let pool = this.pools.get(roundedSize);

    if (!pool) {
      pool = [];
      this.pools.set(roundedSize, pool);
    }

    if (pool.length > 0) {
      return pool.pop();
    }

    return new Float32Array(roundedSize);
  }

  release(arr) {
    if (!arr) return;
    const size = arr.length;
    let pool = this.pools.get(size);

    if (!pool) {
      pool = [];
      this.pools.set(size, pool);
    }

    // Zero out for reuse
    arr.fill(0);
    pool.push(arr);
  }

  _roundSize(size) {
    // Round up to power of 2 for efficient pooling
    let v = size;
    v--;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v++;
    return Math.max(v, 256); // Minimum size 256
  }

  clear() {
    this.pools.clear();
  }
}

/**
 * Uint32Array pool for indices
 */
class Uint32ArrayPool {
  constructor() {
    this.pools = new Map();
  }

  acquire(size) {
    const roundedSize = this._roundSize(size);
    let pool = this.pools.get(roundedSize);

    if (!pool) {
      pool = [];
      this.pools.set(roundedSize, pool);
    }

    if (pool.length > 0) {
      return pool.pop();
    }

    return new Uint32Array(roundedSize);
  }

  release(arr) {
    if (!arr) return;
    const size = arr.length;
    let pool = this.pools.get(size);

    if (!pool) {
      pool = [];
      this.pools.set(size, pool);
    }

    pool.push(arr);
  }

  _roundSize(size) {
    let v = size;
    v--;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v++;
    return Math.max(v, 128);
  }

  clear() {
    this.pools.clear();
  }
}

/**
 * Global pool manager singleton
 */
class PoolManager {
  constructor() {
    this.vector3 = new Vector3Pool(100);
    this.matrix4 = new Matrix4Pool(30);
    this.color = new ColorPool(50);
    this.float32 = new Float32ArrayPool();
    this.uint32 = new Uint32ArrayPool();
  }

  /**
   * Get a Vector3 from pool
   */
  getVector3(x, y, z) {
    return this.vector3.acquire(x, y, z);
  }

  /**
   * Return Vector3 to pool
   */
  releaseVector3(v) {
    this.vector3.release(v);
  }

  /**
   * Get a Matrix4 from pool
   */
  getMatrix4() {
    return this.matrix4.acquire();
  }

  /**
   * Return Matrix4 to pool
   */
  releaseMatrix4(m) {
    this.matrix4.release(m);
  }

  /**
   * Get a Color from pool
   */
  getColor(r, g, b) {
    return this.color.acquire(r, g, b);
  }

  /**
   * Return Color to pool
   */
  releaseColor(c) {
    this.color.release(c);
  }

  /**
   * Get Float32Array from pool
   */
  getFloat32Array(size) {
    return this.float32.acquire(size);
  }

  /**
   * Return Float32Array to pool
   */
  releaseFloat32Array(arr) {
    this.float32.release(arr);
  }

  /**
   * Get Uint32Array from pool
   */
  getUint32Array(size) {
    return this.uint32.acquire(size);
  }

  /**
   * Return Uint32Array to pool
   */
  releaseUint32Array(arr) {
    this.uint32.release(arr);
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      vector3: {
        pooled: this.vector3.size,
        active: this.vector3.activeCount,
      },
      matrix4: {
        pooled: this.matrix4.size,
        active: this.matrix4.activeCount,
      },
      color: {
        pooled: this.color.size,
        active: this.color.activeCount,
      },
      float32: {
        sizes: this.float32.pools.size,
      },
      uint32: {
        sizes: this.uint32.pools.size,
      },
    };
  }

  /**
   * Clear all pools (call on scene change/reset)
   */
  clearAll() {
    this.vector3.clear();
    this.matrix4.clear();
    this.color.clear();
    this.float32.clear();
    this.uint32.clear();
  }
}

// Singleton instance
export const poolManager = new PoolManager();

// Convenience exports for common use
export const {
  getVector3,
  releaseVector3,
  getMatrix4,
  releaseMatrix4,
  getColor,
  releaseColor,
  getFloat32Array,
  releaseFloat32Array,
  getUint32Array,
  releaseUint32Array,
} = poolManager;

export default poolManager;
