/**
 * RiftVisual.jsx — Renders a rift portal visual at a world position
 *
 * Supports rift states:
 *   ACTIVE: Full purple glow + spinning ring + spiral particles
 *   CLOSING: Dimming based on corruptionProgress + purification anchor (gold torus)
 *   WOUNDED: Flickering, reduced glow, no anchor
 *   CLOSED: Not rendered (filtered out before reaching this component)
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import RiftParticles from './RiftParticles';

const anchorGeo = new THREE.TorusGeometry(2, 0.2, 8, 24);

const RiftVisual = ({
  x, y = 0.1, z, isNight,
  state = 'ACTIVE',
  corruptionProgress = 1.0,
  anchorHealth = 0,
}) => {
  const glowRef = useRef();
  const ringRef = useRef();
  const anchorRef = useRef();

  const isClosing = state === 'CLOSING';
  const isWounded = state === 'WOUNDED';
  const scale = isClosing ? 0.3 + corruptionProgress * 0.7 : (isWounded ? 0.5 : 1.0);
  const anchorOpacity = isClosing ? (anchorHealth / 100) * 0.8 + 0.2 : 0;

  useFrame((_, delta) => {
    if (glowRef.current) {
      const t = Date.now() * 0.002;
      const baseIntensity = isNight ? 4.0 : 1.0;
      const flicker = isWounded ? Math.random() * 0.5 : 0;
      glowRef.current.intensity = (baseIntensity + Math.sin(t) * 0.5) * scale - flicker;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * (isClosing ? 1.5 : 0.5);
    }
    if (anchorRef.current) {
      anchorRef.current.rotation.y += delta * 2;
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Corrupted ground patch (shrinks as corruption fades) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} scale={[scale, scale, 1]}>
        <circleGeometry args={[9, 16]} />
        <meshStandardMaterial
          color="#0d0a0f"
          emissive="#1e0d26"
          emissiveIntensity={0.3 * scale}
          roughness={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Spinning ring (scales with corruption) */}
      <group ref={ringRef} position={[0, 0.5, 0]} scale={[scale, scale, scale]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[6, 0.45, 8, 24]} />
          <meshStandardMaterial
            color="#1e0d26"
            emissive="#3b1a4a"
            emissiveIntensity={(isNight ? 2.25 : 0.5) * scale}
            transparent
            opacity={0.7 * scale}
          />
        </mesh>
      </group>

      {/* Central pillar glow (fades during closing) */}
      <mesh position={[0, 10 * scale, 0]} scale={[scale, scale, scale]}>
        <cylinderGeometry args={[0.9, 1.5, 20, 8]} />
        <meshStandardMaterial
          color="#1e0d26"
          emissive="#3b1a4a"
          emissiveIntensity={(isNight ? 3 : 0.8) * scale}
          transparent
          opacity={0.4 * scale}
        />
      </mesh>

      {/* Spiral particles */}
      <RiftParticles isNight={isNight} />

      {/* Main point light (dimmer during closing) */}
      <pointLight
        ref={glowRef}
        color={isClosing ? '#886644' : '#3b1a4a'}
        intensity={(isNight ? 4.0 : 1.0) * scale}
        distance={25}
        decay={2}
        position={[0, 5, 0]}
      />

      {/* Ground-level purple glow (night only, not during closing) */}
      {isNight && !isClosing && (
        <pointLight
          color="#1e0d26"
          intensity={1.5}
          distance={20}
          decay={2}
          position={[0, 0.5, 0]}
        />
      )}

      {/* Purification anchor (visible during CLOSING) */}
      {isClosing && (
        <group position={[0, 1.5, 0]}>
          <mesh
            ref={anchorRef}
            geometry={anchorGeo}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <meshStandardMaterial
              color="#ffcc44"
              emissive="#ff8800"
              emissiveIntensity={1.5}
              transparent
              opacity={anchorOpacity}
            />
          </mesh>
          <pointLight
            color="#ffcc44"
            intensity={2 * anchorOpacity}
            distance={15}
            decay={2}
          />
        </group>
      )}
    </group>
  );
};

export default React.memo(RiftVisual);
