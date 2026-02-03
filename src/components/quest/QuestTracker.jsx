/**
 * QuestTracker.jsx - Active quest tracker HUD
 *
 * Shows active quest progress on the game screen
 */

import React from 'react';
import useQuestStore from '../../stores/useQuestStore.js';
import './QuestTracker.css';

/**
 * Quest Tracker HUD component
 */
function QuestTracker() {
  const activeQuests = useQuestStore(state => state.activeQuests);

  // Only show first 3 active quests to avoid clutter
  const visibleQuests = activeQuests.slice(0, 3);

  if (visibleQuests.length === 0) {
    return null;
  }

  return (
    <div className="quest-tracker">
      <div className="quest-tracker-header">
        Active Quests ({activeQuests.length})
      </div>
      {visibleQuests.map(quest => (
        <div key={quest.id} className={`quest-tracker-item ${quest.category.toLowerCase()}`}>
          <div className="quest-tracker-title">{quest.title}</div>
          <div className="quest-tracker-objectives">
            {quest.objectives.filter(obj => !obj.completed).slice(0, 2).map(objective => (
              <div key={objective.id} className="quest-tracker-objective">
                <span className="objective-progress-text">
                  {objective.description}:
                </span>
                <span className="objective-progress-count">
                  {objective.currentCount}/{objective.targetCount}
                </span>
              </div>
            ))}
          </div>
          <div className="quest-tracker-progress-bar">
            <div
              className="quest-tracker-progress-fill"
              style={{ width: `${quest.getProgress() * 100}%` }}
            />
          </div>
        </div>
      ))}
      {activeQuests.length > 3 && (
        <div className="quest-tracker-more">
          +{activeQuests.length - 3} more quests
        </div>
      )}
    </div>
  );
}

export default QuestTracker;
