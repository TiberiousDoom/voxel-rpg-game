import React from 'react';
import { Cloud, CloudRain, CloudSnow, CloudFog, Sun, CloudDrizzle, Zap } from 'lucide-react';

/**
 * Weather icons mapping
 */
const WEATHER_ICONS = {
  clear: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  heavy_rain: CloudDrizzle,
  snow: CloudSnow,
  blizzard: CloudSnow,
  sandstorm: Cloud,
  fog: CloudFog,
  storm: Zap,
};

/**
 * Season colors and icons
 */
const SEASON_INFO = {
  spring: { icon: '🌸', color: '#FFB6C1', name: 'Spring' },
  summer: { icon: '☀️', color: '#FFD700', name: 'Summer' },
  autumn: { icon: '🍂', color: '#FF8C00', name: 'Autumn' },
  winter: { icon: '❄️', color: '#87CEEB', name: 'Winter' },
};

/**
 * WeatherSeasonIndicator Component
 * Displays current weather and season information
 *
 * Phase 3 Integration: Weather/Season Indicators
 */
const WeatherSeasonIndicator = ({ terrainSystem, embedded = false }) => {
  if (!terrainSystem) return null;

  // Get weather and season systems
  const weatherSystem = terrainSystem.getWeatherSystem?.();
  const seasonalSystem = terrainSystem.getSeasonalSystem?.();

  if (!weatherSystem || !seasonalSystem) return null;

  // Get current weather
  const currentWeather = weatherSystem.getCurrentWeather();
  const weatherEffects = weatherSystem.getWeatherEffects();
  const WeatherIcon = WEATHER_ICONS[currentWeather] || Cloud;

  // Get current season
  const currentSeason = seasonalSystem.getCurrentSeason();
  const seasonInfo = SEASON_INFO[currentSeason] || SEASON_INFO.spring;
  const seasonProgress = seasonalSystem.getSeasonProgress();
  const dayInSeason = seasonalSystem.getCurrentDay();

  const containerStyle = embedded
    ? {
        background: 'transparent',
        borderRadius: '8px',
        padding: '0',
      }
    : {
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(26, 26, 46, 0.95)',
        border: '2px solid #4dabf7',
        borderRadius: '12px',
        padding: '15px',
        zIndex: 1500,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)',
        minWidth: '220px',
      };

  return (
    <div style={containerStyle}>
      {/* Weather Section */}
      <div style={{ marginBottom: '15px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
          }}
        >
          <WeatherIcon size={24} color="#4dabf7" />
          <div style={{ flex: 1 }}>
            <div style={{ color: '#4dabf7', fontSize: '0.85rem', fontWeight: 'bold' }}>
              Weather
            </div>
            <div style={{ color: '#fff', fontSize: '1rem', textTransform: 'capitalize' }}>
              {currentWeather.replace(/_/g, ' ')}
            </div>
          </div>
        </div>

        {/* Weather effects indicators */}
        {weatherEffects && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            fontSize: '0.7rem',
            color: '#cbd5e0',
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>👁️</span>
              <span>Visibility: {Math.round(weatherEffects.visibilityModifier * 100)}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>💡</span>
              <span>Light: {Math.round(weatherEffects.lightingModifier * 100)}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🏃</span>
              <span>Speed: {Math.round(weatherEffects.movementSpeedModifier * 100)}%</span>
            </div>
            {weatherEffects.particles > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>❄️</span>
                <span>Intensity: {weatherEffects.particles}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, #4a5568, transparent)',
        margin: '10px 0',
      }} />

      {/* Season Section */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>{seasonInfo.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: seasonInfo.color, fontSize: '0.85rem', fontWeight: 'bold' }}>
              Season
            </div>
            <div style={{ color: '#fff', fontSize: '1rem' }}>
              {seasonInfo.name}
            </div>
          </div>
        </div>

        {/* Season progress bar */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '8px',
          marginTop: '8px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: '#cbd5e0',
            marginBottom: '6px',
          }}>
            <span>Day {dayInSeason} / 90</span>
            <span>{Math.round(seasonProgress * 100)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            <div
              style={{
                width: `${seasonProgress * 100}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${seasonInfo.color}, ${adjustBrightness(seasonInfo.color, -30)})`,
                transition: 'width 0.3s ease',
                borderRadius: '3px',
              }}
            />
          </div>
        </div>

        {/* Next season indicator */}
        <div style={{
          marginTop: '8px',
          fontSize: '0.7rem',
          color: '#a0aec0',
          textAlign: 'center',
        }}>
          {seasonProgress > 0.8 ? (
            <>
              Next: {getNextSeason(currentSeason)} in {90 - dayInSeason} days
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/**
 * Get next season
 */
function getNextSeason(currentSeason) {
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  const currentIndex = seasons.indexOf(currentSeason);
  const nextIndex = (currentIndex + 1) % seasons.length;
  return SEASON_INFO[seasons[nextIndex]].name;
}

/**
 * Adjust color brightness
 */
function adjustBrightness(hexColor, percent) {
  const num = parseInt(hexColor.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent));

  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export default WeatherSeasonIndicator;
