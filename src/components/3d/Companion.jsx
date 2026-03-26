/**
 * Companion.jsx — 3D voxel companion that follows the player.
 *
 * Renders a voxel humanoid similar to SettlerNPC but with distinct appearance
 * based on companion type. Shows health bar, bond indicator, and state color.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

// Shared geometries
const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
const armGeo = new THREE.BoxGeometry(0.18, 0.45, 0.18);
const healthBarBgGeo = new THREE.PlaneGeometry(1.0, 0.08);
const healthBarFgGeo = new THREE.PlaneGeometry(1.0, 0.08);
const bondGeo = new THREE.SphereGeometry(0.1, 6, 6);

// Type-specific colors
const TYPE_COLORS = {
  PET: { primary: '#886644', secondary: '#aa8866', skin: '#ccaa88' },
  MERCENARY: { primary: '#444488', secondary: '#666699', skin: '#ddccbb' },
  MAGE: { primary: '#663388', secondary: '#8844aa', skin: '#eeddcc' },
  MOUNT: { primary: '#664422', secondary: '#886644', skin: '#bbaa88' },
  GATHERER: { primary: '#448844', secondary: '#66aa66', skin: '#ddccbb' },
};

// State colors
const STATE_COLORS = {
  IDLE: '#44cc44',
  FOLLOWING: '#44cc44',
  ATTACKING: '#ff4444',
  DEFENDING: '#4488ff',
  GATHERING: '#ffcc00',
  SCOUTING: '#00ccff',
  RESTING: '#8844cc',
  DEAD: '#666666',
};

const Companion = React.memo(() => {
  const groupRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const healthBarRef = useRef();
  const walkPhase = useRef(0);
  const prevPos = useRef([0, 0, 0]);

  const companion = useGameStore((s) => s.companion);

  const colors = TYPE_COLORS[companion.type] || TYPE_COLORS.MAGE;

  const materials = useMemo(() => ({
    skin: new THREE.MeshLambertMaterial({ color: colors.skin }),
    primary: new THREE.MeshLambertMaterial({ color: colors.primary }),
    secondary: new THREE.MeshLambertMaterial({ color: colors.secondary }),
    healthBg: new THREE.MeshBasicMaterial({ color: '#333333', transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
    healthFg: new THREE.MeshBasicMaterial({ color: '#44cc44', side: THREE.DoubleSide }),
    bond: new THREE.MeshBasicMaterial({ color: '#ff6688' }),
    state: new THREE.MeshBasicMaterial({ color: '#44cc44' }),
  }), [colors]);

  useFrame((_, delta) => {
    if (!companion.active) return;

    const pos = companion.position;
    const dx = pos[0] - prevPos.current[0];
    const dz = pos[2] - prevPos.current[2];
    const moving = Math.abs(dx) + Math.abs(dz) > 0.05;
    prevPos.current = [...pos];

    // Walk animation
    if (moving) {
      walkPhase.current += delta * 7;
      const swing = Math.sin(walkPhase.current) * 0.4;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.3;
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.3;

      // Face movement direction
      if (groupRef.current && (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01)) {
        groupRef.current.rotation.y = Math.atan2(dx, dz);
      }
    } else {
      walkPhase.current = 0;
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
    }

    // Health bar scale
    if (healthBarRef.current) {
      const healthPct = companion.maxHealth > 0 ? companion.health / companion.maxHealth : 1;
      healthBarRef.current.scale.x = Math.max(0.01, healthPct);
      healthBarRef.current.position.x = -(1 - healthPct) * 0.5;
      materials.healthFg.color.set(healthPct > 0.5 ? '#44cc44' : healthPct > 0.25 ? '#ffcc00' : '#ff4444');
    }

    // State color
    const stateColor = STATE_COLORS[companion.state] || '#44cc44';
    materials.state.color.set(stateColor);

    // Bond indicator size (scales with bond level)
    // Bond visual handled by scale in JSX
  });

  if (!companion.active) return null;

  const bondScale = 0.5 + (companion.bondLevel / 100) * 1.5;

  return (
    <group position={companion.position}>
      <group ref={groupRef}>
        {/* Head */}
        <mesh geometry={headGeo} material={materials.skin} position={[0, 1.85, 0]} />
        {/* Body */}
        <mesh geometry={bodyGeo} material={materials.primary} position={[0, 1.2, 0]} />
        {/* Left arm */}
        <group ref={leftArmRef} position={[-0.4, 1.35, 0]}>
          <mesh geometry={armGeo} material={materials.secondary} position={[0, -0.22, 0]} />
        </group>
        {/* Right arm */}
        <group ref={rightArmRef} position={[0.4, 1.35, 0]}>
          <mesh geometry={armGeo} material={materials.secondary} position={[0, -0.22, 0]} />
        </group>
        {/* Left leg */}
        <group ref={leftLegRef} position={[-0.15, 0.55, 0]}>
          <mesh geometry={legGeo} material={materials.secondary} position={[0, 0, 0]} />
        </group>
        {/* Right leg */}
        <group ref={rightLegRef} position={[0.15, 0.55, 0]}>
          <mesh geometry={legGeo} material={materials.secondary} position={[0, 0, 0]} />
        </group>
      </group>

      {/* Health bar */}
      <group position={[0, 2.4, 0]} rotation={[0, 0, 0]}>
        <mesh geometry={healthBarBgGeo} material={materials.healthBg} />
        <mesh ref={healthBarRef} geometry={healthBarFgGeo} material={materials.healthFg} position={[0, 0, 0.001]} />
      </group>

      {/* Bond indicator (pink heart that grows) */}
      <mesh
        geometry={bondGeo}
        material={materials.bond}
        position={[0.4, 2.4, 0]}
        scale={[bondScale, bondScale, bondScale]}
      />

      {/* State indicator */}
      <mesh
        geometry={bondGeo}
        material={materials.state}
        position={[-0.4, 2.4, 0]}
      />
    </group>
  );
});

Companion.displayName = 'Companion';

export default Companion;
