/**
 * Placement Validator - Foundation Module
 *
 * This utility enforces all the rules for where buildings can be placed.
 * It's the validation layer that prevents invalid placements.
 *
 * Key Responsibilities:
 * 1. Grid constraint validation (is position within grid bounds?)
 * 2. Collision detection (does building collide with others?)
 * 3. Terrain compatibility (can this terrain support this building?)
 * 4. Spacing requirements (minimum distance between certain building types?)
 * 5. Resource availability (does player have resources?)
 *
 * All validation is done through the public interface, other modules don't
 * need to rewrite this logic.
 */

import {
  GRID,
  BUILDING_TYPES,
  BUILDING_DIMENSIONS,
  PLACEMENT_CONSTRAINTS,
  BUILDING_PROPERTIES,
} from '../../../shared/config';

/**
 * Validates that a position is within the grid bounds.
 *
 * @param {Object} position - { x, z } position to check
 * @returns {Object} { valid: boolean, reason: string }
 */
export const validateGridBounds = (position) => {
  if (!PLACEMENT_CONSTRAINTS.ENFORCE_GRID_BOUNDS) {
    return { valid: true, reason: 'Grid bounds not enforced' };
  }

  const minX = GRID.GRID_ORIGIN.x;
  const maxX = GRID.GRID_ORIGIN.x + GRID.GRID_WIDTH * GRID.CELL_SIZE;
  const minZ = GRID.GRID_ORIGIN.z;
  const maxZ = GRID.GRID_ORIGIN.z + GRID.GRID_HEIGHT * GRID.CELL_SIZE;

  if (position.x < minX || position.x > maxX) {
    return {
      valid: false,
      reason: `X position ${position.x.toFixed(1)} out of bounds [${minX}, ${maxX}]`,
    };
  }

  if (position.z < minZ || position.z > maxZ) {
    return {
      valid: false,
      reason: `Z position ${position.z.toFixed(1)} out of bounds [${minZ}, ${maxZ}]`,
    };
  }

  return { valid: true, reason: 'Within grid bounds' };
};

/**
 * Validates that the position is on a valid grid cell.
 *
 * Buildings snap to grid cells. This ensures the position aligns with
 * the grid system defined in the config.
 *
 * @param {Object} position - { x, z } position to check
 * @returns {Object} { valid: boolean, reason: string, snappedPosition: Object }
 */
export const validateGridSnap = (position) => {
  const cellSize = GRID.CELL_SIZE;
  const snapX = Math.round(position.x / cellSize) * cellSize;
  const snapZ = Math.round(position.z / cellSize) * cellSize;

  return {
    valid: true,
    reason: 'Position snapped to grid',
    snappedPosition: { x: snapX, z: snapZ },
  };
};

/**
 * Validates that the rotation is allowed.
 *
 * Some building types only allow certain rotations (e.g., 90-degree increments).
 *
 * @param {number} rotation - Rotation in degrees
 * @returns {Object} { valid: boolean, reason: string, snappedRotation: number }
 */
export const validateRotation = (rotation) => {
  const snap = GRID.ROTATION_SNAP;
  const snappedRotation = Math.round(rotation / snap) * snap;

  if (!GRID.ALLOWED_ROTATIONS.includes(snappedRotation % 360)) {
    return {
      valid: false,
      reason: `Rotation ${snappedRotation}° not in allowed rotations`,
    };
  }

  return {
    valid: true,
    reason: 'Rotation is valid',
    snappedRotation,
  };
};

/**
 * Validates that the position is within terrain height constraints.
 *
 * Buildings can only be placed within certain height ranges.
 *
 * @param {number} height - Y position
 * @returns {Object} { valid: boolean, reason: string }
 */
export const validateHeight = (height) => {
  const { MIN_PLACEMENT_HEIGHT, MAX_PLACEMENT_HEIGHT } = GRID;

  if (height < MIN_PLACEMENT_HEIGHT) {
    return {
      valid: false,
      reason: `Height ${height.toFixed(1)} below minimum ${MIN_PLACEMENT_HEIGHT}`,
    };
  }

  if (height > MAX_PLACEMENT_HEIGHT) {
    return {
      valid: false,
      reason: `Height ${height.toFixed(1)} above maximum ${MAX_PLACEMENT_HEIGHT}`,
    };
  }

  return { valid: true, reason: 'Height is valid' };
};

