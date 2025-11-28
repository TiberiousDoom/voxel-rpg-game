#!/usr/bin/env node
/**
 * generate-sprites.js
 * Generates detailed pixel art sprites for all game entities
 *
 * Usage: node scripts/generate-sprites.js
 */

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Base paths
const SPRITES_DIR = path.join(__dirname, '..', 'public', 'assets', 'sprites');

/**
 * Create a new PNG with the given dimensions
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @returns {PNG} New PNG instance
 */
function createPNG(width, height) {
  return new PNG({ width, height, filterType: -1 });
}

/**
 * Set a pixel in the PNG
 * @param {PNG} png - PNG instance
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @param {number} a - Alpha (0-255)
 */
function setPixel(png, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

/**
 * Parse hex color to RGB
 * @param {string} hex - Hex color string
 * @returns {Object} RGB values
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Darken a color
 * @param {Object} color - RGB color
 * @param {number} amount - Amount to darken (0-1)
 * @returns {Object} Darkened RGB color
 */
function darken(color, amount) {
  return {
    r: Math.floor(color.r * (1 - amount)),
    g: Math.floor(color.g * (1 - amount)),
    b: Math.floor(color.b * (1 - amount))
  };
}

/**
 * Lighten a color
 * @param {Object} color - RGB color
 * @param {number} amount - Amount to lighten (0-1)
 * @returns {Object} Lightened RGB color
 */
function lighten(color, amount) {
  return {
    r: Math.min(255, Math.floor(color.r + (255 - color.r) * amount)),
    g: Math.min(255, Math.floor(color.g + (255 - color.g) * amount)),
    b: Math.min(255, Math.floor(color.b + (255 - color.b) * amount))
  };
}

/**
 * Fill a rectangle
 * @param {PNG} png - PNG instance
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {Object} color - RGB color
 * @param {number} alpha - Alpha value
 */
function fillRect(png, x, y, w, h, color, alpha = 255) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      setPixel(png, px, py, color.r, color.g, color.b, alpha);
    }
  }
}

/**
 * Draw a circle
 * @param {PNG} png - PNG instance
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} radius - Radius
 * @param {Object} color - RGB color
 * @param {boolean} filled - Whether to fill
 */
function drawCircle(png, cx, cy, radius, color, filled = true) {
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const dist = Math.sqrt(x * x + y * y);
      if (filled ? dist <= radius : Math.abs(dist - radius) < 1) {
        setPixel(png, cx + x, cy + y, color.r, color.g, color.b, 255);
      }
    }
  }
}

/**
 * Draw an ellipse
 * @param {PNG} png - PNG instance
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} rx - Radius X
 * @param {number} ry - Radius Y
 * @param {Object} color - RGB color
 */
function drawEllipse(png, cx, cy, rx, ry, color) {
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      const dist = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (dist <= 1) {
        setPixel(png, cx + x, cy + y, color.r, color.g, color.b, 255);
      }
    }
  }
}

/**
 * Save PNG to file
 * @param {PNG} png - PNG instance
 * @param {string} filePath - File path
 */
function savePNG(png, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
}

// ============================================================================
// MONSTER SPRITES (varying sizes based on monster type)
// ============================================================================

/**
 * Generate slime monster sprite
 * @param {number} size - Sprite size
 * @returns {PNG} Generated sprite
 */
function generateSlimeSprite(size) {
  const png = createPNG(size, size);
  const green = hexToRgb('#00ff00');
  const darkGreen = darken(green, 0.3);
  const lightGreen = lighten(green, 0.3);

  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2) + 1;
  const rx = Math.floor(size / 2) - 1;
  const ry = Math.floor(size / 3);

  // Body (ellipse - wider than tall)
  drawEllipse(png, cx, cy, rx, ry, green);

  // Highlight
  setPixel(png, cx - 2, cy - 2, lightGreen.r, lightGreen.g, lightGreen.b);
  setPixel(png, cx - 1, cy - 2, lightGreen.r, lightGreen.g, lightGreen.b);

  // Shadow/outline bottom
  for (let x = cx - rx + 1; x <= cx + rx - 1; x++) {
    setPixel(png, x, cy + ry, darkGreen.r, darkGreen.g, darkGreen.b);
  }

  // Eyes
  const eyeY = cy - 1;
  setPixel(png, cx - 2, eyeY, 0, 0, 0);
  setPixel(png, cx + 2, eyeY, 0, 0, 0);

  return png;
}

/**
 * Generate goblin monster sprite
 * @param {number} size - Sprite size
 * @returns {PNG} Generated sprite
 */
function generateGoblinSprite(size) {
  const png = createPNG(size, size);
  const skin = hexToRgb('#8B4513');
  const darkSkin = darken(skin, 0.3);
  const lightSkin = lighten(skin, 0.2);
  const cloth = hexToRgb('#4a3520');

  const cx = Math.floor(size / 2);

  // Body
  fillRect(png, cx - 3, size - 6, 6, 4, cloth);

  // Head
  drawCircle(png, cx, 4, 3, skin, true);

  // Ears (pointed)
  setPixel(png, cx - 4, 3, skin.r, skin.g, skin.b);
  setPixel(png, cx - 4, 2, skin.r, skin.g, skin.b);
  setPixel(png, cx + 4, 3, skin.r, skin.g, skin.b);
  setPixel(png, cx + 4, 2, skin.r, skin.g, skin.b);

  // Eyes (red/yellow)
  setPixel(png, cx - 1, 3, 255, 255, 0);
  setPixel(png, cx + 1, 3, 255, 255, 0);

  // Nose
  setPixel(png, cx, 5, darkSkin.r, darkSkin.g, darkSkin.b);

  // Arms
  fillRect(png, cx - 5, size - 5, 2, 3, skin);
  fillRect(png, cx + 3, size - 5, 2, 3, skin);

  // Legs
  fillRect(png, cx - 2, size - 2, 2, 2, skin);
  fillRect(png, cx + 1, size - 2, 2, 2, skin);

  return png;
}

/**
 * Generate wolf monster sprite
 * @param {number} size - Sprite size
 * @returns {PNG} Generated sprite
 */
