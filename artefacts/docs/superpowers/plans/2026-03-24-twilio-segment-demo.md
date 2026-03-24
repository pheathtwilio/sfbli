# Twilio Segment Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive Segment-style dashboard that mocks behavioral signal detection and triggers real Twilio/SendGrid outreach (RCS/SMS, email, voice call) for onsite demos.

**Architecture:** Static HTML/CSS/JS frontend served as a Twilio Asset, backed by Twilio Functions for real API calls. Mocked Segment event stream driven by configurable JSON scenario files. Inbound replies polled from module-scoped storage in Functions.

**Tech Stack:** HTML/CSS/JS (vanilla, no framework), Twilio Functions (Node.js 22), Twilio Messaging API + Content Templates, SendGrid Dynamic Templates, Twilio Voice + Studio, Playwright (E2E testing), Jest (unit testing)

**Spec:** `docs/superpowers/specs/2026-03-24-twilio-segment-demo-design.md`

---

## File Structure

```
src/
  assets/
    index.html                — main dashboard (three-panel layout)
    style.css                 — Segment-inspired styles, CSS custom properties for branding
    app.js                    — frontend logic: scenario playback, API calls, polling, conversation view
    scenarios/
      default.json            — default demo scenario (website abandon)
    brands/
      default.css             — unbranded theme (current phase)
      default.json            — default brand config
  functions/
    send-rcs.js               — sends RCS/SMS via Twilio Content Templates
    send-email.js             — sends email via SendGrid Dynamic Templates
    trigger-call.js           — initiates voice call via Twilio REST API
    webhook-inbound.js        — receives inbound SMS/RCS replies, stores in memory
    poll-messages.js          — returns new inbound messages since timestamp
    list-templates.js         — lists Twilio Content + SendGrid Dynamic Templates
  test/
    functions/
      send-rcs.test.js
      send-email.test.js
      trigger-call.test.js
      webhook-inbound.test.js
      poll-messages.test.js
      list-templates.test.js
    e2e/
      dashboard.spec.js       — Playwright E2E tests
  package.json                — dev dependencies (jest, playwright)
  .env.example                — template for environment variables
```

---

## Task 0: Project Scaffolding

**Files:**
- Create: `src/package.json`
- Create: `src/.env.example`
- Create: `src/assets/scenarios/default.json`
- Create: `src/assets/brands/default.css`
- Create: `src/assets/brands/default.json`

- [ ] **Step 1: Initialize project structure**

```bash
cd /Users/pheath/Development/sfbli/artefacts
mkdir -p src/assets/scenarios src/assets/brands src/functions src/test/functions src/test/e2e
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "sfbli-segment-demo",
  "version": "1.0.0",
  "private": true,
  "description": "Twilio Segment demo dashboard for SFBLI",
  "scripts": {
    "test": "jest --config jest.config.js",
    "test:e2e": "playwright test --config playwright.config.js",
    "test:functions": "jest --config jest.config.js test/functions/"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@playwright/test": "^1.42.0",
    "@sendgrid/mail": "^8.1.0"
  }
}
```

- [ ] **Step 3: Create .env.example**

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=demo@example.com
STUDIO_FLOW_SID=FWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGENT_PHONE_NUMBER=+1xxxxxxxxxx
DEFAULT_RECIPIENT_PHONE=+1xxxxxxxxxx
DEFAULT_RECIPIENT_EMAIL=presenter@example.com
```

- [ ] **Step 4: Create default scenario file**

Write `src/assets/scenarios/default.json`:

```json
{
  "name": "Website Abandon",
  "description": "Insurance agent visits site, browses policies, starts quote, abandons",
  "events": [
    { "type": "page_view", "page": "/auto-insurance", "delay": 0, "label": "Viewed Auto Insurance" },
    { "type": "page_view", "page": "/get-quote", "delay": 2000, "label": "Viewed Get Quote" },
    { "type": "form_start", "form": "quote_form", "delay": 3500, "label": "Started Quote Form" },
    { "type": "form_field", "form": "quote_form", "field": "vehicle_type", "delay": 5000, "label": "Entered Vehicle Type" },
    { "type": "form_abandon", "form": "quote_form", "delay": 7000, "label": "Abandoned Quote Form" },
    { "type": "session_end", "reason": "abandoned", "delay": 8000, "label": "Session Ended (Abandoned)" }
  ],
  "profile_updates": {
    "status": "At Risk",
    "engagement_score_before": 72,
    "engagement_score_after": 45,
    "predicted_churn": "High"
  }
}
```

- [ ] **Step 5: Create default brand files**

Write `src/assets/brands/default.css`:

```css
:root {
  --brand-primary: #52BD94;
  --brand-primary-hover: #43a77f;
  --brand-sidebar-bg: #1a1a2e;
  --brand-sidebar-text: #8892b0;
  --brand-sidebar-active: #52BD94;
  --brand-content-bg: #ffffff;
  --brand-content-secondary-bg: #f8f9fa;
  --brand-text-primary: #1a1a2e;
  --brand-text-secondary: #666666;
  --brand-border: #e1e4e8;
  --brand-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --brand-logo-url: none;
  --brand-channel-rcs: #52BD94;
  --brand-channel-email: #3498db;
  --brand-channel-voice: #e74c3c;
}
```

Write `src/assets/brands/default.json`:

```json
{
  "name": "Demo",
  "terminology": {
    "agent": "Agent",
    "company": "Insurance Co"
  },
  "defaultContact": {
    "name": "Marcus Rivera",
    "phone": "",
    "email": "",
    "region": "Southeast",
    "status": "Active",
    "engagement_score": 72
  }
}
```

- [ ] **Step 6: Commit scaffolding**

```bash
git add src/
git commit -m "feat: scaffold project structure with scenarios and brand config"
```

---

## Task 1: Twilio Function — send-rcs

**Files:**
- Create: `src/functions/send-rcs.js`
- Create: `src/test/functions/send-rcs.test.js`

- [ ] **Step 1: Write failing test**

Write `src/test/functions/send-rcs.test.js`:

```javascript
const handler = require('../../functions/send-rcs').handler;

