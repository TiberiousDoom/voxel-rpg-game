import React, { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

/**
 * Projectile component - For spells and ranged attacks
 */
const Projectile = ({ id, position, direction, speed = 20, damage = 20, color = '#ff6b00' }) => {
  const rigidBodyRef = useRef();
  const velocity = useRef(new THREE.Vector3(...direction).normalize().multiplyScalar(speed));
  const lifetime = useRef(0);
  const hasHit = useRef(false);

  const removeProjectile = useGameStore((state) => state.removeProjectile);

  // Handle collision with enemies
  const handleIntersection = useCallback((event) => {
    // Avoid multiple hits
    if (hasHit.current) return;

    const otherBody = event.other.rigidBody;
    if (!otherBody) return;

    // Check if we hit an enemy
    const userData = otherBody.userData;
    if (userData?.isEnemy && userData?.takeDamage) {
      hasHit.current = true;

      // Deal damage to enemy
      userData.takeDamage(damage);

      // Add hit effect marker
      const hitPos = event.rigidBody.translation();
      useGameStore.getState().addTargetMarker({
        position: [hitPos.x, hitPos.y, hitPos.z],
        color: '#ff6600',
      });

      // Remove marker after 0.5 seconds
      setTimeout(() => {
        const markers = useGameStore.getState().targetMarkers;
        if (markers.length > 0) {
          useGameStore.getState().removeTargetMarker(markers[0].id);
        }
      }, 500);

      // Remove projectile
      removeProjectile(id);
    }
  }, [id, damage, removeProjectile]);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current || hasHit.current) return;

    // Update velocity
    rigidBodyRef.current.setLinvel(
      {
        x: velocity.current.x,
        y: velocity.current.y,
        z: velocity.current.z,
      },
      true
    );

    // Increase lifetime
    lifetime.current += delta;

    // Remove after 5 seconds or if too far
    const pos = rigidBodyRef.current.translation();
    const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

    if (lifetime.current > 5 || distance > 200) {
      removeProjectile(id);
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="dynamic"
      sensor={true} // Pass through objects but trigger collision events
      colliders="ball"
      gravityScale={0} // No gravity for projectiles
      linearVelocity={velocity.current.toArray()}
      onIntersectionEnter={handleIntersection}
    >
      <group>
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
        <mesh position={[-velocity.current.x * 0.02, -velocity.current.y * 0.02, -velocity.current.z * 0.02]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      </group>
    </RigidBody>
  );
};

export default Projectile;