function generateWolfSprite(size) {
  const png = createPNG(size, size);
  const gray = hexToRgb('#666666');
  const darkGray = darken(gray, 0.3);
  const lightGray = lighten(gray, 0.3);

  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);

  // Body (horizontal ellipse)
  drawEllipse(png, cx, cy + 2, 6, 3, gray);

  // Head
  drawCircle(png, cx + 4, cy, 3, gray, true);

  // Snout
  fillRect(png, cx + 6, cy, 3, 2, lightGray);

  // Ears
  setPixel(png, cx + 2, cy - 3, gray.r, gray.g, gray.b);
  setPixel(png, cx + 3, cy - 3, gray.r, gray.g, gray.b);
  setPixel(png, cx + 5, cy - 3, gray.r, gray.g, gray.b);
  setPixel(png, cx + 6, cy - 3, gray.r, gray.g, gray.b);

  // Eye
  setPixel(png, cx + 5, cy - 1, 255, 200, 0);

  // Nose
  setPixel(png, cx + 8, cy, 0, 0, 0);

  // Legs
  fillRect(png, cx - 4, cy + 4, 2, 3, darkGray);
  fillRect(png, cx - 1, cy + 4, 2, 3, darkGray);
  fillRect(png, cx + 2, cy + 4, 2, 3, darkGray);
  fillRect(png, cx + 5, cy + 4, 2, 3, darkGray);

  // Tail
  setPixel(png, cx - 6, cy + 1, gray.r, gray.g, gray.b);
  setPixel(png, cx - 7, cy, gray.r, gray.g, gray.b);
  setPixel(png, cx - 7, cy - 1, gray.r, gray.g, gray.b);

  return png;
}

/**
 * Generate skeleton monster sprite
 * @param {number} size - Sprite size
 * @returns {PNG} Generated sprite
 */
function generateSkeletonSprite(size) {
  const png = createPNG(size, size);
  const bone = hexToRgb('#EEEEEE');
  const darkBone = darken(bone, 0.2);

  const cx = Math.floor(size / 2);

  // Skull
  drawCircle(png, cx, 3, 3, bone, true);

  // Eye sockets
  setPixel(png, cx - 1, 2, 0, 0, 0);
  setPixel(png, cx + 1, 2, 0, 0, 0);

  // Nose hole
  setPixel(png, cx, 4, darkBone.r, darkBone.g, darkBone.b);

  // Jaw
  fillRect(png, cx - 2, 5, 4, 1, bone);

  // Spine
  for (let y = 6; y < size - 3; y++) {
    setPixel(png, cx, y, bone.r, bone.g, bone.b);
  }

  // Ribs
  fillRect(png, cx - 3, 7, 2, 1, bone);
  fillRect(png, cx + 2, 7, 2, 1, bone);
  fillRect(png, cx - 3, 9, 2, 1, bone);
  fillRect(png, cx + 2, 9, 2, 1, bone);

  // Pelvis
  fillRect(png, cx - 2, size - 4, 4, 1, bone);

  // Arms
  setPixel(png, cx - 4, 7, bone.r, bone.g, bone.b);
  setPixel(png, cx - 5, 8, bone.r, bone.g, bone.b);
  setPixel(png, cx - 5, 9, bone.r, bone.g, bone.b);
  setPixel(png, cx + 4, 7, bone.r, bone.g, bone.b);
  setPixel(png, cx + 5, 8, bone.r, bone.g, bone.b);
  setPixel(png, cx + 5, 9, bone.r, bone.g, bone.b);

  // Legs
  setPixel(png, cx - 1, size - 3, bone.r, bone.g, bone.b);
  setPixel(png, cx - 1, size - 2, bone.r, bone.g, bone.b);
  setPixel(png, cx - 1, size - 1, bone.r, bone.g, bone.b);
  setPixel(png, cx + 1, size - 3, bone.r, bone.g, bone.b);
  setPixel(png, cx + 1, size - 2, bone.r, bone.g, bone.b);
  setPixel(png, cx + 1, size - 1, bone.r, bone.g, bone.b);

  return png;
}

/**
 * Generate orc monster sprite
 * @param {number} size - Sprite size
 * @returns {PNG} Generated sprite
 */
function generateOrcSprite(size) {
  const png = createPNG(size, size);
  const green = hexToRgb('#2d5016');
  const darkGreen = darken(green, 0.3);
  const lightGreen = lighten(green, 0.2);
  const armor = hexToRgb('#4a4a4a');

  const cx = Math.floor(size / 2);

  // Body (large, muscular)
  fillRect(png, cx - 5, 7, 10, 7, green);

  // Armor chest plate
  fillRect(png, cx - 4, 8, 8, 5, armor);

  // Head
  drawCircle(png, cx, 4, 4, green, true);

  // Brow
  fillRect(png, cx - 3, 2, 6, 1, darkGreen);

  // Eyes (red, angry)
  setPixel(png, cx - 2, 3, 255, 0, 0);
  setPixel(png, cx + 2, 3, 255, 0, 0);

  // Tusks
  setPixel(png, cx - 2, 6, 255, 255, 240);
  setPixel(png, cx + 2, 6, 255, 255, 240);

  // Arms (muscular)
  fillRect(png, cx - 7, 8, 2, 5, green);
  fillRect(png, cx + 5, 8, 2, 5, green);

  // Shoulder pads
  fillRect(png, cx - 6, 7, 3, 2, armor);
  fillRect(png, cx + 3, 7, 3, 2, armor);

  // Legs
  fillRect(png, cx - 4, 14, 3, 4, darkGreen);
  fillRect(png, cx + 1, 14, 3, 4, darkGreen);

  // Belt
  fillRect(png, cx - 4, 13, 8, 1, hexToRgb('#8B4513'));

  return png;
}

// ============================================================================
// WILDLIFE SPRITES (16x16)
// ============================================================================

/**
 * Generate deer sprite
 * @returns {PNG} Generated sprite
 */
function generateDeerSprite() {
  const png = createPNG(16, 16);
  const brown = hexToRgb('#8B6914');
  const darkBrown = darken(brown, 0.3);
  const tan = hexToRgb('#D2B48C');

  // Body
  drawEllipse(png, 8, 9, 5, 3, brown);

  // Neck
  fillRect(png, 10, 5, 2, 4, brown);

  // Head
  drawCircle(png, 11, 4, 2, brown, true);

  // Antlers
  setPixel(png, 9, 1, darkBrown.r, darkBrown.g, darkBrown.b);
  setPixel(png, 8, 0, darkBrown.r, darkBrown.g, darkBrown.b);
  setPixel(png, 13, 1, darkBrown.r, darkBrown.g, darkBrown.b);
  setPixel(png, 14, 0, darkBrown.r, darkBrown.g, darkBrown.b);
  setPixel(png, 10, 2, darkBrown.r, darkBrown.g, darkBrown.b);
  setPixel(png, 12, 2, darkBrown.r, darkBrown.g, darkBrown.b);

  // Eye
  setPixel(png, 12, 3, 0, 0, 0);

  // Nose
  setPixel(png, 13, 4, 0, 0, 0);

  // White belly
  fillRect(png, 6, 10, 4, 2, tan);

  // Legs
  fillRect(png, 4, 11, 1, 4, darkBrown);
  fillRect(png, 6, 11, 1, 4, darkBrown);
  fillRect(png, 9, 11, 1, 4, darkBrown);
  fillRect(png, 11, 11, 1, 4, darkBrown);

  // Tail
  setPixel(png, 3, 8, tan.r, tan.g, tan.b);

  return png;
}

/**
 * Generate rabbit sprite
 * @returns {PNG} Generated sprite
 */
