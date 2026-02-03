/**
 * Mock for three.js
 * Provides mock implementations for Three.js classes
 */

// Mock Vector3
export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }
  normalize() {
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    if (len > 0) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
    }
    return this;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  distanceTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
  toArray() {
    return [this.x, this.y, this.z];
  }
}

// Mock Color
export class Color {
  constructor(r = 1, g = 1, b = 1) {
    if (typeof r === 'string') {
      this.setStyle(r);
    } else {
      this.r = r;
      this.g = g;
      this.b = b;
    }
  }
  setStyle(style) {
    // Simple hex parsing
    if (style.startsWith('#')) {
      const hex = parseInt(style.slice(1), 16);
      this.r = ((hex >> 16) & 255) / 255;
      this.g = ((hex >> 8) & 255) / 255;
      this.b = (hex & 255) / 255;
    }
    return this;
  }
  set(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
    return this;
  }
  clone() {
    return new Color(this.r, this.g, this.b);
  }
}

// Mock Euler
export class Euler {
  constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

// Mock Quaternion
export class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
  setFromEuler(euler) {
    return this;
  }
}

// Mock Matrix4
export class Matrix4 {
  constructor() {
    this.elements = new Float32Array(16);
    this.identity();
  }
  identity() {
    this.elements.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    return this;
  }
  setPosition(x, y, z) {
    this.elements[12] = x;
    this.elements[13] = y;
    this.elements[14] = z;
    return this;
  }
}

// Mock Object3D
export class Object3D {
  constructor() {
    this.position = new Vector3();
    this.rotation = new Euler();
    this.scale = new Vector3(1, 1, 1);
    this.quaternion = new Quaternion();
    this.matrix = new Matrix4();
    this.children = [];
    this.parent = null;
    this.visible = true;
    this.name = '';
  }
  add(object) {
    this.children.push(object);
    object.parent = this;
  }
  remove(object) {
    const index = this.children.indexOf(object);
    if (index !== -1) {
      this.children.splice(index, 1);
      object.parent = null;
    }
  }
  lookAt() {}
  updateMatrixWorld() {}
}

// Mock Mesh
export class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.isMesh = true;
  }
}

// Mock InstancedMesh
export class InstancedMesh extends Mesh {
  constructor(geometry, material, count) {
    super(geometry, material);
    this.count = count;
    this.instanceMatrix = {
      needsUpdate: false,
      array: new Float32Array(count * 16),
    };
    this.instanceColor = null;
    this.isInstancedMesh = true;
  }
  setMatrixAt(index, matrix) {
    matrix.elements && this.instanceMatrix.array.set(matrix.elements, index * 16);
  }
  setColorAt(index, color) {
    if (!this.instanceColor) {
      this.instanceColor = {
        needsUpdate: false,
        array: new Float32Array(this.count * 3),
      };
    }
    this.instanceColor.array.set([color.r, color.g, color.b], index * 3);
  }
}

// Mock Geometries
export class BoxGeometry {
  constructor(width = 1, height = 1, depth = 1) {
    this.parameters = { width, height, depth };
    this.type = 'BoxGeometry';
  }
  dispose() {}
}

export class SphereGeometry {
  constructor(radius = 1, widthSegments = 32, heightSegments = 16) {
    this.parameters = { radius, widthSegments, heightSegments };
    this.type = 'SphereGeometry';
  }
  dispose() {}
}

export class PlaneGeometry {
  constructor(width = 1, height = 1) {
    this.parameters = { width, height };
    this.type = 'PlaneGeometry';
  }
  dispose() {}
}

export class ConeGeometry {
  constructor(radius = 1, height = 1) {
    this.parameters = { radius, height };
    this.type = 'ConeGeometry';
  }
  dispose() {}
}

// Mock Materials
export class MeshStandardMaterial {
  constructor(params = {}) {
    this.color = params.color ? new Color(params.color) : new Color();
    this.opacity = params.opacity ?? 1;
    this.transparent = params.transparent ?? false;
    this.type = 'MeshStandardMaterial';
  }
  dispose() {}
}

export class MeshBasicMaterial {
  constructor(params = {}) {
    this.color = params.color ? new Color(params.color) : new Color();
    this.opacity = params.opacity ?? 1;
    this.transparent = params.transparent ?? false;
    this.type = 'MeshBasicMaterial';
  }
  dispose() {}
}

// Mock Raycaster
export class Raycaster {
  constructor() {
    this.ray = { origin: new Vector3(), direction: new Vector3() };
  }
  setFromCamera() {}
  intersectObjects() {
    return [];
  }
}

// Mock Clock
export class Clock {
  constructor() {
    this.elapsedTime = 0;
    this.running = false;
  }
  start() {
    this.running = true;
  }
  stop() {
    this.running = false;
  }
  getElapsedTime() {
    return this.elapsedTime;
  }
  getDelta() {
    return 0.016;
  }
}

// Constants
export const DoubleSide = 2;
export const FrontSide = 0;
export const BackSide = 1;
export const AdditiveBlending = 2;

// Default export
const THREE = {
  Vector3,
  Color,
  Euler,
  Quaternion,
  Matrix4,
  Object3D,
  Mesh,
  InstancedMesh,
  BoxGeometry,
  SphereGeometry,
  PlaneGeometry,
  ConeGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Raycaster,
  Clock,
  DoubleSide,
  FrontSide,
  BackSide,
  AdditiveBlending,
};

export default THREE;
