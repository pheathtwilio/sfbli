# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src/test/e2e/dashboard.spec.js >> Right Panel Dark Theme >> right panel has dark theme styling
- Location: src/test/e2e/dashboard.spec.js:27:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | 
  3   | test.describe('Dashboard Layout', () => {
  4   |   test('renders three-panel layout', async ({ page }) => {
  5   |     await page.goto('/');
  6   |     await expect(page.locator('.sidebar')).toBeVisible();
  7   |     await expect(page.locator('.center-panel')).toBeVisible();
  8   |     await expect(page.locator('.right-panel')).toBeVisible();
  9   |   });
  10  | 
  11  |   test('sidebar has Segment-style navigation', async ({ page }) => {
  12  |     await page.goto('/');
  13  |     await expect(page.locator('.workspace-name')).toContainText('SFBLI');
  14  |     await expect(page.locator('.sidebar-section-header')).toHaveCount(3);
  15  |     await expect(page.locator('.sidebar-subitem.active')).toContainText('Sources');
  16  |   });
  17  | 
  18  |   test('starts on Sources view', async ({ page }) => {
  19  |     await page.goto('/');
  20  |     await expect(page.locator('#view-sources')).toBeVisible();
  21  |     await expect(page.locator('#view-profile-explorer')).toBeHidden();
  22  |     await expect(page.locator('#view-events')).toBeHidden();
  23  |   });
  24  | });
  25  | 
  26  | test.describe('Right Panel Dark Theme', () => {
  27  |   test('right panel has dark theme styling', async ({ page }) => {
> 28  |     await page.goto('/');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  29  |     await expect(page.locator('.right-panel-dark')).toBeVisible();
  30  |     await expect(page.locator('.rp-profile-header')).toBeVisible();
  31  |     await expect(page.locator('.rp-activity-stream')).toBeVisible();
  32  |     await expect(page.locator('.rp-status-bar')).toBeVisible();
  33  |   });
  34  | 
  35  |   test('right panel shows default state on load', async ({ page }) => {
  36  |     await page.goto('/');
  37  |     await expect(page.locator('.rp-profile-name')).toContainText('No profile selected');
  38  |     await expect(page.locator('.rp-empty')).toBeVisible();
  39  |   });
  40  | });
  41  | 
  42  | test.describe('Profile Explorer', () => {
  43  |   test('navigate to profile explorer shows profile list', async ({ page }) => {
  44  |     await page.goto('/');
  45  |     await page.waitForSelector('#view-sources', { state: 'visible' });
  46  |     await page.evaluate(() => window.__app.switchView('profile-explorer'));
  47  |     await expect(page.locator('#view-profile-explorer')).toBeVisible();
  48  |     await expect(page.locator('#profile-table-body tr')).toHaveCount(16);
  49  |   });
  50  | 
  51  |   test('clicking a profile shows detail view with tabs', async ({ page }) => {
  52  |     await page.goto('/');
  53  |     await page.waitForSelector('#view-sources', { state: 'visible' });
  54  |     await page.evaluate(() => window.__app.switchView('profile-explorer'));
  55  |     await expect(page.locator('#view-profile-explorer')).toBeVisible();
  56  |     await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 16);
  57  |     await page.evaluate(() => {
  58  |       const row = document.querySelector('#profile-table-body tr:first-child');
  59  |       row.click();
  60  |     });
  61  |     await page.waitForFunction(() => !document.getElementById('profile-detail').classList.contains('hidden'));
  62  |     await expect(page.locator('.profile-detail-name')).toContainText('Paul Heath');
  63  |     await expect(page.locator('.profile-tab')).toHaveCount(5);
  64  |   });
  65  | 
  66  |   test('selecting profile updates right panel header', async ({ page }) => {
  67  |     await page.goto('/');
  68  |     await page.waitForSelector('#view-sources', { state: 'visible' });
  69  |     await page.evaluate(() => window.__app.switchView('profile-explorer'));
  70  |     await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 16);
  71  |     await page.evaluate(() => document.querySelector('#profile-table-body tr:first-child').click());
  72  |     await page.waitForFunction(() => !document.getElementById('profile-detail').classList.contains('hidden'));
  73  |     await expect(page.locator('.rp-profile-name')).toContainText('Paul Heath');
  74  |     await expect(page.locator('.rp-profile-badges')).toContainText('Agent');
  75  |   });
  76  | });
  77  | 
  78  | test.describe('Demo Flow - Step 1 (Paul Heath)', () => {
  79  |   test('events tab shows only email and RCS events for step 1', async ({ page }) => {
  80  |     await page.goto('/');
  81  |     await page.waitForSelector('#view-sources', { state: 'visible' });
  82  |     await page.evaluate(() => window.__app.switchView('profile-explorer'));
  83  |     await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 16);
  84  |     await page.evaluate(() => document.querySelector('#profile-table-body tr:first-child').click());
  85  |     await page.waitForFunction(() => !document.getElementById('profile-detail').classList.contains('hidden'));
  86  |     await page.evaluate(() => document.querySelector('.profile-tab[data-tab="events"]').click());
  87  | 
  88  |     // First event appears immediately (email)
  89  |     await expect(page.locator('.profile-event-row')).toHaveCount(1, { timeout: 2000 });
  90  |     await expect(page.locator('.profile-event-row').first()).toContainText('Email Delivered: Cross Sell Promotion');
  91  | 
  92  |     // Second event (RCS escalation) appears after 4s delay
  93  |     await expect(page.locator('.profile-event-row')).toHaveCount(2, { timeout: 6000 });
  94  |     await expect(page.locator('.profile-event-row').first()).toContainText('RCS Sent: rcs_sfbli_product_promotion');
  95  | 
  96  |     // Verify demo advances to step 2
  97  |     await page.waitForFunction(() => window.__app.state.demoStep === 2, { timeout: 8000 });
  98  |   });
  99  | });
  100 | 
  101 | test.describe('Demo Flow - Step 2 (Marco Santos)', () => {
  102 |   test('Marco Santos events fire independently', async ({ page }) => {
  103 |     await page.goto('/');
  104 |     await page.waitForSelector('#view-sources', { state: 'visible' });
  105 | 
  106 |     // Navigate directly to Marco Santos (no need to play step 1 first)
  107 |     await page.evaluate(() => window.__app.switchView('profile-explorer'));
  108 |     await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 16);
  109 |     await page.evaluate(() => {
  110 |       const rows = document.querySelectorAll('#profile-table-body tr');
  111 |       for (const row of rows) {
  112 |         if (row.textContent.includes('Marco Santos')) { row.click(); break; }
  113 |       }
  114 |     });
  115 |     await page.waitForFunction(() => !document.getElementById('profile-detail').classList.contains('hidden'));
  116 |     await page.evaluate(() => document.querySelector('.profile-tab[data-tab="events"]').click());
  117 | 
  118 |     // Marco should get 2 events: journey triggered + RCS sent
  119 |     await expect(page.locator('.profile-event-row')).toHaveCount(2, { timeout: 5000 });
  120 |     await expect(page.locator('.profile-event-row').last()).toContainText('Journey Triggered');
  121 |     await expect(page.locator('.profile-event-row').first()).toContainText('RCS Sent: rcs_sfbli_property_and_casualty');
  122 |   });
  123 | });
  124 | 
  125 | test.describe('Audiences', () => {
  126 |   test('audiences list shows default audience on load', async ({ page }) => {
  127 |     await page.goto('/');
  128 |     await page.waitForFunction(() => window.__app && window.__app.state.audiences.length > 0);
```