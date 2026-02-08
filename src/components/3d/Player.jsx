import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { useKeyboard } from '../../hooks/useKeyboard';
import { getTotalStats } from '../../utils/equipmentStats';
import { SPELLS, executeSpell } from '../../data/spells';

const Player = () => {
  const playerRef = useRef();
  const { camera } = useThree();
  const keys = useKeyboard();

  const player = useGameStore((state) => state.player);
  const equipment = useGameStore((state) => state.equipment);
  const cameraState = useGameStore((state) => state.camera);
  const updatePlayer = useGameStore((state) => state.updatePlayer);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const consumeStamina = useGameStore((state) => state.consumeStamina);
  const regenStamina = useGameStore((state) => state.regenStamina);
  const regenMana = useGameStore((state) => state.regenMana);

  // Calculate total stats with equipment bonuses
  const totalStats = getTotalStats(player, equipment);

  // Double-tap detection for mobile sprint
  const lastTapTime = useRef(0);
  const [isSprinting, setIsSprinting] = React.useState(false);

  // Dodge roll state
  const lastSpacePress = useRef(0);
  const [isDodging, setIsDodging] = React.useState(false);
  const dodgeDirection = useRef(new THREE.Vector3());
  const dodgeTimer = useRef(0);

  // Reusable Vector3 refs to avoid per-frame allocations (GC pressure reduction)
  const _velocity = useRef(new THREE.Vector3());
  const _cameraForward = useRef(new THREE.Vector3());
  const _cameraRight = useRef(new THREE.Vector3());
  const _upVector = useRef(new THREE.Vector3(0, 1, 0));
  const _movement = useRef(new THREE.Vector3());
  const _tempDir = useRef(new THREE.Vector3());
  const _targetCameraPos = useRef(new THREE.Vector3());
  const _targetLookAt = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!playerRef.current) return;

    const body = playerRef.current;
    const currentPos = body.translation();
    const currentVel = body.linvel();

    // Determine if sprinting (keyboard Shift or mobile double-tap)
    const isSprintingNow = (keys.run || isSprinting) && player.stamina > 0;

    // Get movement direction from keyboard or tap-to-move (use totalStats for equipment bonuses)
    const moveSpeed = isSprintingNow ? totalStats.speed * 1.5 : totalStats.speed;
    const velocity = _velocity.current.set(currentVel.x, currentVel.y, currentVel.z);

    // Use stamina when sprinting and moving
    let isMoving = false;

    // Calculate camera forward and right vectors (ignoring Y for horizontal movement)
    const cameraForward = _cameraForward.current;
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();

    const cameraRight = _cameraRight.current;
    cameraRight.crossVectors(cameraForward, _upVector.current);

    // Apply keyboard input to velocity
    const movement = _movement.current.set(0, 0, 0);
    let hasKeyboardInput = false;

    if (keys.forward) {
      movement.addScaledVector(cameraForward, moveSpeed);
      hasKeyboardInput = true;
      isMoving = true;
    }
    if (keys.backward) {
      movement.addScaledVector(cameraForward, -moveSpeed);
      hasKeyboardInput = true;
      isMoving = true;
    }
    if (keys.left) {
      movement.addScaledVector(cameraRight, -moveSpeed);
      hasKeyboardInput = true;
      isMoving = true;
    }
    if (keys.right) {
      movement.addScaledVector(cameraRight, moveSpeed);
      hasKeyboardInput = true;
      isMoving = true;
    }

    // Tap-to-move: If no keyboard input and we have a target, move towards it
    if (!hasKeyboardInput && player.targetPosition) {
      const direction = _tempDir.current.set(
        player.targetPosition[0] - currentPos.x,
        0,
        player.targetPosition[2] - currentPos.z
      );
      const distance = direction.length();

      if (distance > 0.5) {
        // Still far from target, keep moving
        direction.normalize();
        movement.addScaledVector(direction, moveSpeed);
        isMoving = true;
      } else {
        // Reached target, clear it
        useGameStore.getState().setPlayerTarget(null);
      }
    }

    // If keyboard input is active, clear tap-to-move target
    if (hasKeyboardInput && player.targetPosition) {
      useGameStore.getState().setPlayerTarget(null);
    }

    // Blocking
    const isBlocking = keys.block && player.stamina > 0;
    if (isBlocking) {
      // Use stamina while blocking
      consumeStamina(delta * 15); // 15 stamina per second
      updatePlayer({ isBlocking: true });
    } else {
      updatePlayer({ isBlocking: false });
    }

    // Stamina usage and regeneration
    if (isSprintingNow && isMoving && !isBlocking) {
      // Use stamina while sprinting and moving
      consumeStamina(delta * 20); // 20 stamina per second
    } else if (!isBlocking) {
      // Regenerate stamina when not sprinting or blocking
      regenStamina(delta * 30); // 30 stamina per second
    }

    // Mana regeneration
    regenMana(delta * 10); // 10 mana per second

    // Cooldown timers
    if (player.potionCooldown > 0) {
      updatePlayer({ potionCooldown: Math.max(0, player.potionCooldown - delta) });
    }
    if (player.comboTimer > 0) {
      const newComboTimer = player.comboTimer - delta;
      if (newComboTimer <= 0) {
        updatePlayer({ comboTimer: 0, comboCount: 0 });
      } else {
        updatePlayer({ comboTimer: newComboTimer });
      }
    }

    // Update spell cooldowns
    useGameStore.getState().updateSpellCooldowns(delta);

    // Apply movement with damping for smooth control
    velocity.x = THREE.MathUtils.lerp(velocity.x, movement.x, 0.2);
    velocity.z = THREE.MathUtils.lerp(velocity.z, movement.z, 0.2);

    // Dodge roll handling
    if (isDodging) {
      dodgeTimer.current -= delta;
      if (dodgeTimer.current > 0) {
        // Apply dodge velocity
        velocity.x = dodgeDirection.current.x * 20;
        velocity.z = dodgeDirection.current.z * 20;
        // Maintain invincibility during dodge
        if (!player.isInvincible) {
          updatePlayer({ isInvincible: true });
        }
      } else {
        setIsDodging(false);
        // Remove invincibility after dodge
        updatePlayer({ isInvincible: false });
      }
    }

    // Jumping (disabled during dodge)
    if (keys.jump && Math.abs(currentVel.y) < 0.1 && !isDodging) {
      // Check for double-tap dodge roll
      const now = Date.now();
      if (now - lastSpacePress.current < 300 && player.stamina >= 30 && movement.length() > 0) {
        // Double-tap detected - dodge roll!
        consumeStamina(30);
        setIsDodging(true);
        dodgeTimer.current = 0.3; // 0.3 second dodge duration
        dodgeDirection.current = movement.clone().normalize();
        lastSpacePress.current = 0; // Reset to prevent triple tap
      } else {
        // Single tap - normal jump (needs to clear 1 block = 2 world units)
        velocity.y = 10;
        lastSpacePress.current = now;
      }
    }

    // Apply velocity
    body.setLinvel(velocity, true);

    // Update player position in store
    const newPos = [currentPos.x, currentPos.y, currentPos.z];
    setPlayerPosition(newPos);

    // Update camera based on mode (first-person or third-person)
    const targetCameraPos = _targetCameraPos.current;
    const targetLookAt = _targetLookAt.current;

    if (cameraState.firstPerson) {
      // First-person camera: position at player head, offset forward to avoid body clipping
      const headHeight = 2.6; // Eye level (head center at 2.4 + slight offset)
      const forwardOffset = 0.5; // Move camera forward to clear player body

      // Apply yaw and pitch rotation
      const yaw = cameraState.yaw;
      const pitch = cameraState.pitch;

      // Calculate look direction from yaw and pitch (horizontal only for offset)
      const sinYaw = Math.sin(yaw);
      const cosYaw = Math.cos(yaw);

      // Position camera at head, offset forward in look direction
      targetCameraPos.set(
        currentPos.x + sinYaw * forwardOffset,
        currentPos.y + headHeight,
        currentPos.z + cosYaw * forwardOffset
      );

      // Calculate full look direction with pitch for lookAt target
      targetLookAt.set(
        targetCameraPos.x + sinYaw * Math.cos(pitch),
        targetCameraPos.y + Math.sin(pitch),
        targetCameraPos.z + cosYaw * Math.cos(pitch)
      );

      // Snap to position in first-person (no lerp for responsiveness)
      camera.position.copy(targetCameraPos);
      camera.lookAt(targetLookAt);
    } else {
      // Third-person camera: orbit around player
      const angle = cameraState.rotationAngle;
      const distance = cameraState.distance;
      const height = cameraState.height;

      // Calculate camera position based on rotation angle
      targetCameraPos.set(
        currentPos.x + Math.sin(angle) * distance,
        currentPos.y + height,
        currentPos.z + Math.cos(angle) * distance
      );

      targetLookAt.set(currentPos.x, currentPos.y + 2, currentPos.z);

      // Smooth camera movement
      camera.position.lerp(targetCameraPos, 0.1);
      camera.lookAt(targetLookAt);
    }

    // Calculate facing angle for player
    if (cameraState.firstPerson) {
      // In first-person, body always faces camera direction
      updatePlayer({ facingAngle: cameraState.yaw });
    } else if (movement.length() > 0) {
      const angle = Math.atan2(movement.x, movement.z);
      updatePlayer({ facingAngle: angle });
    }
  });

  // Handle double-tap for mobile sprint
  useEffect(() => {
    const handleDoubleTap = (e) => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime.current;

      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // Double tap detected
        setIsSprinting((prev) => !prev);
      }

      lastTapTime.current = now;
    };

    window.addEventListener('touchstart', handleDoubleTap);
    return () => window.removeEventListener('touchstart', handleDoubleTap);
  }, []);

  // Handle spells and actions - mapped to keys and spell indices
  useEffect(() => {
    const store = useGameStore.getState();
    const currentPlayer = store.player;

    // Create key to spell mappings
    const spellKeyMap = {
      spell1: SPELLS.find(s => s.key === '1'),
      spell2: SPELLS.find(s => s.key === '2'),
      spell3: SPELLS.find(s => s.key === '3'),
      spell4: SPELLS.find(s => s.key === '4'),
      spell5: SPELLS.find(s => s.key === '5'),
      spell6: SPELLS.find(s => s.key === '6'),
      spellQ: SPELLS.find(s => s.key === 'q'),
      spellE: SPELLS.find(s => s.key === 'e'),
      spellR: SPELLS.find(s => s.key === 'r'),
      spellF: SPELLS.find(s => s.key === 'f'),
      spellT: SPELLS.find(s => s.key === 't'),
    };

    // Check each spell key
    const trycastSpell = (keyName, spell) => {
      if (!spell) return;
      if (!keys[keyName]) return;

      // Check cooldown
      const cooldown = store.getSpellCooldown(spell.id);
      if (cooldown > 0) return;

      // Check mana
      if (currentPlayer.mana < spell.manaCost) return;

      // Execute spell
      const result = executeSpell(spell, currentPlayer, store);
      if (result.success) {
        // Set cooldown
        store.setSpellCooldown(spell.id, spell.cooldown);
      }
    };

    // Try to cast each spell
    trycastSpell('spell1', spellKeyMap.spell1);
    trycastSpell('spell2', spellKeyMap.spell2);
    trycastSpell('spell3', spellKeyMap.spell3);
    trycastSpell('spell4', spellKeyMap.spell4);
    trycastSpell('spell5', spellKeyMap.spell5);
    trycastSpell('spell6', spellKeyMap.spell6);
    trycastSpell('spellQ', spellKeyMap.spellQ);
    trycastSpell('spellE', spellKeyMap.spellE);
    trycastSpell('spellR', spellKeyMap.spellR);
    trycastSpell('spellF', spellKeyMap.spellF);
    trycastSpell('spellT', spellKeyMap.spellT);

    // Potion use
    if (keys.potion && store.inventory.potions > 0 && currentPlayer.potionCooldown <= 0) {
      store.healPlayer(50);
      store.updatePlayer({ potionCooldown: 5 });
      store.inventory.potions--;
    }
  }, [keys]);

  // Capsule collider: halfHeight=0.8, radius=0.6 → total height = 2*0.8 + 2*0.6 = 2.8 units (~1.4 blocks)
  // Smoother than cuboid — prevents getting stuck on block edges
  return (
    <RigidBody
      ref={playerRef}
      position={player.position}
      enabledRotations={[false, false, false]}
      type="dynamic"
      colliders={false}
      mass={1}
      linearDamping={0.5}
      angularDamping={1}
    >
      <CapsuleCollider args={[0.8, 0.6]} position={[0, 1.4, 0]} />
      <group rotation={[0, player.facingAngle, 0]}>
        {/* Player body */}
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[1.2, 2.0, 0.8]} />
          <meshBasicMaterial color="#4169e1" />
        </mesh>

        {/* Player head */}
        <mesh position={[0, 2.4, 0]}>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshBasicMaterial color="#5a7fd6" />
        </mesh>

        {/* Direction indicator (nose) */}
        <mesh position={[0, 2.4, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.15, 0.3, 4]} />
          <meshBasicMaterial color="#ff6b6b" />
        </mesh>
      </group>

      {/* Health Bar - positioned above player (doesn't rotate) */}
      <group position={[0, 3.2, 0]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1.4, 0.15]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
        <mesh position={[(player.health / player.maxHealth - 1) * 0.65, 0, 0.01]}>
          <planeGeometry args={[1.3 * (player.health / player.maxHealth), 0.1]} />
          <meshBasicMaterial color={player.health / player.maxHealth > 0.5 ? '#44ff44' : player.health / player.maxHealth > 0.25 ? '#ffff00' : '#ff4444'} />
        </mesh>
      </group>

      {/* Mana Bar */}
      <group position={[0, 3.0, 0]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1.4, 0.12]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
        <mesh position={[(player.mana / player.maxMana - 1) * 0.65, 0, 0.01]}>
          <planeGeometry args={[1.3 * (player.mana / player.maxMana), 0.08]} />
          <meshBasicMaterial color="#4488ff" />
        </mesh>
      </group>
    </RigidBody>
  );
};

export default Player;
