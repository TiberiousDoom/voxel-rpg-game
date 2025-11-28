import React, { useState, useEffect } from 'react';
import { ChevronRight, Check, HelpCircle, X } from 'lucide-react';
import './TutorialMessage.css';

/**
 * TutorialMessage Component
 * Displays tutorial steps and guides the player through the game
 */
function TutorialMessage({ tutorialSystem, onClose }) {
  const [currentStep, setCurrentStep] = useState(null);
  const [allSteps, setAllSteps] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!tutorialSystem) return;

    // Update current step and all steps
    const updateSteps = () => {
      const current = tutorialSystem.getCurrentStep ? tutorialSystem.getCurrentStep() : null;
      const all = tutorialSystem.getAllSteps ? tutorialSystem.getAllSteps() : [];

      setCurrentStep(current);
      setAllSteps(all);
    };

    updateSteps();

    // Listen for step changes
    if (tutorialSystem.on) {
      tutorialSystem.on('step:start', updateSteps);
      tutorialSystem.on('step:complete', updateSteps);
    }

    return () => {
      if (tutorialSystem.off) {
        tutorialSystem.off('step:start', updateSteps);
        tutorialSystem.off('step:complete', updateSteps);
      }
    };
  }, [tutorialSystem]);

  const handleComplete = () => {
    if (tutorialSystem && tutorialSystem.completeStep && currentStep) {
      tutorialSystem.completeStep(currentStep.id);
    }
  };

  const handleSkip = () => {
    if (tutorialSystem && tutorialSystem.skipStep && currentStep) {
      tutorialSystem.skipStep(currentStep.id);
    }
  };

  const handleGoToStep = (stepId) => {
    if (tutorialSystem && tutorialSystem.goToStep) {
      tutorialSystem.goToStep(stepId);
      setShowAll(false);
    }
  };

  const getStepIcon = (step) => {
    if (step.isComplete) {
      return <Check className="step-icon complete" size={20} />;
    }
    if (step.id === currentStep?.id) {
      return <ChevronRight className="step-icon current" size={20} />;
    }
    return <HelpCircle className="step-icon" size={20} />;
  };

  const renderCurrentStep = () => {
    if (!currentStep) {
      return (
        <div className="tutorial-empty">
          <Check size={48} />
          <h3>All caught up!</h3>
          <p>You've completed all available tutorial steps.</p>
          <button className="tutorial-view-all-btn" onClick={() => setShowAll(true)}>
            View All Steps
          </button>
        </div>
      );
    }

    return (
      <div className="tutorial-current">
        <div className="tutorial-header">
          <div className="tutorial-step-number">
            Step {currentStep.order || 1} of {allSteps.length}
          </div>
          <button className="tutorial-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="tutorial-content">
          <div className="tutorial-title-row">
            <h3 className="tutorial-title">{currentStep.title}</h3>
            {currentStep.priority && (
              <span className={`tutorial-priority priority-${currentStep.priority.toLowerCase()}`}>
                {currentStep.priority}
              </span>
            )}
          </div>

          <p className="tutorial-description">{currentStep.description}</p>

          {currentStep.instructions && currentStep.instructions.length > 0 && (
            <div className="tutorial-instructions">
              <h4>Instructions:</h4>
              <ol>
                {currentStep.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>
          )}

          {currentStep.hint && (
            <div className="tutorial-hint">
              <HelpCircle size={16} />
              <span>{currentStep.hint}</span>
            </div>
          )}

          {currentStep.rewards && (
            <div className="tutorial-rewards">
              <strong>Completion Reward:</strong> {currentStep.rewards}
            </div>
          )}
        </div>

        <div className="tutorial-actions">
          <button className="tutorial-skip-btn" onClick={handleSkip}>
            Skip
          </button>
          <button className="tutorial-view-all-btn" onClick={() => setShowAll(true)}>
            View All
          </button>
          <button className="tutorial-complete-btn" onClick={handleComplete}>
            <Check size={18} />
            Mark Complete
          </button>
        </div>
      </div>
    );
  };

  const renderAllSteps = () => {
    return (
      <div className="tutorial-all-steps">
        <div className="tutorial-header">
          <h3>All Tutorial Steps</h3>
          <button className="tutorial-close-btn" onClick={() => setShowAll(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="tutorial-steps-list">
          {allSteps.map((step) => (
            <div
              key={step.id}
              className={`tutorial-step-card ${step.isComplete ? 'complete' : ''} ${step.id === currentStep?.id ? 'current' : ''}`}
              onClick={() => !step.isComplete && handleGoToStep(step.id)}
            >
              <div className="tutorial-step-card-icon">
                {getStepIcon(step)}
              </div>
              <div className="tutorial-step-card-content">
                <div className="tutorial-step-card-title">
                  {step.title}
                  {step.isComplete && <span className="step-badge">✓ Completed</span>}
                  {step.id === currentStep?.id && <span className="step-badge current">Current</span>}
                </div>
                <p className="tutorial-step-card-description">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="tutorial-progress">
          <div className="tutorial-progress-bar">
            <div
              className="tutorial-progress-fill"
              style={{
                width: `${(allSteps.filter(s => s.isComplete).length / allSteps.length) * 100}%`
              }}
            />
          </div>
          <div className="tutorial-progress-text">
            {allSteps.filter(s => s.isComplete).length} of {allSteps.length} completed
          </div>
        </div>
      </div>
    );
  };

  if (!tutorialSystem) {
    return null;
  }

  return (
    <div className="tutorial-message">
      {showAll ? renderAllSteps() : renderCurrentStep()}
    </div>
  );
}

export default TutorialMessage;
