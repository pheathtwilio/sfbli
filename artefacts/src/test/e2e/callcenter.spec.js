const { test, expect } = require('@playwright/test');

test.describe('Call Center Layout', () => {
  test('renders split-screen layout', async ({ page }) => {
    await page.goto('/callcenter.html');

    await page.waitForFunction(() => {
      const layout = document.querySelector('.cc-layout');
      const site = document.querySelector('.cc-site');
      const eventsPanel = document.querySelector('.cc-events-panel');
      return layout && site && eventsPanel;
    });

    await expect(page.locator('.cc-layout')).toBeVisible();
    await expect(page.locator('.cc-site')).toBeVisible();
    await expect(page.locator('.cc-events-panel')).toBeVisible();
  });

  test('has nav overlay with clickable links', async ({ page }) => {
    await page.goto('/callcenter.html');

    await page.waitForFunction(() => {
      return document.querySelectorAll('.cc-nav-link').length >= 3;
    });

    const navLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cc-nav-link')).map(el => el.textContent.trim());
    });

    expect(navLinks).toContain('Products');

    const sidebarItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cc-sidebar-label')).map(el => el.textContent.trim());
    });

    expect(sidebarItems).toContain('Report Claim');
  });

  test('starts on policies page with initial events', async ({ page }) => {
    await page.goto('/callcenter.html');

    await page.waitForFunction(() => {
      const eventRows = document.querySelectorAll('.cc-event-row');
      return eventRows.length >= 2;
    }, { timeout: 5000 });

    const eventCount = await page.evaluate(() => {
      return document.querySelectorAll('.cc-event-row').length;
    });

    expect(eventCount).toBeGreaterThanOrEqual(2);

    const eventNames = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cc-event-name')).map(el => el.textContent);
    });

    expect(eventNames).toContain('page_view');
  });

  test('profile starts as anonymous', async ({ page }) => {
    await page.goto('/callcenter.html');
    await page.waitForSelector('#profile-name', { state: 'visible' });

    const profileName = await page.evaluate(() => {
      return document.getElementById('profile-name')?.textContent || '';
    });

    expect(profileName).toBe('Anonymous Visitor');
  });

  test('screenshot backgrounds load correctly', async ({ page }) => {
    await page.goto('/callcenter.html');

    await page.waitForFunction(() => {
      const img = document.querySelector('.cc-bg-img');
      return img && img.complete && img.naturalWidth > 0;
    }, { timeout: 5000 });

    const imgSrc = await page.evaluate(() => {
      const img = document.querySelector('.cc-bg-img');
      return img ? img.src : '';
    });

    expect(imgSrc).toContain('screenshots/');
  });
});

