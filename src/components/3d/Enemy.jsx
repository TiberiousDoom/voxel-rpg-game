import React, { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
// NOTE: Billboard and Text from drei removed - they caused WebGL shader errors
// that corrupted the rendering pipeline, preventing terrain chunks from drawing.
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

/**
 * Enemy component - Basic hostile mob with AI
 */
// Material drops by monster type
const MONSTER_DROPS = {
  slime: [{ material: 'fiber', amount: 1, chance: 0.5 }],
  goblin: [{ material: 'leather', amount: 1, chance: 0.6 }, { material: 'bone', amount: 1, chance: 0.3 }],
  skeleton: [{ material: 'bone', amount: 2, chance: 0.8 }],
  shadow: [{ material: 'crystal', amount: 1, chance: 0.4 }],
};

const Enemy = ({ position = [0, 2, 0], type = 'slime', name = 'Slime', monsterData = null }) => {
  const enemyRef = useRef();
  const [health, setHealth] = useState(monsterData?.health || 50);
  const [maxHealth] = useState(monsterData?.maxHealth || 50);
  const [isAlive, setIsAlive] = useState(true);
  const [attackCooldown, setAttackCooldown] = useState(0);
  const [damageFlash, setDamageFlash] = useState(0);

  const mDamage = monsterData?.damage || 5;
  const mSpeed = monsterData?.speed || 2;
  const mColor = monsterData?.color || '#ff4444';
  const mXp = monsterData?.xp || 25;
  const mName = monsterData?.name || name;
  const mType = monsterData?.type || type;

  const player = useGameStore((state) => state.player);
  const dealDamageToPlayer = useGameStore((state) => state.dealDamageToPlayer);

  // Handle taking damage - useCallback ensures stable reference
  const takeDamage = useCallback((damage) => {
    setHealth((prev) => {
      const newHealth = Math.max(0, prev - damage);
      return newHealth;
    });

    // Trigger damage flash effect
    setDamageFlash(1);
    setTimeout(() => setDamageFlash(0), 300);

    // Spawn floating damage number and apply knockback
    if (enemyRef.current) {
      const enemyPos = enemyRef.current.translation();
      const store = useGameStore.getState();
      const playerPos = store.player.position;

      // Add damage number
      store.addDamageNumber({
        position: [enemyPos.x, enemyPos.y + 1.5, enemyPos.z],
        damage: damage,
      });

      // Add hit particle burst
      store.addParticleEffect({
        position: [enemyPos.x, enemyPos.y + 0.5, enemyPos.z],
        color: '#ffaa00',
        type: 'burst',
        count: 8,
      });

      // Apply knockback impulse (push away from player)
      const knockbackDir = new THREE.Vector3(
        enemyPos.x - playerPos[0],
        0.3, // Slight upward boost
        enemyPos.z - playerPos[2]
      ).normalize();

      const knockbackForce = Math.min(5 + damage * 0.1, 12); // Scale with damage, cap at 12
      enemyRef.current.applyImpulse({
        x: knockbackDir.x * knockbackForce,
        y: knockbackDir.y * knockbackForce,
        z: knockbackDir.z * knockbackForce,
      }, true);
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

    if (distance < detectionRange) {
      // Move towards player
      const direction = new THREE.Vector3()
        .subVectors(playerPos, enemyPos)
        .normalize();

      const velocity = {
        x: direction.x * mSpeed,
        y: body.linvel().y,
        z: direction.z * mSpeed,
      };

      body.setLinvel(velocity, true);

      // Attack player if in range
      if (distance < attackRange) {
        if (attackCooldown <= 0) {
          dealDamageToPlayer(mDamage, `Killed by ${mName}`);
          setAttackCooldown(1.0);
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
      const store = useGameStore.getState();
      const ePos = body.translation();

      // Spawn XP orb
      store.addXPOrb({
        position: [ePos.x, ePos.y + 1, ePos.z],
        xpAmount: mXp,
      });

      // Grant gold
      store.addGold(10);

      // Material drops
      const drops = MONSTER_DROPS[mType] || [];
      for (const drop of drops) {
        if (Math.random() < drop.chance) {
          store.addMaterial(drop.material, drop.amount);
          store.addDamageNumber({
            position: [ePos.x, ePos.y + 1.5, ePos.z],
            damage: `+${drop.amount} ${drop.material}`,
            color: '#ffffff',
          });
        }
      }

      // Spawn death particle effect
      store.addParticleEffect({
        position: [ePos.x, ePos.y + 0.5, ePos.z],
        color: mColor,
        type: 'explosion',
        count: 15,
      });

      // Remove from rift enemy list after death animation
      if (monsterData?.id) {
        setTimeout(() => {
          useGameStore.getState().removeRiftEnemy(monsterData.id);
        }, 2000);
      }
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
          <meshBasicMaterial color={damageFlash > 0 ? "#ffff00" : mColor} />
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

        {/* Health bar - simple geometry, no drei Text/Billboard */}
        <group position={[0, 1.8, 0]}>
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

          {/* Health bar fill */}
          <mesh position={[-(1.5 - (health / maxHealth * 1.5)) / 2, 0, 0.02]}>
            <planeGeometry args={[health / maxHealth * 1.5, 0.18]} />
            <meshBasicMaterial
              color={health / maxHealth > 0.5 ? "#44ff44" : health / maxHealth > 0.25 ? "#ffaa00" : "#ff4444"}
              side={THREE.DoubleSide}
              depthTest={false}
            />
          </mesh>
        </group>
      </group>
    </RigidBody>
  );
};

export default Enemy;
