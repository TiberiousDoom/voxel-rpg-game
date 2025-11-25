/**
 * useProjectileRenderer.js - 2D Projectile rendering hook
 *
 * Renders animated projectiles for ranged attacks in 2D canvas mode
 */

import { useCallback, useRef } from 'react';

// Default tile size - should match GameViewport TILE_SIZE
const DEFAULT_TILE_SIZE = 96;

/**
 * Hook for rendering and managing 2D projectiles
 * @param {Object} options - Renderer options
 * @param {number} options.tileSize - Tile size in pixels for centering
 * @returns {Object} Renderer functions and projectile management
 */
export function useProjectileRenderer(options = {}) {
  const projectilesRef = useRef([]);
  const nextIdRef = useRef(1);
  const tileSize = options.tileSize || DEFAULT_TILE_SIZE;

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
      // Store previous position for overshoot detection
      const prevX = proj.x;
      const prevZ = proj.z;
      const prevDistToTarget = Math.sqrt(
        Math.pow(prevX - proj.targetX, 2) +
        Math.pow(prevZ - proj.targetZ, 2)
      );

      // Move projectile
      const moveDistance = proj.speed * deltaTime;
      proj.x += proj.dirX * moveDistance;
      proj.z += proj.dirZ * moveDistance;

      // Add current position to trail (keep last 8 positions for better trail)
      proj.trail.push({ x: proj.x, z: proj.z });
      if (proj.trail.length > 8) {
        proj.trail.shift();
      }

      // Check distance to target after movement
      const distToTarget = Math.sqrt(
        Math.pow(proj.x - proj.targetX, 2) +
        Math.pow(proj.z - proj.targetZ, 2)
      );

      // Hit detection: close to target OR overshot (was getting closer, now getting farther)
      const isCloseEnough = distToTarget < 1.0; // Increased hit radius
      const hasOvershot = distToTarget > prevDistToTarget && prevDistToTarget < 2.0;

      if (isCloseEnough || hasOvershot) {
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
    // Center offset - worldToCanvas returns top-left, we need center
    const centerOffset = tileSize / 2;

    projectilesRef.current.forEach(proj => {
      const canvasPos = worldToCanvas(proj.x, proj.z);
      // Add center offset to match how player/monsters are rendered
      const centerX = canvasPos.x + centerOffset;
      const centerY = canvasPos.y + centerOffset;

      // Draw trail
      if (proj.trail.length > 1) {
        ctx.beginPath();
        const firstTrailPos = worldToCanvas(proj.trail[0].x, proj.trail[0].z);
        ctx.moveTo(firstTrailPos.x + centerOffset, firstTrailPos.y + centerOffset);

        for (let i = 1; i < proj.trail.length; i++) {
          const trailPos = worldToCanvas(proj.trail[i].x, proj.trail[i].z);
          ctx.lineTo(trailPos.x + centerOffset, trailPos.y + centerOffset);
        }

        ctx.lineTo(centerX, centerY);
        ctx.strokeStyle = proj.color;
        ctx.lineWidth = proj.size / 2;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Draw projectile glow
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, proj.size * 2
      );
      gradient.addColorStop(0, proj.color);
      gradient.addColorStop(0.4, proj.color + 'CC'); // 80% opacity
      gradient.addColorStop(0.7, proj.color + '40'); // 25% opacity
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(centerX, centerY, proj.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw projectile core (bright center)
      ctx.beginPath();
      ctx.arc(centerX, centerY, proj.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Draw outer ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, proj.size * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = proj.color;
      ctx.lineWidth = 3;
      ctx.stroke();
    });
  }, [tileSize]);

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
