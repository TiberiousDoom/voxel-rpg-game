/**
 * SettlerNPC — 3D voxel humanoid for settlement NPCs.
 *
 * Kinematic body (we control position, not physics). Walks toward target,
 * idle-wanders, shows status indicators. Combat system ignores these
 * (userData.isNPC, NOT isEnemy).
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { NPC_WALK_SPEED, NPC_APPROACH_SPEED } from '../../data/tuning';
import { VOXEL_SIZE, CHUNK_SIZE_Y } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';

// Pre-allocated vectors
const _targetVec = new THREE.Vector3();
const _currentVec = new THREE.Vector3();
const _dirVec = new THREE.Vector3();

// Shared geometries
const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
const hairGeo = new THREE.BoxGeometry(0.62, 0.15, 0.62);
const bodyGeo = new THREE.BoxGeometry(0.7, 0.9, 0.5);
const legGeo = new THREE.BoxGeometry(0.25, 0.6, 0.25);
const indicatorGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const statusGeo = new THREE.SphereGeometry(0.12, 6, 6);

// Status colors
const STATUS_COLORS = {
  APPROACHING: '#ff8800',
  IDLE: '#44cc44',
  WANDERING: '#44cc44',
  EATING: '#ffcc00',
  SLEEPING: '#8844cc',
  WORKING: '#4488ff',
};

function getTerrainY(chunkManager, wx, wz) {
  if (!chunkManager) return null;
  for (let vy = CHUNK_SIZE_Y - 1; vy >= 0; vy--) {
    const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
    const block = chunkManager.getBlock(wx, worldY, wz);
    if (isSolid(block)) {
      return (vy + 1) * VOXEL_SIZE;
    }
  }
  return 2; // fallback
}

const SettlerNPC = React.memo(({ npcData }) => {
  const bodyRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const walkPhase = useRef(0);
  const lastTerrainCheck = useRef(0);
  const terrainY = useRef(npcData.position[1]);

  // Materials (memoized per NPC)
  const materials = useMemo(() => ({
    skin: new THREE.MeshLambertMaterial({ color: new THREE.Color(...npcData.appearance.skinColor) }),
    hair: new THREE.MeshLambertMaterial({ color: new THREE.Color(...npcData.appearance.hairColor) }),
    clothing: new THREE.MeshLambertMaterial({ color: new THREE.Color(...npcData.appearance.clothingPrimary) }),
    clothingAlt: new THREE.MeshLambertMaterial({ color: new THREE.Color(...npcData.appearance.clothingSecondary) }),
    indicator: new THREE.MeshBasicMaterial({ color: '#4488ff' }),
    status: new THREE.MeshBasicMaterial({ color: STATUS_COLORS[npcData.state] || '#44cc44' }),
  }), [npcData.appearance, npcData.state]);

  useFrame((_, delta) => {
    if (!bodyRef.current) return;

    const store = useGameStore.getState();
    const npc = store.settlement.npcs.find((n) => n.id === npcData.id);
    if (!npc) return;

    const rb = bodyRef.current;
    const pos = rb.translation();

    // Terrain Y clamping (check every 500ms, max 1-block step)
    const now = Date.now();
    if (now - lastTerrainCheck.current > 500) {
      lastTerrainCheck.current = now;
      const chunkMgr = store._chunkManager;
      if (chunkMgr) {
        const ty = getTerrainY(chunkMgr, pos.x, pos.z);
        if (ty !== null) {
          const diff = ty - terrainY.current;
          // Allow stepping down freely, but limit step-up to 1 block (VOXEL_SIZE)
          if (diff <= VOXEL_SIZE) {
            terrainY.current = ty;
          }
          // If too steep upward, don't update — NPC stays at current height
        }
      }
    }

    let moving = false;

    if (npc.targetPosition) {
      // Move toward target
      _targetVec.set(npc.targetPosition[0], 0, npc.targetPosition[2]);
      _currentVec.set(pos.x, 0, pos.z);
      const dist = _currentVec.distanceTo(_targetVec);

      if (dist < 1.5) {
        // Arrived
        store.updateSettlementNPC(npc.id, {
          targetPosition: null,
          arrivedAtSettlement: true,
          state: 'IDLE',
          stateTimer: 0,
        });
      } else {
        moving = true;
        const speed = npc.state === 'APPROACHING' ? NPC_APPROACH_SPEED : NPC_WALK_SPEED;
        _dirVec.subVectors(_targetVec, _currentVec).normalize();
        const step = speed * delta;

        const newX = pos.x + _dirVec.x * step;
        const newZ = pos.z + _dirVec.z * step;

        rb.setNextKinematicTranslation({
          x: newX,
          y: terrainY.current,
          z: newZ,
        });

        // Update facing
        const angle = Math.atan2(_dirVec.x, _dirVec.z);
        store.updateSettlementNPC(npc.id, {
          position: [newX, terrainY.current, newZ],
          facingAngle: angle,
        });
      }
    } else {
      // Clamp to terrain when stationary
      rb.setNextKinematicTranslation({ x: pos.x, y: terrainY.current, z: pos.z });

      // Sync position back
      if (Math.abs(pos.y - terrainY.current) > 0.5) {
        store.updateSettlementNPC(npc.id, {
          position: [pos.x, terrainY.current, pos.z],
        });
      }
    }

    // Walk animation
    if (moving) {
      walkPhase.current += delta * 8;
      const swing = Math.sin(walkPhase.current) * 0.5;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    } else {
      walkPhase.current = 0;
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
    }

    // Update status color
    const stateColor = STATUS_COLORS[npc.state] || '#44cc44';
    materials.status.color.set(stateColor);
  });

  return (
    <RigidBody
      ref={bodyRef}
      position={npcData.position}
      type="kinematicPosition"
      colliders={false}
      userData={{ isNPC: true, npcId: npcData.id }}
    >
      <CapsuleCollider args={[0.6, 0.35]} position={[0, 1.2, 0]} />
      <group rotation={[0, npcData.facingAngle || 0, 0]}>
        {/* Head */}
        <mesh geometry={headGeo} material={materials.skin} position={[0, 2.1, 0]} />
        {/* Hair */}
        <mesh geometry={hairGeo} material={materials.hair} position={[0, 2.45, 0]} />
        {/* Body */}
        <mesh geometry={bodyGeo} material={materials.clothing} position={[0, 1.35, 0]} />
        {/* Left leg */}
        <group ref={leftLegRef} position={[-0.18, 0.6, 0]}>
          <mesh geometry={legGeo} material={materials.clothingAlt} position={[0, 0, 0]} />
        </group>
        {/* Right leg */}
        <group ref={rightLegRef} position={[0.18, 0.6, 0]}>
          <mesh geometry={legGeo} material={materials.clothingAlt} position={[0, 0, 0]} />
        </group>
      </group>

      {/* NPC indicator (blue cube above head) */}
      <mesh geometry={indicatorGeo} material={materials.indicator} position={[0, 2.8, 0]} />
      {/* State indicator (small sphere) */}
      <mesh geometry={statusGeo} material={materials.status} position={[0.25, 2.8, 0]} />
    </RigidBody>
  );
});

SettlerNPC.displayName = 'SettlerNPC';

export default SettlerNPC;
