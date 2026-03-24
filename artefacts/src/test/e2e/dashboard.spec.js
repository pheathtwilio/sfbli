const { test, expect } = require('@playwright/test');

test.describe('Dashboard Layout', () => {
  test('renders three-panel layout', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.center-panel')).toBeVisible();
    await expect(page.locator('.right-panel')).toBeVisible();
  });

  test('sidebar has navigation items', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.sidebar-item')).toHaveCount(4);
    await expect(page.locator('.sidebar-item.active')).toContainText('Events');
  });
});

test.describe('Scenario Playback', () => {
  test('events appear in the event stream', async ({ page }) => {
    await page.goto('/');
    // Wait for first event (delay: 0)
    await expect(page.locator('.event-item')).toHaveCount(1, { timeout: 2000 });
    // Wait for more events
    await page.waitForTimeout(9000);
    const eventCount = await page.locator('.event-item').count();
    expect(eventCount).toBeGreaterThanOrEqual(4);
  });

  test('profile updates after scenario completes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(9000);
    await expect(page.locator('[data-field="status"]')).toContainText('At Risk');
    await expect(page.locator('[data-field="engagement_score"]')).toContainText('45');
  });

  test('replay button restarts events', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(9000);
    await page.click('#replay-btn');
    await page.waitForTimeout(1000);
    const eventCount = await page.locator('.event-item').count();
    expect(eventCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Profile Editing', () => {
  test('edit button toggles contentEditable on profile fields', async ({ page }) => {
    await page.goto('/');
    await page.click('#edit-profile-btn');
    const nameField = page.locator('[data-field="name"]');
    await expect(nameField).toHaveAttribute('contenteditable', 'true');
    await page.click('#edit-profile-btn');
    await expect(nameField).toHaveAttribute('contenteditable', 'false');
  });
});

test.describe('Channel Controls', () => {
  test('RCS button opens template selector', async ({ page }) => {
    await page.goto('/');
    await page.click('#btn-rcs');
    await expect(page.locator('#template-selector')).toBeVisible();
    await expect(page.locator('#channel-controls')).toBeHidden();
  });

  test('cancel button closes template selector', async ({ page }) => {
    await page.goto('/');
    await page.click('#btn-rcs');
    await page.click('#template-cancel-btn');
    await expect(page.locator('#template-selector')).toBeHidden();
    await expect(page.locator('#channel-controls')).toBeVisible();
  });

  test('email button opens template selector', async ({ page }) => {
    await page.goto('/');
    await page.click('#btn-email');
    await expect(page.locator('#template-selector')).toBeVisible();
  });
});

test.describe('Brand Loading', () => {
  test('loads default brand config', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-field="name"]')).toContainText('Marcus Rivera');
    await expect(page.locator('[data-field="region"]')).toContainText('Southeast');
  });

  test('scenario query param is respected', async ({ page }) => {
    await page.goto('/?scenario=default');
    await expect(page.locator('.event-item')).toHaveCount(1, { timeout: 2000 });
  });
});
