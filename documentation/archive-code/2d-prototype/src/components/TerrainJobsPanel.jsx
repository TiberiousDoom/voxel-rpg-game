/**
 * TerrainJobsPanel.jsx - Job Management UI for Terrain Jobs
 * Phase 4: Terrain Job System
 *
 * Displays list of all terrain jobs with:
 * - Job type, status, priority
 * - Area size and estimated time
 * - Progress bars for active jobs
 * - Worker assignments
 * - Cancel/remove job actions
 */

import React from 'react';
import PropTypes from 'prop-types';
import { JOB_STATE, JOB_TYPE, PRIORITY_LEVELS } from '../modules/terrain-jobs/TerrainJob.js';
import { JobTimeCalculator } from '../modules/terrain-jobs/JobTimeCalculator.js';
import './TerrainJobsPanel.css';

/**
 * Get icon for job type
 * @param {string} type - Job type
 * @returns {string} Emoji icon
 */
const getJobIcon = (type) => {
  switch (type) {
    case JOB_TYPE.FLATTEN:
      return '🏗️';
    case JOB_TYPE.RAISE:
      return '⬆️';
    case JOB_TYPE.LOWER:
      return '⬇️';
    case JOB_TYPE.SMOOTH:
      return '〰️';
    default:
      return '🔨';
  }
};

/**
 * Get color for job priority
 * @param {number} priority - Priority 1-10
 * @returns {string} Color class
 */
const getPriorityColor = (priority) => {
  if (priority >= 10) return 'urgent';
  if (priority >= 7) return 'high';
  if (priority >= 4) return 'normal';
  return 'low';
};

/**
 * Get color for job state
 * @param {string} state - Job state
 * @returns {string} Color class
 */
const getStateColor = (state) => {
  switch (state) {
    case JOB_STATE.PENDING:
      return 'pending';
    case JOB_STATE.ACTIVE:
      return 'active';
    case JOB_STATE.COMPLETED:
      return 'completed';
    case JOB_STATE.CANCELLED:
      return 'cancelled';
    default:
      return 'unknown';
  }
};

/**
 * Format priority level name
 * @param {number} priority - Priority 1-10
 * @returns {string} Priority name
 */
const getPriorityName = (priority) => {
  if (priority >= 10) return 'Urgent';
  if (priority >= 7) return 'High';
  if (priority >= 4) return 'Normal';
  return 'Low';
};

/**
 * Individual job card component
 */
function JobCard({ job, onCancel }) {
  const icon = getJobIcon(job.type);
  const priorityColor = getPriorityColor(job.priority);
  const stateColor = getStateColor(job.state);
  const priorityName = getPriorityName(job.priority);

  const areaSize = job.area.width * job.area.depth;
  const estimatedTime = JobTimeCalculator.formatTime(job.estimatedTime);
  const progressPercent = Math.round(job.progress * 100);

  return (
    <div className={`job-card job-card-${stateColor}`}>
      <div className="job-card-header">
        <div className="job-type">
          <span className="job-icon">{icon}</span>
          <span className="job-type-name">{job.type}</span>
        </div>
        <div className={`job-priority priority-${priorityColor}`}>
          {priorityName}
        </div>
      </div>

      <div className="job-card-body">
        <div className="job-info-row">
          <span className="job-label">Status:</span>
          <span className={`job-status status-${stateColor}`}>{job.state}</span>
        </div>

        <div className="job-info-row">
          <span className="job-label">Area:</span>
          <span className="job-value">
            {job.area.width}×{job.area.depth} ({areaSize} tiles)
          </span>
        </div>

        <div className="job-info-row">
          <span className="job-label">Location:</span>
          <span className="job-value">
            ({job.area.x}, {job.area.z})
          </span>
        </div>

        <div className="job-info-row">
          <span className="job-label">Time:</span>
          <span className="job-value">{estimatedTime}</span>
        </div>

        {job.state === JOB_STATE.ACTIVE && (
          <>
            <div className="job-info-row">
              <span className="job-label">Workers:</span>
              <span className="job-value">{job.assignedWorkers.length}</span>
            </div>

            <div className="job-progress">
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="progress-text">{progressPercent}%</span>
            </div>
          </>
        )}
      </div>

      <div className="job-card-footer">
        {(job.state === JOB_STATE.PENDING || job.state === JOB_STATE.ACTIVE) && (
          <button
            className="job-cancel-btn"
            onClick={() => onCancel(job.id)}
            title="Cancel this job"
          >
            Cancel Job
          </button>
        )}
        <span className="job-id">ID: {job.id}</span>
      </div>
    </div>
  );
}

JobCard.propTypes = {
  job: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired
};

/**
 * Terrain Jobs Panel Component
 */
function TerrainJobsPanel({ jobs = [], onCancelJob = () => {}, onClose = () => {} }) {
  // Filter jobs by state
  const pendingJobs = jobs.filter(j => j.state === JOB_STATE.PENDING);
  const activeJobs = jobs.filter(j => j.state === JOB_STATE.ACTIVE);
  const completedJobs = jobs.filter(j => j.state === JOB_STATE.COMPLETED);
  const cancelledJobs = jobs.filter(j => j.state === JOB_STATE.CANCELLED);

  const totalJobs = jobs.length;

  return (
    <div className="terrain-jobs-panel">
      <div className="panel-header">
        <h2>Terrain Jobs</h2>
        <button className="close-btn" onClick={onClose} title="Close panel">
          ✕
        </button>
      </div>

      <div className="panel-stats">
        <div className="stat-item">
          <span className="stat-value">{pendingJobs.length}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{activeJobs.length}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{completedJobs.length}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{totalJobs}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      <div className="panel-body">
        {totalJobs === 0 ? (
          <div className="empty-state">
            <p>No terrain jobs</p>
            <p className="empty-state-hint">
              Use the Terrain Tools panel to create jobs
            </p>
          </div>
        ) : (
          <>
            {/* Active Jobs */}
            {activeJobs.length > 0 && (
              <div className="job-section">
                <h3 className="section-title">
                  Active Jobs ({activeJobs.length})
                </h3>
                <div className="job-list">
                  {activeJobs.map(job => (
                    <JobCard key={job.id} job={job} onCancel={onCancelJob} />
                  ))}
                </div>
              </div>
            )}

            {/* Pending Jobs */}
            {pendingJobs.length > 0 && (
              <div className="job-section">
                <h3 className="section-title">
                  Pending Jobs ({pendingJobs.length})
                </h3>
                <div className="job-list">
                  {pendingJobs.map(job => (
                    <JobCard key={job.id} job={job} onCancel={onCancelJob} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Jobs */}
            {completedJobs.length > 0 && (
              <div className="job-section">
                <h3 className="section-title">
                  Completed Jobs ({completedJobs.length})
                </h3>
                <div className="job-list">
                  {completedJobs.slice(0, 5).map(job => (
                    <JobCard key={job.id} job={job} onCancel={onCancelJob} />
                  ))}
                </div>
                {completedJobs.length > 5 && (
                  <p className="more-indicator">
                    + {completedJobs.length - 5} more completed
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

TerrainJobsPanel.propTypes = {
  jobs: PropTypes.arrayOf(PropTypes.object),
  onCancelJob: PropTypes.func,
  onClose: PropTypes.func
};

export default TerrainJobsPanel;