function generateRabbitSprite() {
  const png = createPNG(16, 16);
  const gray = hexToRgb('#A0A0A0');
  const darkGray = darken(gray, 0.2);
  const white = hexToRgb('#FFFFFF');
  const pink = hexToRgb('#FFB6C1');

  // Body
  drawEllipse(png, 8, 10, 4, 3, gray);

  // Head
  drawCircle(png, 8, 6, 3, gray, true);

  // Ears (long)
  fillRect(png, 6, 1, 2, 4, gray);
  fillRect(png, 10, 1, 2, 4, gray);
  // Inner ear
  setPixel(png, 7, 2, pink.r, pink.g, pink.b);
  setPixel(png, 11, 2, pink.r, pink.g, pink.b);

  // Eyes
  setPixel(png, 6, 5, 0, 0, 0);
  setPixel(png, 10, 5, 0, 0, 0);

  // Nose
  setPixel(png, 8, 7, pink.r, pink.g, pink.b);

  // Whiskers
  setPixel(png, 5, 7, darkGray.r, darkGray.g, darkGray.b);
  setPixel(png, 11, 7, darkGray.r, darkGray.g, darkGray.b);

  // White belly
  fillRect(png, 7, 11, 2, 2, white);

  // Feet
  fillRect(png, 5, 13, 2, 2, gray);
  fillRect(png, 9, 13, 2, 2, gray);

  // Tail (fluffy white)
  drawCircle(png, 4, 11, 1, white, true);

  return png;
}

/**
 * Generate sheep sprite
 * @returns {PNG} Generated sprite
 */
function generateSheepSprite() {
  const png = createPNG(16, 16);
  const wool = hexToRgb('#F5F5DC');
  const darkWool = darken(wool, 0.1);
  const face = hexToRgb('#2F2F2F');
  const legs = hexToRgb('#1A1A1A');

  // Fluffy body (multiple circles for wool effect)
  drawCircle(png, 8, 9, 5, wool, true);
  drawCircle(png, 6, 8, 3, wool, true);
  drawCircle(png, 10, 8, 3, wool, true);
  drawCircle(png, 8, 7, 3, wool, true);

  // Add wool texture
  setPixel(png, 5, 7, darkWool.r, darkWool.g, darkWool.b);
  setPixel(png, 11, 7, darkWool.r, darkWool.g, darkWool.b);
  setPixel(png, 8, 6, darkWool.r, darkWool.g, darkWool.b);

  // Head (dark face)
  drawCircle(png, 12, 6, 2, face, true);

  // Eyes
  setPixel(png, 12, 5, 255, 255, 255);
  setPixel(png, 13, 5, 255, 255, 255);

  // Ears
  setPixel(png, 10, 4, face.r, face.g, face.b);
  setPixel(png, 14, 4, face.r, face.g, face.b);

  // Legs
  fillRect(png, 5, 13, 2, 3, legs);
  fillRect(png, 9, 13, 2, 3, legs);

  return png;
}

/**
 * Generate bear sprite
 * @returns {PNG} Generated sprite
 */
function generateBearSprite() {
  const png = createPNG(16, 16);
  const brown = hexToRgb('#5C4033');
  const darkBrown = darken(brown, 0.3);
  const lightBrown = lighten(brown, 0.2);

  // Large body
  drawEllipse(png, 8, 10, 6, 4, brown);

  // Head
  drawCircle(png, 8, 4, 4, brown, true);

  // Ears
  drawCircle(png, 4, 2, 2, brown, true);
  drawCircle(png, 12, 2, 2, brown, true);
  setPixel(png, 4, 2, darkBrown.r, darkBrown.g, darkBrown.b);
  setPixel(png, 12, 2, darkBrown.r, darkBrown.g, darkBrown.b);

  // Snout
  drawEllipse(png, 8, 5, 2, 1, lightBrown);

  // Nose
  setPixel(png, 8, 5, 0, 0, 0);

  // Eyes
  setPixel(png, 6, 3, 0, 0, 0);
  setPixel(png, 10, 3, 0, 0, 0);

  // Legs (thick)
  fillRect(png, 3, 12, 3, 4, darkBrown);
  fillRect(png, 10, 12, 3, 4, darkBrown);

  return png;
}

/**
 * Generate boar sprite
 * @returns {PNG} Generated sprite
 */
function generateBoarSprite() {
  const png = createPNG(16, 16);
  const brown = hexToRgb('#4A3728');
  const darkBrown = darken(brown, 0.3);
  const pink = hexToRgb('#DEB887');
  const tusk = hexToRgb('#FFFFF0');

  // Body
  drawEllipse(png, 8, 9, 6, 4, brown);

  // Head
  drawCircle(png, 12, 7, 3, brown, true);

  // Snout
  drawEllipse(png, 14, 8, 2, 1, pink);

  // Nostrils
  setPixel(png, 14, 8, darkBrown.r, darkBrown.g, darkBrown.b);
  setPixel(png, 15, 8, darkBrown.r, darkBrown.g, darkBrown.b);

  // Tusks
  setPixel(png, 13, 10, tusk.r, tusk.g, tusk.b);
  setPixel(png, 14, 10, tusk.r, tusk.g, tusk.b);

  // Eyes
  setPixel(png, 11, 6, 0, 0, 0);

  // Ears
  setPixel(png, 10, 4, brown.r, brown.g, brown.b);
  setPixel(png, 12, 4, brown.r, brown.g, brown.b);

  // Mane/bristles
  for (let x = 5; x < 10; x++) {
    setPixel(png, x, 5, darkBrown.r, darkBrown.g, darkBrown.b);
  }

  // Legs
  fillRect(png, 4, 12, 2, 4, darkBrown);
  fillRect(png, 7, 12, 2, 4, darkBrown);
  fillRect(png, 10, 12, 2, 4, darkBrown);

  // Tail
  setPixel(png, 2, 8, brown.r, brown.g, brown.b);
  setPixel(png, 1, 7, brown.r, brown.g, brown.b);

  return png;
}

/**
 * Generate wolf (wildlife) sprite - different from monster wolf
 * @returns {PNG} Generated sprite
 */
