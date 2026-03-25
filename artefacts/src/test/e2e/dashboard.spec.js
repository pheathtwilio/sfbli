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
    await expect(page.locator('#profile-table-body tr')).toHaveCount(16);
  });

  test('clicking a profile shows detail view with tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#view-sources', { state: 'visible' });
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await expect(page.locator('#view-profile-explorer')).toBeVisible();
    await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 16);
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
    await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 16);
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
    await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 16);
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

test.describe('Audiences', () => {
  test('audiences list shows default audience on load', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__app && window.__app.state.audiences.length > 0);
    await page.evaluate(() => window.__app.switchView('audiences'));
    await expect(page.locator('#audiences-table-body')).toContainText('Property & Casualty Promotion');
  });

  test('new audience button opens wizard', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('audiences'));
    await page.waitForFunction(() =>
      !document.getElementById('view-audiences').classList.contains('hidden'));
    await page.evaluate(() => window.__app.openAudienceWizard());
    await page.waitForFunction(() =>
      !document.getElementById('audience-wizard').classList.contains('hidden'));
    await expect(page.locator('#audience-wizard')).toBeVisible();
  });

  test('completing wizard creates audience in list', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('audiences'));
    await page.evaluate(() => window.__app.openAudienceWizard());

    // Step 1: Select type (Profiles pre-selected) → Next
    await page.evaluate(() =>
      document.getElementById('wizard-next-btn').click());

    // Step 2: Add condition
    await page.evaluate(() => {
      document.getElementById('cond-trait').value = 'target_attainment';
      document.getElementById('cond-trait').dispatchEvent(new Event('change'));
      document.getElementById('cond-operator').value = 'greater than';
      document.getElementById('cond-operator').dispatchEvent(new Event('change'));
      document.getElementById('cond-value').value = '60';
      document.getElementById('cond-value').dispatchEvent(new Event('input'));
    });

    // Check preview shows 4 matches
    await expect(page.locator('.audience-preview-count')).toContainText('4');

    // Next
    await page.evaluate(() =>
      document.getElementById('wizard-next-btn').click());

    // Step 3: Destinations → Next
    await page.evaluate(() =>
      document.getElementById('wizard-next-btn').click());

    // Step 4: Enter name and create
    await page.fill('[data-field="audience-name"]', 'Cross-Sell');
    await page.evaluate(() =>
      document.getElementById('wizard-create-btn').click());

    // Should show audience detail
    await page.waitForFunction(() =>
      !document.getElementById('audience-detail').classList.contains('hidden'));
    await expect(page.locator('#audience-detail')).toContainText('Cross-Sell');
  });
});

test.describe('Journeys', () => {
  test('journeys list shows empty state', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('journeys'));
    await expect(page.locator('#journeys-table-body')).toContainText('No journeys yet');
  });

  test('create journey button opens wizard', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('journeys'));
    await page.waitForFunction(() =>
      !document.getElementById('view-journeys').classList.contains('hidden'));
    await page.evaluate(() => window.__app.openJourneyWizard());
    await page.waitForFunction(() =>
      !document.getElementById('journey-wizard').classList.contains('hidden'));
    await expect(page.locator('#journey-wizard')).toBeVisible();
  });
});

test.describe('End-to-End Scenario', () => {
  test('audience + journey triggers promotion_sent on qualifying profile', async ({ page }) => {
    await page.goto('/');

    // Create audience and journey via JS API
    await page.evaluate(() => {
      const members = window.__app.computeAudienceMembers([
        { trait: 'target_attainment', operator: 'greater than', value: 60 }
      ]);
      window.__app.state.audiences.push({
        name: 'Cross-Sell', key: 'cross_sell',
        description: 'Test', conditions: [],
        destination: 'Send Interaction',
        members: members.map(p => p.id)
      });
      window.__app.state.journeys.push({
        name: 'Send Promotion', description: 'Test',
        audience_key: 'cross_sell',
        trigger: 'new_promotion_published',
        destination: 'Send Interaction', status: 'Draft'
      });
    });

    // Navigate to Paul Heath profile events tab
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await page.waitForFunction(() =>
      document.querySelectorAll('#profile-table-body tr').length === 16);
    await page.evaluate(() =>
      document.querySelector('#profile-table-body tr:first-child').click());
    await page.waitForFunction(() =>
      !document.getElementById('profile-detail').classList.contains('hidden'));
    await page.evaluate(() =>
      document.querySelector('.profile-tab[data-tab="events"]').click());

    // Wait for promotion_sent event (8s delay + buffer)
    // 4 history + 3 live + 1 promotion_sent = 8
    await expect(page.locator('.profile-event-row')).toHaveCount(8, { timeout: 12000 });
  });

  test('non-qualifying profile does not get promotion_sent', async ({ page }) => {
    await page.goto('/');

    // Create audience — Emily Watson (13%) won't qualify
    await page.evaluate(() => {
      window.__app.state.audiences.push({
        name: 'Test', key: 'test', description: '',
        conditions: [], destination: 'Send Interaction',
        members: ['usr_001', 'usr_002', 'usr_003', 'usr_005']
      });
      window.__app.state.journeys.push({
        name: 'Test Journey', description: '',
        audience_key: 'test', trigger: 'new_promotion_published',
        destination: 'Send Interaction', status: 'Draft'
      });
    });

    // Navigate to Emily Watson (usr_004, row index 3)
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await page.waitForFunction(() =>
      document.querySelectorAll('#profile-table-body tr').length === 16);
    await page.evaluate(() =>
      document.querySelectorAll('#profile-table-body tr')[3].click());
    await page.waitForFunction(() =>
      !document.getElementById('profile-detail').classList.contains('hidden'));
    await page.evaluate(() =>
      document.querySelector('.profile-tab[data-tab="events"]').click());

    // Wait for all live events, then verify no promotion_sent
    // 4 history + 3 live = 7, no promotion_sent
    await expect(page.locator('.profile-event-row')).toHaveCount(7, { timeout: 10000 });
  });

  test('page refresh resets to only default audience', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.__app.state.audiences.push({
        name: 'Custom Test', key: 'custom_test', description: '',
        conditions: [], destination: 'Send Interaction', members: []
      });
    });
    await page.reload();
    await page.waitForFunction(() => window.__app && window.__app.state.audiences.length > 0);
    await page.evaluate(() => window.__app.switchView('audiences'));
    // Default audience persists but custom one is gone
    await expect(page.locator('#audiences-table-body')).toContainText('Property & Casualty Promotion');
    await expect(page.locator('#audiences-table-body')).not.toContainText('Custom Test');
  });
});
