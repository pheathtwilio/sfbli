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

test.describe('Right Panel Dark Theme', () => {
  test('right panel has dark theme styling', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.right-panel-dark')).toBeVisible();
    await expect(page.locator('.rp-profile-header')).toBeVisible();
    await expect(page.locator('.rp-activity-stream')).toBeVisible();
    await expect(page.locator('.rp-status-bar')).toBeVisible();
  });

  test('right panel shows default state on load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.rp-profile-name')).toContainText('No profile selected');
    await expect(page.locator('.rp-empty')).toBeVisible();
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

  test('selecting profile updates right panel header', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#view-sources', { state: 'visible' });
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 16);
    await page.evaluate(() => document.querySelector('#profile-table-body tr:first-child').click());
    await page.waitForFunction(() => !document.getElementById('profile-detail').classList.contains('hidden'));
    await expect(page.locator('.rp-profile-name')).toContainText('Paul Heath');
    await expect(page.locator('.rp-profile-badges')).toContainText('Agent');
  });
});

test.describe('Demo Flow - Step 1 (Paul Heath)', () => {
  test('events tab shows only email and RCS events for step 1', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#view-sources', { state: 'visible' });
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 16);
    await page.evaluate(() => document.querySelector('#profile-table-body tr:first-child').click());
    await page.waitForFunction(() => !document.getElementById('profile-detail').classList.contains('hidden'));
    await page.evaluate(() => document.querySelector('.profile-tab[data-tab="events"]').click());

    // First event appears immediately (email)
    await expect(page.locator('.profile-event-row')).toHaveCount(1, { timeout: 2000 });
    await expect(page.locator('.profile-event-row').first()).toContainText('Email Delivered: Cross Sell Promotion');

    // Second event (RCS escalation) appears after 4s delay
    await expect(page.locator('.profile-event-row')).toHaveCount(2, { timeout: 6000 });
    await expect(page.locator('.profile-event-row').first()).toContainText('RCS Sent: rcs_sfbli_product_promotion');

    // Verify demo advances to step 2
    await page.waitForFunction(() => window.__app.state.demoStep === 2, { timeout: 8000 });
  });
});

test.describe('Demo Flow - Step 2 (Marco Santos)', () => {
  test('Marco Santos events fire independently', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#view-sources', { state: 'visible' });

    // Navigate directly to Marco Santos (no need to play step 1 first)
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await page.waitForFunction(() => document.querySelectorAll('#profile-table-body tr').length === 16);
    await page.evaluate(() => {
      const rows = document.querySelectorAll('#profile-table-body tr');
      for (const row of rows) {
        if (row.textContent.includes('Marco Santos')) { row.click(); break; }
      }
    });
    await page.waitForFunction(() => !document.getElementById('profile-detail').classList.contains('hidden'));
    await page.evaluate(() => document.querySelector('.profile-tab[data-tab="events"]').click());

    // Marco should get 2 events: journey triggered + RCS sent
    await expect(page.locator('.profile-event-row')).toHaveCount(2, { timeout: 5000 });
    await expect(page.locator('.profile-event-row').last()).toContainText('Journey Triggered');
    await expect(page.locator('.profile-event-row').first()).toContainText('RCS Sent: rcs_sfbli_property_and_casualty');
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

  test('wizard step 1 uses radio cards without emojis', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('audiences'));
    await page.evaluate(() => window.__app.openAudienceWizard());
    await page.waitForFunction(() =>
      !document.getElementById('audience-wizard').classList.contains('hidden'));

    // Verify radio card structure
    await expect(page.locator('.type-card')).toHaveCount(3);
    await expect(page.locator('.type-card.selected')).toHaveCount(1);
    await expect(page.locator('.type-card-radio')).toHaveCount(3);
    await expect(page.locator('.type-card-icon-svg')).toHaveCount(3);

    // Verify labels
    await expect(page.locator('.type-card.selected')).toContainText('Profiles audience');
    await expect(page.locator('.type-card.dimmed').first()).toContainText('Product Based audience');
    await expect(page.locator('.type-card.dimmed').last()).toContainText('Linked audience');
  });

  test('completing wizard creates audience', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('audiences'));
    await page.evaluate(() => window.__app.openAudienceWizard());

    // Step 1: Next
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

    // Step 3: Destinations -> Next
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
  test('journeys list shows empty state without emojis', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('journeys'));
    await expect(page.locator('#journeys-table-body')).toContainText('No journeys yet');
    // Verify no emoji content (wrench emoji &#128736;)
    const emptyIconHtml = await page.locator('.empty-state-icon').innerHTML();
    expect(emptyIconHtml).toContain('svg');
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

test.describe('Page Refresh', () => {
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
    await expect(page.locator('#audiences-table-body')).toContainText('Property & Casualty Promotion');
    await expect(page.locator('#audiences-table-body')).not.toContainText('Custom Test');
  });
});
