/**
 * SettlementTick — Thin bridge component (returns null) that connects the
 * SettlementModule's tickSettlementCore to the React Three Fiber render loop
 * and syncs results back to the Zustand store.
 *
 * All logic lives in the module layer; this component only reads/writes state.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import useGameStore from '../../stores/useGameStore';
import SettlementBridge from '../../modules/settlement/SettlementBridge';

export default function SettlementTick({ chunkManager }) {
  const bridgeRef = useRef(null);

  // Create bridge once, connected to the settlement module
  useEffect(() => {
    const module = useGameStore.getState()._settlementModule;
    if (module) {
      bridgeRef.current = new SettlementBridge(module);
    }
  }, []);

  // Update chunk adapter when chunkManager changes
  useEffect(() => {
    if (bridgeRef.current && chunkManager) {
      bridgeRef.current.setChunkAdapter(chunkManager);
    }
  }, [chunkManager]);

  useFrame((_, delta) => {
    if (!bridgeRef.current || !chunkManager) return;

    const store = useGameStore.getState();
    if (store.gameState !== 'playing') return;

    const module = store._settlementModule;
    if (!module) return;

    // Module handles all accumulators internally; delta is in seconds
    const snapshot = bridgeRef.current.getGameState();
    const results = module.tickSettlementCore(delta, snapshot);

    // Sync results back to the Zustand store
    bridgeRef.current.syncToStore(results);
  });

  return null;
}
