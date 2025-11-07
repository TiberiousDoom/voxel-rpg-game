import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

/**
 * Projectile component - For spells and ranged attacks
 */
const Projectile = ({ id, position, direction, speed = 20, color = '#ff6b00' }) => {
  const meshRef = useRef();
  const velocity = useRef(new THREE.Vector3(...direction).normalize().multiplyScalar(speed));
  const currentPosition = useRef(new THREE.Vector3(...position));
  const lifetime = useRef(0);

  const removeProjectile = useGameStore((state) => state.removeProjectile);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Update position
    currentPosition.current.add(velocity.current.clone().multiplyScalar(delta));
    meshRef.current.position.copy(currentPosition.current);

    // Update rotation for visual effect
    meshRef.current.rotation.x += delta * 10;
    meshRef.current.rotation.y += delta * 10;

    // TODO: Implement proper collision detection with enemies
    // In a real implementation, you'd use physics raycasting with Rapier

    // Increase lifetime
    lifetime.current += delta;

    // Remove after 5 seconds or if too far
    if (lifetime.current > 5 || currentPosition.current.length() > 200) {
      removeProjectile(id);
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Projectile core */}
      <mesh castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Glow effect */}
      <pointLight color={color} intensity={2} distance={5} />

      {/* Particle trail effect */}
      <mesh position={[-velocity.current.x * 0.1, -velocity.current.y * 0.1, -velocity.current.z * 0.1]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

export default Projectile;
