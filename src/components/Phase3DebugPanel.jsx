import React, { useState, useEffect } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Phase3DebugPanel Component
 * Debug panel showing statistics and controls for all Phase 3 systems
 *
 * Phase 3 Integration: Debug Panel
 */
const Phase3DebugPanel = ({ terrainSystem }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    props: true,
    water: false,
    weather: false,
    season: false,
    microBiomes: false,
    structures: false,
    seasonalEvents: false,
    structureExploration: false,
  });

  // Update stats every second
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

      // Seasonal Event Stats (Phase 3 Gameplay)
      const eventSystem = terrainSystem.getSeasonalEventSystem?.();
      if (eventSystem) {
        newStats.seasonalEvents = eventSystem.getStats?.() || {};
        newStats.activeEvents = eventSystem.getActiveEvents?.() || [];
      }

      // Structure Interaction Stats (Phase 3 Gameplay)
      const interactionSystem = terrainSystem.getStructureInteractionSystem?.();
      if (interactionSystem) {
        newStats.structureExploration = interactionSystem.getStats?.() || {};
      }

      setStats(newStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [terrainSystem, isOpen]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
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
          right: '20px',
          width: '50px',
          height: '50px',
          background: 'rgba(139, 69, 19, 0.9)',
          border: '2px solid #FFD700',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        }}
        title="Phase 3 Debug Panel"
      >
        <Bug size={24} color="#FFD700" />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '350px',
        maxHeight: '80vh',
        background: 'rgba(26, 26, 46, 0.98)',
        border: '2px solid #FFD700',
        borderRadius: '12px',
        zIndex: 1500,
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
          <Bug size={20} color="#FFD700" />
          <span style={{ color: '#FFD700', fontSize: '1rem', fontWeight: 'bold' }}>
            Phase 3 Debug
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
        {/* Props Section (Phase 3A) */}
        <DebugSection
          title="Props & Harvesting (3A)"
          isExpanded={expandedSections.props}
          onToggle={() => toggleSection('props')}
        >
          {stats.props && (
            <div style={statsContainerStyle}>
              <StatRow label="Total Props" value={stats.props.totalProps || 0} />
              <StatRow label="Props Generated" value={stats.props.propsGenerated || 0} />
              <StatRow label="Loaded Chunks" value={stats.props.loadedChunks || 0} />
            </div>
          )}
          {stats.harvesting && (
            <div style={{ ...statsContainerStyle, marginTop: '8px' }}>
              <StatRow label="Props Harvested" value={stats.harvesting.propsHarvested || 0} color="#51cf66" />
              <StatRow label="Resources Gathered" value={stats.harvesting.resourcesGathered || 0} color="#51cf66" />
              <StatRow label="Active Harvests" value={stats.harvesting.activeHarvests || 0} color="#4dabf7" />
              <StatRow label="Avg Harvest Time" value={`${Math.round(stats.harvesting.avgHarvestTime || 0)}ms`} />
            </div>
          )}
        </DebugSection>

        {/* Water Section (Phase 3B) */}
        <DebugSection
          title="Water Systems (3B)"
          isExpanded={expandedSections.water}
          onToggle={() => toggleSection('water')}
        >
          {stats.waterBodies && (
            <div style={statsContainerStyle}>
              <div style={{ fontWeight: 'bold', color: '#4FC3F7', marginBottom: '6px' }}>Water Bodies:</div>
              <StatRow label="Total" value={stats.waterBodies.totalWaterBodies || 0} />
              <StatRow label="Generated" value={stats.waterBodies.waterBodiesGenerated || 0} />
              <StatRow label="Lakes" value={stats.waterBodies.byType?.lake || 0} />
              <StatRow label="Ponds" value={stats.waterBodies.byType?.pond || 0} />
              <StatRow label="Hot Springs" value={stats.waterBodies.byType?.hot_spring || 0} />
            </div>
          )}
          {stats.rivers && (
            <div style={{ ...statsContainerStyle, marginTop: '8px' }}>
              <div style={{ fontWeight: 'bold', color: '#5FA8D3', marginBottom: '6px' }}>Rivers:</div>
              <StatRow label="Total Rivers" value={stats.rivers.totalRivers || 0} />
              <StatRow label="Generated" value={stats.rivers.riversGenerated || 0} />
              <StatRow label="Avg Length" value={`${Math.round(stats.rivers.averageLength || 0)} tiles`} />
            </div>
          )}
        </DebugSection>

        {/* Weather Section (Phase 3C) */}
        <DebugSection
          title="Weather System (3C)"
          isExpanded={expandedSections.weather}
          onToggle={() => toggleSection('weather')}
        >
          {stats.weather && (
            <div style={statsContainerStyle}>
              <StatRow
                label="Current Weather"
                value={stats.currentWeather?.replace(/_/g, ' ') || 'N/A'}
                color="#4dabf7"
              />
              <StatRow label="Total Changes" value={stats.weather.totalWeatherChanges || 0} />
              <StatRow label="Lightning Strikes" value={stats.weather.lightningStrikes || 0} color="#FFD700" />
              <StatRow label="Particles Active" value={stats.weather.particlesActive || 0} />
              <StatRow label="Clear Days" value={stats.weather.weatherOccurrences?.clear || 0} />
              <StatRow label="Rainy Days" value={stats.weather.weatherOccurrences?.rain || 0} />
              <StatRow label="Storms" value={stats.weather.weatherOccurrences?.storm || 0} />
            </div>
          )}
        </DebugSection>

        {/* Season Section (Phase 3C) */}
        <DebugSection
          title="Seasonal System (3C)"
          isExpanded={expandedSections.season}
          onToggle={() => toggleSection('season')}
        >
          {stats.season && (
            <div style={statsContainerStyle}>
              <StatRow
                label="Current Season"
                value={stats.season.current?.charAt(0).toUpperCase() + stats.season.current?.slice(1) || 'N/A'}
                color="#FFB6C1"
              />
              <StatRow label="Day in Season" value={`${stats.season.day} / 90`} />
              <StatRow label="Progress" value={`${Math.round((stats.season.progress || 0) * 100)}%`} />

              {/* Season progress bar */}
              <div style={{ marginTop: '8px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(stats.season.progress || 0) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #FFB6C1, #FF69B4)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}
        </DebugSection>

        {/* Micro-Biomes Section (Phase 3C) */}
        <DebugSection
          title="Micro-Biomes (3C)"
          isExpanded={expandedSections.microBiomes}
          onToggle={() => toggleSection('microBiomes')}
        >
          {stats.microBiomes && (
            <div style={statsContainerStyle}>
              <StatRow label="Total" value={stats.microBiomes.totalMicroBiomes || 0} />
              <StatRow label="Generated" value={stats.microBiomes.microBiomesGenerated || 0} />
              <StatRow label="Oases" value={stats.microBiomes.byType?.oasis || 0} />
              <StatRow label="Clearings" value={stats.microBiomes.byType?.clearing || 0} />
              <StatRow label="Groves" value={stats.microBiomes.byType?.grove || 0} />
              <StatRow label="Meadows" value={stats.microBiomes.byType?.meadow || 0} />
            </div>
          )}
        </DebugSection>

        {/* Structures Section (Phase 3D) */}
        <DebugSection
          title="Structures (3D)"
          isExpanded={expandedSections.structures}
          onToggle={() => toggleSection('structures')}
        >
          {stats.structures && (
            <div style={statsContainerStyle}>
              <StatRow label="Total" value={stats.structures.totalStructures || 0} />
              <StatRow label="Generated" value={stats.structures.structuresGenerated || 0} />
              <StatRow label="Villages" value={stats.structures.byType?.village || 0} />
              <StatRow label="Temples" value={stats.structures.byType?.temple || 0} />
              <StatRow label="Ruins" value={stats.structures.byType?.ruins || 0} />
              <StatRow label="Towers" value={stats.structures.byType?.tower || 0} />
            </div>
          )}
        </DebugSection>

        {/* Seasonal Events Section (Gameplay) */}
        <DebugSection
          title="Seasonal Events (Gameplay)"
          isExpanded={expandedSections.seasonalEvents}
          onToggle={() => toggleSection('seasonalEvents')}
        >
          {stats.seasonalEvents && (
            <div style={statsContainerStyle}>
              <StatRow label="Active Events" value={stats.activeEventsCount || stats.activeEvents?.length || 0} />
              <StatRow label="Total Triggered" value={stats.seasonalEvents.totalEventsTriggered || 0} />
              <StatRow label="Completed" value={stats.seasonalEvents.totalEventsCompleted || 0} />
              {stats.activeEvents && stats.activeEvents.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '0.75rem' }}>
                  <div style={{ color: '#4FC3F7', fontWeight: 'bold', marginBottom: '4px' }}>Active:</div>
                  {stats.activeEvents.map((event, idx) => (
                    <div key={idx} style={{ color: '#cbd5e0', marginLeft: '8px' }}>
                      • {event.id.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DebugSection>

        {/* Structure Exploration Section (Gameplay) */}
        <DebugSection
          title="Structure Exploration (Gameplay)"
          isExpanded={expandedSections.structureExploration}
          onToggle={() => toggleSection('structureExploration')}
        >
          {stats.structureExploration && (
            <div style={statsContainerStyle}>
              <StatRow label="Discovered" value={stats.structureExploration.structuresDiscovered || 0} />
              <StatRow label="Explored" value={stats.structureExploration.structuresExplored || 0} />
              <StatRow label="Total Chests" value={stats.structureExploration.totalChests || 0} />
              <StatRow label="Opened Chests" value={stats.structureExploration.chestsOpened || 0} />
              <StatRow label="Remaining" value={stats.structureExploration.chestsRemaining || 0} />
            </div>
          )}
        </DebugSection>
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
        Phase 3 Complete Integration • All Systems Active
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
      <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px' }}>
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

export default Phase3DebugPanel;
