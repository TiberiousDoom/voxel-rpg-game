/**
 * GameViewport.jsx - Main game viewport for rendering voxel grid
 *
 * Displays:
 * - Voxel grid (game world)
 * - Buildings (WF3: Enhanced rendering with BuildingRenderer)
 * - NPCs (WF4: Will add NPCRenderer)
 * - Selection/placement preview
 *
 * COORDINATION: WF3 and WF4 share this file
 * - WF3 owns: Building rendering via useBuildingRenderer()
 * - WF4 owns: NPC rendering via useNPCRenderer() (to be added)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useBuildingRenderer } from '../rendering/useBuildingRenderer.js'; // WF3
import { useNPCRenderer } from '../rendering/useNPCRenderer.js'; // WF4
import { useMonsterRenderer } from '../rendering/useMonsterRenderer.js'; // Monster rendering
import { useTerrainRenderer } from '../rendering/useTerrainRenderer.js'; // Terrain rendering
import { useLootDropRenderer } from '../rendering/useLootDropRenderer.js'; // Loot drop rendering
import { MonsterAI } from '../systems/MonsterAI.js'; // Monster AI system
import { SpawnManager } from '../systems/SpawnManager.js'; // Spawn system
import { TerrainSystem } from '../modules/environment/TerrainSystem.js'; // Terrain system
import { PlayerEntity } from '../modules/player/PlayerEntity.js';
import { PlayerRenderer } from '../modules/player/PlayerRenderer.js';
import { usePlayerMovement } from '../modules/player/PlayerMovementController.js';
import { usePlayerInteraction } from '../modules/player/PlayerInteractionSystem.js';
import { useCameraFollow, CAMERA_MODES } from '../modules/player/CameraFollowSystem.js';
import useGameStore from '../stores/useGameStore.js'; // For monster cleanup
import './GameViewport.css';

/**
 * Mobile-safe canvas initialization
 * Handles device pixel ratio and fallback context options
 */
const initializeCanvas = (canvas, width, height) => {
  if (!canvas) return null;

  // Set canvas dimensions
  canvas.width = width;
  canvas.height = height;

  // Detect mobile device
  const isMobileDevice = /Android|iPhone|iPad/i.test(navigator.userAgent) ||
                        window.innerWidth <= 768 ||
                        ('ontouchstart' in window);

  // Try multiple context configurations
  // CRITICAL: Never use willReadFrequently:true - it DISABLES GPU acceleration!
  let ctx = null;
  const contextConfigs = isMobileDevice ? [
    // Mobile: Use desynchronized for better performance (no flashing on mobile)
    { alpha: false, desynchronized: true },
    { alpha: false },
    {}
  ] : [
    // Desktop: Skip desynchronized to prevent flashing/tearing
    { alpha: false },
    {}
  ];

  for (const config of contextConfigs) {
    try {
      ctx = canvas.getContext('2d', config);
      if (ctx) {
        // Disable image smoothing for pixel art
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;

        // Test the context works by drawing and clearing
        try {
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(0, 0, 10, 10);
          ctx.clearRect(0, 0, width, height);
          // Context initialized successfully
        } catch (testError) {
          // Context test failed, try next config
          ctx = null;
          continue;
        }
        break;
      }
    } catch (e) {
      // Context creation failed, try next config
    }
  }

  if (!ctx) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to initialize canvas context with any configuration');
  }

  return ctx;
};

// Grid constants - Updated to 50x50 for player movement
const GRID_WIDTH = 50;
const GRID_HEIGHT = 50;
const TILE_SIZE = 40;
// Viewport size (window into the larger world)
const VIEWPORT_WIDTH = 800; // 20 tiles visible width
const VIEWPORT_HEIGHT = 600; // 15 tiles visible height
const CANVAS_WIDTH = VIEWPORT_WIDTH;
const CANVAS_HEIGHT = VIEWPORT_HEIGHT;

// Color constants (moved outside component to prevent re-creation on every render)
const BUILDING_COLORS = {
  FARM: '#90EE90',
  HOUSE: '#D2B48C',
  WAREHOUSE: '#A9A9A9',
  TOWN_CENTER: '#FFD700',
  WATCHTOWER: '#8B4513',
  CAMPFIRE: '#FF8C00'
};

// NPC color based on status
const NPC_STATUS_COLORS = {
  WORKING: '#4CAF50',    // Green
  IDLE: '#FFC107',       // Yellow/Amber
  LOW_HEALTH: '#F44336', // Red
  DEFAULT: '#FF6B6B'     // Pink
};

// Building state colors
const STATE_COLORS = {
  BLUEPRINT: 'rgba(150, 150, 150, 0.5)',
  UNDER_CONSTRUCTION: 'rgba(33, 150, 243, 0.7)',
  COMPLETE: null, // Use building-type color
  COMPLETED: null, // Use building-type color
  DAMAGED: null, // Use darkened building-type color
  DESTROYED: '#000000'
};

const GRID_COLOR = '#E0E0E0';
// eslint-disable-next-line no-unused-vars -- Reserved for WF4: NPC selection highlighting
const SELECTED_COLOR = '#FF4444';

/**
 * Helper: Darken a hex color
 */
