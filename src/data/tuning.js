/**
 * tuning.js — Centralized game balance constants
 *
 * Every gameplay-affecting number lives here. Change one value,
 * see the effect immediately. Each constant includes:
 *   - What it controls
 *   - Acceptable range for playtesting
 *
 * Architectural constants (chunk size, voxel size, etc.) stay in src/shared/config.js.
 * Block-level building voxel layouts stay in src/data/buildingBlueprints.js.
 */

// ─── World Time ──────────────────────────────────────────────
// 20 real minutes = 1 in-game day. Range: 300–3600.
export const DAY_LENGTH_SECONDS = 1200;

// timeOfDay thresholds (0.0 = midnight, 0.5 = noon, 1.0 = next midnight)
export const SUNRISE_START = 0.20; // ~4:48 AM — sky starts to lighten
export const SUNRISE_END = 0.30;   // ~7:12 AM — full daylight
export const SUNSET_START = 0.70;  // ~4:48 PM — sky starts to dim
export const SUNSET_END = 0.80;    // ~7:12 PM — full darkness

// ─── Day/Night Lighting ──────────────────────────────────────
// Ambient light intensity. Range: 0.0–1.0.
export const LIGHT_AMBIENT_NIGHT = 0.3;
export const LIGHT_AMBIENT_DAY = 0.7;

// Directional (sun/moon) light intensity. Range: 0.0–1.5.
export const LIGHT_DIRECTIONAL_NIGHT = 0.3;
export const LIGHT_DIRECTIONAL_DAY = 1.0;

// Sky colors by time of day
export const SKY_COLORS = {
  MIDNIGHT: '#0a0a2e',
  PRE_DAWN: '#1a1a3e',
  SUNRISE: '#ff7744',
  MORNING: '#87ceeb',
  NOON: '#87ceeb',
  SUNSET: '#ff6633',
  DUSK: '#2a1a3e',
  NIGHT: '#0a0a2e',
};

// ─── Hunger ──────────────────────────────────────────────────
// Hunger drain: points per real second. 0.5/60 = full depletion in ~200 min (~10 in-game days).
// Range: 0.002–0.05. Start generous; tighten during balance pass.
export const HUNGER_DRAIN_RATE = 0.5 / 60; // ~0.00833 per second
export const SPRINT_HUNGER_MULTIPLIER = 2.0;

// Hunger thresholds (out of 100)
export const HUNGER_WELL_FED = 60;    // Above: full health regen
export const HUNGER_STARVING = 20;    // Below: no health regen, -20% speed
export const HUNGER_MAX = 100;

// Starvation damage: HP per second when hunger = 0. Range: 0.05–0.5.
export const STARVATION_DAMAGE_RATE = 0.1; // 1 HP per 10 seconds

// ─── Shelter ─────────────────────────────────────────────────
export const SHELTER_HUNGER_REDUCTION = 0.25;    // 25% less hunger drain in shelter
export const SHELTER_HEALTH_REGEN_MULT = 2.0;    // 2× health regen in shelter
export const SHELTER_STAMINA_REGEN_MULT = 1.5;   // 1.5× stamina regen in shelter
export const SHELTER_MONSTER_EXCLUSION = 16;      // No spawns within N world units of sheltered player
export const SHELTER_RAY_RANGE_UP = 8;            // Max roof detection distance (blocks)
export const SHELTER_RAY_RANGE_HORIZ = 4;         // Max wall detection distance (blocks)
export const SHELTER_CHECK_INTERVAL = 2000;       // ms between shelter checks

// ─── Mining ──────────────────────────────────────────────────
// harvestSpeed values per tool tier (divides block hardness to get break time in seconds)
export const HARVEST_SPEED_BARE_HANDS = 0.5;
export const HARVEST_SPEED_WOOD = 1.0;
export const HARVEST_SPEED_STONE = 1.2;
export const HARVEST_SPEED_IRON = 1.5;
export const HARVEST_SPEED_DIAMOND = 2.0;

