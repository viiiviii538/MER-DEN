import { defineConfig } from '@playwright/test';

const config = defineConfig({
  use: {
    video: 'off',
    screenshot: 'off',
    trace: 'off'
  },
  reporter: [['line']],
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  outputDir: '.artifacts/e2e',
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
      }
    }
  ]
});

if (process.env.CI_ARTIFACTS === '1') {
  config.use = { ...config.use, screenshot: 'only-on-failure', trace: 'retain-on-failure' };
  config.reporter = [
    ['junit', { outputFile: '.artifacts/e2e/junit.xml' }],
    ['line']
  ];
}

export default config;
