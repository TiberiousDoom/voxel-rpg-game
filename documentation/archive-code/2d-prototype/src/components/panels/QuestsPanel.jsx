/**
 * QuestsPanel.jsx - Quests panel for new UI system
 *
 * New panel for the quest journal system.
 */

import React from 'react';
import { Card, Badge, ProgressBar, Button } from '../common';
import { Scroll, CheckCircle, Circle, Star, ChevronRight } from 'lucide-react';
import './Panel.css';

/**
 * QuestsPanel component
 * @param {Object} props
 * @param {Object} props.gameState - Game state
 * @param {Object} props.gameActions - Game actions
 */
function QuestsPanel({ gameState, gameActions }) {
  // Placeholder - integrate with quest store
  const activeQuests = gameState?.quests?.active || [];
  const completedQuests = gameState?.quests?.completed || [];

  return (
    <div className="panel panel-quests">
      {/* Active Quests Section */}
      <section className="panel-section">
        <h3 className="panel-section-title">
          <Scroll size={18} />
          Active Quests
          {activeQuests.length > 0 && (
            <Badge variant="accent">{activeQuests.length}</Badge>
          )}
        </h3>

        {activeQuests.length === 0 ? (
          <Card variant="outlined" padding="medium">
            <div className="panel-empty-state">
              <Scroll size={32} className="panel-empty-icon" />
              <p>No active quests</p>
              <span className="panel-empty-hint">
                Explore the world to discover new quests
              </span>
            </div>
          </Card>
        ) : (
          <div className="panel-list">
            {activeQuests.map((quest) => (
              <Card
                key={quest.id}
                clickable
                padding="small"
                className="quest-card"
              >
                <div className="quest-header">
                  <Circle size={16} className="quest-status" />
                  <span className="quest-title">{quest.title}</span>
                  {quest.isMain && <Star size={14} className="quest-star" />}
                </div>
                <p className="quest-description">{quest.description}</p>
                {quest.progress && (
                  <ProgressBar
                    value={quest.progress}
                    max={100}
                    size="small"
                    variant="accent"
                    showLabel
                  />
                )}
                <ChevronRight size={16} className="quest-chevron" />
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Completed Quests Section */}
      {completedQuests.length > 0 && (
        <section className="panel-section">
          <h3 className="panel-section-title">
            <CheckCircle size={18} />
            Completed
            <Badge variant="success">{completedQuests.length}</Badge>
          </h3>

          <div className="panel-list">
            {completedQuests.slice(0, 5).map((quest) => (
              <Card
                key={quest.id}
                variant="outlined"
                padding="small"
                className="quest-card quest-card-completed"
              >
                <div className="quest-header">
                  <CheckCircle size={16} className="quest-status-done" />
                  <span className="quest-title">{quest.title}</span>
                </div>
              </Card>
            ))}
          </div>

          {completedQuests.length > 5 && (
            <Button variant="ghost" size="small" className="panel-view-all">
              View all {completedQuests.length} completed quests
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

export default QuestsPanel;
