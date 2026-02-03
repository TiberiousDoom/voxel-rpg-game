/**
 * Chunk Worker - Web Worker for off-thread chunk operations
 *
 * Handles:
 * - Terrain generation
 * - Mesh building
 * - LOD generation
 */

/* eslint-disable no-restricted-globals */

import { generateTerrain } from './terrainGenerator.js';
import { buildChunkMesh, buildLODMesh } from './meshBuilder.js';

// Track active tasks for cancellation
const activeTasks = new Map();

/**
 * Handle incoming messages from main thread
 */
self.onmessage = async (event) => {
  const { type, requestId, ...params } = event.data;

  switch (type) {
    case 'generateTerrain':
      handleGenerateTerrain(requestId, params);
      break;

    case 'buildMesh':
      handleBuildMesh(requestId, params);
      break;

    case 'generateAndBuildMesh':
      handleGenerateAndBuildMesh(requestId, params);
      break;

    case 'cancel':
      handleCancel(requestId);
      break;

    default:
      self.postMessage({
        type: 'error',
        requestId,
        error: `Unknown message type: ${type}`,
      });
  }
};

/**
 * Handle terrain generation request
 */
function handleGenerateTerrain(requestId, params) {
  activeTasks.set(requestId, { cancelled: false });

  try {
    const result = generateTerrain(params);

    if (activeTasks.get(requestId)?.cancelled) {
      activeTasks.delete(requestId);
      return;
    }

    // Transfer the blocks array (zero-copy)
    self.postMessage(
      {
        type: 'terrainComplete',
        requestId,
        chunkX: result.chunkX,
        chunkZ: result.chunkZ,
        blocks: result.blocks,
      },
      [result.blocks.buffer]
    );

  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      error: error.message,
    });
  } finally {
    activeTasks.delete(requestId);
  }
}

/**
 * Handle mesh building request
 */
function handleBuildMesh(requestId, params) {
  activeTasks.set(requestId, { cancelled: false });

  try {
    const result = buildChunkMesh(params);

    if (activeTasks.get(requestId)?.cancelled) {
      activeTasks.delete(requestId);
      return;
    }

    // Transfer all typed arrays
    self.postMessage(
      {
        type: 'meshComplete',
        requestId,
        positions: result.positions,
        normals: result.normals,
        colors: result.colors,
        indices: result.indices,
        vertexCount: result.vertexCount,
        faceCount: result.faceCount,
      },
      [
        result.positions.buffer,
        result.normals.buffer,
        result.colors.buffer,
        result.indices.buffer,
      ]
    );

  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      error: error.message,
    });
  } finally {
    activeTasks.delete(requestId);
  }
}

/**
 * Handle combined generate + build mesh request (more efficient)
 */
function handleGenerateAndBuildMesh(requestId, params) {
  activeTasks.set(requestId, { cancelled: false });

  try {
    // Generate terrain
    const terrain = generateTerrain(params);

    if (activeTasks.get(requestId)?.cancelled) {
      activeTasks.delete(requestId);
      return;
    }

    // Build mesh
    const mesh = buildChunkMesh({
      blocks: terrain.blocks,
      neighborNorth: params.neighborNorth || null,
      neighborSouth: params.neighborSouth || null,
      neighborEast: params.neighborEast || null,
      neighborWest: params.neighborWest || null,
    });

    if (activeTasks.get(requestId)?.cancelled) {
      activeTasks.delete(requestId);
      return;
    }

    // Transfer all typed arrays
    self.postMessage(
      {
        type: 'generateAndMeshComplete',
        requestId,
        chunkX: terrain.chunkX,
        chunkZ: terrain.chunkZ,
        blocks: terrain.blocks,
        positions: mesh.positions,
        normals: mesh.normals,
        colors: mesh.colors,
        indices: mesh.indices,
        vertexCount: mesh.vertexCount,
        faceCount: mesh.faceCount,
      },
      [
        terrain.blocks.buffer,
        mesh.positions.buffer,
        mesh.normals.buffer,
        mesh.colors.buffer,
        mesh.indices.buffer,
      ]
    );

  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      error: error.message,
    });
  } finally {
    activeTasks.delete(requestId);
  }
}

/**
 * Handle cancellation request
 */
function handleCancel(requestId) {
  const task = activeTasks.get(requestId);
  if (task) {
    task.cancelled = true;
  }
}

// Let main thread know worker is ready
self.postMessage({ type: 'ready' });
