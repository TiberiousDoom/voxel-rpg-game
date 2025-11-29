/**
 * EventBus - Central event system for decoupled communication between game systems
 *
 * Supports typed events with strong typing for event payloads.
 */

import type { Vector2, Vector2Int, TileLayer, Entity } from './types';

// ============================================================================
// Event Definitions
// ============================================================================

export interface GameEvents {
  // World Events
  'world:tileChanged': { position: Vector2Int; layer: TileLayer; oldTypeId: string | null; newTypeId: string | null };
  'world:regionLoaded': { regionId: string; position: Vector2Int };
  'world:regionUnloaded': { regionId: string };

  // Entity Events
  'entity:spawned': { entity: Entity };
  'entity:despawned': { entityId: string };
  'entity:moved': { entityId: string; from: Vector2; to: Vector2 };
  'entity:damaged': { entityId: string; amount: number; sourceId: string | null };
  'entity:healed': { entityId: string; amount: number };
  'entity:died': { entityId: string; killerId: string | null };

  // Player Events
  'player:moved': { position: Vector2 };
  'player:interacted': { targetId: string | null; position: Vector2Int };
  'player:inventoryChanged': { itemId: string; delta: number };

  // Input Events
  'input:actionPressed': { action: string };
  'input:actionReleased': { action: string };
  'input:mouseClicked': { button: number; position: Vector2; worldPosition: Vector2 };
  'input:mouseMoved': { position: Vector2; worldPosition: Vector2 };
  'input:gamepadConnected': { index: number; id: string };
  'input:gamepadDisconnected': { index: number; id: string };
  'input:leftStickMoved': { x: number; y: number };
  'input:rightStickMoved': { x: number; y: number };

  // Time Events
  'time:hourChanged': { hour: number; day: number };
  'time:dayChanged': { day: number };
  'time:paused': Record<string, never>;
  'time:resumed': Record<string, never>;

  // UI Events
  'ui:panelOpened': { panel: string };
  'ui:panelClosed': { panel: string };
  'ui:tooltipShow': { content: string; position: Vector2 };
  'ui:tooltipHide': Record<string, never>;

  // Save Events
  'save:started': { slot: string };
  'save:completed': { slot: string };
  'save:failed': { slot: string; error: string };
  'load:started': { slot: string };
  'load:completed': { slot: string };
  'load:failed': { slot: string; error: string };

  // Game State Events
  'game:started': Record<string, never>;
  'game:paused': Record<string, never>;
  'game:resumed': Record<string, never>;
  'game:quit': Record<string, never>;
}

// ============================================================================
// Event Handler Types
// ============================================================================

type EventHandler<T> = (payload: T) => void;
type UnsubscribeFn = () => void;

interface EventSubscription<K extends keyof GameEvents> {
  handler: EventHandler<GameEvents[K]>;
  once: boolean;
  priority: number;
}

// ============================================================================
// EventBus Implementation
// ============================================================================

export class EventBus {
  private static instance: EventBus | null = null;
  private subscribers: Map<keyof GameEvents, EventSubscription<keyof GameEvents>[]> = new Map();
  private eventQueue: Array<{ event: keyof GameEvents; payload: GameEvents[keyof GameEvents] }> = [];
  private isProcessing = false;

  private constructor() {}

  /**
   * Get the singleton EventBus instance
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Reset the EventBus (useful for testing)
   */
  public static reset(): void {
    if (EventBus.instance) {
      EventBus.instance.subscribers.clear();
      EventBus.instance.eventQueue = [];
      EventBus.instance.isProcessing = false;
    }
    EventBus.instance = null;
  }

  /**
   * Subscribe to an event
   * @param event - The event type to subscribe to
   * @param handler - The callback function to invoke
   * @param priority - Higher priority handlers are called first (default: 0)
   * @returns Unsubscribe function
   */
  public on<K extends keyof GameEvents>(
    event: K,
    handler: EventHandler<GameEvents[K]>,
    priority = 0
  ): UnsubscribeFn {
    return this.subscribe(event, handler, false, priority);
  }

  /**
   * Subscribe to an event, automatically unsubscribing after first invocation
   * @param event - The event type to subscribe to
   * @param handler - The callback function to invoke
   * @param priority - Higher priority handlers are called first (default: 0)
   * @returns Unsubscribe function
   */
  public once<K extends keyof GameEvents>(
    event: K,
    handler: EventHandler<GameEvents[K]>,
    priority = 0
  ): UnsubscribeFn {
    return this.subscribe(event, handler, true, priority);
  }

  /**
   * Emit an event immediately
   * @param event - The event type to emit
   * @param payload - The event payload
   */
  public emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const subscribers = this.subscribers.get(event);
    if (!subscribers || subscribers.length === 0) {
      return;
    }

    // Sort by priority (higher first) and process
    const sortedSubscribers = [...subscribers].sort((a, b) => b.priority - a.priority);
    const toRemove: EventSubscription<K>[] = [];

    for (const subscription of sortedSubscribers) {
      try {
        (subscription.handler as EventHandler<GameEvents[K]>)(payload);
        if (subscription.once) {
          toRemove.push(subscription as EventSubscription<K>);
        }
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    }

    // Remove one-time handlers
    for (const sub of toRemove) {
      const index = subscribers.indexOf(sub as EventSubscription<keyof GameEvents>);
      if (index !== -1) {
        subscribers.splice(index, 1);
      }
    }
  }

  /**
   * Queue an event to be processed later (useful for deferring events)
   * @param event - The event type to queue
   * @param payload - The event payload
   */
  public queue<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    this.eventQueue.push({ event, payload: payload as GameEvents[keyof GameEvents] });
  }

  /**
   * Process all queued events
   */
  public processQueue(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const queued = this.eventQueue.shift();
      if (queued) {
        this.emit(queued.event, queued.payload as GameEvents[typeof queued.event]);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Remove all subscribers for a specific event
   * @param event - The event type to clear
   */
  public off<K extends keyof GameEvents>(event: K): void {
    this.subscribers.delete(event);
  }

  /**
   * Get the number of subscribers for an event
   * @param event - The event type to check
   */
  public subscriberCount<K extends keyof GameEvents>(event: K): number {
    return this.subscribers.get(event)?.length ?? 0;
  }

  private subscribe<K extends keyof GameEvents>(
    event: K,
    handler: EventHandler<GameEvents[K]>,
    once: boolean,
    priority: number
  ): UnsubscribeFn {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }

    const subscription: EventSubscription<K> = { handler, once, priority };
    this.subscribers.get(event)!.push(subscription as EventSubscription<keyof GameEvents>);

    return () => {
      const subs = this.subscribers.get(event);
      if (subs) {
        const index = subs.indexOf(subscription as EventSubscription<keyof GameEvents>);
        if (index !== -1) {
          subs.splice(index, 1);
        }
      }
    };
  }
}

// Export singleton getter for convenience
export const getEventBus = (): EventBus => EventBus.getInstance();
