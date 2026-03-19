import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

const MAX_DOTS = 64;
const DOT_RADIUS = 0.4;
const DOT_Y_OFFSET = 0.15; // Slight lift above ground to avoid z-fighting

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

const PathVisualization = () => {
  const meshRef = useRef();

  const geometry = useMemo(() => new THREE.CircleGeometry(DOT_RADIUS, 8), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#00ff88',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { navPath, navPathIndex } = useGameStore.getState().player;

    if (!navPath || navPathIndex >= navPath.length) {
      mesh.count = 0;
      return;
    }

    const remaining = navPath.length - navPathIndex;
    const count = Math.min(remaining, MAX_DOTS);
    mesh.count = count;

    for (let i = 0; i < count; i++) {
      const wp = navPath[navPathIndex + i];
      _dummy.position.set(wp[0], wp[1] + DOT_Y_OFFSET, wp[2]);
      _dummy.rotation.x = -Math.PI / 2; // Flat on ground
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);

      // Fade dots further along the path
      const t = i / Math.max(count - 1, 1);
      _color.set('#00ff88').lerp(new THREE.Color('#005533'), t);
      mesh.setColorAt(i, _color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, MAX_DOTS]} frustumCulled={false}>
    </instancedMesh>
  );
};

export default React.memo(PathVisualization);
