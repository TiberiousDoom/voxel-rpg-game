/**
 * GameViewport Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GameViewport from '../GameViewport';

describe('GameViewport Component', () => {
  const mockBuildings = [
    {
      id: 'building-1',
      type: 'FARM',
      position: { x: 5, y: 0, z: 5 }
    },
    {
      id: 'building-2',
      type: 'HOUSE',
      position: { x: 7, y: 0, z: 7 }
    }
  ];

  const mockNPCs = [
    {
      id: 'npc-1',
      position: { x: 3, y: 0, z: 3 },
      alive: true
    },
    {
      id: 'npc-2',
      position: { x: 8, y: 0, z: 8 },
      alive: true
    }
  ];

  describe('Rendering', () => {
    test('renders canvas element', () => {
      render(<GameViewport buildings={[]} npcs={[]} />);

      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    test('canvas has correct dimensions', () => {
      render(<GameViewport buildings={[]} npcs={[]} />);

      const canvas = document.querySelector('canvas');
      expect(canvas).toHaveAttribute('width');
      expect(canvas).toHaveAttribute('height');
    });

    test('renders with buildings', () => {
      const { container } = render(
        <GameViewport buildings={mockBuildings} npcs={[]} />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    test('renders with NPCs', () => {
      const { container } = render(
        <GameViewport buildings={[]} npcs={mockNPCs} />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    test('re-renders when buildings change', () => {
      const { rerender } = render(
        <GameViewport buildings={[]} npcs={[]} />
      );

      rerender(
        <GameViewport buildings={mockBuildings} npcs={[]} />
      );

      expect(document.querySelector('canvas')).toBeInTheDocument();
    });
  });

  describe('Mouse Interaction', () => {
    test('calls onPlaceBuilding when canvas clicked with selection', () => {
      const onPlaceBuilding = vi.fn();

      render(
        <GameViewport
          buildings={[]}
          npcs={[]}
          selectedBuildingType="FARM"
          onPlaceBuilding={onPlaceBuilding}
        />
      );

      const canvas = document.querySelector('canvas');
      fireEvent.click(canvas, {
        clientX: 100,
        clientY: 100
      });

      expect(onPlaceBuilding).toHaveBeenCalled();
    });

    test('does not call onPlaceBuilding without selection', () => {
      const onPlaceBuilding = vi.fn();

      render(
        <GameViewport
          buildings={[]}
          npcs={[]}
          selectedBuildingType={null}
          onPlaceBuilding={onPlaceBuilding}
        />
      );

      const canvas = document.querySelector('canvas');
      fireEvent.click(canvas, {
        clientX: 100,
        clientY: 100
      });

      expect(onPlaceBuilding).not.toHaveBeenCalled();
    });

    test('calls onSelectTile on canvas click', () => {
      const onSelectTile = vi.fn();

      // Tile selection applies when player movement is off (otherwise a
      // click moves the player)
      render(
        <GameViewport
          buildings={[]}
          npcs={[]}
          onSelectTile={onSelectTile}
          enablePlayerMovement={false}
        />
      );

      const canvas = document.querySelector('canvas');
      // jsdom has no layout: give the canvas its real on-screen size
      canvas.getBoundingClientRect = () => ({
        left: 0, top: 0, right: canvas.width, bottom: canvas.height,
        width: canvas.width, height: canvas.height, x: 0, y: 0,
      });
      fireEvent.click(canvas, {
        clientX: 100,
        clientY: 100
      });

      expect(onSelectTile).toHaveBeenCalledWith(
        expect.objectContaining({ x: expect.any(Number), z: expect.any(Number) })
      );
    });

    test('updates on mouse move', () => {
      const { container } = render(
        <GameViewport
          buildings={[]}
          npcs={[]}
          selectedBuildingType="FARM"
        />
      );

      const canvas = container.querySelector('canvas');

      expect(() => {
        fireEvent.mouseMove(canvas, {
          clientX: 150,
          clientY: 150
        });
      }).not.toThrow();
    });

    test('handles rapid mouse movements', () => {
      const { container } = render(
        <GameViewport
          buildings={[]}
          npcs={[]}
          selectedBuildingType="FARM"
        />
      );

      const canvas = container.querySelector('canvas');

      for (let i = 0; i < 20; i++) {
        fireEvent.mouseMove(canvas, {
          clientX: 100 + i,
          clientY: 100
        });
      }

      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('handles large number of buildings', () => {
      const manyBuildings = Array(50).fill(null).map((_, i) => ({
        id: `building-${i}`,
        type: 'FARM',
        position: { x: i % 10, y: 0, z: Math.floor(i / 10) }
      }));

      expect(() => {
        render(<GameViewport buildings={manyBuildings} npcs={[]} />);
      }).not.toThrow();
    });

    test('handles large number of NPCs', () => {
      const manyNPCs = Array(50).fill(null).map((_, i) => ({
        id: `npc-${i}`,
        position: { x: i % 10, y: 0, z: Math.floor(i / 10) },
        alive: true
      }));

      expect(() => {
        render(<GameViewport buildings={[]} npcs={manyNPCs} />);
      }).not.toThrow();
    });
  });
});
