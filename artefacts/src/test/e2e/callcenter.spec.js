const { test, expect } = require('@playwright/test');

test.describe('Call Center Layout', () => {
  test('renders split-screen layout', async ({ page }) => {
    await page.goto('/callcenter.html');

    // Use waitForFunction to check visibility
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

  test('shows SFBLI nav with correct links', async ({ page }) => {
    await page.goto('/callcenter.html');
    await page.waitForSelector('.cc-site-nav', { state: 'visible' });

    const navText = await page.evaluate(() => {
      const nav = document.querySelector('.cc-site-nav');
      return nav ? nav.textContent : '';
    });

    expect(navText).toContain('SFBLI');

    const linkCount = await page.evaluate(() => {
      return document.querySelectorAll('.cc-site-nav-link').length;
    });

    expect(linkCount).toBe(4);
  });

  test('starts on policies page with initial events', async ({ page }) => {
    await page.goto('/callcenter.html');

    // Wait for both page_view events (home and policies)
    await page.waitForFunction(() => {
      const eventRows = document.querySelectorAll('.cc-event-row');
      return eventRows.length >= 2;
    }, { timeout: 5000 });

    const eventCount = await page.evaluate(() => {
      return document.querySelectorAll('.cc-event-row').length;
    });

    expect(eventCount).toBeGreaterThanOrEqual(2);

    // Verify events contain page_view entries
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
});

test.describe('Call Center Flow', () => {
  test('click to call shows phone input', async ({ page }) => {
    await page.goto('/callcenter.html');

    // Wait for policies page to load
    await page.waitForFunction(() => {
      return document.querySelectorAll('.cc-event-row').length >= 2;
    });

    // Click the "Call Us Now" button using evaluate
    await page.evaluate(() => {
      const callBtn = document.getElementById('call-btn');
      if (callBtn) callBtn.click();
    });

    // Wait for phone overlay to be visible
    await page.waitForFunction(() => {
      const phoneOverlay = document.getElementById('phone-overlay');
      return phoneOverlay && !phoneOverlay.classList.contains('hidden');
    });

    // Verify phone overlay is visible
    const phoneOverlayVisible = await page.evaluate(() => {
      const phoneOverlay = document.getElementById('phone-overlay');
      return phoneOverlay && !phoneOverlay.classList.contains('hidden');
    });

    expect(phoneOverlayVisible).toBe(true);

    // Verify button_click event was added
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

  test('nav links switch pages', async ({ page }) => {
    await page.goto('/callcenter.html');

    // Wait for initial page load
    await page.waitForFunction(() => {
      return document.querySelectorAll('.cc-event-row').length >= 2;
    });

    // Click claims nav link using evaluate
    await page.evaluate(() => {
      const claimsLink = Array.from(document.querySelectorAll('.cc-site-nav-link'))
        .find(link => link.dataset.page === 'claims');
      if (claimsLink) claimsLink.click();
    });

    // Wait for content to update
    await page.waitForFunction(() => {
      const content = document.getElementById('site-content');
      return content && content.textContent.includes('My Claims');
    });

    // Verify content contains "My Claims"
    const contentText = await page.evaluate(() => {
      return document.getElementById('site-content')?.textContent || '';
    });

    expect(contentText).toContain('My Claims');
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

    // Wait for policies page
    await page.waitForFunction(() => {
      return document.querySelectorAll('.cc-event-row').length >= 2;
    });

    // Click call button
    await page.evaluate(() => {
      document.getElementById('call-btn')?.click();
    });

    // Wait for phone overlay
    await page.waitForFunction(() => {
      const phoneOverlay = document.getElementById('phone-overlay');
      return phoneOverlay && !phoneOverlay.classList.contains('hidden');
    });

    // Enter phone number
    await page.fill('#phone-input', '+13125689550');

    // Click submit button
    await page.evaluate(() => {
      document.getElementById('submit-phone-btn')?.click();
    });

    // Wait for identity resolution and OTP overlay
    await page.waitForFunction(() => {
      const otpOverlay = document.getElementById('otp-overlay');
      const identityEvents = Array.from(document.querySelectorAll('.cc-event-name'));
      return otpOverlay && !otpOverlay.classList.contains('hidden') &&
             identityEvents.some(el => el.textContent === 'identity_resolved');
    }, { timeout: 5000 });

    // Verify identity was resolved
    const profileName = await page.evaluate(() => {
      return document.getElementById('profile-name')?.textContent || '';
    });

    expect(profileName).toContain('Maria Santos');

    // Verify OTP overlay is visible
    const otpVisible = await page.evaluate(() => {
      const otpOverlay = document.getElementById('otp-overlay');
      return otpOverlay && !otpOverlay.classList.contains('hidden');
    });

    expect(otpVisible).toBe(true);
  });

  test('OTP verification shows connected overlay and starts call', async ({ page }) => {
    await page.goto('/callcenter.html');

    // Navigate through flow
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
      return otpOverlay && !otpOverlay.classList.contains('hidden');
    });

    // Enter OTP code (any 6 digits work in demo mode)
    await page.evaluate(() => {
      const digits = document.querySelectorAll('.cc-otp-digit');
      digits[0].value = '1';
      digits[1].value = '2';
      digits[2].value = '3';
      digits[3].value = '4';
      digits[4].value = '5';
      digits[5].value = '6';
    });

    // Click verify button
    await page.evaluate(() => {
      document.getElementById('verify-otp-btn')?.click();
    });

    // Wait for connected overlay and call to be active
    await page.waitForFunction(() => {
      const connectedOverlay = document.getElementById('connected-overlay');
      const callBar = document.getElementById('call-bar');
      return connectedOverlay && !connectedOverlay.classList.contains('hidden') &&
             callBar && callBar.classList.contains('active');
    }, { timeout: 5000 });

    // Verify connected overlay is visible
    const connectedVisible = await page.evaluate(() => {
      const connectedOverlay = document.getElementById('connected-overlay');
      return connectedOverlay && !connectedOverlay.classList.contains('hidden');
    });

    expect(connectedVisible).toBe(true);

    // Verify call bar is active
    const callBarActive = await page.evaluate(() => {
      const callBar = document.getElementById('call-bar');
      const callStatus = document.getElementById('call-status');
      return {
        hasActiveClass: callBar?.classList.contains('active'),
        statusText: callStatus?.textContent || ''
      };
    });

    expect(callBarActive.hasActiveClass).toBe(true);
    expect(callBarActive.statusText).toBe('Call in progress');

    // Verify call timer is visible
    const timerVisible = await page.evaluate(() => {
      const timer = document.getElementById('call-timer');
      return timer && !timer.classList.contains('hidden');
    });

    expect(timerVisible).toBe(true);
  });

  test('end call records disposition and resets UI', async ({ page }) => {
    await page.goto('/callcenter.html');

    // Navigate through entire flow
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
      return otpOverlay && !otpOverlay.classList.contains('hidden');
    });

    await page.evaluate(() => {
      const digits = document.querySelectorAll('.cc-otp-digit');
      digits[0].value = '1';
      digits[1].value = '2';
      digits[2].value = '3';
      digits[3].value = '4';
      digits[4].value = '5';
      digits[5].value = '6';
      document.getElementById('verify-otp-btn')?.click();
    });

    await page.waitForFunction(() => {
      const connectedOverlay = document.getElementById('connected-overlay');
      return connectedOverlay && !connectedOverlay.classList.contains('hidden');
    });

    // Click end call button
    await page.evaluate(() => {
      document.getElementById('end-call-btn')?.click();
    });

    // Wait for call to end and disposition to be recorded
    await page.waitForFunction(() => {
      const eventNames = Array.from(document.querySelectorAll('.cc-event-name'));
      return eventNames.some(el => el.textContent === 'call_ended') &&
             eventNames.some(el => el.textContent === 'disposition_recorded');
    }, { timeout: 5000 });

    // Verify disposition event exists
    const hasDispositionEvent = await page.evaluate(() => {
      const eventNames = Array.from(document.querySelectorAll('.cc-event-name'));
      return eventNames.some(el => el.textContent === 'disposition_recorded');
    });

    expect(hasDispositionEvent).toBe(true);

    // Verify call bar is idle
    const callBarIdle = await page.evaluate(() => {
      const callBar = document.getElementById('call-bar');
      return callBar?.classList.contains('idle');
    });

    expect(callBarIdle).toBe(true);

    // Verify call overlay is visible again
    const callOverlayVisible = await page.evaluate(() => {
      const callOverlay = document.getElementById('call-overlay');
      return callOverlay && !callOverlay.classList.contains('hidden');
    });

    expect(callOverlayVisible).toBe(true);
  });
});

test.describe('Call Center Transcript', () => {
  test('transcript appears during connected call', async ({ page }) => {
    await page.goto('/callcenter.html');

    // Navigate through flow to connected state
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
      return otpOverlay && !otpOverlay.classList.contains('hidden');
    });

    await page.evaluate(() => {
      const digits = document.querySelectorAll('.cc-otp-digit');
      digits[0].value = '1';
      digits[1].value = '2';
      digits[2].value = '3';
      digits[3].value = '4';
      digits[4].value = '5';
      digits[5].value = '6';
      document.getElementById('verify-otp-btn')?.click();
    });

    await page.waitForFunction(() => {
      const connectedOverlay = document.getElementById('connected-overlay');
      return connectedOverlay && !connectedOverlay.classList.contains('hidden');
    });

    // Wait for transcript section to appear (demo mode adds entries after delay)
    await page.waitForFunction(() => {
      const transcriptSection = document.getElementById('transcript-section');
      return transcriptSection && !transcriptSection.classList.contains('hidden');
    }, { timeout: 8000 });

    // Verify transcript section is visible
    const transcriptVisible = await page.evaluate(() => {
      const transcriptSection = document.getElementById('transcript-section');
      return transcriptSection && !transcriptSection.classList.contains('hidden');
    });

    expect(transcriptVisible).toBe(true);

    // Wait for at least one transcript entry
    await page.waitForFunction(() => {
      return document.querySelectorAll('.cc-transcript-entry').length > 0;
    }, { timeout: 5000 });

    const transcriptCount = await page.evaluate(() => {
      return document.querySelectorAll('.cc-transcript-entry').length;
    });

    expect(transcriptCount).toBeGreaterThan(0);
  });
});

test.describe('Call Center Event Types', () => {
  test('tracks various event types with correct colors', async ({ page }) => {
    await page.goto('/callcenter.html');

    // Wait for initial events
    await page.waitForFunction(() => {
      return document.querySelectorAll('.cc-event-row').length >= 2;
    });

    // Verify event dots have colors
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
