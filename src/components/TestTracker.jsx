import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TEST_PHASES, TOTAL_CRITERIA_COUNT } from '../data/testCriteria';

const DB_NAME = 'TestTrackerDB';
const STORE_NAME = 'criteria';
const DB_VERSION = 1;

/** Open (or create) the IndexedDB database for persisting criterion status. */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Generate a Markdown export of all criteria with check status and notes. */
function generateExport(checkedMap, notesMap) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const totalChecked = Object.values(checkedMap).filter(Boolean).length;
  let md = `# QA Test Tracker Export\n`;
  md += `**Exported:** ${timestamp}\n`;
  md += `**Progress:** ${totalChecked}/${TOTAL_CRITERIA_COUNT} passed\n\n`;

  for (const phase of TEST_PHASES) {
    const phaseCriteria = phase.categories.flatMap((c) => c.criteria);
    const phaseChecked = phaseCriteria.filter((c) => checkedMap[c.id]).length;
    md += `## ${phase.name} (${phaseChecked}/${phaseCriteria.length})\n\n`;

    for (const cat of phase.categories) {
      const catChecked = cat.criteria.filter((c) => checkedMap[c.id]).length;
      md += `### ${cat.name} (${catChecked}/${cat.criteria.length})\n\n`;

      for (const criterion of cat.criteria) {
        const check = checkedMap[criterion.id] ? 'x' : ' ';
        md += `- [${check}] **${criterion.label}** — ${criterion.description}\n`;
        const note = notesMap[criterion.id];
        if (note && note.trim()) {
          md += `  - *Note:* ${note.trim()}\n`;
        }
      }
      md += '\n';
    }
  }

  return md;
}

/**
 * QA Test Tracker — toggled with the backtick (`) key.
 * Displays phase exit criteria as a quest-log-style checklist.
 * Supports per-criterion notes and Markdown export.
 * Checked status and notes are persisted in IndexedDB.
 */
