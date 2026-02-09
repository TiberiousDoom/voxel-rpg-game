/**
 * DayNightCycle.jsx — R3F component that drives day/night lighting
 *
 * Owns a TimeManager instance, updates it each frame, and syncs
 * lighting params (ambient, directional, sky, fog) to the Three.js scene.
 * Pushes time state to the Zustand store so other systems can read it.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { TimeManager } from '../../systems/time/TimeManager';
import { getLightingState } from '../../systems/lighting/DayNightLighting';

const DayNightCycle = () => {
  const { scene, camera } = useThree();

  const ambientRef = useRef();
  const directionalRef = useRef();
  const celestialRef = useRef();

  // Read store selectors
  const timeScale = useGameStore((s) => s.worldTime.timeScale);
  const timePaused = useGameStore((s) => s.worldTime.paused);
  const savedElapsed = useGameStore((s) => s.worldTime.elapsed);

  // Actions
  const updateWorldTime = useGameStore((s) => s.updateWorldTime);

  // Create TimeManager once, restore from store
  const timeManager = useMemo(() => {
    const tm = new TimeManager(savedElapsed);
    return tm;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only create once on mount

  // Sync debug controls from store → TimeManager
  useEffect(() => {
    timeManager.timeScale = timeScale;
  }, [timeManager, timeScale]);

  useEffect(() => {
    timeManager.paused = timePaused;
  }, [timeManager, timePaused]);

  // Color objects reused each frame (avoid allocations)
  const skyColor = useMemo(() => new THREE.Color(), []);
  const fogColor = useMemo(() => new THREE.Color(), []);
  const ambientColor = useMemo(() => new THREE.Color(), []);
  const celestialColor = useMemo(() => new THREE.Color(), []);

  // Initialize lighting immediately on mount (before first frame)
  useEffect(() => {
    const lighting = getLightingState(timeManager.timeOfDay);

    // Set initial background color
    skyColor.set(lighting.skyColor);
    scene.background = skyColor;

    // Create fog if it doesn't exist, or update existing fog
    if (!scene.fog) {
      scene.fog = new THREE.Fog(lighting.fogColor, 150, 400);
    } else {
      fogColor.set(lighting.fogColor);
      scene.fog.color.copy(fogColor);
    }
  }, [scene, timeManager, skyColor, fogColor]);

  useFrame((_, delta) => {
    // Advance time
    timeManager.update(delta);

    // Get lighting state for current time
    const lighting = getLightingState(timeManager.timeOfDay);

    // Update ambient light
    if (ambientRef.current) {
      ambientRef.current.intensity = lighting.ambientIntensity;
      ambientColor.set(lighting.ambientColor);
      ambientRef.current.color.copy(ambientColor);
    }

    // Update directional light (sun)
    if (directionalRef.current) {
      directionalRef.current.intensity = lighting.directionalIntensity;
      directionalRef.current.position.set(
        lighting.sunPosition.x,
        lighting.sunPosition.y,
        lighting.sunPosition.z
      );
    }

    // Update sky color (scene background)
    skyColor.set(lighting.skyColor);
    scene.background = skyColor;

    // Update fog
    if (scene.fog) {
      fogColor.set(lighting.fogColor);
      scene.fog.color.copy(fogColor);
    }

    // Update celestial body (sun/moon) — follows player at a fixed visual distance
    if (celestialRef.current) {
      const sunPos = lighting.sunPosition;
      const isDay = sunPos.y > 0;
      // Position relative to camera so it's always visible in the sky
      const camPos = camera.position;
      // Scale down sun position to place it in the distance
      const celestialDist = 200;
      const nx = sunPos.x / 50; // Normalize (original range is ±50)
      const ny = sunPos.y / 50;
      const nz = sunPos.z / 50;
      celestialRef.current.position.set(
        camPos.x + nx * celestialDist,
        Math.max(5, camPos.y + ny * celestialDist),
        camPos.z + nz * celestialDist
      );
      // Sun = yellow/white, Moon = pale blue
      if (isDay) {
        celestialColor.set('#ffdd44');
        celestialRef.current.scale.setScalar(8);
      } else {
        celestialColor.set('#aabbdd');
        celestialRef.current.scale.setScalar(6);
      }
      celestialRef.current.material.color.copy(celestialColor);
      celestialRef.current.material.emissive.copy(celestialColor);
      celestialRef.current.material.emissiveIntensity = isDay ? 1.0 : 0.5;
      celestialRef.current.visible = true;
    }

    // Push time state to store (throttled — every ~100ms via frame rate)
    // We do this every frame since it's cheap and avoids stale reads
    updateWorldTime({
      elapsed: timeManager.worldTime,
      timeOfDay: timeManager.timeOfDay,
      dayNumber: timeManager.dayNumber,
      isNight: timeManager.isNight,
      period: timeManager.period,
      hour: timeManager.hour,
      minute: timeManager.minute,
    });
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.6} />
      <directionalLight
        ref={directionalRef}
        position={[50, 50, 25]}
        intensity={0.8}
      />
      {/* Sun/Moon celestial body */}
      <mesh ref={celestialRef} visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#ffdd44" emissive="#ffdd44" emissiveIntensity={1.0} />
      </mesh>
    </>
  );
};

export default DayNightCycle;
