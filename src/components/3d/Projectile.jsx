import React, { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { isSolid } from '../../systems/chunks/blockTypes';

// Distance at which the fallback hit check registers a hit
const HIT_RADIUS = 1.5;

/**
 * Projectile component - For spells and ranged attacks
 * Supports projectile, AOE, beam spells with status effects
 */
const Projectile = ({
  id,
  position,
  direction,
  speed = 20,
  damage = 20,
  color = '#ff6b00',
  spellId = null,
  effectType = null,
  effectValue = 0,
  effectDuration = 0,
  aoeRadius = 0,
  type = 'projectile',
  beamWidth = 1,
  lifetime = null,
}) => {
  const rigidBodyRef = useRef();
  const velocity = useRef(new THREE.Vector3(...direction).normalize().multiplyScalar(speed));
  const spawnPos = useRef(new THREE.Vector3(...position));
  const elapsedTime = useRef(0);
  const hasHit = useRef(false);

  const removeProjectile = useGameStore((state) => state.removeProjectile);

  /**
   * Apply a hit to an enemy. Single code path for both the physics sensor and
   * the distance-based fallback so damage, crits, combo and status effects are
   * identical (and damage numbers aren't duplicated — Enemy.takeDamage shows them).
   */
  const applyHit = useCallback((hitData, hitPos) => {
    if (hasHit.current && type !== 'aoe') return;
    hasHit.current = true;

    const store = useGameStore.getState();
    const player = store.player;

    // Critical hit + combo bonus
    const isCrit = Math.random() * 100 < player.critChance;
    let finalDamage = isCrit ? damage * (player.critDamage / 100) : damage;
    finalDamage *= 1 + (player.comboCount * 0.1);

    store.updatePlayer({ comboCount: player.comboCount + 1, comboTimer: 3 });

    hitData.takeDamage(Math.round(finalDamage));

    // Status effect (freeze, poison, ...)
    if (effectType && effectDuration && hitData.applyStatusEffect) {
      hitData.applyStatusEffect({ type: effectType, duration: effectDuration, value: effectValue });
      store.addParticleEffect({
        position: hitPos,
        color,
        type: 'spiral',
        count: 15,
      });
    }

    // Screen shake scales with damage
    const shakeIntensity = Math.min(0.3 + (finalDamage / 100) * 0.4, 0.8);
    store.triggerScreenShake(isCrit ? shakeIntensity * 1.5 : shakeIntensity, 0.2);

    // Hit marker (TargetMarker removes itself after its duration)
    store.addTargetMarker({ position: hitPos, color: isCrit ? '#ffff00' : '#ff6600' });

    if (isCrit) {
      store.addDamageNumber({ position: [hitPos[0], hitPos[1] + 2, hitPos[2]], damage: 'CRIT!' });
      store.addParticleEffect({ position: hitPos, color: '#ffff00', type: 'burst', count: 25 });
    }
    if (player.comboCount > 1) {
      store.addDamageNumber({
        position: [hitPos[0], hitPos[1] + 1.8, hitPos[2]],
        damage: `${player.comboCount}x COMBO`,
      });
    }

    store.addRage(5);
    removeProjectile(id);
  }, [id, damage, type, color, effectType, effectValue, effectDuration, removeProjectile]);

  // Physics sensor collision with enemies
  const handleIntersection = useCallback((event) => {
    if (hasHit.current && type !== 'aoe') return;

    // In react-three-rapier, userData is on rigidBodyObject (Three.js object), not rigidBody (Rapier object)
    const otherObject = event.other.rigidBodyObject;
    if (!otherObject) return;

    let userData = otherObject.userData;
    if (!userData?.isEnemy) {
      otherObject.traverse((child) => {
        if (child.userData?.isEnemy && child.userData?.takeDamage) {
          userData = child.userData;
        }
      });
    }

    if (userData?.isEnemy && userData?.takeDamage) {
      const t = event.rigidBody.translation();
      applyHit(userData, [t.x, t.y, t.z]);
    }
  }, [applyHit, type]);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current || hasHit.current) return;

    const store = useGameStore.getState();
    if (store.gameState === 'paused') return;

    // Update velocity
    rigidBodyRef.current.setLinvel(
      {
        x: velocity.current.x,
        y: velocity.current.y,
        z: velocity.current.z,
      },
      true
    );

    // Increase elapsed time
    elapsedTime.current += delta;

    // Remove after lifetime expires or if traveled too far from spawn
    const pos = rigidBodyRef.current.translation();
    const dx = pos.x - spawnPos.current.x;
    const dy = pos.y - spawnPos.current.y;
    const dz = pos.z - spawnPos.current.z;
    const distanceTraveled = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const maxLifetime = lifetime || 5;
    if (elapsedTime.current > maxLifetime || distanceTraveled > 200) {
      removeProjectile(id);
      return;
    }

    // Distance-based enemy hit detection (fallback for the physics sensor).
    // Iterates registered enemies instead of traversing the whole scene graph.
    const hitRadiusSq = HIT_RADIUS * HIT_RADIUS;
    for (const [enemyId, handler] of store._enemyHandlers) {
      const ep = store._enemyPositions.get(enemyId);
      if (!ep) continue;
      // Enemy positions are at the body base; aim at its centre
      const ex = pos.x - ep[0];
      const ey = pos.y - (ep[1] + 0.5);
      const ez = pos.z - ep[2];
      if (ex * ex + ey * ey + ez * ez < hitRadiusSq) {
        applyHit(handler, [ep[0], ep[1] + 0.5, ep[2]]);
        return;
      }
    }

    // Projectiles stop when they hit terrain (beams pierce)
    if (type !== 'beam') {
      const cm = store._chunkManager;
      if (cm && isSolid(cm.getBlock(pos.x, pos.y, pos.z))) {
        hasHit.current = true;
        store.addParticleEffect({
          position: [pos.x, pos.y, pos.z],
          color,
          type: 'burst',
          count: 8,
        });
        removeProjectile(id);
      }
    }
  });

  // Render different projectile types with unique visuals
  const renderProjectile = () => {
    if (type === 'beam') {
      // Beam spell - elongated cylinder
      return (
        <group>
          <mesh castShadow>
            <cylinderGeometry args={[beamWidth, beamWidth, 3, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <pointLight color={color} intensity={3} distance={10} />
        </group>
      );
    }

    // Default projectile sphere with enhancements
    return (
      <group>
        {/* Projectile core */}
        <mesh castShadow>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>

        {/* Glow effect */}
        <pointLight color={color} intensity={2} distance={5} />

        {/* Particle trail effect */}
        <mesh position={[-velocity.current.x * 0.02, -velocity.current.y * 0.02, -velocity.current.z * 0.02]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      </group>
    );
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="dynamic"
      sensor={true}
      colliders="ball"
      gravityScale={0}
      linearVelocity={velocity.current.toArray()}
      onIntersectionEnter={handleIntersection}
    >
      {renderProjectile()}
    </RigidBody>
  );
};

export default Projectile;
