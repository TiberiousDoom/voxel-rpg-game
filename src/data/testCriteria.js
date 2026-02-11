/**
 * Test Criteria — Phase 0 & Phase 1 exit criteria for QA tracking.
 *
 * Each criterion has a stable `id` used as IndexedDB key for persisted
 * status/notes/screenshots. Do NOT rename IDs after first use.
 */

export const TEST_PHASES = [
  {
    id: 'phase-0',
    name: 'Phase 0 — Foundation',
    categories: [
      {
        id: 'p0-functional',
        name: 'Functional',
        criteria: [
          { id: 'p0-func-infinite-world', label: 'Infinite world', description: 'Player can walk in any direction and terrain generates seamlessly' },
          { id: 'p0-func-chunk-load', label: 'Chunk loading', description: 'Chunks load around the player as they move' },
          { id: 'p0-func-chunk-unload', label: 'Chunk unloading', description: 'Chunks unload when far from the player to free memory' },
          { id: 'p0-func-block-place', label: 'Block placement', description: 'Player can place blocks in the world' },
          { id: 'p0-func-block-break', label: 'Block breaking', description: 'Player can break blocks in the world' },
          { id: 'p0-func-movement', label: 'Player movement', description: 'WASD movement works smoothly with physics' },
          { id: 'p0-func-camera', label: 'Camera controls', description: 'Camera rotation, zoom, and first/third person toggle work' },
          { id: 'p0-func-save-load', label: 'Save/Load', description: 'Game state persists across page reloads' },
          { id: 'p0-func-block-types', label: 'Block types', description: 'Multiple block types render with distinct appearance' },
        ],
      },
      {
        id: 'p0-performance',
        name: 'Performance',
        criteria: [
          { id: 'p0-perf-60fps', label: '60 FPS', description: 'Steady 60 FPS on mid-range hardware (no sustained drops)' },
          { id: 'p0-perf-chunk-gen', label: 'Chunk generation speed', description: 'New chunks generate without visible stutter' },
          { id: 'p0-perf-memory', label: 'Memory usage', description: 'Memory stays stable over extended play (no leaks)' },
          { id: 'p0-perf-mesh-rebuild', label: 'Mesh rebuild', description: 'Placing/breaking blocks updates mesh quickly' },
          { id: 'p0-perf-draw-calls', label: 'Draw calls', description: 'Instanced/greedy meshing keeps draw calls reasonable' },
          { id: 'p0-perf-mobile', label: 'Mobile performance', description: 'Playable frame rate on mobile devices' },
        ],
      },
      {
        id: 'p0-quality',
        name: 'Quality',
        criteria: [
          { id: 'p0-qual-no-holes', label: 'No terrain holes', description: 'No gaps or holes visible between chunks' },
          { id: 'p0-qual-no-flicker', label: 'No z-fighting/flicker', description: 'No visual flickering on block faces' },
          { id: 'p0-qual-no-console-errors', label: 'No console errors', description: 'No red errors in browser console during normal play' },
        ],
      },
    ],
  },
  {
    id: 'phase-1',
    name: 'Phase 1 — Survival & Gathering',
    categories: [
      {
        id: 'p1-functional',
        name: 'Functional',
        criteria: [
          { id: 'p1-func-health', label: 'Health system', description: 'Player has health bar that decreases on damage and can be restored' },
          { id: 'p1-func-hunger', label: 'Hunger system', description: 'Hunger drains over time and affects health when empty' },
          { id: 'p1-func-day-night', label: 'Day/night cycle', description: 'Sky and lighting change over time with visible sun/moon' },
          { id: 'p1-func-crafting', label: 'Crafting system', description: 'Player can craft items from gathered materials at crafting UI' },
          { id: 'p1-func-inventory', label: 'Inventory', description: 'Items and materials are tracked and displayed in inventory UI' },
          { id: 'p1-func-equipment', label: 'Equipment', description: 'Player can equip/unequip items with stat effects' },
          { id: 'p1-func-harvesting', label: 'Resource harvesting', description: 'Trees, rocks, berry bushes, and plants yield materials when broken' },
          { id: 'p1-func-tool-tiers', label: 'Tool tiers', description: 'Higher-tier pickaxes break harder blocks and yield better drops' },
          { id: 'p1-func-enemies', label: 'Enemy spawning', description: 'Enemies spawn and have basic AI (approach, attack player)' },
          { id: 'p1-func-combat', label: 'Combat', description: 'Player can attack enemies and take damage from them' },
          { id: 'p1-func-xp-level', label: 'XP & leveling', description: 'Killing enemies grants XP; leveling up increases stats' },
          { id: 'p1-func-death', label: 'Death & respawn', description: 'Player death shows death screen with cause; respawn works' },
          { id: 'p1-func-spells', label: 'Spell system', description: 'Player can cast spells (fireball, heal, etc.) with mana cost' },
          { id: 'p1-func-hotbar', label: 'Block hotbar', description: 'Player can switch between block types via hotbar' },
          { id: 'p1-func-rifts', label: 'Rift portals', description: 'Rifts spawn with waves of enemies for challenge content' },
          { id: 'p1-func-loot-drops', label: 'Loot drops', description: 'Enemies drop loot/XP orbs that player can collect' },
          { id: 'p1-func-food-consume', label: 'Food consumption', description: 'Eating food restores hunger and/or health' },
          { id: 'p1-func-sprint', label: 'Sprint', description: 'Shift to sprint with stamina drain' },
          { id: 'p1-func-contextual-hints', label: 'Contextual hints', description: 'Hints appear contextually: WASD/SPACE movement, I for inventory, click enemies to attack, Tab for build mode, Shift to sprint, H for potions when low HP, 1-6 for spells + Ctrl for spell wheel, V for first-person, hunger warning (mine berry bushes), night warning, shelter hint' },
          { id: 'p1-func-build-mode', label: 'Build mode toggle', description: 'Tab toggles build mode — mining/placing only works in build mode; movement/attack disabled; badge + hotbar shown' },
        ],
      },
      {
        id: 'p1-quality',
        name: 'Quality',
        criteria: [
          { id: 'p1-qual-ui-readable', label: 'UI readability', description: 'All UI panels are readable and usable on both desktop and mobile' },
          { id: 'p1-qual-no-stuck', label: 'No getting stuck', description: 'Player cannot get stuck in terrain or objects' },
          { id: 'p1-qual-mobile-controls', label: 'Mobile controls', description: 'Touch controls work for movement, camera, and interaction' },
          { id: 'p1-qual-sound-free', label: 'No sound errors', description: 'No AudioContext or sound-related errors (or sounds play correctly)' },
          { id: 'p1-qual-save-survival', label: 'Survival state saves', description: 'Hunger, world time, and survival state persist across save/load' },
        ],
      },
    ],
  },
  {
    id: 'phase-2',
    name: 'Phase 2 — Colony Alpha (Batch 1)',
    categories: [
      {
        id: 'p2-settlement',
        name: 'Settlement Loop',
        criteria: [
          { id: 'p2-sett-campfire-place', label: 'Campfire placement', description: 'Campfire block (warm orange) appears in hotbar slot 9; can be placed in build mode' },
          { id: 'p2-sett-campfire-mine', label: 'Campfire mining', description: 'Mining a campfire drops 2 wood' },
          { id: 'p2-sett-center-detect', label: 'Settlement center detection', description: 'After placing a campfire, store.settlement.settlementCenter is set within ~5 seconds' },
          { id: 'p2-sett-attractiveness', label: 'Attractiveness calc', description: 'After ~10s with campfire placed, store.settlement.attractiveness >= 20' },
          { id: 'p2-sett-npc-spawn', label: 'NPC immigration', description: 'After immigration interval, a settler NPC spawns at world edge (64-96 blocks from center)' },
          { id: 'p2-sett-npc-visible', label: 'NPC 3D appearance', description: 'Settler NPC is visible as a voxel humanoid with colored skin/hair/clothing and a blue indicator cube' },
          { id: 'p2-sett-npc-walk', label: 'NPC walks to settlement', description: 'NPC walks toward campfire with leg animation; arrives and transitions to IDLE state' },
          { id: 'p2-sett-npc-needs', label: 'NPC needs cycle', description: 'Over time hunger/rest decrease; NPC enters EATING/SLEEPING states then returns to IDLE' },
          { id: 'p2-sett-npc-wander', label: 'NPC wandering', description: 'Idle NPCs occasionally wander within radius of settlement center' },
          { id: 'p2-sett-save-load', label: 'Settlement save/load', description: 'Save → reload → NPCs persist with positions, states, appearance, and settlement center' },
          { id: 'p2-sett-max-npcs', label: 'NPC cap', description: 'No more than 5 NPCs spawn (IMMIGRATION_MAX_NPCS)' },
        ],
      },
      {
        id: 'p2-use-key',
        name: 'E Key Interact',
        criteria: [
          { id: 'p2-use-berry-fp', label: 'Harvest berry (1P)', description: 'In first-person near a berry bush, press E → berries added to inventory, bush removed, floating text' },
          { id: 'p2-use-campfire-3p', label: 'Pick up campfire (3P)', description: 'In third-person near a campfire, press E → wood added to inventory, campfire removed' },
          { id: 'p2-use-nothing', label: 'E key no-op', description: 'Pressing E when not near a usable block does nothing (no errors)' },
          { id: 'p2-use-cooldown', label: 'E key cooldown', description: 'Rapid E presses only trigger once per 300ms' },
          { id: 'p2-use-hint', label: 'E key hint', description: 'After 30s of play, a contextual hint says "Press E to pick up items or harvest bushes"' },
        ],
      },
      {
        id: 'p2-quality',
        name: 'Quality',
        criteria: [
          { id: 'p2-qual-build', label: 'Clean build', description: 'npm run build passes with no errors (only pre-existing @mediapipe warning)' },
          { id: 'p2-qual-no-combat-npc', label: 'NPCs not targetable', description: 'Settler NPCs are NOT attacked by player spells or combat system (userData.isNPC, not isEnemy)' },
          { id: 'p2-qual-terrain-clamp', label: 'NPC terrain clamping', description: 'NPCs walk on terrain surface without floating or falling through' },
          { id: 'p2-qual-no-console-errors', label: 'No console errors', description: 'No new red errors in browser console from settlement or E-key systems' },
        ],
      },
    ],
  },
];

