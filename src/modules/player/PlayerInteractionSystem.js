/**
 * PlayerInteractionSystem.js
 * Handles player interactions with buildings, NPCs, and resources
 */

import { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Interaction types
 */
export const INTERACTION_TYPES = {
  BUILDING: 'BUILDING',
  NPC: 'NPC',
  RESOURCE: 'RESOURCE',
  CHEST: 'CHEST',
  PROP: 'PROP', // Phase 3A: Harvestable props (trees, rocks, etc.)
  DUNGEON_ENTRANCE: 'DUNGEON_ENTRANCE', // Dungeon entry points
};

/**
 * Player interaction system
 */
export class PlayerInteractionSystem {
  constructor(player) {
    this.player = player;
    this.nearbyInteractables = [];
    this.callbacks = {
      onBuildingInteract: null,
      onNPCInteract: null,
      onResourceInteract: null,
      onChestInteract: null,
      onPropInteract: null, // Phase 3A: Prop harvesting
      onDungeonEntranceInteract: null, // Dungeon entry points
    };
  }

  /**
   * Set interaction callbacks
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Update nearby interactables (call each frame)
   * @param {Array} buildings - List of buildings
   * @param {Array} npcs - List of NPCs
   * @param {Array} resources - List of resource nodes
   * @param {Array} chests - List of chests
   * @param {Array} props - List of harvestable props (Phase 3A)
   * @param {Array} dungeonEntrances - List of dungeon entrance structures
   */
  updateNearbyInteractables(buildings = [], npcs = [], resources = [], chests = [], props = [], dungeonEntrances = []) {
    this.nearbyInteractables = [];

    // Check buildings
    buildings.forEach(building => {
      if (building && building.position && this.player.isInInteractionRange(building.position)) {
        this.nearbyInteractables.push({
          type: INTERACTION_TYPES.BUILDING,
          object: building,
          position: building.position,
        });
      }
    });

    // Check NPCs
    npcs.forEach(npc => {
      if (npc && npc.position && this.player.isInInteractionRange(npc.position)) {
        this.nearbyInteractables.push({
          type: INTERACTION_TYPES.NPC,
          object: npc,
          position: npc.position,
        });
      }
    });

    // Check resources
    resources.forEach(resource => {
      if (resource && resource.position && this.player.isInInteractionRange(resource.position)) {
        this.nearbyInteractables.push({
          type: INTERACTION_TYPES.RESOURCE,
          object: resource,
          position: resource.position,
        });
      }
    });

    // Check chests
    chests.forEach(chest => {
      if (chest && chest.position && this.player.isInInteractionRange(chest.position)) {
        this.nearbyInteractables.push({
          type: INTERACTION_TYPES.CHEST,
          object: chest,
          position: chest.position,
        });
      }
    });

    // Check props (Phase 3A: Harvestable props)
    props.forEach(prop => {
      // Props store coordinates as x, z (not position object)
      if (prop && prop.x !== undefined && prop.z !== undefined && prop.harvestable) {
        const propPosition = { x: prop.x, z: prop.z };
        if (this.player.isInInteractionRange(propPosition)) {
          this.nearbyInteractables.push({
            type: INTERACTION_TYPES.PROP,
            object: prop,
            position: propPosition,
          });
        }
      }
    });

    // Check dungeon entrances
    dungeonEntrances.forEach(entrance => {
      if (entrance && entrance.position) {
        // Get the entrance point (center of the structure's entrance)
        const entrancePos = entrance.getEntrancePosition?.() || {
          x: entrance.position.x + Math.floor(entrance.width / 2),
          z: entrance.position.z + Math.floor(entrance.height / 2)
        };
        if (this.player.isInInteractionRange(entrancePos)) {
          this.nearbyInteractables.push({
            type: INTERACTION_TYPES.DUNGEON_ENTRANCE,
            object: entrance,
            position: entrancePos,
          });
        }
      }
    });
  }

  /**
   * Get the closest interactable
   * @returns {object|null}
   */
  getClosestInteractable() {
    if (this.nearbyInteractables.length === 0) return null;

    // Find closest by distance
    let closest = this.nearbyInteractables[0];
    let minDistance = this.getDistance(this.player.position, closest.position);

    for (let i = 1; i < this.nearbyInteractables.length; i++) {
      const interactable = this.nearbyInteractables[i];
      const distance = this.getDistance(this.player.position, interactable.position);

      if (distance < minDistance) {
        minDistance = distance;
        closest = interactable;
      }
    }

    return closest;
  }

  /**
   * Calculate distance between two positions
   */
  getDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Interact with the closest object
   */
  interact() {
    const closest = this.getClosestInteractable();
    if (!closest) return;

    switch (closest.type) {
      case INTERACTION_TYPES.BUILDING:
        if (this.callbacks.onBuildingInteract) {
          this.callbacks.onBuildingInteract(closest.object);
        }
        break;

      case INTERACTION_TYPES.NPC:
        if (this.callbacks.onNPCInteract) {
          this.callbacks.onNPCInteract(closest.object);
        }
        break;

      case INTERACTION_TYPES.RESOURCE:
        if (this.callbacks.onResourceInteract) {
          this.callbacks.onResourceInteract(closest.object);
        }
        break;

      case INTERACTION_TYPES.CHEST:
        if (this.callbacks.onChestInteract) {
          this.callbacks.onChestInteract(closest.object);
        }
        break;

      case INTERACTION_TYPES.PROP:
        if (this.callbacks.onPropInteract) {
          this.callbacks.onPropInteract(closest.object);
        }
        break;

      case INTERACTION_TYPES.DUNGEON_ENTRANCE:
        if (this.callbacks.onDungeonEntranceInteract) {
          this.callbacks.onDungeonEntranceInteract(closest.object);
        }
        break;

      default:
        // Unknown interaction type
        break;
    }
  }

  /**
   * Get nearby interactables (for rendering prompts)
   */
  getNearbyInteractables() {
    return this.nearbyInteractables;
  }
}

/**
 * React hook for player interaction system
 */
export function usePlayerInteraction(player, {
  buildings = [],
  npcs = [],
  resources = [],
  chests = [],
  props = [], // Phase 3A: Harvestable props
  dungeonEntrances = [], // Dungeon entry points
  onBuildingInteract,
  onNPCInteract,
  onResourceInteract,
  onChestInteract,
  onPropInteract, // Phase 3A: Prop harvesting callback
  onDungeonEntranceInteract, // Dungeon entry callback
  enabled = true,
}) {
  const systemRef = useRef(null);
  const [nearbyInteractables, setNearbyInteractables] = useState([]);

  // Initialize system
  useEffect(() => {
    if (!player) return;

    systemRef.current = new PlayerInteractionSystem(player);
    systemRef.current.setCallbacks({
      onBuildingInteract,
      onNPCInteract,
      onResourceInteract,
      onChestInteract,
      onPropInteract,
      onDungeonEntranceInteract,
    });
  }, [player, onBuildingInteract, onNPCInteract, onResourceInteract, onChestInteract, onPropInteract, onDungeonEntranceInteract]);

  // Update nearby interactables
  useEffect(() => {
    if (!systemRef.current || !enabled) return;

    const intervalId = setInterval(() => {
      systemRef.current.updateNearbyInteractables(buildings, npcs, resources, chests, props, dungeonEntrances);
      setNearbyInteractables(systemRef.current.getNearbyInteractables());
    }, 100); // Update 10 times per second

    return () => clearInterval(intervalId);
  }, [player, buildings, npcs, resources, chests, props, dungeonEntrances, enabled]);

  // Handle E key for interaction
  const handleInteract = useCallback((event) => {
    if (!enabled || !systemRef.current) return;

    // Don't interfere with text inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    if (event.key.toLowerCase() === 'e') {
      systemRef.current.interact();
    }
  }, [enabled]);

  // Add event listener for E key
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleInteract);

    return () => {
      window.removeEventListener('keydown', handleInteract);
    };
  }, [enabled, handleInteract]);

  return {
    nearbyInteractables,
    closestInteractable: nearbyInteractables.length > 0 ? systemRef.current?.getClosestInteractable() : null,
    canInteract: nearbyInteractables.length > 0,
  };
}

/**
 * Create an interaction system (non-React usage)
 */
export function createInteractionSystem(player) {
  return new PlayerInteractionSystem(player);
}
