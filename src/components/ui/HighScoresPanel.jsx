/**
 * HighScoresPanel.jsx
 * Displays high scores per game mode
 */

import React, { useState, useMemo } from 'react';
import HighScoreManager from '../../persistence/HighScoreManager.js';

const HighScoresPanel = ({ isOpen, onClose }) => {
  const manager = useMemo(() => new HighScoreManager(), []);
  const modes = manager.getModesWithScores();
  const [selectedMode, setSelectedMode] = useState(modes[0] || null);

  if (!isOpen) return null;

  const scores = selectedMode ? manager.getScores(selectedMode) : [];

  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e', borderRadius: '12px', padding: '24px',
          maxWidth: '500px', width: '90%', maxHeight: '70vh', overflowY: 'auto',
          border: '2px solid #333', color: '#eee',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>\uD83C\uDFC6 High Scores</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: '20px', cursor: 'pointer' }}>x</button>
        </div>

        {modes.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
            No scores yet. Play Endless or Challenge mode to set high scores!
          </div>
        ) : (
          <>
            {/* Mode Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {modes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: selectedMode === mode ? '#3498db' : '#333',
                    color: selectedMode === mode ? '#fff' : '#999',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {mode.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Score Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={{ textAlign: 'left', padding: '6px', color: '#999' }}>#</th>
                  <th style={{ textAlign: 'right', padding: '6px', color: '#999' }}>Score</th>
                  <th style={{ textAlign: 'right', padding: '6px', color: '#999' }}>Duration</th>
                  <th style={{ textAlign: 'right', padding: '6px', color: '#999' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((entry) => (
                  <tr key={`${entry.date}-${entry.rank}`} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '6px', color: entry.rank <= 3 ? '#f1c40f' : '#ccc', fontWeight: entry.rank <= 3 ? 'bold' : 'normal' }}>
                      {entry.rank <= 3 ? ['', '\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'][entry.rank] : entry.rank}
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px', color: '#fff', fontWeight: 'bold' }}>
                      {entry.score.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px', color: '#aaa' }}>
                      {HighScoreManager.formatDuration(entry.duration)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px', color: '#888', fontSize: '11px' }}>
                      {formatDate(entry.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default HighScoresPanel;