/**
 * Check for collision with existing buildings.
 *
 * This is the core collision detection. It checks if the building's bounding
 * box would collide with any existing building's bounding box.
 *
 * @param {Object} position - { x, y, z } position
 * @param {string} buildingType - Type of building to place
 * @param {number} rotation - Rotation in degrees
 * @param {Array} existingBuildings - Array of existing building objects
 * @returns {Object} { valid: boolean, reason: string, collidingBuilding: Object }
 */
export const validateNoCollisions = (
  position,
  buildingType,
  rotation,
  existingBuildings = []
) => {
  const dimensions = BUILDING_DIMENSIONS[buildingType];
  if (!dimensions) {
    return {
      valid: false,
      reason: `Unknown building type: ${buildingType}`,
    };
  }

  // Get bounding box for new building
  const newBbox = getBoundingBox(position, dimensions, rotation);

  // Check against all existing buildings
  for (const existing of existingBuildings) {
    const existingDims = BUILDING_DIMENSIONS[existing.type];
    if (!existingDims) continue;

    const existingBbox = getBoundingBox(
      existing.position,
      existingDims,
      existing.rotation
    );

    if (bboxIntersect(newBbox, existingBbox)) {
      return {
        valid: false,
        reason: `Collides with existing ${existing.type}`,
        collidingBuilding: existing,
      };
    }
  }

  return { valid: true, reason: 'No collisions detected' };
};

/**
 * Check spacing requirements for specific building types.
 *
 * Some buildings (like guard posts) need minimum distance from each other.
 *
 * @param {Object} position - { x, y, z } position
 * @param {string} buildingType - Type of building to place
 * @param {Array} existingBuildings - Array of existing building objects
 * @returns {Object} { valid: boolean, reason: string }
 */
export const validateSpacing = (position, buildingType, existingBuildings = []) => {
  const requiredSpacing = PLACEMENT_CONSTRAINTS.SPACING_REQUIREMENTS[buildingType];
  if (!requiredSpacing) {
    return { valid: true, reason: 'No spacing requirements' };
  }

  // Find all buildings of the same type
  const sametype = existingBuildings.filter((b) => b.type === buildingType);

  for (const existing of sametype) {
    const distance = Math.sqrt(
      Math.pow(position.x - existing.position.x, 2) +
        Math.pow(position.z - existing.position.z, 2)
    );

    if (distance < requiredSpacing) {
      return {
        valid: false,
        reason: `Must be ${requiredSpacing} units from other ${buildingType}s (current: ${distance.toFixed(1)})`,
      };
    }
  }

  return { valid: true, reason: 'Spacing requirement satisfied' };
};

/**
 * Check if world is at maximum building capacity.
 *
 * Prevents infinite building and memory issues.
 *
 * @param {number} currentBuildingCount - Current number of buildings in world
 * @returns {Object} { valid: boolean, reason: string }
 */
export const validateCapacity = (currentBuildingCount) => {
  if (
    currentBuildingCount >= PLACEMENT_CONSTRAINTS.MAX_BUILDINGS_PER_WORLD
  ) {
    return {
      valid: false,
      reason: `World is at maximum capacity (${PLACEMENT_CONSTRAINTS.MAX_BUILDINGS_PER_WORLD})`,
    };
  }

  return { valid: true, reason: 'World capacity OK' };
};

/**
 * Check if player has resources to build.
 *
 * This is called after Foundation validates placement.
 * Resource Economy module validates actual resource availability.
 *
 * @param {string} buildingType - Type of building
 * @returns {Object} { costs: Object } Resource costs for this building
 */
export const getBuildingCosts = (buildingType) => {
  const properties = BUILDING_PROPERTIES[buildingType];
  if (!properties) {
    return { costs: {} };
  }
  return { costs: properties.costs || {} };
};

