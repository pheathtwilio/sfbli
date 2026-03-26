(function() {
  'use strict';

  // ==================== CONFIG ====================
  const CONFIG = {
    functionsBaseUrl: 'https://sfbli-2271-dev.twil.io',
    pollIntervalMs: 3000,
    scenario: new URLSearchParams(window.location.search).get('scenario') || 'default',
    brand: new URLSearchParams(window.location.search).get('brand') || 'default'
  };

  // ==================== STATE ====================
  const state = {
    profile: {},
    events: [],
    conversation: [],
    templates: { content: [], sendgrid: [] },
    pollTimer: null,
    lastPollTimestamp: 0,
    activeChannel: null,
    currentView: 'sources',
    outreachEnabled: false,
    audiences: [],
    journeys: [],
    activeWizard: null,
    wizardStep: 0
  };

  // ==================== DOM REFERENCES ====================
  const dom = {
    eventList: document.getElementById('event-list'),
    profileCard: document.getElementById('profile-card'),
    editProfileBtn: document.getElementById('edit-profile-btn'),
    replayBtn: document.getElementById('replay-btn'),
    conversationThread: document.getElementById('conversation-thread'),
    channelControls: document.getElementById('channel-controls'),
    templateSelector: document.getElementById('template-selector'),
    templateSelectorTitle: document.getElementById('template-selector-title'),
    templateDropdown: document.getElementById('template-dropdown'),
    templateVariables: document.getElementById('template-variables'),
    templateSendBtn: document.getElementById('template-send-btn'),
    templateCancelBtn: document.getElementById('template-cancel-btn'),
    btnRcs: document.getElementById('btn-rcs'),
    btnEmail: document.getElementById('btn-email'),
    btnVoice: document.getElementById('btn-voice'),
    statusRcs: document.getElementById('status-rcs'),
    statusEmail: document.getElementById('status-email'),
    statusVoice: document.getElementById('status-voice'),
    conversationInput: document.getElementById('conversation-input'),
    conversationSendBtn: document.getElementById('conversation-send-btn')
  };

  // ==================== BRAND LOADING ====================
  async function loadBrand(brandName) {
    // Inject brand-specific CSS if not default
    if (brandName !== 'default') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `brands/${brandName}.css`;
      document.head.appendChild(link);
    }

    // Fetch brand config
    try {
      const response = await fetch(`brands/${brandName}.json`);
      const brandData = await response.json();

      // Set profile from defaultContact
      if (brandData.defaultContact) {
        state.profile = { ...brandData.defaultContact };
      }

      renderProfile();
    } catch (error) {
      console.error('Failed to load brand:', error);
    }
  }

  // ==================== SCENARIO ENGINE ====================
  async function loadScenario(scenarioName) {
    try {
      const response = await fetch(`scenarios/${scenarioName}.json`);
      return await response.json();
    } catch (error) {
      console.error('Failed to load scenario:', error);
      return null;
    }
  }

  function playScenario(scenario) {
    if (!scenario || !scenario.events) return;

    // Clear event list
    dom.eventList.innerHTML = '';
    state.events = [];

    // Replay events with delay
    scenario.events.forEach((evt, index) => {
      setTimeout(() => {
        renderEvent(evt);
        state.events.push(evt);

        // After the last event, apply profile updates
        if (index === scenario.events.length - 1 && scenario.profile_updates) {
          setTimeout(() => {
            applyProfileUpdates(scenario.profile_updates);
          }, 1000);
        }
      }, evt.delay);
    });
  }

  function renderEvent(evt) {
    const eventItem = document.createElement('div');
    eventItem.className = 'event-item entering';

    // Add warning class for abandon/session_end types
    if (evt.type === 'form_abandon' || evt.type === 'session_end') {
      eventItem.classList.add('event-warning');
    }

    const icon = getEventIcon(evt.type);
    const label = evt.label || evt.type;

    eventItem.innerHTML = `
      <span class="event-icon">${icon}</span>
      <div class="event-details">
        <div class="event-label">${label}</div>
        <div class="event-meta">${evt.type}</div>
      </div>
    `;

    // Prepend to event list (newest first)
    dom.eventList.prepend(eventItem);

    // Remove entering class after animation
    setTimeout(() => {
      eventItem.classList.remove('entering');
    }, 300);
  }

  function getEventIcon(type) {
    const iconMap = {
      'page_view': '&#128196;',      // Document
      'form_start': '&#9998;',        // Pencil
      'form_field': '&#9999;',        // Keyboard
      'form_abandon': '&#9888;',      // Warning
      'session_end': '&#10060;',      // Cross mark
      'click': '&#128433;',           // Mouse pointer
      'email_delivered': '&#9993;',   // Envelope
      'email_opened': '&#128172;',    // Speech bubble
      'sms_delivered': '&#128241;',   // Mobile phone
      'sms_opened': '&#128172;',      // Speech bubble
      'sms_reply': '&#128172;',       // Speech bubble
      'policy_app_submitted': '&#128196;', // Document
      'policy_issued': '&#9989;',     // Check
      'underwriting_status_change': '&#128260;', // Arrows
      'underwriting_class_change': '&#128260;',  // Arrows
      'default': '&#9679;'            // Bullet
    };
    return iconMap[type] || iconMap.default;
  }

  function applyProfileUpdates(updates) {
    if (updates.status) {
      updateProfileField('status', updates.status);
    }

    if (updates.engagement_score_after !== undefined) {
      updateProfileField('engagement_score', updates.engagement_score_after);
    }

    if (updates.predicted_churn) {
      updateProfileField('predicted_churn', updates.predicted_churn);
    }
  }

  // ==================== PROFILE ====================
  function renderProfile() {
    const fields = dom.profileCard.querySelectorAll('[data-field]');
    fields.forEach(field => {
      const fieldName = field.getAttribute('data-field');
      const value = state.profile[fieldName];
      if (value !== undefined && value !== null && value !== '') {
        updateProfileField(fieldName, value);
      }
    });
  }

  function updateProfileField(field, value) {
    const element = dom.profileCard.querySelector(`[data-field="${field}"]`);
    if (!element) return;

    element.textContent = value;

    // Apply badge styling for status
    if (field === 'status') {
      element.className = 'profile-value profile-badge';

      // Add status-specific classes
      const statusLower = value.toString().toLowerCase();
      if (statusLower.includes('risk') || statusLower.includes('inactive')) {
        element.classList.add('badge-warning');
      } else if (statusLower.includes('active')) {
        element.classList.add('badge-success');
      }
    }

    // Animation for score changes
    if (field === 'engagement_score') {
      element.classList.add('score-change');
      setTimeout(() => {
        element.classList.remove('score-change');
      }, 600);
    }

    // Update state
    state.profile[field] = value;
  }

  function toggleProfileEdit() {
    const profileValues = dom.profileCard.querySelectorAll('.profile-value');
    const isEditing = dom.editProfileBtn.textContent === 'Save';

    if (isEditing) {
      // Save mode: save all values back to state
      profileValues.forEach(el => {
        el.contentEditable = 'false';
        const field = el.getAttribute('data-field');
        const value = el.textContent.trim();
        state.profile[field] = value;
      });
      dom.editProfileBtn.textContent = 'Edit';
    } else {
      // Edit mode: make fields editable
      profileValues.forEach(el => {
        el.contentEditable = 'true';
      });
      dom.editProfileBtn.textContent = 'Save';
    }
  }

  // ==================== OUTREACH CONTROLS ====================
  function setOutreachEnabled(enabled) {
    state.outreachEnabled = enabled;
    dom.btnRcs.disabled = !enabled;
    dom.btnEmail.disabled = !enabled;
    dom.btnVoice.disabled = !enabled;
    dom.conversationInput.disabled = !enabled;
    dom.conversationSendBtn.disabled = !enabled;
  }

  async function sendReply(body) {
    if (!state.profile.phone || !body.trim()) return;
    try {
      const resp = await fetch(`${CONFIG.functionsBaseUrl}/send-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: state.profile.phone, body: body.trim() })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      addConversationMessage('outbound', 'sms', body.trim());
    } catch (e) {
      addConversationMessage('system', 'sms', `Failed to send: ${e.message}`);
    }
  }

  // ==================== TEMPLATE LOADING ====================
  async function loadTemplates() {
    try {
      const [contentResp, sendgridResp] = await Promise.all([
        fetch(`${CONFIG.functionsBaseUrl}/list-templates?type=content`),
        fetch(`${CONFIG.functionsBaseUrl}/list-templates?type=sendgrid`)
      ]);
      state.templates.content = (await contentResp.json()).templates || [];
      state.templates.sendgrid = (await sendgridResp.json()).templates || [];
    } catch (e) {
      console.warn('Failed to load templates:', e);
    }
  }

  // ==================== TEMPLATE SELECTOR ====================
  function showTemplateSelector(channel) {
    state.activeChannel = channel;
    const templates = channel === 'rcs' ? state.templates.content : state.templates.sendgrid;
    const title = channel === 'rcs' ? 'Select Content Template' : 'Select Email Template';

    dom.templateSelectorTitle.textContent = title;
    dom.templateDropdown.innerHTML = templates.length
      ? templates.map(t => `<option value="${t.id}">${t.name} (${t.type || 'template'})</option>`).join('')
      : '<option value="">No templates available</option>';

    // Pre-populate variable fields from profile
    dom.templateVariables.innerHTML = '';
    const selectedTemplate = templates[0];
    if (selectedTemplate && selectedTemplate.variables) {
      Object.keys(selectedTemplate.variables).forEach(key => {
        const profileValue = state.profile[key] || '';
        dom.templateVariables.innerHTML += `
          <label>${key}</label>
          <input type="text" name="${key}" value="${profileValue}" class="template-var-input">
        `;
      });
    }

    dom.templateSelector.classList.remove('hidden');
    dom.channelControls.classList.add('hidden');
  }

  function hideTemplateSelector() {
    dom.templateSelector.classList.add('hidden');
    dom.channelControls.classList.remove('hidden');
    state.activeChannel = null;
  }

  // ==================== SEND ACTIONS ====================
  async function sendRcs(contentSid, contentVariables, templateName) {
    if (!state.profile.phone) {
      setChannelStatus('rcs', 'Error: No phone number set');
      return;
    }
    setChannelStatus('rcs', 'Sending...');
    try {
      const resp = await fetch(`${CONFIG.functionsBaseUrl}/send-rcs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: state.profile.phone,
          contentSid,
          contentVariables: JSON.stringify(contentVariables)
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setChannelStatus('rcs', 'Delivered');
      // Show template name and variable values in conversation
      const varSummary = Object.entries(contentVariables)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      const displayMsg = templateName
        ? `${templateName}${varSummary ? ' (' + varSummary + ')' : ''}`
        : `RCS/SMS sent`;
      addConversationMessage('outbound', 'rcs', displayMsg);
    } catch (e) {
      setChannelStatus('rcs', `Error: ${e.message}`);
    }
  }

  async function sendEmail(templateId, dynamicData, templateName) {
    if (!state.profile.email) {
      setChannelStatus('email', 'Error: No email address set');
      return;
    }
    setChannelStatus('email', 'Sending...');
    try {
      const resp = await fetch(`${CONFIG.functionsBaseUrl}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: state.profile.email,
          templateId,
          dynamicData: JSON.stringify(dynamicData)
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setChannelStatus('email', 'Sent');
      const emailDisplay = templateName
        ? `${templateName} sent to ${state.profile.email}`
        : `Email sent to ${state.profile.email}`;
      addConversationMessage('outbound', 'email', emailDisplay);
    } catch (e) {
      setChannelStatus('email', `Error: ${e.message}`);
    }
  }

  async function triggerVoiceCall() {
    if (!state.profile.phone) {
      setChannelStatus('voice', 'Error: No phone number set');
      return;
    }
    setChannelStatus('voice', 'Initiating...');
    try {
      const resp = await fetch(`${CONFIG.functionsBaseUrl}/trigger-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: state.profile.phone })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setChannelStatus('voice', 'Ringing...');
      addConversationMessage('system', 'voice', `Voice call initiated (${data.callSid})`);
      setTimeout(() => setChannelStatus('voice', 'Connected'), 3000);
    } catch (e) {
      setChannelStatus('voice', `Error: ${e.message}`);
    }
  }

  // ==================== HELPERS ====================
  function setChannelStatus(channel, text) {
    const el = document.getElementById(`status-${channel}`);
    if (el) el.textContent = text;
  }

  // ==================== CONVERSATION ====================
  function addConversationMessage(direction, channel, body) {
    const empty = dom.conversationThread.querySelector('.conversation-empty');
    if (empty) empty.remove();

    const div = document.createElement('div');
    const channelIcons = { rcs: '&#128172;', sms: '&#128172;', email: '&#9993;', voice: '&#128222;' };

    if (direction === 'system') {
      div.className = 'msg-bubble msg-system';
      div.innerHTML = `
        <span class="msg-channel-icon">${channelIcons[channel] || ''}</span>
        <span>${body}</span>
        <span class="msg-time">${new Date().toLocaleTimeString()}</span>
      `;
    } else {
      div.className = `msg-bubble msg-${direction}`;
      div.innerHTML = `
        <div class="msg-body">${body}</div>
        <div class="msg-meta">
          <span class="msg-channel-icon">${channelIcons[channel] || ''}</span>
          <span class="msg-time">${new Date().toLocaleTimeString()}</span>
        </div>
      `;
    }

    dom.conversationThread.appendChild(div);
    dom.conversationThread.scrollTop = dom.conversationThread.scrollHeight;
    state.conversation.push({ direction, channel, body, timestamp: Date.now() });
  }

  // ==================== POLLING ====================
  function startPolling() {
    state.lastPollTimestamp = Date.now();
    state.pollTimer = setInterval(async () => {
      try {
        const resp = await fetch(
          `${CONFIG.functionsBaseUrl}/poll-messages?since=${state.lastPollTimestamp}`
        );
        const data = await resp.json();
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach(msg => {
            // Resolve sender name from profile data
            const fromNumber = (msg.from || '').replace(/\D/g, '');
            const match = MOCK_PROFILES.find(p => p.phone.replace(/\D/g, '') === fromNumber);
            const senderName = match ? match.name : msg.from;
            const displayBody = senderName ? `<strong>${senderName}:</strong> ${msg.body}` : msg.body;
            addConversationMessage('inbound', msg.channel || 'sms', displayBody);
            state.lastPollTimestamp = Math.max(state.lastPollTimestamp, msg.timestamp);
          });
        }
      } catch (e) {
        // Silent fail — polling resumes next interval
      }
    }, CONFIG.pollIntervalMs);
  }

  // ==================== EVENT LISTENERS ====================
  function setupEventListeners() {
    dom.editProfileBtn.addEventListener('click', toggleProfileEdit);

    dom.replayBtn.addEventListener('click', async () => {
      const scenario = await loadScenario(CONFIG.scenario);
      if (scenario) {
        // Reset profile to initial state
        await loadBrand(CONFIG.brand);
        playScenario(scenario);
      }
    });

    dom.btnRcs.addEventListener('click', () => showTemplateSelector('rcs'));
    dom.btnEmail.addEventListener('click', () => showTemplateSelector('email'));
    dom.btnVoice.addEventListener('click', triggerVoiceCall);

    // Audience wizard
    const btnNewAudience = document.getElementById('btn-new-audience');
    if (btnNewAudience) {
      btnNewAudience.addEventListener('click', openAudienceWizard);
    }

    // Journey wizard
    document.getElementById('btn-new-journey').addEventListener('click', openJourneyWizard);
    document.querySelector('.btn-new-journey-inline')?.addEventListener('click', openJourneyWizard);

    // Profile search filter
    const searchInput = document.getElementById('profile-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        document.querySelectorAll('#profile-table-body tr').forEach(row => {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(query) ? '' : 'none';
        });
      });
    }

    // Conversation reply input
    dom.conversationSendBtn.addEventListener('click', () => {
      const body = dom.conversationInput.value;
      if (body.trim()) {
        sendReply(body);
        dom.conversationInput.value = '';
      }
    });
    dom.conversationInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && dom.conversationInput.value.trim()) {
        sendReply(dom.conversationInput.value);
        dom.conversationInput.value = '';
      }
    });

    dom.templateCancelBtn.addEventListener('click', hideTemplateSelector);
    dom.templateSendBtn.addEventListener('click', () => {
      const selectedId = dom.templateDropdown.value;
      if (!selectedId) return;

      const selectedOption = dom.templateDropdown.options[dom.templateDropdown.selectedIndex];
      const templateName = selectedOption ? selectedOption.textContent : '';

      const variables = {};
      dom.templateVariables.querySelectorAll('input').forEach(input => {
        variables[input.name] = input.value;
      });

      if (state.activeChannel === 'rcs') {
        sendRcs(selectedId, variables, templateName);
      } else if (state.activeChannel === 'email') {
        sendEmail(selectedId, variables, templateName);
      }
      hideTemplateSelector();
    });
  }

  // ==================== SIDEBAR NAVIGATION ====================
  const viewMap = {
    'sources': 'view-sources',
    'profile-explorer': 'view-profile-explorer',
    'home': 'view-events',
    'audiences': 'view-audiences',
    'journeys': 'view-journeys'
  };

  function switchView(viewName) {
    state.currentView = viewName;

    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));

    // Show the target view
    const targetId = viewMap[viewName];
    if (targetId) {
      document.getElementById(targetId).classList.remove('hidden');
    } else {
      // Show placeholder for unimplemented views
      const placeholder = document.getElementById('view-placeholder');
      document.getElementById('placeholder-title').textContent = viewName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      placeholder.classList.remove('hidden');
    }

    // Update sidebar active states
    document.querySelectorAll('.sidebar-item, .sidebar-subitem, .sidebar-section-header').forEach(el => {
      el.classList.remove('active');
    });

    const activeItem = document.querySelector(`[data-view="${viewName}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
      // Also highlight parent section header if it's a subitem
      const parentSection = activeItem.closest('.sidebar-section');
      if (parentSection) {
        parentSection.querySelector('.sidebar-section-header').classList.add('active');
      }
    }

    if (viewName === 'journeys') {
      renderJourneysList();
      document.getElementById('journeys-list-container').classList.remove('hidden');
      document.getElementById('journey-wizard').classList.add('hidden');
    }

    if (viewName === 'audiences') {
      renderAudiencesList();
      // Show list, hide wizard and detail
      document.getElementById('audiences-list-container').classList.remove('hidden');
      document.getElementById('audience-wizard').classList.add('hidden');
      document.getElementById('audience-detail').classList.add('hidden');
    }

    // If switching to events view and scenario hasn't played, trigger it
    if (viewName === 'home' || viewName === 'engage') {
      if (state.events.length === 0) {
        loadScenario(CONFIG.scenario).then(scenario => playScenario(scenario));
      }
    }
  }

  function setupSidebarListeners() {
    // Top-level items
    document.querySelectorAll('.sidebar-item[data-view]').forEach(item => {
      item.addEventListener('click', () => switchView(item.dataset.view));
    });

    // Sub-items — stop propagation so section header toggle doesn't fire
    document.querySelectorAll('.sidebar-subitem[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        switchView(item.dataset.view);
      });
    });

    // Section expand/collapse — only toggle, never navigate
    document.querySelectorAll('.sidebar-section-header').forEach(header => {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const subnav = header.nextElementSibling;
        if (subnav) subnav.classList.toggle('open');
      });
    });
  }

  // ==================== PROFILE EXPLORER ====================
  const MOCK_PROFILES = [
    // Agents
    { id: 'usr_001', type: 'agent', name: 'Paul Heath', email: 'pheath@twilio.com', phone: '+13125689550', region: 'Southeast', status: 'At Risk', engagement_score: 45, agent_id: 'AGT-2847', license_state: 'FL', last_contacted: '14 days ago', policies_sold_ytd: 18, sales_target_ytd: 40, target_attainment: '65%', region_rank: '5 of 15', avg_policy_value: '$4,200', book_of_business: '$1.2M', tenure_years: 3, appointment_status: 'Active', preferred_channel: 'rcs_sms' },
    { id: 'usr_002', type: 'agent', name: 'Carter Howard', email: 'cahoward@twilio.com', phone: '+14073047101', region: 'West', status: 'Active', engagement_score: 89, agent_id: 'AGT-1923', license_state: 'CA', last_contacted: '2 days ago', policies_sold_ytd: 34, sales_target_ytd: 40, target_attainment: '85%', region_rank: '3 of 22', avg_policy_value: '$6,800', book_of_business: '$3.8M', tenure_years: 7, appointment_status: 'Active', preferred_channel: 'rcs_sms' },
    { id: 'usr_003', type: 'agent', name: 'James Okafor', email: 'james.okafor@example.com', phone: '+1 (678) 555-0183', region: 'Southeast', status: 'Active', engagement_score: 76, agent_id: 'AGT-3301', license_state: 'GA', last_contacted: '5 days ago', policies_sold_ytd: 27, sales_target_ytd: 35, target_attainment: '77%', region_rank: '6 of 15', avg_policy_value: '$3,900', book_of_business: '$2.1M', tenure_years: 5, appointment_status: 'Active', preferred_channel: 'email' },
    { id: 'usr_004', type: 'agent', name: 'Emily Watson', email: 'emily.watson@example.com', phone: '+1 (214) 555-0321', region: 'Central', status: 'Inactive', engagement_score: 23, agent_id: 'AGT-3102', license_state: 'TX', last_contacted: '32 days ago', policies_sold_ytd: 4, sales_target_ytd: 30, target_attainment: '13%', region_rank: '18 of 18', avg_policy_value: '$2,100', book_of_business: '$420K', tenure_years: 1, appointment_status: 'Under Review', preferred_channel: 'sms' },
    { id: 'usr_005', type: 'agent', name: 'Roberto Mendez', email: 'roberto.mendez@example.com', phone: '+1 (305) 555-0456', region: 'Southeast', status: 'Active', engagement_score: 91, agent_id: 'AGT-2890', license_state: 'FL', last_contacted: '1 day ago', policies_sold_ytd: 42, sales_target_ytd: 40, target_attainment: '105%', region_rank: '1 of 15', avg_policy_value: '$7,500', book_of_business: '$5.4M', tenure_years: 10, appointment_status: 'Active', preferred_channel: 'email' },
    { id: 'usr_006', type: 'agent', name: 'Linda Park', email: 'linda.park@example.com', phone: '+1 (773) 555-0199', region: 'Midwest', status: 'At Risk', engagement_score: 38, agent_id: 'AGT-4010', license_state: 'IL', last_contacted: '21 days ago', policies_sold_ytd: 9, sales_target_ytd: 30, target_attainment: '30%', region_rank: '11 of 12', avg_policy_value: '$3,100', book_of_business: '$890K', tenure_years: 2, appointment_status: 'Active', preferred_channel: 'sms' },
    // Customers
    { id: 'cust_001', type: 'customer', name: 'Maria Santos', email: 'pheath@twilio.com', phone: '+13125689550', region: 'Southeast', status: 'Active', policy_type: 'Homeowners', policy_number: 'HO-2024-08341', premium_amount: '$2,400/yr', coverage_amount: '$350,000', claim_count: 0, customer_since: '2021', renewal_date: '2026-08-15', risk_score: 'Low', preferred_channel: 'email' },
    { id: 'cust_002', type: 'customer', name: 'David Chen', email: 'david.chen@outlook.com', phone: '+1 (415) 555-0298', region: 'West', status: 'Active', policy_type: 'Auto', policy_number: 'AU-2023-15672', premium_amount: '$1,800/yr', coverage_amount: '$100,000', claim_count: 1, customer_since: '2019', renewal_date: '2026-05-01', risk_score: 'Medium', preferred_channel: 'rcs_sms' },
    { id: 'cust_003', type: 'customer', name: 'Sarah Johnson', email: 'sarah.j@yahoo.com', phone: '+1 (214) 555-0834', region: 'Central', status: 'Active', policy_type: 'Homeowners', policy_number: 'HO-2022-29104', premium_amount: '$3,100/yr', coverage_amount: '$475,000', claim_count: 2, customer_since: '2018', renewal_date: '2026-11-20', risk_score: 'Medium', preferred_channel: 'sms' },
    { id: 'cust_004', type: 'customer', name: 'Marcus Rivera', email: 'marcus.rivera@gmail.com', phone: '+1 (786) 555-0445', region: 'Southeast', status: 'Active', policy_type: 'Auto', policy_number: 'AU-2024-33218', premium_amount: '$1,200/yr', coverage_amount: '$75,000', claim_count: 0, customer_since: '2023', renewal_date: '2026-07-10', risk_score: 'Low', preferred_channel: 'rcs_sms' },
    { id: 'cust_005', type: 'customer', name: 'Jennifer Kim', email: 'jen.kim@icloud.com', phone: '+1 (312) 555-0167', region: 'Midwest', status: 'At Risk', policy_type: 'Renters', policy_number: 'RE-2023-41057', premium_amount: '$600/yr', coverage_amount: '$30,000', claim_count: 0, customer_since: '2022', renewal_date: '2026-04-01', risk_score: 'High', preferred_channel: 'email' },
    { id: 'cust_006', type: 'customer', name: 'Thomas Wright', email: 'tom.wright@hotmail.com', phone: '+1 (678) 555-0523', region: 'Southeast', status: 'Active', policy_type: 'Homeowners', policy_number: 'HO-2021-18945', premium_amount: '$4,200/yr', coverage_amount: '$620,000', claim_count: 1, customer_since: '2017', renewal_date: '2026-09-30', risk_score: 'Low', preferred_channel: 'sms' },
    { id: 'cust_007', type: 'customer', name: 'Amanda Foster', email: 'pheath@twilio.com', phone: '+13125689550', region: 'Southeast', status: 'Active', policy_type: 'Auto', policy_number: 'AU-2022-27563', premium_amount: '$2,100/yr', coverage_amount: '$150,000', claim_count: 3, customer_since: '2020', renewal_date: '2026-06-15', risk_score: 'High', preferred_channel: 'rcs_sms' },
    { id: 'cust_008', type: 'customer', name: 'Robert Patel', email: 'r.patel@gmail.com', phone: '+1 (713) 555-0334', region: 'Central', status: 'Active', policy_type: 'Life', policy_number: 'LF-2020-09821', premium_amount: '$5,400/yr', coverage_amount: '$500,000', claim_count: 0, customer_since: '2016', renewal_date: '2026-12-01', risk_score: 'Low', preferred_channel: 'email' },
    { id: 'cust_009', type: 'customer', name: 'Lisa Nguyen', email: 'lisa.nguyen@outlook.com', phone: '+1 (510) 555-0776', region: 'West', status: 'Active', policy_type: 'Homeowners', policy_number: 'HO-2023-52314', premium_amount: '$3,800/yr', coverage_amount: '$550,000', claim_count: 1, customer_since: '2019', renewal_date: '2026-10-15', risk_score: 'Medium', preferred_channel: 'sms' },
    { id: 'cust_010', type: 'customer', name: 'James Morrison', email: 'j.morrison@gmail.com', phone: '+1 (954) 555-0612', region: 'Southeast', status: 'Active', policy_type: 'Auto', policy_number: 'AU-2024-44729', premium_amount: '$1,500/yr', coverage_amount: '$100,000', claim_count: 0, customer_since: '2024', renewal_date: '2027-01-20', risk_score: 'Low', preferred_channel: 'rcs_sms' }
  ];

  // Historical events shown immediately when Events tab opens
  const PROFILE_HISTORY_EVENTS = [
    { name: 'email_opened', time: '1 hour ago' },
    { name: 'sms_delivered', time: '2 hours ago' },
    { name: 'policy_app_submitted', time: '3 days ago' },
    { name: 'underwriting_status_change', time: '5 days ago' }
  ];

  // Live events that animate in one by one
  const PROFILE_LIVE_EVENTS = [
    { name: 'page_view', time: 'Just now', delay: 1500 },
    { name: 'form_start', time: 'Just now', delay: 3500 },
    { name: 'form_abandon', time: 'Just now', delay: 6000 }
  ];

  // ==================== AUDIENCE WIZARD ====================
  function parseTraitValue(value) {
    if (typeof value === 'number') return value;
    const str = String(value);
    // Handle "X of Y" format (e.g., "5 of 15")
    const ofMatch = str.match(/^(\d+)\s+of\s+/);
    if (ofMatch) return parseInt(ofMatch[1], 10);
    // Strip $, commas, %, K, M suffixes
    let cleaned = str.replace(/[$,%]/g, '').replace(/,/g, '').trim();
    if (cleaned.endsWith('K')) return parseFloat(cleaned) * 1000;
    if (cleaned.endsWith('M')) return parseFloat(cleaned) * 1000000;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  function computeAudienceMembers(conditions) {
    if (!conditions || conditions.length === 0) return [];
    return MOCK_PROFILES.filter(profile => {
      return conditions.every(cond => {
        const raw = profile[cond.trait];
        if (raw === undefined) return false;
        const val = parseTraitValue(raw);
        if (val === null) return false;
        const target = parseFloat(cond.value);
        if (cond.operator === 'greater than') return val > target;
        if (cond.operator === 'less than') return val < target;
        if (cond.operator === 'equals') return val === target;
        return false;
      });
    });
  }

  function getNumericTraitKeys() {
    return ['target_attainment', 'engagement_score', 'policies_sold_ytd', 'sales_target_ytd', 'tenure_years', 'avg_policy_value', 'book_of_business'];
  }

  function renderWizardHeader(title, steps, currentStep) {
    const progressPct = Math.round(((currentStep - 1) / (steps.length - 1)) * 100);
    return `
      <div class="wizard-header">
        <h2>${title}</h2>
        <div class="wizard-steps">
          ${steps.map((label, i) => {
            const stepNum = i + 1;
            let cls = 'wizard-step';
            if (stepNum < currentStep) cls += ' completed';
            else if (stepNum === currentStep) cls += ' active';
            return `<div class="${cls}"><span class="wizard-step-number">${stepNum}</span><span class="wizard-step-label">${label}</span></div>`;
          }).join('')}
        </div>
        <div class="wizard-progress"><div class="wizard-progress-bar" style="width:${progressPct}%"></div></div>
      </div>`;
  }

  function updateAudiencePreview() {
    const members = computeAudienceMembers(state.wizardConditions);
    const previewEl = document.getElementById('audience-preview-panel');
    if (!previewEl) return;
    if (members.length === 0) {
      previewEl.innerHTML = '<div class="audience-preview-empty">No matching profiles. Adjust your conditions.</div>';
    } else {
      previewEl.innerHTML = `
        <div class="audience-preview-count">${members.length} profile${members.length !== 1 ? 's' : ''} matched</div>
        <ul class="audience-preview-list">
          ${members.map(m => `<li>${m.name} &mdash; ${m.status}, Score ${m.engagement_score}</li>`).join('')}
        </ul>`;
    }
    // Enable/disable Next button based on conditions
    const nextBtn = document.getElementById('wizard-next-btn');
    if (nextBtn && state.wizardStep === 2) {
      nextBtn.disabled = state.wizardConditions.length === 0 || members.length === 0;
    }
  }

  function renderAudienceWizard(step) {
    const container = document.getElementById('audience-wizard');
    const steps = ['Select Type', 'Configure', 'Destinations', 'Review'];
    const header = renderWizardHeader('Create Audience', steps, step);

    let content = '';

    if (step === 1) {
      content = `
        <div class="wizard-content-centered">
          <h3 class="wizard-section-title">Select Audience Type</h3>
          <div class="wizard-type-cards">
            <div class="type-card type-card-selected" data-type="profiles">
              <div class="type-card-icon">&#128100;</div>
              <div class="type-card-title">Profiles</div>
              <div class="type-card-desc">Build an audience from profile traits and conditions</div>
            </div>
            <div class="type-card type-card-dimmed" data-type="computed">
              <div class="type-card-icon">&#9881;</div>
              <div class="type-card-title">Computed Traits</div>
              <div class="type-card-desc">Create audiences from computed trait values</div>
            </div>
            <div class="type-card type-card-dimmed" data-type="sql">
              <div class="type-card-icon">&#128451;</div>
              <div class="type-card-title">SQL</div>
              <div class="type-card-desc">Write a custom SQL query to define membership</div>
            </div>
          </div>
        </div>`;
    } else if (step === 2) {
      const traitKeys = getNumericTraitKeys();
      const operators = ['greater than', 'less than', 'equals'];
      const cond = state.wizardConditions[0] || {};
      content = `
        <div class="wizard-content-split">
          <div class="wizard-content-left">
            <h3 class="wizard-section-title">Configure and Preview Your Audience</h3>
            <div class="condition-builder">
              <div class="condition-row">
                <div class="wizard-form-group">
                  <label>Trait</label>
                  <select id="cond-trait" class="wizard-select">
                    <option value="">Select trait...</option>
                    ${traitKeys.map(k => `<option value="${k}"${cond.trait === k ? ' selected' : ''}>${k}</option>`).join('')}
                  </select>
                </div>
                <div class="wizard-form-group">
                  <label>Operator</label>
                  <select id="cond-operator" class="wizard-select">
                    ${operators.map(op => `<option value="${op}"${cond.operator === op ? ' selected' : ''}>${op}</option>`).join('')}
                  </select>
                </div>
                <div class="wizard-form-group">
                  <label>Value</label>
                  <input id="cond-value" type="number" class="wizard-input" placeholder="Enter value" value="${cond.value || ''}">
                </div>
              </div>
            </div>
          </div>
          <div class="wizard-content-right">
            <h3 class="wizard-section-title">Audience Preview</h3>
            <div class="audience-preview" id="audience-preview-panel">
              <div class="audience-preview-empty">Configure a condition to see matching profiles.</div>
            </div>
          </div>
        </div>`;
    } else if (step === 3) {
      content = `
        <div class="wizard-content-centered">
          <h3 class="wizard-section-title">Select Destinations</h3>
          <div class="wizard-type-cards">
            <div class="type-card type-card-selected">
              <div class="type-card-icon">&#128640;</div>
              <div class="type-card-title">Send Interaction</div>
              <div class="type-card-desc">PH Demo Space</div>
            </div>
          </div>
        </div>`;
    } else if (step === 4) {
      const members = computeAudienceMembers(state.wizardConditions);
      const cond = state.wizardConditions[0] || {};
      const autoKey = 'aud_' + Date.now().toString(36);
      content = `
        <div class="wizard-content-split">
          <div class="wizard-content-left">
            <h3 class="wizard-section-title">Review and Create</h3>
            <div class="wizard-form-group">
              <label>Audience Name</label>
              <input type="text" data-field="audience-name" class="wizard-input" placeholder="e.g. High-value agents" value="">
            </div>
            <div class="wizard-form-group">
              <label>Key</label>
              <div class="wizard-key-display">${autoKey}</div>
            </div>
            <div class="wizard-form-group">
              <label>Description</label>
              <textarea class="wizard-textarea" data-field="audience-description" placeholder="Describe this audience..." rows="3"></textarea>
            </div>
          </div>
          <div class="wizard-content-right">
            <h3 class="wizard-section-title">Summary</h3>
            <div class="wizard-summary">
              <div class="wizard-summary-row"><span>Audience Size</span><strong>${members.length} profile${members.length !== 1 ? 's' : ''}</strong></div>
              <div class="wizard-summary-row"><span>Condition</span><strong>${cond.trait || '—'} ${cond.operator || ''} ${cond.value || ''}</strong></div>
              <div class="wizard-summary-row"><span>Members</span><strong>${members.map(m => m.name).join(', ') || '—'}</strong></div>
              <div class="wizard-summary-row"><span>Destinations</span><strong>Send Interaction (PH Demo Space)</strong></div>
            </div>
          </div>
        </div>`;
    }

    // Footer with navigation buttons
    const isFirst = step === 1;
    const isLast = step === 4;
    const footer = `
      <div class="wizard-footer">
        <button class="btn btn-secondary" id="wizard-cancel-btn">Cancel</button>
        <div class="wizard-footer-right">
          ${!isFirst ? '<button class="btn btn-secondary" id="wizard-back-btn">Back</button>' : ''}
          ${!isLast ? '<button class="btn btn-primary" id="wizard-next-btn">Next</button>' : '<button class="btn btn-primary" id="wizard-create-btn">Create Audience</button>'}
        </div>
      </div>`;

    container.innerHTML = header + '<div class="wizard-body">' + content + '</div>' + footer;

    // Wire navigation buttons
    const cancelBtn = document.getElementById('wizard-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeAudienceWizard);

    const backBtn = document.getElementById('wizard-back-btn');
    if (backBtn) backBtn.addEventListener('click', () => {
      state.wizardStep = step - 1;
      renderAudienceWizard(state.wizardStep);
    });

    const nextBtn = document.getElementById('wizard-next-btn');
    if (nextBtn) {
      // Disable Next on step 2 if no conditions
      if (step === 2 && state.wizardConditions.length === 0) {
        nextBtn.disabled = true;
      }
      nextBtn.addEventListener('click', () => {
        state.wizardStep = step + 1;
        renderAudienceWizard(state.wizardStep);
      });
    }

    const createBtn = document.getElementById('wizard-create-btn');
    if (createBtn) createBtn.addEventListener('click', () => {
      createAudience();
    });

    // Wire condition builder interactivity for step 2
    if (step === 2) {
      const traitSelect = document.getElementById('cond-trait');
      const opSelect = document.getElementById('cond-operator');
      const valInput = document.getElementById('cond-value');

      function onConditionChange() {
        const trait = traitSelect.value;
        const operator = opSelect.value;
        const value = valInput.value;
        if (trait && value !== '') {
          state.wizardConditions = [{ trait, operator, value }];
        } else {
          state.wizardConditions = [];
        }
        updateAudiencePreview();
      }

      traitSelect.addEventListener('change', onConditionChange);
      opSelect.addEventListener('change', onConditionChange);
      valInput.addEventListener('input', onConditionChange);

      // If conditions already exist (navigating back), update preview
      if (state.wizardConditions.length > 0) {
        updateAudiencePreview();
      }
    }
  }

  function openAudienceWizard() {
    state.activeWizard = 'audience';
    state.wizardStep = 1;
    state.wizardConditions = [];
    document.getElementById('audiences-list-container').classList.add('hidden');
    document.getElementById('audience-wizard').classList.remove('hidden');
    renderAudienceWizard(1);
  }

  function closeAudienceWizard() {
    state.activeWizard = null;
    state.wizardStep = 0;
    state.wizardConditions = [];
    document.getElementById('audience-wizard').classList.add('hidden');
    document.getElementById('audiences-list-container').classList.remove('hidden');
  }

  function createAudience() {
    const name = document.querySelector('[data-field="audience-name"]').value.trim();
    const desc = document.querySelector('[data-field="audience-description"]')?.value?.trim() || '';
    if (!name) return;

    const audience = {
      name: name,
      key: name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      description: desc,
      conditions: [...state.wizardConditions],
      destination: 'Send Interaction',
      members: computeAudienceMembers(state.wizardConditions).map(p => p.id)
    };

    state.audiences.push(audience);
    state.activeWizard = null;
    state.wizardStep = 0;
    state.wizardConditions = [];
    document.getElementById('audience-wizard').classList.add('hidden');
    renderAudienceDetail(audience);
  }

  function renderAudienceDetail(audience) {
    const detailEl = document.getElementById('audience-detail');
    const listEl = document.getElementById('audiences-list-container');
    const wizardEl = document.getElementById('audience-wizard');

    listEl.classList.add('hidden');
    wizardEl.classList.add('hidden');
    detailEl.classList.remove('hidden');

    const memberProfiles = audience.members.map(id => MOCK_PROFILES.find(p => p.id === id)).filter(Boolean);
    const memberCount = memberProfiles.length;

    const activityTimes = ['3 days ago', '5 days ago', '1 day ago', '7 days ago', '2 days ago', '4 days ago'];

    const profileRows = memberProfiles.map((p, i) => `
      <tr>
        <td>${p.name}</td>
        <td>${p.email}</td>
        <td>${activityTimes[i % activityTimes.length]}</td>
        <td>${activityTimes[(i + 2) % activityTimes.length]}</td>
      </tr>
    `).join('');

    detailEl.innerHTML = `
      <div class="audience-detail-header">
        <div class="wizard-breadcrumb">
          Spaces / default / <a href="#" class="audience-back-link">Audiences</a> / ${audience.name}
        </div>
        <div class="audience-detail-title">${audience.name}</div>
        <div class="audience-detail-meta">${audience.description || 'No description'}</div>
      </div>

      <div class="view-tabs">
        <div class="view-tab active">Overview</div>
        <div class="view-tab">Builder</div>
        <div class="view-tab">Consumers</div>
        <div class="view-tab">Settings</div>
        <div class="view-tab">Alerts</div>
      </div>

      <div style="display:flex;align-items:center;gap:12px;margin:20px 0;">
        <span style="font-weight:600;font-size:14px;">Enable Audience</span>
        <div style="width:40px;height:22px;border-radius:11px;background:#52bd94;position:relative;cursor:pointer;">
          <div style="width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;right:2px;"></div>
        </div>
      </div>

      <div class="audience-stats">
        <div>
          <div class="audience-stat-value">${memberCount}</div>
          <div class="audience-stat-label">Users</div>
        </div>
        <div>
          <div class="audience-stat-value">1</div>
          <div class="audience-stat-label">Connected Destinations</div>
        </div>
        <div>
          <div class="audience-stat-value"><span class="status-badge status-enabled"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#52bd94;margin-right:6px;"></span>Enabled</span></div>
          <div class="audience-stat-label">Status</div>
        </div>
      </div>

      <h3 style="margin:28px 0 12px;font-size:16px;font-weight:600;">Identifier Breakdown</h3>
      <table class="data-table">
        <thead><tr><th>Identifier</th><th>Coverage</th></tr></thead>
        <tbody>
          <tr><td>email</td><td>100%</td></tr>
          <tr><td>phone</td><td>100%</td></tr>
          <tr><td>user_id</td><td>100%</td></tr>
        </tbody>
      </table>

      <h3 style="margin:28px 0 12px;font-size:16px;font-weight:600;">Destinations</h3>
      <p style="color:#8a8f98;font-size:13px;margin-bottom:12px;">This audience is synced to 1 destination</p>
      <div class="destination-card">
        <div class="destination-icon">&#128640;</div>
        <div>
          <div style="font-weight:600;">Send Interaction</div>
          <div style="font-size:12px;color:#8a8f98;">PH Demo Space</div>
        </div>
      </div>

      <h3 style="margin:28px 0 12px;font-size:16px;font-weight:600;">Audience Explorer</h3>
      <input type="text" class="search-input" placeholder="Search profiles..." style="margin-bottom:12px;max-width:320px;">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>First Activity</th><th>Last Activity</th></tr></thead>
        <tbody>${profileRows}</tbody>
      </table>
    `;

    // Wire breadcrumb back navigation
    const backLink = detailEl.querySelector('.audience-back-link');
    if (backLink) {
      backLink.addEventListener('click', (e) => {
        e.preventDefault();
        detailEl.classList.add('hidden');
        listEl.classList.remove('hidden');
        renderAudiencesList();
      });
    }
  }

  function renderAudiencesList() {
    const tbody = document.getElementById('audiences-table-body');
    if (!tbody) return;

    if (state.audiences.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#8a8f98;padding:40px 0;">No audiences created yet. Click "New Audience" to get started.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.audiences.map(audience => `
      <tr>
        <td><a href="#" class="audience-name-link" data-audience-key="${audience.key}">${audience.name}</a></td>
        <td><span class="status-badge status-enabled"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#52bd94;margin-right:6px;"></span>Enabled</span></td>
        <td>${audience.members.length}</td>
        <td>${audience.destination}</td>
      </tr>
    `).join('');

    // Wire click handlers for audience name links
    tbody.querySelectorAll('.audience-name-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const key = link.dataset.audienceKey;
        const audience = state.audiences.find(a => a.key === key);
        if (audience) showAudienceDetail(audience);
      });
    });
  }

  function showAudienceDetail(audience) {
    document.getElementById('audiences-list-container').classList.add('hidden');
    document.getElementById('audience-wizard').classList.add('hidden');
    document.getElementById('audience-detail').classList.remove('hidden');
    renderAudienceDetail(audience);
  }

  function renderProfileTable() {
    const tbody = document.getElementById('profile-table-body');
    tbody.innerHTML = MOCK_PROFILES.map(p => {
      const statusClass = p.status.toLowerCase().includes('risk') || p.status.toLowerCase().includes('inactive') ? 'badge-warning' : 'badge-success';
      const typeLabel = p.type === 'customer' ? 'Customer' : 'Agent';
      const typeClass = p.type === 'customer' ? 'type-customer' : 'type-agent';
      return `<tr data-profile-id="${p.id}">
        <td>${p.name}</td>
        <td><span class="profile-type-badge ${typeClass}">${typeLabel}</span></td>
        <td>${p.email}</td>
        <td>${p.phone}</td>
        <td><span class="profile-badge ${statusClass}">${p.status}</span></td>
        <td>${p.engagement_score || '—'}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', () => {
        const profile = MOCK_PROFILES.find(p => p.id === row.dataset.profileId);
        if (profile) showProfileDetail(profile);
      });
    });
  }

  function showProfileDetail(profile) {
    document.getElementById('profile-list-container').classList.add('hidden');
    const detail = document.getElementById('profile-detail');
    detail.classList.remove('hidden');

    const initials = profile.name.split(' ').map(n => n[0]).join('');
    document.getElementById('profile-detail-header').innerHTML = `
      <div class="profile-avatar-lg">${initials}</div>
      <div>
        <div class="profile-detail-name">${profile.name}</div>
        <div class="profile-detail-id">${profile.customer_id} &middot; ${profile.id}</div>
      </div>
    `;

    // Set up tab click handlers
    detail.querySelectorAll('.profile-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        detail.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderProfileTab(tab.dataset.tab, profile);
      });
    });

    // Show traits tab by default
    renderProfileTab('traits', profile);

    document.getElementById('profile-back-btn').onclick = () => {
      detail.classList.add('hidden');
      document.getElementById('profile-list-container').classList.remove('hidden');
    };
  }

  function renderProfileTab(tabName, profile) {
    const container = document.getElementById('profile-tab-content');

    if (tabName === 'traits') {
      let traits;
      if (profile.type === 'customer') {
        traits = {
          'type': 'Customer',
          'email': profile.email,
          'phone': profile.phone,
          'region': profile.region,
          'status': profile.status,
          'policy_type': profile.policy_type,
          'policy_number': profile.policy_number,
          'premium_amount': profile.premium_amount,
          'coverage_amount': profile.coverage_amount,
          'claim_count': profile.claim_count,
          'customer_since': profile.customer_since,
          'renewal_date': profile.renewal_date,
          'risk_score': profile.risk_score,
          'preferred_channel': profile.preferred_channel
        };
      } else {
        traits = {
          'type': 'Agent',
          'agent_id': profile.agent_id,
          'email': profile.email,
          'phone': profile.phone,
          'region': profile.region,
          'license_state': profile.license_state,
          'status': profile.status,
          'engagement_score': profile.engagement_score,
          'appointment_status': profile.appointment_status,
          'last_contacted': profile.last_contacted,
          'policies_sold_ytd': profile.policies_sold_ytd,
          'sales_target_ytd': profile.sales_target_ytd,
          'target_attainment': profile.target_attainment,
          'region_rank': profile.region_rank,
          'avg_policy_value': profile.avg_policy_value,
          'book_of_business': profile.book_of_business,
          'tenure_years': profile.tenure_years,
          'preferred_channel': profile.preferred_channel
        };
      }
      container.innerHTML = `<table class="traits-table">${Object.entries(traits).map(([k, v]) =>
        `<tr><td>${k}</td><td>${v}</td></tr>`
      ).join('')}</table>`;

    } else if (tabName === 'events') {
      // Show historical events immediately
      container.innerHTML = `<div class="profile-events-list" id="profile-events-list">${PROFILE_HISTORY_EVENTS.map(e =>
        `<div class="profile-event-row"><span class="profile-event-dot"></span><span class="profile-event-name">${e.name}</span><span class="profile-event-time">${e.time}</span></div>`
      ).join('')}</div>`;

      // Animate live events appearing one by one
      const list = document.getElementById('profile-events-list');
      PROFILE_LIVE_EVENTS.forEach(e => {
        setTimeout(() => {
          if (!list.isConnected) return; // tab switched away
          const row = document.createElement('div');
          row.className = 'profile-event-row entering';
          const isWarning = e.name === 'form_abandon';
          row.innerHTML = `<span class="profile-event-dot${isWarning ? ' dot-warning' : ''}"></span><span class="profile-event-name">${e.name}</span><span class="profile-event-time">${e.time}</span>`;
          list.prepend(row);
          setTimeout(() => row.classList.remove('entering'), 350);
          if (e.name === 'form_abandon') {
            setOutreachEnabled(true);
          }
        }, e.delay);
      });

      // Check if profile qualifies for a journey — add promotion_sent event
      const qualifyingJourney = state.journeys.find(j => {
        const audience = state.audiences.find(a => a.key === j.audience_key);
        return audience && audience.members.includes(profile.id);
      });

      if (qualifyingJourney) {
        setTimeout(() => {
          if (!list.isConnected) return;
          const row = document.createElement('div');
          row.className = 'profile-event-row entering';
          row.innerHTML = '<span class="profile-event-dot dot-success"></span>' +
            '<span class="profile-event-name">promotion_sent</span>' +
            '<span class="profile-event-time">Just now</span>';
          list.prepend(row);
          setTimeout(() => row.classList.remove('entering'), 350);
          triggerPromotionalOutreach(profile);
        }, 8000);
      }

    } else if (tabName === 'audiences') {
      const matching = state.audiences.filter(a => a.members.includes(profile.id));
      if (matching.length === 0) {
        container.innerHTML = '<div class="empty-tab">No audiences yet</div>';
      } else {
        container.innerHTML = '<div class="tag-list">' +
          matching.map(a => '<span class="tag-item">' + a.name + '</span>').join('') +
          '</div>';
      }

    } else if (tabName === 'journeys') {
      const matchingJourneys = state.journeys.filter(j => {
        const audience = state.audiences.find(a => a.key === j.audience_key);
        return audience && audience.members.includes(profile.id);
      });
      if (matchingJourneys.length === 0) {
        container.innerHTML = '<div class="empty-tab">No journeys yet</div>';
      } else {
        container.innerHTML = '<div class="tag-list">' +
          matchingJourneys.map(j => '<span class="tag-item">' + j.name + '</span>').join('') +
          '</div>';
      }

    } else if (tabName === 'identities') {
      container.innerHTML = `<table class="traits-table">
        <tr><td>anonymous_id</td><td>${'ajs_' + Math.random().toString(36).substring(2, 10)}</td></tr>
        <tr><td>user_id</td><td>${profile.customer_id}</td></tr>
        <tr><td>email</td><td>${profile.email}</td></tr>
        <tr><td>phone</td><td>${profile.phone}</td></tr>
      </table>`;
    }
  }

  // ==================== PROMOTIONAL OUTREACH ====================
  function triggerPromotionalOutreach(profile) {
    const channel = profile.preferred_channel;
    if (channel === 'rcs_sms' || channel === 'sms') {
      fetch(`${CONFIG.functionsBaseUrl}/send-rcs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: profile.phone, contentVariables: JSON.stringify({ '1': profile.name }) })
      }).then(r => r.json()).then(() => {
        addConversationMessage('outbound', 'rcs', 'Promotional RCS/SMS sent to ' + profile.name);
      }).catch(err => console.error('Promo send failed:', err));
    } else if (channel === 'email') {
      fetch(`${CONFIG.functionsBaseUrl}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: profile.email })
        // Template details to be added when user provides them
      }).then(r => r.json()).then(() => {
        addConversationMessage('outbound', 'email', 'Promotional email sent to ' + profile.name);
      }).catch(err => console.error('Promo email failed:', err));
    }
  }

  // ==================== JOURNEY WIZARD ====================
  function renderJourneyWizard(step) {
    const container = document.getElementById('journey-wizard');
    const steps = ['Select Trigger', 'Set Up', 'Build'];
    const header = renderWizardHeader('Create Journey', steps, step);

    let content = '';

    if (step === 1) {
      content = `
        <div style="display:flex;gap:24px;padding:24px;">
          <div style="flex:1;">
            <h3 class="wizard-section-title">Select a Trigger</h3>
            <div class="trigger-option dimmed">
              <span>&#9881;</span>
              <div>
                <div style="font-weight:600;font-size:14px;">Profile performs an event</div>
                <div style="font-size:12px;color:#6b7280;">Trigger when a profile performs a specific event</div>
              </div>
            </div>
            <div class="trigger-option selected">
              <span>&#128100;</span>
              <div>
                <div style="font-weight:600;font-size:14px;">Profile enters an audience</div>
                <div style="font-size:12px;color:#6b7280;">Trigger when a profile enters a specific audience</div>
              </div>
            </div>
          </div>
          <div style="width:300px;">
            <div class="trigger-description">
              <h4 style="font-size:14px;font-weight:600;margin-bottom:8px;">Profile enters an audience</h4>
              <p style="font-size:13px;color:#6b7280;">This trigger fires when a profile is added to a selected audience. Use this to start journeys based on audience membership changes.</p>
            </div>
          </div>
        </div>`;
    } else if (step === 2) {
      const audienceOptions = state.audiences.map(a =>
        `<option value="${a.key}">${a.name}</option>`
      ).join('');
      content = `
        <div class="journey-form">
          <h3 class="wizard-section-title">Set Up Your Journey</h3>
          <div class="wizard-form-group">
            <label>Name</label>
            <input type="text" data-field="journey-name" placeholder="e.g. Re-engagement campaign" value="${state._journeyName || ''}">
          </div>
          <div class="wizard-form-group">
            <label>Description</label>
            <textarea data-field="journey-description" placeholder="Describe this journey...">${state._journeyDescription || ''}</textarea>
          </div>
          <div class="wizard-form-group">
            <label>Entry audience</label>
            <select data-field="journey-audience">
              <option value="">Select an audience...</option>
              ${audienceOptions}
            </select>
          </div>
          <div class="wizard-form-group" style="opacity:0.5;">
            <label><input type="checkbox" disabled> Include anonymous profiles</label>
          </div>
          <div class="wizard-form-group">
            <label>Entry frequency</label>
            <div class="frequency-option selected">
              <div style="font-weight:600;font-size:14px;">One time</div>
              <div style="font-size:12px;color:#6b7280;">Each profile enters the journey only once</div>
            </div>
            <div class="frequency-option dimmed">
              <div style="font-weight:600;font-size:14px;">Re-enter after exiting</div>
              <div style="font-size:12px;color:#6b7280;">Profiles can re-enter after they exit the journey</div>
            </div>
          </div>
        </div>`;
    } else if (step === 3) {
      const audienceKey = state._journeyAudienceKey || '';
      const audience = state.audiences.find(a => a.key === audienceKey);
      const audienceName = audience ? audience.name : 'selected audience';
      content = `
        <div class="journey-canvas-layout">
          <div class="journey-widget-panel">
            <div class="widget-section-label">Flow Control</div>
            <div class="widget-item">&#9202; Delay</div>
            <div class="widget-item">&#9208; Hold until</div>
            <div class="widget-item">&#128256; Data split</div>
            <div class="widget-item">&#127922; Randomized split</div>
            <div class="widget-section-label">Actions</div>
            <div class="widget-item">&#128640; Send to destination</div>
          </div>
          <div class="journey-canvas">
            <div class="canvas-node canvas-node-trigger">
              <div class="canvas-node-type">Trigger</div>
              <div class="canvas-node-label">new_promotion_published</div>
              <div class="canvas-node-desc">When profile enters ${audienceName}</div>
            </div>
            <div class="canvas-connector"></div>
            <div class="canvas-arrow"></div>
            <div class="canvas-node canvas-node-destination">
              <div class="canvas-node-type">Destination</div>
              <div class="canvas-node-label">Send Interaction</div>
              <div class="canvas-node-desc">Send via preferred channel</div>
            </div>
          </div>
        </div>`;
    }

    // Footer
    const isFirst = step === 1;
    const isLast = step === 3;
    let footerRight = '';
    if (!isFirst) footerRight += '<button class="btn btn-secondary" id="journey-back-btn">Back</button>';
    if (isLast) {
      footerRight += '<button class="btn btn-primary" id="journey-save-btn">Save</button>';
    } else if (step === 2) {
      footerRight += '<button class="btn btn-primary" id="journey-build-btn">Build journey</button>';
    } else {
      footerRight += '<button class="btn btn-primary" id="journey-next-btn">Next</button>';
    }

    const footer = `
      <div class="wizard-footer">
        <button class="btn btn-secondary" id="journey-cancel-btn">Cancel</button>
        <div class="wizard-footer-right">${footerRight}</div>
      </div>`;

    container.innerHTML = header + '<div class="wizard-body">' + content + '</div>' + footer;

    // Wire buttons
    document.getElementById('journey-cancel-btn').addEventListener('click', closeJourneyWizard);

    const backBtn = document.getElementById('journey-back-btn');
    if (backBtn) backBtn.addEventListener('click', () => {
      // Save form values when going back from step 2
      if (step === 2) {
        const nameEl = container.querySelector('[data-field="journey-name"]');
        const descEl = container.querySelector('[data-field="journey-description"]');
        const audEl = container.querySelector('[data-field="journey-audience"]');
        if (nameEl) state._journeyName = nameEl.value;
        if (descEl) state._journeyDescription = descEl.value;
        if (audEl) state._journeyAudienceKey = audEl.value;
      }
      state.wizardStep = step - 1;
      renderJourneyWizard(state.wizardStep);
    });

    const nextBtn = document.getElementById('journey-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', () => {
      state.wizardStep = step + 1;
      renderJourneyWizard(state.wizardStep);
    });

    const buildBtn = document.getElementById('journey-build-btn');
    if (buildBtn) buildBtn.addEventListener('click', () => {
      // Save form values from step 2 before advancing
      const nameEl = container.querySelector('[data-field="journey-name"]');
      const descEl = container.querySelector('[data-field="journey-description"]');
      const audEl = container.querySelector('[data-field="journey-audience"]');
      if (nameEl) state._journeyName = nameEl.value;
      if (descEl) state._journeyDescription = descEl.value;
      if (audEl) state._journeyAudienceKey = audEl.value;
      state.wizardStep = 3;
      renderJourneyWizard(3);
    });

    const saveBtn = document.getElementById('journey-save-btn');
    if (saveBtn) saveBtn.addEventListener('click', createJourney);
  }

  function openJourneyWizard() {
    state.activeWizard = 'journey';
    state.wizardStep = 1;
    document.getElementById('journeys-list-container').classList.add('hidden');
    document.getElementById('journey-wizard').classList.remove('hidden');
    renderJourneyWizard(1);
  }

  function closeJourneyWizard() {
    state.activeWizard = null;
    state.wizardStep = 0;
    document.getElementById('journey-wizard').classList.add('hidden');
    document.getElementById('journeys-list-container').classList.remove('hidden');
  }

  function createJourney() {
    const journey = {
      name: state._journeyName || 'Untitled Journey',
      description: state._journeyDescription || '',
      audience_key: state._journeyAudienceKey || '',
      trigger: 'new_promotion_published',
      destination: 'Send Interaction',
      status: 'Draft'
    };
    state.journeys.push(journey);
    // Clean up temp state
    delete state._journeyName;
    delete state._journeyDescription;
    delete state._journeyAudienceKey;
    closeJourneyWizard();
    renderJourneysList();
  }

  function renderJourneysList() {
    const tbody = document.getElementById('journeys-table-body');
    if (!tbody) return;

    if (state.journeys.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#8a8f98;padding:40px 0;">
        <div class="empty-state-icon">&#128736;</div>
        <div class="empty-state-title">No journeys yet</div>
        <div class="empty-state-text">Create your first journey to start engaging profiles across channels.</div>
        <button class="btn btn-primary btn-sm btn-new-journey-inline">+ Create journey</button>
      </td></tr>`;
      // Re-wire inline button
      const inlineBtn = tbody.querySelector('.btn-new-journey-inline');
      if (inlineBtn) inlineBtn.addEventListener('click', openJourneyWizard);
      return;
    }

    tbody.innerHTML = state.journeys.map(j => `
      <tr>
        <td style="font-weight:500;">${j.name}</td>
        <td><span class="status-badge status-draft">Draft</span></td>
        <td>${j.destination}</td>
        <td>Paul Heath</td>
        <td>Just now</td>
      </tr>
    `).join('');
  }

  // ==================== INIT ====================
  async function init() {
    // Clear previous session messages
    fetch(`${CONFIG.functionsBaseUrl}/clear-messages`, { method: 'POST' }).catch(() => {});

    await loadBrand(CONFIG.brand);
    await loadTemplates();
    renderProfileTable();
    setupSidebarListeners();
    setupEventListeners();
    setOutreachEnabled(false);
    startPolling();

    // Pre-populate default audience with all customer profiles
    const customerIds = MOCK_PROFILES.filter(p => p.type === 'customer').map(p => p.id);
    state.audiences.push({
      name: 'Property & Casualty Promotion',
      key: 'property_casualty_promotion',
      description: 'All customers eligible for property and casualty product promotions',
      conditions: [],
      destination: 'Send Interaction',
      members: customerIds,
      isDefault: true
    });
    // Start on Sources view (default)
    switchView('sources');
  }

  // ==================== EXPOSE FOR TASK 9 ====================
  window.__app = { CONFIG, state, dom, updateProfileField, switchView, openAudienceWizard, closeAudienceWizard, computeAudienceMembers, createAudience, renderAudienceDetail, renderAudiencesList, showAudienceDetail, openJourneyWizard, closeJourneyWizard, createJourney, triggerPromotionalOutreach };

  // Start the app
  init();
})();
