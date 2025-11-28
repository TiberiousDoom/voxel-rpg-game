/**
 * QuestJournal.jsx - Quest journal UI component
 *
 * Shows all available and active quests with details
 */

import React, { useState } from 'react';
import useQuestStore from '../../stores/useQuestStore.js';
import useGameStore from '../../stores/useGameStore.js';
import './QuestJournal.css';

/**
 * Quest Journal component
 */
function QuestJournal({ onClose }) {
  const [selectedTab, setSelectedTab] = useState('active'); // 'available', 'active', 'completed'
  const [selectedQuest, setSelectedQuest] = useState(null);

  const availableQuests = useQuestStore(state => state.availableQuests);
  const activeQuests = useQuestStore(state => state.activeQuests);
  const completedQuestIds = useQuestStore(state => state.completedQuestIds);
  const acceptQuest = useQuestStore(state => state.acceptQuest);
  const abandonQuest = useQuestStore(state => state.abandonQuest);

  const playerLevel = useGameStore(state => state.player?.level || 1);

  /**
   * Handle quest accept
   */
  const handleAccept = (questId) => {
    const success = acceptQuest(questId);
    if (success) {
      setSelectedQuest(null);
      setSelectedTab('active');
    }
  };

  /**
   * Handle quest abandon
   */
  const handleAbandon = (questId) => {
    if (window.confirm('Are you sure you want to abandon this quest?')) {
      abandonQuest(questId);
      setSelectedQuest(null);
    }
  };

  /**
   * Render quest list for current tab
   */
  const renderQuestList = () => {
    let quests = [];

    switch (selectedTab) {
      case 'available':
        quests = availableQuests.filter(q =>
          q.canAccept(playerLevel, completedQuestIds)
        );
        break;
      case 'active':
        quests = activeQuests;
        break;
      case 'completed':
        // For now, just show count
        return (
          <div className="quest-list">
            <div className="completed-count">
              Completed Quests: {completedQuestIds.length}
            </div>
          </div>
        );
      default:
        quests = [];
    }

    if (quests.length === 0) {
      return <div className="quest-list-empty">No quests {selectedTab}</div>;
    }

    return (
      <div className="quest-list">
        {quests.map(quest => (
          <div
            key={quest.id}
            className={`quest-item ${selectedQuest?.id === quest.id ? 'selected' : ''} ${quest.category.toLowerCase()}`}
            onClick={() => setSelectedQuest(quest)}
          >
            <div className="quest-item-title">{quest.title}</div>
            <div className="quest-item-level">Level {quest.levelRequirement}</div>
            <div className="quest-item-category">{quest.category}</div>
            {quest.state === 'ACTIVE' && (
              <div className="quest-item-progress">
                {Math.round(quest.getProgress() * 100)}%
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render selected quest details
   */
  const renderQuestDetails = () => {
    if (!selectedQuest) {
      return (
        <div className="quest-details-empty">
          Select a quest to view details
        </div>
      );
    }

    return (
      <div className="quest-details">
        <div className="quest-details-header">
          <h2>{selectedQuest.title}</h2>
          <span className={`quest-category-badge ${selectedQuest.category.toLowerCase()}`}>
            {selectedQuest.category}
          </span>
        </div>

        <div className="quest-details-info">
          <div className="quest-info-item">
            <span className="quest-info-label">Level:</span>
            <span className="quest-info-value">{selectedQuest.levelRequirement}</span>
          </div>
          {selectedQuest.repeatable && (
            <div className="quest-info-item">
              <span className="quest-repeatable-badge">REPEATABLE</span>
            </div>
          )}
        </div>

        <div className="quest-description">
          {selectedQuest.description}
        </div>

        <div className="quest-objectives">
          <h3>Objectives</h3>
          {selectedQuest.objectives.map(obj => (
            <div
              key={obj.id}
              className={`quest-objective ${obj.completed ? 'completed' : ''}`}
            >
              <div className="objective-checkbox">
                {obj.completed ? '✓' : '○'}
              </div>
              <div className="objective-text">
                {obj.description}
                {!obj.completed && (
                  <span className="objective-progress">
                    {' '}({obj.currentCount}/{obj.targetCount})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="quest-rewards">
          <h3>Rewards</h3>
          <div className="rewards-list">
            {selectedQuest.rewards.xp > 0 && (
              <div className="reward-item">
                <span className="reward-icon">⭐</span>
                <span className="reward-text">{selectedQuest.rewards.xp} XP</span>
              </div>
            )}
            {selectedQuest.rewards.gold > 0 && (
              <div className="reward-item">
                <span className="reward-icon">💰</span>
                <span className="reward-text">{selectedQuest.rewards.gold} Gold</span>
              </div>
            )}
            {selectedQuest.rewards.items && selectedQuest.rewards.items.length > 0 && (
              <div className="reward-item">
                <span className="reward-icon">🎁</span>
                <span className="reward-text">{selectedQuest.rewards.items.length} Items</span>
              </div>
            )}
          </div>
        </div>

        <div className="quest-actions">
          {selectedQuest.state === 'AVAILABLE' && (
            <button
              className="btn-quest-accept"
              onClick={() => handleAccept(selectedQuest.id)}
            >
              Accept Quest
            </button>
          )}
          {selectedQuest.state === 'ACTIVE' && (
            <button
              className="btn-quest-abandon"
              onClick={() => handleAbandon(selectedQuest.id)}
            >
              Abandon Quest
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="quest-journal-overlay">
      <div className="quest-journal">
        <div className="quest-journal-header">
          <h1>Quest Journal</h1>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="quest-journal-tabs">
          <button
            className={`tab ${selectedTab === 'available' ? 'active' : ''}`}
            onClick={() => setSelectedTab('available')}
          >
            Available ({availableQuests.length})
          </button>
          <button
            className={`tab ${selectedTab === 'active' ? 'active' : ''}`}
            onClick={() => setSelectedTab('active')}
          >
            Active ({activeQuests.length})
          </button>
          <button
            className={`tab ${selectedTab === 'completed' ? 'active' : ''}`}
            onClick={() => setSelectedTab('completed')}
          >
            Completed ({completedQuestIds.length})
          </button>
        </div>

        <div className="quest-journal-content">
          <div className="quest-journal-list">
            {renderQuestList()}
          </div>
          <div className="quest-journal-details">
            {renderQuestDetails()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuestJournal;
