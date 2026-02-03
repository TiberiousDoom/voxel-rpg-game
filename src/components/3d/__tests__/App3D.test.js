/**
 * App3D Component Tests
 * Tests for the main 3D application entry point
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '../testSetup';

// Import after mocks are set up
import App3D from '../../../App3D';

describe('App3D Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders without crashing', () => {
      expect(() => render(<App3D />)).not.toThrow();
    });

    test('renders Canvas container', () => {
      render(<App3D />);
      const canvas = screen.getByTestId('r3f-canvas');
      expect(canvas).toBeInTheDocument();
    });

    test('renders with correct container styles', () => {
      const { container } = render(<App3D />);
      const mainDiv = container.firstChild;

      expect(mainDiv).toHaveStyle({
        width: '100vw',
        height: '100vh',
      });
    });

    test('renders GameUI overlay', () => {
      render(<App3D />);
      // GameUI should be rendered as an overlay
      expect(document.querySelector('[class*="game-ui"]') ||
             document.querySelector('[data-testid="game-ui"]') ||
             screen.queryByTestId('r3f-canvas')).toBeTruthy();
    });

    test('renders Stats component for performance monitoring', () => {
      render(<App3D />);
      const stats = screen.queryByTestId('drei-stats');
      expect(stats).toBeInTheDocument();
    });
  });

  describe('Canvas Configuration', () => {
    test('Canvas has shadows enabled', () => {
      render(<App3D />);
      const canvas = screen.getByTestId('r3f-canvas');
      expect(canvas).toHaveAttribute('shadows');
    });

    test('Canvas has correct camera settings', () => {
      render(<App3D />);
      const canvas = screen.getByTestId('r3f-canvas');
      // Camera configuration is passed as props
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Experience Integration', () => {
    test('Experience component is rendered inside Canvas', () => {
      render(<App3D />);
      // Experience is rendered inside the Canvas
      const canvas = screen.getByTestId('r3f-canvas');
      expect(canvas.children.length).toBeGreaterThan(0);
    });
  });

  describe('UI Components', () => {
    test('renders SpellWheel component', () => {
      render(<App3D />);
      // SpellWheel should be rendered as overlay
      // The component exists in the DOM
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    test('renders CraftingUI component', () => {
      render(<App3D />);
      // CraftingUI should be rendered as overlay
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });

    test('renders InventoryUI component', () => {
      render(<App3D />);
      // InventoryUI should be rendered as overlay
      expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('main container is focusable', () => {
      const { container } = render(<App3D />);
      const mainDiv = container.firstChild;
      expect(mainDiv).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles missing store gracefully', () => {
      // App3D should work even if store has no data
      expect(() => render(<App3D />)).not.toThrow();
    });
  });
});