describe('send-rcs function', () => {
  let mockContext, mockCallback;

  beforeEach(() => {
    mockContext = {
      TWILIO_PHONE_NUMBER: '+15551234567',
      getTwilioClient: jest.fn(() => ({
        messages: {
          create: jest.fn().mockResolvedValue({
            sid: 'SM1234567890',
            status: 'queued'
          })
        }
      }))
    };
    mockCallback = jest.fn();
  });

  test('sends message with content template and returns messageSid', async () => {
    const event = {
      to: '+15559876543',
      contentSid: 'HX1234567890',
      contentVariables: JSON.stringify({ '1': 'Marcus Rivera' })
    };

    await handler(mockContext, event, mockCallback);

    const client = mockContext.getTwilioClient();
    expect(client.messages.create).toHaveBeenCalledWith({
      from: '+15551234567',
      to: '+15559876543',
      contentSid: 'HX1234567890',
      contentVariables: JSON.stringify({ '1': 'Marcus Rivera' })
    });

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      messageSid: 'SM1234567890',
      status: 'queued'
    }));
  });

  test('returns error when to is missing', async () => {
    const event = { contentSid: 'HX1234567890' };

    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      error: expect.any(String)
    }));
  });

  test('returns error when contentSid is missing', async () => {
    const event = { to: '+15559876543' };

    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      error: expect.any(String)
    }));
  });

  test('handles Twilio API errors gracefully', async () => {
    mockContext.getTwilioClient = jest.fn(() => ({
      messages: {
        create: jest.fn().mockRejectedValue(new Error('Invalid phone number'))
      }
    }));

    const event = {
      to: '+15559876543',
      contentSid: 'HX1234567890',
      contentVariables: '{}'
    };

    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      error: 'Invalid phone number'
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/pheath/Development/sfbli/artefacts/src
npx jest test/functions/send-rcs.test.js --no-cache
```

Expected: FAIL — `Cannot find module '../../functions/send-rcs'`

- [ ] **Step 3: Write implementation**

Write `src/functions/send-rcs.js`:

```javascript
exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(200);
    response.setBody({});
    return callback(null, response);
  }

  const { to, contentSid, contentVariables } = event;

  if (!to || !contentSid) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required fields: to, contentSid' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const message = await client.messages.create({
      from: context.TWILIO_PHONE_NUMBER,
      to,
      contentSid,
      contentVariables: contentVariables || '{}'
    });

    response.setStatusCode(200);
    response.setBody({ messageSid: message.sid, status: message.status });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
```

- [ ] **Step 4: Update test to match Response object pattern**

The function uses `Twilio.Response()` which isn't available in test. Update test to mock it or test the callback body extraction. Add to top of test file:

```javascript
// Mock Twilio.Response for unit tests
global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};
```

Update assertions to extract body from the Response object:

```javascript
expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
  _body: { messageSid: 'SM1234567890', status: 'queued' }
}));
```

Apply this pattern to all error assertions too (`_body: { error: ... }`).

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest test/functions/send-rcs.test.js --no-cache
```

Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add functions/send-rcs.js test/functions/send-rcs.test.js
git commit -m "feat: add send-rcs Twilio Function with content template support"
```

---

## Task 2: Twilio Function — send-email

**Files:**
- Create: `src/functions/send-email.js`
- Create: `src/test/functions/send-email.test.js`

- [ ] **Step 1: Write failing test**

Write `src/test/functions/send-email.test.js`:

```javascript
global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

// Mock @sendgrid/mail
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202, headers: { 'x-message-id': 'msg_123' } }])
}));

const sgMail = require('@sendgrid/mail');
const handler = require('../../functions/send-email').handler;

describe('send-email function', () => {
  let mockContext, mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      SENDGRID_API_KEY: 'SG.test_key',
      SENDGRID_FROM_EMAIL: 'demo@example.com'
    };
    mockCallback = jest.fn();
  });

  test('sends email with dynamic template and returns status', async () => {
    const event = {
      to: 'agent@example.com',
      templateId: 'd-abc123',
      dynamicData: JSON.stringify({ name: 'Marcus Rivera', region: 'Southeast' })
    };

    await handler(mockContext, event, mockCallback);

    expect(sgMail.setApiKey).toHaveBeenCalledWith('SG.test_key');
    expect(sgMail.send).toHaveBeenCalledWith({
      to: 'agent@example.com',
      from: 'demo@example.com',
      templateId: 'd-abc123',
      dynamicTemplateData: { name: 'Marcus Rivera', region: 'Southeast' }
    });

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { status: 'sent', messageId: 'msg_123' }
    }));
  });

  test('returns error when to is missing', async () => {
    const event = { templateId: 'd-abc123' };

    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: expect.any(String) }
    }));
  });

  test('returns error when templateId is missing', async () => {
    const event = { to: 'agent@example.com' };

    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: expect.any(String) }
    }));
  });

  test('handles SendGrid API errors gracefully', async () => {
    sgMail.send.mockRejectedValue(new Error('Unauthorized'));

    const event = {
      to: 'agent@example.com',
      templateId: 'd-abc123',
      dynamicData: '{}'
    };

    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: 'Unauthorized' }
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest test/functions/send-email.test.js --no-cache
```

Expected: FAIL — `Cannot find module '../../functions/send-email'`

- [ ] **Step 3: Write implementation**

Write `src/functions/send-email.js`:

```javascript
const sgMail = require('@sendgrid/mail');

exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(200);
    response.setBody({});
    return callback(null, response);
  }

  const { to, templateId, dynamicData } = event;

  if (!to || !templateId) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required fields: to, templateId' });
    return callback(null, response);
  }

  try {
    sgMail.setApiKey(context.SENDGRID_API_KEY);

    const parsedData = dynamicData ? JSON.parse(dynamicData) : {};

    const [result] = await sgMail.send({
      to,
      from: context.SENDGRID_FROM_EMAIL,
      templateId,
      dynamicTemplateData: parsedData
    });

    response.setStatusCode(200);
    response.setBody({
      status: 'sent',
      messageId: result.headers['x-message-id'] || null
    });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest test/functions/send-email.test.js --no-cache
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add functions/send-email.js test/functions/send-email.test.js
git commit -m "feat: add send-email Twilio Function with SendGrid dynamic templates"
```

---

## Task 3: Twilio Function — trigger-call

**Files:**
- Create: `src/functions/trigger-call.js`
- Create: `src/test/functions/trigger-call.test.js`

- [ ] **Step 1: Write failing test**

Write `src/test/functions/trigger-call.test.js`:

```javascript
global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/trigger-call').handler;

describe('trigger-call function', () => {
  let mockContext, mockCallback;

  beforeEach(() => {
    mockContext = {
      TWILIO_PHONE_NUMBER: '+15551234567',
      STUDIO_FLOW_SID: 'FW1234567890',
      ACCOUNT_SID: 'AC1234567890',
      getTwilioClient: jest.fn(() => ({
        calls: {
          create: jest.fn().mockResolvedValue({
            sid: 'CA1234567890',
            status: 'queued'
          })
        }
      }))
    };
    mockCallback = jest.fn();
  });

  test('creates outbound call pointing to Studio flow', async () => {
    const event = { to: '+15559876543' };

    await handler(mockContext, event, mockCallback);

    const client = mockContext.getTwilioClient();
    expect(client.calls.create).toHaveBeenCalledWith({
      from: '+15551234567',
      to: '+15559876543',
      url: expect.stringContaining('FW1234567890')
    });

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { callSid: 'CA1234567890', status: 'queued' }
    }));
  });

  test('returns error when to is missing', async () => {
    const event = {};

    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: expect.any(String) }
    }));
  });

  test('handles Twilio API errors gracefully', async () => {
    mockContext.getTwilioClient = jest.fn(() => ({
      calls: {
        create: jest.fn().mockRejectedValue(new Error('Invalid number'))
      }
    }));

    const event = { to: '+15559876543' };

    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: 'Invalid number' }
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest test/functions/trigger-call.test.js --no-cache
```

Expected: FAIL — `Cannot find module '../../functions/trigger-call'`

- [ ] **Step 3: Write implementation**

Write `src/functions/trigger-call.js`:

```javascript
exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(200);
    response.setBody({});
    return callback(null, response);
  }

  const { to } = event;

  if (!to) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required field: to' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const studioUrl = `https://webhooks.twilio.com/v1/Accounts/${context.ACCOUNT_SID}/Flows/${context.STUDIO_FLOW_SID}`;

    const call = await client.calls.create({
      from: context.TWILIO_PHONE_NUMBER,
      to,
      url: studioUrl
    });

    response.setStatusCode(200);
    response.setBody({ callSid: call.sid, status: call.status });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest test/functions/trigger-call.test.js --no-cache
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add functions/trigger-call.js test/functions/trigger-call.test.js
git commit -m "feat: add trigger-call Twilio Function with Studio flow integration"
```

---

## Task 4: Twilio Functions — webhook-inbound & poll-messages

These two functions share state (the message store), so they are built together.

**Files:**
- Create: `src/functions/webhook-inbound.js`
- Create: `src/functions/poll-messages.js`
- Create: `src/test/functions/webhook-inbound.test.js`
- Create: `src/test/functions/poll-messages.test.js`

- [ ] **Step 1: Write failing test for webhook-inbound**

Write `src/test/functions/webhook-inbound.test.js`:

```javascript
global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  },
  twiml: {
    MessagingResponse: class {
      constructor() { this._xml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'; }
      toString() { return this._xml; }
    }
  }
};

