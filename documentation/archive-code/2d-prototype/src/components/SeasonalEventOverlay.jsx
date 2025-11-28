import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

/**
 * Event icons and colors
 */
const EVENT_THEME = {
  spring: { color: '#FFB6C1', icon: '🌸', gradient: 'linear-gradient(135deg, #FFB6C1, #FF69B4)' },
  summer: { color: '#FFD700', icon: '☀️', gradient: 'linear-gradient(135deg, #FFD700, #FFA500)' },
  autumn: { color: '#FF8C00', icon: '🍂', gradient: 'linear-gradient(135deg, #FF8C00, #D2691E)' },
  winter: { color: '#87CEEB', icon: '❄️', gradient: 'linear-gradient(135deg, #87CEEB, #4682B4)' },
};

/**
 * SeasonalEventOverlay Component
 * Displays active seasonal events with effects and notifications
 *
 * Phase 3 Integration: Seasonal Event System UI
 */
const SeasonalEventOverlay = ({ terrainSystem }) => {
  const [activeEvents, setActiveEvents] = useState([]);
  const [dismissedEvents, setDismissedEvents] = useState(new Set());
  const [newEventNotification, setNewEventNotification] = useState(null);

  // Update active events
  useEffect(() => {
    if (!terrainSystem) return;

    const eventSystem = terrainSystem.getSeasonalEventSystem?.();
    if (!eventSystem) return;

    const updateEvents = () => {
      const events = eventSystem.getActiveEvents();
      setActiveEvents(events);

      // Check for new events
      const previousEventIds = activeEvents.map(e => e.id);
      const newEvents = events.filter(e => !previousEventIds.includes(e.id));

      if (newEvents.length > 0 && activeEvents.length > 0) {
        // Show notification for new event
        setNewEventNotification(newEvents[0]);
        setTimeout(() => setNewEventNotification(null), 5000);
      }
    };

    updateEvents();
    const interval = setInterval(updateEvents, 1000);

    return () => clearInterval(interval);
  }, [terrainSystem, activeEvents.length]); // Only depend on activeEvents.length

  const dismissEvent = (eventId) => {
    setDismissedEvents(prev => new Set([...prev, eventId]));
  };

  const getSeason = (eventId) => {
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    for (const season of seasons) {
      if (eventId.startsWith(season)) return season;
    }
    return 'spring';
  };

  const formatEventName = (id) => {
    return id
      .replace(/^(spring|summer|autumn|winter)_/, '')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDuration = (startTime, endTime) => {
    const remaining = endTime - Date.now();
    if (remaining <= 0) return 'Ending soon';

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const getEffectsList = (event) => {
    if (!event.effects) return [];

    return Object.entries(event.effects).map(([effect, value]) => {
      const effectName = effect.replace(/([A-Z])/g, ' $1').trim();
      const formattedName = effectName.charAt(0).toUpperCase() + effectName.slice(1);
      const sign = value > 1 ? '+' : '';
      const percentage = Math.round((value - 1) * 100);

      return {
        name: formattedName,
        value: `${sign}${percentage}%`,
        isPositive: value >= 1,
      };
    });
  };

  // Filter out dismissed events
  const visibleEvents = activeEvents.filter(e => !dismissedEvents.has(e.id));

  if (visibleEvents.length === 0 && !newEventNotification) return null;

  return (
    <>
      {/* New Event Notification */}
      {newEventNotification && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.95)',
            border: `3px solid ${EVENT_THEME[getSeason(newEventNotification.id)].color}`,
            borderRadius: '16px',
            padding: '30px',
            zIndex: 2000,
            minWidth: '400px',
            boxShadow: `0 0 40px ${EVENT_THEME[getSeason(newEventNotification.id)].color}40`,
            animation: 'eventPulse 2s infinite',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '15px',
            }}
          >
            <Sparkles size={32} color={EVENT_THEME[getSeason(newEventNotification.id)].color} />
            <div>
              <div style={{ color: '#4dabf7', fontSize: '0.9rem', fontWeight: 'bold' }}>
                NEW SEASONAL EVENT
              </div>
              <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {formatEventName(newEventNotification.id)}
              </div>
            </div>
          </div>

          {newEventNotification.description && (
            <div
              style={{
                color: '#cbd5e0',
                fontSize: '0.95rem',
                marginBottom: '15px',
                lineHeight: '1.5',
              }}
            >
              {newEventNotification.description}
            </div>
          )}

          {getEffectsList(newEventNotification).length > 0 && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '15px',
              }}
            >
              <div
                style={{
                  color: '#4dabf7',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                }}
              >
                ACTIVE EFFECTS
              </div>
              {getEffectsList(newEventNotification).map((effect, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#fff',
                    fontSize: '0.9rem',
                    marginBottom: '5px',
                  }}
                >
                  <span>{effect.name}</span>
                  <span
                    style={{
                      color: effect.isPositive ? '#4ade80' : '#f87171',
                      fontWeight: 'bold',
                    }}
                  >
                    {effect.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Events List */}
      {visibleEvents.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '100px',
            right: '20px',
            zIndex: 1500,
            maxWidth: '320px',
          }}
        >
          <div
            style={{
              background: 'rgba(26, 26, 46, 0.95)',
              border: '2px solid #4dabf7',
              borderRadius: '12px',
              padding: '15px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '15px',
                paddingBottom: '10px',
                borderBottom: '1px solid rgba(77, 171, 247, 0.3)',
              }}
            >
              <Sparkles size={20} color="#4dabf7" />
              <span style={{ color: '#4dabf7', fontSize: '0.9rem', fontWeight: 'bold' }}>
                ACTIVE EVENTS
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  background: '#4dabf7',
                  color: '#1a1a2e',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                {visibleEvents.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {visibleEvents.map((event) => {
                const season = getSeason(event.id);
                const theme = EVENT_THEME[season];
                const effects = getEffectsList(event);

                return (
                  <div
                    key={event.id}
                    style={{
                      background: `linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))`,
                      border: `1px solid ${theme.color}40`,
                      borderRadius: '8px',
                      padding: '12px',
                      position: 'relative',
                    }}
                  >
                    {/* Dismiss button */}
                    <button
                      onClick={() => dismissEvent(event.id)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Dismiss notification"
                    >
                      <X size={14} color="#999" />
                    </button>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{theme.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: theme.color, fontSize: '0.85rem', fontWeight: 'bold' }}>
                          {formatEventName(event.id)}
                        </div>
                        <div style={{ color: '#999', fontSize: '0.7rem' }}>
                          {formatDuration(event.startTime, event.endTime)}
                        </div>
                      </div>
                    </div>

                    {effects.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#cbd5e0' }}>
                        {effects.slice(0, 3).map((effect, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '3px',
                            }}
                          >
                            <span>{effect.name}</span>
                            <span
                              style={{
                                color: effect.isPositive ? '#4ade80' : '#f87171',
                                fontWeight: 'bold',
                              }}
                            >
                              {effect.value}
                            </span>
                          </div>
                        ))}
                        {effects.length > 3 && (
                          <div style={{ color: '#666', fontSize: '0.7rem', marginTop: '5px' }}>
                            +{effects.length - 3} more effects...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes eventPulse {
            0%, 100% {
              box-shadow: 0 0 40px ${activeEvents.length > 0 ? EVENT_THEME[getSeason(activeEvents[0].id)].color : '#4dabf7'}40;
            }
            50% {
              box-shadow: 0 0 60px ${activeEvents.length > 0 ? EVENT_THEME[getSeason(activeEvents[0].id)].color : '#4dabf7'}80;
            }
          }
        `}
      </style>
    </>
  );
};

export default SeasonalEventOverlay;