function generateWildlifeWolfSprite() {
  const png = createPNG(16, 16);
  const gray = hexToRgb('#808080');
  const darkGray = darken(gray, 0.3);
  const lightGray = lighten(gray, 0.3);

  // Body
  drawEllipse(png, 7, 10, 5, 3, gray);

  // Head
  drawCircle(png, 12, 7, 3, gray, true);

  // Snout
  fillRect(png, 14, 7, 2, 2, lightGray);

  // Nose
  setPixel(png, 15, 7, 0, 0, 0);

  // Ears (pointed)
  setPixel(png, 10, 4, gray.r, gray.g, gray.b);
  setPixel(png, 10, 3, gray.r, gray.g, gray.b);
  setPixel(png, 13, 4, gray.r, gray.g, gray.b);
  setPixel(png, 13, 3, gray.r, gray.g, gray.b);

  // Eyes (yellow, predatory)
  setPixel(png, 11, 6, 255, 215, 0);
  setPixel(png, 13, 6, 255, 215, 0);

  // Legs
  fillRect(png, 3, 12, 2, 4, darkGray);
  fillRect(png, 6, 12, 2, 4, darkGray);
  fillRect(png, 9, 12, 2, 4, darkGray);
  fillRect(png, 12, 12, 2, 4, darkGray);

  // Tail (bushy)
  setPixel(png, 2, 9, gray.r, gray.g, gray.b);
  setPixel(png, 1, 8, gray.r, gray.g, gray.b);
  setPixel(png, 0, 7, gray.r, gray.g, gray.b);
  setPixel(png, 1, 9, lightGray.r, lightGray.g, lightGray.b);

  return png;
}

// ============================================================================
// BUILDING SPRITES (40x40)
// ============================================================================

/**
 * Generate farm building sprite
 * @returns {PNG} Generated sprite
 */
function generateFarmSprite() {
  const png = createPNG(40, 40);
  const wood = hexToRgb('#8B4513');
  const darkWood = darken(wood, 0.3);
  const roof = hexToRgb('#A0522D');
  const darkRoof = darken(roof, 0.2);
  const hay = hexToRgb('#DAA520');

  // Main barn structure
  fillRect(png, 5, 18, 30, 18, wood);

  // Wood planks detail
  for (let y = 20; y < 36; y += 4) {
    fillRect(png, 5, y, 30, 1, darkWood);
  }

  // Barn roof (triangular)
  for (let i = 0; i < 12; i++) {
    fillRect(png, 5 + i, 18 - i, 30 - i * 2, 1, i % 2 === 0 ? roof : darkRoof);
  }

  // Barn door
  fillRect(png, 14, 24, 12, 12, darkWood);
  fillRect(png, 15, 25, 4, 10, hexToRgb('#2F1810'));
  fillRect(png, 21, 25, 4, 10, hexToRgb('#2F1810'));

  // Door handles
  setPixel(png, 18, 30, hexToRgb('#FFD700').r, hexToRgb('#FFD700').g, hexToRgb('#FFD700').b);
  setPixel(png, 22, 30, hexToRgb('#FFD700').r, hexToRgb('#FFD700').g, hexToRgb('#FFD700').b);

  // Hay loft window
  fillRect(png, 17, 12, 6, 5, hexToRgb('#2F1810'));

  // Hay visible in window
  fillRect(png, 18, 13, 4, 3, hay);

  // Ground/grass
  fillRect(png, 0, 36, 40, 4, hexToRgb('#228B22'));

  return png;
}

/**
 * Generate house building sprite
 * @returns {PNG} Generated sprite
 */
function generateHouseSprite() {
  const png = createPNG(40, 40);
  const wall = hexToRgb('#DEB887');
  const darkWall = darken(wall, 0.1);
  const roof = hexToRgb('#8B0000');
  const darkRoof = darken(roof, 0.2);
  const window_color = hexToRgb('#87CEEB');
  const door = hexToRgb('#8B4513');

  // Main house structure
  fillRect(png, 6, 16, 28, 20, wall);

  // Stone foundation
  fillRect(png, 4, 34, 32, 4, hexToRgb('#696969'));

  // Roof (triangular)
  for (let i = 0; i < 14; i++) {
    fillRect(png, 4 + i, 16 - i, 32 - i * 2, 1, i % 2 === 0 ? roof : darkRoof);
  }

  // Chimney
  fillRect(png, 28, 4, 5, 10, hexToRgb('#8B0000'));

  // Door
  fillRect(png, 16, 24, 8, 12, door);
  fillRect(png, 17, 25, 6, 10, darken(door, 0.2));
  // Doorknob
  setPixel(png, 21, 30, hexToRgb('#FFD700').r, hexToRgb('#FFD700').g, hexToRgb('#FFD700').b);

  // Windows
  fillRect(png, 8, 20, 6, 6, window_color);
  fillRect(png, 26, 20, 6, 6, window_color);
  // Window frames
  fillRect(png, 11, 20, 1, 6, darkWall);
  fillRect(png, 8, 23, 6, 1, darkWall);
  fillRect(png, 29, 20, 1, 6, darkWall);
  fillRect(png, 26, 23, 6, 1, darkWall);

  // Ground
  fillRect(png, 0, 38, 40, 2, hexToRgb('#228B22'));

  return png;
}

/**
 * Generate warehouse building sprite
 * @returns {PNG} Generated sprite
 */
function generateWarehouseSprite() {
  const png = createPNG(40, 40);
  const metal = hexToRgb('#708090');
  const darkMetal = darken(metal, 0.3);
  const rust = hexToRgb('#B7410E');

  // Main warehouse structure
  fillRect(png, 3, 12, 34, 26, metal);

  // Corrugated metal effect
  for (let x = 3; x < 37; x += 3) {
    fillRect(png, x, 12, 1, 26, darkMetal);
  }

  // Curved roof
  for (let i = 0; i < 6; i++) {
    fillRect(png, 3 + i, 12 - i, 34 - i * 2, 1, i % 2 === 0 ? metal : darkMetal);
  }

  // Large sliding doors
  fillRect(png, 8, 20, 10, 18, darkMetal);
  fillRect(png, 22, 20, 10, 18, darkMetal);

  // Door handles
  fillRect(png, 17, 28, 2, 4, hexToRgb('#FFD700'));
  fillRect(png, 21, 28, 2, 4, hexToRgb('#FFD700'));

  // Rust spots
  setPixel(png, 5, 25, rust.r, rust.g, rust.b);
  setPixel(png, 33, 18, rust.r, rust.g, rust.b);
  setPixel(png, 15, 30, rust.r, rust.g, rust.b);

  // Ground
  fillRect(png, 0, 38, 40, 2, hexToRgb('#696969'));

  return png;
}

/**
 * Generate town center building sprite
 * @returns {PNG} Generated sprite
 */