const webhookHandler = require('../../functions/webhook-inbound').handler;
const { _getMessages, _clearMessages } = require('../../functions/webhook-inbound');

describe('webhook-inbound function', () => {
  let mockContext, mockCallback;

  beforeEach(() => {
    _clearMessages();
    mockContext = {};
    mockCallback = jest.fn();
  });

  test('stores inbound message from Twilio webhook payload', async () => {
    const event = {
      From: '+15559876543',
      Body: 'Thanks, I was busy last week',
      MessageSid: 'SM999'
    };

    await webhookHandler(mockContext, event, mockCallback);

    const messages = _getMessages(0);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      from: '+15559876543',
      body: 'Thanks, I was busy last week',
      channel: 'sms'
    });
    expect(messages[0].timestamp).toBeDefined();
  });

  test('returns empty TwiML response', async () => {
    const event = { From: '+15559876543', Body: 'Hello', MessageSid: 'SM999' };

    await webhookHandler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Object));
  });

  test('stores multiple messages in order', async () => {
    await webhookHandler(mockContext, { From: '+1555111', Body: 'First', MessageSid: 'SM1' }, jest.fn());
    await webhookHandler(mockContext, { From: '+1555222', Body: 'Second', MessageSid: 'SM2' }, jest.fn());

    const messages = _getMessages(0);
    expect(messages).toHaveLength(2);
    expect(messages[0].body).toBe('First');
    expect(messages[1].body).toBe('Second');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest test/functions/webhook-inbound.test.js --no-cache
```

Expected: FAIL — `Cannot find module '../../functions/webhook-inbound'`

- [ ] **Step 3: Write webhook-inbound implementation**

Write `src/functions/webhook-inbound.js`:

```javascript
// Module-scoped message store — persists across warm invocations
const messageStore = [];

// Exported for testing and for poll-messages to access
function _getMessages(since) {
  return messageStore.filter(m => m.timestamp > since);
}

function _clearMessages() {
  messageStore.length = 0;
}

exports._getMessages = _getMessages;
exports._clearMessages = _clearMessages;
exports.messageStore = messageStore;

exports.handler = async function (context, event, callback) {
  const { From, Body, MessageSid } = event;

  messageStore.push({
    from: From,
    body: Body,
    messageSid: MessageSid,
    channel: 'sms',
    timestamp: Date.now()
  });

  const twiml = new Twilio.twiml.MessagingResponse();
  return callback(null, twiml);
};
```

- [ ] **Step 4: Run webhook-inbound tests**

```bash
npx jest test/functions/webhook-inbound.test.js --no-cache
```

Expected: 3 tests PASS

- [ ] **Step 5: Write failing test for poll-messages**

Write `src/test/functions/poll-messages.test.js`:

```javascript
global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

// Populate the shared message store before requiring poll-messages
const { messageStore, _clearMessages } = require('../../functions/webhook-inbound');
const handler = require('../../functions/poll-messages').handler;

describe('poll-messages function', () => {
  let mockContext, mockCallback;

  beforeEach(() => {
    _clearMessages();
    mockContext = {};
    mockCallback = jest.fn();
  });

  test('returns messages since given timestamp', async () => {
    const oldTime = Date.now() - 5000;
    messageStore.push(
      { from: '+1555111', body: 'Old msg', channel: 'sms', timestamp: oldTime },
      { from: '+1555222', body: 'New msg', channel: 'sms', timestamp: Date.now() }
    );

    const event = { since: String(oldTime) };
    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { messages: expect.arrayContaining([
        expect.objectContaining({ body: 'New msg' })
      ])}
    }));
    // Should not include the old message (timestamp === since is excluded)
    const result = mockCallback.mock.calls[0][1]._body;
    expect(result.messages).toHaveLength(1);
  });

  test('returns empty array when no new messages', async () => {
    const event = { since: String(Date.now()) };
    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { messages: [] }
    }));
  });

  test('returns all messages when since is 0', async () => {
    messageStore.push(
      { from: '+1555111', body: 'Msg 1', channel: 'sms', timestamp: Date.now() },
      { from: '+1555222', body: 'Msg 2', channel: 'sms', timestamp: Date.now() + 1 }
    );

    const event = { since: '0' };
    await handler(mockContext, event, mockCallback);

    const result = mockCallback.mock.calls[0][1]._body;
    expect(result.messages).toHaveLength(2);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npx jest test/functions/poll-messages.test.js --no-cache
```

Expected: FAIL — `Cannot find module '../../functions/poll-messages'`

- [ ] **Step 7: Write poll-messages implementation**

Write `src/functions/poll-messages.js`:

```javascript
const { _getMessages } = require('./webhook-inbound');

exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(200);
    response.setBody({});
    return callback(null, response);
  }

  const since = parseInt(event.since || '0', 10);
  const messages = _getMessages(since);

  response.setStatusCode(200);
  response.setBody({ messages });
  return callback(null, response);
};
```

**Important note for Twilio Functions deployment:** The `require('./webhook-inbound')` import works in local testing but Twilio Functions doesn't support cross-function requires. For deployment, the message store must be extracted to a shared module in the `assets` directory (as a private asset) or use Twilio Sync. The implementer should handle this during the deployment task.

- [ ] **Step 8: Run all message tests**

```bash
npx jest test/functions/webhook-inbound.test.js test/functions/poll-messages.test.js --no-cache
```

Expected: 6 tests PASS

- [ ] **Step 9: Commit**

```bash
git add functions/webhook-inbound.js functions/poll-messages.js test/functions/webhook-inbound.test.js test/functions/poll-messages.test.js
git commit -m "feat: add webhook-inbound and poll-messages functions with shared message store"
```

---

## Task 5: Twilio Function — list-templates

**Files:**
- Create: `src/functions/list-templates.js`
- Create: `src/test/functions/list-templates.test.js`

- [ ] **Step 1: Write failing test**

Write `src/test/functions/list-templates.test.js`:

```javascript
global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

