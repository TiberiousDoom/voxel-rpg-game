import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Visual marker showing where player tapped/clicked
 */
const TargetMarker = ({ position, duration = 2, color = '#00ff00', id, onComplete }) => {
  const meshRef = useRef();
  const timeRef = useRef(0);
  const [completed, setCompleted] = useState(false);

  useFrame((state, delta) => {
    if (!meshRef.current || completed) return;

    timeRef.current += delta;

    // Fade out over duration
    const opacity = Math.max(0, 1 - timeRef.current / duration);
    meshRef.current.material.opacity = opacity;

    // Pulse scale
    const scale = 1 + Math.sin(timeRef.current * 5) * 0.1;
    meshRef.current.scale.set(scale, 1, scale);

    // Rotate
    meshRef.current.rotation.y += delta * 2;

    // Remove when fully faded
    if (timeRef.current >= duration && !completed) {
      setCompleted(true);
      if (onComplete && id) {
        onComplete(id);
      }
    }
  });

  if (completed) return null;

  return (
    <group position={[position[0], position[1] + 0.1, position[2]]}>
      {/* Outer ring - reduced segments for performance */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={1}
          side={2}
        />
      </mesh>

      {/* Inner circle - reduced segments */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={2}
        />
      </mesh>
    </group>
  );
};

export default TargetMarker;
