/**
 * DialogueUI.jsx — Branching dialogue interface for companion conversations.
 *
 * Shows speaker name, dialogue text, and choice buttons.
 * Supports conditions on choices (filtered by DialogueEngine).
 */

import React, { useState, useEffect, useCallback } from 'react';
import useGameStore from '../../stores/useGameStore';
import DialogueEngine from '../../systems/story/DialogueEngine';

const styles = {
  overlay: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    padding: '20px',
    pointerEvents: 'none',
    zIndex: 1000,
  },
  container: {
    background: 'rgba(10, 8, 20, 0.92)',
    border: '1px solid rgba(120, 80, 180, 0.5)',
    borderRadius: '12px',
    padding: '20px 24px',
    maxWidth: '600px',
    width: '100%',
    pointerEvents: 'auto',
    color: '#e0d8f0',
    fontFamily: 'monospace',
  },
  speaker: {
    color: '#bb88ff',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  text: {
    fontSize: '16px',
    lineHeight: '1.5',
    marginBottom: '16px',
    color: '#d0c8e0',
  },
  choicesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  choice: {
    background: 'rgba(80, 50, 120, 0.3)',
    border: '1px solid rgba(120, 80, 180, 0.4)',
    borderRadius: '6px',
    padding: '10px 16px',
    color: '#c8b8e8',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s, border-color 0.15s',
  },
};

const DialogueUI = ({ dialogueTree, onAction, onClose }) => {
  const [engine] = useState(() => new DialogueEngine());
  const [, setUpdate] = useState(0); // Force re-render trigger

  const playerState = useGameStore((s) => ({
    bondLevel: s.companion.bondLevel,
    inventory: s.inventory,
  }));

  useEffect(() => {
    if (dialogueTree) {
      engine.startDialogue(dialogueTree);
      setUpdate((n) => n + 1);
    }
  }, [dialogueTree, engine]);

  const handleChoice = useCallback((choiceId) => {
    const result = engine.selectChoice(choiceId);

    if (result?.action && result.action !== 'close') {
      onAction?.(result.action);
    }

    if (engine.isComplete()) {
      onClose?.();
    } else {
      setUpdate((n) => n + 1);
    }
  }, [engine, onAction, onClose]);

  const handleAdvance = useCallback(() => {
    if (engine.hasChoices()) return;
    const advanced = engine.advance();
    if (!advanced || engine.isComplete()) {
      onClose?.();
    } else {
      setUpdate((n) => n + 1);
    }
  }, [engine, onClose]);

  if (!dialogueTree || engine.isComplete()) return null;

  const node = engine.getCurrentNode();
  if (!node) return null;

  const choices = engine.getAvailableChoices(playerState);

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {node.speaker && (
          <div style={styles.speaker}>{node.speaker}</div>
        )}
        <div style={styles.text}>{node.text}</div>

        {choices.length > 0 ? (
          <div style={styles.choicesContainer}>
            {choices.map((choice) => (
              <button
                key={choice.id}
                style={styles.choice}
                onClick={() => handleChoice(choice.id)}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(100, 60, 160, 0.5)';
                  e.target.style.borderColor = 'rgba(160, 100, 220, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(80, 50, 120, 0.3)';
                  e.target.style.borderColor = 'rgba(120, 80, 180, 0.4)';
                }}
              >
                {choice.text}
              </button>
            ))}
          </div>
        ) : (
          <button
            style={{ ...styles.choice, textAlign: 'center' }}
            onClick={handleAdvance}
          >
            Continue...
          </button>
        )}
      </div>
    </div>
  );
};

export default DialogueUI;
