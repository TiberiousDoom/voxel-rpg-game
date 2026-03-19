/**
 * npcIdentity.js — Generates deterministic NPC identities from a seed
 */

import { FIRST_NAMES, SURNAMES } from './npcNames';

// Mulberry32 — fast, deterministic 32-bit PRNG
function mulberry32(seed) {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const SKIN_COLORS = [
  [0.96, 0.87, 0.77], // fair
  [0.87, 0.72, 0.53], // light tan
  [0.76, 0.57, 0.38], // medium
  [0.55, 0.38, 0.26], // brown
  [0.36, 0.24, 0.17], // dark
];

const HAIR_COLORS = [
  [0.15, 0.10, 0.07], // black
  [0.40, 0.26, 0.13], // brown
  [0.72, 0.55, 0.28], // blonde
  [0.60, 0.22, 0.10], // red
  [0.55, 0.55, 0.55], // grey
  [0.90, 0.85, 0.70], // platinum
];

const CLOTHING_COLORS = [
  [0.55, 0.27, 0.07], // brown leather
  [0.30, 0.45, 0.25], // forest green
  [0.25, 0.25, 0.50], // dark blue
  [0.60, 0.15, 0.15], // deep red
  [0.50, 0.50, 0.45], // grey
  [0.65, 0.55, 0.30], // tan
  [0.40, 0.20, 0.40], // purple
  [0.20, 0.40, 0.40], // teal
  [0.70, 0.60, 0.50], // beige
  [0.35, 0.35, 0.30], // charcoal
];

const PERSONALITIES = [
  'diligent', 'lazy', 'brave', 'cautious',
  'cheerful', 'grumpy', 'curious', 'stoic',
];

const JOBS = ['gatherer', 'miner', 'builder', 'guard', 'farmer'];

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Generate a full NPC identity from a numeric seed.
 * @param {number} seed
 * @returns {Object} NPC identity
 */
export function generateNPCIdentity(seed) {
  const rng = mulberry32(seed);

  const firstName = pick(rng, FIRST_NAMES);
  const surname = pick(rng, SURNAMES);

  return {
    firstName,
    surname,
    fullName: `${firstName} ${surname}`,
    appearance: {
      skinColor: pick(rng, SKIN_COLORS),
      hairColor: pick(rng, HAIR_COLORS),
      clothingPrimary: pick(rng, CLOTHING_COLORS),
      clothingSecondary: pick(rng, CLOTHING_COLORS),
    },
    personality: pick(rng, PERSONALITIES),
    preferredJob: pick(rng, JOBS),
    skills: {
      gathering: 0.3 + rng() * 0.7,
      mining: 0.3 + rng() * 0.7,
      building: 0.3 + rng() * 0.7,
      combat: 0.3 + rng() * 0.7,
    },
  };
}
