import React, { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

/**
 * Enemy component - Basic hostile mob with AI
 */
const Enemy = ({ position = [0, 2, 0], type = 'slime', name = 'Slime' }) => {
  const enemyRef = useRef();
  const [health, setHealth] = useState(50);
  const [maxHealth] = useState(50);
  const [isAlive, setIsAlive] = useState(true);
  const [attackCooldown, setAttackCooldown] = useState(0);
  const [damageFlash, setDamageFlash] = useState(0);

  const player = useGameStore((state) => state.player);
  const dealDamageToPlayer = useGameStore((state) => state.dealDamageToPlayer);

  // Handle taking damage - useCallback ensures stable reference
  const takeDamage = useCallback((damage) => {
    setHealth((prev) => {
      const newHealth = Math.max(0, prev - damage);
      // console.log(`💥 Enemy took ${damage} damage, health: ${newHealth}/${maxHealth}`);
      return newHealth;
    });

    // Trigger damage flash effect
    setDamageFlash(1);
    setTimeout(() => setDamageFlash(0), 300);

    // Spawn floating damage number
    if (enemyRef.current) {
      const enemyPos = enemyRef.current.translation();
      useGameStore.getState().addDamageNumber({
        position: [enemyPos.x, enemyPos.y + 1.5, enemyPos.z],
        damage: damage,
      });
    }
  }, []); // maxHealth is constant, no need to track it

  // Update RigidBody userData with takeDamage function
  React.useEffect(() => {
    if (enemyRef.current) {
      enemyRef.current.userData = {
        isEnemy: true,
        takeDamage: takeDamage,
      };
    }
  }, [takeDamage]);

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
      const enemyPos = body.translation();

      // Spawn XP orb instead of directly granting XP
      useGameStore.getState().addXPOrb({
        position: [enemyPos.x, enemyPos.y + 1, enemyPos.z],
        xpAmount: 25,
      });

      // Grant gold
      useGameStore.getState().addGold(10);

      // Spawn death particle effect
      useGameStore.getState().addParticleEffect({
        position: [enemyPos.x, enemyPos.y + 0.5, enemyPos.z],
        color: '#ff4444',
        type: 'explosion',
        count: 15,
      });

      // TODO: Remove enemy after death animation
      setTimeout(() => {
        // Remove from physics world
      }, 2000);
    }
  });

  if (!isAlive) {
    return (
      <group position={position}>
        {/* Death animation - fade out */}
        <mesh>
          <boxGeometry args={[1, 0.5, 1]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.3} />
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
      <group userData={{ isEnemy: true, takeDamage }} scale={damageFlash > 0 ? [1.15, 1.15, 1.15] : [1, 1, 1]}>
        {/* Invisible larger hitbox for easier tap detection on mobile */}
        <mesh position={[0, 0.5, 0]} userData={{ isEnemy: true, takeDamage }}>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        {/* Enemy body */}
        <mesh position={[0, 0.5, 0]} userData={{ isEnemy: true, takeDamage }}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={damageFlash > 0 ? "#ffff00" : "#ff4444"} />
        </mesh>

        {/* Enemy eyes */}
        <mesh position={[-0.2, 0.7, 0.51]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
        <mesh position={[0.2, 0.7, 0.51]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#000000" />
        </mesh>

        {/* Name and Health bar */}
        <Billboard position={[0, 1.8, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
          {/* Name label */}
          <Text
            position={[0, 0.35, 0]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {name}
          </Text>

          {/* Health bar container with border */}
          <group>
            {/* Border/outline */}
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[1.6, 0.25]} />
              <meshBasicMaterial color="#000000" side={THREE.DoubleSide} depthTest={false} />
            </mesh>

            {/* Health bar background */}
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[1.5, 0.2]} />
              <meshBasicMaterial color="#333333" side={THREE.DoubleSide} depthTest={false} />
            </mesh>

            {/* Health bar fill with gradient effect */}
            <mesh position={[-(1.5 - (health / maxHealth * 1.5)) / 2, 0, 0.02]}>
              <planeGeometry args={[health / maxHealth * 1.5, 0.18]} />
              <meshBasicMaterial
                color={health / maxHealth > 0.5 ? "#44ff44" : health / maxHealth > 0.25 ? "#ffaa00" : "#ff4444"}
                side={THREE.DoubleSide}
                emissive={health / maxHealth > 0.5 ? "#22aa22" : health / maxHealth > 0.25 ? "#aa6600" : "#aa2222"}
                emissiveIntensity={0.5}
                depthTest={false}
              />
            </mesh>

            {/* Health value text */}
            <Text
              position={[0, 0, 0.03]}
              fontSize={0.12}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {Math.round(health)}/{maxHealth}
            </Text>
          </group>
        </Billboard>
      </group>
    </RigidBody>
  );
};

export default Enemy;
