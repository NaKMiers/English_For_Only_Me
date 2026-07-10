import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const serverOnlyStub = fileURLToPath(
  new URL('./src/test/serverOnlyStub.ts', import.meta.url)
)

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      'server-only': serverOnlyStub,
      'client-only': serverOnlyStub,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    server: {
      deps: {
        inline: ['next-auth', '@auth/core'],
      },
    },
  },
})