/** Flat list of all criteria across all phases */
export const ALL_CRITERIA = TEST_PHASES.flatMap((phase) =>
  phase.categories.flatMap((cat) => cat.criteria)
);

/** Total count of criteria */
export const TOTAL_CRITERIA_COUNT = ALL_CRITERIA.length;

/**
 * Auto-detection checks — maps criterion ID to a function that takes
 * the Zustand store state and returns true when the criterion is satisfied.
 * Used to auto-promote 'untested' → 'pass'; never overrides manual status.
 */
export const AUTO_CHECKS = {
  // Phase 1 — Survival & Gathering
  'p1-func-hunger': (s) => s.hunger.current < s.hunger.max,
  'p1-func-day-night': (s) => s.worldTime.isNight === true,
  'p1-func-enemies': (s) => s.enemies.length > 0,
  'p1-func-xp-level': (s) => s.player.xp > 0 || s.player.level > 1,
  'p1-func-rifts': (s) => s.rifts.length > 0,
  'p1-func-loot-drops': (s) => s.lootDrops.length > 0 || s.xpOrbs.length > 0,
  'p1-func-build-mode': (s) => s.buildMode === true,
  'p1-func-sprint': (s) => s.player.isSprinting === true,

  // Phase 2 — Settlement
  'p2-sett-center-detect': (s) => s.settlement.settlementCenter !== null,
  'p2-sett-attractiveness': (s) => s.settlement.attractiveness >= 20,
  'p2-sett-npc-spawn': (s) => s.settlement.npcs.length > 0,
  'p2-sett-npc-walk': (s) => s.settlement.npcs.some((n) => n.state === 'IDLE'),
  'p2-sett-npc-needs': (s) => s.settlement.npcs.some((n) => n.state === 'EATING' || n.state === 'SLEEPING'),
  'p2-sett-npc-wander': (s) => s.settlement.npcs.some((n) => n.state === 'WANDERING'),
  'p2-sett-max-npcs': (s) => s.settlement.npcs.length > 0 && s.settlement.npcs.length <= 5,
};
