import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

/**
 * Floating damage number that rises and fades out
 */
const DamageNumber = ({ position, damage, id, onComplete }) => {
  const groupRef = useRef();
  const yOffset = useRef(0);
  const opacityRef = useRef(1);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Rise up
    yOffset.current += delta * 2;
    groupRef.current.position.y = position[1] + yOffset.current;

    // Fade out
    const newOpacity = Math.max(0, 1 - yOffset.current / 2);
    opacityRef.current = newOpacity;

    // Remove when fully faded
    if (newOpacity <= 0) {
      onComplete(id);
    }
  });

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      <Text
        position={[0, 0, 0]}
        fontSize={0.5}
        color="#ff4444"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {`-${damage}`}
      </Text>
    </group>
  );
};

export default DamageNumber;
