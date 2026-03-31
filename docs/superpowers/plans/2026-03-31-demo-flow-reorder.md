# Demo Flow Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the SFBLI demo into a 3-step state machine with per-profile conversations and reordered event sequences.

**Architecture:** Add `demoStep`, `stepsPlayed`, `activeProfileId`, per-profile `conversations`, and `profileEvents` to state. Replace the single-scenario auto-play with step-aware event triggers on the Profile Explorer Events tab. Scope the right panel (outreach + conversation) to the active profile.

**Tech Stack:** Vanilla JS (app.js), HTML (index.html), JSON scenarios, Twilio Functions (unchanged)

**Spec:** `docs/superpowers/specs/2026-03-31-demo-flow-reorder-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `artefacts/src/assets/app.js` | Modify | State machine, per-profile conversations, events tab logic, step transitions, auto-outreach, replay |
| `artefacts/src/assets/scenarios/step1.json` | Create | Step 1 events (Paul Heath engagement, no abandon) |
| `artefacts/src/assets/scenarios/step2.json` | Create | Step 2 events (Marco Santos promotion) |
| `artefacts/src/assets/scenarios/step3.json` | Create | Step 3 events (policy change, abandon) |
| `artefacts/src/assets/index.html` | Modify | Profile context indicator in right panel |
| `artefacts/src/.env` | Modify | Add new env vars |

---

### Task 1: Create step scenario files and update mock data

**Files:**
- Create: `artefacts/src/assets/scenarios/step1.json`
- Create: `artefacts/src/assets/scenarios/step2.json`
- Create: `artefacts/src/assets/scenarios/step3.json`
- Modify: `artefacts/src/assets/app.js:637` (Marco Santos preferred_channel)
- Modify: `artefacts/src/.env`

- [ ] **Step 1: Create step1.json**

```json
{
  "name": "Agent Engagement",
  "description": "Paul Heath engagement events — no form abandon (moved to Step 3)",
  "profileId": "usr_001",
  "events": [
    { "type": "email_delivered", "delay": 0, "label": "Email Delivered: Policy Renewal Reminder" },
    { "type": "email_opened", "delay": 1500, "label": "Email Opened: Policy Renewal Reminder" },
    { "type": "page_view", "delay": 3000, "label": "Viewed Auto Insurance Page" },
    { "type": "page_view", "delay": 4500, "label": "Viewed Get Quote" },
    { "type": "form_start", "delay": 6000, "label": "Started Quote Form" },
    { "type": "form_field", "delay": 7500, "label": "Entered Vehicle Type" }
  ]
}
```

- [ ] **Step 2: Create step2.json**

```json
{
  "name": "Journey Promotion",
  "description": "Marco Santos journey triggers promotional outreach",
  "profileId": "cust_001",
  "events": [
    { "type": "promotion_sent", "delay": 0, "label": "Journey Triggered: Property & Casualty Promotion" }
  ]
}
```

- [ ] **Step 3: Create step3.json**

```json
{
  "name": "Policy Class Change",
  "description": "Policy class change triggers email, then abandoned form events trigger RCS outreach",
  "profileId": "usr_001",
  "events": [
    { "type": "policy_class_change", "delay": 0, "label": "Policy Class Change Detected: Marco Santos" },
    { "type": "email_sent", "delay": 2000, "label": "Email Sent: Policy Review Required — Paul Heath" },
    { "type": "form_abandon", "delay": 5000, "label": "Form Abandoned: Quote Form" },
    { "type": "session_end", "delay": 7000, "label": "Session Ended (Abandoned)" }
  ],
  "profile_updates": {
    "status": "At Risk",
    "engagement_score_before": 72,
    "engagement_score_after": 45,
    "predicted_churn": "High"
  }
}
```

- [ ] **Step 4: Change Marco Santos preferred_channel**

In `artefacts/src/assets/app.js:637`, change `preferred_channel: 'email'` to `preferred_channel: 'sms'` on the `cust_001` profile entry.

- [ ] **Step 5: Add env vars to .env**

Append to `artefacts/src/.env`:
```
JOURNEY_RCS_CONTENT_SID=
POLICY_CHANGE_EMAIL_TEMPLATE_ID=
```

- [ ] **Step 6: Commit**

```bash
git add artefacts/src/assets/scenarios/step1.json artefacts/src/assets/scenarios/step2.json artefacts/src/assets/scenarios/step3.json artefacts/src/assets/app.js artefacts/src/.env
git commit -m "feat: add step scenario files and update Marco Santos channel"
```

---

### Task 2: Add state machine properties to app state

**Files:**
- Modify: `artefacts/src/assets/app.js:13-27` (state object)

- [ ] **Step 1: Add new state properties**

In `artefacts/src/assets/app.js`, add these properties to the `state` object (after line 26, before the closing `};`):

```javascript
    demoStep: 1,
    stepsPlayed: new Set(),
    activeProfileId: null,
    profileEvents: {},
    lastOutboundProfileId: null
