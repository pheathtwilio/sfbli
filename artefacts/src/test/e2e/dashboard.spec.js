const { test, expect } = require('@playwright/test');

test.describe('Dashboard Layout', () => {
  test('renders three-panel layout', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.center-panel')).toBeVisible();
    await expect(page.locator('.right-panel')).toBeVisible();
  });

  test('sidebar has Segment-style navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.workspace-name')).toContainText('SFBLI');
    await expect(page.locator('.sidebar-section-header')).toHaveCount(3);
    await expect(page.locator('.sidebar-subitem.active')).toContainText('Sources');
  });

  test('starts on Sources view', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#view-sources')).toBeVisible();
    await expect(page.locator('#view-profile-explorer')).toBeHidden();
    await expect(page.locator('#view-events')).toBeHidden();
  });
});

test.describe('Outreach Controls', () => {
  test('outreach buttons are disabled on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#btn-rcs')).toBeDisabled();
    await expect(page.locator('#btn-email')).toBeDisabled();
    await expect(page.locator('#btn-voice')).toBeDisabled();
  });

  test('conversation input is disabled on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#conversation-input')).toBeDisabled();
    await expect(page.locator('#conversation-send-btn')).toBeDisabled();
  });
});

test.describe('Profile Explorer', () => {
  test('navigate to profile explorer shows profile list', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#view-sources', { state: 'visible' });
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await expect(page.locator('#view-profile-explorer')).toBeVisible();
    await expect(page.locator('#profile-table-body tr')).toHaveCount(6);
  });

  test('clicking a profile shows detail view with tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#view-sources', { state: 'visible' });
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await expect(page.locator('#view-profile-explorer')).toBeVisible();
    await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 6);
    await page.evaluate(() => {
      const row = document.querySelector('#profile-table-body tr:first-child');
      row.click();
    });
    await page.waitForFunction(() => !document.getElementById('profile-detail').classList.contains('hidden'));
    await expect(page.locator('.profile-detail-name')).toContainText('Paul Heath');
    await expect(page.locator('.profile-tab')).toHaveCount(5);
  });

  test('events tab animates live events and enables outreach', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#view-sources', { state: 'visible' });
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 6);
    await page.evaluate(() => document.querySelector('#profile-table-body tr:first-child').click());
    await page.waitForFunction(() => !document.getElementById('profile-detail').classList.contains('hidden'));
    await page.evaluate(() => document.querySelector('.profile-tab[data-tab="events"]').click());

    // Historical events appear immediately
    await expect(page.locator('.profile-event-row')).toHaveCount(4, { timeout: 1000 });

    // Live events animate in
    await expect(page.locator('.profile-event-row')).toHaveCount(5, { timeout: 3000 });
    await expect(page.locator('.profile-event-row')).toHaveCount(6, { timeout: 5000 });
    await expect(page.locator('.profile-event-row')).toHaveCount(7, { timeout: 8000 });

    // form_abandon should enable outreach
    await expect(page.locator('#btn-rcs')).toBeEnabled();
    await expect(page.locator('#btn-email')).toBeEnabled();
    await expect(page.locator('#btn-voice')).toBeEnabled();
    await expect(page.locator('#conversation-input')).toBeEnabled();
  });
});

test.describe('Conversation Input', () => {
  test('conversation input accepts text when enabled', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#view-sources', { state: 'visible' });

    // Enable outreach directly
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 6);
    await page.evaluate(() => document.querySelector('#profile-table-body tr:first-child').click());
    await page.waitForFunction(() => !document.getElementById('profile-detail').classList.contains('hidden'));
    await page.evaluate(() => document.querySelector('.profile-tab[data-tab="events"]').click());

    // Wait for form_abandon to enable
    await expect(page.locator('#conversation-input')).toBeEnabled({ timeout: 8000 });

    // Type into the input
    await page.fill('#conversation-input', 'Hello from the demo');
    await expect(page.locator('#conversation-input')).toHaveValue('Hello from the demo');
  });
});
