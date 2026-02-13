import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { WILDLIFE_TYPES } from '../../data/wildlifeTypes';
import {
  WILDLIFE_WANDER_RADIUS,
  WILDLIFE_WANDER_INTERVAL_MIN,
  WILDLIFE_WANDER_INTERVAL_MAX,
} from '../../data/tuning';
import { VOXEL_SIZE, CHUNK_SIZE_Y } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';

function getTerrainHeight(chunkManager, wx, wz) {
  if (!chunkManager) return null;
  for (let vy = CHUNK_SIZE_Y - 1; vy >= 0; vy--) {
    const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
    const block = chunkManager.getBlock(wx, worldY, wz);
    if (isSolid(block)) {
      return (vy + 1) * VOXEL_SIZE;
    }
  }
  return null;
}

const _playerVec = new THREE.Vector3();
const _animalVec = new THREE.Vector3();
const _moveDir = new THREE.Vector3();

/**
 * Merge all animal body parts into a single BufferGeometry with vertex colors.
 * Reduces draw calls from ~10 per animal to 1.
 */
function buildAnimalGeometry(typeDef) {
  const [w, h, d] = typeDef.size;
  const baseColor = new THREE.Color(typeDef.color[0], typeDef.color[1], typeDef.color[2]);
  const headColor = baseColor.clone().offsetHSL(0, 0, 0.1);
  const eyeColor = new THREE.Color(0.07, 0.07, 0.07);

  const parts = [];

  // Helper: create a positioned box with a color
  function addBox(sx, sy, sz, px, py, pz, color) {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    geo.translate(px, py, pz);
    // Apply vertex colors
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(geo);
  }

  // Helper: create a positioned sphere with a color
  function addSphere(radius, px, py, pz, color) {
    const geo = new THREE.SphereGeometry(radius, 6, 6);
    geo.translate(px, py, pz);
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    parts.push(geo);
  }

  // Body
  addBox(w, h * 0.6, d, 0, h * 0.5, 0, baseColor);
  // Head
  addBox(w * 0.55, h * 0.4, w * 0.45, 0, h * 0.7, d * 0.5 + w * 0.15, headColor);
  // Eyes
  addSphere(w * 0.06, -w * 0.15, h * 0.75, d * 0.5 + w * 0.38, eyeColor);
  addSphere(w * 0.06, w * 0.15, h * 0.75, d * 0.5 + w * 0.38, eyeColor);
  // Tail
  addBox(w * 0.15, w * 0.15, w * 0.3, 0, h * 0.45, -d * 0.5 - w * 0.1, baseColor);

  const legOffset = w * 0.35;
  const legHeight = h * 0.25;

  if (typeDef.ground) {
    // 4 legs
    addBox(w * 0.15, legHeight, w * 0.15, -legOffset, legHeight * 0.5, d * 0.25, baseColor);
    addBox(w * 0.15, legHeight, w * 0.15, legOffset, legHeight * 0.5, d * 0.25, baseColor);
    addBox(w * 0.15, legHeight, w * 0.15, -legOffset, legHeight * 0.5, -d * 0.25, baseColor);
    addBox(w * 0.15, legHeight, w * 0.15, legOffset, legHeight * 0.5, -d * 0.25, baseColor);
  } else {
    // 2 wings
    addBox(w * 0.7, 0.05, d * 0.8, -w * 0.6, h * 0.6, 0, baseColor);
    addBox(w * 0.7, 0.05, d * 0.8, w * 0.6, h * 0.6, 0, baseColor);
  }

  // Merge all parts into one geometry
  const merged = mergeGeometries(parts);
  // Dispose temporary parts
  parts.forEach(g => g.dispose());
  return merged;
}

/**
 * Minimal mergeGeometries — combines an array of indexed BufferGeometries
 * into a single BufferGeometry. All must share the same attributes.
 */
function mergeGeometries(geometries) {
  let totalVerts = 0;
  let totalIndices = 0;
  for (const g of geometries) {
    totalVerts += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : g.attributes.position.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);
  const indices = new Uint16Array(totalIndices);

  let vertOffset = 0;
  let idxOffset = 0;

  for (const g of geometries) {
    const pos = g.attributes.position.array;
    const nor = g.attributes.normal.array;
    const col = g.attributes.color.array;
    const vCount = g.attributes.position.count;

    positions.set(pos, vertOffset * 3);
    normals.set(nor, vertOffset * 3);
    colors.set(col, vertOffset * 3);

    if (g.index) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) {
        indices[idxOffset + i] = idx[i] + vertOffset;
      }
      idxOffset += idx.length;
    } else {
      for (let i = 0; i < vCount; i++) {
        indices[idxOffset + i] = vertOffset + i;
      }
      idxOffset += vCount;
    }
    vertOffset += vCount;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

// Cache merged geometry per animal type
const _geoCache = {};
function getAnimalGeometry(typeDef, typeKey) {
  if (_geoCache[typeKey]) return _geoCache[typeKey];
  const geo = buildAnimalGeometry(typeDef);
  _geoCache[typeKey] = geo;
  return geo;
}

