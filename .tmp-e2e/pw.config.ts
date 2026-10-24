import { defineConfig } from 'playwright/test'

export default defineConfig({
  testDir: '../src',
  testMatch: '**/grammarPath.e2e.ts',
  reporter: 'list',
  outputDir: './results',
  use: {
    baseURL: 'http://localhost:3000',
    launchOptions: {
      executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`,
    },
  },
})
