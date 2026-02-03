import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

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
          // Attack enemy with projectile - DO NOT MOVE
          const playerPos = useGameStore.getState().player.position;
          const playerDamage = useGameStore.getState().player.damage;

          // Calculate direction from player to enemy
          const direction = [
            enemyHit.point.x - playerPos[0],
            (enemyHit.point.y + 0.5) - (playerPos[1] + 0.5),
            enemyHit.point.z - playerPos[2],
          ];
          const length = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);
          const normalizedDir = [
            direction[0] / length,
            direction[1] / length,
            direction[2] / length,
          ];

          // Spawn a projectile from player towards enemy
          useGameStore.getState().addProjectile({
            id: `tap-attack-${Date.now()}`,
            position: [playerPos[0], playerPos[1] + 0.5, playerPos[2]],
            direction: normalizedDir,
            speed: 25,
            damage: playerDamage,
            color: '#00ffff', // Cyan for tap attacks
          });

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
        } else if (groundHit) {
          // Move to location (hit ground or other non-enemy object)
          useGameStore.getState().setPlayerTarget([
            groundHit.point.x,
            groundHit.point.y,
            groundHit.point.z,
          ]);

          // Add green movement marker
          useGameStore.getState().addTargetMarker({
            position: [groundHit.point.x, groundHit.point.y, groundHit.point.z],
            color: '#00ff00',
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

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        handlePointerDown({
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
      }
    };

    // Add event listeners for both mouse and touch
    gl.domElement.addEventListener('click', handlePointerDown);
    gl.domElement.addEventListener('touchstart', handleTouchStart);

    return () => {
      gl.domElement.removeEventListener('click', handlePointerDown);
      gl.domElement.removeEventListener('touchstart', handleTouchStart);
    };
  }, [gl, scene, camera, gameState]);

  return null; // This component doesn't render anything
};

export default TouchControls;
