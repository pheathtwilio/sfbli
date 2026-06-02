# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src/test/e2e/dashboard.spec.js >> Journeys >> journeys list shows empty state without emojis
- Location: src/test/e2e/dashboard.spec.js:206:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
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
  134 |     await page.goto('/');
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
> 207 |     await page.goto('/');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
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
  235 |     });
  236 |     await page.reload();
  237 |     await page.waitForFunction(() => window.__app && window.__app.state.audiences.length > 0);
  238 |     await page.evaluate(() => window.__app.switchView('audiences'));
  239 |     await expect(page.locator('#audiences-table-body')).toContainText('Property & Casualty Promotion');
  240 |     await expect(page.locator('#audiences-table-body')).not.toContainText('Custom Test');
  241 |   });
  242 | });
  243 | 
```