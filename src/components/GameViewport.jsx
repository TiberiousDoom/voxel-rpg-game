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
import { useNPCRenderer, useNPCAnimation } from '../rendering/useNPCRenderer.js'; // WF4
import { PlayerEntity } from '../modules/player/PlayerEntity.js';
import { PlayerRenderer } from '../modules/player/PlayerRenderer.js';
import { usePlayerMovement } from '../modules/player/PlayerMovementController.js';
import { usePlayerInteraction } from '../modules/player/PlayerInteractionSystem.js';
import { useCameraFollow, CAMERA_MODES } from '../modules/player/CameraFollowSystem.js';
import './GameViewport.css';

/**
 * Mobile-safe canvas initialization
 * Handles device pixel ratio and fallback context options
 */
const initializeCanvas = (canvas, width, height) => {
  if (!canvas) return null;

  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent) ||
                   window.innerWidth <= 768 ||
                   ('ontouchstart' in window);

  // Set canvas dimensions - keep it simple for mobile
  canvas.width = width;
  canvas.height = height;

  // Try multiple context configurations
  let ctx = null;
  const contextConfigs = [
    { alpha: false, willReadFrequently: true }, // Better for mobile
    { alpha: false }, // Minimal config
    { alpha: false, desynchronized: true }, // Original config (try last as it might fail)
    {} // Fallback to defaults
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

          // eslint-disable-next-line no-console
          console.log('✅ Canvas initialized successfully with config:', config, 'Mobile:', isMobile);
        } catch (testError) {
          // eslint-disable-next-line no-console
          console.warn('Context test failed:', testError);
          ctx = null;
          continue;
        }
        break;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Context creation failed with config:', config, e);
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

  // Player state - Initialize synchronously to ensure it's available before first render
  const playerRef = useRef(null);
  const playerRendererRef = useRef(null);

  if (enablePlayerMovement && playerRef.current === null) {
    try {
      playerRef.current = new PlayerEntity({ x: 25, z: 25 }); // Start in center of 50x50 grid
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

  // WF3: Building rendering hook
  const {
    renderBuildings: renderBuildingsWF3,
    // eslint-disable-next-line no-unused-vars -- Reserved for WF3: Hover effects not yet implemented
    renderHoverEffect,
    renderPlacementPreview
  } = useBuildingRenderer({
    tileSize: TILE_SIZE,
    showHealthBars: true,
    showProgressBars: true,
    showShadows: true,
    showOverlays: true
  });

  // WF4: NPC Renderer integration
  const npcRenderer = useNPCRenderer({
    tileSize: TILE_SIZE,
    showHealthBars: true,
    showRoleBadges: true,
    showStatusIndicators: true,
    enableAnimations: true,
    debugMode: debugMode
  });

  // WF4: Update NPC positions for smooth interpolation
  useNPCAnimation(npcs, npcRenderer.updatePositions, true);

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
   * Convert canvas coordinates to grid position
   */
  const canvasToWorld = (canvasX, canvasY) => {
    return {
      x: Math.floor(canvasX / TILE_SIZE),
      z: Math.floor(canvasY / TILE_SIZE)
    };
  };

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
      // Update debug info
      setDebugInfo(prev => ({ ...prev, rendering: true, renderCount: prev.renderCount + 1 }));

      // Validate context
      if (!ctx || !ctx.fillRect) {
        throw new Error('Invalid canvas context');
      }

      // Clear canvas - use a visible color to verify rendering
      ctx.fillStyle = '#f0f0f0'; // Light gray instead of white
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
        // eslint-disable-next-line no-console
        console.warn('Camera offset error, using default:', e);
      }

    // Draw grid with camera offset
    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    // Calculate visible grid range
    const startX = Math.floor(-offset.x / TILE_SIZE);
    const endX = Math.ceil((CANVAS_WIDTH - offset.x) / TILE_SIZE);
    const startZ = Math.floor(-offset.y / TILE_SIZE);
    const endZ = Math.ceil((CANVAS_HEIGHT - offset.y) / TILE_SIZE);

    // Draw vertical lines
    for (let i = Math.max(0, startX); i <= Math.min(GRID_WIDTH, endX); i++) {
      const x = i * TILE_SIZE + offset.x;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let i = Math.max(0, startZ); i <= Math.min(GRID_HEIGHT, endZ); i++) {
      const y = i * TILE_SIZE + offset.y;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    ctx.restore();

    // WF3: Render buildings using new BuildingRenderer
    renderBuildingsWF3(ctx, buildings, worldToCanvas);

    // WF4: Render NPCs using NPCRenderer
    // This uses the new rendering system with smooth interpolation and animations
    npcRenderer.renderNPCs(ctx, npcs, worldToCanvas);

    // Render player
    if (enablePlayerMovement && playerRef.current && playerRendererRef.current) {
      playerRendererRef.current.renderPlayer(ctx, playerRef.current, worldToCanvas);
    }

    // WF4: Render pathfinding visualization in debug mode
    if (debugMode) {
      npcRenderer.renderPaths(ctx, npcs, worldToCanvas);
    }

    // Render interaction prompts
    if (enablePlayerMovement && canInteract && closestInteractable) {
      renderInteractionPrompt(ctx, closestInteractable);
    }

      // WF3: Draw hover preview using new renderer
      if (hoveredPosition && selectedBuildingType) {
        // TODO: Add validation check to determine if placement is valid
        const isValid = true; // Placeholder - should check collision/placement rules
        renderPlacementPreview(ctx, hoveredPosition, selectedBuildingType, isValid, worldToCanvas);
      }

      // Mark rendering as successful
      setDebugInfo(prev => ({ ...prev, lastError: null }));
    } catch (error) {
      // Log error and update debug info
      setDebugInfo(prev => ({
        ...prev,
        rendering: false,
        lastError: `Render error: ${error.message}`
      }));

      // Draw error message on canvas if context is available
      if (ctx && ctx.fillText) {
        try {
          ctx.fillStyle = '#000000';
          ctx.font = '14px Arial';
          ctx.fillText(`Error: ${error.message}`, 10, 20);
        } catch (e) {
          // Ignore if even error rendering fails
        }
      }
    }
  }, [buildings, npcs, hoveredPosition, selectedBuildingType, renderBuildingsWF3, renderPlacementPreview, debugMode, npcRenderer, worldToCanvas, getOffset, enablePlayerMovement, canInteract, closestInteractable, renderInteractionPrompt]);

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
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    // Get world position with camera offset
    const worldPos = canvasToWorldPosition(canvasX, canvasY);
    const gridPos = canvasToWorld(canvasX, canvasY);

    if (selectedBuildingType) {
      // Building placement mode
      onPlaceBuilding({
        x: gridPos.x,
        y: 0, // Ground level
        z: gridPos.z
      });
    } else if (enablePlayerMovement && playerRef.current) {
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
    } else {
      // Check if a building was clicked
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
   * Uses continuous animation loop for smooth rendering
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

    const animate = () => {
      try {
        // Draw viewport with safe error handling
        drawViewport(ctx);

        // After drawing viewport, add visual debug markers on the canvas
        try {
          // Draw frame counter in top-right corner
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(CANVAS_WIDTH - 100, 0, 100, 30);
          ctx.fillStyle = '#00FF00';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`Frame ${debugInfo.renderCount}`, CANVAS_WIDTH - 50, 20);
          ctx.restore();

          // Draw test pattern in bottom-right corner (always visible)
          ctx.save();
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(CANVAS_WIDTH - 50, CANVAS_HEIGHT - 50, 20, 20);
          ctx.fillStyle = '#00FF00';
          ctx.fillRect(CANVAS_WIDTH - 30, CANVAS_HEIGHT - 50, 20, 20);
          ctx.fillStyle = '#0000FF';
          ctx.fillRect(CANVAS_WIDTH - 50, CANVAS_HEIGHT - 30, 20, 20);
          ctx.fillStyle = '#FFFF00';
          ctx.fillRect(CANVAS_WIDTH - 30, CANVAS_HEIGHT - 30, 20, 20);
          ctx.restore();

          // Draw a border around the entire canvas
          ctx.save();
          ctx.strokeStyle = '#FF00FF';
          ctx.lineWidth = 4;
          ctx.strokeRect(2, 2, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 4);
          ctx.restore();
        } catch (debugErr) {
          // eslint-disable-next-line no-console
          console.warn('Debug markers failed:', debugErr);
        }

        // Update debug info
        if (initialRenderAttempts < maxInitialAttempts) {
          initialRenderAttempts++;
          if (getOffset) {
            setDebugInfo(prev => ({
              ...prev,
              cameraReady: true,
              lastError: null
            }));
          }
        }

      } catch (error) {
        setDebugInfo(prev => ({
          ...prev,
          lastError: `Render error: ${error.message}`
        }));

        // eslint-disable-next-line no-console
        console.error('Render error:', error);

        // Try to draw error message on canvas
        try {
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.fillStyle = '#ffffff';
          ctx.font = '20px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(`Error: ${error.message}`, 10, 30);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to draw error on canvas:', e);
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [drawViewport, getOffset]);

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

      {/* Debug overlay - always visible to diagnose mobile issues */}
      <div className="debug-overlay" style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: debugInfo.lastError ? 'rgba(255, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.95)',
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        border: '2px solid yellow',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '90vw',
        maxHeight: '80vh',
        minHeight: '100px',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 99999,
        pointerEvents: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
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
