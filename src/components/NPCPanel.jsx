import React from 'react';
import './NPCPanel.css';

/**
 * NPCPanel Component
 * Displays NPC population and morale information
 */
function NPCPanel({ population = {}, morale = 0, moraleState = 'NEUTRAL' }) {
  // Calculate population percentage for progress bar
  const populationPercent = population.totalSpawned > 0
    ? Math.round((population.aliveCount || 0) / population.totalSpawned * 100)
    : 100;

  // Determine morale emoji and label
  const getMoraleDisplay = () => {
    if (morale < -50) return { emoji: '😢', label: 'Miserable', color: '#d32f2f' };
    if (morale < -25) return { emoji: '😠', label: 'Upset', color: '#f57c00' };
    if (morale < 0) return { emoji: '😕', label: 'Unhappy', color: '#ffa726' };
    if (morale === 0) return { emoji: '😐', label: 'Neutral', color: '#9e9e9e' };
    if (morale < 25) return { emoji: '🙂', label: 'Happy', color: '#66bb6a' };
    return { emoji: '😄', label: 'Thrilled', color: '#4caf50' };
  };

  const moraleDisplay = getMoraleDisplay();

  // Calculate morale bar width (convert -100 to 100 range to 0 to 100%)
  const moraleBarWidth = ((morale + 100) / 200) * 100;

  return (
    <div className="npc-panel">
      <h3>POPULATION & MORALE</h3>
      
      {/* Population Section */}
      <div className="population-section">
        <div className="section-header">
          <span className="label">POPULATION:</span>
          <span className="value">
            {population.aliveCount || 0} / {population.totalSpawned || 0}
          </span>
        </div>
        
        <div className="progress-bar-container">
          <div 
            className="progress-bar population-bar"
            style={{ 
              width: `${populationPercent}%`,
              backgroundColor: populationPercent > 50 ? '#4caf50' : 
                              populationPercent > 25 ? '#ff9800' : '#f44336'
            }}
          />
        </div>
        
        <div className="population-status">
          {populationPercent}% alive
          {population.totalSpawned === 0 && (
            <span className="hint"> - Spawn NPCs to work in your settlement</span>
          )}
        </div>
      </div>

      {/* Morale Section */}
      <div className="morale-section">
        <div className="section-header">
          <span className="label">MORALE:</span>
          <span className="morale-indicator">
            <span className="morale-emoji">{moraleDisplay.emoji}</span>
            <span className="morale-value" style={{ color: moraleDisplay.color }}>
              {morale > 0 ? '+' : ''}{morale}
            </span>
          </span>
        </div>
        
        <div className="morale-bar-container">
          <div className="morale-bar-background">
            <div className="morale-bar-center-mark" />
            <div 
              className="morale-bar"
              style={{ 
                width: `${moraleBarWidth}%`,
                backgroundColor: moraleDisplay.color
              }}
            />
          </div>
        </div>
        
        <div className="morale-status">
          <span style={{ color: moraleDisplay.color }}>
            {moraleDisplay.label}
          </span>
        </div>
        
        <div className="morale-info">
          Morale affects NPC efficiency and resource production.
        </div>
      </div>
    </div>
  );
}

export default NPCPanel;
