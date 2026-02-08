/**
 * tuning.js — Centralized game balance constants for Phase 1
 *
 * Every gameplay-affecting number lives here. Change one value,
 * see the effect immediately. Each constant includes:
 *   - What it controls
 *   - Acceptable range for playtesting
 *
 * Architectural constants (chunk size, voxel size, etc.) stay in src/shared/config.js.
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
export const LIGHT_AMBIENT_NIGHT = 0.15;
export const LIGHT_AMBIENT_DAY = 0.7;

// Directional (sun) light intensity. Range: 0.0–1.5.
export const LIGHT_DIRECTIONAL_NIGHT = 0.0;
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
export const RIFT_ACTIVE_RANGE = 128;          // Only tick rifts within this range of player
export const RIFT_DORMANT_DURATION = 300;      // Seconds of dormancy when blocks destroyed

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

// ─── Food ────────────────────────────────────────────────────
export const FOOD_BERRY_RESTORE = 10;
export const FOOD_APPLE_RESTORE = 15;
export const FOOD_RAW_MEAT_RESTORE = 15;
export const FOOD_COOKED_MEAT_RESTORE = 35;
export const FOOD_BREAD_RESTORE = 25;
export const FOOD_MUSHROOM_STEW_RESTORE = 30;

// Food source density (per chunk in appropriate biomes)
export const BERRY_BUSHES_PER_CHUNK = 1.5;     // Average 1-2 per chunk
export const ANIMALS_PER_CHUNK = 0.5;          // Average 0-1 per chunk
export const APPLE_DROP_CHANCE = 0.10;         // 10% from leaves

// ─── Mobile Controls ─────────────────────────────────────────
export const AUTO_JUMP_COOLDOWN_MS = 300;
export const AUTO_JUMP_DETECT_RANGE = 1.5;     // World units ahead of player
export const AUTO_JUMP_IMPULSE = 8;            // Same as manual jump
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

// ─── Debug ───────────────────────────────────────────────────
export const DEBUG_TIME_SCALES = [1, 2, 5, 10, 0]; // 0 = paused
