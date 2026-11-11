import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { useKeyboard } from '../../hooks/useKeyboard';
import { calculateEquipmentStats } from '../../utils/equipmentStats';
import { SPELLS, executeSpell } from '../../data/spells';
import { isTouchDevice } from '../../utils/deviceDetection';
import { AUTO_JUMP_COOLDOWN_MS, AUTO_JUMP_DETECT_RANGE, AUTO_JUMP_IMPULSE, AUTO_JUMP_MIN_SPEED, JUMP_IMPULSE, JUMP_STAMINA_COST, JUMP_GROUNDED_THRESHOLD, JUMP_COOLDOWN_MS, NAV_WAYPOINT_ARRIVAL, NAV_STUCK_TIMEOUT,
  PLAYER_SPRINT_SPEED_MULT, PLAYER_STAMINA_SPRINT_DRAIN, PLAYER_STAMINA_BLOCK_DRAIN, PLAYER_STAMINA_REGEN,
  PLAYER_MANA_REGEN, PLAYER_MOVE_SMOOTHING, CAMERA_FOLLOW_SMOOTHING,
  DODGE_STAMINA_COST, DODGE_DURATION, DODGE_SPEED, DODGE_DOUBLE_TAP_MS } from '../../data/tuning';
import { isSolid as isBlockSolid, isTransparent as isBlockTransparent } from '../../systems/chunks/blockTypes';

// Pre-compute spell key map (SPELLS is static)
const SPELL_KEY_MAP = {
  spell1: SPELLS.find(s => s.key === '1'),
  spell2: SPELLS.find(s => s.key === '2'),
  spell3: SPELLS.find(s => s.key === '3'),
  spell4: SPELLS.find(s => s.key === '4'),
  spell5: SPELLS.find(s => s.key === '5'),
  spell6: SPELLS.find(s => s.key === '6'),
};

// Frame-rate independent smoothing: `factor` is the lerp amount per 60fps frame
const smoothing = (factor, delta) => 1 - Math.pow(1 - factor, delta * 60);

/**
 * Ground check: is there a solid block just below the capsule's feet?
 * Samples the centre and four points near the capsule edge so standing on a
 * block corner still counts. Falls back to the velocity heuristic when the
 * chunk system isn't ready.
 */
function isOnGround(cm, pos, vy) {
  if (Math.abs(vy) >= JUMP_GROUNDED_THRESHOLD) return false;
  if (!cm) return true;
  const footY = pos.y - 0.15;
  const r = 0.45;
  const samples = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]];
  for (const [ox, oz] of samples) {
    if (isBlockSolid(cm.getBlock(pos.x + ox, footY, pos.z + oz))) return true;
  }
  return false;
}

/** Sum the speed multiplier of active movement buffs (haste). */
function getBuffSpeedMultiplier(statusEffects) {
  let mult = 1;
  if (!statusEffects) return mult;
  for (const e of statusEffects) {
    if (e.type === 'haste' && e.value) mult *= e.value;
  }
  return mult;
}