// Tool durability (uses before breaking). Range: 20–2000.
export const DURABILITY_WOOD = 30;
export const DURABILITY_STONE = 65;
export const DURABILITY_IRON = 250;
export const DURABILITY_DIAMOND = 1000;

// ─── Tool Tiers ──────────────────────────────────────────────
export const TOOL_TIER = {
  NONE: 0,
  WOOD: 1,
  STONE: 2,
  IRON: 3,
  DIAMOND: 4,
};

// ─── Night Threats / Rift Spawning ───────────────────────────
export const RIFT_DENSITY = 0.25;              // Rifts per chunk (~1 per 4 chunks)
export const RIFT_MIN_SPAWN_DISTANCE = 96;     // World units from spawn point (safe zone)
export const RIFT_MIN_SEPARATION = 128;        // World units between rifts (no clustering)
export const RIFT_SPAWN_RADIUS = 10;           // Monster spawn radius around rift center

export const RIFT_SPAWN_INTERVAL_DAY = 120;    // Seconds between spawns (daytime)
export const RIFT_SPAWN_INTERVAL_DUSK = 60;
export const RIFT_SPAWN_INTERVAL_NIGHT = 20;
export const RIFT_POP_CAP_DAY = 3;             // Max monsters per rift (daytime)
export const RIFT_POP_CAP_NIGHT = 8;           // Max monsters per rift (nighttime)
export const RIFT_ACTIVE_RANGE = 80;           // Only tick rifts within physics collider range (~3 chunks)
export const RIFT_DORMANT_DURATION = 300;      // Seconds of dormancy when blocks destroyed

// Rift terrain corruption radii (in blocks, 1 block = 2 world units)
export const CORRUPTION_RADIUS_FULL = 16;      // Z1: 100% → corrupted stone
export const CORRUPTION_RADIUS_HEAVY = 28;     // Z2: 80% corrupted stone, 20% corrupted grass
export const CORRUPTION_RADIUS_LIGHT = 32;     // Z3: 50% → corrupted grass (starts at Z2 boundary)

export const RIFT_NOCTURNAL_DAMAGE_MULT = 1.5; // Night monster damage multiplier
export const RIFT_NOCTURNAL_SPEED_MULT = 1.25; // Night monster speed multiplier

// Monster aggro ranges (world units)
export const AGGRO_RANGE_DAY = 8;
export const AGGRO_RANGE_NIGHT = 16;

// ─── Death Consequences ──────────────────────────────────────
export const DEATH_MATERIAL_DROP_PERCENT = 0.5;  // Drop 50% of materials
export const DEATH_LOOT_DESPAWN_MINUTES = 5;     // Loot bag lifetime (in-game minutes)
export const DEATH_RESPAWN_HEALTH_PERCENT = 0.5;  // Respawn at 50% health
export const DEATH_RESPAWN_HUNGER_PERCENT = 0.5;
export const DEATH_RESPAWN_STAMINA_PERCENT = 0.5;
export const DEATH_TOOL_DURABILITY_LOSS = 0.25;   // 25% durability lost on death

// ─── Food (hunger restore) ───────────────────────────────────
export const FOOD_BERRY_RESTORE = 10;
export const FOOD_APPLE_RESTORE = 15;
export const FOOD_RAW_MEAT_RESTORE = 15;
export const FOOD_COOKED_MEAT_RESTORE = 35;
export const FOOD_BREAD_RESTORE = 25;
export const FOOD_MUSHROOM_STEW_RESTORE = 30;

// ─── Food (health restore) ──────────────────────────────────
export const FOOD_BERRY_HEAL = 5;
export const FOOD_RAW_MEAT_HEAL = 8;
export const FOOD_COOKED_MEAT_HEAL = 20;

// Food source density (per chunk in appropriate biomes)
export const BERRY_BUSHES_PER_CHUNK = 1.5;     // Average 1-2 per chunk
export const ANIMALS_PER_CHUNK = 0.5;          // Average 0-1 per chunk
export const APPLE_DROP_CHANCE = 0.10;         // 10% from leaves

