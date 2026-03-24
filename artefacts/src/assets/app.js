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
  }

  // ==================== INIT ====================
  async function init() {
    await loadBrand(CONFIG.brand);
    const scenario = await loadScenario(CONFIG.scenario);
    if (scenario) {
      playScenario(scenario);
    }
    setupEventListeners();
  }

  // ==================== EXPOSE FOR TASK 9 ====================
  window.__app = { CONFIG, state, dom, updateProfileField };

  // Start the app
  init();
})();
