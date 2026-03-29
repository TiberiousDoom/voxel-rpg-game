import React, { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { audioManager } from '../../utils/AudioManager';
import { getQuestManager } from '../../systems/QuestManager';
// NOTE: Billboard and Text from drei removed - they caused WebGL shader errors
// that corrupted the rendering pipeline, preventing terrain chunks from drawing.
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { VOXEL_SIZE, CHUNK_SIZE_Y } from '../../systems/chunks/coordinates';
import { isSolid } from '../../systems/chunks/blockTypes';

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
  const [isAlive, setIsAlive] = useState(true);
  const isDead = useRef(false); // Immediate flag to prevent multi-frame death
  const deathPosition = useRef(null); // Capture actual death position
  const attackCooldownRef = useRef(0); // Ref to avoid per-frame re-renders
  const [damageFlash, setDamageFlash] = useState(0);

  const mDamage = monsterData?.damage || 5;
  const mSpeed = monsterData?.speed || 2;
  const mColor = monsterData?.color || '#ff4444';
  const mXp = monsterData?.xp || 25;
  const mName = monsterData?.name || name;
  const mType = monsterData?.type || type;

  // Reusable Vector3 refs to avoid per-frame allocations
  const _playerPos = useRef(new THREE.Vector3());
  const _enemyPos = useRef(new THREE.Vector3());
  const _direction = useRef(new THREE.Vector3());

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
      const knockbackDir = _direction.current.set(
        enemyPos.x - playerPos[0],
        0.3,
        enemyPos.z - playerPos[2]
      ).normalize();

      const knockbackForce = Math.min(5 + damage * 0.1, 12);
      enemyRef.current.applyImpulse({
        x: knockbackDir.x * knockbackForce,
        y: knockbackDir.y * knockbackForce,
        z: knockbackDir.z * knockbackForce,
      }, true);
    }
  }, []);

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
    if (!enemyRef.current || !isAlive || isDead.current) return;

    const body = enemyRef.current;
    const currentPos = body.translation();

    // Sync live position for spell auto-aim
    const enemyId = monsterData?.id;
    if (enemyId) {
      useGameStore.getState()._enemyPositions.set(enemyId, [currentPos.x, currentPos.y, currentPos.z]);
    }

    // Calculate distance to player (reuse vectors)
    const playerPos = _playerPos.current.set(player.position[0], player.position[1], player.position[2]);
    const enemyPos = _enemyPos.current.set(currentPos.x, currentPos.y, currentPos.z);
    const distance = playerPos.distanceTo(enemyPos);

    // Terrain clamping — prevent falling through when chunk has no physics collider
    // Only check when clearly falling (fast downward velocity or far below expected terrain)
    const vel = body.linvel();
    if (vel.y < -12 || currentPos.y < -2) {
      const chunkMgr = useGameStore.getState()._chunkManager;
      if (chunkMgr) {
        for (let vy = CHUNK_SIZE_Y - 1; vy >= 0; vy--) {
          const worldY = vy * VOXEL_SIZE + VOXEL_SIZE / 2;
          const block = chunkMgr.getBlock(currentPos.x, worldY, currentPos.z);
          if (isSolid(block)) {
            const surfaceY = (vy + 1) * VOXEL_SIZE + 1;
            if (currentPos.y < surfaceY - 1) {
              body.setTranslation({ x: currentPos.x, y: surfaceY, z: currentPos.z }, true);
              body.setLinvel({ x: vel.x, y: 0, z: vel.z }, true);
            }
            break;
          }
        }
      }
    }

    // Auto-jump: detect 1-block obstacles ahead and jump over them
    const xzVel = body.linvel();
    const xzSpeed = Math.sqrt(xzVel.x * xzVel.x + xzVel.z * xzVel.z);
    if (xzSpeed > 0.5 && Math.abs(xzVel.y) < 0.5) {
      const chunkMgr = useGameStore.getState()._chunkManager;
      if (chunkMgr) {
        const moveDirX = xzVel.x / xzSpeed;
        const moveDirZ = xzVel.z / xzSpeed;
        const checkX = currentPos.x + moveDirX * 2.5;
        const checkZ = currentPos.z + moveDirZ * 2.5;
        const footY = currentPos.y + 0.5;
        const headY = currentPos.y + 2.5;
        const footBlock = chunkMgr.getBlock(checkX, footY, checkZ);
        const headBlock = chunkMgr.getBlock(checkX, headY, checkZ);
        if (isSolid(footBlock) && !isSolid(headBlock)) {
          body.setLinvel({ x: xzVel.x, y: 8, z: xzVel.z }, true);
        }
      }
    }

    // AI behaviors
    const detectionRange = 20;
    const attackRange = 2;
    const anchorTarget = monsterData?.targetPosition;

    if (distance < detectionRange) {
      // Player is close — chase and attack player (priority over anchor)
      const direction = _direction.current.subVectors(playerPos, enemyPos).normalize();

      const velocity = {
        x: direction.x * mSpeed,
        y: body.linvel().y,
        z: direction.z * mSpeed,
      };

      body.setLinvel(velocity, true);

      // Attack player if in range
      if (distance < attackRange) {
        if (attackCooldownRef.current <= 0) {
          dealDamageToPlayer(mDamage, `Killed by ${mName}`);
          attackCooldownRef.current = 1.0;
        }
      }
    } else if (anchorTarget) {
      // Player is far — walk toward anchor target (reinforcement behavior)
      const anchorPos = _direction.current.set(
        anchorTarget[0] || anchorTarget.x || 0,
        0,
        anchorTarget[2] || anchorTarget.z || 0,
      );
      const toAnchor = anchorPos.sub(enemyPos).normalize();

      body.setLinvel({
        x: toAnchor.x * mSpeed,
        y: body.linvel().y,
        z: toAnchor.z * mSpeed,
      }, true);

      // Damage the anchor if within range
      const anchorDx = (anchorTarget[0] || 0) - currentPos.x;
      const anchorDz = (anchorTarget[2] || 0) - currentPos.z;
      const anchorDist = Math.sqrt(anchorDx * anchorDx + anchorDz * anchorDz);
      if (anchorDist < 3 && attackCooldownRef.current <= 0) {
        const riftManager = useGameStore.getState()._riftManager;
        if (riftManager) {
          // Find which rift this anchor belongs to
          for (const rift of riftManager.rifts) {
            if (rift.state === 'CLOSING') {
              const rx = rift.x - (anchorTarget[0] || 0);
              const rz = rift.z - (anchorTarget[2] || 0);
              if (Math.sqrt(rx * rx + rz * rz) < 5) {
                riftManager.damageAnchor(rift.id);
                attackCooldownRef.current = 2.0;
                break;
              }
            }
          }
        }
      }
    } else {
      // Idle - apply damping to slow down
      const currentVel = body.linvel();
      body.setLinvel(
        {
          x: currentVel.x * 0.9,
          y: currentVel.y,
          z: currentVel.x * 0.9,
        },
        true
      );
    }

    // Update cooldowns (ref — no re-render)
    if (attackCooldownRef.current > 0) {
      attackCooldownRef.current = Math.max(0, attackCooldownRef.current - delta);
    }

    // Check if dead — use ref for immediate guard (React state is async)
    if (health <= 0 && !isDead.current) {
      isDead.current = true;
      deathPosition.current = [currentPos.x, currentPos.y, currentPos.z];
      setIsAlive(false);
      const store = useGameStore.getState();
      if (enemyId) store._enemyPositions.delete(enemyId);
      const ePos = body.translation();

      // Spawn XP orb
      store.addXPOrb({
        position: [ePos.x, ePos.y + 1, ePos.z],
        xpAmount: mXp,
      });

      // Spawn gold as loot drop in world
      store.addLootDrop({
        position: [ePos.x, ePos.y + 1, ePos.z],
        type: 'gold',
        amount: 10,
        color: '#ffdd00',
      });

      // Material drops as world loot entities
      const drops = MONSTER_DROPS[mType] || [];
      for (const drop of drops) {
        if (Math.random() < drop.chance) {
          store.addLootDrop({
            position: [ePos.x + (Math.random() - 0.5) * 2, ePos.y + 1, ePos.z + (Math.random() - 0.5) * 2],
            type: 'material',
            material: drop.material,
            amount: drop.amount,
            color: '#88ff88',
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

      // Audio + quest tracking
      audioManager.play('enemyDeath');
      try { getQuestManager().emit('monsterKilled', mType); } catch (_) { /* quest system not ready */ }

      // Remove from rift enemy list after death animation
      if (monsterData?.id) {
        setTimeout(() => {
          useGameStore.getState().removeRiftEnemy(monsterData.id);
        }, 2000);
      }
    }
  });

  if (!isAlive) {
    // Render corpse at actual death position, not spawn position
    const pos = deathPosition.current || position;
    return (
      <group position={pos}>
        {/* Death animation - fade out */}
        <mesh>
          <boxGeometry args={[1, 0.5, 1]} />
          <meshBasicMaterial color={mColor} transparent opacity={0.3} />
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

      </group>
    </RigidBody>
  );
};

export default Enemy;
