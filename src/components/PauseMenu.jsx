/**
 * PauseMenu — F10 to toggle. Freezes gameplay and shows a centered overlay.
 * Blocks all game input while open via capture-phase key handler.
 * Includes Save and Load buttons using the Game3DSaveManager singleton.
 */

import React, { useState, useEffect, useCallback } from 'react';
import useGameStore from '../stores/useGameStore';
import { game3DSaveManager } from '../persistence/Game3DSaveManager';

const PauseMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const pause = useCallback(() => {
    const state = useGameStore.getState();
    if (state.gameState !== 'playing') return;
    useGameStore.setState({
      gameState: 'paused',
      worldTime: { ...state.worldTime, paused: true },
    });
    // Release pointer lock so cursor is available
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setIsOpen(true);
    setStatusMsg(null);
  }, []);

  const resume = useCallback(() => {
    const state = useGameStore.getState();
    if (state.gameState !== 'paused') return;
    useGameStore.setState({
      gameState: 'playing',
      worldTime: { ...state.worldTime, paused: false },
    });
    setIsOpen(false);
    setStatusMsg(null);
  }, []);

  const handleSave = useCallback(async () => {
    setStatusMsg({ text: 'Saving...', color: '#aaa' });
    try {
      const store = useGameStore;
      const chunkManager = useGameStore.getState()._chunkManager;
      const result = await game3DSaveManager.saveGame(store, chunkManager, 'default');
      if (result.success) {
        setStatusMsg({ text: 'Game saved!', color: '#51cf66' });
      } else {
        setStatusMsg({ text: result.message, color: '#ff6b6b' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Save failed: ' + err.message, color: '#ff6b6b' });
    }
  }, []);

  const handleLoad = useCallback(async () => {
    setStatusMsg({ text: 'Loading...', color: '#aaa' });
    try {
      const store = useGameStore;
      const chunkManager = useGameStore.getState()._chunkManager;
      const result = await game3DSaveManager.loadGame(store, chunkManager, 'default');
      if (result.success) {
        setStatusMsg({ text: 'Game loaded!', color: '#51cf66' });
        // Close menu after brief delay so user sees success message
        setTimeout(() => {
          const state = useGameStore.getState();
          useGameStore.setState({
            gameState: 'playing',
            worldTime: { ...state.worldTime, paused: false },
          });
          setIsOpen(false);
          setStatusMsg(null);
        }, 600);
      } else {
        setStatusMsg({ text: result.message, color: '#ff6b6b' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Load failed: ' + err.message, color: '#ff6b6b' });
    }
  }, []);

  // Capture-phase key handler — blocks all game input while open
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'F10') {
        // Don't toggle if in a text field
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (isOpen) {
          resume();
        } else {
          pause();
        }
        return;
      }

      if (!isOpen) return;

      // Escape also closes
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        resume();
        return;
      }

      // Block all other keys from reaching game handlers
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen, pause, resume]);

  // Block mouse events on the overlay so clicks don't pass through
  useEffect(() => {
    if (!isOpen) return;
    const blockMouse = (e) => {
      // Only block events on the overlay itself, not the buttons
      if (e.target.closest('[data-pause-button]')) return;
      e.stopPropagation();
    };
    // Capture phase blocks mouse from reaching the canvas
    for (const evt of ['mousedown', 'mouseup', 'mousemove', 'click', 'contextmenu', 'wheel']) {
      window.addEventListener(evt, blockMouse, true);
    }
    return () => {
      for (const evt of ['mousedown', 'mouseup', 'mousemove', 'click', 'contextmenu', 'wheel']) {
        window.removeEventListener(evt, blockMouse, true);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <h2 style={styles.title}>Paused</h2>

        <div style={styles.buttonGroup}>
          <PauseButton label="Resume" onClick={resume} />
          <PauseButton label="Save Game" onClick={handleSave} />
          <PauseButton label="Load Game" onClick={handleLoad} />
        </div>

        {statusMsg && (
          <p style={{ ...styles.status, color: statusMsg.color }}>{statusMsg.text}</p>
        )}

        <p style={styles.hint}>F10 or Escape to resume</p>
      </div>
    </div>
  );
};

function PauseButton({ label, onClick }) {
  return (
    <button
      data-pause-button
      style={styles.button}
      onClick={onClick}
      onMouseEnter={(e) => Object.assign(e.target.style, styles.buttonHover)}
      onMouseLeave={(e) => Object.assign(e.target.style, { background: 'rgba(255,255,255,0.1)' })}
    >
      {label}
    </button>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '40px 60px',
    textAlign: 'center',
    minWidth: '280px',
  },
  title: {
    color: '#fff',
    fontFamily: 'sans-serif',
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 0 24px 0',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  button: {
    display: 'block',
    width: '100%',
    padding: '12px 24px',
    fontSize: '18px',
    fontFamily: 'sans-serif',
    color: '#fff',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  buttonHover: {
    background: 'rgba(255, 255, 255, 0.25)',
  },
  status: {
    fontFamily: 'sans-serif',
    fontSize: '14px',
    marginTop: '12px',
    marginBottom: 0,
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'sans-serif',
    fontSize: '12px',
    marginTop: '12px',
    marginBottom: 0,
  },
};

export default PauseMenu;
