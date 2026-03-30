/**
 * SettlerNPC — 3D voxel humanoid for settlement NPCs.
 *
 * Kinematic body (we control position, not physics). Walks toward target,
 * idle-wanders, shows status indicators. Combat system ignores these
 * (userData.isNPC, NOT isEnemy).
 *
 * Phase 2.5: Added arms, work animations, thought bubbles, hauling visuals.
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { NPC_WALK_SPEED, NPC_APPROACH_SPEED, NPC_HAUL_SPEED } from '../../data/tuning';
import { VOXEL_SIZE, CHUNK_SIZE_Y } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';
import NPCThoughtBubble from './NPCThoughtBubble';

// Pre-allocated vectors
const _targetVec = new THREE.Vector3();
const _currentVec = new THREE.Vector3();
const _dirVec = new THREE.Vector3();

// Shared geometries
const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
const hairGeo = new THREE.BoxGeometry(0.62, 0.15, 0.62);
const bodyGeo = new THREE.BoxGeometry(0.7, 0.9, 0.5);
const legGeo = new THREE.BoxGeometry(0.25, 0.6, 0.25);
const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
const indicatorGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const statusGeo = new THREE.SphereGeometry(0.12, 6, 6);
const carryGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);

// Status colors
const STATUS_COLORS = {
  APPROACHING: '#ff8800',
  IDLE: '#44cc44',
  WANDERING: '#44cc44',
  EATING: '#ffcc00',
  SLEEPING: '#8844cc',
  WORKING: '#4488ff',
  HAULING: '#4488ff',
  BUILDING: '#ff8844',
  WORKING_MINE: '#ff8c00',
  WORKING_HAUL: '#ffcc00',
  WORKING_BUILD: '#4488ff',
  EVALUATING: '#00ccff',
  SOCIALIZING: '#ff88ff',
  LEAVING: '#ff4444',
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
  const groupRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const walkPhase = useRef(0);
  const workPhase = useRef(0);
  const lastTerrainCheck = useRef(0);
  const terrainY = useRef(npcData.position[1]);
  const evalRotation = useRef(0);
  const npcIndexRef = useRef(0);

  // Materials (memoized per NPC, stable across state changes)
  const materials = useMemo(() => ({
    skin: new THREE.MeshLambertMaterial({ color: new THREE.Color(...npcData.appearance.skinColor) }),
    hair: new THREE.MeshLambertMaterial({ color: new THREE.Color(...npcData.appearance.hairColor) }),
    clothing: new THREE.MeshLambertMaterial({ color: new THREE.Color(...npcData.appearance.clothingPrimary) }),
    clothingAlt: new THREE.MeshLambertMaterial({ color: new THREE.Color(...npcData.appearance.clothingSecondary) }),
    indicator: new THREE.MeshBasicMaterial({ color: '#4488ff' }),
    status: new THREE.MeshBasicMaterial({ color: '#44cc44' }), // color updated in useFrame
    carry: new THREE.MeshBasicMaterial({ color: '#ddaa44' }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [npcData.appearance]);

  // Dispose materials on unmount
  useEffect(() => {
    return () => Object.values(materials).forEach(m => m.dispose());
  }, [materials]);

  useFrame((_, delta) => {
    if (!bodyRef.current) return;

    const store = useGameStore.getState();
    // Fast path: check cached index first, fall back to find()
    const npcs = store.settlement.npcs;
    let npc = npcs[npcIndexRef.current];
    if (!npc || npc.id !== npcData.id) {
      const idx = npcs.findIndex((n) => n.id === npcData.id);
      if (idx === -1) return;
      npcIndexRef.current = idx;
      npc = npcs[idx];
    }

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

    // State transitions (APPROACHING→EVALUATING, WANDERING→IDLE, LEAVING→remove)
    // are handled by NPCStateMachine.tickNPC() in the module layer.
    // This component only handles movement, rendering, and position writes.

    if (npc.targetPosition) {
      // Move toward target
      _targetVec.set(npc.targetPosition[0], 0, npc.targetPosition[2]);
      _currentVec.set(pos.x, 0, pos.z);
      const dist = _currentVec.distanceTo(_targetVec);

      if (dist < 1.5) {
        // Arrived at target
        if (npc.state === 'APPROACHING' && (npc.stateTimer || 0) <= 60) {
          // Transition to EVALUATING (skip if SettlementTick already timed out to LEAVING)
          store.updateSettlementNPC(npc.id, {
            targetPosition: null,
            arrivedAtSettlement: true,
            state: 'EVALUATING',
            stateTimer: 0,
          });
        } else if (npc.state === 'WANDERING' || npc.state === 'SOCIALIZING') {
          store.updateSettlementNPC(npc.id, {
            targetPosition: null,
            arrivedAtSettlement: true,
            state: 'IDLE',
            stateTimer: npc.state === 'WANDERING' ? 0 : npc.stateTimer,
          });
        }
        // Work states: don't clear targetPosition here — SettlementTick handles arrival
      } else {
        // Determine speed based on state
        let speed = NPC_WALK_SPEED;
        if (npc.state === 'APPROACHING' || npc.state === 'LEAVING') {
          speed = NPC_APPROACH_SPEED;
        } else if (npc.state === 'HAULING' || (npc.state === 'WORKING_HAUL' && npc.carryingItem)) {
          speed = NPC_HAUL_SPEED;
        }

        _dirVec.subVectors(_targetVec, _currentVec).normalize();
        const step = speed * delta;

        const newX = pos.x + _dirVec.x * step;
        const newZ = pos.z + _dirVec.z * step;

        // Check for solid blocks at feet and torso height before moving
        const chunkMgr = store._chunkManager;
        let blocked = false;
        let stepUp = false;
        if (chunkMgr) {
          const feetY = terrainY.current + VOXEL_SIZE / 2;
          const torsoY = terrainY.current + VOXEL_SIZE + VOXEL_SIZE / 2;
          const feetSolid = isSolid(chunkMgr.getBlock(newX, feetY, newZ));
          const torsoSolid = isSolid(chunkMgr.getBlock(newX, torsoY, newZ));

          if (feetSolid && !torsoSolid) {
            // 1-block obstacle — check if headroom is clear above the step
            const aboveStepY = terrainY.current + VOXEL_SIZE * 2 + VOXEL_SIZE / 2;
            if (!isSolid(chunkMgr.getBlock(newX, aboveStepY, newZ))) {
              stepUp = true; // auto-step up
            } else {
              blocked = true;
            }
          } else if (torsoSolid) {
            blocked = true; // 2+ block wall, can't pass
          }
        }

        if (!blocked) {
          moving = true;
          const moveY = stepUp ? terrainY.current + VOXEL_SIZE : terrainY.current;
          if (stepUp) terrainY.current = moveY;

          rb.setNextKinematicTranslation({
            x: newX,
            y: moveY,
            z: newZ,
          });

          // Update facing
          const angle = Math.atan2(_dirVec.x, _dirVec.z);
          store.updateSettlementNPC(npc.id, {
            position: [newX, moveY, newZ],
            facingAngle: angle,
          });
        }
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

    // EVALUATING: slow look-around rotation
    if (npc.state === 'EVALUATING' && groupRef.current) {
      evalRotation.current += delta * 1.2;
      groupRef.current.rotation.y = Math.sin(evalRotation.current) * 1.0;
    } else if (groupRef.current) {
      // Reset to facing angle
      groupRef.current.rotation.y = npc.facingAngle || 0;
      evalRotation.current = 0;
    }

    // ── Animations ──
    const time = now / 1000;

    // Walk animation (legs + subtle arm counterswing)
    if (moving) {
      walkPhase.current += delta * 8;
      const swing = Math.sin(walkPhase.current) * 0.5;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      // Subtle arm counterswing when walking (unless in a work state)
      if (!npc.state?.startsWith('WORKING_')) {
        if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.4;
        if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.4;
      }
    } else {
      walkPhase.current = 0;
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (!npc.state?.startsWith('WORKING_')) {
        if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
        if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
      }
    }

    // Work animations (specific work states override walk arm swing)
    if (npc.state === 'WORKING_MINE') {
      // Right arm swings down (pickaxe motion)
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(time * 6) * 0.8;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
    } else if (npc.state === 'WORKING_BUILD') {
      // Right arm taps forward (hammer motion)
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(time * 4) * 0.6;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
    } else if (npc.state === 'WORKING_HAUL' && npc.carryingItem) {
      // Both arms angled forward ~45deg
      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.8;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.8;
    } else if (npc.state === 'HAULING' || npc.state === 'BUILDING') {
      // Legacy work states — phase-based arm swing
      workPhase.current += delta * 6;
      const swing = Math.sin(workPhase.current) * 0.8;
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.3;
    } else if (!moving) {
      workPhase.current = 0;
    }

    // Sleeping visual — lay NPC on side
    if (npc.state === 'SLEEPING' && groupRef.current) {
      groupRef.current.rotation.z = Math.PI / 2;
    } else if (groupRef.current && npc.state !== 'EVALUATING') {
      groupRef.current.rotation.z = 0;
    }

    // Update status color
    const stateColor = STATUS_COLORS[npc.state] || '#44cc44';
    materials.status.color.set(stateColor);
  });

  // Determine thought bubble type from current npc data
  const thoughtType = npcData.thoughtBubble?.type || null;
  const isCarrying = npcData.carryingItem != null;

  return (
    <RigidBody
      ref={bodyRef}
      position={npcData.position}
      type="kinematicPosition"
      colliders={false}
      userData={{ isNPC: true, npcId: npcData.id }}
    >
      <CapsuleCollider args={[0.6, 0.35]} position={[0, 1.2, 0]} />
      <group ref={groupRef} rotation={[0, npcData.facingAngle || 0, 0]}>
        {/* Head */}
        <mesh geometry={headGeo} material={materials.skin} position={[0, 2.1, 0]} />
        {/* Hair */}
        <mesh geometry={hairGeo} material={materials.hair} position={[0, 2.45, 0]} />
        {/* Body */}
        <mesh geometry={bodyGeo} material={materials.clothing} position={[0, 1.35, 0]} />
        {/* Left arm */}
        <group ref={leftArmRef} position={[-0.45, 1.65, 0]}>
          <mesh geometry={armGeo} material={materials.skin} position={[0, -0.3, 0]} />
        </group>
        {/* Right arm */}
        <group ref={rightArmRef} position={[0.45, 1.65, 0]}>
          <mesh geometry={armGeo} material={materials.skin} position={[0, -0.3, 0]} />
        </group>
        {/* Left leg */}
        <group ref={leftLegRef} position={[-0.18, 0.6, 0]}>
          <mesh geometry={legGeo} material={materials.clothingAlt} position={[0, 0, 0]} />
        </group>
        {/* Right leg */}
        <group ref={rightLegRef} position={[0.18, 0.6, 0]}>
          <mesh geometry={legGeo} material={materials.clothingAlt} position={[0, 0, 0]} />
        </group>
        {/* Carrying item (small colored cube at body front) */}
        {isCarrying && (
          <mesh geometry={carryGeo} material={materials.carry} position={[0, 1.2, 0.4]} />
        )}
      </group>

      {/* NPC indicator (blue cube above head) */}
      <mesh geometry={indicatorGeo} material={materials.indicator} position={[0, 2.8, 0]} />
      {/* State indicator (small sphere) */}
      <mesh geometry={statusGeo} material={materials.status} position={[0.25, 2.8, 0]} />

      {/* Thought bubble */}
      <NPCThoughtBubble type={thoughtType} />
    </RigidBody>
  );
});

SettlerNPC.displayName = 'SettlerNPC';

export default SettlerNPC;
