import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { useKeyboard } from '../../hooks/useKeyboard';

const Player = () => {
  const playerRef = useRef();
  const { camera } = useThree();
  const keys = useKeyboard();

  const player = useGameStore((state) => state.player);
  const updatePlayer = useGameStore((state) => state.updatePlayer);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);

  // Camera offset from player
  const cameraOffset = new THREE.Vector3(0, 15, 20);
  const cameraLookAtOffset = new THREE.Vector3(0, 2, 0);

  useFrame((state, delta) => {
    if (!playerRef.current) return;

    const body = playerRef.current;
    const currentPos = body.translation();
    const currentVel = body.linvel();

    // Get movement direction from keyboard or tap-to-move
    const moveSpeed = keys.run ? player.speed * 1.5 : player.speed;
    const velocity = new THREE.Vector3(currentVel.x, currentVel.y, currentVel.z);

    // Calculate camera forward and right vectors (ignoring Y for horizontal movement)
    const cameraForward = new THREE.Vector3();
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));

    // Apply keyboard input to velocity
    const movement = new THREE.Vector3();
    let hasKeyboardInput = false;

    if (keys.forward) {
      movement.add(cameraForward.clone().multiplyScalar(moveSpeed));
      hasKeyboardInput = true;
    }
    if (keys.backward) {
      movement.add(cameraForward.clone().multiplyScalar(-moveSpeed));
      hasKeyboardInput = true;
    }
    if (keys.left) {
      movement.add(cameraRight.clone().multiplyScalar(-moveSpeed));
      hasKeyboardInput = true;
    }
    if (keys.right) {
      movement.add(cameraRight.clone().multiplyScalar(moveSpeed));
      hasKeyboardInput = true;
    }

    // Tap-to-move: If no keyboard input and we have a target, move towards it
    if (!hasKeyboardInput && player.targetPosition) {
      const targetPos = new THREE.Vector3(...player.targetPosition);
      const currentPosition = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
      const direction = targetPos.clone().sub(currentPosition);
      direction.y = 0; // Keep movement horizontal
      const distance = direction.length();

      if (distance > 0.5) {
        // Still far from target, keep moving
        direction.normalize();
        movement.add(direction.multiplyScalar(moveSpeed));
      } else {
        // Reached target, clear it
        useGameStore.getState().setPlayerTarget(null);
      }
    }

    // If keyboard input is active, clear tap-to-move target
    if (hasKeyboardInput && player.targetPosition) {
      useGameStore.getState().setPlayerTarget(null);
    }

    // Apply movement with damping for smooth control
    velocity.x = THREE.MathUtils.lerp(velocity.x, movement.x, 0.2);
    velocity.z = THREE.MathUtils.lerp(velocity.z, movement.z, 0.2);

    // Jumping
    if (keys.jump && Math.abs(currentVel.y) < 0.1) {
      velocity.y = 8;
    }

    // Apply velocity
    body.setLinvel(velocity, true);

    // Update player position in store
    const newPos = [currentPos.x, currentPos.y, currentPos.z];
    setPlayerPosition(newPos);

    // Update camera to follow player
    const targetCameraPos = new THREE.Vector3(
      currentPos.x + cameraOffset.x,
      currentPos.y + cameraOffset.y,
      currentPos.z + cameraOffset.z
    );

    const targetLookAt = new THREE.Vector3(
      currentPos.x + cameraLookAtOffset.x,
      currentPos.y + cameraLookAtOffset.y,
      currentPos.z + cameraLookAtOffset.z
    );

    // Smooth camera movement
    camera.position.lerp(targetCameraPos, 0.1);
    camera.lookAt(targetLookAt);

    // Calculate facing angle for player
    if (movement.length() > 0) {
      const angle = Math.atan2(movement.x, movement.z);
      updatePlayer({ facingAngle: angle });
    }
  });

  // Handle spells and actions
  const lastSpellCast = useRef({ spell1: 0, spell2: 0 });

  useEffect(() => {
    const now = Date.now();
    const store = useGameStore.getState();

    if (keys.spell1 && player.mana >= 20 && now - lastSpellCast.current.spell1 > 500) {
      // Cast fireball
      store.useMana(20);
      lastSpellCast.current.spell1 = now;

      // Calculate direction from facing angle
      const direction = [
        Math.sin(player.facingAngle),
        0,
        Math.cos(player.facingAngle),
      ];

      store.addProjectile({
        id: `projectile_${now}`,
        position: [player.position[0], player.position[1] + 1, player.position[2]],
        direction,
        speed: 20,
        damage: 20,
        color: '#ff6b00',
      });
    }

    if (keys.spell2 && player.mana >= 30 && now - lastSpellCast.current.spell2 > 800) {
      // Cast lightning bolt
      store.useMana(30);
      lastSpellCast.current.spell2 = now;

      const direction = [
        Math.sin(player.facingAngle),
        0,
        Math.cos(player.facingAngle),
      ];

      store.addProjectile({
        id: `projectile_${now}`,
        position: [player.position[0], player.position[1] + 1, player.position[2]],
        direction,
        speed: 30,
        damage: 40,
        color: '#00bfff',
      });
    }

    if (keys.potion && store.inventory.potions > 0) {
      // Use potion
      store.healPlayer(50);
      // TODO: Decrease potion count
    }
  }, [keys.spell1, keys.spell2, keys.potion, player.mana, player.facingAngle, player.position]);

  return (
    <RigidBody
      ref={playerRef}
      position={player.position}
      enabledRotations={[false, false, false]}
      type="dynamic"
      colliders="cuboid"
      mass={1}
      linearDamping={0.5}
      angularDamping={1}
    >
      <group>
        {/* Player body - simple colored cube for now */}
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="#4169e1" />
        </mesh>

        {/* Player head - slightly different color */}
        <mesh castShadow position={[0, 1.5, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial color="#5a7fd6" />
        </mesh>

        {/* Direction indicator */}
        <mesh
          position={[0, 1, 0.6]}
          rotation={[0, player.facingAngle, 0]}
          castShadow
        >
          <coneGeometry args={[0.2, 0.5, 4]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
      </group>
    </RigidBody>
  );
};

export default Player;
