import React, { useState, useEffect } from 'react';
import { AlertCircle, X, Clock, Zap } from 'lucide-react';
import './EventPanel.css';

/**
 * EventPanel Component
 * Displays active events and event history
 */
function EventPanel({ eventSystem, onClose }) {
  const [activeEvents, setActiveEvents] = useState([]);
  const [eventHistory, setEventHistory] = useState([]);
  const [selectedTab, setSelectedTab] = useState('active');

  useEffect(() => {
    if (!eventSystem) return;

    // Update active events and history
    const updateEvents = () => {
      const active = eventSystem.getActiveEvents();
      const history = eventSystem.getEventHistory ? eventSystem.getEventHistory(10) : [];

      setActiveEvents(active);
      setEventHistory(history);
    };

    updateEvents();

    // Update every second
    const interval = setInterval(updateEvents, 1000);

    return () => clearInterval(interval);
  }, [eventSystem]);

  const handleCancelEvent = (eventId) => {
    if (eventSystem && eventSystem.cancelEvent) {
      eventSystem.cancelEvent(eventId);
    }
  };

  const formatTimeRemaining = (endTime) => {
    const remaining = Math.max(0, endTime - Date.now());
    const seconds = Math.floor((remaining / 1000) % 60);
    const minutes = Math.floor((remaining / (1000 * 60)) % 60);
    const hours = Math.floor(remaining / (1000 * 60 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getEventIcon = (eventType) => {
    const icons = {
      DISASTER: '🌪️',
      INVASION: '⚔️',
      BLESSING: '✨',
      FESTIVAL: '🎉',
      STORM: '⛈️',
      DROUGHT: '☀️',
      PLAGUE: '🦠',
      BOOM: '📈'
    };
    return icons[eventType] || '❗';
  };

  const getEventColor = (eventType) => {
    const colors = {
      DISASTER: '#ef4444',
      INVASION: '#dc2626',
      BLESSING: '#10b981',
      FESTIVAL: '#8b5cf6',
      STORM: '#3b82f6',
      DROUGHT: '#f59e0b',
      PLAGUE: '#ec4899',
      BOOM: '#14b8a6'
    };
    return colors[eventType] || '#6b7280';
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      LOW: { label: 'Low', color: '#10b981' },
      MEDIUM: { label: 'Medium', color: '#f59e0b' },
      HIGH: { label: 'High', color: '#ef4444' },
      CRITICAL: { label: 'Critical', color: '#dc2626' }
    };
    const badge = badges[severity] || { label: severity, color: '#6b7280' };
    return (
      <span
        className="event-severity-badge"
        style={{ backgroundColor: badge.color }}
      >
        {badge.label}
      </span>
    );
  };

  const renderEffects = (effects) => {
    if (!effects) return null;

    const effectList = [];

    if (effects.production) {
      effectList.push({
        label: 'Production',
        value: `${effects.production > 0 ? '+' : ''}${Math.round(effects.production * 100)}%`
      });
    }

    if (effects.consumption) {
      effectList.push({
        label: 'Consumption',
        value: `${effects.consumption > 0 ? '+' : ''}${Math.round(effects.consumption * 100)}%`
      });
    }

    if (effects.morale) {
      effectList.push({
        label: 'Morale',
        value: `${effects.morale > 0 ? '+' : ''}${Math.round(effects.morale * 100)}%`
      });
    }

    if (effects.happiness) {
      effectList.push({
        label: 'Happiness',
        value: `${effects.happiness > 0 ? '+' : ''}${Math.round(effects.happiness)}`
      });
    }

    if (effectList.length === 0) return null;

    return (
      <div className="event-effects">
        <div className="event-effects-title">
          <Zap size={14} /> Effects
        </div>
        <div className="event-effects-list">
          {effectList.map((effect, index) => (
            <div key={index} className="event-effect-item">
              <span className="event-effect-label">{effect.label}:</span>
              <span className={`event-effect-value ${effect.value.startsWith('+') ? 'positive' : effect.value.startsWith('-') ? 'negative' : ''}`}>
                {effect.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderActiveEvents = () => {
    if (activeEvents.length === 0) {
      return (
        <div className="event-empty-state">
          <AlertCircle size={48} />
          <p>No active events</p>
          <span className="event-empty-hint">Events will appear here when they occur</span>
        </div>
      );
    }

    return (
      <div className="event-list">
        {activeEvents.map((event) => (
          <div
            key={event.id}
            className="event-card"
            style={{ borderLeftColor: getEventColor(event.type) }}
          >
            <div className="event-card-header">
              <div className="event-card-title">
                <span className="event-icon">{getEventIcon(event.type)}</span>
                <div className="event-info">
                  <h4>{event.name}</h4>
                  <p className="event-type">{event.type}</p>
                </div>
              </div>
              <div className="event-card-actions">
                {event.canBeCancelled && (
                  <button
                    className="event-cancel-btn"
                    onClick={() => handleCancelEvent(event.id)}
                    title="Cancel event"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="event-card-body">
              <p className="event-description">{event.description}</p>

              <div className="event-meta">
                <div className="event-meta-item">
                  <Clock size={14} />
                  <span>Ends in: {formatTimeRemaining(event.endTime)}</span>
                </div>
                <div className="event-meta-item">
                  {getSeverityBadge(event.severity || 'MEDIUM')}
                </div>
              </div>

              {renderEffects(event.effects)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEventHistory = () => {
    if (eventHistory.length === 0) {
      return (
        <div className="event-empty-state">
          <AlertCircle size={48} />
          <p>No event history</p>
          <span className="event-empty-hint">Completed events will appear here</span>
        </div>
      );
    }

    return (
      <div className="event-history-list">
        {eventHistory.map((event, index) => (
          <div key={index} className="event-history-item">
            <span className="event-history-icon">{getEventIcon(event.type)}</span>
            <div className="event-history-info">
              <div className="event-history-name">{event.name}</div>
              <div className="event-history-meta">
                <span className="event-history-type">{event.type}</span>
                <span className="event-history-state">
                  {event.state === 'COMPLETED' ? '✓ Survived' : event.state === 'CANCELLED' ? '✗ Cancelled' : event.state}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!eventSystem) {
    return (
      <div className="event-panel">
        <div className="event-panel-error">
          Event system not available
        </div>
      </div>
    );
  }

  return (
    <div className="event-panel">
      <div className="event-panel-header">
        <h3>Events</h3>
        {onClose && (
          <button className="event-panel-close" onClick={onClose}>
            <X size={20} />
          </button>
        )}
      </div>

      <div className="event-panel-tabs">
        <button
          className={`event-tab ${selectedTab === 'active' ? 'active' : ''}`}
          onClick={() => setSelectedTab('active')}
        >
          Active ({activeEvents.length})
        </button>
        <button
          className={`event-tab ${selectedTab === 'history' ? 'active' : ''}`}
          onClick={() => setSelectedTab('history')}
        >
          History
        </button>
      </div>

      <div className="event-panel-content">
        {selectedTab === 'active' ? renderActiveEvents() : renderEventHistory()}
      </div>
    </div>
  );
}

export default EventPanel;
