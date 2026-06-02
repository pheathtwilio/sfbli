# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src/test/e2e/callcenter.spec.js >> Call Center Layout >> profile starts as anonymous
- Location: src/test/e2e/callcenter.spec.js:60:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/callcenter.html", waiting until "load"

```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | 
  3   | test.describe('Call Center Layout', () => {
  4   |   test('renders split-screen layout', async ({ page }) => {
  5   |     await page.goto('/callcenter.html');
  6   | 
  7   |     await page.waitForFunction(() => {
  8   |       const layout = document.querySelector('.cc-layout');
  9   |       const site = document.querySelector('.cc-site');
  10  |       const eventsPanel = document.querySelector('.cc-events-panel');
  11  |       return layout && site && eventsPanel;
  12  |     });
  13  | 
  14  |     await expect(page.locator('.cc-layout')).toBeVisible();
  15  |     await expect(page.locator('.cc-site')).toBeVisible();
  16  |     await expect(page.locator('.cc-events-panel')).toBeVisible();
  17  |   });
  18  | 
  19  |   test('has nav overlay with clickable links', async ({ page }) => {
  20  |     await page.goto('/callcenter.html');
  21  | 
  22  |     await page.waitForFunction(() => {
  23  |       return document.querySelectorAll('.cc-nav-link').length >= 3;
  24  |     });
  25  | 
  26  |     const navLinks = await page.evaluate(() => {
  27  |       return Array.from(document.querySelectorAll('.cc-nav-link')).map(el => el.textContent.trim());
  28  |     });
  29  | 
  30  |     expect(navLinks).toContain('Products');
  31  | 
  32  |     const sidebarItems = await page.evaluate(() => {
  33  |       return Array.from(document.querySelectorAll('.cc-sidebar-label')).map(el => el.textContent.trim());
  34  |     });
  35  | 
  36  |     expect(sidebarItems).toContain('Report Claim');
  37  |   });
  38  | 
  39  |   test('starts on policies page with initial events', async ({ page }) => {
  40  |     await page.goto('/callcenter.html');
  41  | 
  42  |     await page.waitForFunction(() => {
  43  |       const eventRows = document.querySelectorAll('.cc-event-row');
  44  |       return eventRows.length >= 2;
  45  |     }, { timeout: 5000 });
  46  | 
  47  |     const eventCount = await page.evaluate(() => {
  48  |       return document.querySelectorAll('.cc-event-row').length;
  49  |     });
  50  | 
  51  |     expect(eventCount).toBeGreaterThanOrEqual(2);
  52  | 
  53  |     const eventNames = await page.evaluate(() => {
  54  |       return Array.from(document.querySelectorAll('.cc-event-name')).map(el => el.textContent);
  55  |     });
  56  | 
  57  |     expect(eventNames).toContain('page_view');
  58  |   });
  59  | 
  60  |   test('profile starts as anonymous', async ({ page }) => {
> 61  |     await page.goto('/callcenter.html');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  62  |     await page.waitForSelector('#profile-name', { state: 'visible' });
  63  | 
  64  |     const profileName = await page.evaluate(() => {
  65  |       return document.getElementById('profile-name')?.textContent || '';
  66  |     });
  67  | 
  68  |     expect(profileName).toBe('Anonymous Visitor');
  69  |   });
  70  | 
  71  |   test('screenshot backgrounds load correctly', async ({ page }) => {
  72  |     await page.goto('/callcenter.html');
  73  | 
  74  |     await page.waitForFunction(() => {
  75  |       const img = document.querySelector('.cc-bg-img');
  76  |       return img && img.complete && img.naturalWidth > 0;
  77  |     }, { timeout: 5000 });
  78  | 
  79  |     const imgSrc = await page.evaluate(() => {
  80  |       const img = document.querySelector('.cc-bg-img');
  81  |       return img ? img.src : '';
  82  |     });
  83  | 
  84  |     expect(imgSrc).toContain('screenshots/');
  85  |   });
  86  | });
  87  | 
  88  | test.describe('Call Center Flow', () => {
  89  |   test('click to call shows phone input', async ({ page }) => {
  90  |     await page.goto('/callcenter.html');
  91  | 
  92  |     await page.waitForFunction(() => {
  93  |       return document.querySelectorAll('.cc-event-row').length >= 2;
  94  |     });
  95  | 
  96  |     await page.evaluate(() => {
  97  |       const callBtn = document.getElementById('call-btn');
  98  |       if (callBtn) callBtn.click();
  99  |     });
  100 | 
  101 |     await page.waitForFunction(() => {
  102 |       const phoneOverlay = document.getElementById('phone-overlay');
  103 |       return phoneOverlay && !phoneOverlay.classList.contains('hidden');
  104 |     });
  105 | 
  106 |     const phoneOverlayVisible = await page.evaluate(() => {
  107 |       const phoneOverlay = document.getElementById('phone-overlay');
  108 |       return phoneOverlay && !phoneOverlay.classList.contains('hidden');
  109 |     });
  110 | 
  111 |     expect(phoneOverlayVisible).toBe(true);
  112 | 
  113 |     await page.waitForFunction(() => {
  114 |       const eventNames = Array.from(document.querySelectorAll('.cc-event-name'));
  115 |       return eventNames.some(el => el.textContent === 'button_click');
  116 |     });
  117 | 
  118 |     const hasButtonClickEvent = await page.evaluate(() => {
  119 |       const eventNames = Array.from(document.querySelectorAll('.cc-event-name'));
  120 |       return eventNames.some(el => el.textContent === 'button_click');
  121 |     });
  122 | 
  123 |     expect(hasButtonClickEvent).toBe(true);
  124 |   });
  125 | 
  126 |   test('nav links switch pages and update screenshot', async ({ page }) => {
  127 |     await page.goto('/callcenter.html');
  128 | 
  129 |     await page.waitForFunction(() => {
  130 |       return document.querySelectorAll('.cc-event-row').length >= 2;
  131 |     });
  132 | 
  133 |     // Click Report Claim sidebar item
  134 |     await page.evaluate(() => {
  135 |       const claimsItem = Array.from(document.querySelectorAll('.cc-sidebar-item'))
  136 |         .find(el => el.dataset.page === 'claims');
  137 |       if (claimsItem) claimsItem.click();
  138 |     });
  139 | 
  140 |     // Wait for screenshot to change to claims
  141 |     await page.waitForFunction(() => {
  142 |       const img = document.querySelector('.cc-bg-img');
  143 |       return img && img.src.includes('claims.png');
  144 |     }, { timeout: 5000 });
  145 | 
  146 |     const imgSrc = await page.evaluate(() => {
  147 |       const img = document.querySelector('.cc-bg-img');
  148 |       return img ? img.src : '';
  149 |     });
  150 | 
  151 |     expect(imgSrc).toContain('claims.png');
  152 | 
  153 |     // Verify a new page_view event was added
  154 |     const eventNames = await page.evaluate(() => {
  155 |       return Array.from(document.querySelectorAll('.cc-event-name')).map(el => el.textContent);
  156 |     });
  157 | 
  158 |     const pageViewCount = eventNames.filter(n => n === 'page_view').length;
  159 |     expect(pageViewCount).toBeGreaterThanOrEqual(3); // home, policies, claims
  160 |   });
  161 | 
```