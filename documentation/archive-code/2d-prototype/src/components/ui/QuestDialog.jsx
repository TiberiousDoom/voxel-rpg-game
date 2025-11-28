/**
 * QuestDialog.jsx - Quest NPC interaction dialog
 *
 * Features:
 * - View available quests from NPC
 * - Accept new quests
 * - Track active quest progress
 * - Turn in completed quests
 */

import React, { useState, useMemo } from 'react';
import { QuestState, QuestDifficulty } from '../../modules/ai/QuestAISystem.js';
import './QuestDialog.css';

/**
 * Difficulty color mapping
 */
const DIFFICULTY_COLORS = {
  [QuestDifficulty.EASY]: '#90ee90',
  [QuestDifficulty.NORMAL]: '#f0d060',
  [QuestDifficulty.HARD]: '#ff8c00',
  [QuestDifficulty.LEGENDARY]: '#ff4500'
};

/**
 * Difficulty icons
 */
const DIFFICULTY_ICONS = {
  [QuestDifficulty.EASY]: '★',
  [QuestDifficulty.NORMAL]: '★★',
  [QuestDifficulty.HARD]: '★★★',
  [QuestDifficulty.LEGENDARY]: '★★★★'
};

/**
 * QuestDialog component
 * @param {Object} props
 * @param {Object} props.npc - NPC offering quests
 * @param {Array} props.availableQuests - Quests available from this NPC
 * @param {Array} props.activeQuests - Player's active quests (for turn-in)
 * @param {Function} props.onAccept - Called when player accepts quest (questId)
 * @param {Function} props.onTurnIn - Called when player turns in quest (questId)
 * @param {Function} props.onClose - Close dialog callback
 */
