/**
 * DayNightCycle.jsx — R3F component that drives day/night lighting
 *
 * Owns a TimeManager instance, updates it each frame, and syncs
 * lighting params (ambient, directional, sky, fog) to the Three.js scene.
 * Pushes time state to the Zustand store so other systems can read it.
 */

import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color } from 'three';
import useGameStore from '../../stores/useGameStore';
import { TimeManager } from '../../systems/time/TimeManager';
import { getLightingState } from '../../systems/lighting/DayNightLighting';

const DayNightCycle = () => {
  const { scene } = useThree();

  const ambientRef = useRef();
  const directionalRef = useRef();

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
  const skyColor = useMemo(() => new Color(), []);
  const fogColor = useMemo(() => new Color(), []);
  const ambientColor = useMemo(() => new Color(), []);

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
    </>
  );
};

export default DayNightCycle;