function generateTownCenterSprite() {
  const png = createPNG(40, 40);
  const stone = hexToRgb('#A9A9A9');
  const darkStone = darken(stone, 0.2);
  const roof = hexToRgb('#4169E1');
  const gold = hexToRgb('#FFD700');

  // Main building
  fillRect(png, 4, 14, 32, 24, stone);

  // Stone brick pattern
  for (let y = 16; y < 38; y += 4) {
    for (let x = 4; x < 36; x += 6) {
      fillRect(png, x, y, 5, 3, y % 8 === 0 ? stone : darkStone);
    }
  }

  // Pillars
  fillRect(png, 6, 20, 3, 18, hexToRgb('#F5F5DC'));
  fillRect(png, 31, 20, 3, 18, hexToRgb('#F5F5DC'));

  // Roof with flag tower
  for (let i = 0; i < 10; i++) {
    fillRect(png, 4 + i, 14 - i, 32 - i * 2, 1, roof);
  }

  // Tower
  fillRect(png, 17, 0, 6, 6, stone);

  // Flag
  fillRect(png, 19, 0, 1, 4, hexToRgb('#8B4513'));
  fillRect(png, 20, 0, 4, 2, hexToRgb('#FF0000'));

  // Grand entrance
  fillRect(png, 14, 24, 12, 14, hexToRgb('#8B4513'));
  fillRect(png, 15, 25, 10, 12, hexToRgb('#2F1810'));

  // Gold trim
  fillRect(png, 14, 24, 12, 1, gold);

  // Windows
  fillRect(png, 8, 18, 4, 4, hexToRgb('#87CEEB'));
  fillRect(png, 28, 18, 4, 4, hexToRgb('#87CEEB'));

  return png;
}

/**
 * Generate watchtower building sprite
 * @returns {PNG} Generated sprite
 */
function generateWatchtowerSprite() {
  const png = createPNG(40, 40);
  const stone = hexToRgb('#808080');
  const darkStone = darken(stone, 0.3);
  const wood = hexToRgb('#8B4513');

  // Tower base (wider)
  fillRect(png, 12, 28, 16, 12, stone);

  // Tower middle
  fillRect(png, 14, 16, 12, 12, stone);

  // Tower top (lookout)
  fillRect(png, 10, 8, 20, 8, wood);

  // Roof (pointed)
  for (let i = 0; i < 8; i++) {
    fillRect(png, 10 + i, 8 - i, 20 - i * 2, 1, i % 2 === 0 ? wood : darken(wood, 0.2));
  }

  // Flag
  fillRect(png, 20, 0, 1, 4, wood);
  fillRect(png, 21, 0, 3, 2, hexToRgb('#FF0000'));

  // Crenellations (battlements)
  for (let x = 10; x < 30; x += 4) {
    fillRect(png, x, 6, 2, 2, wood);
  }

  // Windows/arrow slits
  fillRect(png, 19, 20, 2, 4, hexToRgb('#1a1a1a'));
  fillRect(png, 19, 32, 2, 4, hexToRgb('#1a1a1a'));

  // Stone texture
  for (let y = 18; y < 38; y += 3) {
    fillRect(png, 12, y, 16, 1, darkStone);
  }

  // Door
  fillRect(png, 17, 34, 6, 6, hexToRgb('#4a3520'));

  return png;
}

/**
 * Generate campfire building sprite
 * @returns {PNG} Generated sprite
 */
function generateCampfireSprite() {
  const png = createPNG(40, 40);
  const wood = hexToRgb('#8B4513');
  const darkWood = darken(wood, 0.4);
  const fire1 = hexToRgb('#FF4500');
  const fire2 = hexToRgb('#FF6347');
  const fire3 = hexToRgb('#FFD700');
  const stone = hexToRgb('#696969');

  // Ground (dirt circle)
  drawCircle(png, 20, 28, 12, hexToRgb('#8B7355'), true);

  // Stone ring
  for (let angle = 0; angle < Math.PI * 2; angle += 0.5) {
    const x = Math.floor(20 + Math.cos(angle) * 10);
    const y = Math.floor(28 + Math.sin(angle) * 6);
    fillRect(png, x - 1, y - 1, 3, 2, stone);
  }

  // Logs
  fillRect(png, 12, 28, 16, 3, darkWood);
  fillRect(png, 14, 26, 12, 2, wood);

  // Fire (layered for effect)
  // Outer flame (red-orange)
  drawEllipse(png, 20, 20, 5, 8, fire1);
  // Middle flame (orange)
  drawEllipse(png, 20, 18, 4, 6, fire2);
  // Inner flame (yellow)
  drawEllipse(png, 20, 16, 2, 4, fire3);
  // Core (white-yellow)
  fillRect(png, 19, 18, 2, 3, hexToRgb('#FFFACD'));

  // Sparks
  setPixel(png, 16, 10, fire3.r, fire3.g, fire3.b);
  setPixel(png, 24, 8, fire2.r, fire2.g, fire2.b);
  setPixel(png, 18, 6, fire3.r, fire3.g, fire3.b);
  setPixel(png, 22, 12, fire1.r, fire1.g, fire1.b);

  // Smoke (subtle)
  setPixel(png, 20, 4, 128, 128, 128);
  setPixel(png, 19, 2, 160, 160, 160);
  setPixel(png, 21, 3, 140, 140, 140);

  return png;
}

/**
 * Generate market building sprite
 * @returns {PNG} Generated sprite
 */
function generateMarketSprite() {
  const png = createPNG(40, 40);
  const wood = hexToRgb('#DEB887');
  const darkWood = darken(wood, 0.2);
  const awning1 = hexToRgb('#DC143C');
  const awning2 = hexToRgb('#FFFFFF');
  const crate = hexToRgb('#CD853F');

  // Market stall base
  fillRect(png, 4, 24, 32, 14, wood);

  // Counter
  fillRect(png, 4, 22, 32, 3, darkWood);

  // Support poles
  fillRect(png, 6, 10, 2, 14, darkWood);
  fillRect(png, 32, 10, 2, 14, darkWood);

  // Striped awning
  for (let i = 0; i < 12; i++) {
    const color = i % 2 === 0 ? awning1 : awning2;
    fillRect(png, 4, 8 + i, 32, 1, color);
  }

  // Awning curve
  fillRect(png, 2, 8, 2, 2, awning1);
  fillRect(png, 36, 8, 2, 2, awning1);

  // Goods on display
  // Apples (red circles)
  drawCircle(png, 10, 20, 2, hexToRgb('#FF0000'), true);
  drawCircle(png, 15, 20, 2, hexToRgb('#FF0000'), true);

  // Bread (brown)
  drawEllipse(png, 22, 20, 3, 2, hexToRgb('#DEB887'));

  // Cheese wheel (yellow)
  drawCircle(png, 30, 20, 2, hexToRgb('#FFD700'), true);

  // Crates below
  fillRect(png, 8, 30, 6, 6, crate);
  fillRect(png, 26, 30, 6, 6, crate);

  // Sign
  fillRect(png, 16, 4, 8, 4, wood);

  // Ground
  fillRect(png, 0, 38, 40, 2, hexToRgb('#D2691E'));

  return png;
}

/**
 * Generate castle building sprite
 * @returns {PNG} Generated sprite
 */
