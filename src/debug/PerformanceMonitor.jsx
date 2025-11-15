/**
 * PerformanceMonitor.jsx - Real-time performance monitoring UI
 *
 * Displays performance metrics including FPS, memory usage, render stats,
 * and performance warnings. Useful for debugging and optimization.
 *
 * Features:
 * - Real-time FPS monitoring
 * - Memory usage tracking
 * - Render statistics (culling, dirty rects)
 * - Performance warnings and alerts
 * - Collapsible/expandable panel
 *
 * Usage:
 * ```jsx
 * <PerformanceMonitor
 *   gameEngine={gameEngine}
 *   enabled={isDevelopment}
 *   position="top-right"
 * />
 * ```
 */

import React, { useState, useEffect, useRef } from 'react';
import './PerformanceMonitor.css';

const PerformanceMonitor = ({
  gameEngine,
  memoryManager,
  spatialGrid,
  viewportCuller,
  dirtyRectRenderer,
  asyncPathfinder,
  enabled = true,
  position = 'top-right',
  updateInterval = 500, // Update every 500ms
  compact = false
}) => {
  const [stats, setStats] = useState({
    fps: 0,
    frameTime: 0,
    memory: null,
    ticks: 0,
    entities: 0,
    culled: 0,
    dirtyRegions: 0,
    pathfindingStats: null
  });

  const [expanded, setExpanded] = useState(!compact);
  const [warnings, setWarnings] = useState([]);
  const frameTimestamps = useRef([]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      updateStats();
    }, updateInterval);

    return () => clearInterval(interval);
  }, [enabled, updateInterval]);

  /**
   * Update all performance statistics
   */
  const updateStats = () => {
    const newStats = {};
    const newWarnings = [];

    // FPS calculation
    const now = performance.now();
    frameTimestamps.current.push(now);

    // Keep only last 60 frames
    if (frameTimestamps.current.length > 60) {
      frameTimestamps.current.shift();
    }

    // Calculate FPS
    if (frameTimestamps.current.length >= 2) {
      const oldest = frameTimestamps.current[0];
      const newest = frameTimestamps.current[frameTimestamps.current.length - 1];
      const elapsed = (newest - oldest) / 1000;
      newStats.fps = Math.round(frameTimestamps.current.length / elapsed);
    } else {
      newStats.fps = 0;
    }

    // FPS warning
    if (newStats.fps < 30 && newStats.fps > 0) {
      newWarnings.push({ type: 'error', message: 'Low FPS detected' });
    } else if (newStats.fps < 50 && newStats.fps > 0) {
      newWarnings.push({ type: 'warning', message: 'FPS below target' });
    }

    // Game engine stats
    if (gameEngine) {
      const engineStats = gameEngine.getEngineStats();
      newStats.frameTime = parseFloat(engineStats.frameTime);
      newStats.ticks = engineStats.ticksElapsed;

      if (newStats.frameTime > 16.67) { // 60 FPS = 16.67ms per frame
        newWarnings.push({ type: 'warning', message: 'Frame time exceeds 16.67ms' });
      }
    }

    // Memory stats
    if (memoryManager) {
      const memoryReport = memoryManager.getMemoryReport();
      newStats.memory = memoryReport.memory;

      if (memoryReport.memory && parseFloat(memoryReport.memory.utilizationPercent) > 80) {
        newWarnings.push({ type: 'error', message: 'High memory usage' });
      }
    }

    // Spatial grid stats
    if (spatialGrid) {
      const gridStats = spatialGrid.getStats();
      newStats.entities = gridStats.totalEntities;
    }

    // Viewport culling stats
    if (viewportCuller) {
      const cullStats = viewportCuller.getStats();
      newStats.culled = cullStats.entitiesCulled;
      newStats.cullPercent = cullStats.cullPercent;
    }

    // Dirty rect rendering stats
    if (dirtyRectRenderer) {
      const renderStats = dirtyRectRenderer.getStats();
      newStats.dirtyRegions = renderStats.totalRegions;
      newStats.dirtyPercent = renderStats.averageDirtyPercent;
    }

    // Pathfinding stats
    if (asyncPathfinder) {
      newStats.pathfindingStats = asyncPathfinder.getStats();
    }

    setStats(newStats);
    setWarnings(newWarnings);
  };

  /**
   * Get FPS color based on value
   */
  const getFpsColor = (fps) => {
    if (fps >= 55) return 'good';
    if (fps >= 30) return 'warning';
    return 'error';
  };

  /**
   * Get memory color based on utilization
   */
  const getMemoryColor = (percent) => {
    if (percent < 60) return 'good';
    if (percent < 80) return 'warning';
    return 'error';
  };

  if (!enabled) return null;

  return (
    <div className={`performance-monitor performance-monitor--${position}`}>
      {/* Header */}
      <div
        className="performance-monitor__header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="performance-monitor__title">Performance</span>
        <span className={`performance-monitor__fps performance-monitor__fps--${getFpsColor(stats.fps)}`}>
          {stats.fps} FPS
        </span>
        <button className="performance-monitor__toggle">
          {expanded ? '−' : '+'}
        </button>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="performance-monitor__warnings">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className={`performance-monitor__warning performance-monitor__warning--${warning.type}`}
            >
              {warning.message}
            </div>
          ))}
        </div>
      )}

      {/* Expanded Stats */}
      {expanded && (
        <div className="performance-monitor__body">
          {/* Rendering Stats */}
          <div className="performance-monitor__section">
            <div className="performance-monitor__section-title">Rendering</div>
            <div className="performance-monitor__stat">
              <span className="performance-monitor__stat-label">FPS:</span>
              <span className={`performance-monitor__stat-value performance-monitor__stat-value--${getFpsColor(stats.fps)}`}>
                {stats.fps}
              </span>
            </div>
            <div className="performance-monitor__stat">
              <span className="performance-monitor__stat-label">Frame Time:</span>
              <span className="performance-monitor__stat-value">
                {stats.frameTime.toFixed(2)}ms
              </span>
            </div>
            {stats.dirtyPercent !== undefined && (
              <div className="performance-monitor__stat">
                <span className="performance-monitor__stat-label">Dirty Regions:</span>
                <span className="performance-monitor__stat-value">
                  {stats.dirtyPercent}%
                </span>
              </div>
            )}
          </div>

          {/* Memory Stats */}
          {stats.memory && (
            <div className="performance-monitor__section">
              <div className="performance-monitor__section-title">Memory</div>
              <div className="performance-monitor__stat">
                <span className="performance-monitor__stat-label">Used:</span>
                <span className={`performance-monitor__stat-value performance-monitor__stat-value--${getMemoryColor(parseFloat(stats.memory.utilizationPercent))}`}>
                  {stats.memory.usedMB}MB
                </span>
              </div>
              <div className="performance-monitor__stat">
                <span className="performance-monitor__stat-label">Total:</span>
                <span className="performance-monitor__stat-value">
                  {stats.memory.totalMB}MB
                </span>
              </div>
              <div className="performance-monitor__stat">
                <span className="performance-monitor__stat-label">Utilization:</span>
                <span className="performance-monitor__stat-value">
                  {stats.memory.utilizationPercent}%
                </span>
              </div>
            </div>
          )}

          {/* Entity Stats */}
          <div className="performance-monitor__section">
            <div className="performance-monitor__section-title">Entities</div>
            <div className="performance-monitor__stat">
              <span className="performance-monitor__stat-label">Total:</span>
              <span className="performance-monitor__stat-value">
                {stats.entities}
              </span>
            </div>
            {stats.cullPercent !== undefined && (
              <div className="performance-monitor__stat">
                <span className="performance-monitor__stat-label">Culled:</span>
                <span className="performance-monitor__stat-value">
                  {stats.cullPercent}%
                </span>
              </div>
            )}
          </div>

          {/* Pathfinding Stats */}
          {stats.pathfindingStats && (
            <div className="performance-monitor__section">
              <div className="performance-monitor__section-title">Pathfinding</div>
              <div className="performance-monitor__stat">
                <span className="performance-monitor__stat-label">Avg Time:</span>
                <span className="performance-monitor__stat-value">
                  {stats.pathfindingStats.averageTimeMs.toFixed(2)}ms
                </span>
              </div>
              <div className="performance-monitor__stat">
                <span className="performance-monitor__stat-label">Cache Hit:</span>
                <span className="performance-monitor__stat-value">
                  {stats.pathfindingStats.cacheHitRate}
                </span>
              </div>
            </div>
          )}

          {/* Game Stats */}
          {stats.ticks !== undefined && (
            <div className="performance-monitor__section">
              <div className="performance-monitor__section-title">Game</div>
              <div className="performance-monitor__stat">
                <span className="performance-monitor__stat-label">Ticks:</span>
                <span className="performance-monitor__stat-value">
                  {stats.ticks}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