jest.mock('@sendgrid/client', () => ({
  setApiKey: jest.fn(),
  request: jest.fn().mockResolvedValue([{
    statusCode: 200,
    body: {
      result: [
        { id: 'd-abc123', name: 'Re-engagement', updated_at: '2026-01-01' },
        { id: 'd-def456', name: 'Policy Update', updated_at: '2026-02-01' }
      ]
    }
  }])
}));

const handler = require('../../functions/list-templates').handler;

describe('list-templates function', () => {
  let mockContext, mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      SENDGRID_API_KEY: 'SG.test_key',
      getTwilioClient: jest.fn(() => ({
        content: {
          v1: {
            contents: {
              list: jest.fn().mockResolvedValue([
                { sid: 'HX111', friendlyName: 'Welcome Card', types: { 'twilio/card': {} } },
                { sid: 'HX222', friendlyName: 'Promo Carousel', types: { 'twilio/carousel': {} } }
              ])
            }
          }
        }
      }))
    };
    mockCallback = jest.fn();
  });

  test('returns Twilio content templates when type is content', async () => {
    const event = { type: 'content' };
    await handler(mockContext, event, mockCallback);

    const result = mockCallback.mock.calls[0][1]._body;
    expect(result.templates).toHaveLength(2);
    expect(result.templates[0]).toMatchObject({
      id: 'HX111',
      name: 'Welcome Card'
    });
  });

  test('returns SendGrid templates when type is sendgrid', async () => {
    const event = { type: 'sendgrid' };
    await handler(mockContext, event, mockCallback);

    const result = mockCallback.mock.calls[0][1]._body;
    expect(result.templates).toHaveLength(2);
    expect(result.templates[0]).toMatchObject({
      id: 'd-abc123',
      name: 'Re-engagement'
    });
  });

  test('returns error for invalid type', async () => {
    const event = { type: 'invalid' };
    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: expect.any(String) }
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest test/functions/list-templates.test.js --no-cache
```

Expected: FAIL — `Cannot find module '../../functions/list-templates'`

- [ ] **Step 3: Write implementation**

Write `src/functions/list-templates.js`:

```javascript
const sgClient = require('@sendgrid/client');

async function listTwilioContentTemplates(context) {
  const client = context.getTwilioClient();
  const contents = await client.content.v1.contents.list();
  return contents.map(c => ({
    id: c.sid,
    name: c.friendlyName,
    type: Object.keys(c.types || {})[0] || 'unknown',
    variables: c.variables || {}
  }));
}

async function listSendGridTemplates(context) {
  sgClient.setApiKey(context.SENDGRID_API_KEY);
  const [response] = await sgClient.request({
    method: 'GET',
    url: '/v3/templates',
    qs: { generations: 'dynamic', page_size: 20 }
  });
  return (response.body.result || []).map(t => ({
    id: t.id,
    name: t.name,
    type: 'email'
  }));
}

exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(200);
    response.setBody({});
    return callback(null, response);
  }

  const { type } = event;

  if (!type || !['content', 'sendgrid'].includes(type)) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing or invalid type. Use "content" or "sendgrid".' });
    return callback(null, response);
  }

  try {
    let templates;
    if (type === 'content') {
      templates = await listTwilioContentTemplates(context);
    } else {
      templates = await listSendGridTemplates(context);
    }

    response.setStatusCode(200);
    response.setBody({ templates });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest test/functions/list-templates.test.js --no-cache
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add functions/list-templates.js test/functions/list-templates.test.js
git commit -m "feat: add list-templates function for Twilio Content and SendGrid templates"
```

---

## Task 6: Frontend — HTML Structure (index.html)

**Files:**
- Create: `src/assets/index.html`

- [ ] **Step 1: Create the three-panel dashboard HTML**

Write `src/assets/index.html`. This is the shell — no JS logic yet.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Segment Demo</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app">
    <!-- SIDEBAR -->
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="#52BD94" stroke-width="2"/>
          <path d="M9 14h10M14 9v10" stroke="#52BD94" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="sidebar-title">Connections</span>
      </div>
      <ul class="sidebar-nav">
        <li class="sidebar-item active" data-view="events">
          <span class="sidebar-icon">&#9679;</span> Events
        </li>
        <li class="sidebar-item" data-view="profiles">
          <span class="sidebar-icon">&#9679;</span> Profiles
        </li>
        <li class="sidebar-item" data-view="audiences">
          <span class="sidebar-icon">&#9679;</span> Audiences
        </li>
        <li class="sidebar-item" data-view="connections">
          <span class="sidebar-icon">&#9679;</span> Connections
        </li>
      </ul>
    </nav>

    <!-- CENTER PANEL -->
    <main class="center-panel">
      <!-- Event Stream -->
      <section class="panel-section" id="event-stream-section">
        <div class="section-header">
          <h2>Event Stream</h2>
          <button class="btn btn-sm btn-outline" id="replay-btn">Replay</button>
        </div>
        <div class="event-list" id="event-list">
          <!-- Events injected by JS -->
        </div>
      </section>

      <!-- Agent Profile -->
      <section class="panel-section" id="profile-section">
        <div class="section-header">
          <h2>Agent Profile</h2>
          <button class="btn btn-sm btn-outline" id="edit-profile-btn">Edit</button>
        </div>
        <div class="profile-card" id="profile-card">
          <div class="profile-field">
            <span class="profile-label">Name</span>
            <span class="profile-value" data-field="name">Marcus Rivera</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Phone</span>
            <span class="profile-value" data-field="phone">+1 (555) 000-0000</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Email</span>
            <span class="profile-value" data-field="email">agent@example.com</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Region</span>
            <span class="profile-value" data-field="region">Southeast</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Status</span>
            <span class="profile-value profile-badge" data-field="status">Active</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Engagement Score</span>
            <span class="profile-value" data-field="engagement_score">72</span>
          </div>
          <div class="profile-field">
            <span class="profile-label">Predicted Churn</span>
            <span class="profile-value" data-field="predicted_churn">Low</span>
          </div>
        </div>
      </section>
    </main>

    <!-- RIGHT PANEL -->
    <aside class="right-panel">
      <!-- Channel Controls -->
      <section class="panel-section" id="outreach-section">
        <h2>Outreach</h2>

        <!-- Template Selector (hidden by default, shown when channel clicked) -->
        <div class="template-selector hidden" id="template-selector">
          <div class="template-selector-header">
            <h3 id="template-selector-title">Select Template</h3>
            <button class="btn btn-sm btn-ghost" id="template-cancel-btn">&times;</button>
          </div>
          <select class="template-dropdown" id="template-dropdown">
            <option value="">Loading templates...</option>
          </select>
          <div class="template-variables" id="template-variables">
            <!-- Variable fields injected by JS -->
          </div>
          <button class="btn btn-primary" id="template-send-btn">Send</button>
        </div>

        <!-- Channel Buttons -->
        <div class="channel-controls" id="channel-controls">
          <button class="btn btn-channel btn-rcs" data-channel="rcs" id="btn-rcs">
            <span class="channel-icon">&#128172;</span>
            Send RCS / SMS
            <span class="channel-status" id="status-rcs"></span>
          </button>
          <button class="btn btn-channel btn-email" data-channel="email" id="btn-email">
            <span class="channel-icon">&#9993;</span>
            Send Email
            <span class="channel-status" id="status-email"></span>
          </button>
          <button class="btn btn-channel btn-voice" data-channel="voice" id="btn-voice">
            <span class="channel-icon">&#128222;</span>
            Trigger Voice Call
            <span class="channel-status" id="status-voice"></span>
          </button>
        </div>
      </section>

      <!-- Conversation View -->
      <section class="panel-section conversation-section" id="conversation-section">
        <h2>Conversation</h2>
        <div class="conversation-thread" id="conversation-thread">
          <div class="conversation-empty">No messages yet. Send outreach to begin.</div>
        </div>
      </section>
    </aside>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify file renders**

Open `src/assets/index.html` directly in a browser (no server needed). Confirm three columns visible (unstyled is fine at this stage).

- [ ] **Step 3: Commit**

```bash
git add assets/index.html
git commit -m "feat: add dashboard HTML structure with three-panel layout"
```

---

## Task 7: Frontend — CSS Styles (style.css)

**Files:**
- Create: `src/assets/style.css`

- [ ] **Step 1: Write Segment-inspired stylesheet**

Write `src/assets/style.css`. Uses CSS custom properties from `brands/default.css` for branding. The file should include:

**Layout rules:**
- `.app` — CSS Grid: `sidebar (220px) | center-panel (1fr) | right-panel (380px)`, full viewport height
- `.sidebar` — Dark background (`var(--brand-sidebar-bg)`), fixed width, vertical nav list
- `.center-panel` — White background, scrollable, padding
- `.right-panel` — Light gray background, scrollable, padding

**Sidebar styles:**
- `.sidebar-logo` — Logo + title at top
- `.sidebar-nav` — Unstyled list, vertical
- `.sidebar-item` — Padding, hover highlight, `.active` state with teal left border and teal text

**Event stream styles:**
- `.event-list` — Vertical list, max-height with overflow scroll
- `.event-item` — Row with icon, label, timestamp. Border-bottom separator.
- `.event-item.event-warning` — Orange/red accent for abandon events
- `.event-item.entering` — CSS animation: fade-in + slide-down for new events

**Profile card styles:**
- `.profile-card` — Grid of label/value pairs
- `.profile-field` — Two-column row (label left, value right)
- `.profile-label` — Small, uppercase, muted
- `.profile-value` — Normal weight, dark
- `.profile-badge` — Pill-shaped badge (green=Active, orange=At Risk)
- `.profile-field[contenteditable]` — Subtle blue outline when editing

**Channel controls:**
- `.btn-channel` — Full-width button, rounded, bold. Each channel has its own color via `var(--brand-channel-rcs)`, etc.
- `.channel-status` — Inline status text (Sending... / Delivered / Error)
- `.btn-channel:disabled` — Dimmed while sending

**Template selector:**
- `.template-selector` — Card overlay within the outreach section
- `.template-dropdown` — Full-width select
- `.template-variables` — Grid of label+input pairs for template variables
- `.hidden` — `display: none`

**Conversation view:**
- `.conversation-thread` — Flex column, max-height with overflow scroll, auto-scroll to bottom
- `.msg-bubble` — Rounded bubble with padding
- `.msg-outbound` — Right-aligned, teal background, white text
- `.msg-inbound` — Left-aligned, gray background, dark text
- `.msg-system` — Centered card for email/voice status entries
- `.msg-meta` — Small text below bubble: channel icon + timestamp
- `.conversation-empty` — Centered muted text

**Utility classes:**
- `.btn` — Base button reset
- `.btn-sm` — Small variant
- `.btn-outline` — Bordered, transparent bg
- `.btn-ghost` — No border, no bg
- `.btn-primary` — Teal bg, white text
- `.section-header` — Flex row, space-between, for title + action button

**Brand integration:**
- First line: `@import url('brands/default.css');`
- All colors reference CSS custom properties so brand overrides work

- [ ] **Step 2: Verify visual appearance**

Open `src/assets/index.html` in browser. Confirm:
- Three-panel layout renders correctly
- Dark sidebar on left with nav items
- White center panel
- Light gray right panel
- Buttons have correct channel colors
- Overall feels like a clean SaaS dashboard

Use Playwright MCP (if configured) or manual browser check.

- [ ] **Step 3: Commit**

```bash
git add assets/style.css
git commit -m "feat: add Segment-inspired CSS with brand custom properties"
```

---

## Task 8: Frontend JS — Scenario Playback & Profile Editing

**Files:**
- Create: `src/assets/app.js`

This task creates `app.js` with the scenario engine and profile editing. Outreach/conversation logic is added in Task 9.

- [ ] **Step 1: Write app.js with config, scenario loader, and profile editor**

Write `src/assets/app.js`:

```javascript
(function () {
  'use strict';

  // --- Configuration ---
  const CONFIG = {
    functionsBaseUrl: '', // Set to Twilio Functions base URL, e.g. https://xxx.twil.io
    pollIntervalMs: 3000,
    scenario: new URLSearchParams(window.location.search).get('scenario') || 'default',
    brand: new URLSearchParams(window.location.search).get('brand') || 'default'
  };

  // --- State ---
  const state = {
    profile: {},
    events: [],
    conversation: [],
    templates: { content: [], sendgrid: [] },
    pollTimer: null,
    lastPollTimestamp: 0,
    activeChannel: null
  };

  // --- DOM References ---
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

  // --- Brand Loading ---
  async function loadBrand(brandName) {
    // Load brand CSS (already imported via default.css, override if non-default)
    if (brandName !== 'default') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `brands/${brandName}.css`;
      document.head.appendChild(link);
    }
    // Load brand JSON config
    try {
      const resp = await fetch(`brands/${brandName}.json`);
      const brandConfig = await resp.json();
      state.profile = { ...brandConfig.defaultContact };
      renderProfile();
    } catch (e) {
      console.warn('Brand config not found, using defaults');
    }
  }

  // --- Scenario Engine ---
  async function loadScenario(scenarioName) {
    try {
      const resp = await fetch(`scenarios/${scenarioName}.json`);
      return await resp.json();
    } catch (e) {
      console.error('Failed to load scenario:', e);
      return null;
    }
  }

  function playScenario(scenario) {
    if (!scenario) return;
    dom.eventList.innerHTML = '';
    state.events = [];

    scenario.events.forEach((evt, index) => {
      setTimeout(() => {
        state.events.push(evt);
        renderEvent(evt);

        // Apply profile updates after last event
        if (index === scenario.events.length - 1 && scenario.profile_updates) {
          applyProfileUpdates(scenario.profile_updates);
        }
      }, evt.delay);
    });
  }

  function renderEvent(evt) {
    const div = document.createElement('div');
    const isWarning = ['form_abandon', 'session_end'].includes(evt.type);
    div.className = `event-item entering${isWarning ? ' event-warning' : ''}`;

    const time = new Date().toLocaleTimeString();
    div.innerHTML = `
      <span class="event-icon">${getEventIcon(evt.type)}</span>
      <span class="event-label">${evt.label}</span>
      <span class="event-time">${time}</span>
    `;

    dom.eventList.prepend(div);
  }

  function getEventIcon(type) {
    const icons = {
      page_view: '&#128065;',
      form_start: '&#9998;',
      form_field: '&#128221;',
      form_abandon: '&#9888;',
      session_end: '&#128683;'
    };
    return icons[type] || '&#9679;';
  }

  function applyProfileUpdates(updates) {
    if (updates.status) updateProfileField('status', updates.status);
    if (updates.engagement_score_after !== undefined) {
      updateProfileField('engagement_score', updates.engagement_score_after);
    }
    if (updates.predicted_churn) updateProfileField('predicted_churn', updates.predicted_churn);
  }

  // --- Profile ---
  function renderProfile() {
    Object.entries(state.profile).forEach(([key, value]) => {
      updateProfileField(key, value);
    });
  }

  function updateProfileField(field, value) {
    const el = dom.profileCard.querySelector(`[data-field="${field}"]`);
    if (!el) return;
    el.textContent = value;

    // Update badge styling
    if (field === 'status') {
      el.className = 'profile-value profile-badge';
      el.classList.add(value === 'At Risk' ? 'badge-warning' : 'badge-ok');
    }
    // Animate score changes
    if (field === 'engagement_score') {
      el.classList.add('value-changed');
      setTimeout(() => el.classList.remove('value-changed'), 1500);
    }
  }

  function toggleProfileEdit() {
    const fields = dom.profileCard.querySelectorAll('.profile-value');
    const isEditing = fields[0].contentEditable === 'true';

    fields.forEach(el => {
      el.contentEditable = isEditing ? 'false' : 'true';
      el.classList.toggle('editing', !isEditing);
    });

    dom.editProfileBtn.textContent = isEditing ? 'Edit' : 'Save';

    if (isEditing) {
      // Save values back to state
      fields.forEach(el => {
        const field = el.dataset.field;
        if (field) state.profile[field] = el.textContent.trim();
      });
    }
  }

  // --- Event Listeners ---
  dom.editProfileBtn.addEventListener('click', toggleProfileEdit);
  dom.replayBtn.addEventListener('click', async () => {
    const scenario = await loadScenario(CONFIG.scenario);
    playScenario(scenario);
  });

  // --- Init ---
  async function init() {
    await loadBrand(CONFIG.brand);
    const scenario = await loadScenario(CONFIG.scenario);
    playScenario(scenario);
  }

  // Expose state and CONFIG for Task 9 to extend
  window.__app = { CONFIG, state, dom, updateProfileField };

  init();
})();
```

- [ ] **Step 2: Verify scenario playback in browser**

Open `src/assets/index.html` in browser. Confirm:
- Events appear one by one with delays
- Profile updates after last event (status → At Risk, score → 45)
- Replay button restarts the scenario
- Edit button makes profile fields editable

- [ ] **Step 3: Commit**

```bash
git add assets/app.js
git commit -m "feat: add scenario playback engine and profile editing"
```

---

## Task 9: Frontend JS — Outreach, Templates, Conversation & Polling

**Files:**
- Modify: `src/assets/app.js` (append outreach logic after the init section, inside the IIFE)

This task adds: template loading, channel send actions, conversation rendering, and inbound message polling.

- [ ] **Step 1: Add template loading and channel actions to app.js**

Add the following functions to `app.js` inside the IIFE, before `init()`:

**Template loading:**
```javascript
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
```

**Template selector UI:**
```javascript
function showTemplateSelector(channel) {
  state.activeChannel = channel;
  const templates = channel === 'rcs' ? state.templates.content : state.templates.sendgrid;
  const title = channel === 'rcs' ? 'Select Content Template' : 'Select Email Template';

  dom.templateSelectorTitle.textContent = title;
  dom.templateDropdown.innerHTML = templates.length
    ? templates.map(t => `<option value="${t.id}">${t.name} (${t.type || 'template'})</option>`).join('')
    : '<option value="">No templates available</option>';

  dom.templateVariables.innerHTML = '';
  dom.templateSelector.classList.remove('hidden');
  dom.channelControls.classList.add('hidden');
}