function generateCastleSprite() {
  const png = createPNG(40, 40);
  const stone = hexToRgb('#696969');
  const darkStone = darken(stone, 0.3);
  const lightStone = lighten(stone, 0.2);
  const roof = hexToRgb('#4169E1');
  const flag = hexToRgb('#FF0000');

  // Main keep
  fillRect(png, 10, 14, 20, 24, stone);

  // Left tower
  fillRect(png, 2, 8, 10, 30, stone);

  // Right tower
  fillRect(png, 28, 8, 10, 30, stone);

  // Tower roofs (conical)
  for (let i = 0; i < 8; i++) {
    fillRect(png, 2 + i, 8 - i, 10 - i * 2, 1, roof);
    fillRect(png, 28 + i, 8 - i, 10 - i * 2, 1, roof);
  }

  // Flags on towers
  fillRect(png, 7, 0, 1, 3, hexToRgb('#8B4513'));
  fillRect(png, 8, 0, 3, 2, flag);
  fillRect(png, 32, 0, 1, 3, hexToRgb('#8B4513'));
  fillRect(png, 33, 0, 3, 2, flag);

  // Crenellations (battlements)
  for (let x = 10; x < 30; x += 3) {
    fillRect(png, x, 12, 2, 2, stone);
  }
  for (let x = 2; x < 12; x += 3) {
    fillRect(png, x, 6, 2, 2, stone);
  }
  for (let x = 28; x < 38; x += 3) {
    fillRect(png, x, 6, 2, 2, stone);
  }

  // Main gate
  fillRect(png, 14, 26, 12, 12, hexToRgb('#2F1810'));
  // Gate arch
  for (let i = 0; i < 4; i++) {
    setPixel(png, 14 + i, 26 + i, stone.r, stone.g, stone.b);
    setPixel(png, 25 - i, 26 + i, stone.r, stone.g, stone.b);
  }

  // Portcullis (gate bars)
  for (let y = 28; y < 38; y += 2) {
    fillRect(png, 15, y, 10, 1, hexToRgb('#4a4a4a'));
  }
  for (let x = 16; x < 25; x += 2) {
    fillRect(png, x, 28, 1, 10, hexToRgb('#4a4a4a'));
  }

  // Windows
  fillRect(png, 4, 16, 3, 4, hexToRgb('#1a1a1a'));
  fillRect(png, 32, 16, 3, 4, hexToRgb('#1a1a1a'));
  fillRect(png, 18, 18, 4, 3, hexToRgb('#87CEEB'));

  // Stone texture
  for (let y = 16; y < 38; y += 4) {
    for (let x = 10; x < 30; x += 5) {
      fillRect(png, x, y, 4, 3, y % 8 === 0 ? lightStone : darkStone);
    }
  }

  return png;
}

// ============================================================================
// ENVIRONMENTAL PROP SPRITES (40x40)
// ============================================================================

/**
 * Generate oak tree sprite
 * @returns {PNG} Generated sprite
 */
function generateOakTreeSprite() {
  const png = createPNG(40, 40);
  const trunk = hexToRgb('#8B4513');
  const darkTrunk = darken(trunk, 0.3);
  const leaves = hexToRgb('#228B22');
  const darkLeaves = darken(leaves, 0.2);
  const lightLeaves = lighten(leaves, 0.2);

  // Trunk
  fillRect(png, 17, 24, 6, 14, trunk);
  fillRect(png, 16, 26, 1, 10, darkTrunk);
  fillRect(png, 23, 26, 1, 10, darkTrunk);

  // Roots
  fillRect(png, 14, 36, 3, 2, trunk);
  fillRect(png, 23, 36, 3, 2, trunk);

  // Foliage (layered circles for fullness)
  drawCircle(png, 20, 14, 10, leaves, true);
  drawCircle(png, 14, 16, 7, darkLeaves, true);
  drawCircle(png, 26, 16, 7, darkLeaves, true);
  drawCircle(png, 20, 10, 6, lightLeaves, true);

  // Leaf highlights
  setPixel(png, 16, 8, lightLeaves.r, lightLeaves.g, lightLeaves.b);
  setPixel(png, 22, 6, lightLeaves.r, lightLeaves.g, lightLeaves.b);
  setPixel(png, 12, 14, darkLeaves.r, darkLeaves.g, darkLeaves.b);

  return png;
}

/**
 * Generate pine tree sprite
 * @returns {PNG} Generated sprite
 */
function generatePineTreeSprite() {
  const png = createPNG(40, 40);
  const trunk = hexToRgb('#5D4037');
  const needles = hexToRgb('#2E7D32');
  const darkNeedles = darken(needles, 0.2);
  const snow = hexToRgb('#FFFFFF');

  // Trunk
  fillRect(png, 18, 30, 4, 10, trunk);

  // Triangular foliage layers
  // Bottom layer
  for (let i = 0; i < 10; i++) {
    fillRect(png, 10 + i, 30 - i, 20 - i * 2, 1, i % 2 === 0 ? needles : darkNeedles);
  }

  // Middle layer
  for (let i = 0; i < 8; i++) {
    fillRect(png, 12 + i, 22 - i, 16 - i * 2, 1, i % 2 === 0 ? needles : darkNeedles);
  }

  // Top layer
  for (let i = 0; i < 6; i++) {
    fillRect(png, 14 + i, 14 - i, 12 - i * 2, 1, i % 2 === 0 ? needles : darkNeedles);
  }

  // Top point
  for (let i = 0; i < 4; i++) {
    fillRect(png, 16 + i, 8 - i, 8 - i * 2, 1, needles);
  }

  // Snow on branches (optional detail)
  setPixel(png, 12, 28, snow.r, snow.g, snow.b);
  setPixel(png, 28, 28, snow.r, snow.g, snow.b);
  setPixel(png, 14, 20, snow.r, snow.g, snow.b);
  setPixel(png, 26, 20, snow.r, snow.g, snow.b);

  return png;
}

/**
 * Generate rock sprite
 * @returns {PNG} Generated sprite
 */
function generateRockSprite() {
  const png = createPNG(40, 40);
  const rock = hexToRgb('#808080');
  const darkRock = darken(rock, 0.3);
  const lightRock = lighten(rock, 0.2);

  // Main rock body (irregular shape)
  drawEllipse(png, 20, 26, 14, 10, rock);

  // Top bump
  drawEllipse(png, 16, 18, 8, 6, rock);

  // Side bump
  drawEllipse(png, 28, 24, 6, 5, darkRock);

  // Highlights
  drawEllipse(png, 14, 16, 4, 3, lightRock);

  // Cracks/details
  setPixel(png, 18, 24, darkRock.r, darkRock.g, darkRock.b);
  setPixel(png, 19, 25, darkRock.r, darkRock.g, darkRock.b);
  setPixel(png, 20, 26, darkRock.r, darkRock.g, darkRock.b);

  setPixel(png, 24, 22, darkRock.r, darkRock.g, darkRock.b);
  setPixel(png, 25, 23, darkRock.r, darkRock.g, darkRock.b);

  // Shadow
  drawEllipse(png, 20, 36, 12, 3, hexToRgb('#404040'));

  return png;
}

/**
 * Generate iron ore sprite
 * @returns {PNG} Generated sprite
 */