```

Also change `conversation: [],` to `conversations: {},` (pluralize and change to object).

- [ ] **Step 2: Load step scenario files**

Add a `STEP_SCENARIOS` constant after the `CONFIG` block (after line 10). This will be populated during init:

```javascript
  const STEP_SCENARIOS = {};
```

In the `init()` function (around line 1527), after `await loadBrand(CONFIG.brand);`, add:

```javascript
    // Load step scenarios
    const [step1, step2, step3] = await Promise.all([
      loadScenario('step1'),
      loadScenario('step2'),
      loadScenario('step3')
    ]);
    STEP_SCENARIOS[1] = step1;
    STEP_SCENARIOS[2] = step2;
    STEP_SCENARIOS[3] = step3;
```

- [ ] **Step 3: Commit**

```bash
git add artefacts/src/assets/app.js
git commit -m "feat: add demo state machine properties and load step scenarios"
```

---

### Task 3: Add icons for new event types

**Files:**
- Modify: `artefacts/src/assets/app.js:142-162` (getEventIcon function)

Note: `playScenario` is no longer called in the new flow (events are rendered directly in the Events tab). It remains as-is for backward compatibility but receives no modifications.

- [ ] **Step 1: Add icons for new event types**

In `getEventIcon` (line 142), add these entries to the `iconMap` object:

```javascript
      'promotion_sent': '&#128640;',       // Rocket
      'policy_class_change': '&#128260;',   // Arrows
      'email_sent': '&#9993;',             // Envelope
```

- [ ] **Step 2: Commit**

```bash
git add artefacts/src/assets/app.js
git commit -m "feat: add icons for new demo event types"
```

---

### Task 4: Remove auto-play on view switch and old scenario trigger

**Files:**
- Modify: `artefacts/src/assets/app.js:595-600` (switchView auto-play)
- Modify: `artefacts/src/assets/app.js:468-475` (replay button handler)

- [ ] **Step 1: Remove auto-play in switchView**

Delete lines 596-600 in `switchView()`:

```javascript
    // DELETE THIS BLOCK:
    if (viewName === 'home' || viewName === 'engage') {
      if (state.events.length === 0) {
        loadScenario(CONFIG.scenario).then(scenario => playScenario(scenario));
      }
    }
```

- [ ] **Step 2: Update replay button to reset state machine**

Replace the replay button handler (lines 468-475) with:

```javascript
    dom.replayBtn.addEventListener('click', () => {
      // Reset state machine
      state.demoStep = 1;
      state.stepsPlayed = new Set();
      state.activeProfileId = null;
      state.profileEvents = {};
      state.conversations = {};
      state.lastOutboundProfileId = null;
      state.events = [];
      state.outreachEnabled = false;

      // Clear UI
      dom.eventList.innerHTML = '';
      dom.conversationThread.innerHTML = '<div class="conversation-empty">No messages yet. Send outreach to begin.</div>';
      setOutreachEnabled(false);
      updateRightPanelHeader(null);
    });
