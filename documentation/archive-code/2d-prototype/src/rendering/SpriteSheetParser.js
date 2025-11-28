/**
 * SpriteSheetParser.js
 * Parses sprite sheets and extracts individual frames
 *
 * Features:
 * - Horizontal sprite sheet parsing
 * - Frame extraction to canvas elements
 * - Efficient frame caching
 * - Support for variable frame counts
 */

/**
 * SpriteSheetParser class
 * Extracts individual frames from a sprite sheet
 */
class SpriteSheetParser {
  /**
   * Create a sprite sheet parser
   *
   * @param {HTMLImageElement} image - The sprite sheet image
   * @param {number} frameWidth - Width of each frame in pixels
   * @param {number} frameHeight - Height of each frame in pixels
   */
  constructor(image, frameWidth, frameHeight) {
    if (!image || !image.complete) {
      throw new Error('Sprite sheet image must be loaded before parsing');
    }

    if (frameWidth <= 0 || frameHeight <= 0) {
      throw new Error('Frame dimensions must be positive');
    }

    this.image = image;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;

    /**
     * Calculate frame count based on image dimensions
     * Assumes horizontal sprite strip layout
     */
    this.frameCount = Math.floor(image.width / frameWidth);

    if (this.frameCount === 0) {
      throw new Error(`Image width (${image.width}) is smaller than frame width (${frameWidth})`);
    }

    /**
     * Cache for extracted frames
     * Map<number, HTMLCanvasElement>
     */
    this.frameCache = new Map();
  }

  /**
   * Extract a specific frame from the sprite sheet
   *
   * @param {number} frameIndex - Zero-based frame index
   * @returns {HTMLCanvasElement}
   */
  extractFrame(frameIndex) {
    if (frameIndex < 0 || frameIndex >= this.frameCount) {
      throw new Error(`Frame index ${frameIndex} out of range (0-${this.frameCount - 1})`);
    }

    // Return cached frame if available
    if (this.frameCache.has(frameIndex)) {
      return this.frameCache.get(frameIndex);
    }

    // Create a canvas for this frame
    const canvas = document.createElement('canvas');
    canvas.width = this.frameWidth;
    canvas.height = this.frameHeight;

    const ctx = canvas.getContext('2d');

    // Calculate source position in sprite sheet
    const sourceX = frameIndex * this.frameWidth;
    const sourceY = 0;

    // Draw frame to canvas
    ctx.drawImage(
      this.image,
      sourceX, sourceY,                    // Source position
      this.frameWidth, this.frameHeight,   // Source dimensions
      0, 0,                                 // Destination position
      this.frameWidth, this.frameHeight    // Destination dimensions
    );

    // Cache the frame
    this.frameCache.set(frameIndex, canvas);

    return canvas;
  }

  /**
   * Extract all frames from the sprite sheet
   *
   * @returns {Array<HTMLCanvasElement>}
   */
  extractAllFrames() {
    const frames = [];

    for (let i = 0; i < this.frameCount; i++) {
      frames.push(this.extractFrame(i));
    }

    return frames;
  }

  /**
   * Get the number of frames in the sprite sheet
   *
   * @returns {number}
   */
  getFrameCount() {
    return this.frameCount;
  }

  /**
   * Get frame dimensions
   *
   * @returns {Object} { width, height }
   */
  getFrameDimensions() {
    return {
      width: this.frameWidth,
      height: this.frameHeight
    };
  }

  /**
   * Get the source image
   *
   * @returns {HTMLImageElement}
   */
  getImage() {
    return this.image;
  }

  /**
   * Clear the frame cache to free memory
   */
  clearCache() {
    this.frameCache.clear();
  }

  /**
   * Get cache statistics
   *
   * @returns {Object}
   */
  getCacheStats() {
    return {
      totalFrames: this.frameCount,
      cachedFrames: this.frameCache.size,
      frameWidth: this.frameWidth,
      frameHeight: this.frameHeight,
      imageWidth: this.image.width,
      imageHeight: this.image.height
    };
  }

  /**
   * Draw a specific frame directly to a target canvas context
   * Avoids creating intermediate canvas elements
   *
   * @param {CanvasRenderingContext2D} ctx - Target canvas context
   * @param {number} frameIndex - Frame to draw
   * @param {number} x - X position on target canvas
   * @param {number} y - Y position on target canvas
   * @param {number} width - Width to draw (defaults to frameWidth)
   * @param {number} height - Height to draw (defaults to frameHeight)
   */
  drawFrame(ctx, frameIndex, x, y, width = this.frameWidth, height = this.frameHeight) {
    if (frameIndex < 0 || frameIndex >= this.frameCount) {
      throw new Error(`Frame index ${frameIndex} out of range (0-${this.frameCount - 1})`);
    }

    const sourceX = frameIndex * this.frameWidth;

    ctx.drawImage(
      this.image,
      sourceX, 0,                          // Source position
      this.frameWidth, this.frameHeight,   // Source dimensions
      x, y,                                 // Destination position
      width, height                         // Destination dimensions
    );
  }

  /**
   * Draw a frame with horizontal flipping
   *
   * @param {CanvasRenderingContext2D} ctx - Target canvas context
   * @param {number} frameIndex - Frame to draw
   * @param {number} x - X position on target canvas
   * @param {number} y - Y position on target canvas
   * @param {number} width - Width to draw (defaults to frameWidth)
   * @param {number} height - Height to draw (defaults to frameHeight)
   * @param {boolean} flipX - Whether to flip horizontally
   */
  drawFrameFlipped(ctx, frameIndex, x, y, width = this.frameWidth, height = this.frameHeight, flipX = false) {
    if (!flipX) {
      this.drawFrame(ctx, frameIndex, x, y, width, height);
      return;
    }

    ctx.save();
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    this.drawFrame(ctx, frameIndex, 0, 0, width, height);
    ctx.restore();
  }
}

export default SpriteSheetParser;
