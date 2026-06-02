# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src/test/e2e/callcenter.spec.js >> Call Center Event Types >> tracks various event types with correct colors
- Location: src/test/e2e/callcenter.spec.js:235:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/callcenter.html", waiting until "load"

```

# Test source

```ts
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
  162 |   test('call bar starts idle', async ({ page }) => {
  163 |     await page.goto('/callcenter.html');
  164 |     await page.waitForSelector('#call-bar', { state: 'visible' });
  165 | 
  166 |     const callBarState = await page.evaluate(() => {
  167 |       const callBar = document.getElementById('call-bar');
  168 |       const callStatus = document.getElementById('call-status');
  169 |       return {
  170 |         hasIdleClass: callBar?.classList.contains('idle'),
  171 |         statusText: callStatus?.textContent || ''
  172 |       };
  173 |     });
  174 | 
  175 |     expect(callBarState.hasIdleClass).toBe(true);
  176 |     expect(callBarState.statusText).toBe('No active call');
  177 |   });
  178 | });
  179 | 
  180 | test.describe('Call Center Phone Input Flow', () => {
  181 |   test('phone submission resolves identity and shows OTP overlay', async ({ page }) => {
  182 |     await page.goto('/callcenter.html');
  183 | 
  184 |     await page.waitForFunction(() => {
  185 |       return document.querySelectorAll('.cc-event-row').length >= 2;
  186 |     });
  187 | 
  188 |     await page.evaluate(() => {
  189 |       document.getElementById('call-btn')?.click();
  190 |     });
  191 | 
  192 |     await page.waitForFunction(() => {
  193 |       const phoneOverlay = document.getElementById('phone-overlay');
  194 |       return phoneOverlay && !phoneOverlay.classList.contains('hidden');
  195 |     });
  196 | 
  197 |     await page.fill('#phone-input', '+13125689550');
  198 | 
  199 |     await page.evaluate(() => {
  200 |       document.getElementById('submit-phone-btn')?.click();
  201 |     });
  202 | 
  203 |     await page.waitForFunction(() => {
  204 |       const otpOverlay = document.getElementById('otp-overlay');
  205 |       const identityEvents = Array.from(document.querySelectorAll('.cc-event-name'));
  206 |       return otpOverlay && !otpOverlay.classList.contains('hidden') &&
  207 |              identityEvents.some(el => el.textContent === 'identity_resolved');
  208 |     }, { timeout: 5000 });
  209 | 
  210 |     const profileName = await page.evaluate(() => {
  211 |       return document.getElementById('profile-name')?.textContent || '';
  212 |     });
  213 | 
  214 |     expect(profileName).toContain('Marco Santos');
  215 | 
  216 |     const otpVisible = await page.evaluate(() => {
  217 |       const otpOverlay = document.getElementById('otp-overlay');
  218 |       return otpOverlay && !otpOverlay.classList.contains('hidden');
  219 |     });
  220 | 
  221 |     expect(otpVisible).toBe(true);
  222 |   });
  223 | 
  224 |   // These tests require a live backend (Twilio Functions + CRelay) and are skipped in CI
  225 |   test.skip('OTP verification shows connected overlay and starts call', async () => {});
  226 |   test.skip('end call records disposition and resets UI', async () => {});
  227 | });
  228 | 
  229 | test.describe('Call Center Transcript', () => {
  230 |   // Requires live CRelay backend for transcript polling
  231 |   test.skip('transcript appears during connected call', async () => {});
  232 | });
  233 | 
  234 | test.describe('Call Center Event Types', () => {
  235 |   test('tracks various event types with correct colors', async ({ page }) => {
> 236 |     await page.goto('/callcenter.html');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  237 | 
  238 |     await page.waitForFunction(() => {
  239 |       return document.querySelectorAll('.cc-event-row').length >= 2;
  240 |     });
  241 | 
  242 |     const eventColors = await page.evaluate(() => {
  243 |       const dots = document.querySelectorAll('.cc-event-dot');
  244 |       return Array.from(dots).map(dot => {
  245 |         return Array.from(dot.classList).filter(cls => cls !== 'cc-event-dot');
  246 |       });
  247 |     });
  248 | 
  249 |     expect(eventColors.length).toBeGreaterThan(0);
  250 |     expect(eventColors.some(colors => colors.includes('blue'))).toBe(true);
  251 |   });
  252 | });
  253 | 
```