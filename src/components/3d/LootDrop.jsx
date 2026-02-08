import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

/**
 * LootDrop component - Collectible loot that drops from enemies
 */
const LootDrop = ({ position, lootType = 'gold', amount = 10, id, onCollect }) => {
  const rigidBodyRef = useRef();
  const groupRef = useRef();
  const [bobOffset, setBobOffset] = useState(0);
  const [collected, setCollected] = useState(false);
  const timeAlive = useRef(0);

  const player = useGameStore((state) => state.player);
  const addGold = useGameStore((state) => state.addGold);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current || collected) return;

    // Bobbing animation
    setBobOffset(Math.sin(state.clock.elapsedTime * 3) * 0.2);

    // Rotate the visual group
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 2;
    }

    // Check distance to player for auto-collect
    const lootPos = rigidBodyRef.current.translation();
    const playerPos = new THREE.Vector3(...player.position);
    const lootVec = new THREE.Vector3(lootPos.x, lootPos.y, lootPos.z);
    const distance = playerPos.distanceTo(lootVec);

    if (distance < 2.5) {
      // Collect loot
      setCollected(true);
      if (lootType === 'gold') {
        addGold(amount);
      }
      // Remove loot drop
      if (onCollect && id) {
        onCollect(id);
      }
      return;
    }

    // Remove after 60 seconds
    timeAlive.current += delta;
    if (timeAlive.current > 60) {
      setCollected(true);
      if (onCollect && id) {
        onCollect(id);
      }
    }
  });

  if (collected) return null;

  const getLootColor = () => {
    switch (lootType) {
      case 'gold':
        return '#ffd700';
      case 'health':
        return '#ff6b6b';
      case 'mana':
        return '#4dabf7';
      default:
        return '#ffffff';
    }
  };

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="fixed"
      sensor={true}
      colliders="ball"
    >
      <group ref={groupRef} position={[0, bobOffset, 0]}>
        {/* Loot item */}
        <mesh castShadow>
          <octahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial color={getLootColor()} />
        </mesh>

        {/* Glow effect */}
        <pointLight color={getLootColor()} intensity={1} distance={3} />

        {/* Outer ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.5, 16]} />
          <meshBasicMaterial color={getLootColor()} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </RigidBody>
  );
};

export default LootDrop;
