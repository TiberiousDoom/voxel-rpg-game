/**
 * ResourceItem.test.js - Unit tests for ResourceItem component
 *
 * Test scenarios:
 * - Component rendering
 * - Animation integration
 * - Trend display
 * - Tooltip visibility
 * - Status color coding
 * - Responsive behavior
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResourceItem from '../ResourceItem';

// Mock the animation hook
jest.mock('../../../hooks/useResourceAnimation', () => ({
  useResourceAnimation: jest.fn((value) => value),
  useResourceTrend: jest.fn(() => 0)
}));

describe('ResourceItem Component', () => {
  const defaultProps = {
    name: 'Food',
    icon: '🌾',
    amount: 500,
    capacity: 1000,
    color: '#f59e0b',
    production: 5,
    consumption: 2,
    showTrend: true,
    showTooltip: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply mock implementations after clearAllMocks wipes them
    const { useResourceAnimation, useResourceTrend } = require('../../../hooks/useResourceAnimation');
    useResourceAnimation.mockImplementation((value) => value);
    useResourceTrend.mockImplementation(() => 0);
  });

  describe('Basic Rendering', () => {
    it('should render with all basic elements', () => {
      const { container } = render(<ResourceItem {...defaultProps} />);

      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('🌾')).toBeInTheDocument();
      expect(container.querySelector('.resource-item-amount')).toHaveTextContent('500');
      expect(container.querySelector('.resource-item-capacity')).toHaveTextContent('/ 1K');
    });

    it('should render without crashing with minimal props', () => {
      render(<ResourceItem name="Gold" icon="⭐" />);

      expect(screen.getByText('Gold')).toBeInTheDocument();
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('should format large numbers correctly', () => {
      const { container } = render(
        <ResourceItem
          name="Wood"
          icon="🪵"
          amount={1500}
          capacity={10000}
        />
      );

      expect(container.querySelector('.resource-item-amount')).toHaveTextContent('1.5K');
      expect(container.querySelector('.resource-item-capacity')).toHaveTextContent('/ 10K');
    });

    it('should format millions correctly', () => {
      const { container } = render(
        <ResourceItem
          name="Stone"
          icon="🪨"
          amount={2500000}
          capacity={10000000}
        />
      );

      expect(container.querySelector('.resource-item-amount')).toHaveTextContent('2.5M');
      expect(container.querySelector('.resource-item-capacity')).toHaveTextContent('/ 10M');
    });
  });

  describe('Progress Bar', () => {
    it('should display correct percentage', () => {
      render(<ResourceItem {...defaultProps} />);

      // 500 / 1000 = 50%
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display correct color coding for high resources', () => {
      const { container } = render(
        <ResourceItem {...defaultProps} amount={800} />
      );

      const resourceItem = container.querySelector('.resource-item');
      expect(resourceItem).toHaveClass('resource-status-high');
    });

    it('should display correct color coding for medium resources', () => {
      const { container } = render(
        <ResourceItem {...defaultProps} amount={500} />
      );

      const resourceItem = container.querySelector('.resource-item');
      expect(resourceItem).toHaveClass('resource-status-medium');
    });

    it('should display correct color coding for low resources', () => {
      const { container } = render(
        <ResourceItem {...defaultProps} amount={200} />
      );

      const resourceItem = container.querySelector('.resource-item');
      expect(resourceItem).toHaveClass('resource-status-low');
    });

    it('should cap percentage at 100%', () => {
      render(
        <ResourceItem {...defaultProps} amount={1500} capacity={1000} />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Trend Indicator', () => {
    it('should show trend indicator when enabled', () => {
      const { useResourceTrend } = require('../../../hooks/useResourceAnimation');
      useResourceTrend.mockReturnValue(5);

      const { container } = render(
        <ResourceItem {...defaultProps} showTrend={true} />
      );

      expect(container.querySelector('.trend-indicator')).toBeInTheDocument();
    });

    it('should not show trend indicator when disabled', () => {
      const { container } = render(
        <ResourceItem {...defaultProps} showTrend={false} />
      );

      expect(container.querySelector('.trend-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('should not show tooltip initially', () => {
      const { container } = render(<ResourceItem {...defaultProps} />);

      expect(container.querySelector('.resource-tooltip')).not.toBeInTheDocument();
    });

    it('should show tooltip on hover when enabled', () => {
      const { container } = render(
        <ResourceItem {...defaultProps} showTooltip={true} />
      );

      const resourceItem = container.querySelector('.resource-item');
      fireEvent.mouseEnter(resourceItem);

      expect(container.querySelector('.resource-tooltip')).toBeInTheDocument();
    });

    it('should hide tooltip when mouse leaves', () => {
      const { container } = render(
        <ResourceItem {...defaultProps} showTooltip={true} />
      );

      const resourceItem = container.querySelector('.resource-item');
      fireEvent.mouseEnter(resourceItem);
      fireEvent.mouseLeave(resourceItem);

      expect(container.querySelector('.resource-tooltip')).not.toBeInTheDocument();
    });

    it('should not show tooltip when disabled', () => {
      const { container } = render(
        <ResourceItem {...defaultProps} showTooltip={false} />
      );

      const resourceItem = container.querySelector('.resource-item');
      fireEvent.mouseEnter(resourceItem);

      expect(container.querySelector('.resource-tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Animation Integration', () => {
    it('should use animated value from hook', () => {
      const { useResourceAnimation } = require('../../../hooks/useResourceAnimation');
      useResourceAnimation.mockReturnValue(450);

      const { container } = render(<ResourceItem {...defaultProps} amount={500} />);

      expect(container.querySelector('.resource-item-amount')).toHaveTextContent('450');
    });

    it('should pass correct animation options', () => {
      const { useResourceAnimation } = require('../../../hooks/useResourceAnimation');

      render(<ResourceItem {...defaultProps} />);

      expect(useResourceAnimation).toHaveBeenCalledWith(
        defaultProps.amount,
        expect.objectContaining({
          duration: 600,
          easing: 'easeOut'
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role', () => {
      const { container } = render(<ResourceItem {...defaultProps} />);

      const resourceItem = container.querySelector('.resource-item');
      expect(resourceItem).toHaveAttribute('role', 'status');
    });

    it('should have descriptive aria-label', () => {
      const { container } = render(<ResourceItem {...defaultProps} />);

      const resourceItem = container.querySelector('.resource-item');
      expect(resourceItem).toHaveAttribute(
        'aria-label',
        'Food: 500 out of 1000'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount', () => {
      const { container } = render(<ResourceItem {...defaultProps} amount={0} />);

      expect(container.querySelector('.resource-item-amount')).toHaveTextContent('0');
      expect(container.querySelector('.resource-item-percentage')).toHaveTextContent('0%');
    });

    it('should handle zero capacity', () => {
      render(<ResourceItem {...defaultProps} capacity={0} />);

      // Should not crash
      expect(screen.getByText('Food')).toBeInTheDocument();
    });

    it('should handle negative values gracefully', () => {
      render(<ResourceItem {...defaultProps} amount={-100} />);

      // Should still render
      expect(screen.getByText('Food')).toBeInTheDocument();
    });

    it('should handle missing optional props', () => {
      render(
        <ResourceItem
          name="Crystal"
          icon="💎"
          amount={100}
        />
      );

      expect(screen.getByText('Crystal')).toBeInTheDocument();
      expect(screen.getByText('💎')).toBeInTheDocument();
    });
  });
});
