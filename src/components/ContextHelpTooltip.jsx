/**
 * ContextHelpTooltip.jsx - Context-sensitive help tooltip component
 *
 * Displays:
 * - Help tip title and message
 * - Icon based on tip category
 * - Dismiss and "Don't show again" options
 * - Auto-dismiss timer
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Info,
  Lightbulb,
  Shield,
  TrendingUp,
  X,
  Users
} from 'lucide-react';
import './ContextHelpTooltip.css';

const ContextHelpTooltip = ({ contextHelp }) => {
  const [activeTips, setActiveTips] = useState([]);
  const [dismissedTips, setDismissedTips] = useState(new Set());

  useEffect(() => {
    if (!contextHelp) return;

    // Subscribe to tip triggers
    const handleTipTriggered = (tip) => {
      // Don't show if already dismissed in this session
      if (dismissedTips.has(tip.id)) return;

      // Add to active tips (limit to 3 visible at once)
      setActiveTips(prev => {
        const newTips = [...prev, { ...tip, timestamp: Date.now() }];
        return newTips.slice(-3); // Keep only last 3
      });

      // Auto-dismiss after 10 seconds based on priority
      const dismissTime = tip.priority === 'high' ? 15000 : tip.priority === 'normal' ? 10000 : 7000;

      setTimeout(() => {
        setActiveTips(prev => prev.filter(t => t.id !== tip.id));
      }, dismissTime);
    };

    contextHelp.onTipTriggered(handleTipTriggered);

    return () => {
      contextHelp.removeTipTriggeredListener(handleTipTriggered);
    };
  }, [contextHelp, dismissedTips]);

  const handleDismiss = (tipId) => {
    setActiveTips(prev => prev.filter(tip => tip.id !== tipId));
  };

  const handleDismissForever = (tipId) => {
    // Dismiss from UI
    setActiveTips(prev => prev.filter(tip => tip.id !== tipId));

    // Mark as dismissed in context help system
    if (contextHelp) {
      contextHelp.dismissTip(tipId);
    }

    // Add to local dismissed set
    setDismissedTips(prev => new Set(prev).add(tipId));
  };

  if (activeTips.length === 0) return null;

  const getIcon = (category, priority) => {
    const iconSize = 20;
    const color = priority === 'high' ? '#ef4444' : priority === 'normal' ? '#3b82f6' : '#10b981';

    switch (category) {
      case 'building':
        return <Shield size={iconSize} color={color} />;
      case 'resources':
        return <TrendingUp size={iconSize} color={color} />;
      case 'npc':
        return <Users size={iconSize} color={color} />;
      case 'events':
        return <AlertCircle size={iconSize} color={color} />;
      case 'progression':
        return <Lightbulb size={iconSize} color={color} />;
      default:
        return <Info size={iconSize} color={color} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#dc2626';
      case 'normal':
        return '#2563eb';
      case 'low':
        return '#059669';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="context-help-container">
      {activeTips.map((tip, index) => {
        const bgColor = getPriorityColor(tip.priority);

        return (
          <div
            key={tip.id}
            className="context-help-tip"
            style={{
              position: 'fixed',
              right: '20px',
              bottom: `${20 + (index * 120)}px`,
              background: '#fff',
              border: `3px solid ${bgColor}`,
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '350px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              zIndex: 9900 + index,
              animation: 'slideInRight 0.3s ease-out',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                {getIcon(tip.category, tip.priority)}
                <h4 style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  {tip.title}
                </h4>
              </div>
              <button
                onClick={() => handleDismiss(tip.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px',
                  marginLeft: '8px',
                }}
                title="Dismiss"
              >
                <X size={18} />
              </button>
            </div>

            {/* Message */}
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '0.9rem',
              lineHeight: '1.5',
              color: '#4b5563',
            }}>
              {tip.message}
            </p>

            {/* Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              borderTop: '1px solid #e5e7eb',
              paddingTop: '12px'
            }}>
              <button
                onClick={() => handleDismissForever(tip.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '4px 8px',
                  fontWeight: '500',
                }}
              >
                Don't show again
              </button>
              <button
                onClick={() => handleDismiss(tip.id)}
                style={{
                  background: bgColor,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                }}
              >
                Got it
              </button>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .context-help-tip {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .context-help-tip button {
          font-family: inherit;
          touch-action: manipulation;
          transition: all 0.2s;
        }

        .context-help-tip button:hover {
          opacity: 0.9;
        }

        @media (max-width: 768px) {
          .context-help-tip {
            right: 10px !important;
            left: 10px !important;
            max-width: none !important;
            bottom: ${props => 10 + (props.index * 100)}px !important;
          }

          .context-help-tip h4 {
            font-size: 0.95rem !important;
          }

          .context-help-tip p {
            font-size: 0.85rem !important;
          }

          .context-help-tip button {
            min-height: 36px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .context-help-tip {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ContextHelpTooltip;
