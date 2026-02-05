import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// NOTE: drei Text removed - it caused WebGL shader errors that
// corrupted the rendering pipeline, preventing terrain chunks from drawing.

/**
 * Floating damage number that rises and fades out
 * Uses a simple colored sphere indicator instead of text
 */
const DamageNumber = ({ position, damage, id, onComplete }) => {
  const groupRef = useRef();
  const matRef = useRef();
  const yOffset = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Rise up
    yOffset.current += delta * 2;
    groupRef.current.position.y = position[1] + yOffset.current;

    // Fade out
    const newOpacity = Math.max(0, 1 - yOffset.current / 2);
    if (matRef.current) {
      matRef.current.opacity = newOpacity;
    }

    // Remove when fully faded
    if (newOpacity <= 0) {
      onComplete(id);
    }
  });

  const isCrit = typeof damage === 'string' && damage.includes('CRIT');
  const isCombo = typeof damage === 'string' && damage.includes('COMBO');
  const color = isCrit ? '#ffff00' : isCombo ? '#00ffff' : '#ff4444';
  const size = isCrit ? 0.35 : 0.25;

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      {/* Damage indicator - colored sphere that rises and fades */}
      <mesh>
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial
          ref={matRef}
          color={color}
          transparent
          opacity={1}
          depthTest={false}
        />
      </mesh>
    </group>
  );
};

export default DamageNumber;