function hideTemplateSelector() {
  dom.templateSelector.classList.add('hidden');
  dom.channelControls.classList.remove('hidden');
  state.activeChannel = null;
}
```

**Send actions:**
```javascript
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
    // Note: real-time call status would need a status callback webhook
    setTimeout(() => setChannelStatus('voice', 'Connected'), 3000);
  } catch (e) {
    setChannelStatus('voice', `Error: ${e.message}`);
  }
}
```

**Channel status helper:**
```javascript
function setChannelStatus(channel, text) {
  const el = document.getElementById(`status-${channel}`);
  if (el) el.textContent = text;
}
```

**Conversation rendering:**
```javascript
function addConversationMessage(direction, channel, body) {
  // Remove empty state
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
```

**Polling for inbound messages:**
```javascript
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

function stopPolling() {
  if (state.pollTimer) clearInterval(state.pollTimer);
}
```

- [ ] **Step 2: Wire up event listeners**

Add before `init()`:

```javascript
// Channel button clicks
dom.btnRcs.addEventListener('click', () => showTemplateSelector('rcs'));
dom.btnEmail.addEventListener('click', () => showTemplateSelector('email'));
dom.btnVoice.addEventListener('click', triggerVoiceCall);

// Template selector
dom.templateCancelBtn.addEventListener('click', hideTemplateSelector);
dom.templateSendBtn.addEventListener('click', () => {
  const selectedId = dom.templateDropdown.value;
  if (!selectedId) return;

  // Gather variable values from inputs
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
```

- [ ] **Step 3: Update init() to load templates and start polling**

```javascript
async function init() {
  await loadBrand(CONFIG.brand);
  await loadTemplates();
  const scenario = await loadScenario(CONFIG.scenario);
  playScenario(scenario);
  startPolling();
}
```

- [ ] **Step 4: Verify in browser**

Open dashboard. Confirm:
- Channel buttons are clickable
- RCS/Email buttons open template selector
- Voice button shows "Initiating..." status
- Conversation view updates when messages are sent
- (Full API integration tested in Task 11)

- [ ] **Step 5: Commit**

```bash
git add assets/app.js
git commit -m "feat: add outreach controls, template selector, conversation view, and polling"
```

---

## Task 10: Studio Flow for Voice Escalation

**Files:**
- Create: `src/studio-flow.json` (exported flow definition for version control)

- [ ] **Step 1: Create Studio Flow via Twilio CLI or Console**

The Studio Flow is a simple two-step flow:
1. **Trigger:** REST API (incoming call)
2. **Connect Call:** `<Dial>` to `AGENT_PHONE_NUMBER`

Create via Twilio CLI:

```bash
twilio api:studio:v2:flows:create \
  --friendly-name "SFBLI Demo - Agent Escalation" \
  --status published \
  --definition '{
    "description": "Demo voice escalation - connects to agent immediately",
    "states": [
      {
        "name": "Trigger",
        "type": "trigger",
        "transitions": [
          { "event": "incomingMessage", "next": "connect_agent" },
          { "event": "incomingCall", "next": "connect_agent" },
          { "event": "incomingConversationMessage", "next": "connect_agent" },
          { "event": "incomingRequest", "next": "connect_agent" },
          { "event": "incomingParent", "next": "connect_agent" }
        ],
        "properties": { "offset": { "x": 0, "y": 0 } }
      },
      {
        "name": "connect_agent",
        "type": "connect-call-to",
        "transitions": [
          { "event": "callCompleted" },
          { "event": "hangup" }
        ],
        "properties": {
          "offset": { "x": 0, "y": 200 },
          "caller_id": "{{trigger.call.From}}",
          "noun": "number",
          "to": "{{flow.variables.agent_phone}}",
          "timeout": 30
        }
      }
    ],
    "initial_state": "Trigger",
    "flags": { "allow_concurrent_calls": true }
  }'
```

**Note:** If the agent phone needs to be dynamic, use a Flow variable or hardcode the `AGENT_PHONE_NUMBER` env var value. The `trigger-call` function passes the Studio Flow URL which triggers from REST API.

- [ ] **Step 2: Record the Flow SID**

Copy the returned Flow SID (starts with `FW`) and set it as `STUDIO_FLOW_SID` in your Twilio Functions environment variables.

- [ ] **Step 3: Save flow definition for version control**

Export and save the flow JSON to `src/studio-flow.json` for reference.

- [ ] **Step 4: Test manually**

```bash
twilio api:core:calls:create \
  --from $TWILIO_PHONE_NUMBER \
  --to $DEFAULT_RECIPIENT_PHONE \
  --url "https://webhooks.twilio.com/v1/Accounts/$TWILIO_ACCOUNT_SID/Flows/$STUDIO_FLOW_SID"
```

Confirm: your phone rings, and when answered it connects to the agent number.

- [ ] **Step 5: Commit**

```bash
git add studio-flow.json
git commit -m "feat: add Studio Flow definition for voice escalation to agent"
```

---

## Task 11: Playwright MCP Setup & E2E Tests

**Files:**
- Create: `src/playwright.config.js`
- Create: `src/test/e2e/dashboard.spec.js`

- [ ] **Step 1: Configure Playwright MCP server**

Add Playwright MCP to Claude Code settings. Run:

```bash
npx playwright install chromium
```

Add to `.claude/settings.json` (or user settings) the Playwright MCP server config if not already present.

- [ ] **Step 2: Create Playwright config**

Write `src/playwright.config.js`:

```javascript
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npx http-server assets -p 3000 -c-1',
    port: 3000,
    reuseExistingServer: true
  }
});
```

- [ ] **Step 3: Write E2E tests**

Write `src/test/e2e/dashboard.spec.js`:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Dashboard Layout', () => {
  test('renders three-panel layout', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.center-panel')).toBeVisible();
    await expect(page.locator('.right-panel')).toBeVisible();
  });

  test('sidebar has navigation items', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.sidebar-item')).toHaveCount(4);
    await expect(page.locator('.sidebar-item.active')).toContainText('Events');
  });
});

test.describe('Scenario Playback', () => {
  test('events appear in the event stream', async ({ page }) => {
    await page.goto('/');

    // Wait for first event (delay: 0)
    await expect(page.locator('.event-item')).toHaveCount(1, { timeout: 2000 });

    // Wait for more events to appear
    await page.waitForTimeout(9000);
    const eventCount = await page.locator('.event-item').count();
    expect(eventCount).toBeGreaterThanOrEqual(4);
  });

  test('profile updates after scenario completes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(9000);

    await expect(page.locator('[data-field="status"]')).toContainText('At Risk');
    await expect(page.locator('[data-field="engagement_score"]')).toContainText('45');
  });

  test('replay button restarts events', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(9000);

    await page.click('#replay-btn');
    // After replay, events should be cleared and new ones appear
    await page.waitForTimeout(1000);
    const eventCount = await page.locator('.event-item').count();
    expect(eventCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Profile Editing', () => {
  test('edit button toggles contentEditable on profile fields', async ({ page }) => {
    await page.goto('/');

    await page.click('#edit-profile-btn');
    const nameField = page.locator('[data-field="name"]');
    await expect(nameField).toHaveAttribute('contenteditable', 'true');

    await page.click('#edit-profile-btn');
    await expect(nameField).toHaveAttribute('contenteditable', 'false');
  });
});

test.describe('Channel Controls', () => {
  test('RCS button opens template selector', async ({ page }) => {
    await page.goto('/');

    await page.click('#btn-rcs');
    await expect(page.locator('#template-selector')).toBeVisible();
    await expect(page.locator('#channel-controls')).toBeHidden();
  });

  test('cancel button closes template selector', async ({ page }) => {
    await page.goto('/');

    await page.click('#btn-rcs');
    await page.click('#template-cancel-btn');
    await expect(page.locator('#template-selector')).toBeHidden();
    await expect(page.locator('#channel-controls')).toBeVisible();
  });

  test('email button opens template selector', async ({ page }) => {
    await page.goto('/');

    await page.click('#btn-email');
    await expect(page.locator('#template-selector')).toBeVisible();
  });
});

test.describe('Brand Loading', () => {
  test('loads default brand config', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-field="name"]')).toContainText('Marcus Rivera');
    await expect(page.locator('[data-field="region"]')).toContainText('Southeast');
  });

  test('scenario query param is respected', async ({ page }) => {
    // This test verifies the param is read — actual scenario swap needs another scenario file
    await page.goto('/?scenario=default');
    await expect(page.locator('.event-item')).toHaveCount(1, { timeout: 2000 });
  });
});
```

