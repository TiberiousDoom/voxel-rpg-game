/**
 * TierProgressIndicator.jsx - Shows progress toward next tier unlock
 *
 * Features:
 * - Visual progress bar
 * - Shows required and current resources
 * - Shows required buildings for tier advancement
 * - Displays estimated progress percentage
 */

import React, { useMemo, memo } from 'react';
import './TierProgressIndicator.css';

// Resource icons
const RESOURCE_ICONS = {
  wood: '🪵',
  stone: '🪨',
  food: '🌾',
  gold: '💰',
  iron: '⚒️'
};

const TIER_HIERARCHY = ['SURVIVAL', 'PERMANENT', 'TOWN', 'CASTLE'];
const TIER_METADATA = {
  SURVIVAL: { icon: '⚡', label: 'Survival', color: '#4caf50' },
  PERMANENT: { icon: '🏠', label: 'Permanent', color: '#2196f3' },
  TOWN: { icon: '🏛️', label: 'Town', color: '#9c27b0' },
  CASTLE: { icon: '🏰', label: 'Castle', color: '#f44336' }
};

/**
 * TierProgressIndicator - Memoized for performance
 * Re-renders only when tier, resources, or requirements change
 */
const TierProgressIndicator = memo(function TierProgressIndicator({
  currentTier = 'SURVIVAL',
  currentResources = { wood: 0, food: 0, stone: 0 },
  tierRequirements = {},
  gameManager = null
}) {
  const currentTierIndex = TIER_HIERARCHY.indexOf(currentTier);
  const nextTierIndex = currentTierIndex + 1;

  // Get requirements for next tier
  const nextTier = nextTierIndex < TIER_HIERARCHY.length ? TIER_HIERARCHY[nextTierIndex] : null;
  const tierMeta = nextTier ? TIER_METADATA[nextTier] : null;

  // Calculate progress
  const progressData = useMemo(() => {
    if (!nextTier || !tierRequirements[nextTier]) {
      return {
        nextTier: null,
        requirements: [],
        progress: 100,
        isUnlocked: false,
        hasAllRequirements: false
      };
    }

    const requirements = tierRequirements[nextTier];
    const resourceRequirements = requirements.resources || {};
    const buildingRequirements = requirements.buildings || {};

    // Calculate resource progress
    const resourceProgress = Object.entries(resourceRequirements).map(([resource, required]) => {
      const current = currentResources[resource] || 0;
      const progress = Math.min((current / required) * 100, 100);
      const isSatisfied = current >= required;

      return {
        type: 'resource',
        resource,
        required,
        current,
        progress,
        isSatisfied,
        icon: RESOURCE_ICONS[resource.toLowerCase()] || '📦'
      };
    });

    // Calculate building progress
    const buildingProgress = Object.entries(buildingRequirements).map(([buildingType, required]) => {
      let current = 0;
      if (gameManager?.orchestrator?.buildingTracker) {
        try {
          const buildings = gameManager.orchestrator.buildingTracker.getBuildingsByType(buildingType);
          current = buildings ? buildings.length : 0;
        } catch (err) {
          console.warn(`Could not get building count for ${buildingType}`);
        }
      }

      const progress = Math.min((current / required) * 100, 100);
      const isSatisfied = current >= required;

      return {
        type: 'building',
        building: buildingType,
        required,
        current,
        progress,
        isSatisfied
      };
    });

    const allRequirements = [...resourceProgress, ...buildingProgress];
    const hasAllRequirements = allRequirements.every(req => req.isSatisfied);
    const averageProgress = allRequirements.length > 0
      ? Math.round(allRequirements.reduce((sum, req) => sum + req.progress, 0) / allRequirements.length)
      : 100;

    return {
      nextTier,
      requirements: allRequirements,
      progress: averageProgress,
      isUnlocked: nextTierIndex < TIER_HIERARCHY.length,
      hasAllRequirements
    };
  }, [nextTier, nextTierIndex, tierRequirements, currentResources, gameManager]);

  if (!progressData.isUnlocked) {
    return (
      <div className="tier-progress-indicator max-tier">
        <div className="progress-header">
          <span className="tier-icon">👑</span>
          <h3 className="tier-title">Maximum Tier Reached!</h3>
        </div>
        <p className="progress-message">You have achieved the highest civilization level.</p>
      </div>
    );
  }

  return (
    <div className="tier-progress-indicator">
      {/* Header */}
      <div className="progress-header">
        <span className="current-tier">
          <span className="tier-icon">{tierMeta?.icon}</span>
          <span className="tier-label">{tierMeta?.label}</span>
        </span>
        <span className="progress-percent">{progressData.progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${progressData.progress}%` }}
        />
      </div>

      {/* Requirements list */}
      {progressData.requirements.length > 0 && (
        <div className="requirements-section">
          <h4 className="requirements-title">Requirements to Advance</h4>
          <ul className="requirements-list">
            {progressData.requirements.map((req, idx) => (
              <li
                key={idx}
                className={`requirement-item ${req.isSatisfied ? 'satisfied' : 'pending'}`}
              >
                <span className="requirement-status">
                  {req.isSatisfied ? '✓' : '•'}
                </span>
                <span className="requirement-content">
                  {req.type === 'resource' ? (
                    <>
                      <span className="resource-icon">{req.icon}</span>
                      <span className="requirement-label">
                        {req.current} / {req.required} {req.resource}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="requirement-label">
                        {req.current} / {req.required} {req.building}
                      </span>
                    </>
                  )}
                </span>
                {req.type === 'resource' && (
                  <div className="mini-progress-bar">
                    <div
                      className="mini-progress"
                      style={{ width: `${req.progress}%` }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action section */}
      {progressData.hasAllRequirements && (
        <div className="ready-to-advance">
          <span className="ready-icon">🎉</span>
          <span className="ready-text">Ready to advance! Use the Advance Tier button.</span>
        </div>
      )}
    </div>
  );
});

export default TierProgressIndicator;
