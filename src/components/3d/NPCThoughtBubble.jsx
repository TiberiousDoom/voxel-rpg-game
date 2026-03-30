/**
 * NPCThoughtBubble — Mesh-based icons above NPC heads.
 *
 * No drei Text/Billboard (causes WebGL shader corruption).
 * Rendered as child of SettlerNPC group at Y=3.2 above ground.
 *
 * Icon types: mining, hauling, building, hungry, sleeping, socializing
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Shared geometries
const handleGeo = new THREE.BoxGeometry(0.06, 0.3, 0.06);
const headGeo = new THREE.BoxGeometry(0.15, 0.1, 0.06);
const cubeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
const hammerHandleGeo = new THREE.BoxGeometry(0.06, 0.25, 0.06);
const hammerHeadGeo = new THREE.BoxGeometry(0.18, 0.08, 0.08);
const coneGeo = new THREE.ConeGeometry(0.06, 0.2, 6);
const sphereGeo = new THREE.SphereGeometry(0.06, 6, 6);
const zSphereGeo = new THREE.SphereGeometry(0.05, 4, 4);

// Materials (created once)
const orangeMat = new THREE.MeshBasicMaterial({ color: '#ff8c00' });
const yellowMat = new THREE.MeshBasicMaterial({ color: '#ffcc00' });
const blueMat = new THREE.MeshBasicMaterial({ color: '#4488ff' });
const redMat = new THREE.MeshBasicMaterial({ color: '#ff4444' });
const purpleMat = new THREE.MeshBasicMaterial({ color: '#8844cc' });
const magentaMat = new THREE.MeshBasicMaterial({ color: '#ff88ff' });
const brownMat = new THREE.MeshBasicMaterial({ color: '#8B4513' });

// Pickaxe icon: two crossed boxes (handle + head)
function PickaxeIcon() {
  return (
    <group>
      <mesh geometry={handleGeo} material={brownMat} rotation={[0, 0, 0.5]} position={[0, 0, 0]} />
      <mesh geometry={headGeo} material={orangeMat} position={[0.08, 0.12, 0]} rotation={[0, 0, 0.5]} />
    </group>
  );
}

// Box icon: small cube
function BoxIcon() {
  return <mesh geometry={cubeGeo} material={yellowMat} />;
}

// Hammer icon: L-shape from two boxes
function HammerIcon() {
  return (
    <group>
      <mesh geometry={hammerHandleGeo} material={brownMat} position={[0, -0.05, 0]} />
      <mesh geometry={hammerHeadGeo} material={blueMat} position={[0, 0.1, 0]} />
    </group>
  );
}

// Drumstick icon: cone + sphere
function DrumstickIcon() {
  return (
    <group rotation={[0, 0, -0.4]}>
      <mesh geometry={coneGeo} material={brownMat} position={[0, -0.05, 0]} />
      <mesh geometry={sphereGeo} material={redMat} position={[0, 0.1, 0]} />
    </group>
  );
}

// Zzz icon: three ascending spheres
function SleepIcon() {
  return (
    <group>
      <mesh geometry={zSphereGeo} material={purpleMat} position={[-0.08, -0.05, 0]} />
      <mesh geometry={zSphereGeo} material={purpleMat} position={[0, 0.05, 0]} scale={1.3} />
      <mesh geometry={zSphereGeo} material={purpleMat} position={[0.08, 0.15, 0]} scale={1.6} />
    </group>
  );
}

// Chat icon: two overlapping spheres
function ChatIcon() {
  return (
    <group>
      <mesh geometry={sphereGeo} material={magentaMat} position={[-0.04, 0, 0]} scale={1.5} />
      <mesh geometry={sphereGeo} material={magentaMat} position={[0.06, 0.06, 0]} scale={1.2} />
    </group>
  );
}

const ICON_COMPONENTS = {
  mining: PickaxeIcon,
  hauling: BoxIcon,
  building: HammerIcon,
  hungry: DrumstickIcon,
  sleeping: SleepIcon,
  socializing: ChatIcon,
};

const NPCThoughtBubble = React.memo(({ type }) => {
  const groupRef = useRef();
  const startTime = useMemo(() => Date.now() / 1000, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (!groupRef.current) return;
    const t = Date.now() / 1000 - startTime;
    // Gentle bob animation
    groupRef.current.position.y = 3.2 + Math.sin(t * 2) * 0.08;
    // Always face camera (billboard via lookAt won't work reliably, just reset rotation)
    groupRef.current.rotation.y = 0;
  });

  if (!type) return null;
  const IconComponent = ICON_COMPONENTS[type];
  if (!IconComponent) return null;

  return (
    <group ref={groupRef} position={[0, 3.2, 0]}>
      {/* Background bubble (translucent white) */}
      <mesh>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>
      <IconComponent />
    </group>
  );
});

NPCThoughtBubble.displayName = 'NPCThoughtBubble';

export default NPCThoughtBubble;
