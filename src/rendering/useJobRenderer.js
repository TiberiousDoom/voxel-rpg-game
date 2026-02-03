/**
 * useJobRenderer.js - Terrain job overlay rendering
 *
 * Phase 4: Terrain Job System
 *
 * Renders visual overlays for terrain jobs:
 * - Selection overlay (while player is selecting area)
 * - Pending job overlays (jobs waiting for workers)
 * - Active job overlays (jobs being worked on with progress bars)
 *
 * Usage:
 *   const { renderJobSelection, renderJobOverlays } = useJobRenderer();
 *   renderJobSelection(ctx, start, end, toolMode);
 *   renderJobOverlays(ctx, jobs, worldToCanvas);
 */

import { useCallback } from 'react';
import { JOB_STATE } from '../modules/terrain-jobs/TerrainJob';

/**
 * Tool mode colors for selection overlay
 */
const TOOL_COLORS = {
  flatten: {
    fill: 'rgba(255, 255, 0, 0.3)',      // Yellow
    stroke: 'rgba(255, 255, 0, 0.8)',
    name: '🏗️ Flatten'
  },
  raise: {
    fill: 'rgba(0, 255, 0, 0.3)',        // Green
    stroke: 'rgba(0, 255, 0, 0.8)',
    name: '⬆️ Raise'
  },
  lower: {
    fill: 'rgba(255, 0, 0, 0.3)',        // Red
    stroke: 'rgba(255, 0, 0, 0.8)',
    name: '⬇️ Lower'
  },
  smooth: {
    fill: 'rgba(0, 150, 255, 0.3)',      // Blue
    stroke: 'rgba(0, 150, 255, 0.8)',
    name: '〰️ Smooth'
  }
};

/**
 * Job state colors
 */
const JOB_STATE_COLORS = {
  [JOB_STATE.PENDING]: {
    fill: 'rgba(255, 255, 255, 0.2)',
    stroke: 'rgba(255, 255, 255, 0.6)',
    text: '#FFFFFF'
  },
  [JOB_STATE.ACTIVE]: {
    fill: 'rgba(0, 255, 0, 0.2)',
    stroke: 'rgba(0, 255, 0, 0.8)',
    text: '#00FF00',
    progressFill: 'rgba(0, 255, 0, 0.8)',
    progressBg: 'rgba(0, 0, 0, 0.5)'
  }
};

/**
 * Job overlay rendering hook
 */