// ─── Jump ────────────────────────────────────────────────────
export const JUMP_IMPULSE = 12;              // Vertical velocity on jump (clears ~1.5 blocks)
export const JUMP_STAMINA_COST = 25;         // Stamina consumed per jump
export const JUMP_GROUNDED_THRESHOLD = 0.1;  // Max |velY| to count as grounded (tight to prevent air-jumps)
export const JUMP_COOLDOWN_MS = 500;         // Min ms between jumps (prevents hold-to-spam)

// ─── Mobile Controls ─────────────────────────────────────────
export const AUTO_JUMP_COOLDOWN_MS = 250;
export const AUTO_JUMP_DETECT_RANGE = 2.5;     // World units ahead of player (~1.25 blocks)
export const AUTO_JUMP_IMPULSE = 10;           // Slightly less than manual jump (12)
export const AUTO_JUMP_MIN_SPEED = 0.5;        // Min XZ velocity to trigger

export const CAMERA_MIN_DISTANCE = 4;
export const CAMERA_MAX_DISTANCE = 30;
export const CAMERA_DEFAULT_DISTANCE = 12;
export const CAMERA_ZOOM_SPEED = 0.02;         // Pinch sensitivity
export const CAMERA_ZOOM_LERP = 0.1;           // Smoothing factor
export const CAMERA_HEIGHT_RATIO = 0.83;        // height = distance × ratio
export const CAMERA_ROTATION_SENSITIVITY = 0.008; // Radians per pixel

// Gesture disambiguation
export const TAP_MAX_DURATION_MS = 200;
export const TAP_MAX_DISTANCE_PX = 10;

// ─── Settlement Attractiveness ──────────────────────────────
// Score components that drive NPC immigration decisions.
export const ATTRACTIVENESS_CAMPFIRE_BONUS = 20;           // Base attractor for having a campfire/hearth
export const ATTRACTIVENESS_PER_SURVIVAL_BUILDING = 5;     // Per completed Survival-tier building
export const ATTRACTIVENESS_PER_PERMANENT_BUILDING = 15;   // Per completed Permanent-tier building
export const ATTRACTIVENESS_PER_TOWN_BUILDING = 30;        // Per completed Town/Castle-tier building
export const ATTRACTIVENESS_PER_HOUSING_SLOT = 10;         // Per unoccupied housing slot
export const ATTRACTIVENESS_PER_FOOD_UNIT = 0.5;           // Per food unit in stockpile
export const ATTRACTIVENESS_PER_WALL = 10;                 // Per wall segment (defense)
export const ATTRACTIVENESS_PER_WATCHTOWER = 20;           // Per watchtower (defense)
export const ATTRACTIVENESS_RIFT_PENALTY = -15;            // Per active rift within 128 blocks
export const ATTRACTIVENESS_HAPPINESS_MIN_MULT = 0.5;      // Multiplier at 0% average happiness
export const ATTRACTIVENESS_HAPPINESS_MAX_MULT = 1.5;      // Multiplier at 100% average happiness
export const ATTRACTIVENESS_RECALC_INTERVAL = 5;           // Seconds between full recalculations. Range: 1–30.
// Simplified attractiveness aliases (used by some callers)
export const ATTRACT_CAMPFIRE_SCORE = ATTRACTIVENESS_CAMPFIRE_BONUS;
export const ATTRACT_WALL_SCORE = 1;                // Points per structural block (capped)
export const ATTRACT_WALL_CAP = 100;                // Max structural blocks counted
export const ATTRACT_FOOD_SCORE = 2;                // Points per food item
export const ATTRACT_FOOD_CAP = 20;                 // Max food items counted
export const ATTRACT_RIFT_PENALTY = ATTRACTIVENESS_RIFT_PENALTY;
export const ATTRACT_SCAN_RADIUS = 48;              // World units to scan
export const ATTRACT_RECALC_INTERVAL = ATTRACTIVENESS_RECALC_INTERVAL;
export const ATTRACT_HOUSING_SCORE = ATTRACTIVENESS_PER_HOUSING_SLOT;
export const ATTRACT_HAPPINESS_MIN_MULT = ATTRACTIVENESS_HAPPINESS_MIN_MULT;
export const ATTRACT_HAPPINESS_MAX_MULT = ATTRACTIVENESS_HAPPINESS_MAX_MULT;

