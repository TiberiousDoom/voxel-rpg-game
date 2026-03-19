/**
 * playerPathfinder.js — A* pathfinding on the voxel grid for click-to-move navigation.
 *
 * Pure utility, no React dependencies. Operates on the XZ voxel grid using
 * ChunkManager.getBlock() for terrain queries.
 */

import { VOXEL_SIZE, CHUNK_SIZE_Y } from '../systems/chunks/coordinates';
import { isSolid } from '../systems/chunks/blockTypes';
import { BlockTypes } from '../systems/chunks/blockTypes';
import {
  NAV_MAX_ITERATIONS,
  NAV_MAX_STEP_UP,
  NAV_MAX_STEP_DOWN,
  NAV_PLAYER_HEIGHT_VOXELS,
} from '../data/tuning';

/**
 * Get the voxel Y of the highest solid block in a column.
 * Returns -1 if no solid block found (empty column or unloaded chunk).
 */
export function getTerrainHeightVoxel(cm, vx, vz) {
  const maxVoxelY = CHUNK_SIZE_Y - 1;
  for (let vy = maxVoxelY; vy >= 0; vy--) {
    const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
    const worldX = vx * VOXEL_SIZE + VOXEL_SIZE / 2;
    const worldZ = vz * VOXEL_SIZE + VOXEL_SIZE / 2;
    const block = cm.getBlock(worldX, worldY, worldZ);
    if (isSolid(block)) {
      return vy;
    }
  }
  return -1;
}

/**
 * Check if a voxel column is walkable for the player.
 * Walkable = solid ground that isn't water + enough air clearance above.
 * Returns { walkable, height } where height is the voxel Y of the ground.
 */
export function isWalkableCell(cm, vx, vz) {
  const groundY = getTerrainHeightVoxel(cm, vx, vz);
  if (groundY < 0) return { walkable: false, height: -1 };

  // Check the ground block isn't water
  const groundWorldY = groundY * VOXEL_SIZE + VOXEL_SIZE / 2;
  const worldX = vx * VOXEL_SIZE + VOXEL_SIZE / 2;
  const worldZ = vz * VOXEL_SIZE + VOXEL_SIZE / 2;
  const groundBlock = cm.getBlock(worldX, groundWorldY, worldZ);
  if (groundBlock === BlockTypes.WATER) return { walkable: false, height: groundY };

  // Check air clearance above ground
  for (let i = 1; i <= NAV_PLAYER_HEIGHT_VOXELS; i++) {
    const checkY = groundY + i;
    if (checkY >= CHUNK_SIZE_Y) continue; // Above world top = air
    const aboveWorldY = checkY * VOXEL_SIZE + VOXEL_SIZE / 2;
    const aboveBlock = cm.getBlock(worldX, aboveWorldY, worldZ);
    if (isSolid(aboveBlock)) return { walkable: false, height: groundY };
  }

  return { walkable: true, height: groundY };
}

/**
 * Check if traversal between two heights is allowed.
 */
export function canTraverse(fromH, toH) {
  const diff = toH - fromH;
  return diff <= NAV_MAX_STEP_UP && diff >= -NAV_MAX_STEP_DOWN;
}

// 8-directional neighbor offsets: [dx, dz, cost]
const NEIGHBORS = [
  [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],           // cardinal
  [-1, -1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [1, 1, 1.414], // diagonal
];

/**
 * Chebyshev distance heuristic (diagonal movement allowed).
 */
function heuristic(ax, az, bx, bz) {
  const dx = Math.abs(ax - bx);
  const dz = Math.abs(az - bz);
  return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
}

function nodeKey(vx, vz) {
  return (vx + 10000) * 100000 + (vz + 10000);
}

/**
 * Find the nearest walkable cell to goal via spiral scan.
 */
function findNearestWalkable(cm, gx, gz, maxRadius) {
  for (let r = 0; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue; // only ring
        const cell = isWalkableCell(cm, gx + dx, gz + dz);
        if (cell.walkable) return { vx: gx + dx, vz: gz + dz, height: cell.height };
      }
    }
  }
  return null;
}

/**
 * Main A* pathfinder. Returns array of [x,y,z] world-coordinate waypoints, or null.
 *
 * @param {object} chunkManager - ChunkManager instance
 * @param {number[]} startWorld - [x, y, z] player world position
 * @param {number[]} goalWorld - [x, y, z] goal world position
 * @returns {number[][] | null} Array of [x, y, z] waypoints, or null if no path
 */
