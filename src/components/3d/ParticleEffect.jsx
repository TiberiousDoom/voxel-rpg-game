import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ParticleEffect component - Creates particle explosions for various effects
 */
const ParticleEffect = ({ position, color = '#ffff00', count = 20, type = 'explosion', onComplete, id }) => {
  const particlesRef = useRef();
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;

      if (type === 'explosion') {
        temp.push({
          position: new THREE.Vector3(
            Math.cos(angle) * 0.2,
            Math.random() * 0.2,
            Math.sin(angle) * 0.2
          ),
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.random() * speed + 1,
            Math.sin(angle) * speed
          ),
          life: 1.0,
        });
      } else if (type === 'spiral') {
        temp.push({
          position: new THREE.Vector3(0, i * 0.1, 0),
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            2,
            Math.sin(angle) * speed
          ),
          life: 1.0,
        });
      } else if (type === 'burst') {
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        temp.push({
          position: new THREE.Vector3(0, 0, 0),
          velocity: new THREE.Vector3(
            Math.sin(theta) * Math.cos(phi) * speed,
            Math.cos(theta) * speed,
            Math.sin(theta) * Math.sin(phi) * speed
          ),
          life: 1.0,
        });
      }
    }
    return temp;
  }, [count, type]);

  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    timeRef.current += delta;

    let allDead = true;
    particles.forEach((particle, i) => {
      if (particle.life > 0) {
        allDead = false;

        // Update position
        particle.position.add(particle.velocity.clone().multiplyScalar(delta));

        // Apply gravity
        particle.velocity.y -= 9.8 * delta;

        // Fade out
        particle.life -= delta * 2;

        // Update instance matrix
        const matrix = new THREE.Matrix4();
        matrix.setPosition(particle.position);
        matrix.scale(new THREE.Vector3(0.1 * particle.life, 0.1 * particle.life, 0.1 * particle.life));
        particlesRef.current.setMatrixAt(i, matrix);
      }
    });

    particlesRef.current.instanceMatrix.needsUpdate = true;

    if (allDead && onComplete) {
      onComplete(id);
    }
  });

  return (
    <instancedMesh ref={particlesRef} args={[null, null, count]} position={position}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </instancedMesh>
  );
};

export default ParticleEffect;
