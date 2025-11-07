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

    const handlePointerDown = (event) => {
      // Ignore if not in playing state
      if (useGameStore.getState().gameState !== 'playing') return;

      // Get normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycaster.setFromCamera({ x, y }, camera);

      // Get all intersections
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0];

        // Check if we hit an enemy
        let currentObject = hit.object;
        let isEnemy = false;
        let enemyData = null;

        // Traverse up to check if this is part of an enemy
        while (currentObject) {
          if (currentObject.userData?.isEnemy) {
            isEnemy = true;
            enemyData = currentObject.userData;
            break;
          }
          currentObject = currentObject.parent;
        }

        if (isEnemy && enemyData?.takeDamage) {
          // Attack enemy
          const playerDamage = useGameStore.getState().player.damage;
          console.log(`Attacking enemy with ${playerDamage} damage!`);
          enemyData.takeDamage(playerDamage);

          // Add red attack marker at enemy position
          useGameStore.getState().addTargetMarker({
            position: [hit.point.x, hit.point.y, hit.point.z],
            color: '#ff0000',
          });

          // Remove marker after 1 second
          setTimeout(() => {
            const markers = useGameStore.getState().targetMarkers;
            if (markers.length > 0) {
              useGameStore.getState().removeTargetMarker(markers[0].id);
            }
          }, 1000);
        } else {
          // Move to location (hit ground or other non-enemy object)
          useGameStore.getState().setPlayerTarget([
            hit.point.x,
            hit.point.y,
            hit.point.z,
          ]);

          // Add green movement marker
          useGameStore.getState().addTargetMarker({
            position: [hit.point.x, hit.point.y, hit.point.z],
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

    // Add event listeners for both mouse and touch
    gl.domElement.addEventListener('click', handlePointerDown);
    gl.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        handlePointerDown({
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
      }
    });

    return () => {
      gl.domElement.removeEventListener('click', handlePointerDown);
    };
  }, [gl, scene, camera, gameState]);

  return null; // This component doesn't render anything
};

export default TouchControls;
