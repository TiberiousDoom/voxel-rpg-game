import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { getSpellById, executeSpell } from '../../data/spells';
import { performMeleeAttack, MELEE_COOLDOWN } from '../../data/meleeAttack';
import { findPath } from '../../utils/playerPathfinder';

/**
 * Component that handles touch/click controls for movement and attacking
 */
const TouchControls = () => {
  const { gl, scene, camera } = useThree();
  const gameState = useGameStore((state) => state.gameState);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const raycaster = new THREE.Raycaster();
    let lastTapTime = 0;

    const handlePointerDown = (event) => {
      // Ignore if not in playing state
      if (useGameStore.getState().gameState !== 'playing') return;

      // Don't handle clicks when pointer lock is active (first-person mode) -
      // BlockInteraction handles mining/placement in that mode
      if (document.pointerLockElement) return;

      // Skip if a block click just happened (desktop 3P mining/placing)
      const store = useGameStore.getState();
      if (store._blockClickActive) {
        store._blockClickActive = false;
        return;
      }

      // Skip if a long press just fired - BlockInteraction stamps the canvas
      // dataset when a long-press mine/place happens, and the synthetic click
      // from touchend should not trigger movement
      const longPressAt = Number(gl.domElement.dataset.longPressAt || '0');
      if (Date.now() - longPressAt < 500) return;

      // Prevent duplicate events (mobile fires both touchstart and click)
      const now = Date.now();
      if (now - lastTapTime < 300) return; // Ignore if within 300ms of last tap
      lastTapTime = now;

      // Get normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycaster.setFromCamera({ x, y }, camera);

      // Get all intersections
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        // Check ALL intersections for enemies (prioritize enemies over ground)
        let enemyHit = null;
        let enemyData = null;
        let groundHit = null;

        for (let i = 0; i < intersects.length; i++) {
          const hit = intersects[i];
          let currentObject = hit.object;

          // Traverse up to check if this is part of an enemy
          while (currentObject) {
            if (currentObject.userData?.isEnemy) {
              enemyHit = hit;
              enemyData = currentObject.userData;
              break;
            }
            currentObject = currentObject.parent;
          }

          // If we found an enemy, stop looking
          if (enemyHit) break;

          // Otherwise, store the first non-enemy hit (probably ground)
          if (!groundHit) {
            groundHit = hit;
          }
        }

        // Helper: try to cast the active spell toward a world position
        const tryCastSpellAt = (targetPoint) => {
          const attackStore = useGameStore.getState();
          const spell = getSpellById(attackStore.activeSpellId);
          if (!spell) return false;
          if (attackStore.player.mana < spell.manaCost) return false;
          const cooldown = attackStore.getSpellCooldown(spell.id);
          if (cooldown > 0) return false;

          // Set aimTarget so the projectile flies toward the click point
          const playerWithAim = {
            ...attackStore.player,
            aimTarget: [targetPoint.x, targetPoint.y, targetPoint.z],
          };

          const result = executeSpell(spell, playerWithAim, attackStore);
          if (result.success) {
            attackStore.setSpellCooldown(spell.id, spell.cooldown);
          }
          return result.success;
        };

        if (enemyHit && enemyData?.takeDamage) {
          // Attack enemy — try spell first, melee fallback
          const spellFired = tryCastSpellAt(enemyHit.point);
          if (!spellFired) {
            // Melee fallback
            const meleeStore = useGameStore.getState();
            const meleeCooldown = meleeStore.getSpellCooldown('__melee__');
            if (!meleeCooldown || meleeCooldown <= 0) {
              const pp = meleeStore.player.position;
              const ex = enemyHit.point.x;
              const ez = enemyHit.point.z;
              const facingAngle = Math.atan2(ex - pp[0], ez - pp[2]);
              performMeleeAttack(meleeStore, pp, facingAngle, meleeStore.enemies);
              meleeStore.setSpellCooldown('__melee__', MELEE_COOLDOWN);
            }
          }

          // Add red attack marker at enemy center (elevated)
          useGameStore.getState().addTargetMarker({
            position: [enemyHit.point.x, enemyHit.point.y + 1, enemyHit.point.z],
            color: '#ff0000',
          });

          // Remove marker after 0.8 seconds
          setTimeout(() => {
            const markers = useGameStore.getState().targetMarkers;
            if (markers.length > 0) {
              useGameStore.getState().removeTargetMarker(markers[0].id);
            }
          }, 800);

          // Don't move to enemy location - attack in place
          return;
        }

        // Block movement clicks when build mode or zone mode is active (but attacks above still work)
        if (useGameStore.getState().buildMode) return;
        if (useGameStore.getState().zoneMode) return;

        if (groundHit) {
          // On mobile: prioritize movement. Only cast spell if tapping near self.
          const goalPos = [groundHit.point.x, groundHit.point.y, groundHit.point.z];
          const clickStore = useGameStore.getState();
          const playerPos = clickStore.player.position;

          // Distance from player to tap point
          const tapDx = goalPos[0] - playerPos[0];
          const tapDz = goalPos[2] - playerPos[2];
          const tapDist = Math.sqrt(tapDx * tapDx + tapDz * tapDz);

          if (tapDist < 5) {
            // Tap near self — cast spell at feet (AOE, self-buff, etc.)
            tryCastSpellAt(groundHit.point);
          } else {
            // Tap far away — move to location with pathfinding
            const cm = clickStore._chunkManager;

            if (cm) {
              const path = findPath(cm, playerPos, goalPos);
              if (path && path.length > 0) {
                clickStore.setPlayerNavPath(path, goalPos);
              } else {
                clickStore.setPlayerTarget(goalPos);
              }
            } else {
              clickStore.setPlayerTarget(goalPos);
            }
          }

          // Add marker (orange for spell, green for move)
          const markerColor = didCast ? '#ff6600' : '#00ff00';
          useGameStore.getState().addTargetMarker({
            position: [groundHit.point.x, groundHit.point.y, groundHit.point.z],
            color: markerColor,
          });

          // Remove marker after timeout
          setTimeout(() => {
            const markers = useGameStore.getState().targetMarkers;
            if (markers.length > 0) {
              useGameStore.getState().removeTargetMarker(markers[0].id);
            }
          }, didCast ? 800 : 2000);
        }
      }
    };

    // Use click only (not touchstart) so that BlockInteraction's long-press
    // touchend handler can preventDefault() to block the click on long press.
    // Short taps still generate a click event for movement.
    gl.domElement.addEventListener('click', handlePointerDown);

    return () => {
      gl.domElement.removeEventListener('click', handlePointerDown);
    };
  }, [gl, scene, camera, gameState]);

  return null; // This component doesn't render anything
};

export default TouchControls;