export function findPath(chunkManager, startWorld, goalWorld) {
  const cm = chunkManager;

  // Convert world coords to voxel XZ
  const svx = Math.floor(startWorld[0] / VOXEL_SIZE);
  const svz = Math.floor(startWorld[2] / VOXEL_SIZE);
  const gvx = Math.floor(goalWorld[0] / VOXEL_SIZE);
  const gvz = Math.floor(goalWorld[2] / VOXEL_SIZE);

  // Check start walkability
  const startCell = isWalkableCell(cm, svx, svz);
  if (!startCell.walkable) return null;

  // Check goal walkability — if unwalkable, find nearest walkable cell
  let goalVx = gvx, goalVz = gvz;
  let goalCell = isWalkableCell(cm, gvx, gvz);
  if (!goalCell.walkable) {
    const nearest = findNearestWalkable(cm, gvx, gvz, 5);
    if (!nearest) return null;
    goalVx = nearest.vx;
    goalVz = nearest.vz;
    goalCell = { walkable: true, height: nearest.height };
  }

  // Trivial case: already at goal
  if (svx === goalVx && svz === goalVz) return null;

  // A* open set (sorted by f). Each node: { vx, vz, g, f, parentKey }
  const open = [];
  const gScores = new Map(); // nodeKey → g
  const cameFrom = new Map(); // nodeKey → { vx, vz, height }
  const heightCache = new Map(); // nodeKey → { walkable, height }

  function getCellCached(vx, vz) {
    const k = nodeKey(vx, vz);
    let cached = heightCache.get(k);
    if (cached === undefined) {
      cached = isWalkableCell(cm, vx, vz);
      heightCache.set(k, cached);
    }
    return cached;
  }

  const startKey = nodeKey(svx, svz);
  const goalKey = nodeKey(goalVx, goalVz);

  gScores.set(startKey, 0);
  heightCache.set(startKey, startCell);

  const startF = heuristic(svx, svz, goalVx, goalVz);
  open.push({ vx: svx, vz: svz, g: 0, f: startF, key: startKey });

  let iterations = 0;

  while (open.length > 0 && iterations < NAV_MAX_ITERATIONS) {
    iterations++;

    // Pop lowest f (binary search insert keeps array sorted — pop from end for O(1))
    const current = open.pop();

    // Skip stale entries
    if (current.g > (gScores.get(current.key) ?? Infinity)) continue;

    // Goal reached?
    if (current.key === goalKey) {
      // Reconstruct path
      const path = [];
      let key = goalKey;
      while (key !== startKey) {
        const node = cameFrom.get(key);
        const worldX = node.vx * VOXEL_SIZE + VOXEL_SIZE / 2;
        const worldY = (node.height + 1) * VOXEL_SIZE; // top surface of ground block
        const worldZ = node.vz * VOXEL_SIZE + VOXEL_SIZE / 2;
        path.push([worldX, worldY, worldZ]);
        key = nodeKey(node.vx, node.vz);
        // Safety: break if we loop back (shouldn't happen)
        if (path.length > NAV_MAX_ITERATIONS) break;
      }
      path.reverse();

      // Add final goal position with proper height
      const goalWorldY = (goalCell.height + 1) * VOXEL_SIZE;
      path.push([goalVx * VOXEL_SIZE + VOXEL_SIZE / 2, goalWorldY, goalVz * VOXEL_SIZE + VOXEL_SIZE / 2]);

      return smoothPath(path, cm);
    }

    const currentCell = getCellCached(current.vx, current.vz);

    // Expand neighbors
    for (let n = 0; n < NEIGHBORS.length; n++) {
      const [dx, dz, cost] = NEIGHBORS[n];
      const nx = current.vx + dx;
      const nz = current.vz + dz;

      // Diagonal corner-cutting guard: both adjacent cardinals must be walkable
      if (dx !== 0 && dz !== 0) {
        const c1 = getCellCached(current.vx + dx, current.vz);
        const c2 = getCellCached(current.vx, current.vz + dz);
        if (!c1.walkable || !c2.walkable) continue;
      }

      const neighborCell = getCellCached(nx, nz);
      if (!neighborCell.walkable) continue;
      if (!canTraverse(currentCell.height, neighborCell.height)) continue;

      const tentativeG = current.g + cost;
      const nKey = nodeKey(nx, nz);
      const existingG = gScores.get(nKey);

      if (existingG === undefined || tentativeG < existingG) {
        gScores.set(nKey, tentativeG);
        cameFrom.set(nKey, { vx: current.vx, vz: current.vz, height: currentCell.height });

        const f = tentativeG + heuristic(nx, nz, goalVx, goalVz);

        // Binary insert into open (sorted descending by f so pop gives lowest)
        let lo = 0, hi = open.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (open[mid].f > f) lo = mid + 1;
          else hi = mid;
        }
        open.splice(lo, 0, { vx: nx, vz: nz, g: tentativeG, f, key: nKey });
      }
    }
  }

  // No path found
  return null;
}

/**
 * Greedy line-of-sight smoothing to reduce grid staircase into straight segments.
 */
export function smoothPath(rawPath, cm) {
  if (!rawPath || rawPath.length <= 2) return rawPath;

  const result = [rawPath[0]];
  let anchor = 0;

  for (let i = 2; i < rawPath.length; i++) {
    if (!hasLineOfSight(cm, rawPath[anchor], rawPath[i])) {
      result.push(rawPath[i - 1]);
      anchor = i - 1;
    }
  }

  result.push(rawPath[rawPath.length - 1]);
  return result;
}

/**
 * Bresenham-style grid walk checking walkability + height continuity.
 */
export function hasLineOfSight(cm, from, to) {
  const vx0 = Math.floor(from[0] / VOXEL_SIZE);
  const vz0 = Math.floor(from[2] / VOXEL_SIZE);
  const vx1 = Math.floor(to[0] / VOXEL_SIZE);
  const vz1 = Math.floor(to[2] / VOXEL_SIZE);

  const dx = Math.abs(vx1 - vx0);
  const dz = Math.abs(vz1 - vz0);
  const sx = vx0 < vx1 ? 1 : -1;
  const sz = vz0 < vz1 ? 1 : -1;

  let err = dx - dz;
  let cx = vx0, cz = vz0;
  let prevHeight = getTerrainHeightVoxel(cm, cx, cz);

  const maxSteps = dx + dz + 1;
  for (let s = 0; s < maxSteps; s++) {
    if (cx === vx1 && cz === vz1) return true;

    const e2 = 2 * err;
    if (e2 > -dz) { err -= dz; cx += sx; }
    if (e2 < dx) { err += dx; cz += sz; }

    const cell = isWalkableCell(cm, cx, cz);
    if (!cell.walkable) return false;
    if (!canTraverse(prevHeight, cell.height)) return false;
    prevHeight = cell.height;
  }

  return true;
}
