/**
 * CharacterSheet.jsx
 * Main character sheet UI for viewing and allocating attributes
 */

import React, { useState } from 'react';
import useGameStore from '../../stores/useGameStore';
import { getAllAttributeInfos } from '../../modules/character/CharacterSystem';
import './CharacterSheet.css';

const CharacterSheet = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('attributes'); // 'attributes' or 'skills'

  const player = useGameStore((state) => state.player);
  const character = useGameStore((state) => state.character);
  // eslint-disable-next-line no-unused-vars
  const equipment = useGameStore((state) => state.equipment);
  const allocateAttribute = useGameStore((state) => state.allocateAttribute);
  const getDerivedStats = useGameStore((state) => state.getDerivedStats);

  if (!isOpen) return null;

  const attributeInfos = getAllAttributeInfos();
  const derivedStats = getDerivedStats();

  const handleAllocateAttribute = (attribute) => {
    if (character.attributePoints > 0) {
      allocateAttribute(attribute);
    }
  };

  const AttributeRow = ({ attributeKey, info }) => {
    const currentValue = character.attributes[attributeKey];
    const hasPoints = character.attributePoints > 0;
    const isMaxed = currentValue >= 100;
    const isAtSoftCap = currentValue >= info.softCap;

    return (
      <div className="attribute-row">
        <div className="attribute-header">
          <span className="attribute-icon" style={{ color: info.color }}>
            {info.icon}
          </span>
          <div className="attribute-info">
            <h3 className="attribute-name" style={{ color: info.color }}>
              {info.name}
            </h3>
            <p className="attribute-description">{info.description}</p>
          </div>
          <div className="attribute-value">
            <span className="current-value">{currentValue}</span>
            {isAtSoftCap && <span className="soft-cap-indicator" title="Soft cap reached - reduced effectiveness">⚠️</span>}
            <button
              className="allocate-button"
              onClick={() => handleAllocateAttribute(attributeKey)}
              disabled={!hasPoints || isMaxed}
              title={
                !hasPoints
                  ? 'No attribute points available'
                  : isMaxed
                  ? 'Attribute at maximum'
                  : 'Allocate 1 point'
              }
            >
              +
            </button>
          </div>
        </div>

        <div className="attribute-effects">
          {info.effects.map((effect, idx) => (
            <div key={idx} className="effect-item">
              <span className="effect-text">{effect}</span>
            </div>
          ))}
          {isAtSoftCap && (
            <div className="soft-cap-warning">
              ⚠️ Soft cap reached at {info.softCap}. Further gains are 50% effective.
            </div>
          )}
        </div>
      </div>
    );
  };

  const DerivedStatRow = ({ label, value, unit = '' }) => (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {typeof value === 'number' ? value.toFixed(1) : value}{unit}
      </span>
    </div>
  );

  return (
    <div className="character-sheet-overlay" onClick={onClose}>
      <div className="character-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="character-sheet-header">
          <h1>Character Sheet</h1>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Player Info */}
        <div className="player-info">
          <div className="player-level">
            <span className="label">Level</span>
            <span className="value">{player.level}</span>
          </div>
          <div className="player-xp">
            <span className="label">XP</span>
            <div className="xp-bar">
              <div
                className="xp-fill"
                style={{
                  width: `${(player.xp / player.xpToNext) * 100}%`,
                }}
              />
              <span className="xp-text">
                {player.xp} / {player.xpToNext}
              </span>
            </div>
          </div>
        </div>

        {/* Available Points */}
        <div className="available-points">
          <div className="points-card attribute-points">
            <span className="points-icon">⚡</span>
            <div>
              <span className="points-value">{character.attributePoints}</span>
              <span className="points-label">Attribute Points</span>
            </div>
          </div>
          <div className="points-card skill-points">
            <span className="points-icon">🌟</span>
            <div>
              <span className="points-value">{character.skillPoints}</span>
              <span className="points-label">Skill Points</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'attributes' ? 'active' : ''}`}
            onClick={() => setActiveTab('attributes')}
          >
            Attributes
          </button>
          <button
            className={`tab-button ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            Skills (Coming Soon)
          </button>
          <button
            className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Derived Stats
          </button>
        </div>

        {/* Content */}
        <div className="character-sheet-content">
          {activeTab === 'attributes' && (
            <div className="attributes-tab">
              <div className="attributes-header">
                <p className="attributes-help">
                  Each attribute point provides powerful bonuses. Points are granted on level up (5 per level).
                  <br />
                  <strong>Soft cap at 50:</strong> After 50 points, effectiveness is halved.
                </p>
              </div>

              <div className="attributes-list">
                <AttributeRow attributeKey="leadership" info={attributeInfos.leadership} />
                <AttributeRow attributeKey="construction" info={attributeInfos.construction} />
                <AttributeRow attributeKey="exploration" info={attributeInfos.exploration} />
                <AttributeRow attributeKey="combat" info={attributeInfos.combat} />
                <AttributeRow attributeKey="magic" info={attributeInfos.magic} />
                <AttributeRow attributeKey="endurance" info={attributeInfos.endurance} />
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="skills-tab">
              <div className="coming-soon">
                <h2>🌟 Skill Trees Coming Soon</h2>
                <p>Settlement, Explorer, and Combat skill trees will be available in the next update!</p>
                <p>You currently have <strong>{character.skillPoints}</strong> skill points saved.</p>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="stats-tab">
              <div className="stats-section">
                <h3>Combat Stats</h3>
                <DerivedStatRow label="Damage" value={derivedStats.damage} />
                <DerivedStatRow label="Critical Chance" value={derivedStats.critChance * 100} unit="%" />
                <DerivedStatRow label="Attack Speed" value={derivedStats.attackSpeed} unit="x" />
                <DerivedStatRow label="Defense" value={derivedStats.defense} />
                <DerivedStatRow label="Elemental Resistance" value={derivedStats.elementalResistance * 100} unit="%" />
              </div>

              <div className="stats-section">
                <h3>Survival Stats</h3>
                <DerivedStatRow label="Max Health" value={derivedStats.maxHealth} />
                <DerivedStatRow label="Health Regen" value={derivedStats.healthRegen} unit=" HP/s" />
                <DerivedStatRow label="Max Stamina" value={derivedStats.maxStamina} />
                <DerivedStatRow label="Stamina Regen" value={derivedStats.staminaRegen} unit="/s" />
                <DerivedStatRow label="Sprint Cost" value={derivedStats.sprintCost} unit="/s" />
              </div>

              <div className="stats-section">
                <h3>Magic Stats</h3>
                <DerivedStatRow label="Max Mana" value={derivedStats.maxMana} />
                <DerivedStatRow label="Mana Regen" value={derivedStats.manaRegen} unit="/s" />
                <DerivedStatRow label="Spell Power" value={derivedStats.spellPower} unit="x" />
              </div>

              <div className="stats-section">
                <h3>Exploration Stats</h3>
                <DerivedStatRow label="Movement Speed" value={derivedStats.speed} />
                <DerivedStatRow label="Gathering Speed" value={derivedStats.gatheringSpeed} unit="x" />
                <DerivedStatRow label="Rare Find Chance" value={derivedStats.rareFindChance * 100} unit="%" />
              </div>

              <div className="stats-explanation">
                <p>
                  <strong>💡 Tip:</strong> These stats are calculated from your attributes, equipment, and skill tree.
                  Increase attributes to improve these derived stats!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="character-sheet-footer">
          <p className="footer-help">
            Press <kbd>C</kbd> to toggle Character Sheet | Press <kbd>ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default CharacterSheet;
