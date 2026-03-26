import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    css: true,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    // Vitest auto-detects __mocks__/ directories (same as Jest)
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
    'process.env.PUBLIC_URL': JSON.stringify(''),
  },
});
