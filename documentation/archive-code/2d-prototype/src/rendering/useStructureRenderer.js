/**
 * useStructureRenderer.js
 * Structure rendering hook with tile-based rendering
 *
 * Phase 3D: Structure Generation
 */

import { useCallback, useMemo } from 'react';

/**
 * Tile type colors (placeholder - will be replaced with sprites later)
 */
const TILE_COLORS = {
  // Walls
  stone_wall: '#708090',
  wood_wall: '#8B4513',

  // Floors
  stone_floor: '#A0A0A0',
  wood_floor: '#D2691E',
  dirt: '#8B7355',
  grass: '#90EE90',

  // Objects
  door: '#654321',
  rubble: '#696969',
  pillar: '#778899',
  altar: '#FFD700',
  bed: '#FF6B6B',
  crate: '#CD853F',
  log_pile: '#A0522D',
  tent: '#F5DEB3',
  campfire: '#FF4500',
  workbench: '#DEB887',
  stairs: '#B0B0B0',
  dungeon_stairs: '#505050',

  // Cave dungeon tiles
  rock: '#4a4a4a',
  dark_stone: '#2d2d2d',
  cave_stairs: '#1a1a1a',

  // Forest dungeon tiles
  moss_stone: '#4a6b4a',
  twisted_root: '#3d2817',
  forest_floor: '#2d5a27',
  grove_stairs: '#1a3d15',

  // Ruins dungeon tiles
  sand_stone: '#c4a35a',
  crumbled_pillar: '#8b7355',
  ancient_tile: '#a89060',
  hieroglyph_floor: '#d4af37',
  tomb_stairs: '#6b5a40',

  // Default
  default: '#CCCCCC',
};

/**
 * Structure renderer hook
 */
export const useStructureRenderer = (options = {}) => {
  const {
    tileSize = 40,
    showBorders = true,
    // eslint-disable-next-line no-unused-vars
    showDiscoveryOverlay = true,
  } = options;

  /**
   * Render structures in viewport
   */
  const renderStructures = useCallback((ctx, structures, worldToCanvas, viewportBounds) => {
    if (!ctx || !structures || !worldToCanvas) return { structuresRendered: 0 };

    let structuresRendered = 0;

    for (const structure of structures) {
      // Check if structure visible in viewport
      const bounds = structure.getBounds();
      if (bounds.right < viewportBounds.left || bounds.left >= viewportBounds.right ||
          bounds.bottom < viewportBounds.top || bounds.top >= viewportBounds.bottom) {
        continue; // Outside viewport
      }

      // Render structure tiles
      for (let localZ = 0; localZ < structure.height; localZ++) {
        for (let localX = 0; localX < structure.width; localX++) {
          const tile = structure.getTileAt(localX, localZ);
          if (!tile) continue;

          const worldPos = structure.localToWorld(localX, localZ);
          const canvasPos = worldToCanvas(worldPos.x, worldPos.z);

          // Get tile color
          const color = TILE_COLORS[tile.type] || TILE_COLORS.default;

          // Draw tile
          ctx.fillStyle = color;
          ctx.fillRect(canvasPos.x, canvasPos.y, tileSize, tileSize);

          // Draw border if enabled
          if (showBorders) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(canvasPos.x, canvasPos.y, tileSize, tileSize);
          }

          // Draw blocking indicator (red tint for blocking tiles)
          if (tile.blocking) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.fillRect(canvasPos.x, canvasPos.y, tileSize, tileSize);
          }
        }
      }

      structuresRendered++;
    }

    return { structuresRendered };
  }, [tileSize, showBorders]);

  /**
   * Render structure highlights (for selection, discovery)
   */
  const renderStructureHighlight = useCallback((ctx, structure, worldToCanvas, color = 'rgba(255, 255, 0, 0.3)') => {
    if (!ctx || !structure || !worldToCanvas) return;

    const worldPos = structure.position;
    const canvasPos = worldToCanvas(worldPos.x, worldPos.z);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      canvasPos.x,
      canvasPos.y,
      structure.width * tileSize,
      structure.height * tileSize
    );
    ctx.restore();
  }, [tileSize]);

  /**
   * Render structure entrance marker
   */
  const renderStructureEntrance = useCallback((ctx, structure, worldToCanvas) => {
    if (!ctx || !structure || !worldToCanvas) return;

    const entrance = structure.getEntrancePosition();
    if (!entrance) return;

    const canvasPos = worldToCanvas(entrance.x, entrance.z);

    ctx.save();

    // Draw entrance marker (door icon)
    ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.fillRect(
      canvasPos.x + tileSize * 0.3,
      canvasPos.y + tileSize * 0.1,
      tileSize * 0.4,
      tileSize * 0.8
    );

    // Draw entrance glow
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasPos.x, canvasPos.y, tileSize, tileSize);

    ctx.restore();
  }, [tileSize]);

  /**
   * Render structure label
   */
  const renderStructureLabel = useCallback((ctx, structure, worldToCanvas) => {
    if (!ctx || !structure || !worldToCanvas) return;

    const centerX = structure.position.x + structure.width / 2;
    const centerZ = structure.position.z + structure.height / 2;
    const canvasPos = worldToCanvas(centerX, centerZ);

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = structure.template.name || structure.templateId;

    // Background
    const textWidth = ctx.measureText(text).width;
    ctx.fillRect(
      canvasPos.x - textWidth / 2 - 4,
      canvasPos.y - 8,
      textWidth + 8,
      16
    );

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, canvasPos.x, canvasPos.y);

    ctx.restore();
  }, []);

  /**
   * Render loot spawn indicators (debug)
   */
  const renderLootSpawns = useCallback((ctx, structure, worldToCanvas) => {
    if (!ctx || !structure || !worldToCanvas) return;

    const lootSpawns = structure.getLootSpawnPoints();

    for (const spawn of lootSpawns) {
      const canvasPos = worldToCanvas(spawn.x, spawn.z);

      ctx.save();

      // Draw loot chest icon
      ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.fillRect(
        canvasPos.x + tileSize * 0.25,
        canvasPos.y + tileSize * 0.25,
        tileSize * 0.5,
        tileSize * 0.5
      );

      ctx.strokeStyle = 'rgba(139, 69, 19, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        canvasPos.x + tileSize * 0.25,
        canvasPos.y + tileSize * 0.25,
        tileSize * 0.5,
        tileSize * 0.5
      );

      ctx.restore();
    }
  }, [tileSize]);

  /**
   * Render NPC spawn indicators (debug)
   */
  const renderNPCSpawns = useCallback((ctx, structure, worldToCanvas) => {
    if (!ctx || !structure || !worldToCanvas) return;

    const npcSpawns = structure.getNPCSpawnPoints();

    for (const spawn of npcSpawns) {
      const canvasPos = worldToCanvas(spawn.x, spawn.z);

      ctx.save();

      // Draw NPC marker
      ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
      ctx.beginPath();
      ctx.arc(
        canvasPos.x + tileSize / 2,
        canvasPos.y + tileSize / 2,
        tileSize * 0.3,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 100, 0, 0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }
  }, [tileSize]);

  return useMemo(() => ({
    renderStructures,
    renderStructureHighlight,
    renderStructureEntrance,
    renderStructureLabel,
    renderLootSpawns,
    renderNPCSpawns,
  }), [
    renderStructures,
    renderStructureHighlight,
    renderStructureEntrance,
    renderStructureLabel,
    renderLootSpawns,
    renderNPCSpawns,
  ]);
};

export default useStructureRenderer;
