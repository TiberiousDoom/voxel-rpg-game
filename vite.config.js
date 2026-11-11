import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/voxel-rpg-game/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split large, rarely-changing vendor libraries into their own cacheable chunks
        manualChunks: {
          // React lives with R3F: they import each other, so separate chunks would be circular
          'vendor-react': ['react', 'react-dom', '@react-three/fiber', '@react-three/drei'],
          'vendor-three': ['three'],
          'vendor-rapier': ['@react-three/rapier'],
        },
      },
    },
  },
  define: {
    // Polyfill process.env for libraries that expect it
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.PUBLIC_URL': JSON.stringify(''),
  },
  worker: {
    format: 'es',
  },
});
