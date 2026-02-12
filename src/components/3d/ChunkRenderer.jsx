/**
 * ChunkRenderer - React component that renders all active chunks
 *
 * Subscribes to ChunkManager and renders chunk meshes as they load/unload.
 * Only nearby chunks (within PHYSICS_DISTANCE) get trimesh physics colliders.
 * Distant chunks render as visual-only meshes for performance.
 * Uses LOD levels for distant chunks to reduce vertex count.
 */

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { chunkOriginWorld, worldToChunk } from '../../systems/chunks/coordinates.js';
import { selectLODLevel, LOD_DISTANCES } from '../../systems/chunks/LODGenerator.js';
import useGameStore from '../../stores/useGameStore';

// Only chunks within this Chebyshev distance get physics colliders
const PHYSICS_DISTANCE = 3;

// LOD hysteresis buffer (in chunks) to prevent thrashing at boundaries
const LOD_HYSTERESIS = 1;

// How often to check for LOD changes (in frames)
const LOD_CHECK_INTERVAL = 30;

/**
 * Create a MeshLambertMaterial with per-vertex emissive support.
 * The aEmissive attribute (0.0–1.0) controls how much of the vertex color
 * bypasses scene lighting, keeping campfire blocks bright at night.
 */
function createEmissiveChunkMaterial() {
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  mat.customProgramCacheKey = () => 'chunk-emissive';
  mat.onBeforeCompile = (shader) => {
    // Vertex shader: pass emissive attribute to fragment
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
attribute float aEmissive;
varying float vEmissive;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <fog_vertex>',
      `#include <fog_vertex>
vEmissive = aEmissive;`
    );

    // Fragment shader: add per-vertex emissive to output
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
varying float vEmissive;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <output_fragment>',
      `#include <output_fragment>
gl_FragColor.rgb += vColor * vEmissive;`
    );
  };

  return mat;
}

// Shared material instances (one per component type to avoid re-creation)
const _physicsMaterial = createEmissiveChunkMaterial();
const _visualMaterial = createEmissiveChunkMaterial();

/**
 * Select LOD level with hysteresis to prevent oscillation at boundaries
 */
function selectLODWithHysteresis(dx, dz, currentLOD) {
  const dist = Math.max(Math.abs(dx), Math.abs(dz));
  const targetLOD = selectLODLevel(dx, dz);

  if (targetLOD === currentLOD) return currentLOD;

  if (targetLOD > currentLOD) {
    // Transitioning to less detail (further away)
    const boundary = LOD_DISTANCES[currentLOD];
    return dist > boundary + LOD_HYSTERESIS ? targetLOD : currentLOD;
  }

  // Transitioning to more detail (closer)
  const boundary = LOD_DISTANCES[targetLOD];
  return dist < boundary - LOD_HYSTERESIS ? targetLOD : currentLOD;
}

/**
 * Build the appropriate worker request based on chunk LOD level
 */
function buildMeshRequest(chunk, lodLevel) {
  if (lodLevel === 0) {
    return {
      type: 'buildMesh',
      blocks: chunk.blocks,
      neighborNorth: chunk.neighbors.north?.blocks || null,
      neighborSouth: chunk.neighbors.south?.blocks || null,
      neighborEast: chunk.neighbors.east?.blocks || null,
      neighborWest: chunk.neighbors.west?.blocks || null,
    };
  }
  return {
    type: 'buildLODMesh',
    blocks: chunk.blocks,
    lodLevel,
  };
}

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
    // Per-vertex emissive factor for campfire glow (0=none, 1=full)
    if (meshData.emissive) {
      geo.setAttribute('aEmissive', new THREE.BufferAttribute(new Float32Array(meshData.emissive), 1));
    }
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
      <mesh geometry={geometry} frustumCulled={false} material={_physicsMaterial} />
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
      <mesh geometry={geometry} frustumCulled={false} material={_visualMaterial} />
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
  const chunkLODRef = useRef(new Map()); // chunk key -> current LOD level
  const playerChunkRef = useRef({ chunkX: 0, chunkZ: 0 });
  const playerPosition = useGameStore((state) => state.player.position);

  // Compute player chunk coordinates (only recalculates when playerPosition changes)
  const playerChunk = useMemo(() => {
    return worldToChunk(playerPosition[0], playerPosition[2]);
  }, [playerPosition]);

  // Keep ref in sync for use in callbacks
  playerChunkRef.current = playerChunk;

  // Handle chunk ready event
  const handleChunkReady = useCallback(async (chunk) => {
    if (workerPool) {
      try {
        // Determine LOD level based on distance from player
        const pc = playerChunkRef.current;
        const dx = chunk.x - pc.chunkX;
        const dz = chunk.z - pc.chunkZ;
        const lodLevel = selectLODLevel(dx, dz);
        chunkLODRef.current.set(chunk.key, lodLevel);

        const result = await workerPool.execute(buildMeshRequest(chunk, lodLevel));

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
    chunkLODRef.current.delete(chunk.key);

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

  // Process mesh rebuilds for dirty chunks and detect LOD changes
  useFrame(() => {
    if (!chunkManager || !workerPool) return;

    frameCountRef.current++;

    // Check for LOD changes periodically
    if (frameCountRef.current % LOD_CHECK_INTERVAL === 0) {
      const pc = playerChunkRef.current;
      for (const chunk of chunks.values()) {
        const dx = chunk.x - pc.chunkX;
        const dz = chunk.z - pc.chunkZ;
        const currentLOD = chunkLODRef.current.get(chunk.key) ?? 0;
        const newLOD = selectLODWithHysteresis(dx, dz, currentLOD);
        if (newLOD !== currentLOD) {
          chunkLODRef.current.set(chunk.key, newLOD);
          chunk.meshDirty = true;
        }
      }
    }

    // Rebuild dirty chunks every 3 frames
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
      const lodLevel = chunkLODRef.current.get(chunkKey) ?? 0;

      const sendTime = performance.now();
      workerPool.execute(buildMeshRequest(chunk, lodLevel)).then(result => {
        const elapsed = performance.now() - sendTime;
        const stats = useGameStore.getState()._debugStats;
        stats.meshRebuilds++;
        stats.meshRebuildMs = elapsed;

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
