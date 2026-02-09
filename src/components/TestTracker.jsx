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

/**
 * QA Test Tracker — toggled with the backtick (`) key.
 * Displays phase exit criteria as a quest-log-style checklist.
 * Checked status is persisted in IndexedDB.
 */
const TestTracker = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [checkedMap, setCheckedMap] = useState({});
  const [collapsedPhases, setCollapsedPhases] = useState({});
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const dbRef = useRef(null);

  // Open DB and load saved state on mount
  useEffect(() => {
    let cancelled = false;
    openDB()
      .then(async (db) => {
        if (cancelled) return;
        dbRef.current = db;
        const saved = await idbGet(db, 'checkedMap');
        if (!cancelled && saved) {
          setCheckedMap(saved);
        }
      })
      .catch(() => {
        // IndexedDB unavailable — run without persistence
      });
    return () => { cancelled = true; };
  }, []);

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
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCriterion = useCallback((id) => {
    setCheckedMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      // Persist asynchronously
      if (dbRef.current) {
        idbPut(dbRef.current, 'checkedMap', next).catch(() => {});
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

  if (!isVisible) return null;

  const totalChecked = Object.values(checkedMap).filter(Boolean).length;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        width: '380px',
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
        <span style={{ color: '#a0aec0', fontSize: '12px' }}>
          {totalChecked}/{TOTAL_CRITERIA_COUNT} passed
        </span>
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
                              return (
                                <label
                                  key={criterion.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '6px',
                                    padding: '3px 4px',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    opacity: checked ? 0.6 : 1,
                                  }}
                                  title={criterion.description}
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
                                    }}
                                  >
                                    {criterion.label}
                                  </span>
                                </label>
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
        Press ` to close — hover criteria for details
      </div>
    </div>
  );
};

export default TestTracker;