const TestTracker = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [checkedMap, setCheckedMap] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [collapsedPhases, setCollapsedPhases] = useState({});
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [editingNote, setEditingNote] = useState(null);
  const [exportText, setExportText] = useState(null);
  const dbRef = useRef(null);
  const noteInputRef = useRef(null);

  // Open DB and load saved state on mount
  useEffect(() => {
    let cancelled = false;
    openDB()
      .then(async (db) => {
        if (cancelled) return;
        dbRef.current = db;
        const [savedChecked, savedNotes] = await Promise.all([
          idbGet(db, 'checkedMap'),
          idbGet(db, 'notesMap'),
        ]);
        if (!cancelled) {
          if (savedChecked) setCheckedMap(savedChecked);
          if (savedNotes) setNotesMap(savedNotes);
        }
      })
      .catch(() => {
        // IndexedDB unavailable — run without persistence
      });
    return () => { cancelled = true; };
  }, []);

  // Focus note input when editing starts
  useEffect(() => {
    if (editingNote && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [editingNote]);

  // Keyboard toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }
      if (e.key === '`') {
        setIsVisible((prev) => !prev);
        setExportText(null);
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCriterion = useCallback((id) => {
    setCheckedMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (dbRef.current) {
        idbPut(dbRef.current, 'checkedMap', next).catch(() => {});
      }
      return next;
    });
  }, []);

  const updateNote = useCallback((id, text) => {
    setNotesMap((prev) => {
      const next = { ...prev, [id]: text };
      if (dbRef.current) {
        idbPut(dbRef.current, 'notesMap', next).catch(() => {});
      }
      return next;
    });
  }, []);

  const togglePhase = useCallback((phaseId) => {
    setCollapsedPhases((prev) => ({ ...prev, [phaseId]: !prev[phaseId] }));
  }, []);

  const toggleCategory = useCallback((catId) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  }, []);

  const handleExport = useCallback(() => {
    const md = generateExport(checkedMap, notesMap);
    setExportText(md);
  }, [checkedMap, notesMap]);

  const handleCopyExport = useCallback(() => {
    if (exportText) {
      navigator.clipboard.writeText(exportText).catch(() => {
        // Fallback: select the textarea for manual copy
      });
    }
  }, [exportText]);

  const handleDownloadExport = useCallback(() => {
    if (!exportText) return;
    const blob = new Blob([exportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-tracker-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportText]);

  if (!isVisible) return null;

  const totalChecked = Object.values(checkedMap).filter(Boolean).length;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        width: '420px',
        maxHeight: 'calc(100vh - 20px)',
        background: 'rgba(26, 26, 46, 0.95)',
        border: '2px solid #FFD700',
        borderRadius: '10px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#e2e8f0',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '2px solid #4a5568',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #2d3748, #1a202c)',
          borderRadius: '8px 8px 0 0',
        }}
      >
        <span style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '14px' }}>
          QA Test Tracker
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#a0aec0', fontSize: '12px' }}>
            {totalChecked}/{TOTAL_CRITERIA_COUNT}
          </span>
          <button
            onClick={handleExport}
            style={{
              padding: '3px 8px',
              background: 'rgba(255, 215, 0, 0.2)',
              border: '1px solid rgba(255, 215, 0, 0.4)',
              borderRadius: '4px',
              color: '#FFD700',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            title="Export as Markdown"
          >
            Export
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: '#2d3748' }}>
        <div
          style={{
            height: '100%',
            width: `${(totalChecked / TOTAL_CRITERIA_COUNT) * 100}%`,
            background: totalChecked === TOTAL_CRITERIA_COUNT
              ? '#48bb78'
              : 'linear-gradient(90deg, #FFD700, #f6ad55)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Export panel */}
      {exportText && (
        <div style={{ padding: '8px 10px', borderBottom: '1px solid #4a5568' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#a0aec0', fontSize: '11px' }}>Markdown Export</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleCopyExport}
                style={{
                  padding: '2px 6px',
                  background: 'rgba(72, 187, 120, 0.2)',
                  border: '1px solid rgba(72, 187, 120, 0.4)',
                  borderRadius: '3px',
                  color: '#68d391',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                Copy
              </button>
              <button
                onClick={handleDownloadExport}
                style={{
                  padding: '2px 6px',
                  background: 'rgba(77, 171, 247, 0.2)',
                  border: '1px solid rgba(77, 171, 247, 0.4)',
                  borderRadius: '3px',
                  color: '#4dabf7',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                Download .md
              </button>
              <button
                onClick={() => setExportText(null)}
                style={{
                  padding: '2px 6px',
                  background: 'rgba(245, 101, 101, 0.2)',
                  border: '1px solid rgba(245, 101, 101, 0.4)',
                  borderRadius: '3px',
                  color: '#fc8181',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={exportText}
            style={{
              width: '100%',
              height: '120px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid #4a5568',
              borderRadius: '4px',
              color: '#a0aec0',
              fontSize: '10px',
              fontFamily: 'monospace',
              padding: '6px',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {TEST_PHASES.map((phase) => {
          const phaseCollapsed = collapsedPhases[phase.id];
          const phaseCriteria = phase.categories.flatMap((c) => c.criteria);
          const phaseChecked = phaseCriteria.filter((c) => checkedMap[c.id]).length;

          return (
            <div key={phase.id} style={{ marginBottom: '8px' }}>
              {/* Phase header */}
              <button
                onClick={() => togglePhase(phase.id)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '6px',
                  color: '#FFD700',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{phaseCollapsed ? '+' : '-'} {phase.name}</span>
                <span style={{ fontSize: '11px', color: '#a0aec0' }}>
                  {phaseChecked}/{phaseCriteria.length}
                </span>
              </button>

              {!phaseCollapsed && (
                <div style={{ marginTop: '4px' }}>
                  {phase.categories.map((cat) => {
                    const catCollapsed = collapsedCategories[cat.id];
                    const catChecked = cat.criteria.filter((c) => checkedMap[c.id]).length;

                    return (
                      <div key={cat.id} style={{ marginLeft: '8px', marginTop: '4px' }}>
                        {/* Category header */}
                        <button
                          onClick={() => toggleCategory(cat.id)}
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            background: 'rgba(77, 171, 247, 0.08)',
                            border: '1px solid rgba(77, 171, 247, 0.2)',
                            borderRadius: '4px',
                            color: '#4dabf7',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>{catCollapsed ? '+' : '-'} {cat.name}</span>
                          <span style={{ fontSize: '11px', color: '#718096' }}>
                            {catChecked}/{cat.criteria.length}
                          </span>
                        </button>

                        {/* Criteria checklist */}
                        {!catCollapsed && (
                          <div style={{ marginLeft: '6px', marginTop: '2px' }}>
                            {cat.criteria.map((criterion) => {
                              const checked = !!checkedMap[criterion.id];
                              const note = notesMap[criterion.id] || '';
                              const isEditing = editingNote === criterion.id;

                              return (
                                <div key={criterion.id} style={{ marginBottom: '2px' }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '6px',
                                      padding: '3px 4px',
                                      borderRadius: '3px',
                                      opacity: checked ? 0.7 : 1,
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleCriterion(criterion.id)}
                                      style={{ marginTop: '2px', cursor: 'pointer', accentColor: '#48bb78' }}
                                    />
                                    <span
                                      style={{
                                        textDecoration: checked ? 'line-through' : 'none',
                                        color: checked ? '#68d391' : '#e2e8f0',
                                        fontSize: '12px',
                                        lineHeight: 1.4,
                                        flex: 1,
                                        cursor: 'default',
                                      }}
                                      title={criterion.description}
                                    >
                                      {criterion.label}
                                    </span>
                                    <button
                                      onClick={() => setEditingNote(isEditing ? null : criterion.id)}
                                      style={{
                                        padding: '1px 4px',
                                        background: note ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                                        border: note ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '3px',
                                        color: note ? '#FFD700' : '#718096',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                      }}
                                      title={note || 'Add note'}
                                    >
                                      {note ? 'note' : '+'}
                                    </button>
                                  </div>
                                  {/* Note editor */}
                                  {isEditing && (
                                    <div style={{ marginLeft: '24px', marginTop: '2px', marginBottom: '4px' }}>
                                      <textarea
                                        ref={noteInputRef}
                                        value={note}
                                        onChange={(e) => updateNote(criterion.id, e.target.value)}
                                        placeholder="Add note..."
                                        rows={2}
                                        style={{
                                          width: '100%',
                                          background: 'rgba(0, 0, 0, 0.4)',
                                          border: '1px solid rgba(255, 215, 0, 0.3)',
                                          borderRadius: '4px',
                                          color: '#e2e8f0',
                                          fontSize: '11px',
                                          fontFamily: 'sans-serif',
                                          padding: '4px 6px',
                                          resize: 'vertical',
                                          boxSizing: 'border-box',
                                          userSelect: 'text',
                                        }}
                                        onKeyDown={(e) => {
                                          // Prevent backtick from closing the tracker while typing
                                          e.stopPropagation();
                                          if (e.key === 'Escape') {
                                            setEditingNote(null);
                                          }
                                        }}
                                      />
                                    </div>
                                  )}
                                  {/* Show saved note inline (collapsed) */}
                                  {!isEditing && note && (
                                    <div
                                      style={{
                                        marginLeft: '24px',
                                        fontSize: '10px',
                                        color: '#a0aec0',
                                        fontStyle: 'italic',
                                        lineHeight: 1.3,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                      }}
                                    >
                                      {note.length > 80 ? note.slice(0, 80) + '...' : note}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 14px',
          borderTop: '1px solid #4a5568',
          fontSize: '10px',
          color: '#718096',
          textAlign: 'center',
        }}
      >
        Press ` to close — click + to add notes — Export to share
      </div>
    </div>
  );
};

export default TestTracker;
