/**
 * ChunkRenderer - React component that renders all active chunks
 *
 * Subscribes to ChunkManager and renders chunk meshes as they load/unload.
 * Only nearby chunks (within PHYSICS_DISTANCE) get trimesh physics colliders.
 * Distant chunks render as visual-only meshes for performance.
 */

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { chunkOriginWorld, worldToChunk } from '../../systems/chunks/coordinates.js';
import useGameStore from '../../stores/useGameStore';

// Only chunks within this Chebyshev distance get physics colliders
const PHYSICS_DISTANCE = 2;

// LOD distance thresholds (Chebyshev distance in chunks)
// eslint-disable-next-line no-unused-vars
const LOD_THRESHOLDS = {
  LOD0: 4,  // Full detail: 0-4 chunks
  LOD1: 8,  // Medium detail: 5-8 chunks
  // LOD2: 9+ chunks (currently disabled for simplicity)
};

/**
 * Shared hook to build geometry from mesh data
 */
function useChunkGeometry(meshData) {
  const geometry = useMemo(() => {
    if (!meshData?.positions?.length || !meshData?.indices?.length || meshData.vertexCount === 0) {
      return null;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(meshData.positions), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(meshData.normals), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(meshData.colors), 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint32Array(meshData.indices), 1));
    geo.computeBoundingSphere();

    return geo;
  }, [meshData]);

  // Dispose old geometry on cleanup
  useEffect(() => {
    return () => {
      if (geometry) geometry.dispose();
    };
  }, [geometry]);

  return geometry;
}

/**
 * Chunk with physics collider (for nearby chunks)
 */
function PhysicsChunkMesh({ chunk, meshData }) {
  const position = useMemo(() => {
    const origin = chunkOriginWorld(chunk.x, chunk.z);
    return [origin.x, origin.y, origin.z];
  }, [chunk.x, chunk.z]);

  const geometry = useChunkGeometry(meshData);
  if (!geometry) return null;

  return (
    <RigidBody type="fixed" colliders="trimesh" position={position}>
      <mesh geometry={geometry} frustumCulled={false}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
    </RigidBody>
  );
}

/**
 * Visual-only chunk (no physics, for distant chunks)
 */
