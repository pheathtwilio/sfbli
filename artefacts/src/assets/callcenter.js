(function() {
  'use strict';

  // Config - FUNCTIONS_BASE is empty when deployed to Twilio Functions (same origin)
  // CRELAY_BASE is fetched from the config Function (reads CRELAY_BASE_URL from .env)
  const FUNCTIONS_BASE = '';
  let CRELAY_BASE = '';

  // Customer profiles — page determines which customer is used
  const MARCO = {
    id: 'cust_001',
    name: 'Marco Santos',
    phone: '+13125689550',
    email: 'pheath@twilio.com',
    policy_type: 'Whole Life',
    policy_number: 'POLICY01',
    premium: '$2,400/yr',
    coverage: '$350,000',
    renewal: '2026-08-15',
    risk_score: 'Low',
    claim_count: 2,
    customer_since: '2021',
    claims: [
      { number: 'CL-2025-0891', date: '2025-11-03', status: 'Under Review', amount: '$4,200' },
      { number: 'CL-2024-1456', date: '2024-06-22', status: 'Settled', amount: '$2,800' }
    ]
  };

  const JILL = {
    id: 'cust_003',
    name: 'Jill Barrientos',
    phone: '+17187100034',
    email: 'jbarrientos@twilio.com',
    policy_type: 'Homeowners',
    policy_number: 'POLICY02',
    premium: '$3,100/yr',
    coverage: '$475,000',
    renewal: '2026-11-20',
    risk_score: 'Medium',
    claim_count: 2,
    customer_since: '2018',
    claims: [
      { number: 'CL-2025-1247', date: '2025-11-03', status: 'Under Review', amount: '$8,500' },
      { number: 'CL-2024-0832', date: '2024-06-15', status: 'Settled', amount: '$3,200' }
    ]
  };

  const CUSTOMERS = [MARCO, JILL];

  // State
  const state = {
    currentPage: 'home',
    phase: 'browsing', // browsing, phone_input, otp_verify, connected, call_ended
    customer: null,
    events: [],
    transcript: [],
    callSid: null,
    callTimer: null,
    callSeconds: 0,
    transcriptPollInterval: null,
    otpAttempts: 0,
    disposition: null,
    handoffDetected: false,
    lastTranscriptIndex: 0
  };

  // DOM helpers
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }
  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  // Format timestamp
  function formatTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  // Event stream - add colored dot event to #event-list
  function addEvent(type, name, detail, dotColor = 'blue') {
    const event = { type, name, detail, timestamp: formatTime(), dotColor };
    state.events.push(event);

    const eventList = $('#event-list');
    const eventRow = document.createElement('div');
    eventRow.className = type === 'identity' ? 'cc-event-row identity' : 'cc-event-row';

    eventRow.innerHTML = `
      <div class="cc-event-dot ${dotColor}"></div>
      <div class="cc-event-content">
        <div class="cc-event-name">${name}</div>
        <div class="cc-event-detail">${detail}</div>
        <div class="cc-event-timestamp">${event.timestamp}</div>
      </div>
    `;

    eventList.appendChild(eventRow);
    const stream = eventList.closest('.cc-events-stream');
    if (stream) stream.scrollTop = stream.scrollHeight;
  }

  // Transcript - add ai/customer entry to #transcript-list
  function addTranscript(role, text) {
    const entry = { role, text, timestamp: formatTime() };
    state.transcript.push(entry);

    const transcriptList = $('#transcript-list');
    const transcriptEntry = document.createElement('div');
    transcriptEntry.className = `cc-transcript-entry ${role}`;

    transcriptEntry.innerHTML = `
      <div class="cc-transcript-role">${role === 'ai' ? 'AI Agent' : 'Customer'}</div>
      <div class="cc-transcript-text">${text}</div>
    `;

    transcriptList.appendChild(transcriptEntry);
    const stream = transcriptList.closest('.cc-events-stream');
    if (stream) stream.scrollTop = stream.scrollHeight;

    // Show transcript section if hidden
    const transcriptSection = $('#transcript-section');
    if (transcriptSection.classList.contains('hidden')) {
      show(transcriptSection);
    }
  }

  // Profile resolution - look up customer by phone number
  function resolveIdentity(phone) {
    const digits = phone.replace(/\D/g, '').slice(-10);
    const customer = CUSTOMERS.find(c => c.phone.replace(/\D/g, '').slice(-10) === digits);
    if (!customer) return null;

    state.customer = customer;

    // Update profile UI
    const avatar = $('#profile-avatar');
    const name = $('#profile-name');
    const id = $('#profile-id');
    const badges = $('#profile-badges');

    const initials = customer.name.split(' ').map(n => n[0]).join('');
    avatar.textContent = initials;
    name.textContent = customer.name;
    id.textContent = customer.id;
    badges.innerHTML = `
      <span class="cc-profile-badge identified">Identified</span>
      <span class="cc-profile-badge">${customer.policy_type}</span>
    `;

    // Add identity event
    addEvent('identity', 'identity_resolved', `${customer.name} (${customer.id})`, 'green');

    return customer;
  }

  // API calls — FUNCTIONS_BASE is empty string when same-origin (Twilio Functions)
  async function callLookup(phone) {
    try {
      const response = await fetch(`${FUNCTIONS_BASE}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      return await response.json();
    } catch (error) {
      console.error('Lookup error:', error);
      return { error: error.message };
    }
  }

  async function callVerifyStart(phone) {
    try {
      const response = await fetch(`${FUNCTIONS_BASE}/verify-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      return await response.json();
    } catch (error) {
      console.error('Verify start error:', error);
      return { error: error.message };
    }
  }

  async function callVerifyCheck(phone, code) {
    try {
      const response = await fetch(`${FUNCTIONS_BASE}/verify-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      return await response.json();
    } catch (error) {
      console.error('Verify check error:', error);
      return { valid: false, error: error.message };
    }
  }

  // CRelay context POST (browser-side, best-effort)
  async function postContextToCRelay(context) {
    if (!CRELAY_BASE) {
      console.warn('CRELAY_BASE not set, skipping context POST');
      return {};
    }

    try {
      const response = await fetch(`${CRELAY_BASE}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
      return await response.json();
    } catch (error) {
      console.error('CRelay context post error:', error);
      return { error: error.message };
    }
  }

  // Call initiation
  async function callInitiate(phone) {
    try {
      const response = await fetch(`${FUNCTIONS_BASE}/initiate-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerPhone: phone })
      });
      const result = await response.json();
      if (result.callSid) {
        state.callSid = result.callSid;
      }
      return result;
    } catch (error) {
      console.error('Call initiate error:', error);
      // Reset to browsing phase and re-show call overlay
      state.phase = 'browsing';
      const callOverlay = $('#call-overlay');
      if (callOverlay) show(callOverlay);
      return { success: false, error: error.message };
    }
  }

  // Disposition recording
  function recordDisposition(disposition) {
    state.disposition = disposition;
    addEvent('event', 'disposition_recorded', disposition, 'purple');
    console.log('[Disposition]', disposition);
  }

  // Transcript polling
  function startTranscriptPolling() {
    if (state.transcriptPollInterval) return;

    state.transcriptPollInterval = setInterval(async () => {
      if (!state.callSid) return;

      if (!CRELAY_BASE) {
        // Demo mode: simulate transcript entries
        if (state.transcript.length === 0 && state.customer) {
          const c = state.customer;
          setTimeout(() => addTranscript('ai', 'Hello! Thank you for calling SFBLI. How can I assist you today?'), 2000);
          if (state.currentPage === 'policies') {
            setTimeout(() => addTranscript('customer', `Hi, I have a question about my ${c.policy_type.toLowerCase()} policy.`), 4000);
            setTimeout(() => addTranscript('ai', `I can help you with that. I see you have policy ${c.policy_number} with ${c.coverage} coverage. What would you like to know?`), 6000);
          } else if (state.currentPage === 'claims') {
            const activeClaim = c.claims && c.claims.find(cl => cl.status === 'Under Review');
            if (activeClaim) {
              setTimeout(() => addTranscript('customer', `I'm calling about my recent claim, ${activeClaim.number}.`), 4000);
              setTimeout(() => addTranscript('ai', `I see your claim for ${activeClaim.amount} is currently under review. Let me connect you with a claims specialist who can provide more details.`), 6000);
            }
          }
        }
        return;
      }

      try {
        const response = await fetch(`${CRELAY_BASE}/transcript?callSid=${state.callSid}&since=${state.lastTranscriptIndex}`);
        const result = await response.json();

        if (result.entries && result.entries.length > 0) {
          result.entries.forEach(entry => {
            addTranscript(entry.role, entry.content);
          });
          state.lastTranscriptIndex += result.entries.length;
        }

        // Detect handoff to Flex agent
        if (result.handoff && !state.handoffDetected) {
          state.handoffDetected = true;
          addEvent('event', 'agent_escalation', 'Transferring to claims specialist', 'amber');
          const callStatus = $('#call-status');
          if (callStatus) callStatus.textContent = 'Transferring to agent...';
        }

        // Auto-detect call end from CRelay status webhook
        if (result.callStatus === 'completed' || result.callStatus === 'failed' || result.callStatus === 'canceled') {
          onEndCall();
        }
      } catch (error) {
        // Silent — transcript polling errors are non-critical
      }
    }, 2000);
  }

  function stopTranscriptPolling() {
    if (state.transcriptPollInterval) {
      clearInterval(state.transcriptPollInterval);
      state.transcriptPollInterval = null;
    }
  }

  // Call timer
  function startCallTimer() {
    state.callSeconds = 0;
    const timerEl = $('#call-timer');
    show(timerEl);

    state.callTimer = setInterval(() => {
      state.callSeconds++;
      const mins = Math.floor(state.callSeconds / 60).toString().padStart(2, '0');
      const secs = (state.callSeconds % 60).toString().padStart(2, '0');
      timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  function stopCallTimer() {
    if (state.callTimer) {
      clearInterval(state.callTimer);
      state.callTimer = null;
    }
    const timerEl = $('#call-timer');
    hide(timerEl);
  }

  // Page rendering
  function renderPage(page) {
    state.currentPage = page;
    const content = $('#site-content');

    // Add page view event
    const pagePaths = {
      home: '/home',
      policies: '/policies',
      claims: '/claims',
      contact: '/contact'
    };
    addEvent('event', 'page_view', pagePaths[page] || `/${page}`, 'blue');

    // Build the call flow overlays (shared between policies and claims pages)
    function callOverlays(ctaTitle, ctaDesc, connectedDesc) {
      return `
        <div class="cc-overlay" id="call-overlay">
          <h3>${ctaTitle}</h3>
          <p>${ctaDesc}</p>
          <button class="cc-btn cc-btn-primary" id="call-btn">Call Us Now</button>
        </div>

        <div class="cc-overlay highlight hidden" id="phone-overlay">
          <h3>Enter Your Phone Number</h3>
          <p>We'll send you a verification code to confirm your identity.</p>
          <input type="tel" class="cc-phone-input" id="phone-input" placeholder="Enter phone number" maxlength="20" />
          <button class="cc-btn cc-btn-primary" id="submit-phone-btn">Continue</button>
        </div>

        <div class="cc-overlay verify hidden" id="otp-overlay">
          <h3>Verify Your Identity</h3>
          <p>Enter the 6-digit code sent to your phone.</p>
          <div id="otp-error" class="cc-error-message hidden"></div>
          <div class="cc-otp-container">
            <input type="text" class="cc-otp-digit" maxlength="1" data-index="0" />
            <input type="text" class="cc-otp-digit" maxlength="1" data-index="1" />
            <input type="text" class="cc-otp-digit" maxlength="1" data-index="2" />
            <input type="text" class="cc-otp-digit" maxlength="1" data-index="3" />
            <input type="text" class="cc-otp-digit" maxlength="1" data-index="4" />
            <input type="text" class="cc-otp-digit" maxlength="1" data-index="5" />
          </div>
          <button class="cc-btn cc-btn-success" id="verify-otp-btn">Verify & Connect</button>
        </div>

        <div class="cc-overlay verify hidden" id="connected-overlay">
          <h3>Connected</h3>
          <p class="cc-success-message">Your call is being connected. Please stay on the line.</p>
          <p>${connectedDesc}</p>
          <button class="cc-btn" id="end-call-btn">End Call</button>
        </div>
      `;
    }

    // Screenshot image for each page
    const screenshotSrcs = {
      home: 'screenshots/home.png',
      policies: 'screenshots/policies.png',
      claims: 'screenshots/claims.png',
      contact: 'screenshots/home.png'
    };

    // Preserve the nav and sidebar overlays, clear the rest
    const navOverlay = content.querySelector('.cc-nav-overlay');
    const sidebarOverlay = content.querySelector('.cc-sidebar-overlay');
    content.innerHTML = '';
    if (navOverlay) content.appendChild(navOverlay);
    if (sidebarOverlay) content.appendChild(sidebarOverlay);

    // Add the screenshot image
    const img = document.createElement('img');
    img.className = 'cc-bg-img';
    img.src = screenshotSrcs[page] || screenshotSrcs.home;
    img.alt = '';
    content.appendChild(img);

    if (page === 'policies') {
      const wrap = document.createElement('div');
      wrap.className = 'cc-screenshot-overlay-wrap';
      wrap.innerHTML = callOverlays(
        'Need help with your policy?',
        'Our customer service team is available to answer your questions.',
        'An agent will be with you shortly to assist with your policy inquiry.'
      );
      content.appendChild(wrap);
      bindPageEvents();
    } else if (page === 'claims') {
      const wrap = document.createElement('div');
      wrap.className = 'cc-screenshot-overlay-wrap';
      wrap.innerHTML = callOverlays(
        'Questions about your claim?',
        'Speak with a claims specialist to get answers about your open claims.',
        'A claims specialist will be with you shortly to discuss your claim.'
      );
      content.appendChild(wrap);
      bindPageEvents();
    }
  }

  // Event bindings for call flow
  function bindPageEvents() {
    const callBtn = $('#call-btn');
    const submitPhoneBtn = $('#submit-phone-btn');
    const verifyOtpBtn = $('#verify-otp-btn');
    const endCallBtn = $('#end-call-btn');
    const phoneInput = $('#phone-input');
    const otpDigits = $$('.cc-otp-digit');

    if (callBtn) {
      callBtn.addEventListener('click', onClickToCall);
    }

    if (submitPhoneBtn) {
      submitPhoneBtn.addEventListener('click', onSubmitPhone);
    }

    if (phoneInput) {
      phoneInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          onSubmitPhone();
        }
      });
    }

    if (verifyOtpBtn) {
      verifyOtpBtn.addEventListener('click', onVerifyOtp);
    }

    if (endCallBtn) {
      endCallBtn.addEventListener('click', onEndCall);
    }

    // OTP digit input handling
    otpDigits.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value.length === 1 && index < otpDigits.length - 1) {
          otpDigits[index + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          otpDigits[index - 1].focus();
        }
        if (e.key === 'Enter') {
          onVerifyOtp();
        }
      });
    });
  }

  // Flow handlers
  function onClickToCall() {
    state.phase = 'phone_input';
    addEvent('event', 'button_click', 'Call Us Now', 'purple');

    hide($('#call-overlay'));
    show($('#phone-overlay'));

    setTimeout(() => {
      $('#phone-input').focus();
    }, 100);
  }

  async function onSubmitPhone() {
    const phoneInput = $('#phone-input');
    const phone = phoneInput.value.trim();

    if (!phone) {
      alert('Please enter your phone number');
      return;
    }

    state.phase = 'otp_verify';
    addEvent('event', 'phone_submitted', phone, 'amber');

    // Resolve identity based on current page
    const customer = resolveIdentity(phone);
    if (!customer) {
      alert('Unable to resolve identity for this page');
      return;
    }

    // Call lookup and verify-start APIs
    await callLookup(phone);
    addEvent('event', 'lookup_complete', 'Phone validated', 'blue');

    await callVerifyStart(phone);
    addEvent('event', 'verify_sent', 'OTP sent to phone', 'amber');

    // Show OTP overlay
    hide($('#phone-overlay'));
    show($('#otp-overlay'));

    setTimeout(() => {
      $$('.cc-otp-digit')[0].focus();
    }, 100);
  }

  async function onVerifyOtp() {
    const otpDigits = $$('.cc-otp-digit');
    const code = Array.from(otpDigits).map(input => input.value).join('');
    const errorEl = $('#otp-error');

    if (code.length !== 6) {
      errorEl.textContent = 'Please enter all 6 digits';
      show(errorEl);
      return;
    }

    const phone = $('#phone-input').value.trim();
    const result = await callVerifyCheck(phone, code);

    if (!result.valid) {
      state.otpAttempts++;
      if (state.otpAttempts >= 3) {
        errorEl.textContent = 'Too many failed attempts. Please try again later.';
        show(errorEl);
        setTimeout(() => {
          location.reload();
        }, 3000);
      } else {
        errorEl.textContent = `Invalid code. ${3 - state.otpAttempts} attempts remaining.`;
        show(errorEl);
        otpDigits.forEach(input => input.value = '');
        otpDigits[0].focus();
      }
      return;
    }

    state.phase = 'connected';
    addEvent('event', 'verify_approved', 'OTP verified', 'green');

    // Hide OTP, show connected overlay
    hide($('#otp-overlay'));
    show($('#connected-overlay'));

    // Post context to CRelay
    const customer = state.customer;
    const context = {
      customer_id: customer.id,
      customer_name: customer.name,
      phone: phone,
      email: customer.email,
      policy_number: customer.policy_number,
      policy_type: customer.policy_type,
      premium: customer.premium,
      coverage: customer.coverage,
      renewal: customer.renewal,
      risk_score: customer.risk_score,
      claim_count: customer.claim_count,
      customer_since: customer.customer_since,
      browsingHistory: state.events
        .filter(e => e.name === 'page_view')
        .map(e => e.detail),
      verificationStatus: 'approved'
    };

    if (state.currentPage === 'claims' && customer.claims) {
      context.recent_claims = customer.claims;
    }

    await postContextToCRelay(context);
    addEvent('event', 'context_posted', 'Customer data sent to AI agent', 'purple');

    // Initiate call
    const callResult = await callInitiate(phone);
    if (callResult.callSid) {
      addEvent('event', 'call_connected', `Call SID: ${state.callSid}`, 'green');

      // Update call bar
      const callBar = $('#call-bar');
      const callStatus = $('#call-status');
      callBar.classList.remove('idle');
      callBar.classList.add('active');
      callStatus.textContent = 'Call in progress';

      // Start timer and transcript polling
      startCallTimer();
      startTranscriptPolling();
    }
  }

  function onEndCall() {
    state.phase = 'call_ended';

    // Stop timer and polling
    stopCallTimer();
    stopTranscriptPolling();

    // Update call bar
    const callBar = $('#call-bar');
    const callStatus = $('#call-status');
    callBar.classList.remove('active');
    callBar.classList.add('idle');
    callStatus.textContent = 'Call ended';

    addEvent('event', 'call_ended', `Duration: ${state.callSeconds}s`, 'red');

    // Record disposition based on page and handoff status
    let disposition;
    if (state.handoffDetected) {
      disposition = 'Claim Inquiry — Escalated to Agent';
    } else if (state.currentPage === 'policies') {
      disposition = 'Policy Inquiry — Resolved';
    } else if (state.currentPage === 'claims') {
      disposition = 'Claim Inquiry — Resolved by AI';
    } else {
      disposition = 'General Inquiry — Resolved';
    }
    recordDisposition(disposition);

    // Hide connected overlay, show call overlay again
    hide($('#connected-overlay'));
    show($('#call-overlay'));
  }

  // Fetch config from Twilio Function (single source of truth for CRELAY_BASE_URL)
  async function loadConfig() {
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/config`);
      const data = await res.json();
      CRELAY_BASE = data.crelayBaseUrl || '';
      console.log('Config loaded, CRELAY_BASE:', CRELAY_BASE);
    } catch (e) {
      console.warn('Config fetch failed, CRELAY_BASE not set:', e.message);
    }
  }

  // Init
  async function init() {
    await loadConfig();

    // Nav click handlers — top nav links, sidebar items, and logo
    $$('.cc-nav-link, .cc-sidebar-item, .cc-nav-logo').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (!page) return;

        // Disable navigation during active call
        if (state.phase === 'connected' || state.phase === 'phone_input' || state.phase === 'otp_verify') {
          alert('Please end your current call before navigating.');
          return;
        }

        // Update active state on top nav
        $$('.cc-nav-link').forEach(l => l.classList.remove('cc-nav-link-active'));
        if (link.classList.contains('cc-nav-link')) {
          link.classList.add('cc-nav-link-active');
        }

        renderPage(page);
      });
    });

    // Initial page view
    addEvent('event', 'page_view', '/home', 'blue');

    // Auto-navigate to policies page after delay
    setTimeout(() => {
      renderPage('policies');
    }, 800);
  }

  init();
})();