// ─── Immigration ────────────────────────────────────────────
// Controls how and when NPCs arrive at the settlement.
export const IMMIGRATION_CHECK_INTERVAL = 30;              // Seconds between immigration checks (low for testing)
export const IMMIGRATION_MIN_ATTRACTIVENESS = 25;          // Minimum score before any NPC will consider coming
export const IMMIGRATION_MAX_CHANCE = 0.6;                 // Max probability per check. Range: 0.1–0.9.
export const IMMIGRATION_SPAWN_MIN_DISTANCE = 64;          // World units — closest spawn from settlement center
export const IMMIGRATION_SPAWN_MAX_DISTANCE = 96;          // World units — farthest spawn from settlement center
export const IMMIGRATION_APPROACH_SPEED_MULT = 1.2;        // NPC walk speed multiplier while approaching
export const IMMIGRATION_EVALUATION_TIME = 10;             // Seconds NPC spends evaluating before deciding. Range: 5–60.
export const IMMIGRATION_HOUSING_WAIT_DAYS = 2;            // In-game days NPC waits for housing before leaving
// Aliases used by some callers
export const IMMIGRATION_THRESHOLD = 10;            // Min attractiveness to spawn first NPC (low for testing)
export const IMMIGRATION_THRESHOLD_PER_NPC = 15;    // Additional threshold per existing NPC
export const IMMIGRATION_SPAWN_MIN_DIST = IMMIGRATION_SPAWN_MIN_DISTANCE;
export const IMMIGRATION_SPAWN_MAX_DIST = IMMIGRATION_SPAWN_MAX_DISTANCE;
export const IMMIGRATION_MAX_NPCS = 5;              // Max settler NPCs (testing value, see NPC_MAX_POPULATION_PHASE_2)

// ─── NPC Population ─────────────────────────────────────────
export const NPC_FIRST_SETTLER_FREE = true;                // First NPC joins without housing (pioneer mechanic)
export const NPC_MAX_POPULATION_PHASE_2 = 20;              // Hard population cap for Phase 2. Range: 10–30.

// ─── NPC Needs ──────────────────────────────────────────────
export const NPC_HUNGER_DECAY_RATE = 0.5;            // Per second (~2 min to critical)
export const NPC_REST_DECAY_RATE = 0.35;             // Per second (~3 min to critical)
export const NPC_HUNGER_CRITICAL = 15;              // Below: NPC eats
export const NPC_REST_CRITICAL = 15;                // Below: NPC sleeps
export const NPC_WALK_SPEED = 2.0;                  // World units/sec (wandering)
export const NPC_APPROACH_SPEED = 3.0;              // World units/sec (approaching settlement)
export const NPC_WANDER_RADIUS = 16;                // World units from center
export const NPC_NEEDS_TICK_INTERVAL = 2;           // Seconds between needs updates

// Social need
export const NPC_SOCIAL_DECAY_RATE = 0.15;           // Per second
export const NPC_SOCIAL_CRITICAL = 25;               // Below: NPC socializes
export const NPC_SOCIAL_RESTORE = 20;                // Restored after socializing
export const NPC_EATING_DURATION = 3;                // Seconds to eat (animation time)

// NPC food sources: priority order (best first), material key → hunger restored
export const NPC_FOOD_SOURCES = [
  { material: 'meat', restore: 15 },
  { material: 'berry', restore: 10 },
];
export const NPC_SOCIAL_DURATION = 15;               // Seconds to socialize

