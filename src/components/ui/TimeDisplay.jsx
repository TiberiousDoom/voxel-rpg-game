/**
 * TimeDisplay.jsx — Shows current time of day on the HUD
 *
 * Displays: "Day 3 - 14:30" with sun/moon icon
 * Position: top-right corner
 */

import React from 'react';
import useGameStore from '../../stores/useGameStore';

const containerStyle = {
  position: 'fixed',
  top: 12,
  right: 12,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  color: 'white',
  padding: '6px 12px',
  borderRadius: 6,
  fontFamily: 'monospace',
  fontSize: 14,
  pointerEvents: 'none',
  zIndex: 900,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  userSelect: 'none',
};

const iconStyle = {
  fontSize: 16,
  lineHeight: 1,
};

const TimeDisplay = () => {
  const dayNumber = useGameStore((s) => s.worldTime.dayNumber);
  const hour = useGameStore((s) => s.worldTime.hour);
  const minute = useGameStore((s) => s.worldTime.minute);
  const isNight = useGameStore((s) => s.worldTime.isNight);
  const period = useGameStore((s) => s.worldTime.period);

  const paddedHour = String(hour).padStart(2, '0');
  const paddedMinute = String(minute).padStart(2, '0');

  // Pick icon based on period
  let icon;
  if (period === 'night') icon = '\u263E'; // moon
  else if (period === 'dawn' || period === 'dusk') icon = '\u2600'; // sun with orange tint
  else icon = '\u2600'; // sun

  // Tint based on time
  let tint = 'white';
  if (period === 'dawn') tint = '#ffaa66';
  else if (period === 'dusk') tint = '#ff8844';
  else if (isNight) tint = '#8888cc';

  return (
    <div style={containerStyle}>
      <span style={{ ...iconStyle, color: tint }}>{icon}</span>
      <span>
        Day {dayNumber} - {paddedHour}:{paddedMinute}
      </span>
    </div>
  );
};

export default TimeDisplay;