function generateIronOreSprite() {
  const png = createPNG(40, 40);
  const rock = hexToRgb('#696969');
  const iron = hexToRgb('#B8860B');
  const darkIron = darken(iron, 0.3);

  // Rock base
  drawEllipse(png, 20, 26, 14, 10, rock);
  drawEllipse(png, 16, 20, 8, 6, rock);

  // Iron veins
  fillRect(png, 12, 22, 4, 3, iron);
  fillRect(png, 22, 20, 5, 4, iron);
  fillRect(png, 18, 28, 6, 3, iron);
  fillRect(png, 26, 26, 4, 3, darkIron);

  // Sparkle effects
  setPixel(png, 14, 21, 255, 255, 200);
  setPixel(png, 24, 19, 255, 255, 200);
  setPixel(png, 20, 27, 255, 255, 200);

  return png;
}

/**
 * Generate gold ore sprite
 * @returns {PNG} Generated sprite
 */
function generateGoldOreSprite() {
  const png = createPNG(40, 40);
  const rock = hexToRgb('#696969');
  const gold = hexToRgb('#FFD700');
  const darkGold = darken(gold, 0.2);

  // Rock base
  drawEllipse(png, 20, 26, 14, 10, rock);
  drawEllipse(png, 16, 20, 8, 6, rock);

  // Gold veins (more prominent)
  fillRect(png, 10, 24, 5, 4, gold);
  fillRect(png, 20, 18, 6, 5, gold);
  fillRect(png, 16, 28, 8, 4, gold);
  fillRect(png, 28, 24, 4, 4, darkGold);

  // Bright sparkles
  setPixel(png, 12, 23, 255, 255, 255);
  setPixel(png, 22, 17, 255, 255, 255);
  setPixel(png, 19, 27, 255, 255, 255);
  setPixel(png, 29, 23, 255, 255, 255);

  return png;
}

/**
 * Generate crystal ore sprite
 * @returns {PNG} Generated sprite
 */
function generateCrystalOreSprite() {
  const png = createPNG(40, 40);
  const rock = hexToRgb('#4a4a6a');
  const crystal = hexToRgb('#E6E6FA');
  const purple = hexToRgb('#9370DB');
  const glow = hexToRgb('#DDA0DD');

  // Rock base
  drawEllipse(png, 20, 30, 12, 6, rock);

  // Crystal formations (pointed)
  // Main crystal
  for (let i = 0; i < 16; i++) {
    fillRect(png, 18 + Math.floor(i / 4), 28 - i, 4 - Math.floor(i / 4), 1, crystal);
  }

  // Left crystal
  for (let i = 0; i < 10; i++) {
    fillRect(png, 10 + Math.floor(i / 3), 30 - i, 3 - Math.floor(i / 4), 1, purple);
  }

  // Right crystal
  for (let i = 0; i < 12; i++) {
    fillRect(png, 26 + Math.floor(i / 4), 32 - i, 3 - Math.floor(i / 5), 1, glow);
  }

  // Glow effect
  setPixel(png, 20, 14, 255, 255, 255);
  setPixel(png, 12, 22, 255, 200, 255);
  setPixel(png, 28, 22, 255, 200, 255);

  return png;
}

/**
 * Generate bush sprite
 * @returns {PNG} Generated sprite
 */
function generateBushSprite() {
  const png = createPNG(40, 40);
  const leaves = hexToRgb('#228B22');
  const darkLeaves = darken(leaves, 0.3);
  const lightLeaves = lighten(leaves, 0.2);

  // Bush body (multiple overlapping circles)
  drawCircle(png, 20, 26, 10, leaves, true);
  drawCircle(png, 12, 28, 7, darkLeaves, true);
  drawCircle(png, 28, 28, 7, darkLeaves, true);
  drawCircle(png, 16, 22, 6, lightLeaves, true);
  drawCircle(png, 24, 22, 6, leaves, true);
  drawCircle(png, 20, 20, 5, lightLeaves, true);

  // Leaf details
  setPixel(png, 14, 18, lightLeaves.r, lightLeaves.g, lightLeaves.b);
  setPixel(png, 26, 18, lightLeaves.r, lightLeaves.g, lightLeaves.b);

  return png;
}

/**
 * Generate berry bush sprite
 * @returns {PNG} Generated sprite
 */
function generateBerryBushSprite() {
  const png = createPNG(40, 40);
  const leaves = hexToRgb('#228B22');
  const darkLeaves = darken(leaves, 0.3);
  const berry = hexToRgb('#DC143C');

  // Bush body
  drawCircle(png, 20, 26, 10, leaves, true);
  drawCircle(png, 12, 28, 7, darkLeaves, true);
  drawCircle(png, 28, 28, 7, darkLeaves, true);
  drawCircle(png, 20, 20, 6, leaves, true);

  // Berries scattered throughout
  drawCircle(png, 14, 22, 2, berry, true);
  drawCircle(png, 22, 18, 2, berry, true);
  drawCircle(png, 26, 24, 2, berry, true);
  drawCircle(png, 18, 26, 2, berry, true);
  drawCircle(png, 10, 28, 2, berry, true);
  drawCircle(png, 28, 30, 2, berry, true);

  // Berry highlights
  setPixel(png, 13, 21, 255, 200, 200);
  setPixel(png, 21, 17, 255, 200, 200);
  setPixel(png, 25, 23, 255, 200, 200);

  return png;
}

/**
 * Generate mushroom sprite
 * @returns {PNG} Generated sprite
 */
function generateMushroomSprite() {
  const png = createPNG(40, 40);
  const cap = hexToRgb('#8B0000');
  const spots = hexToRgb('#FFFFFF');
  const stem = hexToRgb('#F5F5DC');

  // Stem
  fillRect(png, 17, 26, 6, 12, stem);
  fillRect(png, 16, 32, 8, 6, stem);

  // Cap
  drawEllipse(png, 20, 22, 12, 6, cap);
  drawEllipse(png, 20, 20, 10, 4, darken(cap, 0.1));

  // White spots
  drawCircle(png, 14, 20, 2, spots, true);
  drawCircle(png, 22, 18, 2, spots, true);
  drawCircle(png, 26, 22, 1, spots, true);
  drawCircle(png, 18, 24, 1, spots, true);

  // Underside gills
  fillRect(png, 15, 26, 10, 1, darken(stem, 0.2));

  return png;
}

/**
 * Generate grass clump sprite
 * @returns {PNG} Generated sprite
 */