- [ ] **Step 4: Run E2E tests**

```bash
cd /Users/pheath/Development/sfbli/artefacts/src
npx playwright test
```

Expected: All tests pass. Fix any failures.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.js test/e2e/dashboard.spec.js
git commit -m "feat: add Playwright E2E tests for dashboard layout, scenarios, and controls"
```

---

## Task 12: Jest Configuration

**Files:**
- Create: `src/jest.config.js`

- [ ] **Step 1: Create Jest config**

Write `src/jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/functions/**/*.test.js'],
  collectCoverageFrom: ['functions/**/*.js'],
  coverageDirectory: 'coverage'
};
```

- [ ] **Step 2: Run all unit tests**

```bash
cd /Users/pheath/Development/sfbli/artefacts/src
npx jest --config jest.config.js
```

Expected: All function tests pass (Tasks 1-5).

- [ ] **Step 3: Commit**

```bash
git add jest.config.js
git commit -m "feat: add Jest configuration for function unit tests"
```

---

## Task 13: Deployment & Integration Test

**Files:**
- Modify: Twilio Functions service (via Twilio CLI or Console)

- [ ] **Step 1: Set environment variables on Twilio Functions**

Via Twilio Console or CLI, set all env vars from `.env.example` on the SFBLI Functions service.

- [ ] **Step 2: Deploy functions and assets**

Deploy using Twilio CLI (or the method used for the existing SFBLI service). Ensure:
- All 6 functions are deployed
- All assets (index.html, style.css, app.js, scenarios/, brands/) are deployed
- `@sendgrid/mail` and `@sendgrid/client` are listed as dependencies in the service

- [ ] **Step 3: Update CONFIG.functionsBaseUrl in app.js**

Set `CONFIG.functionsBaseUrl` to the deployed Twilio Functions domain (e.g., `https://sfbli-xxxx-dev.twil.io`).

