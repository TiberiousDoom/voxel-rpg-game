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
          { id: 'p1-func-harvesting', label: 'Resource harvesting', description: 'Trees, rocks, and plants yield materials when broken' },
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
          { id: 'p1-func-contextual-hints', label: 'Contextual hints', description: 'Hints appear for new players explaining controls' },
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
];

/** Flat list of all criteria across all phases */
export const ALL_CRITERIA = TEST_PHASES.flatMap((phase) =>
  phase.categories.flatMap((cat) => cat.criteria)
);

/** Total count of criteria */
export const TOTAL_CRITERIA_COUNT = ALL_CRITERIA.length;
