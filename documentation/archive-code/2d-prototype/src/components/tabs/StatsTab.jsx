/**
 * StatsTab.jsx - Settlement statistics tab
 *
 * Displays:
 * - Population statistics
 * - Morale and happiness
 * - Tier progress and requirements
 * - Production bonuses
 */

import React from 'react';
import { useGame } from '../../context/GameContext';
import './StatsTab.css';

function StatsTab() {
  const { gameState } = useGame();

  // Get population stats
  const npcs = gameState.npcs || [];
  const totalPopulation = npcs.length;
  const assignedNPCs = npcs.filter(npc => npc.assignedBuilding || npc.assignedBuildingId).length;
  const idleNPCs = totalPopulation - assignedNPCs;

  // Get NPC combat stats
  const veterans = npcs.filter(npc => npc.isVeteran).length;
  const onExpedition = npcs.filter(npc => npc.status === 'ON_EXPEDITION').length;
  const dead = npcs.filter(npc => npc.isDead).length;

  // Get morale (if available)
  const morale = gameState.morale || 100;
  const getMoraleStatus = (morale) => {
    if (morale >= 80) return { text: 'Excellent', color: '#10b981', emoji: '😄' };
    if (morale >= 60) return { text: 'Good', color: '#3b82f6', emoji: '🙂' };
    if (morale >= 40) return { text: 'Fair', color: '#f59e0b', emoji: '😐' };
    if (morale >= 20) return { text: 'Poor', color: '#ef4444', emoji: '😟' };
    return { text: 'Critical', color: '#dc2626', emoji: '😢' };
  };
  const moraleStatus = getMoraleStatus(morale);

  // Get tier info
  const currentTier = gameState.currentTier || 'SURVIVAL';
  const tierHierarchy = ['SURVIVAL', 'PERMANENT', 'TOWN', 'CASTLE'];
  const currentTierIndex = tierHierarchy.indexOf(currentTier);
  const nextTier = currentTierIndex < tierHierarchy.length - 1 ? tierHierarchy[currentTierIndex + 1] : null;

  // Tier metadata
  const tierInfo = {
    SURVIVAL: { icon: '⚡', name: 'Survival', color: '#f59e0b' },
    PERMANENT: { icon: '🏠', name: 'Permanent', color: '#3b82f6' },
    TOWN: { icon: '🏛️', name: 'Town', color: '#8b5cf6' },
    CASTLE: { icon: '🏰', name: 'Castle', color: '#ec4899' }
  };

  const currentTierInfo = tierInfo[currentTier] || tierInfo.SURVIVAL;
  const nextTierInfo = nextTier ? tierInfo[nextTier] : null;

  // Get production bonus
  const getProductionBonus = () => {
    let bonus = 0;
    // Veterans: +5%
    bonus += veterans * 5;
    // Combat level bonus: +0.5% per level (approximate)
    const avgCombatLevel = npcs.reduce((sum, npc) => sum + (npc.combatLevel || 0), 0) / (npcs.length || 1);
    bonus += avgCombatLevel * 0.5;
    // High skills bonus (approximate)
    bonus += Math.min(bonus * 0.2, 5); // Max 5% from skills
    return Math.min(bonus, 15); // Cap at 15%
  };

  const productionBonus = getProductionBonus();

  // Get resources
  const resources = gameState.resources || {};

  return (
    <div className="stats-tab">
      {/* Population Section */}
      <div className="stats-section">
        <div className="stats-section-header">
          <span className="stats-icon">👥</span>
          <h3>Population</h3>
        </div>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <span className="stat-value">{totalPopulation}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Working</span>
            <span className="stat-value green">{assignedNPCs}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Idle</span>
            <span className="stat-value yellow">{idleNPCs}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Veterans</span>
            <span className="stat-value purple">⭐ {veterans}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">On Expedition</span>
            <span className="stat-value blue">🗡️ {onExpedition}</span>
          </div>
          {dead > 0 && (
            <div className="stat-item">
              <span className="stat-label">Dead</span>
              <span className="stat-value red">💀 {dead}</span>
            </div>
          )}
        </div>
      </div>

      {/* Morale Section */}
      <div className="stats-section">
        <div className="stats-section-header">
          <span className="stats-icon">{moraleStatus.emoji}</span>
          <h3>Morale</h3>
        </div>
        <div className="morale-container">
          <div className="morale-bar">
            <div
              className="morale-fill"
              style={{
                width: `${morale}%`,
                background: moraleStatus.color
              }}
            />
          </div>
          <div className="morale-info">
            <span className="morale-value">{morale}%</span>
            <span className="morale-status" style={{ color: moraleStatus.color }}>
              {moraleStatus.text}
            </span>
          </div>
        </div>
      </div>

      {/* Tier Progress Section */}
      <div className="stats-section">
        <div className="stats-section-header">
          <span className="stats-icon">{currentTierInfo.icon}</span>
          <h3>Civilization Tier</h3>
        </div>
        <div className="tier-info">
          <div className="current-tier">
            <span className="tier-label">Current:</span>
            <span className="tier-badge" style={{ borderColor: currentTierInfo.color }}>
              {currentTierInfo.icon} {currentTierInfo.name}
            </span>
          </div>
          {nextTierInfo && (
            <div className="next-tier">
              <span className="tier-label">Next:</span>
              <span className="tier-badge locked" style={{ borderColor: nextTierInfo.color }}>
                {nextTierInfo.icon} {nextTierInfo.name}
              </span>
            </div>
          )}
          {!nextTierInfo && (
            <div className="max-tier">
              🏆 Maximum tier reached!
            </div>
          )}
        </div>

        {/* Tier Progress Bar */}
        <div className="tier-progress">
          {tierHierarchy.map((tier, index) => (
            <div
              key={tier}
              className={`tier-step ${index <= currentTierIndex ? 'completed' : 'locked'}`}
              title={tierInfo[tier].name}
            >
              <span className="tier-step-icon">{tierInfo[tier].icon}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Production Bonuses Section */}
      <div className="stats-section">
        <div className="stats-section-header">
          <span className="stats-icon">📈</span>
          <h3>Production Bonuses</h3>
        </div>
        <div className="bonus-list">
          <div className="bonus-item">
            <span className="bonus-label">Total Bonus</span>
            <span className="bonus-value green">+{productionBonus.toFixed(1)}%</span>
          </div>
          {veterans > 0 && (
            <div className="bonus-item small">
              <span className="bonus-label">⭐ Veterans ({veterans})</span>
              <span className="bonus-value">+{(veterans * 5).toFixed(0)}%</span>
            </div>
          )}
          <div className="bonus-item small">
            <span className="bonus-label">💪 Combat Levels</span>
            <span className="bonus-value">+{(npcs.reduce((sum, npc) => sum + (npc.combatLevel || 0), 0) / (npcs.length || 1) * 0.5).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Resources Summary */}
      <div className="stats-section">
        <div className="stats-section-header">
          <span className="stats-icon">💰</span>
          <h3>Resource Summary</h3>
        </div>
        <div className="resource-summary">
          <div className="resource-item">
            <span className="resource-icon">🌾</span>
            <span className="resource-name">Food</span>
            <span className="resource-amount">{Math.floor(resources.food || 0)}</span>
          </div>
          <div className="resource-item">
            <span className="resource-icon">🪵</span>
            <span className="resource-name">Wood</span>
            <span className="resource-amount">{Math.floor(resources.wood || 0)}</span>
          </div>
          <div className="resource-item">
            <span className="resource-icon">🪨</span>
            <span className="resource-name">Stone</span>
            <span className="resource-amount">{Math.floor(resources.stone || 0)}</span>
          </div>
          <div className="resource-item">
            <span className="resource-icon">⭐</span>
            <span className="resource-name">Gold</span>
            <span className="resource-amount">{Math.floor(resources.gold || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsTab;
