/**
 * TrendIndicator.test.js - Tests for TrendIndicator component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrendIndicator from '../TrendIndicator';

describe('TrendIndicator Component', () => {
  describe('Trend Direction', () => {
    it('should show up arrow for positive trend', () => {
      const { container } = render(<TrendIndicator trend={5} />);

      expect(container.querySelector('.trend-increasing')).toBeInTheDocument();
      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('should show down arrow for negative trend', () => {
      const { container } = render(<TrendIndicator trend={-5} />);

      expect(container.querySelector('.trend-decreasing')).toBeInTheDocument();
      expect(screen.getByText('↓')).toBeInTheDocument();
    });

    it('should show right arrow for stable trend', () => {
      const { container } = render(<TrendIndicator trend={0} />);

      expect(container.querySelector('.trend-stable')).toBeInTheDocument();
      expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('should treat small changes as stable', () => {
      const { container } = render(<TrendIndicator trend={0.05} />);

      expect(container.querySelector('.trend-stable')).toBeInTheDocument();
    });
  });

  describe('Value Display', () => {
    it('should show value when enabled', () => {
      render(<TrendIndicator trend={5.5} showValue={true} />);

      expect(screen.getByText(/\+5\.5\/s/)).toBeInTheDocument();
    });

    it('should hide value when disabled', () => {
      render(<TrendIndicator trend={5.5} showValue={false} />);

      expect(screen.queryByText(/5\.5/)).not.toBeInTheDocument();
    });

    it('should format large values correctly', () => {
      render(<TrendIndicator trend={150} showValue={true} />);

      expect(screen.getByText(/\+150\/s/)).toBeInTheDocument();
    });

    it('should format small values with decimals', () => {
      render(<TrendIndicator trend={0.5} showValue={true} />);

      expect(screen.getByText(/\+0\.50\/s/)).toBeInTheDocument();
    });

    it('should show minus sign for negative values', () => {
      render(<TrendIndicator trend={-3} showValue={true} />);

      expect(screen.getByText(/-3\.0\/s/)).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size class', () => {
      const { container } = render(<TrendIndicator trend={1} size="small" />);

      expect(container.querySelector('.trend-size-small')).toBeInTheDocument();
    });

    it('should apply medium size class by default', () => {
      const { container } = render(<TrendIndicator trend={1} />);

      expect(container.querySelector('.trend-size-medium')).toBeInTheDocument();
    });

    it('should apply large size class', () => {
      const { container } = render(<TrendIndicator trend={1} size="large" />);

      expect(container.querySelector('.trend-size-large')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive title', () => {
      const { container } = render(<TrendIndicator trend={5} />);

      const indicator = container.querySelector('.trend-indicator');
      expect(indicator).toHaveAttribute('title', expect.stringContaining('Increasing'));
    });

    it('should have aria-label', () => {
      const { container } = render(<TrendIndicator trend={5} />);

      const indicator = container.querySelector('.trend-indicator');
      expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('trend'));
    });
  });
});
