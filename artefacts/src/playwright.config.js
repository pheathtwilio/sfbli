const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npx http-server assets -p 3000 -c-1',
    port: 3000,
    reuseExistingServer: true
  }
});
