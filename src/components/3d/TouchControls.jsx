import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { getSpellById, executeSpell } from '../../data/spells';
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

        if (enemyHit && enemyData?.takeDamage) {
          // Attack enemy using the active spell — works regardless of build mode
          const attackStore = useGameStore.getState();
          const spell = getSpellById(attackStore.activeSpellId);
          if (!spell) return;

          // Check mana
          if (attackStore.player.mana < spell.manaCost) return;

          // Check cooldown
          const cooldown = attackStore.getSpellCooldown(spell.id);
          if (cooldown > 0) return;

          // Override player facingAngle to aim at enemy for spell direction
          const playerPos = attackStore.player.position;
          const dx = enemyHit.point.x - playerPos[0];
          const dz = enemyHit.point.z - playerPos[2];
          const aimAngle = Math.atan2(dx, dz);
          const playerWithAim = { ...attackStore.player, facingAngle: aimAngle };

          const result = executeSpell(spell, playerWithAim, attackStore);
          if (result.success) {
            attackStore.setSpellCooldown(spell.id, spell.cooldown);
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
          const goalPos = [groundHit.point.x, groundHit.point.y, groundHit.point.z];
          const clickStore = useGameStore.getState();
          const playerPos = clickStore.player.position;
          const cm = clickStore._chunkManager;

          let markerColor = '#00ff00';

          if (cm) {
            const path = findPath(cm, playerPos, goalPos);
            if (path && path.length > 0) {
              clickStore.setPlayerNavPath(path, goalPos);
            } else {
              // No path found — fallback to direct move
              clickStore.setPlayerTarget(goalPos);
              markerColor = '#ff8800'; // orange = direct move
            }
          } else {
            // ChunkManager not ready — fallback to direct move
            clickStore.setPlayerTarget(goalPos);
          }

          // Add movement marker
          clickStore.addTargetMarker({
            position: goalPos,
            color: markerColor,
          });

          // Remove marker after 2 seconds
          setTimeout(() => {
            const markers = useGameStore.getState().targetMarkers;
            if (markers.length > 0) {
              useGameStore.getState().removeTargetMarker(markers[0].id);
            }
          }, 2000);
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
