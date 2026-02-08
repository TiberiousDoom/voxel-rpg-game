/**
 * RiftVisual.jsx — Renders a rift portal visual at a world position
 *
 * Corrupted ground patch + purple glow + particle-like animation
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const RiftVisual = ({ x, z, isNight }) => {
  const glowRef = useRef();
  const ringRef = useRef();

  useFrame((_, delta) => {
    if (glowRef.current) {
      // Pulse the glow intensity
      const t = Date.now() * 0.002;
      const baseIntensity = isNight ? 2.5 : 1.0;
      glowRef.current.intensity = baseIntensity + Math.sin(t) * 0.5;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group position={[x, 0.1, z]}>
      {/* Corrupted ground patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[3, 16]} />
        <meshStandardMaterial
          color="#1a0033"
          emissive="#330066"
          emissiveIntensity={0.3}
          roughness={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Spinning ring */}
      <group ref={ringRef} position={[0, 0.5, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2, 0.15, 8, 24]} />
          <meshStandardMaterial
            color="#6622aa"
            emissive="#9944ff"
            emissiveIntensity={isNight ? 1.5 : 0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>

      {/* Central pillar glow */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 3, 8]} />
        <meshStandardMaterial
          color="#440088"
          emissive="#8833ff"
          emissiveIntensity={isNight ? 2 : 0.8}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Point light */}
      <pointLight
        ref={glowRef}
        color="#9944ff"
        intensity={isNight ? 2.5 : 1.0}
        distance={15}
        decay={2}
        position={[0, 2, 0]}
      />
    </group>
  );
};

export default React.memo(RiftVisual);
