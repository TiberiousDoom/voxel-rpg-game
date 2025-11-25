/**
 * useProjectileRenderer.js - 2D Projectile rendering hook
 *
 * Renders animated projectiles for ranged attacks in 2D canvas mode
 */

import { useCallback, useRef } from 'react';

/**
 * Hook for rendering and managing 2D projectiles
 * @param {Object} options - Renderer options
 * @returns {Object} Renderer functions and projectile management
 */
export function useProjectileRenderer(options = {}) {
  const projectilesRef = useRef([]);
  const nextIdRef = useRef(1);

  /**
   * Create a new projectile
   * @param {Object} params - Projectile parameters
   * @returns {Object} The created projectile
   */
  const createProjectile = useCallback(({
    startX,
    startZ,
    targetX,
    targetZ,
    damage,
    speed = 15, // Units per second
    color = '#ff6600',
    size = 8,
    onHit = null, // Callback when projectile reaches target
    targetId = null, // ID of target monster
  }) => {
    const id = nextIdRef.current++;

    // Calculate direction and distance
    const dx = targetX - startX;
    const dz = targetZ - startZ;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Normalize direction
    const dirX = distance > 0 ? dx / distance : 0;
    const dirZ = distance > 0 ? dz / distance : 1;

    const projectile = {
      id,
      x: startX,
      z: startZ,
      targetX,
      targetZ,
      dirX,
      dirZ,
      speed,
      damage,
      color,
      size,
      onHit,
      targetId,
      createdAt: performance.now(),
      trail: [], // Trail positions for visual effect
    };

    projectilesRef.current.push(projectile);
    return projectile;
  }, []);

  /**
   * Update all projectiles (call in game loop)
   * @param {number} deltaTime - Time since last update in seconds
   * @returns {Array} Projectiles that hit their targets
   */
  const updateProjectiles = useCallback((deltaTime) => {
    const hitProjectiles = [];
    const remainingProjectiles = [];

    projectilesRef.current.forEach(proj => {
      // Move projectile
      const moveDistance = proj.speed * deltaTime;
      proj.x += proj.dirX * moveDistance;
      proj.z += proj.dirZ * moveDistance;

      // Add current position to trail (keep last 5 positions)
      proj.trail.push({ x: proj.x, z: proj.z });
      if (proj.trail.length > 5) {
        proj.trail.shift();
      }

      // Check if reached target
      const distToTarget = Math.sqrt(
        Math.pow(proj.x - proj.targetX, 2) +
        Math.pow(proj.z - proj.targetZ, 2)
      );

      // Check if projectile is past target or very close
      if (distToTarget < 0.5) {
        hitProjectiles.push(proj);
        // Call onHit callback if provided
        if (proj.onHit) {
          proj.onHit(proj);
        }
      } else {
        // Check for timeout (max 5 seconds)
        const age = performance.now() - proj.createdAt;
        if (age < 5000) {
          remainingProjectiles.push(proj);
        }
      }
    });

    projectilesRef.current = remainingProjectiles;
    return hitProjectiles;
  }, []);

  /**
   * Render all projectiles
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Function} worldToCanvas - World to canvas coordinate converter
   */
  const renderProjectiles = useCallback((ctx, worldToCanvas) => {
    projectilesRef.current.forEach(proj => {
      const canvasPos = worldToCanvas(proj.x, proj.z);

      // Draw trail
      if (proj.trail.length > 1) {
        ctx.beginPath();
        const firstTrailPos = worldToCanvas(proj.trail[0].x, proj.trail[0].z);
        ctx.moveTo(firstTrailPos.x, firstTrailPos.y);

        for (let i = 1; i < proj.trail.length; i++) {
          const trailPos = worldToCanvas(proj.trail[i].x, proj.trail[i].z);
          ctx.lineTo(trailPos.x, trailPos.y);
        }

        ctx.lineTo(canvasPos.x, canvasPos.y);
        ctx.strokeStyle = proj.color;
        ctx.lineWidth = proj.size / 2;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Draw projectile glow
      const gradient = ctx.createRadialGradient(
        canvasPos.x, canvasPos.y, 0,
        canvasPos.x, canvasPos.y, proj.size * 1.5
      );
      gradient.addColorStop(0, proj.color);
      gradient.addColorStop(0.5, proj.color + '80'); // 50% opacity
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(canvasPos.x, canvasPos.y, proj.size * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw projectile core
      ctx.beginPath();
      ctx.arc(canvasPos.x, canvasPos.y, proj.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(canvasPos.x, canvasPos.y, proj.size / 2 + 2, 0, Math.PI * 2);
      ctx.strokeStyle = proj.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, []);

  /**
   * Get current projectile count
   * @returns {number} Number of active projectiles
   */
  const getProjectileCount = useCallback(() => {
    return projectilesRef.current.length;
  }, []);

  /**
   * Clear all projectiles
   */
  const clearProjectiles = useCallback(() => {
    projectilesRef.current = [];
  }, []);

  return {
    createProjectile,
    updateProjectiles,
    renderProjectiles,
    getProjectileCount,
    clearProjectiles,
  };
}

export default useProjectileRenderer;
