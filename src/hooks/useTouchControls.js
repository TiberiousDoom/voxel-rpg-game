import { useThree } from '@react-three/fiber';
import { useEffect, useCallback } from 'react';
import * as THREE from 'three';

/**
 * Hook for handling touch/click to move and attack
 * @returns {Object} Touch control state and handlers
 */
export function useTouchControls() {
  const { camera, gl, scene } = useThree();
  const raycaster = new THREE.Raycaster();

  const handlePointerDown = useCallback((event) => {
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

      // Check if we hit an enemy (red mesh)
      let currentObject = hit.object;
      let isEnemy = false;

      // Traverse up to check if this is part of an enemy
      while (currentObject) {
        if (currentObject.userData?.isEnemy) {
          isEnemy = true;
          break;
        }
        currentObject = currentObject.parent;
      }

      return {
        point: hit.point,
        isEnemy,
        enemyObject: isEnemy ? currentObject : null,
      };
    }

    return null;
  }, [camera, gl, scene, raycaster]);

  return { handlePointerDown };
}
