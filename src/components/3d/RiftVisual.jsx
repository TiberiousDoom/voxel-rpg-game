/**
 * RiftVisual.jsx — Renders a rift portal visual at a world position
 *
 * Corrupted ground patch + purple glow + spiral particles + enhanced night glow
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import RiftParticles from './RiftParticles';

const RiftVisual = ({ x, y = 0.1, z, isNight }) => {
  const glowRef = useRef();
  const ringRef = useRef();

  useFrame((_, delta) => {
    if (glowRef.current) {
      // Pulse the glow intensity
      const t = Date.now() * 0.002;
      const baseIntensity = isNight ? 4.0 : 1.0;
      glowRef.current.intensity = baseIntensity + Math.sin(t) * 0.5;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Corrupted ground patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[9, 16]} />
        <meshStandardMaterial
          color="#0d0a0f"
          emissive="#1e0d26"
          emissiveIntensity={0.3}
          roughness={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Spinning ring */}
      <group ref={ringRef} position={[0, 0.5, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[6, 0.45, 8, 24]} />
          <meshStandardMaterial
            color="#1e0d26"
            emissive="#3b1a4a"
            emissiveIntensity={isNight ? 2.25 : 0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>

      {/* Central pillar glow */}
      <mesh position={[0, 10, 0]}>
        <cylinderGeometry args={[0.9, 1.5, 20, 8]} />
        <meshStandardMaterial
          color="#1e0d26"
          emissive="#3b1a4a"
          emissiveIntensity={isNight ? 3 : 0.8}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Spiral particles */}
      <RiftParticles isNight={isNight} />

      {/* Main point light */}
      <pointLight
        ref={glowRef}
        color="#3b1a4a"
        intensity={isNight ? 4.0 : 1.0}
        distance={25}
        decay={2}
        position={[0, 5, 0]}
      />

      {/* Ground-level purple glow (night only) */}
      {isNight && (
        <pointLight
          color="#1e0d26"
          intensity={1.5}
          distance={20}
          decay={2}
          position={[0, 0.5, 0]}
        />
      )}
    </group>
  );
};

export default React.memo(RiftVisual);
