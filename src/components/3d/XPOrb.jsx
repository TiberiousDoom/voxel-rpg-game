import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

/**
 * XPOrb component - Collectible XP that flies toward player
 */
const XPOrb = ({ position, xpAmount = 25, id, onCollect }) => {
  const rigidBodyRef = useRef();
  const [collected, setCollected] = React.useState(false);

  // Reusable vectors to avoid per-frame allocations
  const _playerPos = useRef(new THREE.Vector3());
  const _orbPos = useRef(new THREE.Vector3());
  const _direction = useRef(new THREE.Vector3());

  const player = useGameStore((state) => state.player);

  useFrame(() => {
    if (!rigidBodyRef.current || collected) return;

    const orbTranslation = rigidBodyRef.current.translation();
    const playerPos = _playerPos.current.set(player.position[0], player.position[1], player.position[2]);
    const orbVec = _orbPos.current.set(orbTranslation.x, orbTranslation.y, orbTranslation.z);

    // Calculate distance to player
    const distance = playerPos.distanceTo(orbVec);

    // Always track toward player - speed increases as orb gets closer
    const direction = _direction.current.subVectors(playerPos, orbVec).normalize();

    // Base speed when far, accelerates when close
    let speed;
    if (distance > 15) {
      speed = 3;
    } else if (distance > 5) {
      speed = 5 + (15 - distance) * 0.5;
    } else {
      speed = 10 + (5 - distance) * 3;
    }

    direction.multiplyScalar(speed);

    rigidBodyRef.current.setLinvel({
      x: direction.x,
      y: direction.y,
      z: direction.z,
    }, true);

    // Collect when very close
    if (distance < 1.5) {
      setCollected(true);
      useGameStore.getState().addXP(xpAmount);
      if (onCollect) onCollect(id);
    }
  });

  if (collected) return null;

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      type="dynamic"
      sensor={true}
      colliders="ball"
      gravityScale={0}
    >
      <group>
        {/* Outer glow */}
        <mesh>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.3} />
        </mesh>

        {/* Inner core */}
        <mesh>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshBasicMaterial color="#ffd700" />
        </mesh>

        {/* Rotating ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.35, 12]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </RigidBody>
  );
};

export default XPOrb;