const WildlifeAnimal = React.memo(({ animalData, chunkManager }) => {
  const bodyRef = useRef();
  const stateRef = useRef('IDLE');
  const wanderTimerRef = useRef(Math.random() * WILDLIFE_WANDER_INTERVAL_MAX);
  const targetRef = useRef(null);
  const rotationRef = useRef(0);
  const groupRef = useRef();
  const flyPhase = useRef(Math.random() * Math.PI * 2);

  const typeDef = WILDLIFE_TYPES[animalData.type];
  const mergedGeo = useMemo(
    () => typeDef ? getAnimalGeometry(typeDef, animalData.type) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [animalData.type]
  );

  const [, h] = typeDef ? typeDef.size : [0.5, 0.5, 0.5];

  useFrame((state, delta) => {
    if (!bodyRef.current || !typeDef) return;
    const body = bodyRef.current;
    const pos = body.translation();

    const store = useGameStore.getState();
    const playerPos = store.player.position;
    if (!playerPos) return;

    _playerVec.set(playerPos[0], playerPos[1], playerPos[2]);
    _animalVec.set(pos.x, pos.y, pos.z);
    const distToPlayer = _playerVec.distanceTo(_animalVec);

    // Flee check (prey animals)
    if (typeDef.fleeRange > 0 && distToPlayer < typeDef.fleeRange) {
      stateRef.current = 'FLEEING';
      _moveDir.set(pos.x - playerPos[0], 0, pos.z - playerPos[2]).normalize();
      const fleeSpeed = typeDef.speed * 1.5;
      body.setLinvel(
        { x: _moveDir.x * fleeSpeed, y: body.linvel().y, z: _moveDir.z * fleeSpeed },
        true
      );
      rotationRef.current = Math.atan2(_moveDir.x, _moveDir.z);
    } else if (stateRef.current === 'FLEEING') {
      stateRef.current = 'IDLE';
      wanderTimerRef.current = WILDLIFE_WANDER_INTERVAL_MIN;
    }

    if (stateRef.current === 'IDLE') {
      const vel = body.linvel();
      body.setLinvel({ x: vel.x * 0.85, y: vel.y, z: vel.z * 0.85 }, true);

      wanderTimerRef.current -= delta;
      if (wanderTimerRef.current <= 0) {
        const sx = animalData.spawnPosition[0];
        const sz = animalData.spawnPosition[2];
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * WILDLIFE_WANDER_RADIUS;
        targetRef.current = [sx + Math.cos(angle) * r, sz + Math.sin(angle) * r];
        stateRef.current = 'WANDERING';
      }
    }

    if (stateRef.current === 'WANDERING' && targetRef.current) {
      const [tx, tz] = targetRef.current;
      const dx = tx - pos.x;
      const dz = tz - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 1.5) {
        stateRef.current = 'IDLE';
        wanderTimerRef.current =
          WILDLIFE_WANDER_INTERVAL_MIN +
          Math.random() * (WILDLIFE_WANDER_INTERVAL_MAX - WILDLIFE_WANDER_INTERVAL_MIN);
        targetRef.current = null;
        const vel = body.linvel();
        body.setLinvel({ x: vel.x * 0.5, y: vel.y, z: vel.z * 0.5 }, true);
      } else {
        const nx = dx / dist;
        const nz = dz / dist;
        body.setLinvel(
          { x: nx * typeDef.speed, y: body.linvel().y, z: nz * typeDef.speed },
          true
        );
        rotationRef.current = Math.atan2(nx, nz);
      }
    }

    // Ground clamping
    if (typeDef.ground && chunkManager) {
      const terrainY = getTerrainHeight(chunkManager, pos.x, pos.z);
      if (terrainY != null) {
        const targetY = terrainY + h * 0.5;
        if (pos.y < targetY - 1 || pos.y > targetY + 2) {
          body.setTranslation({ x: pos.x, y: targetY, z: pos.z }, true);
          body.setLinvel({ x: body.linvel().x, y: 0, z: body.linvel().z }, true);
        }
      }
    }

    // Flying animals: vertical oscillation
    if (!typeDef.ground) {
      flyPhase.current += delta * 0.8;
      const baseAlt = animalData.spawnPosition[1];
      const oscY = Math.sin(flyPhase.current) * 2;
      const targetY = baseAlt + oscY;
      const vel = body.linvel();
      const yDiff = targetY - pos.y;
      body.setLinvel({ x: vel.x, y: yDiff * 2, z: vel.z }, true);
    }

    // Update position on the data object directly (avoids store churn)
    animalData.position[0] = pos.x;
    animalData.position[1] = pos.y;
    animalData.position[2] = pos.z;

    // Apply rotation
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationRef.current;
    }
  });

  if (!typeDef || !mergedGeo) return null;

  return (
    <RigidBody
      ref={bodyRef}
      position={animalData.position}
      enabledRotations={[false, false, false]}
      type="dynamic"
      colliders="cuboid"
      mass={0.3}
      linearDamping={0.5}
      gravityScale={typeDef.ground ? 1 : 0}
    >
      <group ref={groupRef}>
        {/* Single merged mesh for the entire animal body (1 draw call) */}
        <mesh geometry={mergedGeo}>
          <meshStandardMaterial vertexColors />
        </mesh>
      </group>
    </RigidBody>
  );
});

export default WildlifeAnimal;