function generateGrassSprite() {
  const png = createPNG(40, 40);
  const grass = hexToRgb('#228B22');
  const darkGrass = darken(grass, 0.2);
  const lightGrass = lighten(grass, 0.2);

  // Multiple grass blades
  const blades = [
    { x: 10, h: 16 },
    { x: 14, h: 20 },
    { x: 18, h: 18 },
    { x: 22, h: 22 },
    { x: 26, h: 17 },
    { x: 30, h: 19 }
  ];

  for (const blade of blades) {
    const color = blade.x % 8 === 0 ? lightGrass : (blade.x % 4 === 0 ? darkGrass : grass);
    for (let y = 0; y < blade.h; y++) {
      const sway = Math.floor(Math.sin(y * 0.3) * 2);
      setPixel(png, blade.x + sway, 38 - y, color.r, color.g, color.b);
      if (y < blade.h - 4) {
        setPixel(png, blade.x + sway + 1, 38 - y, color.r, color.g, color.b);
      }
    }
  }

  // Base ground
  fillRect(png, 8, 36, 24, 4, hexToRgb('#8B7355'));

  return png;
}

/**
 * Generate flower sprite
 * @returns {PNG} Generated sprite
 */
function generateFlowerSprite() {
  const png = createPNG(40, 40);
  const stem = hexToRgb('#228B22');
  const petal = hexToRgb('#FF69B4');
  const center = hexToRgb('#FFD700');

  // Stems
  fillRect(png, 12, 22, 1, 16, stem);
  fillRect(png, 20, 20, 1, 18, stem);
  fillRect(png, 28, 24, 1, 14, stem);

  // Leaves
  drawEllipse(png, 10, 30, 3, 2, stem);
  drawEllipse(png, 22, 32, 3, 2, stem);
  drawEllipse(png, 30, 30, 3, 2, stem);

  // Flower 1
  drawCircle(png, 12, 18, 4, petal, true);
  drawCircle(png, 12, 18, 2, center, true);

  // Flower 2 (different color)
  drawCircle(png, 20, 16, 4, hexToRgb('#FF6347'), true);
  drawCircle(png, 20, 16, 2, center, true);

  // Flower 3
  drawCircle(png, 28, 20, 4, hexToRgb('#DDA0DD'), true);
  drawCircle(png, 28, 20, 2, center, true);

  return png;
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate all sprites and save to files
 */
function generateAllSprites() {
  console.log('Starting sprite generation...\n');

  // Create directories
  const dirs = [
    'monsters',
    'wildlife',
    'buildings',
    'environment/trees',
    'environment/rocks',
    'environment/ores',
    'environment/plants'
  ];

  for (const dir of dirs) {
    const fullPath = path.join(SPRITES_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  // Generate monster sprites
  console.log('Generating monster sprites...');
  const monsters = [
    { name: 'slime', size: 16, generator: generateSlimeSprite },
    { name: 'goblin', size: 16, generator: generateGoblinSprite },
    { name: 'wolf', size: 20, generator: generateWolfSprite },
    { name: 'skeleton', size: 18, generator: generateSkeletonSprite },
    { name: 'orc', size: 20, generator: generateOrcSprite }
  ];

  for (const monster of monsters) {
    const png = monster.generator(monster.size);
    const filePath = path.join(SPRITES_DIR, 'monsters', `${monster.name}.png`);
    savePNG(png, filePath);
    console.log(`  Created: monsters/${monster.name}.png (${monster.size}x${monster.size})`);
  }

  // Generate wildlife sprites
  console.log('\nGenerating wildlife sprites...');
  const wildlife = [
    { name: 'deer', generator: generateDeerSprite },
    { name: 'rabbit', generator: generateRabbitSprite },
    { name: 'sheep', generator: generateSheepSprite },
    { name: 'bear', generator: generateBearSprite },
    { name: 'boar', generator: generateBoarSprite },
    { name: 'wolf', generator: generateWildlifeWolfSprite }
  ];

  for (const animal of wildlife) {
    const png = animal.generator();
    const filePath = path.join(SPRITES_DIR, 'wildlife', `${animal.name}.png`);
    savePNG(png, filePath);
    console.log(`  Created: wildlife/${animal.name}.png (16x16)`);
  }

  // Generate building sprites
  console.log('\nGenerating building sprites...');
  const buildings = [
    { name: 'farm', generator: generateFarmSprite },
    { name: 'house', generator: generateHouseSprite },
    { name: 'warehouse', generator: generateWarehouseSprite },
    { name: 'town_center', generator: generateTownCenterSprite },
    { name: 'watchtower', generator: generateWatchtowerSprite },
    { name: 'campfire', generator: generateCampfireSprite },
    { name: 'market', generator: generateMarketSprite },
    { name: 'castle', generator: generateCastleSprite }
  ];

  for (const building of buildings) {
    const png = building.generator();
    const filePath = path.join(SPRITES_DIR, 'buildings', `${building.name}.png`);
    savePNG(png, filePath);
    console.log(`  Created: buildings/${building.name}.png (40x40)`);
  }

  // Generate environmental sprites
  console.log('\nGenerating environmental sprites...');

  // Trees
  const trees = [
    { name: 'tree_oak', generator: generateOakTreeSprite },
    { name: 'tree_pine', generator: generatePineTreeSprite }
  ];

  for (const tree of trees) {
    const png = tree.generator();
    const filePath = path.join(SPRITES_DIR, 'environment', 'trees', `${tree.name}.png`);
    savePNG(png, filePath);
    console.log(`  Created: environment/trees/${tree.name}.png (40x40)`);
  }

  // Rocks
  const rocks = [
    { name: 'rock', generator: generateRockSprite }
  ];

  for (const rock of rocks) {
    const png = rock.generator();
    const filePath = path.join(SPRITES_DIR, 'environment', 'rocks', `${rock.name}.png`);
    savePNG(png, filePath);
    console.log(`  Created: environment/rocks/${rock.name}.png (40x40)`);
  }

  // Ores
  const ores = [
    { name: 'ore_iron', generator: generateIronOreSprite },
    { name: 'ore_gold', generator: generateGoldOreSprite },
    { name: 'ore_crystal', generator: generateCrystalOreSprite }
  ];

  for (const ore of ores) {
    const png = ore.generator();
    const filePath = path.join(SPRITES_DIR, 'environment', 'ores', `${ore.name}.png`);
    savePNG(png, filePath);
    console.log(`  Created: environment/ores/${ore.name}.png (40x40)`);
  }

  // Plants
  const plants = [
    { name: 'bush', generator: generateBushSprite },
    { name: 'bush_berry', generator: generateBerryBushSprite },
    { name: 'mushroom_red', generator: generateMushroomSprite },
    { name: 'grass_clump', generator: generateGrassSprite },
    { name: 'flower_wildflower', generator: generateFlowerSprite }
  ];

  for (const plant of plants) {
    const png = plant.generator();
    const filePath = path.join(SPRITES_DIR, 'environment', 'plants', `${plant.name}.png`);
    savePNG(png, filePath);
    console.log(`  Created: environment/plants/${plant.name}.png (40x40)`);
  }

  console.log('\n✅ Sprite generation complete!');
  console.log(`Total sprites generated: ${monsters.length + wildlife.length + buildings.length + trees.length + rocks.length + ores.length + plants.length}`);
}

// Run the generator
generateAllSprites();
