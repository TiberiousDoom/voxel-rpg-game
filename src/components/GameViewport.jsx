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
import { useDamageNumberRenderer } from '../rendering/useDamageNumberRenderer.js'; // Damage number rendering
import { usePropRenderer } from '../rendering/usePropRenderer.js'; // Prop rendering (Phase 3)
import { useStructureRenderer } from '../rendering/useStructureRenderer.js'; // Structure rendering (Phase 3D)
import { useWaterRenderer } from '../rendering/useWaterRenderer.js'; // Water rendering (Phase 3B)
import { useBiomeTransitionRenderer } from '../rendering/useBiomeTransitionRenderer.js'; // Biome transitions (Phase 3C)
import { useJobRenderer } from '../rendering/useJobRenderer.js'; // Terrain job rendering
import { MonsterAI } from '../systems/MonsterAI.js'; // Monster AI system
import { SpawnManager } from '../systems/SpawnManager.js'; // Spawn system
import { TerrainSystem } from '../modules/environment/TerrainSystem.js'; // Terrain system
import { PropHarvestingSystem } from '../modules/environment/PropHarvestingSystem.js'; // Phase 3A: Prop harvesting
import { FloatingTextManager } from '../rendering/FloatingTextManager.js'; // Phase 3A: Floating text
import { TerrainJobQueue } from '../modules/terrain-jobs/TerrainJobQueue.js'; // Terrain job queue
import { JobTimeCalculator } from '../modules/terrain-jobs/JobTimeCalculator.js'; // Job time calculator
import { PlayerEntity } from '../modules/player/PlayerEntity.js';
import { PlayerRenderer } from '../modules/player/PlayerRenderer.js';
import { usePlayerMovement } from '../modules/player/PlayerMovementController.js';
import { usePlayerInteraction } from '../modules/player/PlayerInteractionSystem.js';
import { useCameraFollow, CAMERA_MODES } from '../modules/player/CameraFollowSystem.js';
import useGameStore from '../stores/useGameStore.js'; // For monster cleanup
import TerrainToolsPanel from './TerrainToolsPanel.jsx'; // Terrain tools UI
import MiniMap from './MiniMap.jsx'; // Mini-map (Phase 3 Integration)
import UnifiedDebugMenu from './UnifiedDebugMenu.jsx'; // Unified Debug & Developer Menu
import CollapsibleFloatingPanel from './CollapsibleFloatingPanel.jsx'; // Collapsible floating panels
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
  // eslint-disable-next-line no-unused-vars
  const isMobileDevice = /Android|iPhone|iPad/i.test(navigator.userAgent) ||
                        window.innerWidth <= 768 ||
                        ('ontouchstart' in window);

  // Try multiple context configurations
  // CRITICAL: Never use willReadFrequently:true - it DISABLES GPU acceleration!
  // Try desynchronized on both mobile and desktop for smoother rendering
  let ctx = null;
  const contextConfigs = [
    // Try desynchronized first for smoother rendering (modern browsers handle this well)
    { alpha: false, desynchronized: true },
    // Fallback to standard config
    { alpha: false },
    // Final fallback with minimal config
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

// Grid constants - Infinite world with chunk-based terrain generation
// The terrain system dynamically loads chunks as the player explores
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
  gameManager = null, // Game manager for real-time NPC access
  selectedBuildingType = null,
  onPlaceBuilding = () => {},
  onSelectTile = () => {},
  onBuildingClick = () => {},
  debugMode = false,
  enablePlayerMovement = true, // New prop to enable/disable player movement
  showPerformanceMonitor = true, // Show/hide performance monitor
  cleanMode = false, // Hide all UI panels for clean viewport
}) {
  const [hoveredPosition, setHoveredPosition] = useState(null);
  // eslint-disable-next-line no-unused-vars -- Reserved for WF4: Building selection feature
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const canvasRef = useRef(null);
  const lastHoverUpdateRef = useRef(0); // Throttle hover updates
  const lastUpdateTimeRef = useRef(Date.now()); // For delta time calculation
  const cameraPositionRef = useRef({ x: 0, z: 0 }); // Camera position for MiniMap

  // Terrain job system state
  const [activeTool, setActiveTool] = useState(null); // 'flatten', 'raise', 'lower', 'smooth', or null
  const [jobPriority, setJobPriority] = useState(5); // 1-10
  const [selectionStart, setSelectionStart] = useState(null); // {x, y} canvas coords
  const [selectionEnd, setSelectionEnd] = useState(null); // {x, y} canvas coords
  const [isSelecting, setIsSelecting] = useState(false);
  const [jobs, setJobs] = useState([]); // Array of TerrainJob instances

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
    isMobileDevice: false,
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
  const lootDropsRef = useRef([]); // Loot drops from store
  const damageNumbersRef = useRef([]); // Damage numbers from store
  const hoveredPositionRef = useRef(hoveredPosition);
  const selectedBuildingTypeRef = useRef(selectedBuildingType);
  const debugModeRef = useRef(debugMode);
  const enablePlayerMovementRef = useRef(enablePlayerMovement);
  const canInteractRef = useRef(null); // Will be set below after usePlayerInteraction
  const closestInteractableRef = useRef(null); // Will be set below after usePlayerInteraction

  // Subscribe to loot drops from store
  const lootDrops = useGameStore((state) => state.lootDrops);
  // Subscribe to damage numbers from store
  const damageNumbers = useGameStore((state) => state.damageNumbers);

  // Update refs when props change (prevents useCallback recreation)
  useEffect(() => {
    npcsRef.current = npcs;
    buildingsRef.current = buildings;
    monstersRef.current = monsters;
    lootDropsRef.current = lootDrops;
    damageNumbersRef.current = damageNumbers;
    hoveredPositionRef.current = hoveredPosition;
    selectedBuildingTypeRef.current = selectedBuildingType;
    debugModeRef.current = debugMode;
    enablePlayerMovementRef.current = enablePlayerMovement;
    // canInteract and closestInteractable updated in separate useEffect below
  }, [npcs, buildings, monsters, lootDrops, damageNumbers, hoveredPosition, selectedBuildingType, debugMode, enablePlayerMovement]);

  // Monster AI system
  const monsterAIRef = useRef(null);
  const previousMonsterStatesRef = useRef(new Map()); // Track AI state changes
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
          useGameStore.getState().spawnMonster(monster);
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

  // Phase 3A: Prop harvesting system - Initialize once
  const propHarvestingSystemRef = useRef(null);
  const floatingTextManagerRef = useRef(null);
  if (propHarvestingSystemRef.current === null && terrainSystemRef.current) {
    const propManager = terrainSystemRef.current.propManager;
    propHarvestingSystemRef.current = new PropHarvestingSystem(propManager, {
      baseHarvestTime: 2000, // 2 seconds default
      harvestRange: 2, // tiles
      autoLootResources: true,
      showFloatingText: true,
    });

    floatingTextManagerRef.current = new FloatingTextManager();

    // Set callbacks for harvesting events
    propHarvestingSystemRef.current.setCallbacks({
      onHarvestComplete: (propId, prop, resources) => {
        // Add resources to inventory
        resources.forEach(resource => {
          useGameStore.getState().addMaterial(resource.type, resource.amount);

          // Add floating text
          floatingTextManagerRef.current.addResourceGain(
            prop.x,
            prop.z,
            resource.type,
            resource.amount
          );
        });

        // eslint-disable-next-line no-console
        console.log(`✅ Harvested ${prop.type || prop.variant}:`, resources);
      },
      onHarvestStart: (propId, prop, duration) => {
        // eslint-disable-next-line no-console
        console.log(`🔨 Started harvesting ${prop.type || prop.variant} (${duration}ms)`);
      },
      onHarvestCancel: (propId, prop) => {
        // eslint-disable-next-line no-console
        console.log(`❌ Cancelled harvesting ${prop.type || prop.variant}`);
      },
    });

    // eslint-disable-next-line no-console
    console.log('Prop harvesting system initialized');
  }

  // Terrain job queue - Initialize once
  const jobQueueRef = useRef(null);
  const timeCalculatorRef = useRef(null);
  if (jobQueueRef.current === null && terrainSystemRef.current) {
    timeCalculatorRef.current = new JobTimeCalculator(terrainSystemRef.current);
    jobQueueRef.current = new TerrainJobQueue(terrainSystemRef.current);
    // eslint-disable-next-line no-console
    console.log('Terrain job queue initialized:', jobQueueRef.current);
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
  const isMobileDevice = React.useMemo(() =>
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
    showShadows: !isMobileDevice, // Disable shadows on mobile for performance
    showOverlays: !isMobileDevice // Disable texture overlays on mobile for performance
  });

  // WF4: NPC Renderer integration (optimized for mobile)
  const npcRenderer = useNPCRenderer({
    tileSize: TILE_SIZE,
    showHealthBars: !isMobileDevice, // Hide health bars on mobile
    showRoleBadges: !isMobileDevice, // Hide role badges on mobile
    showStatusIndicators: !isMobileDevice, // Hide status indicators on mobile
    enableAnimations: true,
    debugMode: debugMode
  });

  // Monster Renderer integration
  const monsterRenderer = useMonsterRenderer({
    tileSize: TILE_SIZE,
    showHealthBars: !isMobileDevice, // Hide health bars on mobile
    enableAnimations: true,
    debugMode: debugMode
  });

  // Terrain Renderer integration
  // eslint-disable-next-line no-unused-vars -- renderWater and renderRivers replaced by Phase 3B water renderer
  const { renderTerrain, renderWater, renderRivers, renderChunkBorders } = useTerrainRenderer({
    tileSize: TILE_SIZE,
    showHeightNumbers: false,
    minHeight: 0,
    maxHeight: 10,
    colorMode: 'biome'  // Use biome-based coloring (Phase 2)
  });

  // Loot Drop Renderer integration (Phase 2)
  const { renderLootDrops } = useLootDropRenderer({
    tileSize: TILE_SIZE,
    showPickupRadius: debugMode,
    enableAnimation: true,
    debugMode: debugMode
  });

  // Damage Number Renderer integration (Phase 3: Combat)
  const { renderDamageNumbers } = useDamageNumberRenderer({
    tileSize: TILE_SIZE
  });

  // Terrain Job Renderer integration
  const { renderJobSelection, renderJobOverlays, renderJobStatistics } = useJobRenderer();

  // Prop Renderer integration (Phase 3 & 3A)
  // eslint-disable-next-line no-unused-vars
  const { renderProps, renderPropHighlight, renderHarvestProgress, renderFloatingText, renderDebugInfo } = usePropRenderer({
    tileSize: TILE_SIZE,
    enableLOD: true,
    enableBatching: true,
    showPropHealth: debugMode // Show health bars in debug mode
  });

  // Structure Renderer integration (Phase 3D)
  // eslint-disable-next-line no-unused-vars
  const { renderStructures, renderStructureHighlight, renderStructureEntrance, renderStructureLabel, renderLootSpawns, renderNPCSpawns } = useStructureRenderer({
    tileSize: TILE_SIZE,
    showBorders: true,
    showDiscoveryOverlay: true
  });

  // Water Renderer integration (Phase 3B)
  // eslint-disable-next-line no-unused-vars -- renderWaterSurface reserved for future water surface effects
  const { renderWaterBodies, renderRivers: renderRiversPhase3B, renderReflections, renderWaterSurface } = useWaterRenderer({
    tileSize: TILE_SIZE,
    showReflections: true,
    showRipples: true,
    showShore: true,
    animationSpeed: 1.0
  });

  // Biome Transition Renderer integration (Phase 3C)
  // eslint-disable-next-line no-unused-vars -- Biome transition features reserved for future enhancement
  const { blendBiomeColors, renderTransitionOverlay, renderTransitionDebug, getTransitionStrength, getTransitionParticles } = useBiomeTransitionRenderer({
    showTransitionOverlay: false,
    transitionThreshold: 0.7,
    overlayOpacity: 0.15
  });

  // Player movement controller
  usePlayerMovement(playerRef.current, enablePlayerMovement);

  // Get nearby props for interaction (Phase 3A)
  const nearbyProps = React.useMemo(() => {
    if (!terrainSystemRef.current || !playerRef.current) return [];

    const player = playerRef.current;
    const interactionRange = 3; // tiles

    return terrainSystemRef.current.getPropsInRegion(
      player.x - interactionRange,
      player.z - interactionRange,
      interactionRange * 2,
      interactionRange * 2
    ).filter(prop => prop.harvestable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRef.current?.x, playerRef.current?.z]);

  // Player interaction system
  const { closestInteractable, canInteract } = usePlayerInteraction(
    playerRef.current,
    {
      buildings,
      npcs,
      resources: [], // TODO: Add resources when implemented
      chests: buildings.filter(b => b.type === 'CHEST'), // Chests are buildings
      props: nearbyProps, // Phase 3A: Harvestable props
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
      onPropInteract: (prop) => {
        // Phase 3A: Start harvesting prop
        if (propHarvestingSystemRef.current && prop.id) {
          const isHarvesting = propHarvestingSystemRef.current.isHarvesting(prop.id);

          if (isHarvesting) {
            // Cancel if already harvesting
            propHarvestingSystemRef.current.cancelHarvest(prop.id);
          } else {
            // Start harvesting
            propHarvestingSystemRef.current.startHarvest(
              prop.id,
              prop,
              playerRef.current
            );
          }
        }
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

      // Clear canvas with neutral background to prevent flashing
      // Using a light gray instead of white reduces visual flashing
      ctx.fillStyle = '#F5F5F5';
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

    // Filter visible NPCs - fetch directly from manager for real-time positions!
    // This bypasses the debounced React state to get 60 FPS NPC movement
    let currentNPCs = npcsRef.current || [];
    if (gameManager && gameManager.orchestrator && gameManager.orchestrator.npcManager) {
      // Get NPCs directly from manager with real-time positions
      currentNPCs = gameManager.orchestrator.npcManager.getAllNPCStates();
    }

    const visibleNPCs = currentNPCs.filter(npc => {
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

    if (!isMobileDevice) {
      // Full grid on desktop
      // OPTIMIZED: Batch all lines into single path for better performance
      ctx.save();
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;

      // Calculate visible grid range (no upper bounds for infinite world)
      const startX = Math.floor(-offset.x / TILE_SIZE);
      const endX = Math.ceil((CANVAS_WIDTH - offset.x) / TILE_SIZE);
      const startZ = Math.floor(-offset.y / TILE_SIZE);
      const endZ = Math.ceil((CANVAS_HEIGHT - offset.y) / TILE_SIZE);

      // Batch all grid lines into a single path (much faster!)
      ctx.beginPath();

      // Vertical lines (render only visible tiles, no upper limit)
      for (let i = startX; i <= endX; i++) {
        const x = i * TILE_SIZE + offset.x;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
      }

      // Horizontal lines (render only visible tiles, no upper limit)
      for (let i = startZ; i <= endZ; i++) {
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

      // Vertical lines (every 5 tiles for mobile, no upper limit)
      for (let i = Math.floor(startX / 5) * 5; i <= endX; i += 5) {
        const x = i * TILE_SIZE + offset.x;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
      }

      // Horizontal lines (every 5 tiles for mobile, no upper limit)
      for (let i = Math.floor(startZ / 5) * 5; i <= endZ; i += 5) {
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
        const seasonalSystem = terrainSystemRef.current.getSeasonalSystem(); // Phase 3C
        renderTerrain(ctx, terrainManager, worldToCanvas, viewportBounds, worldGenerator, seasonalSystem);

        // Phase 3B: Render water bodies (lakes, ponds, pools, hot springs)
        const waterBodies = terrainSystemRef.current.getWaterBodiesInRegion(
          viewportBounds.left,
          viewportBounds.top,
          viewportBounds.right - viewportBounds.left,
          viewportBounds.bottom - viewportBounds.top
        );

        if (waterBodies.length > 0) {
          const currentTime = performance.now();
          renderWaterBodies(ctx, waterBodies, worldToCanvas, currentTime);
          renderReflections(ctx, waterBodies, worldToCanvas);
        }

        // Phase 3B: Generate and render rivers
        terrainSystemRef.current.generateRiversForArea(
          viewportBounds.left - 50,
          viewportBounds.top - 50,
          viewportBounds.right - viewportBounds.left + 100,
          viewportBounds.bottom - viewportBounds.top + 100
        );

        const visibleRivers = terrainSystemRef.current.getRiversInRegion(
          viewportBounds.left,
          viewportBounds.top,
          viewportBounds.right - viewportBounds.left,
          viewportBounds.bottom - viewportBounds.top
        );

        if (visibleRivers.length > 0) {
          const currentTime = performance.now();
          renderRiversPhase3B(ctx, visibleRivers, worldToCanvas, currentTime);
        }
      } catch (e) {
        // Log terrain rendering errors for debugging
        console.error('Terrain rendering error:', e);
      }
    }

    // Phase 3D: Render structures (AFTER terrain, BEFORE props)
    if (terrainSystemRef.current) {
      try {
        // Get visible structures in viewport
        const visibleStructures = terrainSystemRef.current.getStructuresInRegion(
          viewportBounds.left,
          viewportBounds.top,
          viewportBounds.right - viewportBounds.left,
          viewportBounds.bottom - viewportBounds.top
        );

        // Render structures
        const structureStats = renderStructures(ctx, visibleStructures, worldToCanvas, viewportBounds);

        // Render structure entrances in debug mode
        if (debugModeRef.current) {
          visibleStructures.forEach(structure => {
            renderStructureEntrance(ctx, structure, worldToCanvas);
            renderStructureLabel(ctx, structure, worldToCanvas);
            renderLootSpawns(ctx, structure, worldToCanvas);
            renderNPCSpawns(ctx, structure, worldToCanvas);
          });
        }

        // Store structure metrics
        perfRef.current.currentMetrics.visibleStructures = structureStats.structuresRendered;
        perfRef.current.currentMetrics.totalStructures = visibleStructures.length;
      } catch (e) {
        console.error('Structure rendering error:', e);
      }
    }

    // Phase 3: Render props (AFTER structures, BEFORE buildings for correct layering)
    let visibleProps = [];
    if (terrainSystemRef.current) {
      try {
        // Get visible props in viewport
        visibleProps = terrainSystemRef.current.getPropsInRegion(
          viewportBounds.left,
          viewportBounds.top,
          viewportBounds.right - viewportBounds.left,
          viewportBounds.bottom - viewportBounds.top
        );

        // Render props with LOD and batching
        const propStats = renderProps(
          ctx,
          visibleProps,
          worldToCanvas,
          { x: -offset.x, z: -offset.y }, // camera position
          viewportBounds
        );

        // Store prop metrics
        perfRef.current.currentMetrics.visibleProps = propStats.propsRendered;
        perfRef.current.currentMetrics.totalProps = propStats.totalProps;
      } catch (e) {
        console.error('Prop rendering error:', e);
      }
    }

    // Phase 3C: Render micro-biome visual indicators (in debug mode)
    if (debugModeRef.current && terrainSystemRef.current) {
      try {
        const microBiomes = terrainSystemRef.current.getMicroBiomesInRegion(
          viewportBounds.left,
          viewportBounds.top,
          viewportBounds.right - viewportBounds.left,
          viewportBounds.bottom - viewportBounds.top
        );

        for (const microBiome of microBiomes) {
          const centerPos = worldToCanvas(microBiome.position.x, microBiome.position.z);

          ctx.save();

          // Draw circle overlay
          ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(centerPos.x, centerPos.y, microBiome.radius * TILE_SIZE, 0, Math.PI * 2);
          ctx.stroke();

          // Draw label
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(microBiome.definition.name, centerPos.x, centerPos.y - 5);

          ctx.restore();
        }
      } catch (e) {
        // Silently fail micro-biome rendering
      }
    }

    // Phase 3A: Render prop highlights for nearby harvestable props
    if (propHarvestingSystemRef.current && closestInteractableRef.current) {
      try {
        const interactable = closestInteractableRef.current;
        // Highlight if it's a prop interaction
        if (interactable.type === 'PROP' && interactable.object) {
          renderPropHighlight(ctx, interactable.object, worldToCanvas, 'rgba(50, 255, 50, 0.5)');
        }
      } catch (e) {
        // Silently handle highlight errors
      }
    }

    // Phase 3A: Render harvest progress bars for props being harvested
    if (propHarvestingSystemRef.current) {
      try {
        const activeHarvests = propHarvestingSystemRef.current.getActiveHarvests();
        activeHarvests.forEach(harvest => {
          renderHarvestProgress(ctx, harvest.prop, harvest.progress, worldToCanvas);
        });
      } catch (e) {
        // Silently handle progress bar errors
      }
    }

    // WF3: Render buildings using new BuildingRenderer with viewport culling (use ref!)
    const visibleBuildingCount = renderBuildingsWF3(ctx, buildingsRef.current, worldToCanvas, viewportBounds);

    // WF4: Render NPCs using NPCRenderer (already filtered, use ref!)
    npcRenderer.renderNPCs(ctx, visibleNPCs, worldToCanvas);

    // Render monsters using MonsterRenderer (already filtered)
    monsterRenderer.renderMonsters(ctx, visibleMonsters, worldToCanvas);

    // Render loot drops (Phase 2: Loot System)
    if (lootDropsRef.current && lootDropsRef.current.length > 0) {
      const currentTime = performance.now();
      renderLootDrops(ctx, lootDropsRef.current, worldToCanvas, currentTime);
    }

    // Render damage numbers (Phase 3: Combat)
    if (damageNumbersRef.current && damageNumbersRef.current.length > 0) {
      const currentTime = performance.now();
      renderDamageNumbers(ctx, damageNumbersRef.current, worldToCanvas, currentTime);
    }

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

    // Phase 3A: Render floating text (resource gains, etc.)
    if (floatingTextManagerRef.current) {
      try {
        const activeTexts = floatingTextManagerRef.current.getActiveTexts();
        activeTexts.forEach(text => {
          renderFloatingText(
            ctx,
            text.x + text.offsetX,
            text.z + text.offsetZ,
            text.text,
            worldToCanvas,
            text.lifetime,
            text.color
          );
        });
      } catch (e) {
        // Silently handle floating text errors
      }
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

      // Terrain job overlays (show existing jobs)
      if (jobs && jobs.length > 0) {
        renderJobOverlays(ctx, jobs, worldToCanvas, TILE_SIZE);
      }

      // Terrain job selection overlay (show current selection being dragged)
      if (activeTool && selectionStart && selectionEnd) {
        // Calculate selection info for preview
        const start = canvasToWorld(selectionStart.x, selectionStart.y);
        const end = canvasToWorld(selectionEnd.x, selectionEnd.y);
        const width = Math.abs(end.x - start.x) + 1;
        const depth = Math.abs(end.z - start.z) + 1;
        const tiles = width * depth;

        // Estimate time using time calculator
        let estimatedTime = '?';
        if (timeCalculatorRef.current && terrainSystemRef.current) {
          const area = {
            x: Math.min(start.x, end.x),
            z: Math.min(start.z, end.z),
            width,
            depth
          };
          const timeMs = timeCalculatorRef.current.estimateTime(activeTool, area);
          estimatedTime = JobTimeCalculator.formatTime(timeMs);
        }

        renderJobSelection(ctx, selectionStart, selectionEnd, activeTool, {
          tiles,
          width,
          depth,
          estimatedTime
        });
      }

      // Job statistics overlay (top-right corner)
      if (jobQueueRef.current) {
        const stats = jobQueueRef.current.getStatistics();
        renderJobStatistics(ctx, stats);
      }

      // Phase 3C: Weather effects (particles, overlays, lightning)
      if (terrainSystemRef.current) {
        try {
          const weatherSystem = terrainSystemRef.current.getWeatherSystem();

          if (weatherSystem) {
            // Get weather overlay color
            const overlayColor = weatherSystem.getOverlayColor();
            if (overlayColor) {
              ctx.fillStyle = overlayColor;
              ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }

            // Render weather particles
            const particles = weatherSystem.getParticles();
            const weatherEffects = weatherSystem.getWeatherEffects();

            if (particles && particles.length > 0 && weatherEffects) {
              ctx.save();
              ctx.fillStyle = weatherEffects.particleColor || 'rgba(255, 255, 255, 0.8)';

              particles.forEach(p => {
                // Simple circle for each particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, weatherEffects.particleSize || 2, 0, Math.PI * 2);
                ctx.fill();
              });

              ctx.restore();
            }

            // Lightning flash overlay
            const lightningIntensity = weatherSystem.getLightningIntensity();
            if (lightningIntensity > 0) {
              ctx.save();
              ctx.globalAlpha = lightningIntensity * 0.5;
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
              ctx.restore();
            }
          }
        } catch (e) {
          // Silently fail weather rendering
        }
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
  }, [renderBuildingsWF3, renderPlacementPreview, npcRenderer, monsterRenderer, renderTerrain, renderChunkBorders, worldToCanvas, getOffset, renderInteractionPrompt, isMobileDevice, renderJobOverlays, renderJobSelection, renderJobStatistics, jobs, activeTool, selectionStart, selectionEnd, canvasToWorld, renderProps, renderFloatingText, renderHarvestProgress, renderPropHighlight, renderLootSpawns, renderNPCSpawns, renderStructureEntrance, renderStructureLabel, renderStructures, renderWaterBodies, renderRiversPhase3B, renderReflections, renderLootDrops, renderDamageNumbers]);

  /**
   * Terrain tool handlers
   */
  const handleToolSelect = React.useCallback((tool) => {
    setActiveTool(tool);
    if (!tool) {
      // Cancel any selection in progress
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelecting(false);
    }
  }, []);

  const handlePriorityChange = React.useCallback((priority) => {
    setJobPriority(priority);
  }, []);

  const handleMouseDown = React.useCallback((e) => {
    if (!activeTool || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    setSelectionStart({ x: canvasX, y: canvasY });
    setSelectionEnd({ x: canvasX, y: canvasY });
    setIsSelecting(true);
  }, [activeTool]);

  const handleMouseMoveSelection = React.useCallback((e) => {
    if (!isSelecting || !selectionStart || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    setSelectionEnd({ x: canvasX, y: canvasY });
  }, [isSelecting, selectionStart]);

  const handleMouseUp = React.useCallback((e) => {
    if (!isSelecting || !selectionStart || !selectionEnd || !activeTool) {
      setIsSelecting(false);
      return;
    }

    // Convert canvas selection to world coordinates
    const start = canvasToWorld(selectionStart.x, selectionStart.y);
    const end = canvasToWorld(selectionEnd.x, selectionEnd.y);

    // Calculate area
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);

    const area = {
      x: minX,
      z: minZ,
      width: maxX - minX + 1,
      depth: maxZ - minZ + 1
    };

    // Create job if area is valid (at least 1x1)
    if (area.width > 0 && area.depth > 0 && jobQueueRef.current) {
      const job = jobQueueRef.current.addJob({
        type: activeTool,
        area,
        priority: jobPriority
      });

      // Update jobs state
      setJobs(prevJobs => [...prevJobs, job]);

      // eslint-disable-next-line no-console
      console.log('Created terrain job:', job);
    }

    // Reset selection
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  }, [isSelecting, selectionStart, selectionEnd, activeTool, jobPriority, canvasToWorld]);

  /**
   * Handle canvas click for placement (mouse and touch)
   */
  const [touchStartTime, setTouchStartTime] = React.useState(0);
  const [isLongPress, setIsLongPress] = React.useState(false);
  const longPressTimerRef = React.useRef(null);

  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;

    // Ignore if terrain tool is active (handled by mousedown/mouseup)
    if (activeTool) {
      return;
    }

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

      // Check if clicked on a monster (Phase 3: Combat)
      const clickedMonster = monstersRef.current?.find(monster => {
        if (!monster || !monster.alive) return false;
        const dist = Math.sqrt(
          Math.pow(worldPos.x - monster.position.x, 2) +
          Math.pow(worldPos.z - monster.position.z, 2)
        );
        return dist < 1.5; // Within 1.5 tiles
      });

      if (clickedMonster) {
        // Attack the monster
        useGameStore.getState().attackMonster(clickedMonster.id);
        didInteract = true;
      }

      // Check if close to an interactable
      if (!didInteract && closestInteractable) {
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
   * Handle canvas mouse move for hover and selection (throttled for performance)
   */
  const handleCanvasMouseMove = (e) => {
    if (!canvasRef.current) return;

    // Handle selection dragging (if active)
    if (isSelecting && selectionStart) {
      handleMouseMoveSelection(e);
    }

    // Throttle hover updates: Only update at most every 16ms (60 FPS)
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

    // No bounds checking for infinite world - always allow hover
    if (posChanged) {
      setHoveredPosition(position);
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
    let lastFrameTime = performance.now();

    const animate = (currentTime) => {
      // Calculate delta time for smooth updates
      const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
      lastFrameTime = currentTime;
      const frameStartTime = performance.now();

      try {
        // Verify canvas is still valid before rendering
        if (!canvas || !ctx || canvas.width === 0 || canvas.height === 0) {
          animationId = requestAnimationFrame(animate);
          return;
        }
        // Update terrain chunk loading based on camera position
        // Phase 3C: Pass deltaTime for weather/season updates
        if (terrainSystemRef.current && getOffset) {
          const offset = getOffset() || { x: 0, y: 0 };
          // Camera position in world pixels (inverse of offset)
          const cameraX = -offset.x;
          const cameraZ = -offset.y;
          // Store camera position for MiniMap
          cameraPositionRef.current = { x: cameraX, z: cameraZ };
          terrainSystemRef.current.update(cameraX, cameraZ, CANVAS_WIDTH, CANVAS_HEIGHT, deltaTime * 1000);
        }

        // Update NPC positions before rendering (use ref to avoid loop recreation)
        if (npcRenderer && npcsRef.current) {
          npcRenderer.updatePositions(npcsRef.current, deltaTime * 1000); // Convert back to ms
        }

        // Update monster AI before rendering
        if (monsterAIRef.current && monstersRef.current && monstersRef.current.length > 0 && playerRef.current) {
          const gameState = {
            player: playerRef.current,
            npcs: npcsRef.current || [],
            buildings: buildingsRef.current || []
          };
          monsterAIRef.current.updateAll(monstersRef.current, gameState, deltaTime * 1000); // Convert back to ms

          // CRITICAL: Only notify Zustand when monster states actually change
          // Check if any monster AI state changed since last frame
          let stateChanged = false;
          const currentStates = previousMonsterStatesRef.current;

          for (const monster of monstersRef.current) {
            const prevState = currentStates.get(monster.id);
            if (prevState !== monster.aiState) {
              stateChanged = true;
              currentStates.set(monster.id, monster.aiState);
            }
          }

          // Only trigger Zustand update if states changed (not every frame!)
          if (stateChanged) {
            useGameStore.setState({ enemies: [...monstersRef.current] });
          }
        }

        // Update monster positions before rendering
        if (monsterRenderer && monstersRef.current) {
          monsterRenderer.updatePositions(monstersRef.current, deltaTime * 1000); // Convert back to ms
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
              // Clean up state tracking
              previousMonsterStatesRef.current.delete(monster.id);
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

          // Clean up old damage numbers (Phase 3: Combat)
          if (damageNumbersRef.current && damageNumbersRef.current.length > 0) {
            const now = performance.now();
            const maxAge = 1500; // 1.5 seconds
            damageNumbersRef.current.forEach(damageNum => {
              const age = now - (damageNum.id || now);
              if (age > maxAge) {
                useGameStore.getState().removeDamageNumber(damageNum.id);
              }
            });
          }

          // Update spawn system - spawn new monsters as needed
          if (spawnManagerRef.current && monstersRef.current) {
            const newMonsters = spawnManagerRef.current.update(monstersRef.current, deltaTime * 1000); // Convert back to ms
            if (newMonsters.length > 0) {
              // Add new monsters to the game
              newMonsters.forEach(monster => {
                useGameStore.getState().spawnMonster(monster);
              });
              monstersRef.current.push(...newMonsters);
            }
          }

          // Phase 3A: Update prop harvesting system
          if (propHarvestingSystemRef.current) {
            propHarvestingSystemRef.current.update();
          }

          // Phase 3A: Update floating text animations
          if (floatingTextManagerRef.current) {
            floatingTextManagerRef.current.update();
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
            isMobileDevice,
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
    // Minimal dependencies - only re-initialize if core rendering setup changes
    // We use refs for data (npcsRef, buildingsRef, etc.) so don't need them here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
      />

      {/* Terrain Tools Panel - Collapsible, hidden in clean mode */}
      {!selectedBuildingType && !cleanMode && !isMobileDevice && (
        <CollapsibleFloatingPanel
          title="Terrain Tools"
          icon="⛏️"
          defaultExpanded={false}
          position="left: 10px; bottom: 10px"
        >
          <TerrainToolsPanel
            activeTool={activeTool}
            priority={jobPriority}
            onToolSelect={handleToolSelect}
            onPriorityChange={handlePriorityChange}
            isSelecting={isSelecting}
            selectionInfo={
              selectionStart && selectionEnd
                ? {
                    width: Math.abs(canvasToWorld(selectionEnd.x, selectionEnd.y).x - canvasToWorld(selectionStart.x, selectionStart.y).x) + 1,
                    depth: Math.abs(canvasToWorld(selectionEnd.x, selectionEnd.y).z - canvasToWorld(selectionStart.x, selectionStart.y).z) + 1,
                    tiles: (Math.abs(canvasToWorld(selectionEnd.x, selectionEnd.y).x - canvasToWorld(selectionStart.x, selectionStart.y).x) + 1) *
                           (Math.abs(canvasToWorld(selectionEnd.x, selectionEnd.y).z - canvasToWorld(selectionStart.x, selectionStart.y).z) + 1),
                    estimatedTime: timeCalculatorRef.current && activeTool
                      ? JobTimeCalculator.formatTime(
                          timeCalculatorRef.current.estimateTime(activeTool, {
                            x: Math.min(canvasToWorld(selectionStart.x, selectionStart.y).x, canvasToWorld(selectionEnd.x, selectionEnd.y).x),
                            z: Math.min(canvasToWorld(selectionStart.x, selectionStart.y).z, canvasToWorld(selectionEnd.x, selectionStart.y).z),
                            width: Math.abs(canvasToWorld(selectionEnd.x, selectionEnd.y).x - canvasToWorld(selectionStart.x, selectionStart.y).x) + 1,
                            depth: Math.abs(canvasToWorld(selectionEnd.x, selectionEnd.y).z - canvasToWorld(selectionStart.x, selectionStart.y).z) + 1
                          })
                        )
                      : '?'
                  }
                : null
            }
          />
        </CollapsibleFloatingPanel>
      )}

      {/* Mini-map (Phase 3 Integration) - Always visible, has close button */}
      {enablePlayerMovement && terrainSystemRef.current && !cleanMode && !isMobileDevice && (
        <MiniMap
          terrainSystem={terrainSystemRef.current}
          cameraX={cameraPositionRef.current.x}
          cameraZ={cameraPositionRef.current.z}
          size={200}
        />
      )}

      {/* Unified Debug & Developer Menu - Consolidates all debug overlays */}
      {!cleanMode && !isMobileDevice && (
        <UnifiedDebugMenu
          terrainSystem={terrainSystemRef.current}
          debugInfo={debugInfo}
          perfMetrics={perfMetrics}
          canvasRef={canvasRef}
          getOffset={getOffset}
          enablePlayerMovement={enablePlayerMovement}
          showPerformanceMonitor={showPerformanceMonitor}
          debugMode={debugMode}
        />
      )}

      {/* Viewport footer - hidden on mobile (legend moved to hamburger menu) */}
      {!isMobileDevice && (
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
      )}
    </div>
  );
}

export default GameViewport;
