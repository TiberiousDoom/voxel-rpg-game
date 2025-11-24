import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import WeatherSeasonIndicator from './WeatherSeasonIndicator.jsx';

/**
 * UnifiedDebugMenu Component
 * Combines all debug/info overlays into a single collapsible menu:
 * - Performance overlay
 * - Render Status
 * - Phase 3 Debug (Props, Water, Weather, Seasons, Structures)
 * - Weather/Season indicator
 */
const UnifiedDebugMenu = ({
  terrainSystem,
  debugInfo,
  perfMetrics,
  canvasRef,
  getOffset,
  enablePlayerMovement,
  showPerformanceMonitor = true,
  debugMode = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    performance: true,
    render: false,
    phase3: false,
    weather: false,
  });
  const [phase3Stats, setPhase3Stats] = useState({});

  // Update Phase 3 stats every second
  useEffect(() => {
    if (!terrainSystem || !isOpen) return;

    const updateStats = () => {
      const newStats = {};

      // Prop Harvesting Stats (Phase 3A)
      const propManager = terrainSystem.getPropManager?.();
      if (propManager) {
        newStats.props = propManager.getStats?.() || {};
      }

      const harvestingSystem = terrainSystem.getHarvestingSystem?.();
      if (harvestingSystem) {
        newStats.harvesting = harvestingSystem.getStats?.() || {};
      }

      // Water System Stats (Phase 3B)
      const waterBodySystem = terrainSystem.getWaterBodySystem?.();
      if (waterBodySystem) {
        newStats.waterBodies = waterBodySystem.getStats?.() || {};
      }

      const riverSystem = terrainSystem.getRiverSystem?.();
      if (riverSystem) {
        newStats.rivers = riverSystem.getStats?.() || {};
      }

      // Weather System Stats (Phase 3C)
      const weatherSystem = terrainSystem.getWeatherSystem?.();
      if (weatherSystem) {
        newStats.weather = weatherSystem.getStats?.() || {};
        newStats.currentWeather = weatherSystem.getCurrentWeather?.() || 'unknown';
      }

      // Seasonal System Stats (Phase 3C)
      const seasonalSystem = terrainSystem.getSeasonalSystem?.();
      if (seasonalSystem) {
        newStats.season = {
          current: seasonalSystem.getCurrentSeason?.() || 'unknown',
          day: seasonalSystem.getCurrentDay?.() || 0,
          progress: seasonalSystem.getSeasonProgress?.() || 0,
        };
      }

      // Micro-Biome Stats (Phase 3C)
      const microBiomeSystem = terrainSystem.getMicroBiomeSystem?.();
      if (microBiomeSystem) {
        newStats.microBiomes = microBiomeSystem.getStats?.() || {};
      }

      // Structure Stats (Phase 3D)
      const structureSystem = terrainSystem.getStructureSystem?.();
      if (structureSystem) {
        newStats.structures = structureSystem.getStats?.() || {};
      }

      setPhase3Stats(newStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [terrainSystem, isOpen]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          width: '50px',
          height: '50px',
          background: 'rgba(26, 26, 46, 0.9)',
          border: '2px solid #4dabf7',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        }}
        title="Debug & Info Menu"
      >
        <Settings size={24} color="#4dabf7" />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        width: '400px',
        maxHeight: '85vh',
        background: 'rgba(26, 26, 46, 0.98)',
        border: '2px solid #4dabf7',
        borderRadius: '12px',
        zIndex: 10000,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '15px',
          borderBottom: '2px solid #4a5568',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #2d3748, #1a202c)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={20} color="#4dabf7" />
          <span style={{ color: '#4dabf7', fontSize: '1rem', fontWeight: 'bold' }}>
            Debug & Developer Tools
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '1.4rem',
            padding: '0 8px',
            lineHeight: '1',
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {/* Performance Section */}
        {showPerformanceMonitor && (
          <DebugSection
            title="⚡ Performance"
            isExpanded={expandedSections.performance}
            onToggle={() => toggleSection('performance')}
          >
            <div style={statsContainerStyle}>
              <StatRow
                label="FPS"
                value={perfMetrics.fps || 0}
                color={
                  perfMetrics.fps < 30
                    ? '#ff4444'
                    : perfMetrics.fps < 45
                    ? '#ffaa00'
                    : '#00ff00'
                }
              />
              <StatRow
                label="Frame Time"
                value={`${perfMetrics.frameTime || 0}ms`}
                color={
                  perfMetrics.frameTime > 33
                    ? '#ff4444'
                    : perfMetrics.frameTime > 22
                    ? '#ffaa00'
                    : '#00ff00'
                }
              />
              <StatRow
                label="Target FPS"
                value={perfMetrics.isMobile ? '45' : '60'}
              />
              <div
                style={{
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(77, 171, 247, 0.3)',
                }}
              >
                <StatRow
                  label="Buildings"
                  value={`${perfMetrics.visibleBuildings}/${perfMetrics.totalBuildings}`}
                />
                <StatRow
                  label="NPCs"
                  value={`${perfMetrics.visibleNPCs}/${perfMetrics.totalNPCs}`}
                />
              </div>
              <div
                style={{
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(77, 171, 247, 0.3)',
                }}
              >
                <StatRow
                  label="Canvas Size"
                  value={`${perfMetrics.canvasWidth}x${perfMetrics.canvasHeight}`}
                />
                <StatRow
                  label="Device"
                  value={perfMetrics.isMobile ? 'Mobile' : 'Desktop'}
                />
              </div>
            </div>
          </DebugSection>
        )}

        {/* Render Status Section */}
        {debugMode && (
          <DebugSection
            title="🔍 Render Status"
            isExpanded={expandedSections.render}
            onToggle={() => toggleSection('render')}
          >
            <div style={statsContainerStyle}>
              <StatRow
                label="Canvas"
                value={debugInfo.canvasReady ? '✓ Ready' : '✗ Not Ready'}
                color={debugInfo.canvasReady ? '#00ff00' : '#ff4444'}
              />
              <StatRow
                label="Context"
                value={debugInfo.contextReady ? '✓ Ready' : '✗ Not Ready'}
                color={debugInfo.contextReady ? '#00ff00' : '#ff4444'}
              />
              <StatRow
                label="Camera"
                value={debugInfo.cameraReady ? '✓ Ready' : '✗ Not Ready'}
                color={debugInfo.cameraReady ? '#00ff00' : '#ff4444'}
              />
              <StatRow
                label="Player"
                value={debugInfo.playerReady ? '✓ Ready' : '✗ Not Ready'}
                color={debugInfo.playerReady ? '#00ff00' : '#ff4444'}
              />
              <StatRow
                label="Renders"
                value={debugInfo.renderCount}
              />
              {canvasRef?.current && (
                <>
                  <StatRow
                    label="Element Size"
                    value={`${canvasRef.current.width}x${canvasRef.current.height}`}
                  />
                  <StatRow
                    label="Display Size"
                    value={`${canvasRef.current.offsetWidth}x${canvasRef.current.offsetHeight}px`}
                  />
                </>
              )}
              <StatRow
                label="Window"
                value={`${window.innerWidth}x${window.innerHeight}`}
              />
              <StatRow label="DPR" value={window.devicePixelRatio || 1} />
              <StatRow
                label="Camera Offset"
                value={getOffset ? JSON.stringify(getOffset()) : 'null'}
              />
              {debugInfo.lastError && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px',
                    background: 'rgba(255, 68, 68, 0.2)',
                    borderRadius: '4px',
                    color: '#ffff00',
                    fontSize: '0.75rem',
                  }}
                >
                  ⚠️ {debugInfo.lastError}
                </div>
              )}
            </div>
          </DebugSection>
        )}

        {/* Weather & Season Section */}
        {enablePlayerMovement && terrainSystem && (
          <DebugSection
            title="🌤️ Weather & Seasons"
            isExpanded={expandedSections.weather}
            onToggle={() => toggleSection('weather')}
          >
            <WeatherSeasonIndicator terrainSystem={terrainSystem} embedded />
            {phase3Stats.weather && (
              <div style={{ ...statsContainerStyle, marginTop: '12px' }}>
                <div
                  style={{
                    fontWeight: 'bold',
                    color: '#4dabf7',
                    marginBottom: '6px',
                  }}
                >
                  Weather Statistics:
                </div>
                <StatRow
                  label="Current Weather"
                  value={
                    phase3Stats.currentWeather?.replace(/_/g, ' ') || 'N/A'
                  }
                  color="#4dabf7"
                />
                <StatRow
                  label="Weather Changes"
                  value={phase3Stats.weather.totalWeatherChanges || 0}
                />
                <StatRow
                  label="Lightning Strikes"
                  value={phase3Stats.weather.lightningStrikes || 0}
                  color="#FFD700"
                />
                <StatRow
                  label="Clear Days"
                  value={phase3Stats.weather.weatherOccurrences?.clear || 0}
                />
                <StatRow
                  label="Rainy Days"
                  value={phase3Stats.weather.weatherOccurrences?.rain || 0}
                />
                <StatRow
                  label="Storms"
                  value={phase3Stats.weather.weatherOccurrences?.storm || 0}
                />
              </div>
            )}
            {phase3Stats.season && (
              <div style={{ ...statsContainerStyle, marginTop: '12px' }}>
                <div
                  style={{
                    fontWeight: 'bold',
                    color: '#FFB6C1',
                    marginBottom: '6px',
                  }}
                >
                  Seasonal Info:
                </div>
                <StatRow
                  label="Season"
                  value={
                    phase3Stats.season.current?.charAt(0).toUpperCase() +
                      phase3Stats.season.current?.slice(1) || 'N/A'
                  }
                  color="#FFB6C1"
                />
                <StatRow
                  label="Day"
                  value={`${phase3Stats.season.day} / 90`}
                />
                <StatRow
                  label="Progress"
                  value={`${Math.round((phase3Stats.season.progress || 0) * 100)}%`}
                />
                {/* Progress bar */}
                <div
                  style={{
                    marginTop: '8px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '4px',
                    height: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(phase3Stats.season.progress || 0) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #FFB6C1, #FF69B4)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            )}
          </DebugSection>
        )}

        {/* Phase 3 Systems Section */}
        {enablePlayerMovement && terrainSystem && (
          <DebugSection
            title="🌍 World Systems (Phase 3)"
            isExpanded={expandedSections.phase3}
            onToggle={() => toggleSection('phase3')}
          >
            {/* Props & Harvesting */}
            {phase3Stats.props && (
              <div style={statsContainerStyle}>
                <div
                  style={{
                    fontWeight: 'bold',
                    color: '#51cf66',
                    marginBottom: '6px',
                  }}
                >
                  Props & Harvesting (3A):
                </div>
                <StatRow
                  label="Total Props"
                  value={phase3Stats.props.totalProps || 0}
                />
                <StatRow
                  label="Props Generated"
                  value={phase3Stats.props.propsGenerated || 0}
                />
                {phase3Stats.harvesting && (
                  <>
                    <StatRow
                      label="Props Harvested"
                      value={phase3Stats.harvesting.propsHarvested || 0}
                      color="#51cf66"
                    />
                    <StatRow
                      label="Resources Gathered"
                      value={phase3Stats.harvesting.resourcesGathered || 0}
                      color="#51cf66"
                    />
                  </>
                )}
              </div>
            )}

            {/* Water Systems */}
            {(phase3Stats.waterBodies || phase3Stats.rivers) && (
              <div style={{ ...statsContainerStyle, marginTop: '12px' }}>
                <div
                  style={{
                    fontWeight: 'bold',
                    color: '#4FC3F7',
                    marginBottom: '6px',
                  }}
                >
                  Water Systems (3B):
                </div>
                {phase3Stats.waterBodies && (
                  <>
                    <StatRow
                      label="Water Bodies"
                      value={phase3Stats.waterBodies.totalWaterBodies || 0}
                    />
                    <StatRow
                      label="Lakes"
                      value={phase3Stats.waterBodies.byType?.lake || 0}
                    />
                    <StatRow
                      label="Ponds"
                      value={phase3Stats.waterBodies.byType?.pond || 0}
                    />
                  </>
                )}
                {phase3Stats.rivers && (
                  <>
                    <StatRow
                      label="Rivers"
                      value={phase3Stats.rivers.totalRivers || 0}
                    />
                    <StatRow
                      label="Avg Length"
                      value={`${Math.round(phase3Stats.rivers.averageLength || 0)} tiles`}
                    />
                  </>
                )}
              </div>
            )}

            {/* Micro-Biomes */}
            {phase3Stats.microBiomes && (
              <div style={{ ...statsContainerStyle, marginTop: '12px' }}>
                <div
                  style={{
                    fontWeight: 'bold',
                    color: '#DAA520',
                    marginBottom: '6px',
                  }}
                >
                  Micro-Biomes (3C):
                </div>
                <StatRow
                  label="Total"
                  value={phase3Stats.microBiomes.totalMicroBiomes || 0}
                />
                <StatRow
                  label="Oases"
                  value={phase3Stats.microBiomes.byType?.oasis || 0}
                />
                <StatRow
                  label="Groves"
                  value={phase3Stats.microBiomes.byType?.grove || 0}
                />
              </div>
            )}

            {/* Structures */}
            {phase3Stats.structures && (
              <div style={{ ...statsContainerStyle, marginTop: '12px' }}>
                <div
                  style={{
                    fontWeight: 'bold',
                    color: '#FFD700',
                    marginBottom: '6px',
                  }}
                >
                  Structures (3D):
                </div>
                <StatRow
                  label="Total"
                  value={phase3Stats.structures.totalStructures || 0}
                />
                <StatRow
                  label="Villages"
                  value={phase3Stats.structures.byType?.village || 0}
                />
                <StatRow
                  label="Temples"
                  value={phase3Stats.structures.byType?.temple || 0}
                />
                <StatRow
                  label="Ruins"
                  value={phase3Stats.structures.byType?.ruins || 0}
                />
              </div>
            )}
          </DebugSection>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px',
          borderTop: '1px solid #4a5568',
          fontSize: '0.7rem',
          color: '#a0aec0',
          textAlign: 'center',
        }}
      >
        Developer Tools • All Systems Active
      </div>
    </div>
  );
};

/**
 * Collapsible debug section
 */
const DebugSection = ({ title, isExpanded, onToggle, children }) => (
  <div style={{ marginBottom: '12px' }}>
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        padding: '10px',
        background: 'rgba(77, 171, 247, 0.1)',
        border: '1px solid #4dabf7',
        borderRadius: '8px',
        color: '#4dabf7',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(77, 171, 247, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(77, 171, 247, 0.1)';
      }}
    >
      <span>{title}</span>
      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {isExpanded && (
      <div
        style={{
          marginTop: '8px',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '6px',
        }}
      >
        {children}
      </div>
    )}
  </div>
);

/**
 * Stat row component
 */
const StatRow = ({ label, value, color = '#cbd5e0' }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '4px 0',
      fontSize: '0.8rem',
      borderBottom: '1px solid rgba(74, 85, 104, 0.3)',
    }}
  >
    <span style={{ color: '#a0aec0' }}>{label}:</span>
    <span style={{ color, fontWeight: 'bold' }}>{value}</span>
  </div>
);

// Styles
const statsContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

export default UnifiedDebugMenu;