```

Note: `updateRightPanelHeader` will be created in Task 6. For now this will cause a reference error if replay is clicked before Task 6 is complete — that's fine, we'll wire it up.

- [ ] **Step 3: Commit**

```bash
git add artefacts/src/assets/app.js
git commit -m "feat: remove auto-play on view switch and update replay to reset state machine"
```

---

### Task 5: Per-profile conversation storage and right panel switching

**Files:**
- Modify: `artefacts/src/assets/app.js:408-436` (addConversationMessage)
- Modify: `artefacts/src/assets/app.js:438-462` (startPolling)
- Modify: `artefacts/src/assets/app.js:1120-1150` (showProfileDetail)

- [ ] **Step 1: Rewrite addConversationMessage to use per-profile storage**

Replace `addConversationMessage` (lines 408-436) with:

```javascript
  function addConversationMessage(direction, channel, body, profileId) {
    // Default to active profile if not specified
    const pid = profileId || state.activeProfileId;
    if (!pid) return;

    // Initialize conversation array for this profile if needed
    if (!state.conversations[pid]) state.conversations[pid] = [];

    const msg = { direction, channel, body, timestamp: Date.now() };
    state.conversations[pid].push(msg);

    // Only render if this profile is currently active
    if (pid === state.activeProfileId) {
      renderConversationMessage(msg);
    }
  }

  function renderConversationMessage(msg) {
    const empty = dom.conversationThread.querySelector('.conversation-empty');
    if (empty) empty.remove();

    const div = document.createElement('div');
    const channelIcons = { rcs: '&#128172;', sms: '&#128172;', email: '&#9993;', voice: '&#128222;' };

    if (msg.direction === 'system') {
      div.className = 'msg-bubble msg-system';
      div.innerHTML = `
        <span class="msg-channel-icon">${channelIcons[msg.channel] || ''}</span>
        <span>${msg.body}</span>
        <span class="msg-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
      `;
    } else {
      div.className = `msg-bubble msg-${msg.direction}`;
      div.innerHTML = `
        <div class="msg-body">${msg.body}</div>
        <div class="msg-meta">
          <span class="msg-channel-icon">${channelIcons[msg.channel] || ''}</span>
          <span class="msg-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
        </div>
      `;
    }

    dom.conversationThread.appendChild(div);
    dom.conversationThread.scrollTop = dom.conversationThread.scrollHeight;
  }

  function renderConversationForProfile(profileId) {
    dom.conversationThread.innerHTML = '';
    const messages = state.conversations[profileId] || [];
    if (messages.length === 0) {
      dom.conversationThread.innerHTML = '<div class="conversation-empty">No messages yet. Send outreach to begin.</div>';
      return;
    }
    messages.forEach(msg => renderConversationMessage(msg));
  }
```

- [ ] **Step 2: Update polling to route inbound messages**

In `startPolling` (lines 438-462), update the message routing inside the forEach to use `lastOutboundProfileId`:

```javascript
          data.messages.forEach(msg => {
            const targetProfileId = state.lastOutboundProfileId || state.activeProfileId;
            const fromNumber = (msg.from || '').replace(/\D/g, '');
            const match = MOCK_PROFILES.find(p => p.phone.replace(/\D/g, '') === fromNumber);
            const senderName = match ? match.name : msg.from;
            const displayBody = senderName ? `<strong>${senderName}:</strong> ${msg.body}` : msg.body;
            addConversationMessage('inbound', msg.channel || 'sms', displayBody, targetProfileId);
            state.lastPollTimestamp = Math.max(state.lastPollTimestamp, msg.timestamp);
          });
```

- [ ] **Step 3: Set activeProfileId and render conversation on profile select**

In `showProfileDetail` (line 1120), add at the top of the function:

```javascript
    state.activeProfileId = profile.id;
    renderConversationForProfile(profile.id);
    updateRightPanelHeader(profile);
```

And update the back button handler to clear active profile:

```javascript
    document.getElementById('profile-back-btn').onclick = () => {
      state.activeProfileId = null;
      detail.classList.add('hidden');
      document.getElementById('profile-list-container').classList.remove('hidden');
    };
```

- [ ] **Step 4: Commit**

```bash
git add artefacts/src/assets/app.js
git commit -m "feat: per-profile conversation storage and right panel switching"
```

---

### Task 6: Right panel profile context indicator

**Files:**
- Modify: `artefacts/src/assets/index.html:370-371` (add profile indicator element)
- Modify: `artefacts/src/assets/app.js` (add updateRightPanelHeader function)

- [ ] **Step 1: Add profile indicator to HTML**

In `artefacts/src/assets/index.html`, after line 370 (`<section class="panel-section" id="outreach-section">`) and before `<h2>Outreach</h2>`, add:

```html
        <div id="right-panel-profile" class="right-panel-profile hidden">
          <span class="right-panel-avatar" id="right-panel-avatar"></span>
          <span class="right-panel-name" id="right-panel-name"></span>
        </div>