function VisualChunkMesh({ chunk, meshData }) {
  const position = useMemo(() => {
    const origin = chunkOriginWorld(chunk.x, chunk.z);
    return [origin.x, origin.y, origin.z];
  }, [chunk.x, chunk.z]);

  const geometry = useChunkGeometry(meshData);
  if (!geometry) return null;

  return (
    <group position={position}>
      <mesh geometry={geometry} frustumCulled={false}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Main chunk renderer component
 */
export function ChunkRenderer({ chunkManager, workerPool }) {
  const [chunks, setChunks] = useState(new Map());
  const [meshData, setMeshData] = useState(new Map());
  const [meshVersion, setMeshVersion] = useState(new Map()); // Track mesh versions for key changes
  const frameCountRef = useRef(0);
  const playerPosition = useGameStore((state) => state.player.position);

  // Compute player chunk coordinates (only recalculates when playerPosition changes)
  const playerChunk = useMemo(() => {
    return worldToChunk(playerPosition[0], playerPosition[2]);
  }, [playerPosition]);

  // Handle chunk ready event
  const handleChunkReady = useCallback(async (chunk) => {
    if (workerPool) {
      try {
        const result = await workerPool.execute({
          type: 'buildMesh',
          blocks: chunk.blocks,
          neighborNorth: chunk.neighbors.north?.blocks || null,
          neighborSouth: chunk.neighbors.south?.blocks || null,
          neighborEast: chunk.neighbors.east?.blocks || null,
          neighborWest: chunk.neighbors.west?.blocks || null,
        });

        setMeshData(prev => {
          const next = new Map(prev);
          next.set(chunk.key, result);
          return next;
        });

        setMeshVersion(prev => {
          const next = new Map(prev);
          next.set(chunk.key, (prev.get(chunk.key) || 0) + 1);
          return next;
        });
      } catch (error) {
        console.error('[ChunkRenderer] Failed to build mesh:', chunk.key, error);
      }
    }

    setChunks(prev => {
      const next = new Map(prev);
      next.set(chunk.key, chunk);
      return next;
    });
  }, [workerPool]);

  // Handle chunk unload event
  const handleChunkUnload = useCallback((chunk) => {
    setChunks(prev => {
      const next = new Map(prev);
      next.delete(chunk.key);
      return next;
    });

    setMeshData(prev => {
      const next = new Map(prev);
      next.delete(chunk.key);
      return next;
    });

    setMeshVersion(prev => {
      const next = new Map(prev);
      next.delete(chunk.key);
      return next;
    });
  }, []);

  // Set up chunk manager callbacks
  useEffect(() => {
    if (!chunkManager) return;

    const originalOnReady = chunkManager.onChunkReady;
    const originalOnUnload = chunkManager.onChunkUnload;

    chunkManager.onChunkReady = handleChunkReady;
    chunkManager.onChunkUnload = handleChunkUnload;

    return () => {
      chunkManager.onChunkReady = originalOnReady;
      chunkManager.onChunkUnload = originalOnUnload;
    };
  }, [chunkManager, handleChunkReady, handleChunkUnload]);

  // Process mesh rebuilds for dirty chunks
  useFrame(() => {
    if (!chunkManager || !workerPool) return;

    frameCountRef.current++;
    if (frameCountRef.current % 3 !== 0) return;

    const dirtyChunks = chunkManager.getDirtyChunks();
    const rebuildsPerFrame = 2;
    let rebuilt = 0;

    for (const chunk of dirtyChunks) {
      if (rebuilt >= rebuildsPerFrame) break;
      // Skip if we don't have this chunk in our state (shouldn't happen normally)
      if (!chunks.has(chunk.key)) continue;

      chunk.meshDirty = false;
      rebuilt++;

      const chunkKey = chunk.key; // Capture for closure
      workerPool.execute({
        type: 'buildMesh',
        blocks: chunk.blocks,
        neighborNorth: chunk.neighbors.north?.blocks || null,
        neighborSouth: chunk.neighbors.south?.blocks || null,
        neighborEast: chunk.neighbors.east?.blocks || null,
        neighborWest: chunk.neighbors.west?.blocks || null,
      }).then(result => {
        setMeshData(prev => {
          const next = new Map(prev);
          next.set(chunkKey, result);
          return next;
        });
        // Increment version to force React to remount the mesh component
        setMeshVersion(prev => {
          const next = new Map(prev);
          next.set(chunkKey, (prev.get(chunkKey) || 0) + 1);
          return next;
        });
      }).catch(error => {
        console.error('Failed to rebuild mesh for chunk', chunkKey, error);
        chunk.meshDirty = true;
      });
    }
  });

  // Render all chunks - nearby get physics, distant are visual-only
  return (
    <group name="chunks">
      {Array.from(chunks.values()).map(chunk => {
        const data = meshData.get(chunk.key);
        if (!data || data.vertexCount === 0) return null;

        // Chebyshev distance: max of |dx| and |dz|
        const dx = Math.abs(chunk.x - playerChunk.chunkX);
        const dz = Math.abs(chunk.z - playerChunk.chunkZ);
        const needsPhysics = dx <= PHYSICS_DISTANCE && dz <= PHYSICS_DISTANCE;
        const version = meshVersion.get(chunk.key) || 0;

        if (needsPhysics) {
          return (
            <PhysicsChunkMesh
              key={`${chunk.key}-p-${version}`}
              chunk={chunk}
              meshData={data}
            />
          );
        }

        return (
          <VisualChunkMesh
            key={`${chunk.key}-v-${version}`}
            chunk={chunk}
            meshData={data}
          />
        );
      })}
    </group>
  );
}

export default ChunkRenderer;
