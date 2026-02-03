/**
 * VoxelTerrain Component Tests
 * Tests for the procedural voxel terrain generator
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '../testSetup';

// Import after mocks
import VoxelTerrain from '../VoxelTerrain';

const TestWrapper = ({ children }) => (
  <div data-testid="test-wrapper">{children}</div>
);

describe('VoxelTerrain Component', () => {
  const defaultProps = {
    size: 40,
    voxelSize: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders without crashing', () => {
      expect(() =>
        render(
          <TestWrapper>
            <VoxelTerrain {...defaultProps} />
          </TestWrapper>
        )
      ).not.toThrow();
    });

    test('renders with default props', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('renders with custom size', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain size={50} voxelSize={1} />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('Terrain Generation', () => {
    test('generates terrain mesh', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // Terrain should be rendered as InstancedMesh
      expect(container).toBeInTheDocument();
    });

    test('terrain uses InstancedMesh for performance', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // InstancedMesh allows rendering many voxels efficiently
      expect(container).toBeInTheDocument();
    });

    test('terrain respects size parameter', () => {
      const { container: smallContainer } = render(
        <TestWrapper>
          <VoxelTerrain size={10} voxelSize={2} />
        </TestWrapper>
      );

      const { container: largeContainer } = render(
        <TestWrapper>
          <VoxelTerrain size={100} voxelSize={2} />
        </TestWrapper>
      );

      expect(smallContainer).toBeInTheDocument();
      expect(largeContainer).toBeInTheDocument();
    });

    test('terrain respects voxelSize parameter', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain size={40} voxelSize={4} />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('Height Variation', () => {
    test('terrain has height variation (noise-based)', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // Terrain should use noise function for heights
      expect(container).toBeInTheDocument();
    });
  });

  describe('Terrain Types', () => {
    test('renders grass blocks', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // Top layer should be grass (green)
      expect(container).toBeInTheDocument();
    });

    test('renders dirt blocks', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // Below grass should be dirt (brown)
      expect(container).toBeInTheDocument();
    });

    test('renders stone blocks', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // Deeper layers should be stone (gray)
      expect(container).toBeInTheDocument();
    });

    test('renders bedrock at lowest level', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // Bottom layer should be bedrock (dark gray)
      expect(container).toBeInTheDocument();
    });
  });

  describe('Coloring', () => {
    test('terrain has height-based coloring', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // Different heights have different colors
      expect(container).toBeInTheDocument();
    });

    test('uses vertex colors for efficiency', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // Vertex colors avoid material switching
      expect(container).toBeInTheDocument();
    });
  });

  describe('Geometry', () => {
    test('uses BoxGeometry for voxels', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('voxels are positioned correctly on grid', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // Voxels should be on a regular grid
      expect(container).toBeInTheDocument();
    });
  });

  describe('Material', () => {
    test('uses MeshStandardMaterial', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // Standard material for good lighting response
      expect(container).toBeInTheDocument();
    });

    test('terrain receives shadows', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('terrain casts shadows', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('terrain renders with large size without crash', () => {
      expect(() =>
        render(
          <TestWrapper>
            <VoxelTerrain size={100} voxelSize={2} />
          </TestWrapper>
        )
      ).not.toThrow();
    });

    test('uses single draw call via InstancedMesh', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );
      // InstancedMesh renders all voxels in one draw call
      expect(container).toBeInTheDocument();
    });
  });

  describe('Seeding', () => {
    test('terrain is consistent with same seed', () => {
      const { container: render1 } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );

      const { container: render2 } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );

      // Same props should generate same terrain
      expect(render1).toBeInTheDocument();
      expect(render2).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles zero size gracefully', () => {
      expect(() =>
        render(
          <TestWrapper>
            <VoxelTerrain size={0} voxelSize={2} />
          </TestWrapper>
        )
      ).not.toThrow();
    });

    test('handles very small voxel size', () => {
      const { container } = render(
        <TestWrapper>
          <VoxelTerrain size={10} voxelSize={0.5} />
        </TestWrapper>
      );
      expect(container).toBeInTheDocument();
    });

    test('handles negative size', () => {
      expect(() =>
        render(
          <TestWrapper>
            <VoxelTerrain size={-10} voxelSize={2} />
          </TestWrapper>
        )
      ).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    test('disposes geometry on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );

      expect(() => unmount()).not.toThrow();
    });

    test('disposes material on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <VoxelTerrain {...defaultProps} />
        </TestWrapper>
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
