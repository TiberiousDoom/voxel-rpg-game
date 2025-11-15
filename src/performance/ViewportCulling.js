/**
 * ViewportCulling.js - Frustum culling for viewport optimization
 *
 * Implements viewport culling to avoid rendering entities outside the
 * visible camera view. Dramatically improves performance in large game
 * worlds by only rendering what the player can see.
 *
 * Performance Benefits:
 * - Reduces draw calls by 50-90% depending on viewport coverage
 * - Works with camera pan and zoom
 * - Supports entity-based and tile-based culling
 * - Configurable padding for smooth scrolling
 *
 * Usage:
 * ```javascript
 * const culler = new ViewportCulling(camera);
 * const visibleEntities = culler.cullEntities(allEntities);
 * const visibleTiles = culler.cullTiles(minX, minZ, maxX, maxZ);
 * ```
 */

class ViewportCulling {
  /**
   * Initialize viewport culling
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Camera/viewport configuration
    this.viewport = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      zoom: 1.0
    };

    // Configuration
    this.config = {
      padding: options.padding || 100, // Extra pixels around viewport
      enablePadding: options.enablePadding !== false,
      enableStats: options.enableStats !== false,
      ...options
    };

    // Statistics
    this.stats = {
      totalChecks: 0,
      entitiesCulled: 0,
      entitiesVisible: 0,
      tilesCulled: 0,
      tilesVisible: 0,
      cullPercent: 0
    };

    // Culling bounds cache
    this.cullingBounds = {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0
    };
  }

  /**
   * Update viewport dimensions
   * @param {number} x - Viewport X (world coordinates)
   * @param {number} y - Viewport Y (world coordinates)
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   * @param {number} zoom - Zoom level (default: 1.0)
   */
  updateViewport(x, y, width, height, zoom = 1.0) {
    this.viewport.x = x;
    this.viewport.y = y;
    this.viewport.width = width;
    this.viewport.height = height;
    this.viewport.zoom = zoom;

    // Recalculate culling bounds
    this._updateCullingBounds();
  }

  /**
   * Update culling bounds with padding
   * @private
   */
  _updateCullingBounds() {
    const padding = this.config.enablePadding ? this.config.padding : 0;

    // Apply zoom to viewport size
    const zoomedWidth = this.viewport.width / this.viewport.zoom;
    const zoomedHeight = this.viewport.height / this.viewport.zoom;

    this.cullingBounds.minX = this.viewport.x - padding;
    this.cullingBounds.minY = this.viewport.y - padding;
    this.cullingBounds.maxX = this.viewport.x + zoomedWidth + padding;
    this.cullingBounds.maxY = this.viewport.y + zoomedHeight + padding;
  }

  /**
   * Check if a point is visible
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if visible
   */
  isPointVisible(x, y) {
    return x >= this.cullingBounds.minX &&
           x <= this.cullingBounds.maxX &&
           y >= this.cullingBounds.minY &&
           y <= this.cullingBounds.maxY;
  }

  /**
   * Check if a rectangle is visible (or partially visible)
   * @param {number} x - Rectangle X
   * @param {number} y - Rectangle Y
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @returns {boolean} True if visible
   */
  isRectVisible(x, y, width, height) {
    this.stats.totalChecks++;

    // Check if rectangle intersects with viewport
    const visible = !(x + width < this.cullingBounds.minX ||
                     x > this.cullingBounds.maxX ||
                     y + height < this.cullingBounds.minY ||
                     y > this.cullingBounds.maxY);

    if (!visible) {
      this.stats.entitiesCulled++;
    } else {
      this.stats.entitiesVisible++;
    }

    return visible;
  }

  /**
   * Check if a circle is visible
   * @param {number} centerX - Circle center X
   * @param {number} centerY - Circle center Y
   * @param {number} radius - Circle radius
   * @returns {boolean} True if visible
   */
  isCircleVisible(centerX, centerY, radius) {
    this.stats.totalChecks++;

    // Simple bounds check - treat as square for performance
    const visible = this.isRectVisible(
      centerX - radius,
      centerY - radius,
      radius * 2,
      radius * 2
    );

    return visible;
  }

  /**
   * Cull entities based on their position and size
   * @param {Array} entities - Array of entities with x, y, width, height
   * @returns {Array} Visible entities
   */
  cullEntities(entities) {
    if (!entities || entities.length === 0) {
      return [];
    }

    const visible = [];

    for (const entity of entities) {
      // Use entity bounds if available, otherwise default size
      const width = entity.width || 1;
      const height = entity.height || 1;
      const x = entity.x || 0;
      const y = entity.y || entity.z || 0; // Support both y and z coordinates

      if (this.isRectVisible(x, y, width, height)) {
        visible.push(entity);
      }
    }

    // Update statistics
    this._updateCullPercent();

    return visible;
  }

