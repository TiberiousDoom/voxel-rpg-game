/**
 * TutorialOverlay.jsx - Interactive tutorial overlay component
 *
 * Displays:
 * - Current tutorial step title and message
 * - Progress indicator (step X of Y)
 * - Next/Skip buttons
 * - Highlighted UI elements with arrows
 */

import React, { useState, useEffect } from 'react';
import { HelpCircle, ArrowRight, X, CheckCircle } from 'lucide-react';
import './TutorialOverlay.css';

const TutorialOverlay = ({ tutorialSystem }) => {
  const [tutorialState, setTutorialState] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!tutorialSystem) return;

    // Subscribe to tutorial updates
    const handleUpdate = (state) => {
      setTutorialState(state);

      // Auto-show if tutorial just started
      if (state.isActive && !isVisible) {
        setIsVisible(true);
      }
    };

    tutorialSystem.onUIUpdate(handleUpdate);

    // Get initial state
    setTutorialState(tutorialSystem.getState());

    return () => {
      tutorialSystem.removeUIUpdateListener(handleUpdate);
    };
  }, [tutorialSystem, isVisible]);

  // Don't render if tutorial not active or not visible
  if (!tutorialState?.isActive || !isVisible) {
    return null;
  }

  const { currentStep, stepNumber, totalSteps, progress } = tutorialState;

  if (!currentStep) return null;

  const handleNext = () => {
    tutorialSystem.nextStep();
  };

  const handleSkip = () => {
    if (window.confirm('Are you sure you want to skip the tutorial? You can restart it later from settings.')) {
      tutorialSystem.skipTutorial();
      setIsVisible(false);
    }
  };

  const handleMinimize = () => {
    setIsVisible(false);
  };

  return (
    <>
      {/* Overlay backdrop with highlight cutout */}
      <div
        className="tutorial-overlay-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9998,
          pointerEvents: currentStep.blockInput ? 'auto' : 'none',
        }}
      />

      {/* Tutorial message panel */}
      <div
        className="tutorial-panel"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: '3px solid #fff',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          color: '#fff',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={24} />
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
              {currentStep.title}
            </h3>
          </div>
          <button
            onClick={handleMinimize}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '4px',
              opacity: 0.8,
            }}
            title="Minimize tutorial"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress indicator */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.9 }}>
            <span>Step {stepNumber} of {totalSteps}</span>
            <span>{progress}% Complete</span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)',
              transition: 'width 0.3s ease',
              borderRadius: '3px',
            }} />
          </div>
        </div>

        {/* Message */}
        <p style={{
          fontSize: '1.1rem',
          lineHeight: '1.6',
          margin: '0 0 24px 0',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '16px',
          borderRadius: '8px',
        }}>
          {currentStep.message}
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSkip}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Skip Tutorial
          </button>

          {currentStep.completionCondition.type === 'button_clicked' ||
           currentStep.completionCondition.type === 'manual' ||
           currentStep.completionCondition.type === 'timer' ? (
            <button
              onClick={handleNext}
              style={{
                background: '#fff',
                color: '#667eea',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }}
            >
              Next
              <ArrowRight size={20} />
            </button>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              fontSize: '0.9rem',
            }}>
              <div className="spinner" style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid #fff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              Waiting for action...
            </div>
          )}
        </div>
      </div>

      {/* Highlight arrow (if element specified) */}
      {currentStep.highlightElement && (
        <div
          className="tutorial-arrow"
          style={{
            position: 'fixed',
            fontSize: '3rem',
            color: '#fbbf24',
            zIndex: 10000,
            animation: 'bounce 1s infinite',
            textShadow: '0 0 20px rgba(251, 191, 36, 0.8)',
            pointerEvents: 'none',
          }}
        >
          ↓
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .tutorial-panel {
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
};

export default TutorialOverlay;