```

- [ ] **Step 2: Add updateRightPanelHeader function to app.js**

Add this function in the HELPERS section (after `setChannelStatus`, around line 405):

```javascript
  function updateRightPanelHeader(profile) {
    const container = document.getElementById('right-panel-profile');
    const avatar = document.getElementById('right-panel-avatar');
    const name = document.getElementById('right-panel-name');
    if (!container) return;

    if (!profile) {
      container.classList.add('hidden');
      return;
    }

    const initials = profile.name.split(' ').map(n => n[0]).join('');
    avatar.textContent = initials;
    name.textContent = profile.name;
    container.classList.remove('hidden');
  }
```

- [ ] **Step 3: Add minimal CSS for the profile indicator**

In `artefacts/src/assets/index.html`, add to the existing `<style>` block (or inline styles):

```css
.right-panel-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  font-weight: 600;
}
.right-panel-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #6366f1;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}
```

- [ ] **Step 4: Commit**

```bash
git add artefacts/src/assets/app.js artefacts/src/assets/index.html
git commit -m "feat: add profile context indicator to right panel"
```

---

### Task 7: Events tab trigger logic (core state machine)

**Files:**
- Modify: `artefacts/src/assets/app.js:1200-1241` (renderProfileTab 'events' case)

This is the heart of the demo flow reorder. Replace the entire `events` tab case in `renderProfileTab`.

- [ ] **Step 1: Replace the events tab rendering**

Replace the `} else if (tabName === 'events') {` block (lines 1200-1241) with:

```javascript
    } else if (tabName === 'events') {
      container.innerHTML = '<div class="profile-events-list" id="profile-events-list"></div>';
      const list = document.getElementById('profile-events-list');

      // Check if this profile has demo events for the current step
      const stepConfig = {
        'usr_001': { 1: 'step1', 3: 'step3' },   // Paul Heath: Step 1 and Step 3
        'cust_001': { 2: 'step2' }                 // Marco Santos: Step 2
      };

      const profileSteps = stepConfig[profile.id];
      if (!profileSteps) return; // No demo events for this profile

      const scenarioKey = profileSteps[state.demoStep];
      if (!scenarioKey) return; // Wrong step for this profile

      const stepNumber = state.demoStep;

      // If already played, show events statically
      if (state.stepsPlayed.has(stepNumber)) {
        const events = state.profileEvents[profile.id] || [];
        events.forEach(evt => {
          const row = document.createElement('div');
          row.className = 'profile-event-row';
          const isWarning = evt.type === 'form_abandon' || evt.type === 'session_end';
          row.innerHTML = `<span class="profile-event-dot${isWarning ? ' dot-warning' : ''}"></span><span class="profile-event-name">${evt.label || evt.type}</span><span class="profile-event-time">Just now</span>`;
          list.prepend(row);
        });
        return;
      }

      // Show any previously stored events for this profile (e.g., Step 1 events when Step 3 starts)
      const existingEvents = state.profileEvents[profile.id] || [];
      existingEvents.forEach(evt => {
        const row = document.createElement('div');
        row.className = 'profile-event-row';
        const isWarning = evt.type === 'form_abandon' || evt.type === 'session_end';
        row.innerHTML = `<span class="profile-event-dot${isWarning ? ' dot-warning' : ''}"></span><span class="profile-event-name">${evt.label || evt.type}</span><span class="profile-event-time">Just now</span>`;
        list.prepend(row);
      });

      // Play this step's events
      const scenario = STEP_SCENARIOS[stepNumber];
      if (!scenario || !scenario.events) return;

      if (!state.profileEvents[profile.id]) state.profileEvents[profile.id] = [];

      scenario.events.forEach((evt, index) => {
        setTimeout(() => {
          if (!list.isConnected) return;
          const row = document.createElement('div');
          row.className = 'profile-event-row entering';
          const isWarning = evt.type === 'form_abandon' || evt.type === 'session_end';
          row.innerHTML = `<span class="profile-event-dot${isWarning ? ' dot-warning' : ''}"></span><span class="profile-event-name">${evt.label || evt.type}</span><span class="profile-event-time">Just now</span>`;
          list.prepend(row);
          setTimeout(() => row.classList.remove('entering'), 350);

          // Store event for static replay later
          state.profileEvents[profile.id].push(evt);

          // Handle per-event actions
          handleStepEvent(evt, profile, stepNumber);

          // After last event in this step
          if (index === scenario.events.length - 1) {
            state.stepsPlayed.add(stepNumber);
            handleStepComplete(profile, stepNumber);
          }
        }, evt.delay);
      });
```

- [ ] **Step 2: Commit**

```bash
git add artefacts/src/assets/app.js
git commit -m "feat: replace events tab with step-aware trigger logic"
```

---

### Task 8: Step event handlers and auto-outreach

**Files:**
- Modify: `artefacts/src/assets/app.js` (add handleStepEvent, handleStepComplete, advanceDemoStep functions)

- [ ] **Step 1: Add handleStepEvent function**

Add after the `renderProfileTab` function:

```javascript
  function handleStepEvent(evt, profile, stepNumber) {
    // Step 3: auto-send email on email_sent event
    if (stepNumber === 3 && evt.type === 'email_sent') {
      const templateId = CONFIG.policyChangeEmailTemplateId;
      if (templateId) {
        sendEmail(templateId, {
          customer_name: 'Marco Santos',
          policy_type: 'Whole Life',
          agent_name: 'Paul Heath'
        }, 'Policy Class Change Notification');
        state.lastOutboundProfileId = profile.id;
      } else {
        console.warn('POLICY_CHANGE_EMAIL_TEMPLATE_ID not configured, skipping email send');
      }
    }

    // Step 3: auto-send RCS after session_end
    if (stepNumber === 3 && evt.type === 'session_end') {
      const contentSid = CONFIG.promoContentSid;
      if (contentSid) {
        sendRcs(contentSid, { '1': profile.name }, 'Promotional Outreach');
        state.lastOutboundProfileId = profile.id;
      } else {
        console.warn('PROMO_CONTENT_SID not configured, skipping RCS send');
      }
    }
  }
```

- [ ] **Step 2: Add handleStepComplete function**

```javascript
  function handleStepComplete(profile, stepNumber) {
    if (stepNumber === 1) {
      // Enable outreach buttons for Paul Heath
      setOutreachEnabled(true);
    }

    if (stepNumber === 2) {
      // Auto-send RCS to Marco Santos
      const contentSid = CONFIG.journeyRcsContentSid;
      if (contentSid) {
        const marcoProfile = MOCK_PROFILES.find(p => p.id === 'cust_001');
        sendRcs(contentSid, { '1': marcoProfile.name }, 'Journey Promotion').then(() => {
          state.lastOutboundProfileId = 'cust_001';
          advanceDemoStep(3);
        });
      } else {
        console.warn('JOURNEY_RCS_CONTENT_SID not configured, skipping RCS send');
        advanceDemoStep(3);
      }
      setOutreachEnabled(true);
    }

    if (stepNumber === 3) {
      // Apply profile updates from step3 scenario
      const step3Scenario = STEP_SCENARIOS[3];
      if (step3Scenario && step3Scenario.profile_updates) {
        setTimeout(() => applyProfileUpdates(step3Scenario.profile_updates), 1000);
      }
      setOutreachEnabled(true);
    }
  }
```

- [ ] **Step 3: Add advanceDemoStep function**

```javascript
  function advanceDemoStep(toStep) {
    state.demoStep = toStep;
    console.log('Demo advanced to step', toStep);
  }
```

- [ ] **Step 4: Update sendRcs to return a promise**

The current `sendRcs` is already `async`, so it already returns a promise. No change needed — just verify that `handleStepComplete` awaits it properly. Since we're using `.then()`, this works.

- [ ] **Step 5: Wire Step 1 → Step 2 transition on outreach send**

In the existing outreach send functions (`sendRcs`, `sendEmail`, `triggerVoiceCall`), after a successful send, add the step transition. Add this helper:

```javascript
  function checkStepTransitionOnOutreach() {
    if (state.demoStep === 1) {
      advanceDemoStep(2);
    }
    state.lastOutboundProfileId = state.activeProfileId;
  }
```

The calls to `checkStepTransitionOnOutreach()` in `sendRcs` and `sendEmail` are already included in their full replacements in Task 9 Steps 3-4. For `triggerVoiceCall`, add `checkStepTransitionOnOutreach();` after the `addConversationMessage('system', 'voice', ...)` call inside its success handler (the line that adds the "Voice call initiated" message).

- [ ] **Step 6: Add CONFIG references for env vars**

Add to the `CONFIG` object (around line 6):

```javascript
    journeyRcsContentSid: '', // Set via env: JOURNEY_RCS_CONTENT_SID
    policyChangeEmailTemplateId: '', // Set via env: POLICY_CHANGE_EMAIL_TEMPLATE_ID
    promoContentSid: '', // Set via env: PROMO_CONTENT_SID
```

These will need to be populated. Since this is a Twilio Functions deployment, the env vars are available server-side. The client-side CONFIG values should be populated via a `/config` endpoint or hardcoded after template creation. For now, leave them as empty strings — the graceful degradation in `handleStepEvent` and `handleStepComplete` will log warnings.

- [ ] **Step 7: Commit**

```bash
git add artefacts/src/assets/app.js
git commit -m "feat: add step event handlers, auto-outreach, and step transitions"
```

---

### Task 9: Outreach button scoping and sendReply profile-awareness

**Files:**
- Modify: `artefacts/src/assets/app.js:244-251` (setOutreachEnabled)
- Modify: `artefacts/src/assets/app.js:253-267` (sendReply)
- Modify: `artefacts/src/assets/app.js:500-505` (conversation send button handler)

- [ ] **Step 1: Update setOutreachEnabled to check profile**

Replace `setOutreachEnabled` with:

```javascript
  function setOutreachEnabled(enabled) {
    state.outreachEnabled = enabled;
    // Only enable if current profile is a demo profile
    const isDemoProfile = state.activeProfileId === 'usr_001' || state.activeProfileId === 'cust_001';
    const actualEnabled = enabled && isDemoProfile;
    dom.btnRcs.disabled = !actualEnabled;
    dom.btnEmail.disabled = !actualEnabled;
    dom.btnVoice.disabled = !actualEnabled;
    dom.conversationInput.disabled = !actualEnabled;
    dom.conversationSendBtn.disabled = !actualEnabled;
  }
```

- [ ] **Step 2: Update sendReply to use active profile's phone**

In `sendReply`, change `state.profile.phone` to look up the active profile:

```javascript
  async function sendReply(body) {
    const activeProfile = MOCK_PROFILES.find(p => p.id === state.activeProfileId);
    if (!activeProfile || !body.trim()) return;
    try {
      const resp = await fetch(`${CONFIG.functionsBaseUrl}/send-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: activeProfile.phone, body: body.trim() })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      addConversationMessage('outbound', 'sms', body.trim());
      state.lastOutboundProfileId = state.activeProfileId;
    } catch (e) {
      addConversationMessage('system', 'sms', `Failed to send: ${e.message}`);
    }
  }
```

- [ ] **Step 3: Replace sendRcs to use active profile**

Replace the full `sendRcs` function (lines 318-349) with:

```javascript
  async function sendRcs(contentSid, contentVariables, templateName) {
    const activeProfile = MOCK_PROFILES.find(p => p.id === state.activeProfileId);
    if (!activeProfile || !activeProfile.phone) {
      setChannelStatus('rcs', 'Error: No phone number set');
      return;
    }
    setChannelStatus('rcs', 'Sending...');
    try {
      const resp = await fetch(`${CONFIG.functionsBaseUrl}/send-rcs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeProfile.phone,
          contentSid,
          contentVariables: JSON.stringify(contentVariables)
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setChannelStatus('rcs', 'Delivered');
      const varSummary = Object.entries(contentVariables)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      const displayMsg = templateName
        ? `${templateName}${varSummary ? ' (' + varSummary + ')' : ''}`
        : `RCS/SMS sent`;
      addConversationMessage('outbound', 'rcs', displayMsg);
      checkStepTransitionOnOutreach();
    } catch (e) {
      setChannelStatus('rcs', `Error: ${e.message}`);
    }
  }
```

- [ ] **Step 4: Replace sendEmail to use active profile**

Replace the full `sendEmail` function (lines 351-377) with:

```javascript
  async function sendEmail(templateId, dynamicData, templateName) {
    const activeProfile = MOCK_PROFILES.find(p => p.id === state.activeProfileId);
    if (!activeProfile || !activeProfile.email) {
      setChannelStatus('email', 'Error: No email address set');
      return;
    }
    setChannelStatus('email', 'Sending...');
    try {
      const resp = await fetch(`${CONFIG.functionsBaseUrl}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeProfile.email,
          templateId,
          dynamicData: JSON.stringify(dynamicData)
        })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setChannelStatus('email', 'Sent');
      const emailDisplay = templateName
        ? `${templateName} sent to ${activeProfile.email}`
        : `Email sent to ${activeProfile.email}`;
      addConversationMessage('outbound', 'email', emailDisplay);
      checkStepTransitionOnOutreach();
    } catch (e) {
      setChannelStatus('email', `Error: ${e.message}`);
    }
  }
```

- [ ] **Step 5: Re-enable outreach buttons on profile switch for demo profiles**

In `showProfileDetail`, after setting `state.activeProfileId`, check if outreach should be enabled:

```javascript
    // Re-evaluate outreach button state for this profile
    const shouldEnable = (profile.id === 'usr_001' && (state.stepsPlayed.has(1) || state.stepsPlayed.has(3)))
      || (profile.id === 'cust_001' && state.stepsPlayed.has(2));
    setOutreachEnabled(shouldEnable);
```

- [ ] **Step 6: Commit**

```bash
git add artefacts/src/assets/app.js
git commit -m "feat: scope outreach buttons and sends to active profile"
```

---

### Task 10: Remove old PROFILE_LIVE_EVENTS and clean up legacy code

**Files:**
- Modify: `artefacts/src/assets/app.js:657-662` (PROFILE_LIVE_EVENTS)
- Modify: `artefacts/src/assets/app.js:1276-1297` (triggerPromotionalOutreach)

- [ ] **Step 1: Remove PROFILE_LIVE_EVENTS**

Delete the `PROFILE_LIVE_EVENTS` constant (lines 657-662) — these are replaced by the step scenario system.

- [ ] **Step 2: Remove triggerPromotionalOutreach**

Delete the `triggerPromotionalOutreach` function (lines 1276-1297) — promotional outreach is now handled by `handleStepComplete`.

- [ ] **Step 3: Remove triggerPromotionalOutreach from window.__app**

In the `window.__app` export (line 1555), remove `triggerPromotionalOutreach` from the exposed functions.

- [ ] **Step 4: Commit**

```bash
git add artefacts/src/assets/app.js
git commit -m "refactor: remove legacy PROFILE_LIVE_EVENTS and triggerPromotionalOutreach"
```

---

### Task 11: Manual smoke test

**No files changed — verification only.**

- [ ] **Step 1: Deploy and test Step 1 flow**

Open the app in browser. Navigate to Audiences → create/view audience → create journey → Profile Explorer → Paul Heath → Audiences tab → Events tab. Verify:
- 6 events auto-play with delays (no form_abandon or session_end)
- Outreach buttons enable after last event
- Send any outreach → verify demoStep advances to 2

- [ ] **Step 2: Test Step 2 flow**

Navigate to Profile Explorer → Marco Santos → Audiences tab → Events tab. Verify:
- promotion_sent event appears
- RCS auto-sends (or console warning if template not configured)
- Right panel shows Marco Santos' conversation
- demoStep advances to 3

- [ ] **Step 3: Test Step 3 flow**

Navigate back to Profile Explorer → Paul Heath → Events tab. Verify:
- Step 1 events shown statically above
- Step 3 events append and animate (policy_class_change, email_sent, form_abandon, session_end)
- Email sends (or console warning)
- RCS fires after session_end (or console warning)
- Right panel shows Paul Heath's conversation

- [ ] **Step 4: Test profile switching**

Switch between Paul Heath and Marco Santos in Profile Explorer. Verify:
- Right panel swaps to correct profile's conversation
- Profile indicator updates in right panel header
- Outreach buttons enable/disable correctly per profile

- [ ] **Step 5: Test replay/refresh**

Click Replay button. Verify all state resets. Also test page refresh — should start from Step 1.

---
