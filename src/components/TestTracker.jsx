import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TEST_PHASES, TOTAL_CRITERIA_COUNT, AUTO_CHECKS } from '../data/testCriteria';
import { testNotesManager } from '../persistence/TestNotesManager';
import useGameStore from '../stores/useGameStore';

const STATUS_CYCLE = ['untested', 'pass', 'fail'];
const STATUS_COLORS = {
  untested: '#a0aec0',
  pass: '#51cf66',
  fail: '#ff6b6b',
};
const STATUS_ICONS = {
  untested: '\u2014', // em-dash
  pass: '\u2713',     // check
  fail: '\u2717',     // cross
};

const DEFAULT_RECORD = { status: 'untested', notes: '', screenshot: null, screenshotTimestamp: null };

/**
 * TestTracker — QA overlay panel for tracking exit criteria.
 * Toggle with backtick (`), close with Escape.
 */
const TestTracker = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState(new Map());
  const [loaded, setLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCriterion, setSelectedCriterion] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState('sidebar'); // sidebar | list | detail
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const debounceTimers = useRef({});

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Keyboard shortcut — capture phase so we run before game handlers
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '`') {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        setIsOpen((prev) => !prev);
        return;
      }
      if (!isOpen) return;
      // Panel is open — block all game keys from firing
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setIsOpen(false);
        return;
      }
      // Stop every other key from reaching game handlers (WASD, I, C, etc.)
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', handler, true); // capture phase
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen]);

  // Load from IDB on first open
  useEffect(() => {
    if (isOpen && !loaded) {
      testNotesManager.loadAll().then((map) => {
        setRecords(map);
        setLoaded(true);
      }).catch((err) => {
        console.warn('[TestTracker] Failed to load notes:', err);
        setLoaded(true);
      });
    }
  }, [isOpen, loaded]);

  // Auto-select first category on open
  useEffect(() => {
    if (isOpen && !selectedCategory && TEST_PHASES.length > 0) {
      setSelectedCategory(TEST_PHASES[0].categories[0]);
    }
  }, [isOpen, selectedCategory]);

  // Build thumbnail URLs for screenshots
  useEffect(() => {
    const newUrls = {};
    const oldUrls = { ...thumbnailUrls };

    for (const [id, rec] of records) {
      if (rec.screenshot) {
        // Reuse existing URL if same timestamp
        if (oldUrls[id] && rec.screenshotTimestamp === thumbnailUrls[id + '_ts']) {
          newUrls[id] = oldUrls[id];
          newUrls[id + '_ts'] = oldUrls[id + '_ts'];
          delete oldUrls[id];
        } else {
          const blob = new Blob([rec.screenshot], { type: 'image/png' });
          newUrls[id] = URL.createObjectURL(blob);
          newUrls[id + '_ts'] = rec.screenshotTimestamp;
        }
      }
    }

    // Revoke any URLs that are no longer needed
    for (const key of Object.keys(oldUrls)) {
      if (!key.endsWith('_ts') && oldUrls[key] && !newUrls[key]) {
        URL.revokeObjectURL(oldUrls[key]);
      }
    }

    setThumbnailUrls(newUrls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  // Cleanup all blob URLs on unmount
  useEffect(() => {
    return () => {
      for (const key of Object.keys(thumbnailUrls)) {
        if (!key.endsWith('_ts') && thumbnailUrls[key]) {
          URL.revokeObjectURL(thumbnailUrls[key]);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Auto-detection ---
  // Track which criteria have been auto-detected as passing (survives open/close)
  const autoDetectedRef = useRef(new Set());
  const [autoDetectedIds, setAutoDetectedIds] = useState(new Set());

  // Poll store and auto-promote untested → pass while panel is open
  useEffect(() => {
    if (!isOpen || !loaded) return;

    const applyDetections = () => {
      const state = useGameStore.getState();
      for (const [id, check] of Object.entries(AUTO_CHECKS)) {
        if (autoDetectedRef.current.has(id)) continue;
        try {
          if (check(state)) {
            autoDetectedRef.current.add(id);
          }
        } catch (e) { /* state not ready */ }
      }

      // Apply all auto-detections to untested records
      const detected = autoDetectedRef.current;
      if (detected.size > 0) {
        setAutoDetectedIds(new Set(detected));
        setRecords((prev) => {
          const next = new Map(prev);
          let changed = false;
          for (const id of detected) {
            const existing = prev.get(id) || { ...DEFAULT_RECORD, id };
            if (existing.status === 'untested') {
              const updated = { ...existing, status: 'pass', id, autoDetected: true };
              next.set(id, updated);
              testNotesManager.saveCriterion(id, updated).catch(() => {});
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    };

    applyDetections();
    const interval = setInterval(applyDetections, 2000);
    return () => clearInterval(interval);
  }, [isOpen, loaded]);

  const getRecord = useCallback((id) => records.get(id) || DEFAULT_RECORD, [records]);

  const updateRecord = useCallback((id, updates) => {
    setRecords((prev) => {
      const next = new Map(prev);
      const existing = prev.get(id) || { ...DEFAULT_RECORD, id };
      next.set(id, { ...existing, ...updates, id });
      return next;
    });

    // Persist to IDB
    const current = records.get(id) || { ...DEFAULT_RECORD, id };
    const merged = { ...current, ...updates, id };
    testNotesManager.saveCriterion(id, merged).catch((err) =>
      console.warn('[TestTracker] Save failed:', err)
    );
  }, [records]);

  const cycleStatus = useCallback((id) => {
    const rec = records.get(id) || DEFAULT_RECORD;
    const idx = STATUS_CYCLE.indexOf(rec.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    updateRecord(id, { status: next });
  }, [records, updateRecord]);

  const handleNotesChange = useCallback((id, text) => {
    // Update UI immediately
    setRecords((prev) => {
      const next = new Map(prev);
      const existing = prev.get(id) || { ...DEFAULT_RECORD, id };
      next.set(id, { ...existing, notes: text, id });
      return next;
    });

    // Debounce IDB write
    if (debounceTimers.current[id]) clearTimeout(debounceTimers.current[id]);
    debounceTimers.current[id] = setTimeout(() => {
      const current = records.get(id) || { ...DEFAULT_RECORD, id };
      testNotesManager.saveCriterion(id, { ...current, notes: text, id }).catch((err) =>
        console.warn('[TestTracker] Note save failed:', err)
      );
    }, 500);
  }, [records]);

  const captureScreenshot = useCallback((id) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      blob.arrayBuffer().then((buffer) => {
        const ts = Date.now();
        updateRecord(id, { screenshot: buffer, screenshotTimestamp: ts });
      });
    }, 'image/png');
  }, [updateRecord]);

  const removeScreenshot = useCallback((id) => {
    updateRecord(id, { screenshot: null, screenshotTimestamp: null });
  }, [updateRecord]);

  const handleExport = useCallback(async () => {
    try {
      const data = await testNotesManager.exportAsJSON();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-tracker-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('[TestTracker] Export failed:', err);
    }
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await testNotesManager.importFromJSON(data);
        const map = await testNotesManager.loadAll();
        setRecords(map);
      } catch (err) {
        console.warn('[TestTracker] Import failed:', err);
      }
    };
    input.click();
  }, []);

  // Stats
  const stats = useMemo(() => {
    let tested = 0;
    let passed = 0;
    let failed = 0;
    for (const [, rec] of records) {
      if (rec.status === 'pass') { tested++; passed++; }
      else if (rec.status === 'fail') { tested++; failed++; }
    }
    return { tested, passed, failed, total: TOTAL_CRITERIA_COUNT };
  }, [records]);

  if (!isOpen) return null;

  // -- Render helpers --

  const renderStatusCircle = (id, size = 24) => {
    const rec = getRecord(id);
    return (
      <button
        onClick={(e) => { e.stopPropagation(); cycleStatus(id); }}
        title={`Status: ${rec.status} (click to cycle)`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          borderRadius: '50%',
          border: `2px solid ${STATUS_COLORS[rec.status]}`,
          background: rec.status === 'untested' ? 'transparent' : STATUS_COLORS[rec.status],
          color: rec.status === 'untested' ? STATUS_COLORS.untested : '#fff',
          fontSize: size * 0.55,
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
          touchAction: 'manipulation',
          flexShrink: 0,
        }}
      >
        {STATUS_ICONS[rec.status]}
      </button>
    );
  };

  const renderSidebar = () => (
    <div style={{
      width: isMobile ? '100%' : '200px',
      minWidth: isMobile ? undefined : '200px',
      background: '#1a202c',
      borderRight: isMobile ? 'none' : '2px solid #4a5568',
      overflowY: 'auto',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {TEST_PHASES.map((phase) => {
        // Count pass/fail per phase
        const allInPhase = phase.categories.flatMap((c) => c.criteria);
        const passCount = allInPhase.filter((cr) => getRecord(cr.id).status === 'pass').length;
        const failCount = allInPhase.filter((cr) => getRecord(cr.id).status === 'fail').length;

        return (
          <div key={phase.id} style={{ marginBottom: '12px' }}>
            <div style={{
              color: '#ff922b',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              marginBottom: '6px',
              padding: '0 4px',
            }}>
              {phase.name}
              <span style={{ color: '#a0aec0', fontWeight: 'normal', fontSize: '0.75rem', marginLeft: '6px' }}>
                {passCount}/{allInPhase.length}
                {failCount > 0 && <span style={{ color: '#ff6b6b' }}> ({failCount} fail)</span>}
              </span>
            </div>
            {phase.categories.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              const catPass = cat.criteria.filter((cr) => getRecord(cr.id).status === 'pass').length;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedCriterion(null);
                    if (isMobile) setMobileView('list');
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: isMobile ? '12px 10px' : '8px 10px',
                    marginBottom: '2px',
                    background: isSelected ? '#2d3748' : 'transparent',
                    border: isSelected ? '1px solid #4a5568' : '1px solid transparent',
                    borderRadius: '6px',
                    color: isSelected ? '#fff' : '#cbd5e0',
                    fontSize: isMobile ? '0.95rem' : '0.85rem',
                    cursor: 'pointer',
                    minHeight: isMobile ? '44px' : 'auto',
                    touchAction: 'manipulation',
                  }}
                >
                  {cat.name}
                  <span style={{ color: '#a0aec0', fontSize: '0.75rem', marginLeft: '6px' }}>
                    {catPass}/{cat.criteria.length}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}

      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #4a5568' }}>
        <button onClick={handleExport} style={actionBtnStyle}>Export JSON</button>
        <button onClick={handleImport} style={{ ...actionBtnStyle, marginTop: '6px' }}>Import JSON</button>
      </div>
    </div>
  );

  const renderCriteriaList = () => {
    if (!selectedCategory) {
      return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
          Select a category from the sidebar
        </div>
      );
    }

    return (
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '12px' : '16px',
        background: '#2d3748',
      }}>
        {isMobile && (
          <button
            onClick={() => { setMobileView('sidebar'); setSelectedCategory(null); }}
            style={{ ...backBtnStyle, marginBottom: '10px' }}
          >
            &larr; Categories
          </button>
        )}
        <h3 style={{ color: '#fff', margin: '0 0 12px', fontSize: '1rem' }}>
          {selectedCategory.name}
        </h3>
        {selectedCategory.criteria.map((cr) => {
          const rec = getRecord(cr.id);
          const isSelected = selectedCriterion?.id === cr.id;
          return (
            <div
              key={cr.id}
              onClick={() => {
                setSelectedCriterion(cr);
                if (isMobile) setMobileView('detail');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: isMobile ? '12px 10px' : '10px 12px',
                marginBottom: '4px',
                borderRadius: '6px',
                background: isSelected ? '#1a202c' : 'transparent',
                border: isSelected ? '1px solid #4a5568' : '1px solid transparent',
                cursor: 'pointer',
                minHeight: isMobile ? '48px' : 'auto',
                touchAction: 'manipulation',
              }}
            >
              {renderStatusCircle(cr.id, isMobile ? 28 : 24)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: rec.status === 'pass' ? '#51cf66' : rec.status === 'fail' ? '#ff6b6b' : '#fff',
                  fontSize: isMobile ? '0.95rem' : '0.9rem',
                  fontWeight: isSelected ? 'bold' : 'normal',
                }}>
                  {cr.label}
                </div>
                <div style={{
                  color: '#a0aec0',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {cr.description}
                </div>
              </div>
              {autoDetectedIds.has(cr.id) && (
                <span style={{
                  color: '#20c997',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  background: '#20c99720',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  flexShrink: 0,
                  letterSpacing: '0.5px',
                }}>AUTO</span>
              )}
              {AUTO_CHECKS[cr.id] && !autoDetectedIds.has(cr.id) && (
                <span style={{
                  color: '#a0aec0',
                  fontSize: '0.65rem',
                  background: '#a0aec010',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  flexShrink: 0,
                }}>auto</span>
              )}
              {rec.notes && <span style={{ color: '#4dabf7', fontSize: '0.75rem', flexShrink: 0 }}>notes</span>}
              {rec.screenshot && <span style={{ color: '#ff922b', fontSize: '0.75rem', flexShrink: 0 }}>img</span>}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDetailPanel = () => {
    if (!selectedCriterion) {
      return (
        <div style={{
          width: isMobile ? '100%' : '350px',
          minWidth: isMobile ? undefined : '350px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a0aec0',
          background: '#1a202c',
          borderLeft: isMobile ? 'none' : '2px solid #4a5568',
          padding: '20px',
        }}>
          Select a criterion to view details
        </div>
      );
    }

    const cr = selectedCriterion;
    const rec = getRecord(cr.id);
    const thumbUrl = thumbnailUrls[cr.id];

    return (
      <div style={{
        width: isMobile ? '100%' : '350px',
        minWidth: isMobile ? undefined : '350px',
        background: '#1a202c',
        borderLeft: isMobile ? 'none' : '2px solid #4a5568',
        overflowY: 'auto',
        padding: isMobile ? '15px' : '20px',
      }}>
        {isMobile && (
          <button
            onClick={() => { setMobileView('list'); setSelectedCriterion(null); }}
            style={{ ...backBtnStyle, marginBottom: '12px' }}
          >
            &larr; Criteria List
          </button>
        )}

        <h3 style={{ color: '#fff', margin: '0 0 4px', fontSize: '1.1rem' }}>
          {cr.label}
          {autoDetectedIds.has(cr.id) && (
            <span style={{
              color: '#20c997',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              background: '#20c99720',
              padding: '2px 6px',
              borderRadius: '4px',
              marginLeft: '8px',
              verticalAlign: 'middle',
            }}>AUTO-DETECTED</span>
          )}
        </h3>
        <p style={{ color: '#a0aec0', margin: '0 0 4px', fontSize: '0.85rem' }}>{cr.description}</p>
        {AUTO_CHECKS[cr.id] && (
          <p style={{ color: '#4dabf7', margin: '0 0 16px', fontSize: '0.75rem', fontStyle: 'italic' }}>
            {autoDetectedIds.has(cr.id) ? 'Condition detected from live game state' : 'Monitoring game state for auto-detection...'}
          </p>
        )}
        {!AUTO_CHECKS[cr.id] && <div style={{ marginBottom: '16px' }} />}

        {/* Status buttons */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: '#a0aec0', fontSize: '0.8rem', marginBottom: '6px' }}>Status</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {STATUS_CYCLE.map((st) => (
              <button
                key={st}
                onClick={() => updateRecord(cr.id, { status: st })}
                style={{
                  flex: 1,
                  padding: isMobile ? '10px 6px' : '8px 6px',
                  borderRadius: '6px',
                  border: rec.status === st ? `2px solid ${STATUS_COLORS[st]}` : '2px solid #4a5568',
                  background: rec.status === st ? STATUS_COLORS[st] + '30' : 'transparent',
                  color: rec.status === st ? STATUS_COLORS[st] : '#a0aec0',
                  fontWeight: rec.status === st ? 'bold' : 'normal',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  minHeight: isMobile ? '44px' : 'auto',
                  touchAction: 'manipulation',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: '#a0aec0', fontSize: '0.8rem', marginBottom: '6px' }}>Notes</div>
          <textarea
            value={rec.notes || ''}
            onChange={(e) => handleNotesChange(cr.id, e.target.value)}
            placeholder="Type testing notes here..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #4a5568',
              background: '#2d3748',
              color: '#fff',
              fontSize: '0.9rem',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Screenshot */}
        <div>
          <div style={{ color: '#a0aec0', fontSize: '0.8rem', marginBottom: '6px' }}>Screenshot</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button
              onClick={() => captureScreenshot(cr.id)}
              style={{
                flex: 1,
                padding: isMobile ? '10px' : '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ff922b',
                background: 'transparent',
                color: '#ff922b',
                fontSize: '0.85rem',
                cursor: 'pointer',
                minHeight: isMobile ? '44px' : 'auto',
                touchAction: 'manipulation',
              }}
            >
              Capture Screenshot
            </button>
            {rec.screenshot && (
              <button
                onClick={() => removeScreenshot(cr.id)}
                style={{
                  padding: isMobile ? '10px' : '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #ff6b6b',
                  background: 'transparent',
                  color: '#ff6b6b',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  minHeight: isMobile ? '44px' : 'auto',
                  touchAction: 'manipulation',
                }}
              >
                Remove
              </button>
            )}
          </div>
          {thumbUrl && (
            <div style={{
              border: '1px solid #4a5568',
              borderRadius: '6px',
              overflow: 'hidden',
            }}>
              <img
                src={thumbUrl}
                alt="Screenshot"
                style={{ width: '100%', display: 'block' }}
              />
              {rec.screenshotTimestamp && (
                <div style={{ padding: '4px 8px', color: '#a0aec0', fontSize: '0.7rem', background: '#2d3748' }}>
                  {new Date(rec.screenshotTimestamp).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Progress bar fraction
  const progressFraction = stats.total > 0 ? stats.tested / stats.total : 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 2500,
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '0' : '20px',
      }}
      onClick={(e) => {
        if (!isMobile && e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: isMobile ? '0' : '16px',
        maxWidth: isMobile ? '100%' : '1200px',
        width: '100%',
        maxHeight: isMobile ? '100%' : '90vh',
        height: isMobile ? '100%' : '85vh',
        overflow: 'hidden',
        border: isMobile ? 'none' : '2px solid #4a5568',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '12px 16px' : '14px 24px',
          borderBottom: '2px solid #4a5568',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'linear-gradient(90deg, #2d3748, #1a202c)',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, color: '#ff922b', fontSize: isMobile ? '1.1rem' : '1.3rem', whiteSpace: 'nowrap' }}>
            Test Tracker
          </h2>

          {/* Progress bar */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div style={{
              flex: 1,
              height: '8px',
              background: '#1a202c',
              borderRadius: '4px',
              overflow: 'hidden',
              minWidth: '60px',
            }}>
              <div style={{
                height: '100%',
                width: `${progressFraction * 100}%`,
                background: stats.failed > 0
                  ? 'linear-gradient(90deg, #51cf66, #ff922b)'
                  : 'linear-gradient(90deg, #51cf66, #37b24d)',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{
              color: '#a0aec0',
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
            }}>
              <span style={{ color: '#51cf66' }}>{stats.passed}</span>
              {stats.failed > 0 && (
                <span> / <span style={{ color: '#ff6b6b' }}>{stats.failed}</span></span>
              )}
              {' '}/ {stats.total}
            </span>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '1.3rem',
              lineHeight: 1,
              minWidth: '36px',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
            }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Desktop: show all 3 columns */}
          {!isMobile && (
            <>
              {renderSidebar()}
              {renderCriteriaList()}
              {renderDetailPanel()}
            </>
          )}

          {/* Mobile: drill-down views */}
          {isMobile && mobileView === 'sidebar' && renderSidebar()}
          {isMobile && mobileView === 'list' && renderCriteriaList()}
          {isMobile && mobileView === 'detail' && renderDetailPanel()}
        </div>
      </div>
    </div>
  );
};

// Shared button styles
const actionBtnStyle = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #4a5568',
  background: 'transparent',
  color: '#cbd5e0',
  fontSize: '0.8rem',
  cursor: 'pointer',
  textAlign: 'center',
  touchAction: 'manipulation',
};

const backBtnStyle = {
  background: 'transparent',
  border: '1px solid #4a5568',
  borderRadius: '6px',
  color: '#cbd5e0',
  padding: '8px 12px',
  fontSize: '0.85rem',
  cursor: 'pointer',
  touchAction: 'manipulation',
};

export default TestTracker;