test.describe('Call Center Flow', () => {
  test('click to call shows phone input', async ({ page }) => {
    await page.goto('/callcenter.html');

    await page.waitForFunction(() => {
      return document.querySelectorAll('.cc-event-row').length >= 2;
    });

    await page.evaluate(() => {
      const callBtn = document.getElementById('call-btn');
      if (callBtn) callBtn.click();
    });

    await page.waitForFunction(() => {
      const phoneOverlay = document.getElementById('phone-overlay');
      return phoneOverlay && !phoneOverlay.classList.contains('hidden');
    });

    const phoneOverlayVisible = await page.evaluate(() => {
      const phoneOverlay = document.getElementById('phone-overlay');
      return phoneOverlay && !phoneOverlay.classList.contains('hidden');
    });

    expect(phoneOverlayVisible).toBe(true);

    await page.waitForFunction(() => {
      const eventNames = Array.from(document.querySelectorAll('.cc-event-name'));
      return eventNames.some(el => el.textContent === 'button_click');
    });

    const hasButtonClickEvent = await page.evaluate(() => {
      const eventNames = Array.from(document.querySelectorAll('.cc-event-name'));
      return eventNames.some(el => el.textContent === 'button_click');
    });

    expect(hasButtonClickEvent).toBe(true);
  });

  test('nav links switch pages and update screenshot', async ({ page }) => {
    await page.goto('/callcenter.html');

    await page.waitForFunction(() => {
      return document.querySelectorAll('.cc-event-row').length >= 2;
    });

    // Click Report Claim sidebar item
    await page.evaluate(() => {
      const claimsItem = Array.from(document.querySelectorAll('.cc-sidebar-item'))
        .find(el => el.dataset.page === 'claims');
      if (claimsItem) claimsItem.click();
    });

    // Wait for screenshot to change to claims
    await page.waitForFunction(() => {
      const img = document.querySelector('.cc-bg-img');
      return img && img.src.includes('claims.png');
    }, { timeout: 5000 });

    const imgSrc = await page.evaluate(() => {
      const img = document.querySelector('.cc-bg-img');
      return img ? img.src : '';
    });

    expect(imgSrc).toContain('claims.png');

    // Verify a new page_view event was added
    const eventNames = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.cc-event-name')).map(el => el.textContent);
    });

    const pageViewCount = eventNames.filter(n => n === 'page_view').length;
    expect(pageViewCount).toBeGreaterThanOrEqual(3); // home, policies, claims
  });

  test('call bar starts idle', async ({ page }) => {
    await page.goto('/callcenter.html');
    await page.waitForSelector('#call-bar', { state: 'visible' });

    const callBarState = await page.evaluate(() => {
      const callBar = document.getElementById('call-bar');
      const callStatus = document.getElementById('call-status');
      return {
        hasIdleClass: callBar?.classList.contains('idle'),
        statusText: callStatus?.textContent || ''
      };
    });

    expect(callBarState.hasIdleClass).toBe(true);
    expect(callBarState.statusText).toBe('No active call');
  });
});

test.describe('Call Center Phone Input Flow', () => {
  test('phone submission resolves identity and shows OTP overlay', async ({ page }) => {
    await page.goto('/callcenter.html');

    await page.waitForFunction(() => {
      return document.querySelectorAll('.cc-event-row').length >= 2;
    });

    await page.evaluate(() => {
      document.getElementById('call-btn')?.click();
    });

    await page.waitForFunction(() => {
      const phoneOverlay = document.getElementById('phone-overlay');
      return phoneOverlay && !phoneOverlay.classList.contains('hidden');
    });

    await page.fill('#phone-input', '+13125689550');

    await page.evaluate(() => {
      document.getElementById('submit-phone-btn')?.click();
    });

    await page.waitForFunction(() => {
      const otpOverlay = document.getElementById('otp-overlay');
      const identityEvents = Array.from(document.querySelectorAll('.cc-event-name'));
      return otpOverlay && !otpOverlay.classList.contains('hidden') &&
             identityEvents.some(el => el.textContent === 'identity_resolved');
    }, { timeout: 5000 });

    const profileName = await page.evaluate(() => {
      return document.getElementById('profile-name')?.textContent || '';
    });

    expect(profileName).toContain('Marco Santos');

    const otpVisible = await page.evaluate(() => {
      const otpOverlay = document.getElementById('otp-overlay');
      return otpOverlay && !otpOverlay.classList.contains('hidden');
    });

    expect(otpVisible).toBe(true);
  });

  // These tests require a live backend (Twilio Functions + CRelay) and are skipped in CI
  test.skip('OTP verification shows connected overlay and starts call', async () => {});
  test.skip('end call records disposition and resets UI', async () => {});
});

test.describe('Call Center Transcript', () => {
  // Requires live CRelay backend for transcript polling
  test.skip('transcript appears during connected call', async () => {});
});

test.describe('Call Center Event Types', () => {
  test('tracks various event types with correct colors', async ({ page }) => {
    await page.goto('/callcenter.html');

    await page.waitForFunction(() => {
      return document.querySelectorAll('.cc-event-row').length >= 2;
    });

    const eventColors = await page.evaluate(() => {
      const dots = document.querySelectorAll('.cc-event-dot');
      return Array.from(dots).map(dot => {
        return Array.from(dot.classList).filter(cls => cls !== 'cc-event-dot');
      });
    });

    expect(eventColors.length).toBeGreaterThan(0);
    expect(eventColors.some(colors => colors.includes('blue'))).toBe(true);
  });
});
