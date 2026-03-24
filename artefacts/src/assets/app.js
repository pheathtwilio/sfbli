(function() {
  'use strict';

  // ==================== CONFIG ====================
  const CONFIG = {
    functionsBaseUrl: '', // Set to Twilio Functions base URL
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
    activeChannel: null
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
  async function sendRcs(contentSid, contentVariables) {
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
      addConversationMessage('outbound', 'rcs', `[Content Template: ${contentSid}]`);
    } catch (e) {
      setChannelStatus('rcs', `Error: ${e.message}`);
    }
  }

  async function sendEmail(templateId, dynamicData) {
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
      addConversationMessage('system', 'email', `Email sent to ${state.profile.email}`);
    } catch (e) {
      setChannelStatus('email', `Error: ${e.message}`);
    }
  }

  async function triggerVoiceCall() {
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
            addConversationMessage('inbound', msg.channel || 'sms', msg.body);
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

    dom.templateCancelBtn.addEventListener('click', hideTemplateSelector);
    dom.templateSendBtn.addEventListener('click', () => {
      const selectedId = dom.templateDropdown.value;
      if (!selectedId) return;

      const variables = {};
      dom.templateVariables.querySelectorAll('input').forEach(input => {
        variables[input.name] = input.value;
      });

      if (state.activeChannel === 'rcs') {
        sendRcs(selectedId, variables);
      } else if (state.activeChannel === 'email') {
        sendEmail(selectedId, variables);
      }
      hideTemplateSelector();
    });
  }

  // ==================== INIT ====================
  async function init() {
    await loadBrand(CONFIG.brand);
    await loadTemplates();
    const scenario = await loadScenario(CONFIG.scenario);
    playScenario(scenario);
    startPolling();
    setupEventListeners();
  }

  // ==================== EXPOSE FOR TASK 9 ====================
  window.__app = { CONFIG, state, dom, updateProfileField };

  // Start the app
  init();
})();
