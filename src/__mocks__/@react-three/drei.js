/**
 * Mock for @react-three/drei
 * Provides mock implementations for Three.js helper components
 */
import React from 'react';

// Mock Stats component
export const Stats = () => <div data-testid="drei-stats" />;

// Mock Billboard component
export const Billboard = ({ children, ...props }) => (
  <group data-testid="drei-billboard" {...props}>
    {children}
  </group>
);

// Mock Text component
export const Text = ({ children, ...props }) => (
  <mesh data-testid="drei-text" {...props}>
    <planeGeometry args={[1, 1]} />
    <meshBasicMaterial />
  </mesh>
);

// Mock Html component
export const Html = ({ children, ...props }) => (
  <div data-testid="drei-html" {...props}>
    {children}
  </div>
);

// Mock OrbitControls
export const OrbitControls = React.forwardRef((props, ref) => (
  <div data-testid="drei-orbit-controls" ref={ref} {...props} />
));

// Mock useKeyboardControls
export const useKeyboardControls = jest.fn(() => [
  jest.fn(), // selector function
  jest.fn(), // get function
]);

// Mock KeyboardControls
export const KeyboardControls = ({ children, ...props }) => (
  <div data-testid="drei-keyboard-controls" {...props}>
    {children}
  </div>
);

// Mock useGLTF
export const useGLTF = jest.fn(() => ({
  scene: { clone: jest.fn() },
  nodes: {},
  materials: {},
}));

// Mock useTexture
export const useTexture = jest.fn(() => ({
  map: {},
}));

// Mock Center component
export const Center = ({ children, ...props }) => (
  <group data-testid="drei-center" {...props}>
    {children}
  </group>
);

// Mock Float component
export const Float = ({ children, ...props }) => (
  <group data-testid="drei-float" {...props}>
    {children}
  </group>
);

// Mock Environment
export const Environment = (props) => <div data-testid="drei-environment" {...props} />;

// Mock Sky
export const Sky = (props) => <mesh data-testid="drei-sky" {...props} />;

// Mock useHelper
export const useHelper = jest.fn();

// Default export
export default {
  Stats,
  Billboard,
  Text,
  Html,
  OrbitControls,
  useKeyboardControls,
  KeyboardControls,
  useGLTF,
  useTexture,
  Center,
  Float,
  Environment,
  Sky,
  useHelper,
};
