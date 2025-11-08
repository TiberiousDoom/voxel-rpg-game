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

      const store = useGameStore.getState();
      const player = store.player;

      // Calculate critical hit
      const isCrit = Math.random() * 100 < player.critChance;
      let finalDamage = damage;

      if (isCrit) {
        finalDamage = damage * (player.critDamage / 100);
      }

      // Apply combo bonus
      const comboBonus = 1 + (player.comboCount * 0.1); // +10% per combo hit
      finalDamage *= comboBonus;

      // Increment combo
      store.updatePlayer({
        comboCount: player.comboCount + 1,
        comboTimer: 3, // 3 seconds to maintain combo
      });

      // Deal damage to enemy
      userData.takeDamage(Math.round(finalDamage));

      // Add hit effect marker with different color for crit
      const hitPos = event.rigidBody.translation();
      store.addTargetMarker({
        position: [hitPos.x, hitPos.y, hitPos.z],
        color: isCrit ? '#ffff00' : '#ff6600',
      });

      // Critical hit visual effect
      if (isCrit) {
        // Spawn additional damage numbers for crit
        store.addDamageNumber({
          position: [hitPos.x, hitPos.y + 2, hitPos.z],
          damage: 'CRIT!',
        });
      }

      // Combo visual
      if (player.comboCount > 1) {
        store.addDamageNumber({
          position: [hitPos.x, hitPos.y + 1.8, hitPos.z],
          damage: `${player.comboCount}x COMBO`,
        });
      }

      // Remove marker after 0.5 seconds
      setTimeout(() => {
        const markers = store.targetMarkers;
        if (markers.length > 0) {
          store.removeTargetMarker(markers[0].id);
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