const darkenColor = (hex, factor = 0.6) => {
  const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Helper: Get NPC color based on status
 * NOTE: Legacy fallback - WF4's NPCRenderer uses getStatusColor from npc-sprites.js
 * Kept for backward compatibility with non-WF4 rendering paths
 */
// eslint-disable-next-line no-unused-vars -- Legacy fallback for non-WF4 rendering paths
const getNPCColor = (npc) => {
  const health = npc.health || 100;
  const isWorking = npc.status === 'WORKING' || npc.isWorking;

  if (health < 30) return NPC_STATUS_COLORS.LOW_HEALTH;
  if (isWorking) return NPC_STATUS_COLORS.WORKING;
  return NPC_STATUS_COLORS.IDLE;
};

/**
 * Helper: Get building color based on state
 * NOTE: Currently using WF3's BuildingRenderer, but keeping this as fallback
 */
// eslint-disable-next-line no-unused-vars -- Fallback renderer for legacy support
const getBuildingColor = (building) => {
  const state = building.state || 'COMPLETE';
  const baseColor = BUILDING_COLORS[building.type] || '#CCCCCC';

  // Special states override base color
  if (STATE_COLORS[state]) {
    return STATE_COLORS[state];
  }

  // Damaged buildings use darkened color
  if (state === 'DAMAGED') {
    return darkenColor(baseColor);
  }

  // Default to base color
  return baseColor;
};

/**
 * GameViewport Component
 * Renders the voxel game world with buildings and NPCs
 */
function GameViewport({
  buildings = [],
  npcs = [],
  monsters = [], // Array of Monster instances
  selectedBuildingType = null,
  onPlaceBuilding = () => {},
  onSelectTile = () => {},
  onBuildingClick = () => {},
  debugMode = false,
  enablePlayerMovement = true, // New prop to enable/disable player movement
}) {
  const [hoveredPosition, setHoveredPosition] = useState(null);
  // eslint-disable-next-line no-unused-vars -- Reserved for WF4: Building selection feature
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const canvasRef = useRef(null);
  const lastHoverUpdateRef = useRef(0); // Throttle hover updates
  const lastUpdateTimeRef = useRef(Date.now()); // For delta time calculation

  // Debug state for mobile diagnostics (always shown on mobile)
  const [debugInfo, setDebugInfo] = useState({
    canvasReady: false,
    contextReady: false,
    cameraReady: false,
    playerReady: false,
    rendering: false,
    lastError: null,
    renderCount: 0
  });

  // Performance metrics state
  const [perfMetrics, setPerfMetrics] = useState({
    fps: 0,
    frameTime: 0,
    visibleBuildings: 0,
    totalBuildings: 0,
    visibleNPCs: 0,
    totalNPCs: 0,
    isMobile: false,
    canvasWidth: 0,
    canvasHeight: 0
  });

  const perfRef = useRef({
    frameCount: 0,
    lastFpsUpdate: Date.now(),
    frameTimes: [],
    // Store current frame metrics without triggering state updates
    currentMetrics: {
      visibleBuildings: 0,
      totalBuildings: 0,
      visibleNPCs: 0,
      totalNPCs: 0
    }
  });

  // Player state - Initialize synchronously to ensure it's available before first render
  const playerRef = useRef(null);
  const playerRendererRef = useRef(null);

  // Use refs for frequently changing data to avoid animation loop recreation
  const npcsRef = useRef(npcs);
  const buildingsRef = useRef(buildings);
  const monstersRef = useRef(monsters);
  const hoveredPositionRef = useRef(hoveredPosition);
  const selectedBuildingTypeRef = useRef(selectedBuildingType);
  const debugModeRef = useRef(debugMode);
  const enablePlayerMovementRef = useRef(enablePlayerMovement);
  const canInteractRef = useRef(null); // Will be set below after usePlayerInteraction
  const closestInteractableRef = useRef(null); // Will be set below after usePlayerInteraction

  // Update refs when props change (prevents useCallback recreation)
  useEffect(() => {
    npcsRef.current = npcs;
    buildingsRef.current = buildings;
    monstersRef.current = monsters;
    hoveredPositionRef.current = hoveredPosition;
    selectedBuildingTypeRef.current = selectedBuildingType;
    debugModeRef.current = debugMode;
    enablePlayerMovementRef.current = enablePlayerMovement;
    // canInteract and closestInteractable updated in separate useEffect below
  }, [npcs, buildings, monsters, hoveredPosition, selectedBuildingType, debugMode, enablePlayerMovement]);

  // Monster AI system
  const monsterAIRef = useRef(null);
  if (monsterAIRef.current === null) {
    monsterAIRef.current = new MonsterAI();
  }

  // Spawn system - Initialize once
  const spawnManagerRef = useRef(null);
  const zonesPopulated = useRef(false);
  if (spawnManagerRef.current === null) {
    spawnManagerRef.current = new SpawnManager();
  }

  // Populate spawn zones once on startup
  useEffect(() => {
    if (spawnManagerRef.current && !zonesPopulated.current) {
      const initialMonsters = spawnManagerRef.current.populateAllZones();
      if (initialMonsters.length > 0) {
        initialMonsters.forEach(monster => {
          useGameStore.getState().addMonster(monster);
        });
        zonesPopulated.current = true;
      }
    }
  }, []);

  // Terrain system - Initialize once
  const terrainSystemRef = useRef(null);
  if (terrainSystemRef.current === null) {
    terrainSystemRef.current = new TerrainSystem({
      seed: 12345, // Fixed seed for consistent world
      preset: 'DEFAULT',
      chunkSize: 32,
      tileSize: TILE_SIZE,
      chunkLoadRadius: 2,
      maxLoadedChunks: 100
    });
    // eslint-disable-next-line no-console
    console.log('Terrain system initialized:', terrainSystemRef.current);
  }

  if (enablePlayerMovement && playerRef.current === null) {
    try {
      playerRef.current = new PlayerEntity({ x: 25, z: 25 }); // Start in center of 50x50 grid

      // Expose playerEntity for debug commands (needed for teleportPlayer)
      if (typeof window !== 'undefined') {
        window.playerEntity = playerRef.current;
        window.spawnManager = spawnManagerRef.current;
      }

      playerRendererRef.current = new PlayerRenderer({
        tileSize: TILE_SIZE,
        showHealthBar: true,
        showStaminaBar: true,
        showInteractionRadius: debugMode,
      });
      setDebugInfo(prev => ({ ...prev, playerReady: true }));
    } catch (error) {
      setDebugInfo(prev => ({ ...prev, playerReady: false, lastError: `Player init: ${error.message}` }));
    }
  }

  // Detect if mobile for performance optimizations (cached - never changes during session)
  const isMobile = React.useMemo(() =>
    /Android|iPhone|iPad/i.test(navigator.userAgent) ||
    window.innerWidth <= 768 ||
    ('ontouchstart' in window),
  []);

  // WF3: Building rendering hook (optimized for mobile)
  const {
    renderBuildings: renderBuildingsWF3,
    // eslint-disable-next-line no-unused-vars -- Reserved for WF3: Hover effects not yet implemented
    renderHoverEffect,
    renderPlacementPreview
  } = useBuildingRenderer({
    tileSize: TILE_SIZE,
    showHealthBars: true,
    showProgressBars: true,
    showShadows: !isMobile, // Disable shadows on mobile for performance
    showOverlays: !isMobile // Disable texture overlays on mobile for performance
  });

  // WF4: NPC Renderer integration (optimized for mobile)
  const npcRenderer = useNPCRenderer({
    tileSize: TILE_SIZE,
    showHealthBars: !isMobile, // Hide health bars on mobile
    showRoleBadges: !isMobile, // Hide role badges on mobile
    showStatusIndicators: !isMobile, // Hide status indicators on mobile
    enableAnimations: true,
    debugMode: debugMode
  });

  // Monster Renderer integration
  const monsterRenderer = useMonsterRenderer({
    tileSize: TILE_SIZE,
    showHealthBars: !isMobile, // Hide health bars on mobile
    enableAnimations: true,
    debugMode: debugMode
  });

  // Terrain Renderer integration
  const { renderTerrain, renderWater, renderRivers, renderChunkBorders } = useTerrainRenderer({
    tileSize: TILE_SIZE,
    showHeightNumbers: false,
    minHeight: 0,
    maxHeight: 10,
    colorMode: 'biome'  // Use biome-based coloring (Phase 2)
  });

  // Loot Drop Renderer integration
  const { renderLootDrops } = useLootDropRenderer({
    tileSize: TILE_SIZE,
    showPickupRadius: debugMode,
    enableAnimation: true,
    debugMode: debugMode
  });

  // Player movement controller
  usePlayerMovement(playerRef.current, enablePlayerMovement);

  // Player interaction system
  const { closestInteractable, canInteract } = usePlayerInteraction(
    playerRef.current,
    {
      buildings,
      npcs,
      resources: [], // TODO: Add resources when implemented
      chests: buildings.filter(b => b.type === 'CHEST'), // Chests are buildings
      onBuildingInteract: onBuildingClick,
      onNPCInteract: (npc) => {
        // TODO: Open NPC dialog/interaction panel
        // eslint-disable-next-line no-console
        if (debugMode) console.log('Interacting with NPC:', npc);
      },
      onResourceInteract: (resource) => {
        // TODO: Implement resource gathering
        // eslint-disable-next-line no-console
        if (debugMode) console.log('Gathering resource:', resource);
      },
      onChestInteract: (chest) => {
        // TODO: Open chest inventory panel
        // eslint-disable-next-line no-console
        if (debugMode) console.log('Opening chest:', chest);
      },
      enabled: enablePlayerMovement,
    }
  );

  // Update interaction refs after they're defined
  useEffect(() => {
    canInteractRef.current = canInteract;
    closestInteractableRef.current = closestInteractable;
  }, [canInteract, closestInteractable]);

  // Camera follow system
  const { cameraMode, getOffset } = useCameraFollow(playerRef.current, {
    viewportWidth: CANVAS_WIDTH,
    viewportHeight: CANVAS_HEIGHT,
    tileSize: TILE_SIZE,
    smoothing: 0.15, // Smooth camera movement
    mode: CAMERA_MODES.FOLLOW,
  });

  // Update debug info when camera is ready
  useEffect(() => {
    if (getOffset) {
      const offset = getOffset();
      setDebugInfo(prev => ({
        ...prev,
        cameraReady: offset !== null && offset !== undefined,
        lastError: offset ? null : 'Camera offset is null'
      }));
    }
  }, [getOffset]);

  // Force initial render after camera is ready
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  useEffect(() => {
    if (getOffset) {
      forceUpdate();
    }
  }, [getOffset]);

  // Update player entity
  useEffect(() => {
    if (!enablePlayerMovement || !playerRef.current) return;

    const updatePlayer = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateTimeRef.current) / 1000;
      lastUpdateTimeRef.current = now;

      playerRef.current.update(deltaTime);
    };

    const intervalId = setInterval(updatePlayer, 16); // ~60 FPS

    return () => clearInterval(intervalId);
  }, [enablePlayerMovement]);
  /**
   * Convert world position to canvas coordinates
   * Now includes camera offset for scrolling
   */
  const worldToCanvas = React.useCallback((x, z) => {
    const offset = getOffset?.() || { x: 0, y: 0 };
    return {
      x: x * TILE_SIZE + offset.x,
      y: z * TILE_SIZE + offset.y
    };
  }, [getOffset]);

  /**
   * Convert canvas coordinates to grid position (with camera offset)
   */
  const canvasToWorld = React.useCallback((canvasX, canvasY) => {
    const offset = getOffset?.() || { x: 0, y: 0 };
    return {
      x: Math.floor((canvasX - offset.x) / TILE_SIZE),
      z: Math.floor((canvasY - offset.y) / TILE_SIZE)
    };
  }, [getOffset]);

  /**
   * Convert canvas coordinates to world position (with camera offset)
   */
  const canvasToWorldPosition = React.useCallback((canvasX, canvasY) => {
    const offset = getOffset?.() || { x: 0, y: 0 };
    return {
      x: (canvasX - offset.x) / TILE_SIZE,
      z: (canvasY - offset.y) / TILE_SIZE
    };
  }, [getOffset]);

  /**
   * Render interaction prompt above interactable object
   */
  const renderInteractionPrompt = React.useCallback((ctx, interactable) => {
    if (!interactable || !interactable.position) return;

    const canvasPos = worldToCanvas(interactable.position.x, interactable.position.z);
    const x = canvasPos.x + TILE_SIZE / 2;
    const y = canvasPos.y - 20; // Above the object

    // Draw prompt background
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = '12px Arial';
    const text = 'Press E';
    const textWidth = ctx.measureText(text).width;
    const padding = 6;

    ctx.fillRect(
      x - textWidth / 2 - padding,
      y - 12,
      textWidth + padding * 2,
      20
    );

    // Draw text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);

    // Draw interaction type icon
    let icon = '?';
    switch (interactable.type) {
      case 'BUILDING':
        icon = '🏠';
        break;
      case 'NPC':
        icon = '👤';
        break;
      case 'RESOURCE':
        icon = '⛏️';
        break;
      case 'CHEST':
        icon = '📦';
        break;
      default:
        icon = '?';
        break;
    }

    ctx.font = '16px Arial';
    ctx.fillText(icon, x, y - 25);

    ctx.restore();
  }, [worldToCanvas]);

  /**
   * Draw the game world
   * Memoized to prevent unnecessary re-renders
   */
  const drawViewport = React.useCallback((ctx) => {
    try {
      // Validate context
      if (!ctx || !ctx.fillRect) {
        throw new Error('Invalid canvas context');
      }

      // Clear canvas
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Get camera offset with better fallback
      let offset = { x: 0, y: 0 }; // Default offset

      try {
        if (getOffset && typeof getOffset === 'function') {
          const tempOffset = getOffset();
          if (tempOffset && typeof tempOffset.x === 'number' && typeof tempOffset.y === 'number') {
            offset = tempOffset;
          }
        }
      } catch (e) {
        // Don't log in render loop - kills mobile performance!
        // Silently use default offset
      }

    // Viewport culling - only render visible entities
    const viewportBounds = {
      left: Math.floor(-offset.x / TILE_SIZE) - 2, // Add 2-tile margin
      right: Math.ceil((CANVAS_WIDTH - offset.x) / TILE_SIZE) + 2,
      top: Math.floor(-offset.y / TILE_SIZE) - 2,
      bottom: Math.ceil((CANVAS_HEIGHT - offset.y) / TILE_SIZE) + 2
    };

    // Filter visible NPCs (use ref to avoid useCallback recreation!)
    const visibleNPCs = (npcsRef.current || []).filter(npc => {
      if (!npc || !npc.position) return false;
      return npc.position.x >= viewportBounds.left &&
             npc.position.x <= viewportBounds.right &&
             npc.position.z >= viewportBounds.top &&
             npc.position.z <= viewportBounds.bottom;
    });

    // Filter visible monsters (use ref to avoid useCallback recreation!)
    const visibleMonsters = (monstersRef.current || []).filter(monster => {
      if (!monster || !monster.position) return false;
      return monster.position.x >= viewportBounds.left &&
             monster.position.x <= viewportBounds.right &&
             monster.position.z >= viewportBounds.top &&
             monster.position.z <= viewportBounds.bottom;
    });

    // Draw grid with camera offset (optimized for mobile)
    // isMobile is already cached above, use it directly!

    if (!isMobile) {
      // Full grid on desktop
      // OPTIMIZED: Batch all lines into single path for better performance
      ctx.save();
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;

      // Calculate visible grid range
      const startX = Math.floor(-offset.x / TILE_SIZE);
      const endX = Math.ceil((CANVAS_WIDTH - offset.x) / TILE_SIZE);
      const startZ = Math.floor(-offset.y / TILE_SIZE);
      const endZ = Math.ceil((CANVAS_HEIGHT - offset.y) / TILE_SIZE);

      // Batch all grid lines into a single path (much faster!)
      ctx.beginPath();

      // Vertical lines
      for (let i = Math.max(0, startX); i <= Math.min(GRID_WIDTH, endX); i++) {
        const x = i * TILE_SIZE + offset.x;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
      }

      // Horizontal lines
      for (let i = Math.max(0, startZ); i <= Math.min(GRID_HEIGHT, endZ); i++) {
        const y = i * TILE_SIZE + offset.y;
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
      }

      // Single stroke for all lines
      ctx.stroke();

      ctx.restore();
    } else {
      // Simplified grid on mobile - only major grid lines every 5 tiles
      // OPTIMIZED: Batch all lines into single path for better performance
      ctx.save();
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5; // Lighter grid on mobile

      const startX = Math.floor(-offset.x / TILE_SIZE);
      const endX = Math.ceil((CANVAS_WIDTH - offset.x) / TILE_SIZE);
      const startZ = Math.floor(-offset.y / TILE_SIZE);
      const endZ = Math.ceil((CANVAS_HEIGHT - offset.y) / TILE_SIZE);

      // Batch all grid lines into a single path (much faster!)
      ctx.beginPath();

      // Vertical lines
      for (let i = Math.max(0, Math.floor(startX / 5) * 5); i <= Math.min(GRID_WIDTH, endX); i += 5) {
        const x = i * TILE_SIZE + offset.x;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
      }

      // Horizontal lines
      for (let i = Math.max(0, Math.floor(startZ / 5) * 5); i <= Math.min(GRID_HEIGHT, endZ); i += 5) {
        const y = i * TILE_SIZE + offset.y;
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
      }

      // Single stroke for all lines
      ctx.stroke();

      ctx.restore();
    }

    // Render terrain (BEFORE buildings for correct layering)
    if (terrainSystemRef.current) {
      try {
        const terrainManager = terrainSystemRef.current.getTerrainManager();
        const worldGenerator = terrainSystemRef.current.getWorldGenerator();
        renderTerrain(ctx, terrainManager, worldToCanvas, viewportBounds, worldGenerator);

        // Render water on top of terrain (Phase 2: Water System)
        renderWater(ctx, terrainManager, worldToCanvas, viewportBounds);

        // Render rivers on top of water (Phase 3: River Rendering)
        const rivers = worldGenerator.generateRivers(
          viewportBounds.left - 50,
          viewportBounds.top - 50,
          viewportBounds.right - viewportBounds.left + 100,
          viewportBounds.bottom - viewportBounds.top + 100,
          5  // Generate 5 rivers in visible area
        );
        renderRivers(ctx, rivers, worldToCanvas, viewportBounds);
      } catch (e) {
        // Log terrain rendering errors for debugging
        console.error('Terrain rendering error:', e);
      }
    }

    // WF3: Render buildings using new BuildingRenderer with viewport culling (use ref!)
    const visibleBuildingCount = renderBuildingsWF3(ctx, buildingsRef.current, worldToCanvas, viewportBounds);

    // WF4: Render NPCs using NPCRenderer (already filtered, use ref!)
    npcRenderer.renderNPCs(ctx, visibleNPCs, worldToCanvas);

    // Render monsters using MonsterRenderer (already filtered)
    monsterRenderer.renderMonsters(ctx, visibleMonsters, worldToCanvas);

    // Store metrics in ref (don't trigger state update every frame)
    perfRef.current.currentMetrics = {
      visibleBuildings: visibleBuildingCount,
      totalBuildings: buildingsRef.current?.length || 0,
      visibleNPCs: visibleNPCs.length,
      totalNPCs: npcsRef.current?.length || 0,
      visibleMonsters: visibleMonsters.length,
      totalMonsters: monstersRef.current?.length || 0
    };

    // Render player (use ref!)
    if (enablePlayerMovementRef.current && playerRef.current && playerRendererRef.current) {
      playerRendererRef.current.renderPlayer(ctx, playerRef.current, worldToCanvas);
    }

    // WF4: Render pathfinding visualization in debug mode (use ref!)
    if (debugModeRef.current) {
      npcRenderer.renderPaths(ctx, visibleNPCs, worldToCanvas);

      // Render chunk borders in debug mode
      if (terrainSystemRef.current) {
        try {
          const chunkManager = terrainSystemRef.current.getChunkManager();
          renderChunkBorders(ctx, chunkManager, worldToCanvas, 32);
        } catch (e) {
          // Silently handle chunk border rendering errors
        }
      }
    }

    // Render interaction prompts (use refs!)
    if (enablePlayerMovementRef.current && canInteractRef.current && closestInteractableRef.current) {
      renderInteractionPrompt(ctx, closestInteractableRef.current);
    }

      // WF3: Draw hover preview using new renderer (use refs!)
      if (hoveredPositionRef.current && selectedBuildingTypeRef.current) {
        // TODO: Add validation check to determine if placement is valid
        const isValid = true; // Placeholder - should check collision/placement rules
        renderPlacementPreview(ctx, hoveredPositionRef.current, selectedBuildingTypeRef.current, isValid, worldToCanvas);
      }
    } catch (error) {
      // Don't update state in render loop - causes severe FPS drops!
      // Just draw error message on canvas
      if (ctx && ctx.fillText) {
        try {
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.fillStyle = '#ffffff';
          ctx.font = '14px Arial';
          ctx.fillText(`Error: ${error.message}`, 10, 20);
        } catch (e) {
          // Ignore if even error rendering fails
        }
      }
    }
  }, [renderBuildingsWF3, renderPlacementPreview, npcRenderer, monsterRenderer, renderTerrain, renderWater, renderRivers, renderChunkBorders, worldToCanvas, getOffset, renderInteractionPrompt, isMobile]);

  /**
   * Handle canvas click for placement (mouse and touch)
   */
  const [touchStartTime, setTouchStartTime] = React.useState(0);
  const [isLongPress, setIsLongPress] = React.useState(false);
  const longPressTimerRef = React.useRef(null);

  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;

    // Ignore if it was a long press (handled separately)
    if (isLongPress) {
      setIsLongPress(false);
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();

    // Account for canvas scaling (CSS vs internal resolution)
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    // Support both mouse and touch events
    // For touch events, use changedTouches if touches is empty (touchend event)
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    // Get world position with camera offset
    const worldPos = canvasToWorldPosition(canvasX, canvasY);
    const gridPos = canvasToWorld(canvasX, canvasY);

    if (selectedBuildingType) {
      // Building placement mode - don't move player
      onPlaceBuilding({
        x: gridPos.x,
        y: 0, // Ground level
        z: gridPos.z
      });
      return; // Explicitly prevent any other click handling
    }

    if (enablePlayerMovement && playerRef.current) {
      // Check if clicked on an interactable object
      let didInteract = false;

      // Check if close to an interactable
      if (closestInteractable) {
        const clickDist = Math.sqrt(
          Math.pow(worldPos.x - closestInteractable.position.x, 2) +
          Math.pow(worldPos.z - closestInteractable.position.z, 2)
        );

        // If clicked within 1.5 tiles of interactable, trigger interaction
        if (clickDist < 1.5) {
          // Trigger interaction based on type
          if (closestInteractable.type === 'BUILDING') {
            onBuildingClick(closestInteractable.object);
          } else if (closestInteractable.type === 'NPC') {
            // eslint-disable-next-line no-console
            if (debugMode) console.log('Interacting with NPC:', closestInteractable.object);
          } else if (closestInteractable.type === 'CHEST') {
            // eslint-disable-next-line no-console
            if (debugMode) console.log('Opening chest:', closestInteractable.object);
          }
          didInteract = true;
        }
      }

      // If didn't interact, move to clicked position
      if (!didInteract) {
        playerRef.current.setTargetPosition(worldPos);
      }
      return;
    }

    // No player movement - check if a building was clicked for selection
    const clickedBuilding = buildings.find(b =>
      b && b.position &&
      b.position.x === gridPos.x &&
      b.position.z === gridPos.z
    );

    if (clickedBuilding) {
      onBuildingClick(clickedBuilding);
    } else {
      onSelectTile(gridPos);
    }
  };

  /**
   * Handle touch start for mobile (treat as click)
   */
  const handleTouchStart = (e) => {
    e.preventDefault(); // Prevent default touch behavior

    // Start long press detection
    setTouchStartTime(Date.now());
    setIsLongPress(false);

    // Set timer for long press (500ms)
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPress(true);
      // Enable sprinting
      if (playerRef.current) {
        playerRef.current.setSprinting(true);
        // Visual/haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50); // Short vibration
        }
      }
    }, 500);
  };

  /**
   * Handle touch end for mobile
   */
  const handleTouchEnd = (e) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const pressDuration = Date.now() - touchStartTime;

    // If it was a long press, disable sprinting
    if (isLongPress || pressDuration >= 500) {
      if (playerRef.current) {
        playerRef.current.setSprinting(false);
      }
      setIsLongPress(false);
      return; // Don't trigger click
    }

    // Otherwise, treat as normal click
    handleCanvasClick(e);
  };

  /**
   * Handle canvas mouse move for hover (throttled for performance)
   */
  const handleCanvasMouseMove = (e) => {
    if (!canvasRef.current) return;

    // Throttle: Only update at most every 16ms (60 FPS)
    const now = Date.now();
    if (now - lastHoverUpdateRef.current < 16) {
      return;
    }
    lastHoverUpdateRef.current = now;

    const rect = canvasRef.current.getBoundingClientRect();

    // Account for canvas scaling (CSS vs internal resolution)
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const position = canvasToWorld(canvasX, canvasY);

    // Only update if position actually changed (avoid redundant setState)
    const posChanged =
      !hoveredPosition ||
      hoveredPosition.x !== position.x ||
      hoveredPosition.z !== position.z;

    // Clamp to grid bounds
    if (
      position.x >= 0 &&
      position.x < GRID_WIDTH &&
      position.z >= 0 &&
      position.z < GRID_HEIGHT
    ) {
      if (posChanged) {
        setHoveredPosition(position);
      }
    } else {
      if (hoveredPosition !== null) {
        setHoveredPosition(null);
      }
    }
  };

  /**
   * Handle canvas mouse leave
   */
  const handleCanvasMouseLeave = () => {
    setHoveredPosition(null);
  };

  /**
   * Mobile-safe canvas initialization and rendering loop
   * Uses continuous animation loop with frame rate limiting
   */
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setDebugInfo(prev => ({ ...prev, canvasReady: false, lastError: 'Canvas ref is null' }));
      return;
    }

    setDebugInfo(prev => ({ ...prev, canvasReady: true }));

    // Initialize with mobile-safe function
    const ctx = initializeCanvas(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (!ctx) {
      setDebugInfo(prev => ({
        ...prev,
        contextReady: false,
        lastError: 'Failed to initialize canvas context'
      }));
      return;
    }

    setDebugInfo(prev => ({ ...prev, contextReady: true }));

    let animationId = null;
    let initialRenderAttempts = 0;
    const maxInitialAttempts = 60; // Try for 1 second
    let lastFrameTime = 0;

    // Detect mobile for appropriate frame rate
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent) ||
                     window.innerWidth <= 768 ||
                     ('ontouchstart' in window);
    const targetFPS = isMobile ? 45 : 60; // Increased mobile FPS to 45 for better responsiveness
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime) => {
      // Throttle to target FPS
      const elapsed = currentTime - lastFrameTime;

      if (elapsed > frameInterval) {
        lastFrameTime = currentTime - (elapsed % frameInterval);
        const frameStartTime = performance.now();

        try {
          // Update terrain chunk loading based on camera position
          if (terrainSystemRef.current && getOffset) {
            const offset = getOffset() || { x: 0, y: 0 };
            // Camera position in world pixels (inverse of offset)
            const cameraX = -offset.x;
            const cameraZ = -offset.y;
            terrainSystemRef.current.update(cameraX, cameraZ, CANVAS_WIDTH, CANVAS_HEIGHT);
          }

          // Update NPC positions before rendering (use ref to avoid loop recreation)
          if (npcRenderer && npcsRef.current) {
            npcRenderer.updatePositions(npcsRef.current, elapsed);
          }

          // Update monster AI before rendering
          if (monsterAIRef.current && monstersRef.current && monstersRef.current.length > 0 && playerRef.current) {
            const gameState = {
              player: playerRef.current,
              npcs: npcsRef.current || [],
              buildings: buildingsRef.current || []
            };
            monsterAIRef.current.updateAll(monstersRef.current, gameState, elapsed);

            // CRITICAL: Notify Zustand store of monster state changes
            // AI modifies monsters in-place, but Zustand needs immutable updates
            // Create new array reference to trigger reactivity
            useGameStore.setState({ enemies: [...monstersRef.current] });
          }

          // Update monster positions before rendering
          if (monsterRenderer && monstersRef.current) {
            monsterRenderer.updatePositions(monstersRef.current, elapsed);
          }

          // Clean up dead monsters after fade animation completes (1 second)
          if (monstersRef.current && monstersRef.current.length > 0) {
            const now = Date.now();
            monstersRef.current.forEach(monster => {
              if (!monster.alive && monster.deathTime && (now - monster.deathTime > 1000)) {
                // Monster has finished death animation, remove from store
                // eslint-disable-next-line no-console
                console.log(`🗑️ Removing ${monster.name} after death animation (${((now - monster.deathTime) / 1000).toFixed(1)}s ago)`);
                useGameStore.getState().removeMonster(monster.id);
              }
            });
          }

          // Update loot drops - check for pickup
          if (playerRef.current) {
            useGameStore.getState().updateLootDrops({
              x: playerRef.current.x,
              z: playerRef.current.z
            });
          }

          // Update spawn system - spawn new monsters as needed
          if (spawnManagerRef.current && monstersRef.current) {
            const newMonsters = spawnManagerRef.current.update(monstersRef.current, elapsed);
            if (newMonsters.length > 0) {
              // Add new monsters to the game
              newMonsters.forEach(monster => {
                useGameStore.getState().addMonster(monster);
              });
              monstersRef.current.push(...newMonsters);
            }
          }

          // Draw viewport with safe error handling
          drawViewport(ctx);

          // Track performance metrics
          const frameEndTime = performance.now();
          const frameTime = frameEndTime - frameStartTime;

          perfRef.current.frameCount++;
          perfRef.current.frameTimes.push(frameTime);
          if (perfRef.current.frameTimes.length > 60) {
            perfRef.current.frameTimes.shift();
          }

          const now = Date.now();
          if (now - perfRef.current.lastFpsUpdate >= 1000) {
            const fps = Math.round(perfRef.current.frameCount / ((now - perfRef.current.lastFpsUpdate) / 1000));
            const avgFrameTime = perfRef.current.frameTimes.reduce((a, b) => a + b, 0) / perfRef.current.frameTimes.length;

            // Update state only once per second (not every frame!)
            setPerfMetrics({
              fps,
              frameTime: avgFrameTime.toFixed(2),
              isMobile,
              canvasWidth: CANVAS_WIDTH,
              canvasHeight: CANVAS_HEIGHT,
              ...perfRef.current.currentMetrics
            });

            perfRef.current.frameCount = 0;
            perfRef.current.lastFpsUpdate = now;
          }

          // Track initial render attempts (no state updates!)
          if (initialRenderAttempts < maxInitialAttempts) {
            initialRenderAttempts++;
          }

        } catch (error) {
          // Don't log or setState in animation loop - kills FPS!
          // Just draw error on canvas
          try {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`Render Error: ${error.message}`, 10, 30);
          } catch (e) {
            // Silent failure - can't even draw error
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    // Start animation
    animationId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [drawViewport, getOffset, npcRenderer, npcs, buildings, monsterRenderer]);

  return (
    <div className="game-viewport">
      <div className="viewport-header">
        <h2>Game World</h2>
        {selectedBuildingType && (
          <span className="building-type-indicator">
            Placing: <strong>{selectedBuildingType}</strong>
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="viewport-canvas"
        onClick={handleCanvasClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
      />

      {/* Debug overlay - mobile diagnostics (can be hidden if not needed) */}
      {debugMode && (
        <div className="debug-overlay" style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: debugInfo.lastError ? 'rgba(255, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '6px',
          fontSize: '10px',
          fontFamily: 'monospace',
          maxWidth: '200px',
          maxHeight: '300px',
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
        <div><strong>🔍 Render Status</strong></div>
        <div>Canvas: {debugInfo.canvasReady ? '✓' : '✗'}</div>
        <div>Context: {debugInfo.contextReady ? '✓' : '✗'}</div>
        <div>Camera: {debugInfo.cameraReady ? '✓' : '✗'}</div>
        <div>Player: {debugInfo.playerReady ? '✓' : '✗'}</div>
        <div>Rendering: {debugInfo.rendering ? '✓' : '✗'}</div>
        <div>Renders: {debugInfo.renderCount}</div>
        <div>Canvas Size: {CANVAS_WIDTH}x{CANVAS_HEIGHT}</div>
        {canvasRef.current && (
          <>
            <div>Element: {canvasRef.current.width}x{canvasRef.current.height}</div>
            <div>Display: {canvasRef.current.offsetWidth}x{canvasRef.current.offsetHeight}px</div>
          </>
        )}
        <div>Window: {window.innerWidth}x{window.innerHeight}</div>
        <div>DPR: {window.devicePixelRatio || 1}</div>
        <div>Mobile: {/Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth <= 768 ? 'Yes' : 'No'}</div>
        <div>Offset: {getOffset ? JSON.stringify(getOffset()) : 'null'}</div>
        {debugInfo.lastError && (
          <div style={{ marginTop: '8px', color: '#ffff00', fontWeight: 'bold' }}>
            ⚠️ {debugInfo.lastError}
          </div>
        )}
        </div>
      )}

      {/* Performance metrics overlay - always visible */}
      <div className="performance-overlay" style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#00ff00',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        minWidth: '180px',
        zIndex: 9999,
        pointerEvents: 'none',
        border: '2px solid rgba(0, 255, 0, 0.3)',
      }}>
        <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#ffffff', borderBottom: '1px solid rgba(0, 255, 0, 0.3)', paddingBottom: '4px' }}>
          ⚡ PERFORMANCE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px' }}>
          <div>FPS:</div>
          <div style={{ color: perfMetrics.fps < 30 ? '#ff4444' : perfMetrics.fps < 45 ? '#ffaa00' : '#00ff00' }}>
            {perfMetrics.fps || 0}
          </div>

          <div>Frame:</div>
          <div style={{ color: perfMetrics.frameTime > 33 ? '#ff4444' : perfMetrics.frameTime > 22 ? '#ffaa00' : '#00ff00' }}>
            {perfMetrics.frameTime || 0}ms
          </div>

          <div>Target:</div>
          <div>{perfMetrics.isMobile ? '45' : '60'} FPS</div>

          <div style={{ marginTop: '4px', gridColumn: '1 / -1', borderTop: '1px solid rgba(0, 255, 0, 0.2)', paddingTop: '4px' }}>
            Entities:
          </div>

          <div>Buildings:</div>
          <div>{perfMetrics.visibleBuildings}/{perfMetrics.totalBuildings}</div>

          <div>NPCs:</div>
          <div>{perfMetrics.visibleNPCs}/{perfMetrics.totalNPCs}</div>

          <div style={{ marginTop: '4px', gridColumn: '1 / -1', borderTop: '1px solid rgba(0, 255, 0, 0.2)', paddingTop: '4px' }}>
            Canvas:
          </div>

          <div>Size:</div>
          <div>{perfMetrics.canvasWidth}x{perfMetrics.canvasHeight}</div>

          <div>Device:</div>
          <div>{perfMetrics.isMobile ? 'Mobile' : 'Desktop'}</div>
        </div>
      </div>

      <div className="viewport-footer">
        <p className="viewport-hint">
          {enablePlayerMovement ? (
            <>
              <strong>Controls:</strong> WASD/Arrows or Click/Tap to move • Long press to sprint • Click/Tap nearby objects to interact • T to toggle camera
              {cameraMode && ` • Camera: ${cameraMode}`}
              {canInteract && ' • Press E to interact!'}
            </>
          ) : selectedBuildingType ? (
            `Click to place ${selectedBuildingType} building`
          ) : (
            'Select a building type from the menu to start building'
          )}
        </p>
        {enablePlayerMovement && playerRef.current && (
          <div className="player-stats">
            <span>HP: {Math.round(playerRef.current.health)}/{playerRef.current.maxHealth}</span>
            {' • '}
            <span>Stamina: {Math.round(playerRef.current.stamina)}/{playerRef.current.maxStamina}</span>
            {' • '}
            <span>Pos: ({playerRef.current.position.x.toFixed(1)}, {playerRef.current.position.z.toFixed(1)})</span>
          </div>
        )}
        <div className="building-legend">
          <h4>Buildings:</h4>
          <ul>
            {Object.entries(BUILDING_COLORS).map(([type, color]) => (
              <li key={type}>
                <span
                  className="legend-color"
                  style={{ backgroundColor: color }}
                />
                {type}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default GameViewport;