  /**
   * Cull entities with circular bounds
   * @param {Array} entities - Array of entities with x, y, radius
   * @returns {Array} Visible entities
   */
  cullCircularEntities(entities) {
    if (!entities || entities.length === 0) {
      return [];
    }

    const visible = [];

    for (const entity of entities) {
      const radius = entity.radius || 0.5;
      const x = entity.x || 0;
      const y = entity.y || entity.z || 0;

      if (this.isCircleVisible(x, y, radius)) {
        visible.push(entity);
      }
    }

    this._updateCullPercent();

    return visible;
  }

  /**
   * Get visible tile range (for tile-based rendering)
   * @param {number} tileSize - Size of each tile
   * @returns {Object} Visible tile range {minTileX, minTileY, maxTileX, maxTileY}
   */
  getVisibleTileRange(tileSize = 1) {
    const minTileX = Math.floor(this.cullingBounds.minX / tileSize);
    const minTileY = Math.floor(this.cullingBounds.minY / tileSize);
    const maxTileX = Math.ceil(this.cullingBounds.maxX / tileSize);
    const maxTileY = Math.ceil(this.cullingBounds.maxY / tileSize);

    return {
      minTileX,
      minTileY,
      maxTileX,
      maxTileY,
      width: maxTileX - minTileX,
      height: maxTileY - minTileY,
      totalTiles: (maxTileX - minTileX) * (maxTileY - minTileY)
    };
  }

  /**
   * Cull tiles based on grid coordinates
   * @param {number} minX - Grid min X
   * @param {number} minY - Grid min Y
   * @param {number} maxX - Grid max X
   * @param {number} maxY - Grid max Y
   * @param {number} tileSize - Size of each tile (default: 1)
   * @returns {Object} Culled tile range
   */
  cullTiles(minX, minY, maxX, maxY, tileSize = 1) {
    const visibleRange = this.getVisibleTileRange(tileSize);

    // Clamp to world bounds
    const culledMinX = Math.max(minX, visibleRange.minTileX);
    const culledMinY = Math.max(minY, visibleRange.minTileY);
    const culledMaxX = Math.min(maxX, visibleRange.maxTileX);
    const culledMaxY = Math.min(maxY, visibleRange.maxTileY);

    const totalTiles = (maxX - minX) * (maxY - minY);
    const visibleTiles = (culledMaxX - culledMinX) * (culledMaxY - culledMinY);

    this.stats.tilesCulled += (totalTiles - visibleTiles);
    this.stats.tilesVisible += visibleTiles;

    return {
      minX: culledMinX,
      minY: culledMinY,
      maxX: culledMaxX,
      maxY: culledMaxY,
      totalTiles,
      visibleTiles,
      culledTiles: totalTiles - visibleTiles,
      cullPercent: ((1 - visibleTiles / totalTiles) * 100).toFixed(2)
    };
  }

  /**
   * Check if entity is within frustum (advanced culling)
   * @param {Object} entity - Entity with position and bounds
   * @param {Object} camera - Camera with position, rotation, fov
   * @returns {boolean} True if in frustum
   */
  isInFrustum(entity, camera) {
    // For 2D/isometric view, frustum culling is equivalent to bounds checking
    // This can be extended for true 3D perspective cameras

    const width = entity.width || 1;
    const height = entity.height || 1;

    return this.isRectVisible(entity.x, entity.y || entity.z, width, height);
  }

  /**
   * Get current culling bounds
   * @returns {Object} Culling bounds
   */
  getCullingBounds() {
    return { ...this.cullingBounds };
  }

  /**
   * Get viewport info
   * @returns {Object} Viewport configuration
   */
  getViewport() {
    return { ...this.viewport };
  }

  /**
   * Update cull percent statistic
   * @private
   */
  _updateCullPercent() {
    const total = this.stats.entitiesCulled + this.stats.entitiesVisible;
    if (total > 0) {
      this.stats.cullPercent = ((this.stats.entitiesCulled / total) * 100).toFixed(2);
    }
  }

  /**
   * Get culling statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalChecks: 0,
      entitiesCulled: 0,
      entitiesVisible: 0,
      tilesCulled: 0,
      tilesVisible: 0,
      cullPercent: 0
    };
  }

  /**
   * Set padding
   * @param {number} padding - Padding in pixels
   */
  setPadding(padding) {
    this.config.padding = padding;
    this._updateCullingBounds();
  }

  /**
   * Enable/disable padding
   * @param {boolean} enabled - Enable padding
   */
  setEnablePadding(enabled) {
    this.config.enablePadding = enabled;
    this._updateCullingBounds();
  }

  /**
   * Debug: Visualize culling bounds
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} camera - Camera for world-to-screen conversion
   */
  debugVisualize(ctx, camera = null) {
    ctx.save();

    // Draw culling bounds
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const bounds = this.cullingBounds;

    if (camera) {
      // Convert world coords to screen coords
      const screenX = (bounds.minX - camera.x) * camera.zoom;
      const screenY = (bounds.minY - camera.y) * camera.zoom;
      const screenWidth = (bounds.maxX - bounds.minX) * camera.zoom;
      const screenHeight = (bounds.maxY - bounds.minY) * camera.zoom;

      ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
    } else {
      // Use bounds directly
      ctx.strokeRect(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      );
    }

    ctx.restore();
  }
}

export default ViewportCulling;
