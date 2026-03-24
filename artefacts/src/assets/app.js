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
    currentView: 'sources'
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
    statusVoice: document.getElementById('status-voice')
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
    'engage': 'view-events'
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

    // Sub-items
    document.querySelectorAll('.sidebar-subitem[data-view]').forEach(item => {
      item.addEventListener('click', () => switchView(item.dataset.view));
    });

    // Section expand/collapse
    document.querySelectorAll('.sidebar-section-header').forEach(header => {
      header.addEventListener('click', () => {
        const subnav = header.nextElementSibling;
        if (subnav) subnav.classList.toggle('open');
      });
    });
  }

  // ==================== PROFILE EXPLORER ====================
  const MOCK_PROFILES = [
    { id: 'usr_001', name: 'Paul Heath', email: 'pheath@twilio.com', phone: '+13125689550', region: 'Southeast', status: 'At Risk', engagement_score: 45, agent_id: 'AGT-2847', license_state: 'FL', last_contacted: '14 days ago', policies_sold_ytd: 18, sales_target_ytd: 40, target_attainment: '45%', region_rank: '12 of 15', avg_policy_value: '$4,200', book_of_business: '$1.2M', tenure_years: 3, appointment_status: 'Active' },
    { id: 'usr_002', name: 'Carter Howard', email: 'cahoward@twilio.com', phone: '+14073047101', region: 'West', status: 'Active', engagement_score: 89, agent_id: 'AGT-1923', license_state: 'CA', last_contacted: '2 days ago', policies_sold_ytd: 34, sales_target_ytd: 40, target_attainment: '85%', region_rank: '3 of 22', avg_policy_value: '$6,800', book_of_business: '$3.8M', tenure_years: 7, appointment_status: 'Active' },
    { id: 'usr_003', name: 'James Okafor', email: 'james.okafor@example.com', phone: '+1 (678) 555-0183', region: 'Southeast', status: 'Active', engagement_score: 76, agent_id: 'AGT-3301', license_state: 'GA', last_contacted: '5 days ago', policies_sold_ytd: 27, sales_target_ytd: 35, target_attainment: '77%', region_rank: '6 of 15', avg_policy_value: '$3,900', book_of_business: '$2.1M', tenure_years: 5, appointment_status: 'Active' },
    { id: 'usr_004', name: 'Emily Watson', email: 'emily.watson@example.com', phone: '+1 (214) 555-0321', region: 'Central', status: 'Inactive', engagement_score: 23, agent_id: 'AGT-3102', license_state: 'TX', last_contacted: '32 days ago', policies_sold_ytd: 4, sales_target_ytd: 30, target_attainment: '13%', region_rank: '18 of 18', avg_policy_value: '$2,100', book_of_business: '$420K', tenure_years: 1, appointment_status: 'Under Review' },
    { id: 'usr_005', name: 'Roberto Mendez', email: 'roberto.mendez@example.com', phone: '+1 (305) 555-0456', region: 'Southeast', status: 'Active', engagement_score: 91, agent_id: 'AGT-2890', license_state: 'FL', last_contacted: '1 day ago', policies_sold_ytd: 42, sales_target_ytd: 40, target_attainment: '105%', region_rank: '1 of 15', avg_policy_value: '$7,500', book_of_business: '$5.4M', tenure_years: 10, appointment_status: 'Active' },
    { id: 'usr_006', name: 'Linda Park', email: 'linda.park@example.com', phone: '+1 (773) 555-0199', region: 'Midwest', status: 'At Risk', engagement_score: 38, agent_id: 'AGT-4010', license_state: 'IL', last_contacted: '21 days ago', policies_sold_ytd: 9, sales_target_ytd: 30, target_attainment: '30%', region_rank: '11 of 12', avg_policy_value: '$3,100', book_of_business: '$890K', tenure_years: 2, appointment_status: 'Active' }
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

  function renderProfileTable() {
    const tbody = document.getElementById('profile-table-body');
    tbody.innerHTML = MOCK_PROFILES.map(p => {
      const statusClass = p.status.toLowerCase().includes('risk') || p.status.toLowerCase().includes('inactive') ? 'badge-warning' : 'badge-success';
      return `<tr data-profile-id="${p.id}">
        <td>${p.name}</td>
        <td>${p.email}</td>
        <td>${p.phone}</td>
        <td><span class="profile-badge ${statusClass}">${p.status}</span></td>
        <td>${p.engagement_score}</td>
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
      const traits = {
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
        'tenure_years': profile.tenure_years
      };
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
        }, e.delay);
      });

    } else if (tabName === 'audiences') {
      container.innerHTML = `<div class="tag-list">
        <span class="tag-item">High Value Customers</span>
        <span class="tag-item">Southeast Region</span>
        <span class="tag-item ${profile.predicted_churn === 'High' ? '' : 'tag-item-muted'}">Churn Risk</span>
        <span class="tag-item">Cross-sell Eligible</span>
      </div>`;

    } else if (tabName === 'journeys') {
      container.innerHTML = `<div class="tag-list">
        <span class="tag-item">Onboarding Complete</span>
        <span class="tag-item ${profile.status === 'At Risk' ? '' : 'tag-item-muted'}">Re-engagement Campaign</span>
        <span class="tag-item tag-item-muted">Policy Renewal (upcoming)</span>
      </div>`;

    } else if (tabName === 'identities') {
      container.innerHTML = `<table class="traits-table">
        <tr><td>anonymous_id</td><td>${'ajs_' + Math.random().toString(36).substring(2, 10)}</td></tr>
        <tr><td>user_id</td><td>${profile.customer_id}</td></tr>
        <tr><td>email</td><td>${profile.email}</td></tr>
        <tr><td>phone</td><td>${profile.phone}</td></tr>
      </table>`;
    }
  }

  // ==================== INIT ====================
  async function init() {
    await loadBrand(CONFIG.brand);
    await loadTemplates();
    renderProfileTable();
    setupSidebarListeners();
    startPolling();
    setupEventListeners();
    // Start on Sources view (default)
    switchView('sources');
  }

  // ==================== EXPOSE FOR TASK 9 ====================
  window.__app = { CONFIG, state, dom, updateProfileField, switchView };

  // Start the app
  init();
})();
