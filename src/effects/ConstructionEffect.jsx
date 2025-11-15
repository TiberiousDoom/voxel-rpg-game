/**
 * ConstructionEffect.jsx - React component for construction particle effects
 *
 * Displays particle effects during building construction including:
 * - Construction dust particles
 * - Sparks and debris
 * - Progress-based effect intensity
 *
 * Part of WF3: Building Rendering & Visual Effects
 */

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { createParticleSystem } from './ParticleSystem.js';
import './ConstructionEffect.css';

/**
 * ConstructionEffect Component
 * Renders construction particle effects on a canvas overlay
 */
function ConstructionEffect({
  buildings = [],
  width = 400,
  height = 400,
  enabled = true,
  intensity = 1.0
}) {
  const canvasRef = useRef(null);
  const particleSystemRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastEmitTimeRef = useRef({});

  /**
   * Initialize particle system
   */
  useEffect(() => {
    if (!enabled) return;

    particleSystemRef.current = createParticleSystem();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  /**
   * Animation loop
   */
  useEffect(() => {
    if (!enabled || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const particleSystem = particleSystemRef.current;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update and render particles
      if (particleSystem) {
        particleSystem.update();
        particleSystem.render(ctx);
      }

      // Emit particles for buildings under construction
      buildings.forEach(building => {
        if (!building || !building.position) return;

        const state = building.state || 'COMPLETE';
        const isUnderConstruction = state === 'UNDER_CONSTRUCTION' || state === 'BUILDING';

        if (!isUnderConstruction) return;

        const buildingId = building.id || `${building.position.x}-${building.position.z}`;
        const now = Date.now();
        const lastEmit = lastEmitTimeRef.current[buildingId] || 0;

        // Emit particles every 500ms per building
        if (now - lastEmit > 500 / intensity) {
          const x = building.position.x * 40 + 20; // Convert grid to canvas coords
          const y = building.position.z * 40 + 20;

          // Emit dust
          particleSystem.createConstructionDust(x, y);

          // Occasionally emit sparks (30% chance)
          if (Math.random() < 0.3) {
            particleSystem.createConstructionSparks(x, y);
          }

          lastEmitTimeRef.current[buildingId] = now;
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, buildings, width, height, intensity]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="construction-effect-canvas"
      width={width}
      height={height}
    />
  );
}

ConstructionEffect.propTypes = {
  buildings: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      type: PropTypes.string,
      state: PropTypes.string,
      position: PropTypes.shape({
        x: PropTypes.number,
        z: PropTypes.number
      })
    })
  ),
  width: PropTypes.number,
  height: PropTypes.number,
  enabled: PropTypes.bool,
  intensity: PropTypes.number
};

export default ConstructionEffect;
