/**
 * ConstructionVisual — Renders ghost blocks and progress bars for construction sites.
 *
 * For PLACED or BUILDING sites: shows translucent ghost blocks for unplaced blocks
 * and a progress bar above the site.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useGameStore from '../../stores/useGameStore';
import { getBuildingById, parseLayers } from '../../data/buildings';
import { VOXEL_SIZE } from '../../systems/chunks/coordinates';
import { getBlockColor } from '../../systems/chunks/blockTypes';

const boxGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
const barBgGeo = new THREE.PlaneGeometry(4, 0.4);
const barBorderGeo = new THREE.PlaneGeometry(4.1, 0.5);

function ConstructionSiteVisual({ site }) {
  const barGroupRef = useRef();
  const { camera } = useThree();

  const building = useMemo(() => getBuildingById(site.buildingId), [site.buildingId]);
  const blocks = useMemo(() => building ? parseLayers(building) : [], [building]);

  // Ghost blocks = blocks not yet placed (index >= blocksPlaced)
  const ghostBlocks = useMemo(() => {
    if (!building || site.status === 'COMPLETE') return [];
    return blocks.slice(site.blocksPlaced).map(b => ({
      position: [
        site.position[0] + b.x * VOXEL_SIZE + VOXEL_SIZE / 2,
        site.position[1] + b.y * VOXEL_SIZE + VOXEL_SIZE / 2,
        site.position[2] + b.z * VOXEL_SIZE + VOXEL_SIZE / 2,
      ],
      color: getBlockColor(b.blockType),
    }));
  }, [building, blocks, site.position, site.blocksPlaced, site.status]);

  // Progress calculation
  const progress = useMemo(() => {
    if (site.status === 'PLACED') {
      let totalReq = 0, totalDel = 0;
      for (const [mat, req] of Object.entries(site.materialsRequired)) {
        totalReq += req;
        totalDel += Math.min(site.materialsDelivered[mat] || 0, req);
      }
      return totalReq > 0 ? totalDel / totalReq : 0;
    }
    if (site.status === 'BUILDING') {
      return site.totalBlocks > 0 ? site.blocksPlaced / site.totalBlocks : 0;
    }
    return 1;
  }, [site.status, site.materialsRequired, site.materialsDelivered, site.blocksPlaced, site.totalBlocks]);

  // Billboard the progress bar
  useFrame(() => {
    if (barGroupRef.current) {
      barGroupRef.current.lookAt(camera.position);
    }
  });

  if (!building || site.status === 'COMPLETE') return null;

  const barY = site.position[1] + building.size.height * VOXEL_SIZE + 1.5;
  const barX = site.position[0] + (building.size.width * VOXEL_SIZE) / 2;
  const barZ = site.position[2] + (building.size.depth * VOXEL_SIZE) / 2;

  const barColor = site.status === 'BUILDING' ? '#44aaff' : '#ffaa00';
  const barWidth = 4 * Math.min(1, progress);

  return (
    <>
      {/* Ghost blocks */}
      {ghostBlocks.map((gb, i) => (
        <mesh key={i} geometry={boxGeo} position={gb.position}>
          <meshBasicMaterial
            color={new THREE.Color(...gb.color)}
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Progress bar */}
      <group ref={barGroupRef} position={[barX, barY, barZ]}>
        {/* Border */}
        <mesh geometry={barBorderGeo} position={[0, 0, -0.01]}>
          <meshBasicMaterial color="#000000" side={THREE.DoubleSide} depthTest={false} />
        </mesh>
        {/* Background */}
        <mesh geometry={barBgGeo}>
          <meshBasicMaterial color="#222222" transparent opacity={0.85} side={THREE.DoubleSide} depthTest={false} />
        </mesh>
        {/* Fill bar */}
        {barWidth > 0 && (
          <mesh position={[-(4 - barWidth) / 2, 0, 0.01]} scale={[barWidth, 1, 1]}>
            <planeGeometry args={[1, 0.3]} />
            <meshBasicMaterial color={barColor} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
        )}
      </group>
    </>
  );
}

export default function ConstructionVisual() {
  const constructionSites = useGameStore((s) => s.constructionSites);

  const activeSites = useMemo(
    () => constructionSites.filter(s => s.status !== 'COMPLETE'),
    [constructionSites]
  );

  if (activeSites.length === 0) return null;

  return (
    <>
      {activeSites.map(site => (
        <ConstructionSiteVisual key={site.id} site={site} />
      ))}
    </>
  );
}