function QuestDialog({ npc, availableQuests = [], activeQuests = [], onAccept, onTurnIn, onClose }) {
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [view, setView] = useState('available'); // 'available' or 'active'

  // Filter quests that can be turned in to this NPC
  const turnInQuests = useMemo(() => {
    return activeQuests.filter(q =>
      q.state === QuestState.COMPLETED &&
      q.turnInNpcId === npc?.id
    );
  }, [activeQuests, npc]);

  // Get NPC greeting based on quest availability
  const greeting = useMemo(() => {
    if (turnInQuests.length > 0) {
      return `Ah, you've returned! I see you've completed some tasks. Let me see what you've accomplished.`;
    }
    if (availableQuests.length > 0) {
      return `Greetings, traveler! I have some tasks that need attending to. Perhaps you could help?`;
    }
    return `Hello there! I don't have any tasks for you at the moment, but check back later.`;
  }, [availableQuests.length, turnInQuests.length]);

  /**
   * Handle quest acceptance
   */
  const handleAccept = () => {
    if (selectedQuest && onAccept) {
      onAccept(selectedQuest.id);
      setSelectedQuest(null);
    }
  };

  /**
   * Handle quest turn-in
   */
  const handleTurnIn = () => {
    if (selectedQuest && onTurnIn) {
      onTurnIn(selectedQuest.id);
      setSelectedQuest(null);
    }
  };

  /**
   * Render quest list item
   */
  const renderQuestItem = (quest, isTurnIn = false) => {
    const isSelected = selectedQuest?.id === quest.id;
    const diffColor = DIFFICULTY_COLORS[quest.difficulty] || DIFFICULTY_COLORS[QuestDifficulty.NORMAL];

    return (
      <div
        key={quest.id}
        className={`quest-item ${isSelected ? 'selected' : ''} ${isTurnIn ? 'turn-in' : ''}`}
        onClick={() => setSelectedQuest(quest)}
      >
        <div className="quest-item-header">
          <span className="quest-icon">{isTurnIn ? '✓' : '!'}</span>
          <span className="quest-title">{quest.title}</span>
        </div>
        <div className="quest-item-meta">
          <span
            className="quest-difficulty"
            style={{ color: diffColor }}
          >
            {DIFFICULTY_ICONS[quest.difficulty] || '★★'}
          </span>
          <span className="quest-type">{quest.type}</span>
        </div>
      </div>
    );
  };

  /**
   * Render objective progress
   */
  const renderObjective = (objective, index) => {
    const progress = objective.currentCount || 0;
    const target = objective.targetCount || 1;
    const isComplete = progress >= target;
    const percent = Math.min(100, Math.floor((progress / target) * 100));

    if (objective.hidden && progress === 0) {
      return (
        <div key={objective.id || index} className="objective hidden">
          <span className="objective-icon">?</span>
          <span className="objective-text">???</span>
        </div>
      );
    }

    return (
      <div key={objective.id || index} className={`objective ${isComplete ? 'complete' : ''}`}>
        <span className="objective-icon">{isComplete ? '✓' : '○'}</span>
        <div className="objective-content">
          <span className="objective-text">{objective.description}</span>
          <div className="objective-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
            <span className="progress-text">{progress}/{target}</span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render rewards section
   */
  const renderRewards = (rewards) => {
    if (!rewards) return null;

    return (
      <div className="quest-rewards">
        <h4>Rewards</h4>
        <div className="rewards-list">
          {rewards.gold > 0 && (
            <div className="reward-item">
              <span className="reward-icon">💰</span>
              <span className="reward-value">{rewards.gold} Gold</span>
            </div>
          )}
          {rewards.experience > 0 && (
            <div className="reward-item">
              <span className="reward-icon">⭐</span>
              <span className="reward-value">{rewards.experience} XP</span>
            </div>
          )}
          {rewards.items?.map((item, i) => (
            <div key={i} className="reward-item">
              <span className="reward-icon">{item.icon || '📦'}</span>
              <span className="reward-value">{item.quantity}x {item.name || item.itemId}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render quest details
   */
  const renderQuestDetails = () => {
    if (!selectedQuest) {
      return (
        <div className="quest-details-empty">
          <p>Select a quest to view details</p>
        </div>
      );
    }

    const isTurnIn = selectedQuest.state === QuestState.COMPLETED;
    const diffColor = DIFFICULTY_COLORS[selectedQuest.difficulty] || DIFFICULTY_COLORS[QuestDifficulty.NORMAL];

    return (
      <div className="quest-details">
        <div className="quest-details-header">
          <h2>{selectedQuest.title}</h2>
          <div className="quest-meta">
            <span className="difficulty-badge" style={{ backgroundColor: diffColor }}>
              {selectedQuest.difficulty}
            </span>
            <span className="type-badge">{selectedQuest.type}</span>
          </div>
        </div>

        <div className="quest-description">
          <p>{selectedQuest.description}</p>
        </div>

        {selectedQuest.objectives?.length > 0 && (
          <div className="quest-objectives">
            <h4>Objectives</h4>
            {selectedQuest.objectives.map((obj, i) => renderObjective(obj, i))}
          </div>
        )}

        {renderRewards(selectedQuest.rewards)}

        {selectedQuest.timeLimit && (
          <div className="quest-time-limit">
            <span className="time-icon">⏱</span>
            <span>Time Limit: {Math.floor(selectedQuest.timeLimit / 60)} minutes</span>
          </div>
        )}

        <div className="quest-actions">
          {isTurnIn ? (
            <button className="btn-turn-in" onClick={handleTurnIn}>
              Turn In Quest
            </button>
          ) : (
            <button className="btn-accept" onClick={handleAccept}>
              Accept Quest
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="quest-dialog-overlay">
      <div className="quest-dialog">
        {/* Header */}
        <div className="dialog-header">
          <div className="npc-info">
            <span className="npc-avatar">{npc?.icon || '👤'}</span>
            <div>
              <h1>{npc?.name || 'Quest Giver'}</h1>
              {npc?.title && <span className="npc-title">{npc.title}</span>}
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        {/* NPC Greeting */}
        <div className="dialog-greeting">
          <p>{greeting}</p>
        </div>

        {/* Content */}
        <div className="dialog-content">
          {/* Quest List */}
          <div className="quest-list">
            {/* Tabs */}
            <div className="quest-tabs">
              <button
                className={`tab ${view === 'available' ? 'active' : ''}`}
                onClick={() => { setView('available'); setSelectedQuest(null); }}
              >
                Available ({availableQuests.length})
              </button>
              {turnInQuests.length > 0 && (
                <button
                  className={`tab turn-in ${view === 'active' ? 'active' : ''}`}
                  onClick={() => { setView('active'); setSelectedQuest(null); }}
                >
                  Turn In ({turnInQuests.length})
                </button>
              )}
            </div>

            {/* Quest Items */}
            <div className="quest-items">
              {view === 'available' && (
                availableQuests.length > 0 ? (
                  availableQuests.map(q => renderQuestItem(q))
                ) : (
                  <div className="no-quests">No quests available</div>
                )
              )}
              {view === 'active' && (
                turnInQuests.length > 0 ? (
                  turnInQuests.map(q => renderQuestItem(q, true))
                ) : (
                  <div className="no-quests">No quests to turn in</div>
                )
              )}
            </div>
          </div>

          {/* Quest Details */}
          {renderQuestDetails()}
        </div>
      </div>
    </div>
  );
}

export default QuestDialog;
