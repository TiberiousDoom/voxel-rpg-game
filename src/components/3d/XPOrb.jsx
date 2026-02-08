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
  const velocity = useRef(new THREE.Vector3());

  const player = useGameStore((state) => state.player);

  useFrame((state, delta) => {
    if (!rigidBodyRef.current || collected) return;

    const orbPos = rigidBodyRef.current.translation();
    const playerPos = new THREE.Vector3(...player.position);
    const orbVec = new THREE.Vector3(orbPos.x, orbPos.y, orbPos.z);

    // Calculate distance to player
    const distance = playerPos.distanceTo(orbVec);

    // Always track toward player - speed increases as orb gets closer
    const direction = playerPos.clone().sub(orbVec).normalize();

    // Base speed when far, accelerates when close
    let speed;
    if (distance > 15) {
      // Far away - gentle attraction
      speed = 3;
    } else if (distance > 5) {
      // Medium range - moderate speed
      speed = 5 + (15 - distance) * 0.5;
    } else {
      // Close range - fast homing
      speed = 10 + (5 - distance) * 3;
    }

    velocity.current.copy(direction.multiplyScalar(speed));

    rigidBodyRef.current.setLinvel({
      x: velocity.current.x,
      y: velocity.current.y,
      z: velocity.current.z,
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
      gravityScale={0} // No gravity - orb tracks toward player
    >
      <group>
        {/* Outer glow */}
        <mesh>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.3} />
        </mesh>

        {/* Inner core */}
        <mesh>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshBasicMaterial color="#ffd700" />
        </mesh>

        {/* Rotating ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.35, 16]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </RigidBody>
  );
};

export default XPOrb;