// NPC evaluation & departure
export const NPC_EVALUATION_DURATION = 8;            // Seconds to evaluate settlement
export const NPC_LEAVE_HAPPINESS_THRESHOLD = 20;     // Below: unhappy
export const NPC_LEAVE_WARNING_DAYS = 2;             // In-game days before warning
export const NPC_LEAVE_DEPARTURE_DAYS = 3;           // In-game days before leaving

// ─── Mining Zone ────────────────────────────────────────────
export const MINING_TASK_REGEN_INTERVAL = 10;        // Seconds between task regeneration scans
export const MINING_BASE_TIME_PER_BLOCK = 4;         // Seconds to mine one block (modified by skill)
export const MINING_SKILL_BASE = 0.5;                // Minimum skill factor in speed calc

// ─── Farming Zone ───────────────────────────────────────────
export const FARM_GROW_TIME = 300;                   // Seconds per growth cycle. Range: 60–600.
export const FARM_HARVEST_YIELD = 4;                 // Food units per tile per harvest
export const FARM_PLANT_TIME = 2;                    // Seconds to plant one tile
export const FARM_HARVEST_TIME = 2;                  // Seconds to harvest one tile
export const FARM_UNATTENDED_RATE = 0.25;            // Passive auto-collection rate when no farmer assigned
export const MAX_FARMERS_PER_ZONE = 2;               // Max NPCs farming one zone simultaneously

// ─── Stockpile ──────────────────────────────────────────────
export const STOCKPILE_STACK_LIMIT = 64;             // Max quantity per slot
export const STOCKPILE_RESERVATION_TIMEOUT = 300;    // Seconds before a reservation auto-releases

// ─── Zone Designation ────────────────────────────────────────
export const ZONE_MAX_COUNT = 10;
export const ZONE_MAX_SIDE_VOXELS = 32;     // Max voxels per side (64 world units)
export const ZONE_MIN_SIDE_VOXELS = 2;      // Min voxels per side (4 world units)

// ─── E Key Interact ─────────────────────────────────────────
export const USE_KEY_RANGE = 6;                     // World units (3 blocks) for proximity search
export const USE_KEY_COOLDOWN = 300;                // ms between uses

// ─── Wildlife ───────────────────────────────────────────────
export const WILDLIFE_MAX_POPULATION = 25;        // Max animals alive at once
export const WILDLIFE_SPAWN_INTERVAL = 5;         // Seconds between spawn attempts
export const WILDLIFE_SPAWN_RANGE_MIN = 30;       // Min distance from player to spawn
export const WILDLIFE_SPAWN_RANGE_MAX = 60;       // Max distance from player to spawn
export const WILDLIFE_DESPAWN_RANGE = 80;         // Distance at which animals despawn
export const WILDLIFE_WANDER_RADIUS = 12;         // How far animals wander from spawn
export const WILDLIFE_WANDER_INTERVAL_MIN = 3;    // Min seconds between wander moves
export const WILDLIFE_WANDER_INTERVAL_MAX = 10;
export const WILDLIFE_FLY_HEIGHT_MIN = 8;         // Min altitude for flying animals
export const WILDLIFE_FLY_HEIGHT_MAX = 20;        // Max altitude for flying animals

// ─── Click-to-Move Navigation ──────────────────────────────────
export const NAV_MAX_ITERATIONS = 2000;       // A* iteration safety cap
export const NAV_MAX_STEP_UP = 1;             // Max voxel climb per step
export const NAV_MAX_STEP_DOWN = 3;           // Max voxel drop per step
export const NAV_PLAYER_HEIGHT_VOXELS = 2;    // Air clearance needed
export const NAV_WAYPOINT_ARRIVAL = 1.5;      // World units to count as "arrived at waypoint"
export const NAV_STUCK_TIMEOUT = 3.0;         // Seconds before canceling a stuck path

// ─── Debug ───────────────────────────────────────────────────
export const DEBUG_TIME_SCALES = [1, 2, 5, 10, 0]; // 0 = paused
