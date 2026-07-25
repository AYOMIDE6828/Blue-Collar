import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // Only unit tests live under src/. e2e/ and visual/ are Playwright suites
    // run by `pnpm test:e2e`; picking them up here makes vitest fail on
    // Playwright-only globals.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Disable PostCSS/Tailwind processing in tests — CSS not needed for unit tests
    // and avoids native-binding failures in CI environments without the Tailwind v4 binary.
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/components/**', 'src/hooks/**', 'src/lib/**'],
      exclude: ['**/*.stories.tsx'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