export const useJobRenderer = () => {
  /**
   * Render job selection overlay (while player is selecting area)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {object} start - Start position {x, y} in canvas coordinates
   * @param {object} end - End position {x, y} in canvas coordinates
   * @param {string} toolMode - Tool mode (flatten, raise, lower, smooth)
   * @param {object} previewInfo - Optional preview info {tiles, estimatedTime}
   */
  const renderJobSelection = useCallback((ctx, start, end, toolMode, previewInfo = null) => {
    if (!ctx || !start || !end || !toolMode) return;

    const colors = TOOL_COLORS[toolMode];
    if (!colors) return;

    ctx.save();

    // Calculate rectangle dimensions
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    // Fill rectangle
    ctx.fillStyle = colors.fill;
    ctx.fillRect(x, y, width, height);

    // Stroke border
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Draw corner markers
    const markerSize = 8;
    ctx.fillStyle = colors.stroke;
    // Top-left
    ctx.fillRect(x - markerSize / 2, y - markerSize / 2, markerSize, markerSize);
    // Top-right
    ctx.fillRect(x + width - markerSize / 2, y - markerSize / 2, markerSize, markerSize);
    // Bottom-left
    ctx.fillRect(x - markerSize / 2, y + height - markerSize / 2, markerSize, markerSize);
    // Bottom-right
    ctx.fillRect(x + width - markerSize / 2, y + height - markerSize / 2, markerSize, markerSize);

    // Draw preview info if provided
    if (previewInfo) {
      const infoY = y - 40;

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x, infoY, width, 32);

      // Text
      ctx.fillStyle = colors.stroke;
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = `${colors.name} | ${previewInfo.tiles} tiles | Est: ${previewInfo.estimatedTime}`;
      ctx.fillText(text, x + width / 2, infoY + 16);
    }

    ctx.restore();
  }, []);

  /**
   * Render all job overlays
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array<TerrainJob>} jobs - Jobs to render
   * @param {function} worldToCanvas - World to canvas coordinate converter
   * @param {number} tileSize - Tile size in pixels
   */
  const renderJobOverlays = useCallback((ctx, jobs, worldToCanvas, tileSize) => {
    if (!ctx || !jobs || jobs.length === 0 || !worldToCanvas) return;

    ctx.save();

    for (const job of jobs) {
      // Skip completed/cancelled jobs
      if (job.state === JOB_STATE.COMPLETED || job.state === JOB_STATE.CANCELLED) {
        continue;
      }

      const colors = JOB_STATE_COLORS[job.state];
      if (!colors) continue;

      // Get canvas positions for job area
      const start = worldToCanvas(job.area.x, job.area.z);
      const end = worldToCanvas(
        job.area.x + job.area.width,
        job.area.z + job.area.depth
      );

      const x = start.x;
      const y = start.y;
      const width = end.x - start.x;
      const height = end.y - start.y;

      // Fill rectangle
      ctx.fillStyle = colors.fill;
      ctx.fillRect(x, y, width, height);

      // Stroke border
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw job info label
      const labelHeight = 20;
      const labelY = y - labelHeight - 4;

      // Label background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(x, labelY, width, labelHeight);

      // Label text
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const jobTypeIcon = {
        flatten: '🏗️',
        raise: '⬆️',
        lower: '⬇️',
        smooth: '〰️'
      }[job.type] || '?';

      const statusText = job.state === JOB_STATE.ACTIVE
        ? `Working (${job.assignedWorkers.length}/${job.maxWorkers})`
        : 'Pending';

      ctx.fillText(
        `${jobTypeIcon} ${job.type} | ${statusText} | P${job.priority}`,
        x + 4,
        labelY + labelHeight / 2
      );

      // Draw progress bar for active jobs
      if (job.state === JOB_STATE.ACTIVE) {
        const progressBarHeight = 6;
        const progressBarY = y + height + 4;
        const progressBarWidth = width * job.progress;

        // Background
        ctx.fillStyle = colors.progressBg;
        ctx.fillRect(x, progressBarY, width, progressBarHeight);

        // Progress fill
        ctx.fillStyle = colors.progressFill;
        ctx.fillRect(x, progressBarY, progressBarWidth, progressBarHeight);

        // Progress text
        ctx.fillStyle = colors.text;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${Math.floor(job.progress * 100)}% - ${job.getTimeRemaining()}`,
          x + width / 2,
          progressBarY + progressBarHeight + 12
        );
      }

      // Draw worker positions for active jobs
      if (job.state === JOB_STATE.ACTIVE && job.assignedWorkers.length > 0) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
        for (let i = 0; i < job.assignedWorkers.length; i++) {
          const workerPos = job.getWorkerPosition(i);
          const workerCanvas = worldToCanvas(workerPos.x, workerPos.z);

          // Draw small circle at worker position
          ctx.beginPath();
          ctx.arc(workerCanvas.x + tileSize / 2, workerCanvas.y + tileSize / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }, []);

  /**
   * Render job statistics overlay (top-right corner)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {object} stats - Job statistics
   */
  const renderJobStatistics = useCallback((ctx, stats) => {
    if (!ctx || !stats) return;

    ctx.save();

    const x = ctx.canvas.width - 200;
    const y = 10;
    const width = 190;
    const height = 80;
    const padding = 8;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Terrain Jobs', x + padding, y + padding + 10);

    // Stats
    ctx.font = '11px Arial';
    ctx.fillStyle = '#AAAAAA';

    let textY = y + padding + 28;
    ctx.fillText(`Pending: ${stats.pendingJobsCount || 0}`, x + padding, textY);

    textY += 14;
    ctx.fillStyle = '#00FF00';
    ctx.fillText(`Active: ${stats.activeJobsCount || 0}`, x + padding, textY);

    textY += 14;
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Completed: ${stats.totalJobsCompleted || 0}`, x + padding, textY);

    ctx.restore();
  }, []);

  return {
    renderJobSelection,
    renderJobOverlays,
    renderJobStatistics
  };
};
