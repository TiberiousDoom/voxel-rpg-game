/**
 * WeatherEffects.jsx — 3D weather particle rendering for the R3F scene.
 *
 * Reads weather state from the TerrainSystem (via store) and renders
 * rain/snow/fog particles using instanced meshes. Also adjusts scene
 * fog based on weather type.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';

const PARTICLE_COUNT = 300;
const SPREAD = 60; // Particle spread radius around player
const HEIGHT = 40; // Max height above player

const particleGeo = new THREE.PlaneGeometry(0.08, 0.6);

const WeatherEffects = () => {
  const meshRef = useRef();
  const { scene } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const positions = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * SPREAD,
      y: Math.random() * HEIGHT,
      z: (Math.random() - 0.5) * SPREAD,
      speed: 8 + Math.random() * 12,
      drift: (Math.random() - 0.5) * 0.5,
    }))
  );

  const material = useMemo(() =>
    new THREE.MeshBasicMaterial({
      color: '#aaccee',
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    }), []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const store = useGameStore.getState();
    const weather = store.weather?.current || 'clear';
    const playerPos = store.player.position;

    // Determine if we should show particles
    const isRain = weather === 'rain' || weather === 'heavy_rain' || weather === 'storm';
    const isSnow = weather === 'snow' || weather === 'blizzard';
    const isFog = weather === 'fog';
    const showParticles = isRain || isSnow;

    // Update scene fog based on weather
    if (isFog || weather === 'heavy_rain' || weather === 'blizzard') {
      if (!scene.fog || scene.fog.far > 60) {
        scene.fog = new THREE.Fog('#888888', 10, 60);
      }
    } else if (scene.fog && scene.fog.far < 200) {
      scene.fog = null;
    }

    if (!showParticles) {
      meshRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;

    // Update color based on weather type
    material.color.set(isSnow ? '#ffffff' : '#aaccee');
    material.opacity = isSnow ? 0.6 : 0.3;

    const particles = positions.current;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];

      // Fall
      p.y -= p.speed * delta * (isSnow ? 0.3 : 1.0);
      p.x += p.drift * delta * (isSnow ? 3 : 1);

      // Reset when below ground
      if (p.y < -2) {
        p.y = HEIGHT;
        p.x = (Math.random() - 0.5) * SPREAD;
        p.z = (Math.random() - 0.5) * SPREAD;
      }

      dummy.position.set(
        playerPos[0] + p.x,
        playerPos[1] + p.y,
        playerPos[2] + p.z,
      );

      if (isSnow) {
        dummy.rotation.set(0, 0, Math.random() * Math.PI);
      } else {
        dummy.rotation.set(0, 0, 0.1); // Slight tilt for rain
      }

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[particleGeo, material, PARTICLE_COUNT]}
      frustumCulled={false}
    />
  );
};

export default React.memo(WeatherEffects);
