/**
 * ChunkRenderer - React component that renders all active chunks
 *
 * Subscribes to ChunkManager and renders chunk meshes as they load/unload.
 */

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { chunkOriginWorld } from '../../systems/chunks/coordinates.js';

/**
 * Individual chunk mesh component
 */
function ChunkMesh({ chunk, meshData }) {
  const meshRef = useRef();
  const geometryRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Get chunk world position
  const position = useMemo(() => {
    const origin = chunkOriginWorld(chunk.x, chunk.z);
    return [origin.x, origin.y, origin.z];
  }, [chunk.x, chunk.z]);

  // Create/update geometry when meshData changes
  useEffect(() => {
    // Validate mesh data
    if (!meshData || !meshData.positions || !meshData.normals || !meshData.colors || !meshData.indices) {
      setIsReady(false);
      return;
    }

    // Check for valid data lengths
    if (meshData.positions.length === 0 || meshData.vertexCount === 0) {
      setIsReady(false);
      return;
    }

    // Dispose old geometry
    if (geometryRef.current) {
      geometryRef.current.dispose();
    }

    // Create new geometry
    const geo = new THREE.BufferGeometry();

    geo.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 3));

    if (meshData.indices.length > 0) {
      geo.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    }

    geo.computeBoundingSphere();
    geo.computeBoundingBox();

    geometryRef.current = geo;

    // Apply to mesh if it exists
    if (meshRef.current) {
      meshRef.current.geometry = geo;
    }

    setIsReady(true);

    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
        geometryRef.current = null;
      }
    };
  }, [meshData]);

  if (!isReady || !geometryRef.current) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={position}
      geometry={geometryRef.current}
    >
      <meshBasicMaterial
        vertexColors
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

/**
 * Main chunk renderer component
 */
export function ChunkRenderer({ chunkManager, workerPool }) {
  const [chunks, setChunks] = useState(new Map());
  const [meshData, setMeshData] = useState(new Map());
  const frameCountRef = useRef(0);

  // Handle chunk ready event
  const handleChunkReady = useCallback(async (chunk) => {
    // Build mesh for the new chunk
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
      } catch (error) {
        console.error('Failed to build mesh for chunk', chunk.key, error);
      }
    }

    // Update chunks state
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
  }, []);

  // Set up chunk manager callbacks
  useEffect(() => {
    if (!chunkManager) return;

    // Store original callbacks
    const originalOnReady = chunkManager.onChunkReady;
    const originalOnUnload = chunkManager.onChunkUnload;

    // Set our callbacks
    chunkManager.onChunkReady = handleChunkReady;
    chunkManager.onChunkUnload = handleChunkUnload;

    return () => {
      // Restore original callbacks
      chunkManager.onChunkReady = originalOnReady;
      chunkManager.onChunkUnload = originalOnUnload;
    };
  }, [chunkManager, handleChunkReady, handleChunkUnload]);

  // Process mesh rebuilds for dirty chunks
  useFrame(() => {
    if (!chunkManager || !workerPool) return;

    frameCountRef.current++;

    // Only rebuild meshes every few frames to avoid overwhelming the worker
    if (frameCountRef.current % 3 !== 0) return;

    const dirtyChunks = chunkManager.getDirtyChunks();
    const rebuildsPerFrame = 2;
    let rebuilt = 0;

    for (const chunk of dirtyChunks) {
      if (rebuilt >= rebuildsPerFrame) break;
      if (!chunks.has(chunk.key)) continue;

      // Mark as not dirty before async operation
      chunk.meshDirty = false;
      rebuilt++;

      // Rebuild mesh async
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
          next.set(chunk.key, result);
          return next;
        });
      }).catch(error => {
        console.error('Failed to rebuild mesh for chunk', chunk.key, error);
        chunk.meshDirty = true; // Mark dirty again to retry
      });
    }
  });

  // Render all chunks
  return (
    <group name="chunks">
      {Array.from(chunks.values()).map(chunk => {
        const data = meshData.get(chunk.key);
        if (!data || data.vertexCount === 0) return null;

        return (
          <ChunkMesh
            key={chunk.key}
            chunk={chunk}
            meshData={data}
          />
        );
      })}
    </group>
  );
}

export default ChunkRenderer;
