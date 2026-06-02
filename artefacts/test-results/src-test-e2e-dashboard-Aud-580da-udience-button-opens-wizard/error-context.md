# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src/test/e2e/dashboard.spec.js >> Audiences >> new audience button opens wizard
- Location: src/test/e2e/dashboard.spec.js:133:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
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
  129 |     await page.evaluate(() => window.__app.switchView('audiences'));
  130 |     await expect(page.locator('#audiences-table-body')).toContainText('Property & Casualty Promotion');
  131 |   });
  132 | 
  133 |   test('new audience button opens wizard', async ({ page }) => {
> 134 |     await page.goto('/');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  135 |     await page.evaluate(() => window.__app.switchView('audiences'));
  136 |     await page.waitForFunction(() =>
  137 |       !document.getElementById('view-audiences').classList.contains('hidden'));
  138 |     await page.evaluate(() => window.__app.openAudienceWizard());
  139 |     await page.waitForFunction(() =>
  140 |       !document.getElementById('audience-wizard').classList.contains('hidden'));
  141 |     await expect(page.locator('#audience-wizard')).toBeVisible();
  142 |   });
  143 | 
  144 |   test('wizard step 1 uses radio cards without emojis', async ({ page }) => {
  145 |     await page.goto('/');
  146 |     await page.evaluate(() => window.__app.switchView('audiences'));
  147 |     await page.evaluate(() => window.__app.openAudienceWizard());
  148 |     await page.waitForFunction(() =>
  149 |       !document.getElementById('audience-wizard').classList.contains('hidden'));
  150 | 
  151 |     // Verify radio card structure
  152 |     await expect(page.locator('.type-card')).toHaveCount(3);
  153 |     await expect(page.locator('.type-card.selected')).toHaveCount(1);
  154 |     await expect(page.locator('.type-card-radio')).toHaveCount(3);
  155 |     await expect(page.locator('.type-card-icon-svg')).toHaveCount(3);
  156 | 
  157 |     // Verify labels
  158 |     await expect(page.locator('.type-card.selected')).toContainText('Profiles audience');
  159 |     await expect(page.locator('.type-card.dimmed').first()).toContainText('Product Based audience');
  160 |     await expect(page.locator('.type-card.dimmed').last()).toContainText('Linked audience');
  161 |   });
  162 | 
  163 |   test('completing wizard creates audience', async ({ page }) => {
  164 |     await page.goto('/');
  165 |     await page.evaluate(() => window.__app.switchView('audiences'));
  166 |     await page.evaluate(() => window.__app.openAudienceWizard());
  167 | 
  168 |     // Step 1: Next
  169 |     await page.evaluate(() =>
  170 |       document.getElementById('wizard-next-btn').click());
  171 | 
  172 |     // Step 2: Add condition
  173 |     await page.evaluate(() => {
  174 |       document.getElementById('cond-trait').value = 'target_attainment';
  175 |       document.getElementById('cond-trait').dispatchEvent(new Event('change'));
  176 |       document.getElementById('cond-operator').value = 'greater than';
  177 |       document.getElementById('cond-operator').dispatchEvent(new Event('change'));
  178 |       document.getElementById('cond-value').value = '60';
  179 |       document.getElementById('cond-value').dispatchEvent(new Event('input'));
  180 |     });
  181 | 
  182 |     // Check preview shows 4 matches
  183 |     await expect(page.locator('.audience-preview-count')).toContainText('4');
  184 | 
  185 |     // Next
  186 |     await page.evaluate(() =>
  187 |       document.getElementById('wizard-next-btn').click());
  188 | 
  189 |     // Step 3: Destinations -> Next
  190 |     await page.evaluate(() =>
  191 |       document.getElementById('wizard-next-btn').click());
  192 | 
  193 |     // Step 4: Enter name and create
  194 |     await page.fill('[data-field="audience-name"]', 'Cross-Sell');
  195 |     await page.evaluate(() =>
  196 |       document.getElementById('wizard-create-btn').click());
  197 | 
  198 |     // Should show audience detail
  199 |     await page.waitForFunction(() =>
  200 |       !document.getElementById('audience-detail').classList.contains('hidden'));
  201 |     await expect(page.locator('#audience-detail')).toContainText('Cross-Sell');
  202 |   });
  203 | });
  204 | 
  205 | test.describe('Journeys', () => {
  206 |   test('journeys list shows empty state without emojis', async ({ page }) => {
  207 |     await page.goto('/');
  208 |     await page.evaluate(() => window.__app.switchView('journeys'));
  209 |     await expect(page.locator('#journeys-table-body')).toContainText('No journeys yet');
  210 |     // Verify no emoji content (wrench emoji &#128736;)
  211 |     const emptyIconHtml = await page.locator('.empty-state-icon').innerHTML();
  212 |     expect(emptyIconHtml).toContain('svg');
  213 |   });
  214 | 
  215 |   test('create journey button opens wizard', async ({ page }) => {
  216 |     await page.goto('/');
  217 |     await page.evaluate(() => window.__app.switchView('journeys'));
  218 |     await page.waitForFunction(() =>
  219 |       !document.getElementById('view-journeys').classList.contains('hidden'));
  220 |     await page.evaluate(() => window.__app.openJourneyWizard());
  221 |     await page.waitForFunction(() =>
  222 |       !document.getElementById('journey-wizard').classList.contains('hidden'));
  223 |     await expect(page.locator('#journey-wizard')).toBeVisible();
  224 |   });
  225 | });
  226 | 
  227 | test.describe('Page Refresh', () => {
  228 |   test('page refresh resets to only default audience', async ({ page }) => {
  229 |     await page.goto('/');
  230 |     await page.evaluate(() => {
  231 |       window.__app.state.audiences.push({
  232 |         name: 'Custom Test', key: 'custom_test', description: '',
  233 |         conditions: [], destination: 'Send Interaction', members: []
  234 |       });
```