import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

/**
 * Enemy component - Basic hostile mob with AI
 */
const Enemy = ({ position = [0, 2, 0], type = 'slime' }) => {
  const enemyRef = useRef();
  const [health, setHealth] = useState(50);
  const [maxHealth] = useState(50);
  const [isAlive, setIsAlive] = useState(true);
  const [attackCooldown, setAttackCooldown] = useState(0);

  const player = useGameStore((state) => state.player);
  const dealDamageToPlayer = useGameStore((state) => state.dealDamageToPlayer);

  // Enemy AI behavior
  useFrame((state, delta) => {
    if (!enemyRef.current || !isAlive) return;

    const body = enemyRef.current;
    const currentPos = body.translation();

    // Calculate distance to player
    const playerPos = new THREE.Vector3(...player.position);
    const enemyPos = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
    const distance = playerPos.distanceTo(enemyPos);

    // AI behaviors
    const detectionRange = 20;
    const attackRange = 2;
    const moveSpeed = 2;

    if (distance < detectionRange) {
      // Move towards player
      const direction = new THREE.Vector3()
        .subVectors(playerPos, enemyPos)
        .normalize();

      const velocity = {
        x: direction.x * moveSpeed,
        y: body.linvel().y,
        z: direction.z * moveSpeed,
      };

      body.setLinvel(velocity, true);

      // Attack player if in range
      if (distance < attackRange) {
        if (attackCooldown <= 0) {
          dealDamageToPlayer(5);
          setAttackCooldown(1.0); // 1 second cooldown
        }
      }
    } else {
      // Idle - apply damping to slow down
      const currentVel = body.linvel();
      body.setLinvel(
        {
          x: currentVel.x * 0.9,
          y: currentVel.y,
          z: currentVel.z * 0.9,
        },
        true
      );
    }

    // Update cooldowns
    if (attackCooldown > 0) {
      setAttackCooldown(Math.max(0, attackCooldown - delta));
    }

    // Check if dead
    if (health <= 0 && isAlive) {
      setIsAlive(false);
      // Grant XP to player
      useGameStore.getState().addXP(25);
      useGameStore.getState().addGold(10);
      // TODO: Remove enemy after death animation
      setTimeout(() => {
        // Remove from physics world
      }, 2000);
    }
  });

  // Handle taking damage
  const takeDamage = (damage) => {
    setHealth((prev) => Math.max(0, prev - damage));
  };

  // Store reference to takeDamage in ref for external access
  React.useEffect(() => {
    if (enemyRef.current) {
      enemyRef.current.takeDamage = takeDamage;
    }
  }, []);

  if (!isAlive) {
    return (
      <group position={position}>
        {/* Death animation - fade out */}
        <mesh>
          <boxGeometry args={[1, 0.5, 1]} />
          <meshStandardMaterial color="#ff4444" transparent opacity={0.3} />
        </mesh>
      </group>
    );
  }

  return (
    <RigidBody
      ref={enemyRef}
      position={position}
      enabledRotations={[false, false, false]}
      type="dynamic"
      colliders="cuboid"
      mass={0.8}
      linearDamping={0.8}
      userData={{ isEnemy: true, takeDamage }}
    >
      <group userData={{ isEnemy: true, takeDamage }}>
        {/* Enemy body */}
        <mesh castShadow position={[0, 0.5, 0]} userData={{ isEnemy: true, takeDamage }}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ff4444" />
        </mesh>

        {/* Enemy eyes */}
        <mesh position={[-0.2, 0.7, 0.51]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh position={[0.2, 0.7, 0.51]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#000000" />
        </mesh>

        {/* Health bar */}
        <group position={[0, 1.5, 0]}>
          <sprite>
            <spriteMaterial color="red" />
          </sprite>
          {/* Health bar background */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[1, 0.1]} />
            <meshBasicMaterial color="#333333" side={THREE.DoubleSide} />
          </mesh>
          {/* Health bar fill */}
          <mesh position={[-(1 - (health / maxHealth)) / 2, 0, 0.01]}>
            <planeGeometry args={[health / maxHealth, 0.08]} />
            <meshBasicMaterial color="#ff4444" side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </RigidBody>
  );
};

export default Enemy;
