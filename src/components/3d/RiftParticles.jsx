/**
 * RiftParticles.jsx — Continuous spiral particle effect for rift portals
 *
 * Uses a single instancedMesh (1 draw call) with 40 particles spiraling upward.
 * Brighter and more opaque at night.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 40;
const SPIRAL_HEIGHT = 10;
const SPIRAL_ROTATIONS = 2;
const BASE_RADIUS = 6.0;
const TOP_RADIUS = 0.9;

const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const tempScale = new THREE.Vector3();
const tempColor = new THREE.Color();

const RiftParticles = ({ isNight }) => {
  const meshRef = useRef();

  const geometry = useMemo(() => new THREE.SphereGeometry(0.12, 4, 4), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#aa55ff',
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  }), []);

  useFrame(() => {
    if (!meshRef.current) return;

    const time = Date.now() * 0.001;
    const nightMult = isNight ? 1.0 : 0.6;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Staggered phase so particles are evenly distributed along the spiral
      const phase = (i / PARTICLE_COUNT + time * 0.3) % 1.0;

      // Spiral path
      const angle = phase * Math.PI * 2 * SPIRAL_ROTATIONS;
      const t = phase; // 0 at bottom, 1 at top
      const radius = BASE_RADIUS * (1 - t) + TOP_RADIUS * t;

      tempPosition.set(
        Math.cos(angle) * radius,
        t * SPIRAL_HEIGHT,
        Math.sin(angle) * radius
      );

      // Scale pulses with sin curve — larger in middle, smaller at ends
      const scalePulse = 0.5 + Math.sin(t * Math.PI) * 0.5;
      const s = (0.3 + scalePulse * 0.7) * nightMult;
      tempScale.set(s, s, s);

      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      meshRef.current.setMatrixAt(i, tempMatrix);

      // Color: brighter purple at night, dimmer during day
      const brightness = (0.4 + scalePulse * 0.6) * nightMult;
      tempColor.setRGB(0.6 * brightness, 0.2 * brightness, 1.0 * brightness);
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, PARTICLE_COUNT]}
      frustumCulled={false}
    />
  );
};

export default React.memo(RiftParticles);
