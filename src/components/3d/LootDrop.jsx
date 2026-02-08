import React, { useRef, useState, useMemo } from 'react';
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
  const [collected, setCollected] = useState(false);
  const timeAlive = useRef(0);

  // Reusable vectors to avoid per-frame allocations
  const _playerPos = useRef(new THREE.Vector3());
  const _lootPos = useRef(new THREE.Vector3());

  const player = useGameStore((state) => state.player);
  const addGold = useGameStore((state) => state.addGold);

  // Cache color since lootType doesn't change
  const lootColor = useMemo(() => {
    switch (lootType) {
      case 'gold': return '#ffd700';
      case 'health': return '#ff6b6b';
      case 'mana': return '#4dabf7';
      default: return '#ffffff';
    }
  }, [lootType]);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current || collected) return;

    // Bobbing + rotation via direct mutation (no state update)
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.2;
      groupRef.current.rotation.y = state.clock.elapsedTime * 2;
    }

    // Check distance to player for auto-collect
    const lootTranslation = rigidBodyRef.current.translation();
    const playerPos = _playerPos.current.set(player.position[0], player.position[1], player.position[2]);
    const lootVec = _lootPos.current.set(lootTranslation.x, lootTranslation.y, lootTranslation.z);
    const distance = playerPos.distanceTo(lootVec);

    if (distance < 2.5) {
      setCollected(true);
      if (lootType === 'gold') {
        addGold(amount);
      }
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

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="fixed"
      sensor={true}
      colliders="ball"
    >
      <group ref={groupRef}>
        {/* Loot item */}
        <mesh castShadow>
          <octahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial color={lootColor} />
        </mesh>

        {/* Outer ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.5, 12]} />
          <meshBasicMaterial color={lootColor} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </RigidBody>
  );
};

export default LootDrop;