/**
 * PRIMARY VALIDATION METHOD
 *
 * This is the main method called by placement systems.
 * It runs all validation checks and returns a comprehensive result.
 *
 * @param {Object} placement - Placement proposal
 *   {
 *     buildingType: string (required)
 *     position: { x, y, z } (required)
 *     rotation: number (default 0)
 *     existingBuildings: Array (required)
 *     currentBuildingCount: number (required)
 *   }
 * @returns {Object} Validation result
 *   {
 *     valid: boolean
 *     checks: Array of { name: string, valid: boolean, reason: string }
 *     snappedPosition: { x, z }
 *     snappedRotation: number
 *     reason: string (summary of failures if invalid)
 *   }
 */
export const validatePlacement = (placement) => {
  const {
    buildingType,
    position,
    rotation = 0,
    existingBuildings = [],
    currentBuildingCount = 0,
  } = placement;

  const checks = [];
  const failures = [];

  // Run all validation checks
  const boundsCheck = validateGridBounds(position);
  checks.push({ name: 'Grid Bounds', ...boundsCheck });
  if (!boundsCheck.valid) failures.push(boundsCheck.reason);

  const snapCheck = validateGridSnap(position);
  checks.push({ name: 'Grid Snap', ...snapCheck });

  const rotationCheck = validateRotation(rotation);
  checks.push({ name: 'Rotation', ...rotationCheck });
  if (!rotationCheck.valid) failures.push(rotationCheck.reason);

  const heightCheck = validateHeight(position.y);
  checks.push({ name: 'Height', ...heightCheck });
  if (!heightCheck.valid) failures.push(heightCheck.reason);

  const collisionCheck = validateNoCollisions(
    position,
    buildingType,
    rotation,
    existingBuildings
  );
  checks.push({ name: 'Collisions', ...collisionCheck });
  if (!collisionCheck.valid) failures.push(collisionCheck.reason);

  const spacingCheck = validateSpacing(position, buildingType, existingBuildings);
  checks.push({ name: 'Spacing', ...spacingCheck });
  if (!spacingCheck.valid) failures.push(spacingCheck.reason);

  const capacityCheck = validateCapacity(currentBuildingCount);
  checks.push({ name: 'Capacity', ...capacityCheck });
  if (!capacityCheck.valid) failures.push(capacityCheck.reason);

  return {
    valid: failures.length === 0,
    checks,
    snappedPosition: snapCheck.snappedPosition || position,
    snappedRotation: rotationCheck.snappedRotation || rotation,
    reason: failures.length > 0 ? failures.join('; ') : 'Placement valid',
  };
};

// ============================================================================
// INTERNAL HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate axis-aligned bounding box for a building.
 *
 * @param {Object} position - { x, y, z } center position
 * @param {Object} dimensions - { width, height, depth }
 * @param {number} rotation - Rotation in degrees (currently assumes axis-aligned)
 * @returns {Object} { min: {x,y,z}, max: {x,y,z} }
 */
function getBoundingBox(position, dimensions, rotation = 0) {
  const { x, y, z } = position;
  const { width, height, depth } = dimensions;

  // For simplicity, assume axis-aligned bboxes
  // FUTURE: Handle rotation-aware bboxes if rotated buildings are supported
  const w = width / 2;
  const h = height / 2;
  const d = depth / 2;

  return {
    min: { x: x - w, y: y - h, z: z - d },
    max: { x: x + w, y: y + h, z: z + d },
  };
}

/**
 * Check if two axis-aligned bounding boxes intersect.
 *
 * @param {Object} bbox1 - { min: {x,y,z}, max: {x,y,z} }
 * @param {Object} bbox2 - { min: {x,y,z}, max: {x,y,z} }
 * @returns {boolean} True if bboxes intersect
 */
function bboxIntersect(bbox1, bbox2) {
  return (
    bbox1.max.x >= bbox2.min.x &&
    bbox1.min.x <= bbox2.max.x &&
    bbox1.max.y >= bbox2.min.y &&
    bbox1.min.y <= bbox2.max.y &&
    bbox1.max.z >= bbox2.min.z &&
    bbox1.min.z <= bbox2.max.z
  );
}