Redeploy the asset after this change.

- [ ] **Step 4: Configure Twilio webhook for inbound messages**

In Twilio Console, set the messaging webhook for your Twilio phone number to:
`https://<your-domain>.twil.io/webhook-inbound`

This ensures inbound SMS/RCS replies hit the webhook function.

- [ ] **Step 5: End-to-end integration test**

Open the deployed dashboard URL. Test the full flow:

1. Verify scenario events play
2. Edit contact to your real phone/email
3. Send RCS/SMS — verify it arrives on your phone
4. Reply from phone — verify reply appears in conversation view
5. Send email — verify it arrives in your inbox
6. Trigger voice call — verify phone rings and connects to agent

- [ ] **Step 6: Commit final config changes**

```bash
git add -A
git commit -m "feat: configure deployment settings and integration test"
```

---

## Task Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 0 | Project scaffolding | — |
| 1 | send-rcs function | 0 |
| 2 | send-email function | 0 |
| 3 | trigger-call function | 0 |
| 4 | webhook-inbound + poll-messages | 0 |
| 5 | list-templates function | 0 |
| 6 | HTML structure | 0 |
| 7 | CSS styles | 6 |
| 8 | JS — scenario + profile | 6 |
| 9 | JS — outreach + conversation | 8 |
| 10 | Studio Flow | 3 |
| 11 | Playwright E2E tests | 7, 8, 9 |
| 12 | Jest config | 1-5 |
| 13 | Deployment + integration | All |

**Parallelizable:** Tasks 1-5 are independent of each other. Tasks 6-7-8 can run in parallel with 1-5. Task 10 can run in parallel with frontend work.
