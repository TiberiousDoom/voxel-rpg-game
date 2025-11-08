import React, { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

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
  const elapsedTime = useRef(0);
  const hasHit = useRef(false);

  const removeProjectile = useGameStore((state) => state.removeProjectile);

  // Apply status effect to enemy
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const applyStatusEffect = useCallback((enemyId) => {
    if (!effectType || !effectDuration) return;

    const store = useGameStore.getState();
    // Store status effects on enemies (handled in Enemy component)
    store.updateEnemy(enemyId, {
      statusEffects: [
        {
          type: effectType,
          duration: effectDuration,
          value: effectValue,
        },
      ],
    });
  }, [effectType, effectDuration, effectValue]);

  // Handle collision with enemies
  const handleIntersection = useCallback((event) => {
    // Avoid multiple hits for non-AOE spells
    if (hasHit.current && type !== 'aoe') return;

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
      const comboBonus = 1 + (player.comboCount * 0.1);
      finalDamage *= comboBonus;

      // Increment combo
      store.updatePlayer({
        comboCount: player.comboCount + 1,
        comboTimer: 3,
      });

      // Deal damage to enemy
      userData.takeDamage(Math.round(finalDamage));

      // Apply status effect if present
      if (effectType && userData.id) {
        applyStatusEffect(userData.id);
      }

      // Add hit effect marker
      const hitPos = event.rigidBody.translation();
      store.addTargetMarker({
        position: [hitPos.x, hitPos.y, hitPos.z],
        color: isCrit ? '#ffff00' : '#ff6600',
      });

      // Critical hit visual effect
      if (isCrit) {
        store.addDamageNumber({
          position: [hitPos.x, hitPos.y + 2, hitPos.z],
          damage: 'CRIT!',
        });
        store.addParticleEffect({
          position: [hitPos.x, hitPos.y, hitPos.z],
          color: '#ffff00',
          type: 'burst',
          count: 25,
        });
      }

      // Combo visual
      if (player.comboCount > 1) {
        store.addDamageNumber({
          position: [hitPos.x, hitPos.y + 1.8, hitPos.z],
          damage: `${player.comboCount}x COMBO`,
        });
      }

      // Status effect visual
      if (effectType) {
        store.addParticleEffect({
          position: [hitPos.x, hitPos.y, hitPos.z],
          color: color,
          type: 'spiral',
          count: 15,
        });
      }

      // Add rage for hitting enemies
      store.addRage(5);

      // Remove marker after 0.5 seconds
      setTimeout(() => {
        const markers = store.targetMarkers;
        if (markers.length > 0) {
          store.removeTargetMarker(markers[0].id);
        }
      }, 500);

      // Remove projectile (unless it's a piercing spell)
      removeProjectile(id);
    }
  }, [id, damage, removeProjectile, effectType, color, type, applyStatusEffect]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Increase elapsed time
    elapsedTime.current += delta;

    // Remove after lifetime expires or if too far
    const pos = rigidBodyRef.current.translation();
    const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

    const maxLifetime = lifetime || 5;
    if (elapsedTime.current > maxLifetime || distance > 200) {
      removeProjectile(id);
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
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.7}
            />
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
