/**
 * NPCIndicators.test.jsx - Unit tests for NPC indicator components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  HealthBar,
  StatusIcon,
  RoleBadge,
  MoraleIndicator,
  NPCIndicators
} from '../NPCIndicators.jsx';

describe('NPC Indicator Components', () => {
  describe('HealthBar', () => {
    test('should render health bar at 50% health', () => {
      const { container } = render(<HealthBar health={50} maxHealth={100} />);
      const healthBar = container.querySelector('.npc-health-bar');
      expect(healthBar).toBeInTheDocument();
    });

    test('should not render at full health', () => {
      const { container } = render(<HealthBar health={100} maxHealth={100} />);
      const healthBar = container.querySelector('.npc-health-bar');
      expect(healthBar).not.toBeInTheDocument();
    });

    test('should use correct color for low health', () => {
      const { container } = render(<HealthBar health={20} maxHealth={100} />);
      const fill = container.querySelector('.npc-health-bar-fill');
      expect(fill).toHaveStyle({ backgroundColor: '#F44336' }); // Red
    });

    test('should use correct color for medium health', () => {
      const { container } = render(<HealthBar health={50} maxHealth={100} />);
      const fill = container.querySelector('.npc-health-bar-fill');
      expect(fill).toHaveStyle({ backgroundColor: '#FF9800' }); // Orange
    });

    test('should use correct color for high health', () => {
      const { container } = render(<HealthBar health={80} maxHealth={100} />);
      const fill = container.querySelector('.npc-health-bar-fill');
      expect(fill).toHaveStyle({ backgroundColor: '#4CAF50' }); // Green
    });

    test('should set correct width based on health percentage', () => {
      const { container } = render(<HealthBar health={50} maxHealth={100} />);
      const fill = container.querySelector('.npc-health-bar-fill');
      expect(fill).toHaveStyle({ width: '50%' });
    });
  });

  describe('StatusIcon', () => {
    test('should show hungry icon for hungry NPC', () => {
      const npc = { hungry: true };
      const { container } = render(<StatusIcon npc={npc} />);
      expect(container.textContent).toContain('🍖');
    });

    test('should show resting icon for resting NPC', () => {
      const npc = { isResting: true };
      const { container } = render(<StatusIcon npc={npc} />);
      expect(container.textContent).toContain('😴');
    });

    test('should show working icon for working NPC', () => {
      const npc = { isWorking: true };
      const { container } = render(<StatusIcon npc={npc} />);
      expect(container.textContent).toContain('⚙️');
    });

    test('should show moving icon for moving NPC', () => {
      const npc = { isMoving: true };
      const { container } = render(<StatusIcon npc={npc} />);
      expect(container.textContent).toContain('🚶');
    });

    test('should show patrolling icon for patrolling NPC', () => {
      const npc = { status: 'PATROLLING' };
      const { container } = render(<StatusIcon npc={npc} />);
      expect(container.textContent).toContain('👁️');
    });

    test('should show idle icon for idle NPC', () => {
      const npc = { status: 'IDLE' };
      const { container } = render(<StatusIcon npc={npc} />);
      expect(container.textContent).toContain('💤');
    });

    test('should show dead icon for dead NPC', () => {
      const npc = { alive: false };
      const { container } = render(<StatusIcon npc={npc} />);
      expect(container.textContent).toContain('💀');
    });

    test('should not render for null NPC', () => {
      const { container } = render(<StatusIcon npc={null} />);
      expect(container.firstChild).toBeNull();
    });

    test('should prioritize critical states', () => {
      const npc = { alive: false, hungry: true, isWorking: true };
      const { container } = render(<StatusIcon npc={npc} />);
      // Should show dead icon, not hungry or working
      expect(container.textContent).toContain('💀');
    });
  });

  describe('RoleBadge', () => {
    test('should render role badge for FARMER', () => {
      const { container } = render(<RoleBadge role="FARMER" />);
      const badge = container.querySelector('.npc-role-badge');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toBe('F');
      expect(badge).toHaveStyle({ backgroundColor: '#4CAF50' });
    });

    test('should render role badge for CRAFTSMAN', () => {
      const { container } = render(<RoleBadge role="CRAFTSMAN" />);
      const badge = container.querySelector('.npc-role-badge');
      expect(badge.textContent).toBe('C');
      expect(badge).toHaveStyle({ backgroundColor: '#FF9800' });
    });

    test('should render role badge for GUARD', () => {
      const { container } = render(<RoleBadge role="GUARD" />);
      const badge = container.querySelector('.npc-role-badge');
      expect(badge.textContent).toBe('G');
      expect(badge).toHaveStyle({ backgroundColor: '#F44336' });
    });

    test('should use default color for unknown role', () => {
      const { container } = render(<RoleBadge role="UNKNOWN" />);
      const badge = container.querySelector('.npc-role-badge');
      expect(badge).toHaveStyle({ backgroundColor: '#9E9E9E' });
    });

    test('should not render for null role', () => {
      const { container } = render(<RoleBadge role={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('MoraleIndicator', () => {
    test('should show green for high morale', () => {
      const { container } = render(<MoraleIndicator morale={80} />);
      const indicator = container.querySelector('.npc-morale-indicator');
      expect(indicator).toHaveStyle({ backgroundColor: '#4CAF50' });
    });

    test('should show light green for good morale', () => {
      const { container } = render(<MoraleIndicator morale={60} />);
      const indicator = container.querySelector('.npc-morale-indicator');
      expect(indicator).toHaveStyle({ backgroundColor: '#8BC34A' });
    });

    test('should show orange for low morale', () => {
      const { container } = render(<MoraleIndicator morale={40} />);
      const indicator = container.querySelector('.npc-morale-indicator');
      expect(indicator).toHaveStyle({ backgroundColor: '#FF9800' });
    });

    test('should show red for very low morale', () => {
      const { container } = render(<MoraleIndicator morale={20} />);
      const indicator = container.querySelector('.npc-morale-indicator');
      expect(indicator).toHaveStyle({ backgroundColor: '#F44336' });
    });
  });

  describe('NPCIndicators', () => {
    const mockNPC = {
      id: 'npc1',
      name: 'Test NPC',
      role: 'FARMER',
      health: 75,
      maxHealth: 100,
      morale: 60,
      isWorking: true
    };

    test('should render all indicators by default', () => {
      const { container } = render(<NPCIndicators npc={mockNPC} />);

      expect(container.querySelector('.npc-health-bar')).toBeInTheDocument();
      expect(container.querySelector('.npc-status-icon')).toBeInTheDocument();
      expect(container.querySelector('.npc-role-badge')).toBeInTheDocument();
    });

    test('should hide health bar when showHealth is false', () => {
      const { container } = render(<NPCIndicators npc={mockNPC} showHealth={false} />);
      expect(container.querySelector('.npc-health-bar')).not.toBeInTheDocument();
    });

    test('should hide status icon when showStatus is false', () => {
      const { container } = render(<NPCIndicators npc={mockNPC} showStatus={false} />);
      expect(container.querySelector('.npc-status-icon')).not.toBeInTheDocument();
    });

    test('should hide role badge when showRole is false', () => {
      const { container } = render(<NPCIndicators npc={mockNPC} showRole={false} />);
      expect(container.querySelector('.npc-role-badge')).not.toBeInTheDocument();
    });

    test('should show morale when showMorale is true', () => {
      const { container } = render(<NPCIndicators npc={mockNPC} showMorale={true} />);
      expect(container.querySelector('.npc-morale-indicator')).toBeInTheDocument();
    });

    test('should use horizontal layout', () => {
      const { container } = render(<NPCIndicators npc={mockNPC} layout="horizontal" />);
      const indicators = container.querySelector('.npc-indicators');
      expect(indicators).toHaveStyle({ flexDirection: 'row' });
    });

    test('should use vertical layout by default', () => {
      const { container } = render(<NPCIndicators npc={mockNPC} />);
      const indicators = container.querySelector('.npc-indicators');
      expect(indicators).toHaveStyle({ flexDirection: 'column' });
    });

    test('should not render for null NPC', () => {
      const { container } = render(<NPCIndicators npc={null} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
