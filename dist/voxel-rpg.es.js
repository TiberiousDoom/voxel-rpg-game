var T = /* @__PURE__ */ ((o) => (o.North = "N", o.South = "S", o.East = "E", o.West = "W", o.NorthEast = "NE", o.NorthWest = "NW", o.SouthEast = "SE", o.SouthWest = "SW", o))(T || {}), se = /* @__PURE__ */ ((o) => (o.Player = "player", o.NPC = "npc", o.Monster = "monster", o.Item = "item", o.Projectile = "projectile", o))(se || {}), m = /* @__PURE__ */ ((o) => (o[o.Background = 0] = "Background", o[o.Ground = 1] = "Ground", o[o.Objects = 2] = "Objects", o[o.Walls = 3] = "Walls", o[o.Foreground = 4] = "Foreground", o))(m || {}), oe = /* @__PURE__ */ ((o) => (o.MoveUp = "moveUp", o.MoveDown = "moveDown", o.MoveLeft = "moveLeft", o.MoveRight = "moveRight", o.Sprint = "sprint", o.Interact = "interact", o.Attack = "attack", o.Secondary = "secondary", o.Cancel = "cancel", o.Inventory = "inventory", o.BuildMenu = "buildMenu", o.Pause = "pause", o.ZoomIn = "zoomIn", o.ZoomOut = "zoomOut", o.QuickSlot1 = "quickSlot1", o.QuickSlot2 = "quickSlot2", o.QuickSlot3 = "quickSlot3", o.QuickSlot4 = "quickSlot4", o.QuickSlot5 = "quickSlot5", o.QuickSlot6 = "quickSlot6", o.QuickSlot7 = "quickSlot7", o.QuickSlot8 = "quickSlot8", o.QuickSlot9 = "quickSlot9", o))(oe || {}), S = /* @__PURE__ */ ((o) => (o[o.A = 0] = "A", o[o.B = 1] = "B", o[o.X = 2] = "X", o[o.Y = 3] = "Y", o[o.LeftBumper = 4] = "LeftBumper", o[o.RightBumper = 5] = "RightBumper", o[o.LeftTrigger = 6] = "LeftTrigger", o[o.RightTrigger = 7] = "RightTrigger", o[o.Select = 8] = "Select", o[o.Start = 9] = "Start", o[o.LeftStick = 10] = "LeftStick", o[o.RightStick = 11] = "RightStick", o[o.DPadUp = 12] = "DPadUp", o[o.DPadDown = 13] = "DPadDown", o[o.DPadLeft = 14] = "DPadLeft", o[o.DPadRight = 15] = "DPadRight", o[o.Home = 16] = "Home", o))(S || {}), _ = /* @__PURE__ */ ((o) => (o[o.LeftStickX = 0] = "LeftStickX", o[o.LeftStickY = 1] = "LeftStickY", o[o.RightStickX = 2] = "RightStickX", o[o.RightStickY = 3] = "RightStickY", o))(_ || {}), J = /* @__PURE__ */ ((o) => (o.HUD = "hud", o.Inventory = "inventory", o.Build = "build", o.NPC = "npc", o.Settings = "settings", o.Pause = "pause", o))(J || {});
class k {
  static instance = null;
  subscribers = /* @__PURE__ */ new Map();
  eventQueue = [];
  isProcessing = !1;
  constructor() {
  }
  /**
   * Get the singleton EventBus instance
   */
  static getInstance() {
    return k.instance || (k.instance = new k()), k.instance;
  }
  /**
   * Reset the EventBus (useful for testing)
   */
  static reset() {
    k.instance && (k.instance.subscribers.clear(), k.instance.eventQueue = [], k.instance.isProcessing = !1), k.instance = null;
  }
  /**
   * Subscribe to an event
   * @param event - The event type to subscribe to
   * @param handler - The callback function to invoke
   * @param priority - Higher priority handlers are called first (default: 0)
   * @returns Unsubscribe function
   */
  on(e, t, i = 0) {
    return this.subscribe(e, t, !1, i);
  }
  /**
   * Subscribe to an event, automatically unsubscribing after first invocation
   * @param event - The event type to subscribe to
   * @param handler - The callback function to invoke
   * @param priority - Higher priority handlers are called first (default: 0)
   * @returns Unsubscribe function
   */
  once(e, t, i = 0) {
    return this.subscribe(e, t, !0, i);
  }
  /**
   * Emit an event immediately
   * @param event - The event type to emit
   * @param payload - The event payload
   */
  emit(e, t) {
    const i = this.subscribers.get(e);
    if (!i || i.length === 0)
      return;
    const s = [...i].sort((a, r) => r.priority - a.priority), n = [];
    for (const a of s)
      try {
        a.handler(t), a.once && n.push(a);
      } catch (r) {
        console.error(`Error in event handler for "${e}":`, r);
      }
    for (const a of n) {
      const r = i.indexOf(a);
      r !== -1 && i.splice(r, 1);
    }
  }
  /**
   * Queue an event to be processed later (useful for deferring events)
   * @param event - The event type to queue
   * @param payload - The event payload
   */
  queue(e, t) {
    this.eventQueue.push({ event: e, payload: t });
  }
  /**
   * Process all queued events
   */
  processQueue() {
    if (!this.isProcessing) {
      for (this.isProcessing = !0; this.eventQueue.length > 0; ) {
        const e = this.eventQueue.shift();
        e && this.emit(e.event, e.payload);
      }
      this.isProcessing = !1;
    }
  }
  /**
   * Remove all subscribers for a specific event
   * @param event - The event type to clear
   */
  off(e) {
    this.subscribers.delete(e);
  }
  /**
   * Get the number of subscribers for an event
   * @param event - The event type to check
   */
  subscriberCount(e) {
    return this.subscribers.get(e)?.length ?? 0;
  }
  subscribe(e, t, i, s) {
    this.subscribers.has(e) || this.subscribers.set(e, []);
    const n = { handler: t, once: i, priority: s };
    return this.subscribers.get(e).push(n), () => {
      const a = this.subscribers.get(e);
      if (a) {
        const r = a.indexOf(n);
        r !== -1 && a.splice(r, 1);
      }
    };
  }
}
const h = () => k.getInstance(), ne = {
  tileSize: 32,
  regionSize: 64,
  loadDistance: 2,
  unloadDistance: 3,
  dayLengthSeconds: 600
  // 10 real minutes = 1 game day
};
class M {
  static instance = null;
  config;
  systems = /* @__PURE__ */ new Map();
  systemOrder = [];
  eventBus;
  isRunning = !1;
  isPaused = !1;
  lastFrameTime = 0;
  accumulatedTime = 0;
  fixedTimeStep = 1 / 60;
  // 60 Hz fixed update
  gameTime = {
    totalSeconds: 0,
    deltaTime: 0,
    gameHour: 6,
    // Start at 6 AM
    gameDay: 1,
    isPaused: !1
  };
  animationFrameId = null;
  constructor(e = {}) {
    this.config = { ...ne, ...e }, this.eventBus = h();
  }
  /**
   * Get the singleton GameEngine instance
   */
  static getInstance(e) {
    return M.instance || (M.instance = new M(e)), M.instance;
  }
  /**
   * Reset the GameEngine (useful for testing)
   */
  static reset() {
    M.instance && (M.instance.stop(), M.instance.systems.clear(), M.instance.systemOrder = []), M.instance = null, k.reset();
  }
  /**
   * Get the game configuration
   */
  getConfig() {
    return this.config;
  }
  /**
   * Get the current game time
   */
  getGameTime() {
    return this.gameTime;
  }
  /**
   * Register a game system
   * @param system - The system to register
   * @param order - Optional order index (lower = earlier in update loop)
   */
  registerSystem(e, t) {
    if (this.systems.has(e.name)) {
      console.warn(`System "${e.name}" is already registered. Skipping.`);
      return;
    }
    this.systems.set(e.name, e), t !== void 0 ? this.systemOrder.splice(t, 0, e.name) : this.systemOrder.push(e.name);
  }
  /**
   * Unregister a game system
   * @param name - The name of the system to unregister
   */
  unregisterSystem(e) {
    const t = this.systems.get(e);
    t && (t.destroy?.(), this.systems.delete(e), this.systemOrder = this.systemOrder.filter((i) => i !== e));
  }
  /**
   * Get a registered system by name
   */
  getSystem(e) {
    return this.systems.get(e);
  }
  /**
   * Initialize all registered systems
   */
  async initialize() {
    console.log("[GameEngine] Initializing systems...");
    for (const e of this.systemOrder) {
      const t = this.systems.get(e);
      t?.initialize && (console.log(`[GameEngine] Initializing ${e}...`), await t.initialize());
    }
    console.log("[GameEngine] All systems initialized.");
  }
  /**
   * Start the game loop
   */
  start() {
    if (this.isRunning) {
      console.warn("[GameEngine] Game loop is already running.");
      return;
    }
    console.log("[GameEngine] Starting game loop..."), this.isRunning = !0, this.lastFrameTime = performance.now(), this.eventBus.emit("game:started", {}), this.loop();
  }
  /**
   * Stop the game loop
   */
  stop() {
    this.isRunning && (console.log("[GameEngine] Stopping game loop..."), this.isRunning = !1, this.animationFrameId !== null && (cancelAnimationFrame(this.animationFrameId), this.animationFrameId = null), this.eventBus.emit("game:quit", {}));
  }
  /**
   * Pause the game
   */
  pause() {
    this.isPaused || (this.isPaused = !0, this.gameTime.isPaused = !0, this.eventBus.emit("game:paused", {}), this.eventBus.emit("time:paused", {}));
  }
  /**
   * Resume the game
   */
  resume() {
    this.isPaused && (this.isPaused = !1, this.gameTime.isPaused = !1, this.lastFrameTime = performance.now(), this.eventBus.emit("game:resumed", {}), this.eventBus.emit("time:resumed", {}));
  }
  /**
   * Toggle pause state
   */
  togglePause() {
    this.isPaused ? this.resume() : this.pause();
  }
  /**
   * Check if the game is currently running
   */
  isGameRunning() {
    return this.isRunning;
  }
  /**
   * Check if the game is currently paused
   */
  isGamePaused() {
    return this.isPaused;
  }
  /**
   * Main game loop
   */
  loop = () => {
    if (!this.isRunning) return;
    const e = performance.now(), t = Math.min((e - this.lastFrameTime) / 1e3, 0.1);
    if (this.lastFrameTime = e, this.gameTime.deltaTime = t, !this.isPaused) {
      for (this.gameTime.totalSeconds += t, this.updateGameClock(t), this.eventBus.processQueue(), this.accumulatedTime += t; this.accumulatedTime >= this.fixedTimeStep; )
        this.fixedUpdate(this.fixedTimeStep), this.accumulatedTime -= this.fixedTimeStep;
      this.update(t), this.lateUpdate(t);
    }
    this.animationFrameId = requestAnimationFrame(this.loop);
  };
  /**
   * Update game clock (day/night cycle)
   */
  updateGameClock(e) {
    const t = this.config.dayLengthSeconds / 24, i = e / t, s = Math.floor(this.gameTime.gameHour);
    this.gameTime.gameHour += i;
    const n = Math.floor(this.gameTime.gameHour);
    n !== s && n < 24 && this.eventBus.emit("time:hourChanged", {
      hour: n,
      day: this.gameTime.gameDay
    }), this.gameTime.gameHour >= 24 && (this.gameTime.gameHour -= 24, this.gameTime.gameDay += 1, this.eventBus.emit("time:dayChanged", { day: this.gameTime.gameDay }), this.eventBus.emit("time:hourChanged", {
      hour: Math.floor(this.gameTime.gameHour),
      day: this.gameTime.gameDay
    }));
  }
  /**
   * Fixed timestep update (for physics, etc.)
   */
  fixedUpdate(e) {
    for (const t of this.systemOrder)
      this.systems.get(t)?.fixedUpdate?.(e, this.gameTime);
  }
  /**
   * Variable timestep update
   */
  update(e) {
    for (const t of this.systemOrder)
      this.systems.get(t)?.update?.(e, this.gameTime);
  }
  /**
   * Late update (after all systems have updated)
   */
  lateUpdate(e) {
    for (const t of this.systemOrder)
      this.systems.get(t)?.lateUpdate?.(e, this.gameTime);
  }
}
const ae = (o) => M.getInstance(o), p = (o, e, t, i = {}) => ({
  id: o,
  name: e,
  layer: t,
  walkable: i.walkable ?? !0,
  hardness: i.hardness ?? 1,
  transparent: i.transparent ?? !0,
  drops: i.drops ?? [],
  autotileGroup: i.autotileGroup ?? null,
  buildRequirements: i.buildRequirements ?? []
});
class R {
  static instance = null;
  tiles = /* @__PURE__ */ new Map();
  constructor() {
    this.registerDefaultTiles();
  }
  /**
   * Get the singleton TileRegistry instance
   */
  static getInstance() {
    return R.instance || (R.instance = new R()), R.instance;
  }
  /**
   * Reset the registry (useful for testing)
   */
  static reset() {
    R.instance = null;
  }
  /**
   * Register a new tile type
   */
  register(e) {
    this.tiles.has(e.id) && console.warn(`Tile type "${e.id}" is already registered. Overwriting.`), this.tiles.set(e.id, e);
  }
  /**
   * Get a tile type by ID
   */
  get(e) {
    return this.tiles.get(e);
  }
  /**
   * Check if a tile type exists
   */
  has(e) {
    return this.tiles.has(e);
  }
  /**
   * Get all tile types
   */
  getAll() {
    return Array.from(this.tiles.values());
  }
  /**
   * Get all tile types in a specific layer
   */
  getByLayer(e) {
    return this.getAll().filter((t) => t.layer === e);
  }
  /**
   * Get all tile types in an autotile group
   */
  getByAutotileGroup(e) {
    return this.getAll().filter((t) => t.autotileGroup === e);
  }
  /**
   * Register default tile types for the game
   * Per 2D_GAME_IMPLEMENTATION_PLAN.md - 5 Layer Standard:
   * - Layer 0 (Background): Decorative, no collision
   * - Layer 1 (Ground): Terrain, floors
   * - Layer 2 (Objects): Furniture, resources, items
   * - Layer 3 (Walls): Structures, barriers
   * - Layer 4 (Foreground): Visual overlays, roofs
   */
  registerDefaultTiles() {
    this.register(p("grass", "Grass", m.Ground, {
      autotileGroup: "grass",
      drops: [{ resourceId: "fiber", minAmount: 0, maxAmount: 1, chance: 0.1 }]
    })), this.register(p("dirt", "Dirt", m.Ground, {
      autotileGroup: "dirt",
      hardness: 0.8
    })), this.register(p("sand", "Sand", m.Ground, {
      autotileGroup: "sand",
      hardness: 0.5
    })), this.register(p("water", "Water", m.Ground, {
      walkable: !1,
      autotileGroup: "water",
      hardness: -1
      // Unbreakable
    })), this.register(p("deep_water", "Deep Water", m.Ground, {
      walkable: !1,
      autotileGroup: "water",
      hardness: -1
    })), this.register(p("stone_floor", "Stone Floor", m.Ground, {
      autotileGroup: "stone",
      hardness: 2,
      drops: [{ resourceId: "stone", minAmount: 1, maxAmount: 2, chance: 0.5 }]
    })), this.register(p("wooden_floor", "Wooden Floor", m.Ground, {
      autotileGroup: "wood_floor",
      hardness: 1,
      buildRequirements: [{ resourceId: "wood", amount: 2 }],
      drops: [{ resourceId: "wood", minAmount: 1, maxAmount: 2, chance: 0.8 }]
    })), this.register(p("stone_path", "Stone Path", m.Ground, {
      autotileGroup: "stone_path",
      hardness: 1.5,
      buildRequirements: [{ resourceId: "stone", amount: 2 }],
      drops: [{ resourceId: "stone", minAmount: 1, maxAmount: 2, chance: 0.8 }]
    })), this.register(p("tree", "Tree", m.Objects, {
      walkable: !1,
      hardness: 3,
      drops: [
        { resourceId: "wood", minAmount: 3, maxAmount: 6, chance: 1 },
        { resourceId: "stick", minAmount: 1, maxAmount: 3, chance: 0.5 }
      ]
    })), this.register(p("rock", "Rock", m.Objects, {
      walkable: !1,
      hardness: 4,
      drops: [
        { resourceId: "stone", minAmount: 2, maxAmount: 5, chance: 1 },
        { resourceId: "flint", minAmount: 0, maxAmount: 1, chance: 0.2 }
      ]
    })), this.register(p("iron_ore", "Iron Ore", m.Objects, {
      walkable: !1,
      hardness: 5,
      drops: [
        { resourceId: "iron_ore", minAmount: 1, maxAmount: 3, chance: 1 },
        { resourceId: "stone", minAmount: 1, maxAmount: 2, chance: 0.5 }
      ]
    })), this.register(p("bush", "Bush", m.Objects, {
      walkable: !0,
      hardness: 0.5,
      drops: [
        { resourceId: "fiber", minAmount: 1, maxAmount: 2, chance: 0.8 },
        { resourceId: "berries", minAmount: 0, maxAmount: 2, chance: 0.3 }
      ]
    })), this.register(p("chest", "Chest", m.Objects, {
      walkable: !1,
      hardness: 1,
      buildRequirements: [{ resourceId: "wood", amount: 15 }]
    })), this.register(p("workbench", "Workbench", m.Objects, {
      walkable: !1,
      hardness: 1.5,
      buildRequirements: [{ resourceId: "wood", amount: 20 }]
    })), this.register(p("campfire", "Campfire", m.Objects, {
      walkable: !1,
      hardness: 1,
      buildRequirements: [
        { resourceId: "wood", amount: 5 },
        { resourceId: "stone", amount: 3 }
      ]
    })), this.register(p("bed", "Bed", m.Objects, {
      walkable: !1,
      hardness: 1,
      buildRequirements: [
        { resourceId: "wood", amount: 10 },
        { resourceId: "fiber", amount: 5 }
      ]
    })), this.register(p("wooden_wall", "Wooden Wall", m.Walls, {
      walkable: !1,
      transparent: !1,
      autotileGroup: "wood_wall",
      hardness: 2,
      buildRequirements: [{ resourceId: "wood", amount: 5 }],
      drops: [{ resourceId: "wood", minAmount: 2, maxAmount: 4, chance: 0.9 }]
    })), this.register(p("stone_wall", "Stone Wall", m.Walls, {
      walkable: !1,
      transparent: !1,
      autotileGroup: "stone_wall",
      hardness: 4,
      buildRequirements: [{ resourceId: "stone", amount: 8 }],
      drops: [{ resourceId: "stone", minAmount: 3, maxAmount: 6, chance: 0.9 }]
    })), this.register(p("roof_wood", "Wooden Roof", m.Foreground, {
      walkable: !0,
      // Player walks under it
      transparent: !1,
      autotileGroup: "roof_wood",
      hardness: 1,
      buildRequirements: [{ resourceId: "wood", amount: 3 }]
    }));
  }
}
const W = () => R.getInstance(), B = 4, z = (o, e, t) => `${o},${e},${t}`;
class re {
  name = "TilemapManager";
  tiles = /* @__PURE__ */ new Map();
  tileRegistry;
  pendingChanges = [];
  changeHistory = [];
  maxHistorySize = 1e3;
  constructor() {
    this.tileRegistry = W();
  }
  /**
   * Initialize the tilemap manager
   */
  initialize() {
    console.log("[TilemapManager] Initialized");
  }
  /**
   * Update - processes pending changes
   */
  update(e, t) {
    this.processPendingChanges();
  }
  /**
   * Set a tile at a position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @param typeId - Tile type ID
   * @param variant - Autotile variant (default: 0)
   * @returns true if tile was set successfully
   */
  setTile(e, t, i, s, n = 0) {
    if (!this.tileRegistry.get(s))
      return console.warn(`[TilemapManager] Unknown tile type: ${s}`), !1;
    const r = z(e, t, i), u = this.tiles.get(r)?.typeId ?? null, l = {
      typeId: s,
      layer: i,
      position: { x: e, y: t },
      variant: n
    };
    return this.tiles.set(r, l), this.pendingChanges.push({
      position: { x: e, y: t },
      layer: i,
      oldTypeId: u,
      newTypeId: s,
      timestamp: Date.now()
    }), !0;
  }
  /**
   * Remove a tile at a position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @returns The removed tile, or null if no tile existed
   */
  removeTile(e, t, i) {
    const s = z(e, t, i), n = this.tiles.get(s);
    return n ? (this.tiles.delete(s), this.pendingChanges.push({
      position: { x: e, y: t },
      layer: i,
      oldTypeId: n.typeId,
      newTypeId: null,
      timestamp: Date.now()
    }), n) : null;
  }
  /**
   * Get a tile at a position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @returns The tile, or undefined if no tile exists
   */
  getTile(e, t, i) {
    return this.tiles.get(z(e, t, i));
  }
  /**
   * Get the tile type at a position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @returns The tile type, or undefined if no tile exists
   */
  getTileType(e, t, i) {
    const s = this.getTile(e, t, i);
    return s ? this.tileRegistry.get(s.typeId) : void 0;
  }
  /**
   * Check if a position has a tile in any layer
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns true if any tile exists at this position
   */
  hasTile(e, t) {
    for (let i = 0; i <= B; i++)
      if (this.tiles.has(z(e, t, i)))
        return !0;
    return !1;
  }
  /**
   * Check if a position is walkable
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns true if the position can be walked on
   */
  isWalkable(e, t) {
    for (let n = 0; n <= B; n++) {
      const a = this.getTile(e, t, n);
      if (a) {
        const r = this.tileRegistry.get(a.typeId);
        if (r && !r.walkable)
          return !1;
      }
    }
    const i = this.getTile(e, t, m.Ground);
    return i ? this.tileRegistry.get(i.typeId)?.walkable ?? !1 : !1;
  }
  /**
   * Check if a position is transparent (for light/vision)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns true if light can pass through
   */
  isTransparent(e, t) {
    for (let i = 0; i <= B; i++) {
      const s = this.getTile(e, t, i);
      if (s) {
        const n = this.tileRegistry.get(s.typeId);
        if (n && !n.transparent)
          return !1;
      }
    }
    return !0;
  }
  /**
   * Get all tiles in a rectangular region
   * @param bounds - The region bounds
   * @param layer - Optional specific layer (all layers if not specified)
   * @returns Array of tiles in the region
   */
  getTilesInRegion(e, t) {
    const i = [];
    for (let s = e.x; s < e.x + e.width; s++)
      for (let n = e.y; n < e.y + e.height; n++)
        if (t !== void 0) {
          const a = this.getTile(s, n, t);
          a && i.push(a);
        } else
          for (let a = 0; a <= B; a++) {
            const r = this.getTile(s, n, a);
            r && i.push(r);
          }
    return i;
  }
  /**
   * Get all tiles at a position (all layers)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Array of tiles at this position
   */
  getTilesAt(e, t) {
    const i = [];
    for (let s = 0; s <= B; s++) {
      const n = this.getTile(e, t, s);
      n && i.push(n);
    }
    return i;
  }
  /**
   * Get neighboring tiles (4-connected)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @returns Object with north, south, east, west tiles
   */
  getNeighbors4(e, t, i) {
    return {
      north: this.getTile(e, t - 1, i),
      south: this.getTile(e, t + 1, i),
      east: this.getTile(e + 1, t, i),
      west: this.getTile(e - 1, t, i)
    };
  }
  /**
   * Get neighboring tiles (8-connected)
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param layer - Tile layer
   * @returns Object with all 8 neighboring tiles
   */
  getNeighbors8(e, t, i) {
    return {
      north: this.getTile(e, t - 1, i),
      south: this.getTile(e, t + 1, i),
      east: this.getTile(e + 1, t, i),
      west: this.getTile(e - 1, t, i),
      northEast: this.getTile(e + 1, t - 1, i),
      northWest: this.getTile(e - 1, t - 1, i),
      southEast: this.getTile(e + 1, t + 1, i),
      southWest: this.getTile(e - 1, t + 1, i)
    };
  }
  /**
   * Clear all tiles
   */
  clear() {
    this.tiles.clear(), this.pendingChanges = [];
  }
  /**
   * Get total tile count
   */
  getTileCount() {
    return this.tiles.size;
  }
  /**
   * Get tile count by layer
   */
  getTileCountByLayer(e) {
    let t = 0;
    for (const i of this.tiles.keys())
      i.endsWith(`,${e}`) && t++;
    return t;
  }
  /**
   * Get change history
   */
  getChangeHistory() {
    return this.changeHistory;
  }
  /**
   * Serialize tilemap state for saving
   */
  serialize() {
    const e = [];
    for (const t of this.tiles.values())
      e.push({
        position: t.position,
        layer: t.layer,
        typeId: t.typeId,
        variant: t.variant
      });
    return e;
  }
  /**
   * Deserialize tilemap state from save data
   */
  deserialize(e) {
    this.clear();
    for (const t of e)
      this.setTile(
        t.position.x,
        t.position.y,
        t.layer,
        t.typeId,
        t.variant ?? 0
      );
    this.pendingChanges = [];
  }
  /**
   * Process pending tile changes and emit events
   */
  processPendingChanges() {
    const e = h();
    for (const t of this.pendingChanges)
      e.emit("world:tileChanged", {
        position: t.position,
        layer: t.layer,
        oldTypeId: t.oldTypeId,
        newTypeId: t.newTypeId
      }), this.changeHistory.push(t), this.changeHistory.length > this.maxHistorySize && this.changeHistory.shift();
    this.pendingChanges = [];
  }
  /**
   * Cleanup
   */
  destroy() {
    this.clear(), console.log("[TilemapManager] Destroyed");
  }
}
var ce = /* @__PURE__ */ ((o) => (o[o.North = 1] = "North", o[o.East = 2] = "East", o[o.South = 4] = "South", o[o.West = 8] = "West", o))(ce || {}), ue = /* @__PURE__ */ ((o) => (o[o.NorthWest = 1] = "NorthWest", o[o.North = 2] = "North", o[o.NorthEast = 4] = "NorthEast", o[o.West = 8] = "West", o[o.East = 16] = "East", o[o.SouthWest = 32] = "SouthWest", o[o.South = 64] = "South", o[o.SouthEast = 128] = "SouthEast", o))(ue || {});
const le = {
  0: 0,
  // No neighbors
  1: 1,
  // North only
  2: 2,
  // East only
  3: 3,
  // North + East
  4: 4,
  // South only
  5: 5,
  // North + South
  6: 6,
  // East + South
  7: 7,
  // North + East + South
  8: 8,
  // West only
  9: 9,
  // North + West
  10: 10,
  // East + West
  11: 11,
  // North + East + West
  12: 12,
  // South + West
  13: 13,
  // North + South + West
  14: 14,
  // East + South + West
  15: 15
  // All neighbors
}, de = /* @__PURE__ */ new Map([
  // ============ No edges (isolated) ============
  [0, 0],
  // ============ Single edge (4 end caps) ============
  [2, 1],
  [16, 2],
  [64, 3],
  [8, 4],
  // ============ Two opposite edges (2 straight pieces) ============
  [66, 5],
  [24, 6],
  // ============ Two adjacent edges - outer corners (4 patterns × 2 corner states = 8) ============
  // NE corner area
  [18, 7],
  [22, 8],
  // SE corner area
  [80, 9],
  [208, 10],
  // SW corner area
  [72, 11],
  [104, 12],
  // NW corner area
  [10, 13],
  [11, 14],
  // ============ Three edges - T junctions (4 patterns × 4 corner states = 16) ============
  // Missing West (has N, E, S - corners NE and SE matter)
  [82, 15],
  [86, 16],
  [210, 17],
  [214, 18],
  // Missing North (has E, S, W - corners SE and SW matter)
  [88, 19],
  [216, 20],
  [120, 21],
  [248, 22],
  // Missing East (has N, S, W - corners NW and SW matter)
  [74, 23],
  [75, 24],
  [106, 25],
  [107, 26],
  // Missing South (has N, E, W - corners NW and NE matter)
  [26, 27],
  [30, 28],
  [27, 29],
  [31, 30],
  // ============ Four edges - center pieces (16 corner combinations) ============
  // All 4 edges present, varying corners
  [90, 31],
  // 1 corner
  [94, 32],
  [218, 33],
  [122, 34],
  [91, 35],
  // 2 adjacent corners
  [222, 36],
  [250, 37],
  [123, 38],
  [95, 39],
  // 2 opposite corners
  [126, 40],
  [219, 41],
  // 3 corners
  [254, 42],
  [251, 43],
  [127, 44],
  [223, 45],
  // 4 corners (fully surrounded)
  [255, 46]
]);
function he(o) {
  let e = o;
  return o & 1 && !(o & 2 && o & 8) && (e &= -2), o & 4 && !(o & 2 && o & 16) && (e &= -5), o & 32 && !(o & 64 && o & 8) && (e &= -33), o & 128 && !(o & 64 && o & 16) && (e &= -129), e;
}
function ge(o) {
  const e = he(o);
  return de.get(e) ?? 0;
}
class me {
  name = "AutotileSystem";
  tilemapManager = null;
  pendingUpdates = /* @__PURE__ */ new Set();
  unsubscribe = null;
  /**
   * Initialize with a reference to the TilemapManager
   */
  initialize() {
    const e = h();
    this.unsubscribe = e.on("world:tileChanged", (t) => {
      this.onTileChanged(t);
    }), console.log("[AutotileSystem] Initialized");
  }
  /**
   * Set the tilemap manager reference
   */
  setTilemapManager(e) {
    this.tilemapManager = e;
  }
  /**
   * Update - processes pending autotile updates
   */
  update(e, t) {
    if (!(this.pendingUpdates.size === 0 || !this.tilemapManager)) {
      for (const i of this.pendingUpdates) {
        const [s, n, a] = i.split(",").map(Number);
        this.updateTileVariant(s, n, a);
      }
      this.pendingUpdates.clear();
    }
  }
  /**
   * Handle tile change events
   */
  onTileChanged(e) {
    const { position: t, layer: i } = e;
    this.queueUpdate(t.x, t.y, i), this.queueUpdate(t.x, t.y - 1, i), this.queueUpdate(t.x + 1, t.y, i), this.queueUpdate(t.x, t.y + 1, i), this.queueUpdate(t.x - 1, t.y, i), this.queueUpdate(t.x + 1, t.y - 1, i), this.queueUpdate(t.x - 1, t.y - 1, i), this.queueUpdate(t.x + 1, t.y + 1, i), this.queueUpdate(t.x - 1, t.y + 1, i);
  }
  /**
   * Queue a tile position for autotile update
   */
  queueUpdate(e, t, i) {
    this.pendingUpdates.add(`${e},${t},${i}`);
  }
  /**
   * Update the variant for a single tile
   */
  updateTileVariant(e, t, i) {
    if (!this.tilemapManager) return;
    const s = this.tilemapManager.getTile(e, t, i);
    if (!s) return;
    const a = W().get(s.typeId);
    if (!a || !a.autotileGroup) return;
    const r = this.calculateVariant(e, t, i, a.autotileGroup);
    s.variant !== r && (s.variant = r);
  }
  /**
   * Calculate the autotile variant for a position
   */
  calculateVariant(e, t, i, s) {
    if (!this.tilemapManager) return 0;
    const n = W(), a = (c, u) => {
      const l = this.tilemapManager.getTile(c, u, i);
      return l ? n.get(l.typeId)?.autotileGroup === s : !1;
    };
    let r = 0;
    return a(e, t - 1) && (r |= 1), a(e + 1, t) && (r |= 2), a(e, t + 1) && (r |= 4), a(e - 1, t) && (r |= 8), le[r] ?? 0;
  }
  /**
   * Calculate 8-bit variant for terrain transitions
   */
  calculateVariant8Bit(e, t, i, s) {
    if (!this.tilemapManager) return 0;
    const n = W(), a = (c, u) => {
      const l = this.tilemapManager.getTile(c, u, i);
      return l ? n.get(l.typeId)?.autotileGroup === s : !1;
    };
    let r = 0;
    return a(e - 1, t - 1) && (r |= 1), a(e, t - 1) && (r |= 2), a(e + 1, t - 1) && (r |= 4), a(e - 1, t) && (r |= 8), a(e + 1, t) && (r |= 16), a(e - 1, t + 1) && (r |= 32), a(e, t + 1) && (r |= 64), a(e + 1, t + 1) && (r |= 128), ge(r);
  }
  /**
   * Force update all tiles in a region
   */
  updateRegion(e, t, i, s, n) {
    for (let a = e; a < e + i; a++)
      for (let r = t; r < t + s; r++)
        this.queueUpdate(a, r, n);
  }
  /**
   * Cleanup
   */
  destroy() {
    this.unsubscribe && (this.unsubscribe(), this.unsubscribe = null), this.pendingUpdates.clear(), console.log("[AutotileSystem] Destroyed");
  }
}
const pe = {
  regionSize: 64,
  loadDistance: 2,
  unloadDistance: 3
};
class fe {
  name = "RegionManager";
  config;
  regions = /* @__PURE__ */ new Map();
  loadedRegions = /* @__PURE__ */ new Set();
  playerPosition = { x: 0, y: 0 };
  lastPlayerRegion = { x: 0, y: 0 };
  constructor(e = {}) {
    this.config = { ...pe, ...e };
  }
  /**
   * Initialize the region manager
   */
  initialize() {
    h().on("player:moved", (t) => {
      this.playerPosition = t.position;
    }), console.log("[RegionManager] Initialized with config:", this.config);
  }
  /**
   * Update - check if regions need to be loaded/unloaded
   */
  update(e, t) {
    const i = this.worldToRegion(this.playerPosition.x, this.playerPosition.y);
    (i.x !== this.lastPlayerRegion.x || i.y !== this.lastPlayerRegion.y) && (this.updateLoadedRegions(i), this.lastPlayerRegion = i);
  }
  /**
   * Convert world coordinates to region coordinates
   */
  worldToRegion(e, t) {
    return {
      x: Math.floor(e / this.config.regionSize),
      y: Math.floor(t / this.config.regionSize)
    };
  }
  /**
   * Convert region coordinates to world coordinates (top-left corner)
   */
  regionToWorld(e, t) {
    return {
      x: e * this.config.regionSize,
      y: t * this.config.regionSize
    };
  }
  /**
   * Get region ID from region coordinates
   */
  getRegionId(e, t) {
    return `${e},${t}`;
  }
  /**
   * Parse region ID to coordinates
   */
  parseRegionId(e) {
    const [t, i] = e.split(",").map(Number);
    return { x: t, y: i };
  }
  /**
   * Check if a region is currently loaded
   */
  isRegionLoaded(e, t) {
    return this.loadedRegions.has(this.getRegionId(e, t));
  }
  /**
   * Get a region by coordinates
   */
  getRegion(e, t) {
    return this.regions.get(this.getRegionId(e, t));
  }
  /**
   * Get or create a region
   */
  getOrCreateRegion(e, t) {
    const i = this.getRegionId(e, t);
    let s = this.regions.get(i);
    return s || (s = {
      id: i,
      position: { x: e, y: t },
      tiles: /* @__PURE__ */ new Map(),
      isLoaded: !1,
      lastAccessTime: Date.now()
    }, this.regions.set(i, s)), s;
  }
  /**
   * Load a region
   */
  loadRegion(e, t) {
    const i = this.getOrCreateRegion(e, t);
    return i.isLoaded || (i.isLoaded = !0, i.lastAccessTime = Date.now(), this.loadedRegions.add(i.id), h().emit("world:regionLoaded", {
      regionId: i.id,
      position: i.position
    }), console.log(`[RegionManager] Loaded region ${i.id}`)), i;
  }
  /**
   * Unload a region
   */
  unloadRegion(e, t) {
    const i = this.getRegionId(e, t), s = this.regions.get(i);
    s && s.isLoaded && (s.isLoaded = !1, this.loadedRegions.delete(i), h().emit("world:regionUnloaded", { regionId: i }), console.log(`[RegionManager] Unloaded region ${i}`));
  }
  /**
   * Update which regions are loaded based on player position
   */
  updateLoadedRegions(e) {
    const { loadDistance: t, unloadDistance: i } = this.config, s = /* @__PURE__ */ new Set();
    for (let n = -t; n <= t; n++)
      for (let a = -t; a <= t; a++) {
        const r = e.x + n, c = e.y + a;
        s.add(this.getRegionId(r, c));
      }
    for (const n of s)
      if (!this.loadedRegions.has(n)) {
        const { x: a, y: r } = this.parseRegionId(n);
        this.loadRegion(a, r);
      }
    for (const n of this.loadedRegions) {
      const { x: a, y: r } = this.parseRegionId(n), c = Math.abs(a - e.x), u = Math.abs(r - e.y);
      (c > i || u > i) && this.unloadRegion(a, r);
    }
  }
  /**
   * Get all currently loaded regions
   */
  getLoadedRegions() {
    const e = [];
    for (const t of this.loadedRegions) {
      const i = this.regions.get(t);
      i && e.push(i);
    }
    return e;
  }
  /**
   * Get the number of loaded regions
   */
  getLoadedRegionCount() {
    return this.loadedRegions.size;
  }
  /**
   * Set tile data in a region
   */
  setRegionTile(e, t, i, s) {
    const n = this.worldToRegion(e, t), a = this.getOrCreateRegion(n.x, n.y), r = e - n.x * this.config.regionSize, c = t - n.y * this.config.regionSize, u = `${r},${c},${i}`;
    a.tiles.set(u, s), a.lastAccessTime = Date.now();
  }
  /**
   * Get tile data from a region
   */
  getRegionTile(e, t, i) {
    const s = this.worldToRegion(e, t), n = this.regions.get(this.getRegionId(s.x, s.y));
    if (!n) return;
    const a = e - s.x * this.config.regionSize, r = t - s.y * this.config.regionSize, c = `${a},${r},${i}`;
    return n.lastAccessTime = Date.now(), n.tiles.get(c);
  }
  /**
   * Serialize a region for saving
   */
  serializeRegion(e, t) {
    const i = this.getRegion(e, t);
    if (!i) return null;
    const s = [];
    for (const [n, a] of i.tiles)
      s.push({ key: n, tile: a });
    return {
      id: i.id,
      position: i.position,
      tiles: s
    };
  }
  /**
   * Deserialize a region from save data
   */
  deserializeRegion(e) {
    const t = this.getOrCreateRegion(e.position.x, e.position.y);
    t.tiles.clear();
    for (const { key: i, tile: s } of e.tiles)
      t.tiles.set(i, s);
  }
  /**
   * Clear all regions
   */
  clear() {
    this.regions.clear(), this.loadedRegions.clear(), this.lastPlayerRegion = { x: 0, y: 0 };
  }
  /**
   * Get region size
   */
  getRegionSize() {
    return this.config.regionSize;
  }
  /**
   * Cleanup
   */
  destroy() {
    this.clear(), console.log("[RegionManager] Destroyed");
  }
}
const ye = {
  seed: 12345,
  octaves: 4,
  scale: 0.01,
  persistence: 0.5,
  lacunarity: 2
}, Se = {
  seed: 54321,
  octaves: 3,
  scale: 0.015,
  persistence: 0.5,
  lacunarity: 2
};
function Q(o) {
  const e = new Uint8Array(512), t = new Uint8Array(256);
  for (let s = 0; s < 256; s++)
    t[s] = s;
  let i = o;
  for (let s = 255; s > 0; s--) {
    i = i * 1103515245 + 12345 & 2147483647;
    const n = i % (s + 1);
    [t[s], t[n]] = [t[n], t[s]];
  }
  for (let s = 0; s < 256; s++)
    e[s] = t[s], e[s + 256] = t[s];
  return e;
}
const G = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1]
];
class ve {
  perm;
  seed;
  constructor(e = Date.now()) {
    this.seed = e, this.perm = Q(e);
  }
  /**
   * Get the seed used for this generator
   */
  getSeed() {
    return this.seed;
  }
  /**
   * Reseed the generator
   */
  reseed(e) {
    this.seed = e, this.perm = Q(e);
  }
  // ==========================================================================
  // Perlin Noise
  // ==========================================================================
  /**
   * 2D Perlin noise at a single point
   * Returns value in range [-1, 1]
   */
  perlin2D(e, t) {
    const i = Math.floor(e) & 255, s = Math.floor(t) & 255, n = e - Math.floor(e), a = t - Math.floor(t), r = this.fade(n), c = this.fade(a), u = this.perm[this.perm[i] + s], l = this.perm[this.perm[i] + s + 1], d = this.perm[this.perm[i + 1] + s], g = this.perm[this.perm[i + 1] + s + 1], f = this.grad2D(u, n, a), y = this.grad2D(d, n - 1, a), v = this.grad2D(l, n, a - 1), w = this.grad2D(g, n - 1, a - 1), b = this.lerp(f, y, r), I = this.lerp(v, w, r);
    return this.lerp(b, I, c);
  }
  /**
   * Fractal Brownian Motion using Perlin noise
   * Returns value in range [0, 1]
   */
  perlinFBM(e, t, i = {}) {
    const { octaves: s, scale: n, persistence: a, lacunarity: r } = {
      ...ye,
      ...i
    };
    let c = 0, u = 1, l = n, d = 0;
    for (let g = 0; g < s; g++)
      c += this.perlin2D(e * l, t * l) * u, d += u, u *= a, l *= r;
    return (c / d + 1) / 2;
  }
  // ==========================================================================
  // Simplex Noise
  // ==========================================================================
  /**
   * 2D Simplex noise at a single point
   * Returns value in range [-1, 1]
   */
  simplex2D(e, t) {
    const i = 0.5 * (Math.sqrt(3) - 1), s = (3 - Math.sqrt(3)) / 6, n = (e + t) * i, a = Math.floor(e + n), r = Math.floor(t + n), c = (a + r) * s, u = a - c, l = r - c, d = e - u, g = t - l;
    let f, y;
    d > g ? (f = 1, y = 0) : (f = 0, y = 1);
    const v = d - f + s, w = g - y + s, b = d - 1 + 2 * s, I = g - 1 + 2 * s, D = a & 255, L = r & 255, ee = this.perm[D + this.perm[L]] % 12, te = this.perm[D + f + this.perm[L + y]] % 12, ie = this.perm[D + 1 + this.perm[L + 1]] % 12;
    let j = 0, K = 0, X = 0, C = 0.5 - d * d - g * g;
    C >= 0 && (C *= C, j = C * C * this.dot2D(G[ee], d, g));
    let A = 0.5 - v * v - w * w;
    A >= 0 && (A *= A, K = A * A * this.dot2D(G[te], v, w));
    let P = 0.5 - b * b - I * I;
    return P >= 0 && (P *= P, X = P * P * this.dot2D(G[ie], b, I)), 70 * (j + K + X);
  }
  /**
   * Fractal Brownian Motion using Simplex noise
   * Returns value in range [0, 1]
   */
  simplexFBM(e, t, i = {}) {
    const { octaves: s, scale: n, persistence: a, lacunarity: r } = {
      ...Se,
      ...i
    };
    let c = 0, u = 1, l = n, d = 0;
    for (let g = 0; g < s; g++)
      c += this.simplex2D(e * l, t * l) * u, d += u, u *= a, l *= r;
    return (c / d + 1) / 2;
  }
  // ==========================================================================
  // Voronoi Noise (for biome regions)
  // ==========================================================================
  /**
   * 2D Voronoi noise (cellular noise)
   * Returns the distance to nearest cell point, normalized to [0, 1]
   */
  voronoi2D(e, t, i = 5e-3) {
    const s = e * i, n = t * i, a = Math.floor(s), r = Math.floor(n);
    let c = 10;
    for (let u = -1; u <= 1; u++)
      for (let l = -1; l <= 1; l++) {
        const d = a + u, g = r + l, f = this.perm[(d & 255) + this.perm[g & 255]], y = d + f / 256, v = g + f * 7 % 256 / 256, w = s - y, b = n - v, I = Math.sqrt(w * w + b * b);
        I < c && (c = I);
      }
    return Math.min(c / 1.5, 1);
  }
  /**
   * Get the cell ID for Voronoi (useful for biome assignment)
   * Returns a stable ID for the cell containing this point
   */
  voronoiCellId(e, t, i = 5e-3) {
    const s = e * i, n = t * i, a = Math.floor(s), r = Math.floor(n);
    let c = 10, u = 0;
    for (let l = -1; l <= 1; l++)
      for (let d = -1; d <= 1; d++) {
        const g = a + l, f = r + d, y = this.perm[(g & 255) + this.perm[f & 255]], v = g + y / 256, w = f + y * 7 % 256 / 256, b = s - v, I = n - w, D = Math.sqrt(b * b + I * I);
        D < c && (c = D, u = g * 73856093 ^ f * 19349663);
      }
    return Math.abs(u);
  }
  // ==========================================================================
  // Helper Functions
  // ==========================================================================
  fade(e) {
    return e * e * e * (e * (e * 6 - 15) + 10);
  }
  lerp(e, t, i) {
    return e + i * (t - e);
  }
  grad2D(e, t, i) {
    const s = e & 3, n = s < 2 ? t : i, a = s < 2 ? i : t;
    return (s & 1 ? -n : n) + (s & 2 ? -a : a);
  }
  dot2D(e, t, i) {
    return e[0] * t + e[1] * i;
  }
}
const x = {
  height: {
    octaves: 4,
    scale: 0.01,
    persistence: 0.5,
    lacunarity: 2
  },
  moisture: {
    octaves: 3,
    scale: 0.015,
    persistence: 0.5,
    lacunarity: 2
  },
  temperature: {
    octaves: 2,
    scale: 8e-3,
    persistence: 0.6,
    lacunarity: 2
  }
};
var V = /* @__PURE__ */ ((o) => (o.Ocean = "ocean", o.Beach = "beach", o.Desert = "desert", o.Plains = "plains", o.Forest = "forest", o.Swamp = "swamp", o.Mountains = "mountains", o.Snow = "snow", o.Tundra = "tundra", o.Jungle = "jungle", o))(V || {});
const Y = /* @__PURE__ */ new Map([
  ["ocean", {
    id: "ocean",
    name: "Ocean",
    color: "#1a5276",
    groundTile: "water_deep",
    decorationTiles: ["seaweed", "coral"],
    decorationDensity: 0.05,
    resourceTiles: ["fish_spot"],
    resourceDensity: 0.02,
    walkable: !1,
    buildable: !1,
    hostileSpawnRate: 0.5
  }],
  ["beach", {
    id: "beach",
    name: "Beach",
    color: "#f9e79f",
    groundTile: "sand",
    decorationTiles: ["palm_tree", "shell", "driftwood"],
    decorationDensity: 0.08,
    resourceTiles: ["coconut", "crab"],
    resourceDensity: 0.03,
    walkable: !0,
    buildable: !0,
    hostileSpawnRate: 0.2
  }],
  ["desert", {
    id: "desert",
    name: "Desert",
    color: "#f5b041",
    groundTile: "sand",
    decorationTiles: ["cactus", "dead_bush", "skull"],
    decorationDensity: 0.04,
    resourceTiles: ["iron_ore", "gold_ore"],
    resourceDensity: 0.02,
    walkable: !0,
    buildable: !0,
    hostileSpawnRate: 0.8
  }],
  ["plains", {
    id: "plains",
    name: "Plains",
    color: "#82e0aa",
    groundTile: "grass",
    decorationTiles: ["tall_grass", "flower_red", "flower_yellow", "small_rock"],
    decorationDensity: 0.15,
    resourceTiles: ["berry_bush", "fiber_plant"],
    resourceDensity: 0.05,
    walkable: !0,
    buildable: !0,
    hostileSpawnRate: 0.3
  }],
  ["forest", {
    id: "forest",
    name: "Forest",
    color: "#1e8449",
    groundTile: "grass",
    decorationTiles: ["tree_oak", "tree_birch", "bush", "mushroom", "fallen_log"],
    decorationDensity: 0.35,
    resourceTiles: ["wood_log", "berry_bush", "mushroom_edible", "herb"],
    resourceDensity: 0.08,
    walkable: !0,
    buildable: !0,
    hostileSpawnRate: 0.5
  }],
  ["swamp", {
    id: "swamp",
    name: "Swamp",
    color: "#6c7a32",
    groundTile: "mud",
    decorationTiles: ["dead_tree", "cattail", "lily_pad", "moss_rock"],
    decorationDensity: 0.25,
    resourceTiles: ["slime_mold", "swamp_herb", "clay"],
    resourceDensity: 0.06,
    walkable: !0,
    buildable: !1,
    hostileSpawnRate: 1
  }],
  ["mountains", {
    id: "mountains",
    name: "Mountains",
    color: "#7f8c8d",
    groundTile: "stone",
    decorationTiles: ["boulder", "pine_tree", "mountain_flower"],
    decorationDensity: 0.12,
    resourceTiles: ["iron_ore", "copper_ore", "coal", "crystal"],
    resourceDensity: 0.1,
    walkable: !0,
    buildable: !0,
    hostileSpawnRate: 0.6
  }],
  ["snow", {
    id: "snow",
    name: "Snow",
    color: "#ecf0f1",
    groundTile: "snow",
    decorationTiles: ["pine_tree_snowy", "ice_crystal", "snowman"],
    decorationDensity: 0.1,
    resourceTiles: ["ice", "frozen_herb"],
    resourceDensity: 0.03,
    walkable: !0,
    buildable: !0,
    hostileSpawnRate: 0.4
  }],
  ["tundra", {
    id: "tundra",
    name: "Tundra",
    color: "#bdc3c7",
    groundTile: "frozen_grass",
    decorationTiles: ["dead_bush", "small_rock", "lichen"],
    decorationDensity: 0.08,
    resourceTiles: ["fiber_plant", "flint"],
    resourceDensity: 0.04,
    walkable: !0,
    buildable: !0,
    hostileSpawnRate: 0.3
  }],
  ["jungle", {
    id: "jungle",
    name: "Jungle",
    color: "#145a32",
    groundTile: "jungle_grass",
    decorationTiles: ["jungle_tree", "giant_fern", "vine", "exotic_flower"],
    decorationDensity: 0.45,
    resourceTiles: ["tropical_fruit", "rare_herb", "bamboo"],
    resourceDensity: 0.1,
    walkable: !0,
    buildable: !1,
    hostileSpawnRate: 1.2
  }]
]), we = {
  heightOcean: 0.3,
  heightBeach: 0.35,
  heightMountain: 0.75,
  heightSnow: 0.85,
  moistureDry: 0.25,
  moistureMedium: 0.5,
  moistureWet: 0.75,
  temperatureCold: 0.3,
  temperatureHot: 0.7
};
class be {
  thresholds;
  constructor(e = {}) {
    this.thresholds = { ...we, ...e };
  }
  /**
   * Determine biome based on height, moisture, and temperature
   * @param height - Height value [0, 1] - 0 is lowest, 1 is highest
   * @param moisture - Moisture value [0, 1] - 0 is driest, 1 is wettest
   * @param temperature - Temperature value [0, 1] - 0 is coldest, 1 is hottest
   */
  determineBiome(e, t, i = 0.5) {
    const s = this.thresholds;
    return e < s.heightOcean ? "ocean" : e < s.heightBeach ? "beach" : e > s.heightSnow ? "snow" : e > s.heightMountain ? i < s.temperatureCold ? "snow" : "mountains" : i < s.temperatureCold ? t < s.moistureMedium ? "tundra" : "snow" : i > s.temperatureHot ? t < s.moistureDry ? "desert" : t > s.moistureWet ? "jungle" : "plains" : t < s.moistureDry ? "desert" : t < s.moistureMedium ? "plains" : t < s.moistureWet ? "forest" : "swamp";
  }
  /**
   * Get biome definition by type
   */
  getBiomeDefinition(e) {
    return Y.get(e);
  }
  /**
   * Get all biome definitions
   */
  getAllBiomes() {
    return Array.from(Y.values());
  }
  /**
   * Check if a biome is walkable
   */
  isWalkable(e) {
    return this.getBiomeDefinition(e).walkable;
  }
  /**
   * Check if a biome is buildable
   */
  isBuildable(e) {
    return this.getBiomeDefinition(e).buildable;
  }
  /**
   * Get ground tile for a biome
   */
  getGroundTile(e) {
    return this.getBiomeDefinition(e).groundTile;
  }
  /**
   * Get random decoration for a biome (or null based on density)
   */
  getRandomDecoration(e, t) {
    const i = this.getBiomeDefinition(e);
    if (t > i.decorationDensity || i.decorationTiles.length === 0)
      return null;
    const s = Math.floor(t * i.decorationTiles.length / i.decorationDensity);
    return i.decorationTiles[s % i.decorationTiles.length];
  }
  /**
   * Get random resource for a biome (or null based on density)
   */
  getRandomResource(e, t) {
    const i = this.getBiomeDefinition(e);
    if (t > i.resourceDensity || i.resourceTiles.length === 0)
      return null;
    const s = Math.floor(t * i.resourceTiles.length / i.resourceDensity);
    return i.resourceTiles[s % i.resourceTiles.length];
  }
  /**
   * Get spawn rate for hostile creatures in a biome
   */
  getHostileSpawnRate(e) {
    return this.getBiomeDefinition(e).hostileSpawnRate;
  }
}
let F = null;
function ke() {
  return F || (F = new be()), F;
}
const Ie = {
  seed: Date.now(),
  regionSize: 64,
  seaLevel: 0.35,
  temperatureLatitudeScale: 1e-3,
  spawnAreaSize: 32
};
class Me {
  config;
  noise;
  biomeManager;
  constructor(e = {}) {
    this.config = { ...Ie, ...e }, this.noise = new ve(this.config.seed), this.biomeManager = ke();
  }
  /**
   * Get the world seed
   */
  getSeed() {
    return this.config.seed;
  }
  /**
   * Generate a region at the specified region coordinates
   */
  generateRegion(e, t) {
    const i = performance.now(), s = [], n = /* @__PURE__ */ new Map(), { regionSize: a } = this.config, r = e * a, c = t * a;
    for (let l = 0; l < a; l++)
      for (let d = 0; d < a; d++) {
        const g = r + l, f = c + d, y = this.generateTile(g, f);
        if (s.push(...y), y.length > 0) {
          const v = y[0].biome;
          n.set(v, (n.get(v) ?? 0) + 1);
        }
      }
    const u = performance.now() - i;
    return {
      regionX: e,
      regionY: t,
      tiles: s,
      biomeDistribution: n,
      generationTimeMs: u
    };
  }
  /**
   * Generate tiles at a specific world coordinate
   * Returns tiles for all relevant layers
   */
  generateTile(e, t) {
    const i = [], s = this.noise.perlinFBM(e, t, x.height), n = this.noise.simplexFBM(e, t, x.moisture), a = this.getTemperature(e, t), r = this.biomeManager.determineBiome(s, n, a), c = this.biomeManager.getBiomeDefinition(r);
    i.push({
      x: e,
      y: t,
      layer: m.Ground,
      tileId: c.groundTile,
      biome: r
    });
    const u = this.noise.perlin2D(e * 0.5 + 1e3, t * 0.5) * 0.5 + 0.5, l = this.biomeManager.getRandomDecoration(r, u);
    l && i.push({
      x: e,
      y: t,
      layer: m.Objects,
      tileId: l,
      biome: r
    });
    const d = this.noise.simplex2D(e * 0.3 + 2e3, t * 0.3) * 0.5 + 0.5, g = this.biomeManager.getRandomResource(r, d);
    return g && !l && i.push({
      x: e,
      y: t,
      layer: m.Objects,
      tileId: g,
      biome: r
    }), i;
  }
  /**
   * Get temperature at a world position
   * Temperature varies with Y coordinate to simulate latitude
   */
  getTemperature(e, t) {
    const { temperatureLatitudeScale: i } = this.config, s = this.noise.simplexFBM(
      e + 5e3,
      t + 5e3,
      x.temperature
    ), n = 1 - Math.abs(t * i), a = this.noise.perlinFBM(e, t, x.height), r = 1 - Math.max(0, (a - 0.5) * 0.5);
    return Math.max(0, Math.min(1, s * 0.5 + n * 0.3 + r * 0.2));
  }
  /**
   * Get spawn point (safe starting location)
   */
  findSpawnPoint() {
    const { spawnAreaSize: e } = this.config;
    for (let t = 0; t < 100; t += 5)
      for (let i = 0; i < Math.PI * 2; i += Math.PI / 8) {
        const s = Math.round(Math.cos(i) * t), n = Math.round(Math.sin(i) * t);
        if (this.isSuitableSpawn(s, n))
          return { x: s, y: n };
      }
    return { x: 0, y: 0 };
  }
  /**
   * Check if a location is suitable for spawning
   */
  isSuitableSpawn(e, t) {
    const i = this.generateTile(e, t);
    if (i.length === 0) return !1;
    const s = i[0].biome;
    return !this.biomeManager.isWalkable(s) || !this.biomeManager.isBuildable(s) || this.biomeManager.getHostileSpawnRate(s) > 0.5 ? !1 : s === V.Plains || s === V.Forest;
  }
  /**
   * Get the biome at a world position
   */
  getBiomeAt(e, t) {
    const i = this.noise.perlinFBM(e, t, x.height), s = this.noise.simplexFBM(e, t, x.moisture), n = this.getTemperature(e, t);
    return this.biomeManager.determineBiome(i, s, n);
  }
  /**
   * Get height at a world position (for pathfinding, etc.)
   */
  getHeightAt(e, t) {
    return this.noise.perlinFBM(e, t, x.height);
  }
  /**
   * Check if position is above water
   */
  isLand(e, t) {
    return this.getHeightAt(e, t) >= this.config.seaLevel;
  }
  /**
   * Validate world generation (for testing)
   * Generates a sample area and checks biome diversity
   */
  validateGeneration(e = 1e3) {
    const t = /* @__PURE__ */ new Map();
    let i = 0;
    const s = Math.sqrt(e);
    for (let r = 0; r < s; r++)
      for (let c = 0; c < s; c++) {
        const u = (r - s / 2) * 10, l = (c - s / 2) * 10, d = performance.now(), g = this.getBiomeAt(u, l);
        i += performance.now() - d, t.set(g, (t.get(g) ?? 0) + 1);
      }
    const n = t.size;
    return {
      valid: n >= 5,
      biomeCount: n,
      biomeCounts: t,
      averageGenerationTime: i / e
    };
  }
}
let O = null;
function je(o) {
  return (!O || o !== void 0) && (O = new Me(o !== void 0 ? { seed: o } : {})), O;
}
function Ke() {
  O = null;
}
var Te = /* @__PURE__ */ ((o) => (o.Idle = "idle", o.Walking = "walking", o.Running = "running", o.Interacting = "interacting", o.InMenu = "inMenu", o.Combat = "combat", o))(Te || {});
const xe = {
  walkSpeed: 4,
  // Tiles per second
  runSpeed: 7,
  // Tiles per second when sprinting
  acceleration: 20,
  // How fast to reach max speed
  deceleration: 15
  // How fast to stop
};
class Re {
  name = "PlayerController";
  config;
  position = { x: 0, y: 0 };
  velocity = { x: 0, y: 0 };
  facing = T.South;
  state = "idle";
  // Input state
  moveInput = { x: 0, y: 0 };
  digitalMoveInput = { x: 0, y: 0 };
  // D-pad/keyboard
  analogMoveInput = { x: 0, y: 0 };
  // Left stick
  isSprinting = !1;
  // Collision callback (set by game to check tile walkability)
  checkWalkable = null;
  constructor(e = {}) {
    this.config = { ...xe, ...e };
  }
  /**
   * Initialize the player controller
   */
  initialize() {
    const e = h();
    e.on("input:actionPressed", this.onActionPressed.bind(this)), e.on("input:actionReleased", this.onActionReleased.bind(this)), e.on("input:leftStickMoved", this.onLeftStickMoved.bind(this)), console.log("[PlayerController] Initialized");
  }
  /**
   * Set the walkability check function
   */
  setWalkableCheck(e) {
    this.checkWalkable = e;
  }
  /**
   * Handle action pressed events (digital input: keyboard/D-pad)
   */
  onActionPressed(e) {
    switch (e.action) {
      case "moveUp":
        this.digitalMoveInput.y = -1;
        break;
      case "moveDown":
        this.digitalMoveInput.y = 1;
        break;
      case "moveLeft":
        this.digitalMoveInput.x = -1;
        break;
      case "moveRight":
        this.digitalMoveInput.x = 1;
        break;
      case "sprint":
        this.isSprinting = !0;
        break;
      case "interact":
        this.interact();
        break;
    }
    this.updateCombinedInput();
  }
  /**
   * Handle action released events (digital input: keyboard/D-pad)
   */
  onActionReleased(e) {
    switch (e.action) {
      case "moveUp":
        this.digitalMoveInput.y < 0 && (this.digitalMoveInput.y = 0);
        break;
      case "moveDown":
        this.digitalMoveInput.y > 0 && (this.digitalMoveInput.y = 0);
        break;
      case "moveLeft":
        this.digitalMoveInput.x < 0 && (this.digitalMoveInput.x = 0);
        break;
      case "moveRight":
        this.digitalMoveInput.x > 0 && (this.digitalMoveInput.x = 0);
        break;
      case "sprint":
        this.isSprinting = !1;
        break;
    }
    this.updateCombinedInput();
  }
  /**
   * Handle left stick input (analog input from gamepad)
   */
  onLeftStickMoved(e) {
    this.analogMoveInput = { x: e.x, y: e.y }, this.updateCombinedInput();
  }
  /**
   * Combine digital and analog input (analog takes priority when active)
   */
  updateCombinedInput() {
    Math.sqrt(
      this.analogMoveInput.x ** 2 + this.analogMoveInput.y ** 2
    ) > 0.1 ? this.moveInput = { ...this.analogMoveInput } : this.moveInput = { ...this.digitalMoveInput };
  }
  /**
   * Fixed update for physics
   */
  fixedUpdate(e, t) {
    this.state === "inMenu" || this.state === "interacting" || this.updateMovement(e);
  }
  /**
   * Update movement physics
   */
  updateMovement(e) {
    const { acceleration: t, deceleration: i, walkSpeed: s, runSpeed: n } = this.config;
    let a = this.moveInput.x, r = this.moveInput.y;
    const c = Math.sqrt(a * a + r * r);
    c > 1 && (a /= c, r /= c);
    const u = this.isSprinting ? n : s, l = a * u, d = r * u;
    c > 0 ? (this.velocity.x = this.approach(this.velocity.x, l, t * e), this.velocity.y = this.approach(this.velocity.y, d, t * e)) : (this.velocity.x = this.approach(this.velocity.x, 0, i * e), this.velocity.y = this.approach(this.velocity.y, 0, i * e));
    const g = this.position.x + this.velocity.x * e, f = this.position.y + this.velocity.y * e, y = this.canMoveTo(g, this.position.y), v = this.canMoveTo(this.position.x, f), w = { ...this.position };
    y ? this.position.x = g : this.velocity.x = 0, v ? this.position.y = f : this.velocity.y = 0, c > 0 && (this.facing = this.calculateFacing(a, r)), this.updateState(), (this.position.x !== w.x || this.position.y !== w.y) && h().emit("player:moved", { position: { ...this.position } });
  }
  /**
   * Check if player can move to a position
   */
  canMoveTo(e, t) {
    if (!this.checkWalkable)
      return !0;
    const i = Math.floor(e), s = Math.floor(t);
    return this.checkWalkable(i, s);
  }
  /**
   * Calculate facing direction from input
   */
  calculateFacing(e, t) {
    return Math.abs(t) >= Math.abs(e) ? t < 0 ? T.North : T.South : e < 0 ? T.West : T.East;
  }
  /**
   * Update player state based on current conditions
   */
  updateState() {
    const e = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    e < 0.1 ? this.state = "idle" : this.isSprinting && e > this.config.walkSpeed * 0.9 ? this.state = "running" : this.state = "walking";
  }
  /**
   * Handle interaction
   */
  interact() {
    const e = Math.floor(this.position.x + this.getFacingOffset().x), t = Math.floor(this.position.y + this.getFacingOffset().y);
    h().emit("player:interacted", {
      targetId: null,
      position: { x: e, y: t }
    });
  }
  /**
   * Get the offset for the facing direction
   */
  getFacingOffset() {
    switch (this.facing) {
      case T.North:
        return { x: 0, y: -1 };
      case T.South:
        return { x: 0, y: 1 };
      case T.East:
        return { x: 1, y: 0 };
      case T.West:
        return { x: -1, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  }
  /**
   * Approach a target value at a given rate
   */
  approach(e, t, i) {
    return e < t ? Math.min(e + i, t) : Math.max(e - i, t);
  }
  // ============================================================================
  // Public API
  // ============================================================================
  /**
   * Get current position
   */
  getPosition() {
    return this.position;
  }
  /**
   * Set position (e.g., for teleportation or loading)
   */
  setPosition(e, t) {
    this.position = { x: e, y: t }, this.velocity = { x: 0, y: 0 }, h().emit("player:moved", { position: { ...this.position } });
  }
  /**
   * Get current velocity
   */
  getVelocity() {
    return this.velocity;
  }
  /**
   * Get current facing direction
   */
  getFacing() {
    return this.facing;
  }
  /**
   * Get current state
   */
  getState() {
    return this.state;
  }
  /**
   * Set state (e.g., for entering menus)
   */
  setState(e) {
    this.state = e, (e === "inMenu" || e === "interacting") && (this.velocity = { x: 0, y: 0 });
  }
  /**
   * Check if player is moving
   */
  isMoving() {
    return this.state === "walking" || this.state === "running";
  }
  /**
   * Cleanup
   */
  destroy() {
    console.log("[PlayerController] Destroyed");
  }
}
const De = {
  followSpeed: 5,
  deadzone: 0.5,
  minZoom: 0.5,
  maxZoom: 2,
  zoomSpeed: 2,
  shakeDecay: 5,
  viewportWidth: 20,
  viewportHeight: 15
};
class qe {
  name = "CameraSystem";
  config;
  position = { x: 0, y: 0 };
  targetPosition = { x: 0, y: 0 };
  zoom = 1;
  targetZoom = 1;
  // Screen shake
  shakeIntensity = 0;
  shakeOffset = { x: 0, y: 0 };
  // Bounds (optional camera limits)
  bounds = null;
  constructor(e = {}) {
    this.config = { ...De, ...e };
  }
  /**
   * Initialize the camera system
   */
  initialize() {
    const e = h();
    e.on("player:moved", (t) => {
      this.setTarget(t.position.x, t.position.y);
    }), e.on("input:actionPressed", (t) => {
      t.action === "zoomIn" ? this.zoomIn() : t.action === "zoomOut" && this.zoomOut();
    }), console.log("[CameraSystem] Initialized");
  }
  /**
   * Late update - camera follows after all other updates
   */
  lateUpdate(e, t) {
    this.updateFollow(e), this.updateZoom(e), this.updateShake(e);
  }
  /**
   * Update camera following
   */
  updateFollow(e) {
    const { followSpeed: t, deadzone: i } = this.config, s = this.targetPosition.x - this.position.x, n = this.targetPosition.y - this.position.y, a = Math.sqrt(s * s + n * n);
    if (a > i) {
      const r = t * e;
      if (r >= a)
        this.position.x = this.targetPosition.x, this.position.y = this.targetPosition.y;
      else {
        const c = r / a;
        this.position.x += s * c, this.position.y += n * c;
      }
    }
    this.bounds && this.clampToBounds();
  }
  /**
   * Update zoom level
   */
  updateZoom(e) {
    if (this.zoom !== this.targetZoom) {
      const { zoomSpeed: t } = this.config, i = this.targetZoom - this.zoom, s = t * e;
      Math.abs(i) <= s ? this.zoom = this.targetZoom : this.zoom += Math.sign(i) * s;
    }
  }
  /**
   * Update screen shake
   */
  updateShake(e) {
    if (this.shakeIntensity > 0) {
      const t = Math.random() * Math.PI * 2;
      this.shakeOffset.x = Math.cos(t) * this.shakeIntensity, this.shakeOffset.y = Math.sin(t) * this.shakeIntensity, this.shakeIntensity -= this.config.shakeDecay * e, this.shakeIntensity < 0 && (this.shakeIntensity = 0, this.shakeOffset.x = 0, this.shakeOffset.y = 0);
    }
  }
  /**
   * Clamp camera position to bounds
   */
  clampToBounds() {
    if (!this.bounds) return;
    const e = this.getViewWidth() / 2, t = this.getViewHeight() / 2;
    this.position.x = Math.max(
      this.bounds.x + e,
      Math.min(this.bounds.x + this.bounds.width - e, this.position.x)
    ), this.position.y = Math.max(
      this.bounds.y + t,
      Math.min(this.bounds.y + this.bounds.height - t, this.position.y)
    );
  }
  // ============================================================================
  // Public API
  // ============================================================================
  /**
   * Set camera target position
   */
  setTarget(e, t) {
    this.targetPosition.x = e, this.targetPosition.y = t;
  }
  /**
   * Immediately snap camera to position
   */
  snapTo(e, t) {
    this.position.x = e, this.position.y = t, this.targetPosition.x = e, this.targetPosition.y = t;
  }
  /**
   * Get camera position (with shake applied)
   */
  getPosition() {
    return {
      x: this.position.x + this.shakeOffset.x,
      y: this.position.y + this.shakeOffset.y
    };
  }
  /**
   * Get raw camera position (without shake)
   */
  getRawPosition() {
    return this.position;
  }
  /**
   * Get current zoom level
   */
  getZoom() {
    return this.zoom;
  }
  /**
   * Set zoom level
   */
  setZoom(e) {
    this.targetZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, e));
  }
  /**
   * Zoom in
   */
  zoomIn() {
    this.setZoom(this.targetZoom * 1.2);
  }
  /**
   * Zoom out
   */
  zoomOut() {
    this.setZoom(this.targetZoom / 1.2);
  }
  /**
   * Add screen shake
   */
  shake(e) {
    this.shakeIntensity = Math.max(this.shakeIntensity, e);
  }
  /**
   * Set camera bounds
   */
  setBounds(e) {
    this.bounds = e, e && this.clampToBounds();
  }
  /**
   * Get visible area in world coordinates
   */
  getViewBounds() {
    const e = this.getViewWidth() / 2, t = this.getViewHeight() / 2, i = this.getPosition();
    return {
      x: i.x - e,
      y: i.y - t,
      width: this.getViewWidth(),
      height: this.getViewHeight()
    };
  }
  /**
   * Get view width in world units
   */
  getViewWidth() {
    return this.config.viewportWidth / this.zoom;
  }
  /**
   * Get view height in world units
   */
  getViewHeight() {
    return this.config.viewportHeight / this.zoom;
  }
  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(e, t, i, s) {
    const n = this.getPosition(), a = this.getViewWidth(), r = this.getViewHeight();
    return {
      x: n.x + (e / i - 0.5) * a,
      y: n.y + (t / s - 0.5) * r
    };
  }
  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(e, t, i, s) {
    const n = this.getPosition(), a = this.getViewWidth(), r = this.getViewHeight();
    return {
      x: ((e - n.x) / a + 0.5) * i,
      y: ((t - n.y) / r + 0.5) * s
    };
  }
  /**
   * Check if a world position is visible
   */
  isVisible(e, t, i = 0) {
    const s = this.getViewBounds();
    return e >= s.x - i && e <= s.x + s.width + i && t >= s.y - i && t <= s.y + s.height + i;
  }
  /**
   * Cleanup
   */
  destroy() {
    console.log("[CameraSystem] Destroyed");
  }
}
const Ce = "0.1.0", q = "voxel_rpg_save_", Ae = 10;
class Pe {
  name = "SaveManager";
  stateProvider = null;
  stateConsumer = null;
  autosaveInterval = null;
  autosaveSlot = "autosave";
  /**
   * Initialize the save manager
   */
  initialize() {
    console.log("[SaveManager] Initialized");
  }
  /**
   * Set the game state provider (for saving)
   */
  setStateProvider(e) {
    this.stateProvider = e;
  }
  /**
   * Set the game state consumer (for loading)
   */
  setStateConsumer(e) {
    this.stateConsumer = e;
  }
  /**
   * Get all save slots
   */
  getSaveSlots() {
    const e = [];
    for (let n = 1; n <= Ae; n++) {
      const a = `slot${n}`, r = q + a, c = localStorage.getItem(r) !== null, u = { slot: a, exists: c };
      if (c)
        try {
          const l = JSON.parse(localStorage.getItem(r));
          u.metadata = l.metadata;
        } catch {
        }
      e.push(u);
    }
    const t = q + this.autosaveSlot, i = localStorage.getItem(t) !== null, s = { slot: this.autosaveSlot, exists: i };
    if (i)
      try {
        const n = JSON.parse(localStorage.getItem(t));
        s.metadata = n.metadata;
      } catch {
      }
    return e.unshift(s), e;
  }
  /**
   * Save game to a slot
   */
  async saveGame(e) {
    if (!this.stateProvider)
      return console.error("[SaveManager] No state provider set"), !1;
    const t = h();
    t.emit("save:started", { slot: e });
    try {
      const i = this.createSaveData(e), s = JSON.stringify(i), n = q + e;
      return localStorage.setItem(n, s), t.emit("save:completed", { slot: e }), console.log(`[SaveManager] Game saved to slot "${e}"`), !0;
    } catch (i) {
      const s = i instanceof Error ? i.message : "Unknown error";
      return t.emit("save:failed", { slot: e, error: s }), console.error("[SaveManager] Save failed:", i), !1;
    }
  }
  /**
   * Load game from a slot
   */
  async loadGame(e) {
    if (!this.stateConsumer)
      return console.error("[SaveManager] No state consumer set"), !1;
    const t = h();
    t.emit("load:started", { slot: e });
    try {
      const i = q + e, s = localStorage.getItem(i);
      if (!s)
        throw new Error(`Save slot "${e}" not found`);
      const n = JSON.parse(s), a = this.migrateData(n);
      return this.applySaveData(a), t.emit("load:completed", { slot: e }), console.log(`[SaveManager] Game loaded from slot "${e}"`), !0;
    } catch (i) {
      const s = i instanceof Error ? i.message : "Unknown error";
      return t.emit("load:failed", { slot: e, error: s }), console.error("[SaveManager] Load failed:", i), !1;
    }
  }
  /**
   * Delete a save slot
   */
  deleteSave(e) {
    try {
      const t = q + e;
      return localStorage.removeItem(t), console.log(`[SaveManager] Deleted save slot "${e}"`), !0;
    } catch (t) {
      return console.error("[SaveManager] Delete failed:", t), !1;
    }
  }
  /**
   * Check if a save slot exists
   */
  saveExists(e) {
    const t = q + e;
    return localStorage.getItem(t) !== null;
  }
  /**
   * Enable autosave at specified interval (in seconds)
   */
  enableAutosave(e) {
    this.disableAutosave(), this.autosaveInterval = window.setInterval(() => {
      this.saveGame(this.autosaveSlot);
    }, e * 1e3), console.log(`[SaveManager] Autosave enabled every ${e} seconds`);
  }
  /**
   * Disable autosave
   */
  disableAutosave() {
    this.autosaveInterval !== null && (window.clearInterval(this.autosaveInterval), this.autosaveInterval = null, console.log("[SaveManager] Autosave disabled"));
  }
  /**
   * Create save data from current game state
   */
  createSaveData(e) {
    const t = this.stateProvider;
    return {
      metadata: {
        version: Ce,
        timestamp: Date.now(),
        playtimeSeconds: t.getTotalPlaytime(),
        slotName: e
      },
      world: {
        seed: t.getWorldSeed(),
        modifiedTiles: t.getModifiedTiles()
      },
      player: {
        position: t.getPlayerPosition(),
        health: t.getPlayerHealth(),
        maxHealth: t.getPlayerMaxHealth(),
        inventory: t.getPlayerInventory()
      },
      gameTime: {
        totalSeconds: t.getTotalPlaytime(),
        gameDay: t.getGameDay()
      }
    };
  }
  /**
   * Apply save data to game state
   */
  applySaveData(e) {
    const t = this.stateConsumer;
    t.loadWorldSeed(e.world.seed), t.loadModifiedTiles(e.world.modifiedTiles), t.loadPlayerPosition(e.player.position), t.loadPlayerHealth(e.player.health, e.player.maxHealth), t.loadPlayerInventory(e.player.inventory), t.loadPlaytime(e.gameTime.totalSeconds), t.loadGameDay(e.gameTime.gameDay);
  }
  /**
   * Migrate save data from older versions
   */
  migrateData(e) {
    return e;
  }
  /**
   * Cleanup
   */
  destroy() {
    this.disableAutosave(), console.log("[SaveManager] Destroyed");
  }
}
const Be = [
  // Movement (D-pad also supported for digital input)
  { action: "moveUp", keys: ["KeyW", "ArrowUp"], gamepadButtons: [S.DPadUp] },
  { action: "moveDown", keys: ["KeyS", "ArrowDown"], gamepadButtons: [S.DPadDown] },
  { action: "moveLeft", keys: ["KeyA", "ArrowLeft"], gamepadButtons: [S.DPadLeft] },
  { action: "moveRight", keys: ["KeyD", "ArrowRight"], gamepadButtons: [S.DPadRight] },
  // Actions
  { action: "sprint", keys: ["ShiftLeft", "ShiftRight"], gamepadButtons: [S.LeftTrigger] },
  { action: "interact", keys: ["KeyE"], gamepadButtons: [S.A] },
  { action: "attack", keys: [], mouseButtons: [0], gamepadButtons: [S.RightTrigger] },
  { action: "secondary", keys: [], mouseButtons: [2], gamepadButtons: [S.RightBumper] },
  { action: "cancel", keys: ["Escape"], gamepadButtons: [S.B] },
  { action: "inventory", keys: ["KeyI"], gamepadButtons: [S.Start] },
  { action: "buildMenu", keys: ["KeyB"], gamepadButtons: [S.Select] },
  { action: "pause", keys: ["KeyP", "Escape"], gamepadButtons: [S.Start] },
  // Zoom (bumpers on gamepad)
  { action: "zoomIn", keys: ["Equal", "NumpadAdd"], gamepadButtons: [S.Y] },
  { action: "zoomOut", keys: ["Minus", "NumpadSubtract"], gamepadButtons: [S.X] },
  // Quick slots (no gamepad equivalent - use radial menu instead)
  { action: "quickSlot1", keys: ["Digit1", "Numpad1"] },
  { action: "quickSlot2", keys: ["Digit2", "Numpad2"] },
  { action: "quickSlot3", keys: ["Digit3", "Numpad3"] },
  { action: "quickSlot4", keys: ["Digit4", "Numpad4"] },
  { action: "quickSlot5", keys: ["Digit5", "Numpad5"] },
  { action: "quickSlot6", keys: ["Digit6", "Numpad6"] },
  { action: "quickSlot7", keys: ["Digit7", "Numpad7"] },
  { action: "quickSlot8", keys: ["Digit8", "Numpad8"] },
  { action: "quickSlot9", keys: ["Digit9", "Numpad9"] }
], Z = {
  deadzone: 0.15,
  // Stick deadzone to prevent drift
  triggerThreshold: 0.5
  // Trigger activation threshold
};
class _e {
  name = "InputManager";
  bindings = [];
  keyToAction = /* @__PURE__ */ new Map();
  mouseButtonToAction = /* @__PURE__ */ new Map();
  gamepadButtonToAction = /* @__PURE__ */ new Map();
  // Current input state
  pressedKeys = /* @__PURE__ */ new Set();
  pressedMouseButtons = /* @__PURE__ */ new Set();
  pressedGamepadButtons = /* @__PURE__ */ new Set();
  activeActions = /* @__PURE__ */ new Set();
  // Mouse state
  mousePosition = { x: 0, y: 0 };
  mouseWorldPosition = { x: 0, y: 0 };
  // Gamepad state
  activeGamepadIndex = null;
  leftStickInput = { x: 0, y: 0 };
  rightStickInput = { x: 0, y: 0 };
  gamepadConnected = !1;
  // Screen to world converter (set by game)
  screenToWorld = null;
  /**
   * Initialize the input manager
   */
  initialize() {
    this.setBindings(Be), window.addEventListener("keydown", this.onKeyDown.bind(this)), window.addEventListener("keyup", this.onKeyUp.bind(this)), window.addEventListener("mousedown", this.onMouseDown.bind(this)), window.addEventListener("mouseup", this.onMouseUp.bind(this)), window.addEventListener("mousemove", this.onMouseMove.bind(this)), window.addEventListener("contextmenu", this.onContextMenu.bind(this)), window.addEventListener("blur", this.onBlur.bind(this)), window.addEventListener("gamepadconnected", this.onGamepadConnected.bind(this)), window.addEventListener("gamepaddisconnected", this.onGamepadDisconnected.bind(this)), this.detectGamepads(), console.log("[InputManager] Initialized");
  }
  /**
   * Update - polls gamepad state (Gamepad API requires polling)
   */
  update(e, t) {
    this.pollGamepad();
  }
  /**
   * Set input bindings
   */
  setBindings(e) {
    this.bindings = [...e], this.rebuildBindingMaps();
  }
  /**
   * Get current bindings
   */
  getBindings() {
    return this.bindings;
  }
  /**
   * Rebind a key for an action
   */
  rebindKey(e, t, i) {
    const s = this.bindings.find((n) => n.action === e);
    if (s) {
      const n = s.keys.indexOf(t);
      n !== -1 && (s.keys[n] = i, this.rebuildBindingMaps());
    }
  }
  /**
   * Set screen to world conversion function
   */
  setScreenToWorldConverter(e) {
    this.screenToWorld = e;
  }
  /**
   * Rebuild the key/button to action maps
   */
  rebuildBindingMaps() {
    this.keyToAction.clear(), this.mouseButtonToAction.clear(), this.gamepadButtonToAction.clear();
    for (const e of this.bindings) {
      for (const t of e.keys) {
        const i = this.keyToAction.get(t) ?? [];
        i.push(e.action), this.keyToAction.set(t, i);
      }
      if (e.mouseButtons)
        for (const t of e.mouseButtons) {
          const i = this.mouseButtonToAction.get(t) ?? [];
          i.push(e.action), this.mouseButtonToAction.set(t, i);
        }
      if (e.gamepadButtons)
        for (const t of e.gamepadButtons) {
          const i = this.gamepadButtonToAction.get(t) ?? [];
          i.push(e.action), this.gamepadButtonToAction.set(t, i);
        }
    }
  }
  /**
   * Handle key down event
   */
  onKeyDown(e) {
    if (this.isTypingInInput(e))
      return;
    const t = e.code;
    if (this.pressedKeys.has(t))
      return;
    this.pressedKeys.add(t);
    const i = this.keyToAction.get(t);
    if (i) {
      const s = h();
      for (const n of i)
        this.activeActions.has(n) || (this.activeActions.add(n), s.emit("input:actionPressed", { action: n }));
    }
  }
  /**
   * Handle key up event
   */
  onKeyUp(e) {
    const t = e.code;
    this.pressedKeys.delete(t);
    const i = this.keyToAction.get(t);
    if (i) {
      const s = h();
      for (const n of i)
        this.isActionStillPressed(n) || (this.activeActions.delete(n), s.emit("input:actionReleased", { action: n }));
    }
  }
  /**
   * Handle mouse down event
   */
  onMouseDown(e) {
    const t = e.button;
    this.pressedMouseButtons.add(t);
    const i = h();
    i.emit("input:mouseClicked", {
      button: t,
      position: { ...this.mousePosition },
      worldPosition: { ...this.mouseWorldPosition }
    });
    const s = this.mouseButtonToAction.get(t);
    if (s)
      for (const n of s)
        this.activeActions.has(n) || (this.activeActions.add(n), i.emit("input:actionPressed", { action: n }));
  }
  /**
   * Handle mouse up event
   */
  onMouseUp(e) {
    const t = e.button;
    this.pressedMouseButtons.delete(t);
    const i = this.mouseButtonToAction.get(t);
    if (i) {
      const s = h();
      for (const n of i)
        this.isActionStillPressed(n) || (this.activeActions.delete(n), s.emit("input:actionReleased", { action: n }));
    }
  }
  /**
   * Handle mouse move event
   */
  onMouseMove(e) {
    this.mousePosition = { x: e.clientX, y: e.clientY }, this.screenToWorld && (this.mouseWorldPosition = this.screenToWorld(e.clientX, e.clientY)), h().emit("input:mouseMoved", {
      position: { ...this.mousePosition },
      worldPosition: { ...this.mouseWorldPosition }
    });
  }
  /**
   * Handle context menu (prevent default right-click menu)
   */
  onContextMenu(e) {
    e.preventDefault();
  }
  /**
   * Handle window blur (release all keys)
   */
  onBlur() {
    const e = h();
    for (const t of this.activeActions)
      e.emit("input:actionReleased", { action: t });
    this.pressedKeys.clear(), this.pressedMouseButtons.clear(), this.pressedGamepadButtons.clear(), this.activeActions.clear(), this.leftStickInput = { x: 0, y: 0 }, this.rightStickInput = { x: 0, y: 0 };
  }
  // ============================================================================
  // Gamepad Methods
  // ============================================================================
  /**
   * Handle gamepad connected event
   */
  onGamepadConnected(e) {
    console.log(`[InputManager] Gamepad connected: ${e.gamepad.id}`), this.activeGamepadIndex = e.gamepad.index, this.gamepadConnected = !0, h().emit("input:gamepadConnected", {
      index: e.gamepad.index,
      id: e.gamepad.id
    });
  }
  /**
   * Handle gamepad disconnected event
   */
  onGamepadDisconnected(e) {
    console.log(`[InputManager] Gamepad disconnected: ${e.gamepad.id}`), this.activeGamepadIndex === e.gamepad.index && (this.activeGamepadIndex = null, this.gamepadConnected = !1, this.pressedGamepadButtons.clear(), this.leftStickInput = { x: 0, y: 0 }, this.rightStickInput = { x: 0, y: 0 }, this.detectGamepads()), h().emit("input:gamepadDisconnected", {
      index: e.gamepad.index,
      id: e.gamepad.id
    });
  }
  /**
   * Detect already-connected gamepads
   */
  detectGamepads() {
    const e = navigator.getGamepads();
    for (const t of e)
      if (t) {
        this.activeGamepadIndex = t.index, this.gamepadConnected = !0, console.log(`[InputManager] Found gamepad: ${t.id}`);
        break;
      }
  }
  /**
   * Poll gamepad state (called every frame)
   */
  pollGamepad() {
    if (this.activeGamepadIndex === null) return;
    const t = navigator.getGamepads()[this.activeGamepadIndex];
    if (!t) {
      this.activeGamepadIndex = null, this.gamepadConnected = !1;
      return;
    }
    this.pollGamepadButtons(t), this.pollGamepadSticks(t);
  }
  /**
   * Poll gamepad buttons
   */
  pollGamepadButtons(e) {
    const t = h();
    for (let i = 0; i < e.buttons.length; i++) {
      const s = e.buttons[i], n = s.pressed || s.value > Z.triggerThreshold, a = this.pressedGamepadButtons.has(i);
      if (n && !a) {
        this.pressedGamepadButtons.add(i);
        const r = this.gamepadButtonToAction.get(i);
        if (r)
          for (const c of r)
            this.activeActions.has(c) || (this.activeActions.add(c), t.emit("input:actionPressed", { action: c }));
      } else if (!n && a) {
        this.pressedGamepadButtons.delete(i);
        const r = this.gamepadButtonToAction.get(i);
        if (r)
          for (const c of r)
            this.isActionStillPressed(c) || (this.activeActions.delete(c), t.emit("input:actionReleased", { action: c }));
      }
    }
  }
  /**
   * Poll gamepad analog sticks
   */
  pollGamepadSticks(e) {
    const { deadzone: t } = Z;
    let i = e.axes[_.LeftStickX] ?? 0, s = e.axes[_.LeftStickY] ?? 0;
    Math.abs(i) < t && (i = 0), Math.abs(s) < t && (s = 0);
    const n = this.leftStickInput.x, a = this.leftStickInput.y;
    this.leftStickInput = { x: i, y: s }, (Math.abs(i - n) > 0.01 || Math.abs(s - a) > 0.01) && h().emit("input:leftStickMoved", { x: i, y: s });
    let r = e.axes[_.RightStickX] ?? 0, c = e.axes[_.RightStickY] ?? 0;
    Math.abs(r) < t && (r = 0), Math.abs(c) < t && (c = 0);
    const u = this.rightStickInput.x, l = this.rightStickInput.y;
    this.rightStickInput = { x: r, y: c }, (Math.abs(r - u) > 0.01 || Math.abs(c - l) > 0.01) && h().emit("input:rightStickMoved", { x: r, y: c });
  }
  /**
   * Check if an action is still pressed by any bound key/button
   */
  isActionStillPressed(e) {
    const t = this.bindings.find((i) => i.action === e);
    if (!t) return !1;
    for (const i of t.keys)
      if (this.pressedKeys.has(i))
        return !0;
    if (t.mouseButtons) {
      for (const i of t.mouseButtons)
        if (this.pressedMouseButtons.has(i))
          return !0;
    }
    if (t.gamepadButtons) {
      for (const i of t.gamepadButtons)
        if (this.pressedGamepadButtons.has(i))
          return !0;
    }
    return !1;
  }
  /**
   * Check if user is typing in an input field
   */
  isTypingInInput(e) {
    const t = e.target;
    return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
  }
  // ============================================================================
  // Public API
  // ============================================================================
  /**
   * Check if an action is currently active
   */
  isActionActive(e) {
    return this.activeActions.has(e);
  }
  /**
   * Check if a key is currently pressed
   */
  isKeyPressed(e) {
    return this.pressedKeys.has(e);
  }
  /**
   * Check if a mouse button is currently pressed
   */
  isMouseButtonPressed(e) {
    return this.pressedMouseButtons.has(e);
  }
  /**
   * Get mouse position in screen coordinates
   */
  getMousePosition() {
    return this.mousePosition;
  }
  /**
   * Get mouse position in world coordinates
   */
  getMouseWorldPosition() {
    return this.mouseWorldPosition;
  }
  /**
   * Get all currently active actions
   */
  getActiveActions() {
    return this.activeActions;
  }
  // ============================================================================
  // Gamepad Public API
  // ============================================================================
  /**
   * Check if a gamepad is connected
   */
  isGamepadConnected() {
    return this.gamepadConnected;
  }
  /**
   * Get left stick input (-1 to 1 for each axis)
   */
  getLeftStick() {
    return this.leftStickInput;
  }
  /**
   * Get right stick input (-1 to 1 for each axis)
   */
  getRightStick() {
    return this.rightStickInput;
  }
  /**
   * Check if a gamepad button is currently pressed
   */
  isGamepadButtonPressed(e) {
    return this.pressedGamepadButtons.has(e);
  }
  /**
   * Get the active gamepad (if any)
   */
  getActiveGamepad() {
    return this.activeGamepadIndex === null ? null : navigator.getGamepads()[this.activeGamepadIndex] ?? null;
  }
  /**
   * Cleanup
   */
  destroy() {
    window.removeEventListener("keydown", this.onKeyDown.bind(this)), window.removeEventListener("keyup", this.onKeyUp.bind(this)), window.removeEventListener("mousedown", this.onMouseDown.bind(this)), window.removeEventListener("mouseup", this.onMouseUp.bind(this)), window.removeEventListener("mousemove", this.onMouseMove.bind(this)), window.removeEventListener("contextmenu", this.onContextMenu.bind(this)), window.removeEventListener("blur", this.onBlur.bind(this)), window.removeEventListener("gamepadconnected", this.onGamepadConnected.bind(this)), window.removeEventListener("gamepaddisconnected", this.onGamepadDisconnected.bind(this)), this.pressedKeys.clear(), this.pressedMouseButtons.clear(), this.pressedGamepadButtons.clear(), this.activeActions.clear(), console.log("[InputManager] Destroyed");
  }
}
var ze = /* @__PURE__ */ ((o) => (o.RawMaterial = "raw_material", o.Ore = "ore", o.Food = "food", o.Tool = "tool", o.Weapon = "weapon", o.Armor = "armor", o.Building = "building", o.Special = "special", o.Consumable = "consumable", o))(ze || {});
const We = [
  // Raw Materials
  {
    id: "wood",
    name: "Wood",
    description: "Basic building material gathered from trees",
    category: "raw_material",
    stackSize: 99,
    value: 2,
    weight: 1
  },
  {
    id: "stone",
    name: "Stone",
    description: "Common stone for building and tools",
    category: "raw_material",
    stackSize: 99,
    value: 1,
    weight: 2
  },
  {
    id: "fiber",
    name: "Plant Fiber",
    description: "Flexible plant material for crafting",
    category: "raw_material",
    stackSize: 99,
    value: 1,
    weight: 0.2
  },
  {
    id: "clay",
    name: "Clay",
    description: "Moldable earth for pottery and bricks",
    category: "raw_material",
    stackSize: 50,
    value: 2,
    weight: 1.5
  },
  {
    id: "leather",
    name: "Leather",
    description: "Tanned animal hide",
    category: "raw_material",
    stackSize: 50,
    value: 5,
    weight: 0.5
  },
  {
    id: "cloth",
    name: "Cloth",
    description: "Woven fabric from plant fibers",
    category: "raw_material",
    stackSize: 50,
    value: 4,
    weight: 0.3
  },
  // Ores
  {
    id: "iron_ore",
    name: "Iron Ore",
    description: "Raw iron ore, needs smelting",
    category: "ore",
    stackSize: 50,
    value: 5,
    weight: 3
  },
  {
    id: "copper_ore",
    name: "Copper Ore",
    description: "Raw copper ore, needs smelting",
    category: "ore",
    stackSize: 50,
    value: 3,
    weight: 2.5
  },
  {
    id: "gold_ore",
    name: "Gold Ore",
    description: "Precious gold ore, needs smelting",
    category: "ore",
    stackSize: 30,
    value: 20,
    weight: 4
  },
  {
    id: "coal",
    name: "Coal",
    description: "Fuel for smelting and crafting",
    category: "ore",
    stackSize: 50,
    value: 2,
    weight: 1
  },
  {
    id: "iron_ingot",
    name: "Iron Ingot",
    description: "Smelted iron, ready for crafting",
    category: "raw_material",
    stackSize: 50,
    value: 10,
    weight: 2
  },
  {
    id: "copper_ingot",
    name: "Copper Ingot",
    description: "Smelted copper, ready for crafting",
    category: "raw_material",
    stackSize: 50,
    value: 6,
    weight: 1.5
  },
  {
    id: "gold_ingot",
    name: "Gold Ingot",
    description: "Smelted gold, valuable and beautiful",
    category: "raw_material",
    stackSize: 30,
    value: 40,
    weight: 3
  },
  // Food
  {
    id: "berries",
    name: "Berries",
    description: "Wild berries, slightly restores hunger",
    category: "food",
    stackSize: 20,
    value: 1,
    weight: 0.1,
    hungerRestore: 5,
    healAmount: 0
  },
  {
    id: "mushroom",
    name: "Mushroom",
    description: "Edible forest mushroom",
    category: "food",
    stackSize: 20,
    value: 2,
    weight: 0.1,
    hungerRestore: 8,
    healAmount: 0
  },
  {
    id: "raw_meat",
    name: "Raw Meat",
    description: "Uncooked meat, should be cooked before eating",
    category: "food",
    stackSize: 10,
    value: 5,
    weight: 0.5,
    hungerRestore: 10,
    healAmount: -5
    // Raw meat is bad for you
  },
  {
    id: "cooked_meat",
    name: "Cooked Meat",
    description: "Well-cooked meat, restores hunger and health",
    category: "food",
    stackSize: 10,
    value: 10,
    weight: 0.4,
    hungerRestore: 25,
    healAmount: 10
  },
  {
    id: "bread",
    name: "Bread",
    description: "Baked bread, a staple food",
    category: "food",
    stackSize: 20,
    value: 8,
    weight: 0.2,
    hungerRestore: 20,
    healAmount: 0
  },
  {
    id: "apple",
    name: "Apple",
    description: "Fresh apple from a tree",
    category: "food",
    stackSize: 20,
    value: 3,
    weight: 0.2,
    hungerRestore: 10,
    healAmount: 2
  },
  {
    id: "fish",
    name: "Cooked Fish",
    description: "Freshly caught and cooked fish",
    category: "food",
    stackSize: 10,
    value: 12,
    weight: 0.4,
    hungerRestore: 30,
    healAmount: 5
  },
  // Tools
  {
    id: "stone_pickaxe",
    name: "Stone Pickaxe",
    description: "Basic mining tool",
    category: "tool",
    stackSize: 1,
    value: 15,
    weight: 3,
    durability: 100,
    damage: 5
  },
  {
    id: "iron_pickaxe",
    name: "Iron Pickaxe",
    description: "Sturdy mining tool",
    category: "tool",
    stackSize: 1,
    value: 50,
    weight: 4,
    durability: 250,
    damage: 8
  },
  {
    id: "stone_axe",
    name: "Stone Axe",
    description: "Basic woodcutting tool",
    category: "tool",
    stackSize: 1,
    value: 15,
    weight: 2.5,
    durability: 100,
    damage: 8
  },
  {
    id: "iron_axe",
    name: "Iron Axe",
    description: "Sturdy woodcutting tool",
    category: "tool",
    stackSize: 1,
    value: 50,
    weight: 3.5,
    durability: 250,
    damage: 12
  },
  // Weapons
  {
    id: "wooden_sword",
    name: "Wooden Sword",
    description: "A basic wooden sword",
    category: "weapon",
    stackSize: 1,
    value: 10,
    weight: 1.5,
    durability: 50,
    damage: 10
  },
  {
    id: "stone_sword",
    name: "Stone Sword",
    description: "A crude stone blade",
    category: "weapon",
    stackSize: 1,
    value: 20,
    weight: 3,
    durability: 100,
    damage: 15
  },
  {
    id: "iron_sword",
    name: "Iron Sword",
    description: "A sturdy iron blade",
    category: "weapon",
    stackSize: 1,
    value: 75,
    weight: 2.5,
    durability: 300,
    damage: 25
  },
  {
    id: "bow",
    name: "Wooden Bow",
    description: "A ranged weapon for hunting",
    category: "weapon",
    stackSize: 1,
    value: 30,
    weight: 1,
    durability: 150,
    damage: 20
  },
  {
    id: "arrow",
    name: "Arrow",
    description: "Ammunition for bows",
    category: "weapon",
    stackSize: 50,
    value: 1,
    weight: 0.1,
    damage: 5
  },
  // Consumables
  {
    id: "health_potion",
    name: "Health Potion",
    description: "Restores health when consumed",
    category: "consumable",
    stackSize: 10,
    value: 25,
    weight: 0.5,
    healAmount: 50
  },
  {
    id: "bandage",
    name: "Bandage",
    description: "Stops bleeding and heals minor wounds",
    category: "consumable",
    stackSize: 20,
    value: 5,
    weight: 0.1,
    healAmount: 15
  },
  // Building Materials
  {
    id: "wooden_plank",
    name: "Wooden Plank",
    description: "Processed wood for building",
    category: "building",
    stackSize: 50,
    value: 5,
    weight: 1
  },
  {
    id: "stone_brick",
    name: "Stone Brick",
    description: "Cut stone for sturdy construction",
    category: "building",
    stackSize: 50,
    value: 4,
    weight: 2
  },
  {
    id: "rope",
    name: "Rope",
    description: "Woven rope for building and crafting",
    category: "building",
    stackSize: 30,
    value: 6,
    weight: 0.5
  },
  // Special
  {
    id: "portal_shard",
    name: "Portal Shard",
    description: "A mysterious crystal from a closed portal",
    category: "special",
    stackSize: 10,
    value: 100,
    weight: 0.3
  },
  {
    id: "monster_essence",
    name: "Monster Essence",
    description: "Magical essence dropped by monsters",
    category: "special",
    stackSize: 50,
    value: 15,
    weight: 0.1
  }
];
class Oe {
  resources = /* @__PURE__ */ new Map();
  constructor() {
    for (const e of We)
      this.registerResource(e);
  }
  /**
   * Register a new resource
   */
  registerResource(e) {
    this.resources.set(e.id, e);
  }
  /**
   * Get a resource by ID
   */
  getResource(e) {
    return this.resources.get(e);
  }
  /**
   * Get all resources
   */
  getAllResources() {
    return Array.from(this.resources.values());
  }
  /**
   * Get resources by category
   */
  getResourcesByCategory(e) {
    return this.getAllResources().filter((t) => t.category === e);
  }
  /**
   * Check if a resource exists
   */
  hasResource(e) {
    return this.resources.has(e);
  }
  /**
   * Get resource count
   */
  getResourceCount() {
    return this.resources.size;
  }
  /**
   * Check if resource is stackable
   */
  isStackable(e) {
    const t = this.getResource(e);
    return t ? t.stackSize > 1 : !1;
  }
  /**
   * Get max stack size for a resource
   */
  getStackSize(e) {
    return this.getResource(e)?.stackSize ?? 1;
  }
  /**
   * Check if resource is consumable (food or consumable)
   */
  isConsumable(e) {
    const t = this.getResource(e);
    return t ? t.category === "food" || t.category === "consumable" : !1;
  }
  /**
   * Check if resource is a weapon
   */
  isWeapon(e) {
    return this.getResource(e)?.category === "weapon";
  }
  /**
   * Check if resource is a tool
   */
  isTool(e) {
    return this.getResource(e)?.category === "tool";
  }
}
let E = null;
function H() {
  return E || (E = new Oe()), E;
}
const He = {
  size: 30,
  quickSlots: 9
};
class Le {
  slots = [];
  config;
  selectedQuickSlot = 0;
  constructor(e = {}) {
    this.config = { ...He, ...e }, this.initializeSlots();
  }
  /**
   * Initialize empty slots
   */
  initializeSlots() {
    this.slots = [];
    for (let e = 0; e < this.config.size; e++)
      this.slots.push({ resourceId: null, quantity: 0 });
  }
  /**
   * Get all slots
   */
  getSlots() {
    return this.slots;
  }
  /**
   * Get a specific slot
   */
  getSlot(e) {
    return this.slots[e];
  }
  /**
   * Get quick slots (first N slots)
   */
  getQuickSlots() {
    return this.slots.slice(0, this.config.quickSlots);
  }
  /**
   * Get selected quick slot index
   */
  getSelectedQuickSlot() {
    return this.selectedQuickSlot;
  }
  /**
   * Set selected quick slot
   */
  setSelectedQuickSlot(e) {
    e >= 0 && e < this.config.quickSlots && (this.selectedQuickSlot = e);
  }
  /**
   * Get item in hand (selected quick slot)
   */
  getItemInHand() {
    return this.slots[this.selectedQuickSlot];
  }
  /**
   * Add an item to inventory
   * Returns the amount that couldn't be added (0 if all added)
   */
  addItem(e, t = 1, i) {
    const n = H().getResource(e);
    if (!n)
      return console.warn(`[InventoryManager] Unknown resource: ${e}`), t;
    let a = t;
    const r = n.stackSize;
    if (r > 1)
      for (const c of this.slots) {
        if (a <= 0) break;
        if (c.resourceId === e && c.quantity < r) {
          const u = Math.min(a, r - c.quantity);
          c.quantity += u, a -= u;
        }
      }
    for (const c of this.slots) {
      if (a <= 0) break;
      if (c.resourceId === null) {
        const u = Math.min(a, r);
        c.resourceId = e, c.quantity = u, c.durability = i ?? n.durability, a -= u;
      }
    }
    return a < t && h().emit("player:inventoryChanged", {
      itemId: e,
      delta: t - a
    }), a;
  }
  /**
   * Remove an item from inventory
   * Returns the amount actually removed
   */
  removeItem(e, t = 1) {
    let i = t;
    for (let n = this.slots.length - 1; n >= 0 && !(i <= 0); n--) {
      const a = this.slots[n];
      if (a.resourceId === e) {
        const r = Math.min(i, a.quantity);
        a.quantity -= r, i -= r, a.quantity <= 0 && (a.resourceId = null, a.quantity = 0, a.durability = void 0);
      }
    }
    const s = t - i;
    return s > 0 && h().emit("player:inventoryChanged", {
      itemId: e,
      delta: -s
    }), s;
  }
  /**
   * Check if inventory has a certain amount of an item
   */
  hasItem(e, t = 1) {
    return this.getItemCount(e) >= t;
  }
  /**
   * Get total count of an item
   */
  getItemCount(e) {
    return this.slots.filter((t) => t.resourceId === e).reduce((t, i) => t + i.quantity, 0);
  }
  /**
   * Check if inventory has space for items
   */
  hasSpace(e, t = 1) {
    const s = H().getResource(e);
    if (!s) return !1;
    const n = s.stackSize;
    let a = 0;
    if (n > 1)
      for (const r of this.slots)
        r.resourceId === e && (a += n - r.quantity);
    for (const r of this.slots)
      r.resourceId === null && (a += n);
    return a >= t;
  }
  /**
   * Get number of empty slots
   */
  getEmptySlotCount() {
    return this.slots.filter((e) => e.resourceId === null).length;
  }
  /**
   * Check if inventory is full
   */
  isFull() {
    return this.getEmptySlotCount() === 0;
  }
  /**
   * Move item between slots
   */
  moveItem(e, t) {
    if (e < 0 || e >= this.slots.length || t < 0 || t >= this.slots.length || e === t) return !1;
    const i = this.slots[e], s = this.slots[t];
    if (s.resourceId === null)
      return s.resourceId = i.resourceId, s.quantity = i.quantity, s.durability = i.durability, i.resourceId = null, i.quantity = 0, i.durability = void 0, !0;
    if (s.resourceId === i.resourceId) {
      const r = H().getResource(s.resourceId);
      if (r && r.stackSize > 1) {
        const c = Math.min(i.quantity, r.stackSize - s.quantity);
        return s.quantity += c, i.quantity -= c, i.quantity <= 0 && (i.resourceId = null, i.quantity = 0, i.durability = void 0), !0;
      }
    }
    const n = { ...i };
    return i.resourceId = s.resourceId, i.quantity = s.quantity, i.durability = s.durability, s.resourceId = n.resourceId, s.quantity = n.quantity, s.durability = n.durability, !0;
  }
  /**
   * Use durability on an item (for tools/weapons)
   * Returns true if item broke
   */
  useDurability(e, t = 1) {
    const i = this.slots[e];
    if (!i || i.durability === void 0) return !1;
    if (i.durability -= t, i.durability <= 0) {
      const s = i.resourceId;
      return i.resourceId = null, i.quantity = 0, i.durability = void 0, h().emit("player:inventoryChanged", {
        itemId: s,
        delta: -1
      }), !0;
    }
    return !1;
  }
  /**
   * Clear the inventory
   */
  clear() {
    this.initializeSlots();
  }
  /**
   * Serialize for saving
   */
  serialize() {
    const e = [];
    for (const t of this.slots)
      t.resourceId && e.push({
        itemId: t.resourceId,
        quantity: t.quantity,
        durability: t.durability
      });
    return e;
  }
  /**
   * Deserialize from save data
   */
  deserialize(e) {
    this.clear();
    for (const t of e)
      this.addItem(t.itemId, t.quantity, t.durability);
  }
}
let U = null;
function Xe() {
  return U || (U = new Le()), U;
}
var Ge = /* @__PURE__ */ ((o) => (o.Hand = "hand", o.Workbench = "workbench", o.Furnace = "furnace", o.Anvil = "anvil", o.Alchemy = "alchemy", o.Loom = "loom", o))(Ge || {});
const Fe = [
  // ===== HAND CRAFTING (No station) =====
  {
    id: "craft_wooden_plank",
    name: "Wooden Plank",
    description: "Process wood into planks",
    inputs: [{ resourceId: "wood", quantity: 1, consumed: !0 }],
    outputs: [{ resourceId: "wooden_plank", quantity: 4 }],
    craftTime: 2,
    requiredStation: "hand"
    /* Hand */
  },
  {
    id: "craft_rope",
    name: "Rope",
    description: "Weave fibers into rope",
    inputs: [{ resourceId: "fiber", quantity: 5, consumed: !0 }],
    outputs: [{ resourceId: "rope", quantity: 1 }],
    craftTime: 3,
    requiredStation: "hand"
    /* Hand */
  },
  {
    id: "craft_bandage",
    name: "Bandage",
    description: "Create a simple bandage",
    inputs: [{ resourceId: "cloth", quantity: 2, consumed: !0 }],
    outputs: [{ resourceId: "bandage", quantity: 1 }],
    craftTime: 2,
    requiredStation: "hand"
    /* Hand */
  },
  {
    id: "craft_wooden_sword",
    name: "Wooden Sword",
    description: "Carve a basic wooden sword",
    inputs: [
      { resourceId: "wood", quantity: 3, consumed: !0 },
      { resourceId: "fiber", quantity: 2, consumed: !0 }
    ],
    outputs: [{ resourceId: "wooden_sword", quantity: 1 }],
    craftTime: 5,
    requiredStation: "hand"
    /* Hand */
  },
  {
    id: "craft_arrow",
    name: "Arrows",
    description: "Craft a bundle of arrows",
    inputs: [
      { resourceId: "wood", quantity: 1, consumed: !0 },
      { resourceId: "stone", quantity: 1, consumed: !0 },
      { resourceId: "fiber", quantity: 1, consumed: !0 }
    ],
    outputs: [{ resourceId: "arrow", quantity: 10 }],
    craftTime: 4,
    requiredStation: "hand"
    /* Hand */
  },
  // ===== WORKBENCH RECIPES =====
  {
    id: "craft_stone_pickaxe",
    name: "Stone Pickaxe",
    description: "Craft a stone mining tool",
    inputs: [
      { resourceId: "wood", quantity: 2, consumed: !0 },
      { resourceId: "stone", quantity: 3, consumed: !0 },
      { resourceId: "fiber", quantity: 2, consumed: !0 }
    ],
    outputs: [{ resourceId: "stone_pickaxe", quantity: 1 }],
    craftTime: 5,
    requiredStation: "workbench"
    /* Workbench */
  },
  {
    id: "craft_stone_axe",
    name: "Stone Axe",
    description: "Craft a stone woodcutting tool",
    inputs: [
      { resourceId: "wood", quantity: 2, consumed: !0 },
      { resourceId: "stone", quantity: 3, consumed: !0 },
      { resourceId: "fiber", quantity: 2, consumed: !0 }
    ],
    outputs: [{ resourceId: "stone_axe", quantity: 1 }],
    craftTime: 5,
    requiredStation: "workbench"
    /* Workbench */
  },
  {
    id: "craft_stone_sword",
    name: "Stone Sword",
    description: "Craft a stone blade",
    inputs: [
      { resourceId: "wood", quantity: 1, consumed: !0 },
      { resourceId: "stone", quantity: 4, consumed: !0 },
      { resourceId: "fiber", quantity: 2, consumed: !0 }
    ],
    outputs: [{ resourceId: "stone_sword", quantity: 1 }],
    craftTime: 6,
    requiredStation: "workbench"
    /* Workbench */
  },
  {
    id: "craft_bow",
    name: "Wooden Bow",
    description: "Craft a hunting bow",
    inputs: [
      { resourceId: "wood", quantity: 3, consumed: !0 },
      { resourceId: "fiber", quantity: 5, consumed: !0 }
    ],
    outputs: [{ resourceId: "bow", quantity: 1 }],
    craftTime: 8,
    requiredStation: "workbench"
    /* Workbench */
  },
  {
    id: "craft_stone_brick",
    name: "Stone Bricks",
    description: "Cut stone into building bricks",
    inputs: [{ resourceId: "stone", quantity: 2, consumed: !0 }],
    outputs: [{ resourceId: "stone_brick", quantity: 4 }],
    craftTime: 4,
    requiredStation: "workbench"
    /* Workbench */
  },
  // ===== FURNACE RECIPES =====
  {
    id: "smelt_iron",
    name: "Iron Ingot",
    description: "Smelt iron ore into an ingot",
    inputs: [
      { resourceId: "iron_ore", quantity: 2, consumed: !0 },
      { resourceId: "coal", quantity: 1, consumed: !0 }
    ],
    outputs: [{ resourceId: "iron_ingot", quantity: 1 }],
    craftTime: 10,
    requiredStation: "furnace"
    /* Furnace */
  },
  {
    id: "smelt_copper",
    name: "Copper Ingot",
    description: "Smelt copper ore into an ingot",
    inputs: [
      { resourceId: "copper_ore", quantity: 2, consumed: !0 },
      { resourceId: "coal", quantity: 1, consumed: !0 }
    ],
    outputs: [{ resourceId: "copper_ingot", quantity: 1 }],
    craftTime: 8,
    requiredStation: "furnace"
    /* Furnace */
  },
  {
    id: "smelt_gold",
    name: "Gold Ingot",
    description: "Smelt gold ore into an ingot",
    inputs: [
      { resourceId: "gold_ore", quantity: 2, consumed: !0 },
      { resourceId: "coal", quantity: 1, consumed: !0 }
    ],
    outputs: [{ resourceId: "gold_ingot", quantity: 1 }],
    craftTime: 12,
    requiredStation: "furnace"
    /* Furnace */
  },
  {
    id: "cook_meat",
    name: "Cooked Meat",
    description: "Cook raw meat",
    inputs: [
      { resourceId: "raw_meat", quantity: 1, consumed: !0 },
      { resourceId: "coal", quantity: 1, consumed: !0 }
    ],
    outputs: [{ resourceId: "cooked_meat", quantity: 1 }],
    craftTime: 5,
    requiredStation: "furnace"
    /* Furnace */
  },
  {
    id: "bake_bread",
    name: "Bread",
    description: "Bake bread from fiber (wheat)",
    inputs: [
      { resourceId: "fiber", quantity: 3, consumed: !0 },
      { resourceId: "coal", quantity: 1, consumed: !0 }
    ],
    outputs: [{ resourceId: "bread", quantity: 1 }],
    craftTime: 6,
    requiredStation: "furnace"
    /* Furnace */
  },
  // ===== ANVIL RECIPES =====
  {
    id: "craft_iron_pickaxe",
    name: "Iron Pickaxe",
    description: "Forge an iron mining tool",
    inputs: [
      { resourceId: "iron_ingot", quantity: 3, consumed: !0 },
      { resourceId: "wood", quantity: 2, consumed: !0 }
    ],
    outputs: [{ resourceId: "iron_pickaxe", quantity: 1 }],
    craftTime: 10,
    requiredStation: "anvil"
    /* Anvil */
  },
  {
    id: "craft_iron_axe",
    name: "Iron Axe",
    description: "Forge an iron woodcutting tool",
    inputs: [
      { resourceId: "iron_ingot", quantity: 3, consumed: !0 },
      { resourceId: "wood", quantity: 2, consumed: !0 }
    ],
    outputs: [{ resourceId: "iron_axe", quantity: 1 }],
    craftTime: 10,
    requiredStation: "anvil"
    /* Anvil */
  },
  {
    id: "craft_iron_sword",
    name: "Iron Sword",
    description: "Forge an iron blade",
    inputs: [
      { resourceId: "iron_ingot", quantity: 4, consumed: !0 },
      { resourceId: "wood", quantity: 1, consumed: !0 },
      { resourceId: "leather", quantity: 1, consumed: !0 }
    ],
    outputs: [{ resourceId: "iron_sword", quantity: 1 }],
    craftTime: 12,
    requiredStation: "anvil"
    /* Anvil */
  },
  // ===== LOOM RECIPES =====
  {
    id: "craft_cloth",
    name: "Cloth",
    description: "Weave fibers into cloth",
    inputs: [{ resourceId: "fiber", quantity: 4, consumed: !0 }],
    outputs: [{ resourceId: "cloth", quantity: 1 }],
    craftTime: 5,
    requiredStation: "loom"
    /* Loom */
  },
  // ===== ALCHEMY RECIPES =====
  {
    id: "brew_health_potion",
    name: "Health Potion",
    description: "Brew a healing potion",
    inputs: [
      { resourceId: "mushroom", quantity: 3, consumed: !0 },
      { resourceId: "berries", quantity: 2, consumed: !0 },
      { resourceId: "monster_essence", quantity: 1, consumed: !0 }
    ],
    outputs: [{ resourceId: "health_potion", quantity: 1 }],
    craftTime: 15,
    requiredStation: "alchemy"
    /* Alchemy */
  }
];
class Ee {
  recipes = /* @__PURE__ */ new Map();
  activeCrafts = /* @__PURE__ */ new Map();
  constructor() {
    for (const e of Fe)
      this.registerRecipe(e);
  }
  /**
   * Register a new recipe
   */
  registerRecipe(e) {
    this.recipes.set(e.id, e);
  }
  /**
   * Get a recipe by ID
   */
  getRecipe(e) {
    return this.recipes.get(e);
  }
  /**
   * Get all recipes
   */
  getAllRecipes() {
    return Array.from(this.recipes.values());
  }
  /**
   * Get recipes for a specific station
   */
  getRecipesForStation(e) {
    return this.getAllRecipes().filter((t) => t.requiredStation === e);
  }
  /**
   * Get recipe count (should be 20+ per spec)
   */
  getRecipeCount() {
    return this.recipes.size;
  }
  /**
   * Check if player can craft a recipe
   */
  canCraft(e, t, i = "hand") {
    const s = this.getRecipe(e);
    if (!s || s.requiredStation !== "hand" && s.requiredStation !== i)
      return !1;
    for (const n of s.inputs)
      if (!t.hasItem(n.resourceId, n.quantity))
        return !1;
    for (const n of s.outputs)
      if (!t.hasSpace(n.resourceId, n.quantity))
        return !1;
    return !0;
  }
  /**
   * Get missing ingredients for a recipe
   */
  getMissingIngredients(e, t) {
    const i = this.getRecipe(e);
    if (!i) return [];
    const s = [];
    for (const n of i.inputs) {
      const a = t.getItemCount(n.resourceId);
      a < n.quantity && s.push({
        resourceId: n.resourceId,
        have: a,
        need: n.quantity
      });
    }
    return s;
  }
  /**
   * Start crafting a recipe (for timed crafting)
   */
  startCraft(e, t, i = "hand") {
    const s = this.getRecipe(e);
    if (!s) return null;
    for (const a of s.inputs)
      a.consumed && t.removeItem(a.resourceId, a.quantity);
    const n = `${e}_${Date.now()}`;
    return this.activeCrafts.set(n, {
      recipe: s,
      startTime: Date.now(),
      stationId: i
    }), n;
  }
  /**
   * Check if a craft is complete
   */
  isCraftComplete(e) {
    const t = this.activeCrafts.get(e);
    return t ? (Date.now() - t.startTime) / 1e3 >= t.recipe.craftTime : !1;
  }
  /**
   * Get craft progress (0-1)
   */
  getCraftProgress(e) {
    const t = this.activeCrafts.get(e);
    if (!t) return 0;
    const i = (Date.now() - t.startTime) / 1e3;
    return Math.min(1, i / t.recipe.craftTime);
  }
  /**
   * Complete a craft and receive outputs
   */
  completeCraft(e, t) {
    const i = this.activeCrafts.get(e);
    if (!i || !this.isCraftComplete(e)) return !1;
    for (const s of i.recipe.outputs)
      t.addItem(s.resourceId, s.quantity);
    return this.activeCrafts.delete(e), !0;
  }
  /**
   * Cancel an active craft (ingredients are lost)
   */
  cancelCraft(e) {
    return this.activeCrafts.delete(e);
  }
  /**
   * Instant craft (for simple recipes or testing)
   */
  instantCraft(e, t, i = "hand") {
    if (!this.canCraft(e, t, i)) return !1;
    const s = this.getRecipe(e);
    for (const n of s.inputs)
      n.consumed && t.removeItem(n.resourceId, n.quantity);
    for (const n of s.outputs)
      t.addItem(n.resourceId, n.quantity);
    return !0;
  }
  /**
   * Get all craftable recipes with current inventory
   */
  getCraftableRecipes(e, t = "hand") {
    return this.getAllRecipes().filter(
      (i) => this.canCraft(i.id, e, t)
    );
  }
}
let N = null;
function Qe() {
  return N || (N = new Ee()), N;
}
const Ue = {
  maxHealth: 100,
  maxHunger: 100,
  maxStamina: 100,
  hungerDecayRate: 2,
  staminaRegenRate: 10,
  hungerCritical: 20,
  staminaCritical: 10,
  hungerHealthDrain: 1,
  hungerSpeedPenalty: 0.5,
  sprintStaminaCost: 15,
  attackStaminaCost: 10,
  mineStaminaCost: 5
};
class Ne {
  name = "SurvivalManager";
  config;
  health;
  hunger;
  stamina;
  isResting = !1;
  isSprinting = !1;
  isDead = !1;
  // Accumulator for hunger decay (tracks fractional game hours)
  hungerAccumulator = 0;
  constructor(e = {}) {
    this.config = { ...Ue, ...e }, this.health = this.config.maxHealth, this.hunger = this.config.maxHunger, this.stamina = this.config.maxStamina;
  }
  /**
   * Initialize the survival manager
   */
  initialize() {
    const e = h();
    e.on("input:actionPressed", (t) => {
      t.action === "sprint" && (this.isSprinting = !0);
    }), e.on("input:actionReleased", (t) => {
      t.action === "sprint" && (this.isSprinting = !1);
    }), console.log("[SurvivalManager] Initialized");
  }
  /**
   * Update survival mechanics each frame
   */
  update(e, t) {
    this.isDead || (this.updateHunger(e, t), this.updateStamina(e), this.applyCriticalEffects(e));
  }
  /**
   * Update hunger decay
   */
  updateHunger(e, t) {
    const i = 0.016666666666666666;
    if (this.hungerAccumulator += e * i * this.config.hungerDecayRate, this.hungerAccumulator >= 1) {
      const s = Math.floor(this.hungerAccumulator);
      this.hunger = Math.max(0, this.hunger - s), this.hungerAccumulator -= s;
    }
  }
  /**
   * Update stamina (drain if sprinting, regen if resting)
   */
  updateStamina(e) {
    if (this.isSprinting && this.stamina > 0)
      this.stamina = Math.max(0, this.stamina - this.config.sprintStaminaCost * e);
    else if (!this.isSprinting && this.stamina < this.config.maxStamina) {
      const t = this.isHungryCritical() ? 0.5 : 1;
      this.stamina = Math.min(
        this.config.maxStamina,
        this.stamina + this.config.staminaRegenRate * e * t
      );
    }
  }
  /**
   * Apply effects when survival stats are critical
   */
  applyCriticalEffects(e) {
    this.isHungryCritical() && this.takeDamage(this.config.hungerHealthDrain * e, "starvation");
  }
  // ==========================================================================
  // Public API - Health
  // ==========================================================================
  /**
   * Get current health
   */
  getHealth() {
    return this.health;
  }
  /**
   * Get max health
   */
  getMaxHealth() {
    return this.config.maxHealth;
  }
  /**
   * Take damage
   */
  takeDamage(e, t = "unknown") {
    if (this.isDead) return;
    this.health = Math.max(0, this.health - e), h().emit("entity:damaged", {
      entityId: "player",
      amount: e,
      sourceId: t
    }), this.health <= 0 && this.die();
  }
  /**
   * Heal the player
   */
  heal(e) {
    if (this.isDead) return;
    const t = this.health;
    this.health = Math.min(this.config.maxHealth, this.health + e);
    const i = this.health - t;
    i > 0 && h().emit("entity:healed", {
      entityId: "player",
      amount: i
    });
  }
  /**
   * Check if player is dead
   */
  isPlayerDead() {
    return this.isDead;
  }
  /**
   * Handle player death
   */
  die() {
    this.isDead = !0, h().emit("entity:died", {
      entityId: "player",
      killerId: null
    });
  }
  /**
   * Respawn player (reset stats)
   */
  respawn() {
    this.health = this.config.maxHealth, this.hunger = this.config.maxHunger, this.stamina = this.config.maxStamina, this.isDead = !1, this.hungerAccumulator = 0;
  }
  // ==========================================================================
  // Public API - Hunger
  // ==========================================================================
  /**
   * Get current hunger
   */
  getHunger() {
    return this.hunger;
  }
  /**
   * Get max hunger
   */
  getMaxHunger() {
    return this.config.maxHunger;
  }
  /**
   * Check if hunger is critical
   */
  isHungryCritical() {
    return this.hunger <= this.config.hungerCritical;
  }
  /**
   * Restore hunger (eating)
   */
  restoreHunger(e) {
    this.hunger = Math.min(this.config.maxHunger, this.hunger + e);
  }
  /**
   * Get speed multiplier based on hunger
   */
  getSpeedMultiplier() {
    return this.isHungryCritical() ? this.config.hungerSpeedPenalty : 1;
  }
  // ==========================================================================
  // Public API - Stamina
  // ==========================================================================
  /**
   * Get current stamina
   */
  getStamina() {
    return this.stamina;
  }
  /**
   * Get max stamina
   */
  getMaxStamina() {
    return this.config.maxStamina;
  }
  /**
   * Check if stamina is critical
   */
  isStaminaCritical() {
    return this.stamina <= this.config.staminaCritical;
  }
  /**
   * Check if player can sprint
   */
  canSprint() {
    return this.stamina > this.config.staminaCritical;
  }
  /**
   * Use stamina for an action
   * Returns true if action was possible
   */
  useStamina(e) {
    return this.stamina < e ? !1 : (this.stamina -= e, !0);
  }
  /**
   * Use stamina for attack
   */
  useAttackStamina() {
    return this.useStamina(this.config.attackStaminaCost);
  }
  /**
   * Use stamina for mining
   */
  useMineStamina() {
    return this.useStamina(this.config.mineStaminaCost);
  }
  // ==========================================================================
  // Public API - Consumables
  // ==========================================================================
  /**
   * Consume a food/consumable item
   * Returns true if consumed successfully
   */
  consume(e) {
    const t = H(), i = t.getResource(e);
    return !i || !t.isConsumable(e) ? !1 : (i.healAmount && (i.healAmount > 0 ? this.heal(i.healAmount) : this.takeDamage(-i.healAmount, "food_poisoning")), i.hungerRestore && this.restoreHunger(i.hungerRestore), !0);
  }
  // ==========================================================================
  // Stats Summary
  // ==========================================================================
  /**
   * Get all player stats
   */
  getStats() {
    return {
      health: this.health,
      maxHealth: this.config.maxHealth,
      hunger: this.hunger,
      maxHunger: this.config.maxHunger,
      stamina: this.stamina,
      maxStamina: this.config.maxStamina
    };
  }
  /**
   * Set stats (for loading saves)
   */
  setStats(e) {
    e.health !== void 0 && (this.health = e.health), e.hunger !== void 0 && (this.hunger = e.hunger), e.stamina !== void 0 && (this.stamina = e.stamina);
  }
  /**
   * Cleanup
   */
  destroy() {
    console.log("[SurvivalManager] Destroyed");
  }
}
let $ = null;
function Ye() {
  return $ || ($ = new Ne()), $;
}
class $e {
  name = "UIManager";
  state = {
    activePanels: /* @__PURE__ */ new Set([J.HUD]),
    modalStack: [],
    tooltipContent: null,
    tooltipPosition: null
  };
  // Panel render callbacks
  panelRenderers = /* @__PURE__ */ new Map();
  // UI element update callbacks (for external rendering systems)
  updateCallbacks = /* @__PURE__ */ new Set();
  /**
   * Initialize the UI manager
   */
  initialize() {
    const e = h();
    e.on("ui:tooltipShow", (t) => {
      this.showTooltip(t.content, t.position);
    }), e.on("ui:tooltipHide", () => {
      this.hideTooltip();
    }), console.log("[UIManager] Initialized");
  }
  /**
   * Update - notify render callbacks
   */
  update(e, t) {
    for (const i of this.updateCallbacks)
      i(this.state);
  }
  // ============================================================================
  // Panel Management
  // ============================================================================
  /**
   * Open a panel
   */
  openPanel(e, t = !1) {
    if (this.isPanelOpen(e))
      return;
    this.state.activePanels.add(e), t && this.state.modalStack.push(e), h().emit("ui:panelOpened", { panel: e });
  }
  /**
   * Close a panel
   */
  closePanel(e) {
    if (!this.isPanelOpen(e))
      return;
    this.state.activePanels.delete(e);
    const t = this.state.modalStack.indexOf(e);
    t !== -1 && this.state.modalStack.splice(t, 1), h().emit("ui:panelClosed", { panel: e });
  }
  /**
   * Toggle a panel
   */
  togglePanel(e, t = !1) {
    this.isPanelOpen(e) ? this.closePanel(e) : this.openPanel(e, t);
  }
  /**
   * Check if a panel is open
   */
  isPanelOpen(e) {
    return this.state.activePanels.has(e);
  }
  /**
   * Close the topmost modal
   */
  closeTopModal() {
    if (this.state.modalStack.length === 0)
      return !1;
    const e = this.state.modalStack.pop();
    return this.state.activePanels.delete(e), h().emit("ui:panelClosed", { panel: e }), !0;
  }
  /**
   * Close all modals
   */
  closeAllModals() {
    for (; this.closeTopModal(); )
      ;
  }
  /**
   * Get the topmost modal panel
   */
  getTopModal() {
    return this.state.modalStack.length === 0 ? null : this.state.modalStack[this.state.modalStack.length - 1];
  }
  /**
   * Check if any modal is open
   */
  hasOpenModal() {
    return this.state.modalStack.length > 0;
  }
  // ============================================================================
  // Tooltip Management
  // ============================================================================
  /**
   * Show a tooltip
   */
  showTooltip(e, t) {
    this.state.tooltipContent = e, this.state.tooltipPosition = { ...t };
  }
  /**
   * Hide the tooltip
   */
  hideTooltip() {
    this.state.tooltipContent = null, this.state.tooltipPosition = null;
  }
  /**
   * Check if tooltip is visible
   */
  isTooltipVisible() {
    return this.state.tooltipContent !== null;
  }
  /**
   * Get tooltip content
   */
  getTooltipContent() {
    return this.state.tooltipContent;
  }
  /**
   * Get tooltip position
   */
  getTooltipPosition() {
    return this.state.tooltipPosition;
  }
  // ============================================================================
  // Render Callback Management
  // ============================================================================
  /**
   * Register a panel renderer
   */
  registerPanelRenderer(e, t) {
    this.panelRenderers.set(e, t);
  }
  /**
   * Unregister a panel renderer
   */
  unregisterPanelRenderer(e) {
    this.panelRenderers.delete(e);
  }
  /**
   * Register an update callback
   */
  onUpdate(e) {
    return this.updateCallbacks.add(e), () => this.updateCallbacks.delete(e);
  }
  // ============================================================================
  // State Access
  // ============================================================================
  /**
   * Get all active panels
   */
  getActivePanels() {
    return this.state.activePanels;
  }
  /**
   * Get the modal stack
   */
  getModalStack() {
    return this.state.modalStack;
  }
  /**
   * Get the full UI state
   */
  getState() {
    return this.state;
  }
  /**
   * Cleanup
   */
  destroy() {
    this.state.activePanels.clear(), this.state.modalStack = [], this.panelRenderers.clear(), this.updateCallbacks.clear(), console.log("[UIManager] Destroyed");
  }
}
async function Ve() {
  const o = ae(), e = new _e(), t = new re(), i = new me(), s = new fe(), n = new Re(), a = new qe(), r = new Pe(), c = new $e();
  return i.setTilemapManager(t), n.setWalkableCheck((u, l) => t.isWalkable(u, l)), e.setScreenToWorldConverter((u, l) => a.screenToWorld(u, l, 800, 600)), o.registerSystem(e, 0), o.registerSystem(t, 1), o.registerSystem(i, 2), o.registerSystem(s, 3), o.registerSystem(n, 4), o.registerSystem(a, 5), o.registerSystem(r, 6), o.registerSystem(c, 7), await o.initialize(), o;
}
async function Ze() {
  console.log("Starting 2D RPG Game...");
  const o = await Ve(), e = o.getSystem("TilemapManager"), t = o.getSystem("PlayerController"), i = o.getSystem("CameraSystem");
  if (e) {
    for (let s = -10; s <= 10; s++)
      for (let n = -10; n <= 10; n++)
        e.setTile(s, n, 1, "grass");
    e.setTile(5, 5, 2, "tree"), e.setTile(-3, 2, 2, "tree"), e.setTile(7, -4, 2, "tree"), e.setTile(-5, -5, 2, "rock"), e.setTile(3, -7, 2, "rock");
  }
  t && t.setPosition(0, 0), i && i.snapTo(0, 0), o.start(), console.log("Game started! Use WASD to move.");
}
export {
  me as AutotileSystem,
  be as BiomeManager,
  V as BiomeType,
  qe as CameraSystem,
  Ee as CraftingManager,
  Ge as CraftingStation,
  T as Direction,
  se as EntityType,
  k as EventBus,
  M as GameEngine,
  _ as GamepadAxis,
  S as GamepadButton,
  oe as InputAction,
  _e as InputManager,
  Le as InventoryManager,
  x as NOISE_CONFIGS,
  ce as Neighbor4,
  ue as Neighbor8,
  ve as NoiseGenerator,
  J as PanelType,
  Re as PlayerController,
  Te as PlayerState,
  fe as RegionManager,
  ze as ResourceCategory,
  Oe as ResourceManager,
  Pe as SaveManager,
  Ne as SurvivalManager,
  m as TileLayer,
  R as TileRegistry,
  re as TilemapManager,
  $e as UIManager,
  Me as WorldGenerator,
  ke as getBiomeManager,
  Qe as getCraftingManager,
  h as getEventBus,
  ae as getGameEngine,
  Xe as getInventoryManager,
  H as getResourceManager,
  Ye as getSurvivalManager,
  W as getTileRegistry,
  je as getWorldGenerator,
  Ve as initializeGame,
  Ze as quickStart,
  Ke as resetWorldGenerator
};
//# sourceMappingURL=voxel-rpg.es.js.map
