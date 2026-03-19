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
        id: 'p2-npc-lifecycle',
        name: 'NPC Lifecycle',
        criteria: [
          { id: 'p2-npc-eval-state', label: 'NPC evaluation state', description: 'Arriving NPC enters EVALUATING state (cyan indicator) for ~8 seconds before joining, with slow look-around animation' },
          { id: 'p2-npc-arrival-notif', label: 'Arrival notification', description: 'Green "New Settler!" notification appears when NPC finishes evaluating and joins' },
          { id: 'p2-npc-social-need', label: 'Social need', description: 'NPCs have a social need that decays over time; when critical, NPC walks to nearest NPC and socializes (pink indicator)' },
          { id: 'p2-npc-happiness', label: 'Happiness tracking', description: 'NPC happiness is computed from hunger, rest, social, and personality; visible in game state' },
          { id: 'p2-npc-departure-warn', label: 'Departure warning', description: 'NPC unhappy for 2+ in-game days shows a warning notification' },
          { id: 'p2-npc-departure-leave', label: 'NPC leaves', description: 'NPC unhappy for 3+ in-game days enters LEAVING state (red indicator), walks to edge, and is removed' },
          { id: 'p2-npc-personality', label: 'Personality effects', description: 'Personality traits affect behavior: diligent/lazy change idle timers, brave/cautious change wander radius, cheerful/grumpy adjust happiness' },
          { id: 'p2-npc-housing-cap', label: 'Housing-based pop cap', description: 'Max NPC count is limited by housing slots (wall blocks / 25), minimum 3, max IMMIGRATION_MAX_NPCS' },
        ],
      },
      {
        id: 'p2-visual',
        name: 'Visual & Terrain',
        criteria: [
          { id: 'p2-vis-campfire-glow', label: 'Campfire night glow', description: 'Campfire blocks remain bright at night via per-vertex emissive shader; not dimmed by scene lighting' },
          { id: 'p2-vis-corruption-z1', label: 'Corruption zone 1', description: 'Within 16 blocks of rift: 100% corrupted stone, tree trunks become dead wood (gray)' },
          { id: 'p2-vis-corruption-z2', label: 'Corruption zone 2', description: '17-28 blocks from rift: 80% corrupted stone / 20% corrupted grass, trunks become dead wood, no living vegetation' },
          { id: 'p2-vis-corruption-z3', label: 'Corruption zone 3', description: '29-32 blocks from rift: 50% ground becomes corrupted grass, ALL leaves become dead leaves (brown), no living canopy' },
          { id: 'p2-vis-dead-blocks', label: 'Dead block types', description: 'Dead Leaves (brown, transparent) and Dead Wood (gray) render distinctly from living versions' },
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
  {
    id: 'phase-2b',
    name: 'Phase 2 — Colony Alpha (Batch 2)',
    categories: [
      {
        id: 'p2-zones',
        name: 'Zone Designation (2.2)',
        criteria: [
          { id: 'p2-zone-create-mining', label: 'Create mining zone', description: 'Player can create a MINING zone via click-drag in zone mode (Z key)' },
          { id: 'p2-zone-create-stockpile', label: 'Create stockpile zone', description: 'Player can create a STOCKPILE zone via click-drag in zone mode' },
          { id: 'p2-zone-persist', label: 'Zone save/load', description: 'Zones persist across save/load (V4 migration)' },
          { id: 'p2-zone-limit', label: 'Zone limit enforced', description: 'Max 10 zones; 11th attempt shows notification' },
          { id: 'p2-zone-preview', label: 'Zone preview', description: 'Zone preview rectangle visible during drag placement' },
          { id: 'p2-zone-colors', label: 'Zone overlay colors', description: 'Mining zones render orange; stockpile zones render blue' },
          { id: 'p2-zone-delete', label: 'Zone deletion', description: 'Right-click on a zone removes it' },
          { id: 'p2-zone-hotbar', label: 'Zone hotbar UI', description: 'Zone hotbar shows type selector, zone count, and instructions when in zone mode' },
          { id: 'p2-zone-mode-toggle', label: 'Zone mode toggle', description: 'Z key toggles zone mode on/off; Tab exits zone mode and enters build mode' },
          { id: 'p2-zone-mining-scan', label: 'Mining zone scan', description: 'Creating a mining zone scans solid blocks within bounds and stores miningTasks on the zone' },
          { id: 'p2-zone-mobile', label: 'Mobile zone placement', description: 'Two-tap zone placement works on mobile (tap corner1, tap corner2)' },
        ],
      },
      {
        id: 'p2-stockpile',
        name: 'Stockpile System (2.3)',
        criteria: [
          { id: 'p2-stock-deposit', label: 'Deposit resources', description: 'Resources can be deposited into stockpile slots' },
          { id: 'p2-stock-withdraw', label: 'Withdraw resources', description: 'Resources can be withdrawn from stockpile slots' },
          { id: 'p2-stock-reserve', label: 'Slot reservation', description: 'Reservation prevents two NPCs claiming same stockpile slot' },
          { id: 'p2-stock-visual', label: 'Stockpile visuals', description: 'Resource items visible on stockpile ground' },
          { id: 'p2-stock-capacity', label: 'Capacity limit', description: 'Stockpile capacity enforced (ground blocks x stack limit)' },
          { id: 'p2-stock-persist', label: 'Stockpile save/load', description: 'Stockpile contents persist in save/load' },
          { id: 'p2-haul-pickup', label: 'NPC hauling', description: 'NPCs pick up dropped items and deliver to stockpiles' },
          { id: 'p2-haul-priority', label: 'Haul priority', description: 'Priority system ensures construction materials hauled first' },
          { id: 'p2-haul-timeout', label: 'Haul timeout', description: 'Task timeout prevents stuck haul claims' },
        ],
      },
      {
        id: 'p2-construction',
        name: 'Construction System (2.4)',
        criteria: [
          { id: 'p2-build-blueprint', label: 'Blueprint placement', description: 'Player can browse and place building blueprints with ghost preview' },
          { id: 'p2-build-validate', label: 'Blueprint validation', description: 'Validation prevents invalid placement (uneven terrain, overlap, out of territory)' },
          { id: 'p2-build-ghost', label: 'Ghost blocks', description: 'Placed blueprint shows translucent ghost blocks at each position' },
          { id: 'p2-build-haul-mats', label: 'Material delivery', description: 'NPCs haul required materials to construction site' },
          { id: 'p2-build-block-place', label: 'Block-by-block build', description: 'Builder NPCs place blocks in correct order (bottom-up)' },
          { id: 'p2-build-progress', label: 'Construction progress', description: 'Progress bar visible above construction site' },
          { id: 'p2-build-complete', label: 'Building completion', description: 'Completed building becomes functional with effects' },
          { id: 'p2-build-multi-builder', label: 'Multiple builders', description: 'Multiple builder NPCs can work one site (up to 3 cap)' },
          { id: 'p2-build-pause', label: 'Material stall', description: 'Construction pauses when materials run out' },
          { id: 'p2-build-effects', label: 'Building effects', description: 'Buildings provide housing, storage, production, or happiness bonuses' },
          { id: 'p2-build-upgrade', label: 'Building upgrades', description: 'Buildings can be upgraded to higher tiers' },
        ],
      },
      {
        id: 'p2-work-loop',
        name: 'NPC Work Loop (2.5)',
        criteria: [
          { id: 'p2-work-find', label: 'NPCs find work', description: 'Idle NPCs find and claim work within 5 seconds' },
          { id: 'p2-work-needs-priority', label: 'Needs over work', description: 'NPCs prioritize critical needs (hunger/rest) over work tasks' },
          { id: 'p2-work-specialize', label: 'Skill specialization', description: 'Skill matching produces visible specialization (miners mine, builders build)' },
          { id: 'p2-work-no-conflict', label: 'No task conflicts', description: 'No two NPCs claim the same task simultaneously' },
          { id: 'p2-work-interrupt', label: 'Graceful interrupt', description: 'Interrupted NPCs resume work after satisfying need' },
          { id: 'p2-work-mine', label: 'NPC autonomous mining', description: 'NPCs mine blocks within designated mining zone without commands' },
          { id: 'p2-work-anim', label: 'Work animations', description: 'Player can tell what each NPC is doing at a glance (mining/hauling/building)' },
          { id: 'p2-work-thought', label: 'Thought bubbles', description: 'NPCs show thought bubbles for needs and work status' },
        ],
      },
      {
        id: 'p2-needs',
        name: 'NPC Needs & Daily Life (2.6)',
        criteria: [
          { id: 'p2-needs-eat', label: 'Autonomous eating', description: 'Hungry NPCs seek food from stockpile autonomously' },
          { id: 'p2-needs-rest', label: 'Autonomous rest', description: 'Tired NPCs rest in assigned housing' },
          { id: 'p2-needs-social-seek', label: 'Social seeking', description: 'Lonely NPCs seek social interaction with nearest NPC' },
          { id: 'p2-needs-shelter', label: 'Night shelter', description: 'NPCs seek shelter at night' },
          { id: 'p2-needs-critical', label: 'Critical needs interrupt', description: 'Critical needs (hunger<15, rest<10) interrupt work' },
          { id: 'p2-needs-slow', label: 'Unhappy work penalty', description: 'Unhappy NPCs (happiness<40) work 25% slower' },
          { id: 'p2-needs-leave', label: 'Unhappy departure', description: 'Very unhappy NPCs leave after 3 days (warning at day 2)' },
          { id: 'p2-needs-bars', label: 'Need bars visible', description: 'Need bars visible when NPC is selected' },
          { id: 'p2-needs-schedule', label: 'Daily schedule', description: 'NPCs follow a day/night routine (work, eat, sleep)' },
          { id: 'p2-needs-housing', label: 'Housing assignment', description: 'NPCs auto-assigned to housing on arrival; sleep in assigned housing' },
          { id: 'p2-needs-homeless', label: 'Homeless penalty', description: 'Homeless NPCs suffer happiness penalty' },
        ],
      },
      {
        id: 'p2-ui',
        name: 'Settlement UI (2.7)',
        criteria: [
          { id: 'p2-ui-dashboard', label: 'Settlement dashboard', description: 'Dashboard shows population, resources, buildings, alerts (N key)' },
          { id: 'p2-ui-dash-alerts', label: 'Dashboard alerts', description: 'Alerts highlight problems (homeless, hungry, stalled construction)' },
          { id: 'p2-ui-npc-detail', label: 'NPC detail panel', description: 'Click NPC to see identity, needs, skills, activity, schedule' },
          { id: 'p2-ui-npc-actions', label: 'NPC actions', description: 'Follow, go-to, prioritize, and reassign housing actions work' },
          { id: 'p2-ui-building-panel', label: 'Building panel', description: 'Click building to see status, occupants, upgrade options' },
          { id: 'p2-ui-mobile', label: 'UI mobile-friendly', description: 'All settlement UI panels readable on 375px width' },
        ],
      },
      {
        id: 'p2-integration',
        name: 'Integration & Balance (2.8)',
        criteria: [
          { id: 'p2-int-loop', label: 'Full settlement loop', description: 'Campfire → NPC arrives → zones → mine → haul → build → grow' },
          { id: 'p2-int-autonomous', label: 'NPC autonomy', description: 'NPCs work autonomously without player micromanagement' },
          { id: 'p2-int-no-idle', label: 'No idle when work exists', description: 'No NPC stands idle when work exists (within 10 seconds)' },
          { id: 'p2-int-night', label: 'Night cycle works', description: 'Settlement functions during night (NPCs sleep, resume at dawn)' },
          { id: 'p2-int-pathfind', label: 'No pathfinding deadlocks', description: 'No pathfinding deadlocks with 8+ NPCs' },
          { id: 'p2-int-save-all', label: 'Save all Phase 2 state', description: 'All Phase 2 state persists: NPCs, zones, stockpiles, construction, housing' },
          { id: 'p2-int-60fps', label: '60 FPS with settlement', description: '60 FPS maintained with 8 NPCs, 4 stockpiles, 3 construction sites' },
          { id: 'p2-int-hints', label: 'Tutorial hints', description: 'Settlement tutorial hints trigger at correct moments and do not repeat' },
          { id: 'p2-int-growth', label: 'Settlement growth pace', description: 'New player can grow settlement to 5 NPCs within 15 in-game days' },
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

  // Phase 2 — NPC Lifecycle
  'p2-npc-eval-state': (s) => s.settlement.npcs.some((n) => n.state === 'EVALUATING'),
  'p2-npc-social-need': (s) => s.settlement.npcs.some((n) => n.state === 'SOCIALIZING'),
  'p2-npc-happiness': (s) => s.settlement.npcs.some((n) => typeof n.happiness === 'number'),
  'p2-npc-departure-leave': (s) => s.settlement.npcs.some((n) => n.state === 'LEAVING'),
  'p2-npc-housing-cap': (s) => s.settlement.wallCount > 0,

  // Phase 2 — Zone Designation (2.2)
  'p2-zone-create-mining': (s) => s.zones.some((z) => z.type === 'MINING'),
  'p2-zone-create-stockpile': (s) => s.zones.some((z) => z.type === 'STOCKPILE'),
  'p2-zone-persist': (s) => s.zones.length > 0,
  'p2-zone-mode-toggle': (s) => s.zoneMode === true,
  'p2-zone-mining-scan': (s) => s.zones.some((z) => z.type === 'MINING' && z.miningTasks && z.miningTasks.length > 0),
  'p2-zone-colors': (s) => s.zones.length > 0,

  // Phase 2 — NPC Needs & Daily Life (2.6) — auto-detectable states
  'p2-needs-eat': (s) => s.settlement.npcs.some((n) => n.state === 'EATING'),
  'p2-needs-rest': (s) => s.settlement.npcs.some((n) => n.state === 'SLEEPING'),
  'p2-needs-social-seek': (s) => s.settlement.npcs.some((n) => n.state === 'SOCIALIZING'),
  'p2-needs-schedule': (s) => s.settlement.npcs.some((n) => n.state === 'SLEEPING' || n.state === 'EATING'),
};