const Player = () => {
  const playerRef = useRef();
  const bodyGroupRef = useRef();
  const { camera } = useThree();
  const keys = useKeyboard();

  // Read the spawn position once: after mount the physics body owns the position
  // (store position is written FROM physics each frame). Subscribing to the whole
  // player object here would re-render the player 60x per second.
  const initialPosition = useMemo(() => useGameStore.getState().player.position, []);

  // Double-tap detection for mobile sprint
  const lastTapTime = useRef(0);
  const isSprintingToggle = useRef(false);

  // Dodge roll state (refs, not React state — updated inside useFrame)
  const lastSpacePress = useRef(0);
  const isDodging = useRef(false);
  const dodgeDirection = useRef(new THREE.Vector3());
  const dodgeTimer = useRef(0);

  // E key use/interact state
  const prevUseRef = useRef(false);

  // Leg animation state
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const walkPhaseRef = useRef(0);

  // Auto-jump state (mobile/touch devices)
  const isMobileDevice = useRef(isTouchDevice());
  const lastAutoJump = useRef(0);
  const lastJumpTime = useRef(0); // Cooldown to prevent hold-to-spam

  // Stuck detection for navPath following
  const stuckTimer = useRef(0);
  const lastDistToWaypoint = useRef(Infinity);

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

    const store = useGameStore.getState();
    const body = playerRef.current;

    // Explicit teleport requests (respawn, save load) move the physics body
    if (store.pendingTeleport) {
      const [tx, ty, tz] = store.pendingTeleport;
      body.setTranslation({ x: tx, y: ty, z: tz }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      store.clearPendingTeleport();
      return; // Skip this frame to let physics settle
    }

    // Frozen while paused (physics is paused too)
    if (store.gameState === 'paused') return;

    const player = store.player;
    const cameraState = store.camera;
    const currentPos = body.translation();
    const currentVel = body.linvel();
    const cm = store._chunkManager;

    // Determine if sprinting (keyboard Shift or mobile double-tap)
    const isSprintingNow = (keys.run || isSprintingToggle.current) && player.stamina > 0;

    // Movement speed: base + equipment + buffs (haste)
    const equipSpeed = calculateEquipmentStats(store.equipment).speed || 0;
    const baseSpeed = (player.speed + equipSpeed) * getBuffSpeedMultiplier(player.statusEffects);
    const moveSpeed = isSprintingNow ? baseSpeed * PLAYER_SPRINT_SPEED_MULT : baseSpeed;
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

    // Waypoint-following: If no keyboard input and we have a navPath, follow waypoints
    if (!hasKeyboardInput && player.navPath && player.navPathIndex < player.navPath.length) {
      const waypoint = player.navPath[player.navPathIndex];
      const direction = _tempDir.current.set(
        waypoint[0] - currentPos.x,
        0,
        waypoint[2] - currentPos.z
      );
      const dist = direction.length();

      if (dist > NAV_WAYPOINT_ARRIVAL) {
        direction.normalize();
        movement.addScaledVector(direction, moveSpeed);
        isMoving = true;

        // Stuck detection: if distance hasn't decreased in NAV_STUCK_TIMEOUT, cancel
        if (dist < lastDistToWaypoint.current - 0.05) {
          stuckTimer.current = 0;
          lastDistToWaypoint.current = dist;
        } else {
          stuckTimer.current += delta;
          if (stuckTimer.current >= NAV_STUCK_TIMEOUT) {
            store.clearNavPath();
            stuckTimer.current = 0;
            lastDistToWaypoint.current = Infinity;
          }
        }
      } else {
        // Arrived at waypoint — advance or finish
        stuckTimer.current = 0;
        lastDistToWaypoint.current = Infinity;
        if (player.navPathIndex < player.navPath.length - 1) {
          store.advanceNavPathIndex();
        } else {
          store.clearNavPath();
        }
      }
    } else if (!hasKeyboardInput && player.targetPosition) {
      // Legacy fallback: direct move to targetPosition (no navPath)
      const direction = _tempDir.current.set(
        player.targetPosition[0] - currentPos.x,
        0,
        player.targetPosition[2] - currentPos.z
      );
      const dist = direction.length();

      if (dist > 0.5) {
        direction.normalize();
        movement.addScaledVector(direction, moveSpeed);
        isMoving = true;
      } else {
        store.setPlayerTarget(null);
      }
    }

    // If keyboard input is active, clear both navPath and targetPosition
    if (hasKeyboardInput && (player.targetPosition || player.navPath)) {
      store.clearNavPath();
      stuckTimer.current = 0;
      lastDistToWaypoint.current = Infinity;
    }

    // ── Collect all player state updates for a single batched write ──
    const batch = {};

    // Blocking
    const isBlocking = keys.block && player.stamina > 0;
    batch.isBlocking = isBlocking;

    // Sync sprint state to store for hunger system
    const sprintState = isSprintingNow && isMoving;
    if (sprintState !== player.isSprinting) {
      batch.isSprinting = sprintState;
    }

    // Stamina: consume or regenerate
    const curStamina = player.stamina;
    if (isBlocking) {
      batch.stamina = Math.max(0, curStamina - delta * PLAYER_STAMINA_BLOCK_DRAIN);
    } else if (isSprintingNow && isMoving) {
      batch.stamina = Math.max(0, curStamina - delta * PLAYER_STAMINA_SPRINT_DRAIN);
    } else {
      batch.stamina = Math.min(player.maxStamina, curStamina + delta * PLAYER_STAMINA_REGEN);
    }

    // Mana regeneration
    batch.mana = Math.min(player.maxMana, player.mana + delta * PLAYER_MANA_REGEN);

    // Respawn invincibility countdown
    let respawnProtected = false;
    if (player.isInvincible && player.invincibilityTimer > 0) {
      const newTimer = player.invincibilityTimer - delta;
      if (newTimer <= 0) {
        batch.isInvincible = false;
        batch.invincibilityTimer = 0;
      } else {
        batch.invincibilityTimer = newTimer;
        respawnProtected = true;
      }
    }

    // Cooldown timers
    if (player.potionCooldown > 0) {
      batch.potionCooldown = Math.max(0, player.potionCooldown - delta);
    }
    if (player.comboTimer > 0) {
      const newComboTimer = player.comboTimer - delta;
      if (newComboTimer <= 0) {
        batch.comboTimer = 0;
        batch.comboCount = 0;
      } else {
        batch.comboTimer = newComboTimer;
      }
    }

    // Spell cooldowns + buff durations (both early-return if nothing active)
    store.updateSpellCooldowns(delta);
    store.tickPlayerStatusEffects(delta);

    // Apply movement with damping for smooth control
    const moveLerp = smoothing(PLAYER_MOVE_SMOOTHING, delta);
    velocity.x = THREE.MathUtils.lerp(velocity.x, movement.x, moveLerp);
    velocity.z = THREE.MathUtils.lerp(velocity.z, movement.z, moveLerp);

    // Dodge roll handling
    if (isDodging.current) {
      dodgeTimer.current -= delta;
      if (dodgeTimer.current > 0) {
        velocity.x = dodgeDirection.current.x * DODGE_SPEED;
        velocity.z = dodgeDirection.current.z * DODGE_SPEED;
        if (!player.isInvincible) {
          batch.isInvincible = true;
        }
      } else {
        isDodging.current = false;
        // Don't cancel respawn spawn-protection when a dodge ends
        if (!respawnProtected) batch.isInvincible = false;
      }
    }

    const grounded = isOnGround(cm, currentPos, currentVel.y);

    // Auto-jump: detect 1-block obstacles ahead and jump over them
    // Triggers on mobile (always) and desktop click-to-move (no keyboard to press Space)
    if ((isMobileDevice.current || player.targetPosition || player.navPath) && !isDodging.current && grounded && isMoving) {
      const xzSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
      if (xzSpeed > AUTO_JUMP_MIN_SPEED) {
        const now = Date.now();
        if (now - lastAutoJump.current > AUTO_JUMP_COOLDOWN_MS) {
          // Check for obstacle at foot level in movement direction
          const moveDir = _tempDir.current.set(velocity.x, 0, velocity.z).normalize();
          const checkX = currentPos.x + moveDir.x * AUTO_JUMP_DETECT_RANGE;
          const checkZ = currentPos.z + moveDir.z * AUTO_JUMP_DETECT_RANGE;
          // Check if there's a solid block at foot level but NOT at head level
          const footY = currentPos.y + 0.5;
          const headY = currentPos.y + 2.5;
          if (cm) {
            const footBlock = cm.getBlock(checkX, footY, checkZ);
            const headBlock = cm.getBlock(checkX, headY, checkZ);
            if (isBlockSolid(footBlock) && !isBlockSolid(headBlock)) {
              velocity.y = AUTO_JUMP_IMPULSE;
              lastAutoJump.current = now;
            }
          }
        }
      }
    }

    // Jumping (disabled during dodge, requires ground contact + cooldown + stamina)
    if (keys.jump && grounded && !isDodging.current) {
      const now = Date.now();
      if (now - lastJumpTime.current >= JUMP_COOLDOWN_MS) {
        // Check for double-tap dodge roll
        if (now - lastSpacePress.current < DODGE_DOUBLE_TAP_MS && batch.stamina >= DODGE_STAMINA_COST && movement.length() > 0) {
          // Double-tap detected - dodge roll!
          batch.stamina = Math.max(0, batch.stamina - DODGE_STAMINA_COST);
          isDodging.current = true;
          dodgeTimer.current = DODGE_DURATION;
          dodgeDirection.current.copy(movement).normalize();
          lastSpacePress.current = 0; // Reset to prevent triple tap
          lastJumpTime.current = now;
        } else if (batch.stamina >= JUMP_STAMINA_COST) {
          // Single tap - normal jump
          velocity.y = JUMP_IMPULSE;
          batch.stamina = Math.max(0, batch.stamina - JUMP_STAMINA_COST);
          lastSpacePress.current = now;
          lastJumpTime.current = now;
        }
      }
    }

    // Apply velocity
    body.setLinvel(velocity, true);

    // Player position (included in batched write below)
    const newPos = [currentPos.x, currentPos.y, currentPos.z];

    // Leg walk animation
    const xzSpeed = Math.sqrt(currentVel.x * currentVel.x + currentVel.z * currentVel.z);
    if (xzSpeed > 0.5) {
      walkPhaseRef.current += delta * 10;
      const swing = Math.sin(walkPhaseRef.current) * 0.6;
      if (leftLegRef.current?.rotation) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current?.rotation) rightLegRef.current.rotation.x = -swing;
    } else {
      walkPhaseRef.current = 0;
      if (leftLegRef.current?.rotation) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current?.rotation) rightLegRef.current.rotation.x = 0;
    }

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
      // Third-person camera: orbit around player with pitch
      const angle = cameraState.rotationAngle;
      const distance = cameraState.distance;
      const pitch = cameraState.pitch || 0; // radians, 0 = level, positive = look down

      // Spherical coordinates with pitch
      // pitch > 0 → camera goes higher (looking down at player)
      // pitch < 0 → camera goes lower (looking up at player)
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      const baseHeight = distance * 0.7; // Base elevation scales with distance
      const horizontalDist = distance * cosPitch;
      // Clamp vertical so camera never goes below player feet
      const verticalOffset = Math.max(1.5, baseHeight + distance * sinPitch * 0.6);

      targetCameraPos.set(
        currentPos.x + Math.sin(angle) * horizontalDist,
        currentPos.y + verticalOffset,
        currentPos.z + Math.cos(angle) * horizontalDist
      );

      targetLookAt.set(currentPos.x, currentPos.y + 2, currentPos.z);

      // Camera-terrain collision: pull camera in when obstructed by opaque blocks
      // (skip transparent blocks like leaves so trees don't constantly clip the camera)
      if (cm) {
        const headX = currentPos.x;
        const headY = currentPos.y + 2;
        const headZ = currentPos.z;
        const steps = Math.ceil(distance / 1.5);
        const sdx = (targetCameraPos.x - headX) / steps;
        const sdy = (targetCameraPos.y - headY) / steps;
        const sdz = (targetCameraPos.z - headZ) / steps;
        let clipFraction = 1.0;
        for (let i = 1; i <= steps; i++) {
          const sx = headX + sdx * i;
          const sy = headY + sdy * i;
          const sz = headZ + sdz * i;
          const block = cm.getBlock(sx, sy, sz);
          if (isBlockSolid(block) && !isBlockTransparent(block)) {
            clipFraction = Math.max(0.3, (i - 1) / steps);
            break;
          }
        }
        if (clipFraction < 1.0) {
          targetCameraPos.lerp(targetLookAt, 1.0 - clipFraction);
        }
      }

      // Smooth camera movement (frame-rate independent)
      camera.position.lerp(targetCameraPos, smoothing(CAMERA_FOLLOW_SMOOTHING, delta));
      camera.lookAt(targetLookAt);
    }

    // Calculate facing angle for player
    if (cameraState.firstPerson) {
      batch.facingAngle = cameraState.yaw;
    } else if (movement.length() > 0) {
      batch.facingAngle = Math.atan2(movement.x, movement.z);
    }

    // Rotate the body mesh directly (no React re-render)
    if (bodyGroupRef.current?.rotation) {
      bodyGroupRef.current.rotation.y = batch.facingAngle ?? player.facingAngle;
    }

    // ── Single batched store write for all player state ──
    batch.position = newPos;
    store.updatePlayer(batch);
  });

  // Handle double-tap for mobile sprint
  useEffect(() => {
    const handleDoubleTap = (e) => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime.current;

      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // Double tap detected
        isSprintingToggle.current = !isSprintingToggle.current;
      }

      lastTapTime.current = now;
    };

    window.addEventListener('touchstart', handleDoubleTap);
    return () => window.removeEventListener('touchstart', handleDoubleTap);
  }, []);

  // Handle spells, potions, and E key — polled every frame via useFrame
  // (Cannot use useEffect because `keys` is a stable mutable ref that never triggers re-renders)
  useFrame(() => {
    const store = useGameStore.getState();
    if (store.gameState !== 'playing') return;
    const currentPlayer = store.player;

    const spellKeyMap = SPELL_KEY_MAP;

    // In third-person, keyboard-cast spells aim in the camera's forward direction
    // (camera orbits behind the player, so forward = rotationAngle + PI)
    const cameraState = store.camera;
    let spellPlayer = currentPlayer;
    if (!cameraState.firstPerson) {
      const aimYaw = (cameraState.rotationAngle || 0) + Math.PI;
      spellPlayer = { ...currentPlayer, facingAngle: aimYaw };
    }

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
      const result = executeSpell(spell, spellPlayer, store);
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

    // Potion use (H key)
    if (keys.potion && store.inventory.potions > 0 && currentPlayer.potionCooldown <= 0 && currentPlayer.health > 0) {
      store.usePotion();
    }

    // E key use/interact (detect false→true transition)
    if (keys.use && !prevUseRef.current) {
      store.useBlock?.();
    }
    prevUseRef.current = !!keys.use;
  });

  // Capsule collider: halfHeight=0.8, radius=0.6 → total height = 2*0.8 + 2*0.6 = 2.8 units (~1.4 blocks)
  // Smoother than cuboid — prevents getting stuck on block edges
  return (
    <RigidBody
      ref={playerRef}
      position={initialPosition}
      enabledRotations={[false, false, false]}
      type="dynamic"
      colliders={false}
      mass={1}
      linearDamping={0.5}
      angularDamping={1}
    >
      <CapsuleCollider args={[0.8, 0.6]} position={[0, 1.4, 0]} friction={0} restitution={0} />
      <group ref={bodyGroupRef}>
        {/* Player body (torso) */}
        <mesh position={[0, 1.35, 0]}>
          <boxGeometry args={[1.2, 1.3, 0.8]} />
          <meshBasicMaterial color="#4169e1" />
        </mesh>

        {/* Left leg */}
        <group ref={leftLegRef} position={[-0.28, 0.45, 0]}>
          <mesh>
            <boxGeometry args={[0.35, 0.9, 0.45]} />
            <meshBasicMaterial color="#2a4cb0" />
          </mesh>
        </group>

        {/* Right leg */}
        <group ref={rightLegRef} position={[0.28, 0.45, 0]}>
          <mesh>
            <boxGeometry args={[0.35, 0.9, 0.45]} />
            <meshBasicMaterial color="#2a4cb0" />
          </mesh>
        </group>

        {/* Player head */}
        <mesh position={[0, 2.4, 0]}>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshBasicMaterial color="#5a7fd6" />
        </mesh>

        {/* Nose (small protruding box) */}
        <mesh position={[0, 2.3, 0.5]}>
          <boxGeometry args={[0.18, 0.15, 0.15]} />
          <meshBasicMaterial color="#e8967a" />
        </mesh>
      </group>

    </RigidBody>
  );
};

export default Player;
