# Claims & Policy Call Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a split-screen call center demo with Lookup, Verify, Conversation Relay, and Flex escalation.

**Architecture:** Standalone `callcenter.html` page with mocked Segment event stream + real Twilio API calls (Lookup, Verify, Voice). Conversation Relay (Fastify+WS+OpenAI) handles AI triage. Flex plugin panels display context on agent escalation.

**Tech Stack:** Vanilla JS, Twilio Functions (Node.js), Fastify, OpenAI GPT-4o-mini, Twilio Flex Plugin (React)

**Spec:** `docs/superpowers/specs/2026-03-26-call-center-design.md`

---

## File Structure

### Twilio Functions (new)
- `src/functions/lookup.js` — Lookups v2 with lineTypeIntelligence
- `src/functions/verify-start.js` — Create Verify verification
- `src/functions/verify-check.js` — Check Verify code
- `src/functions/initiate-call.js` — POST context to CRelay + create call

### Unit Tests (new)
- `src/test/functions/lookup.test.js`
- `src/test/functions/verify-start.test.js`
- `src/test/functions/verify-check.test.js`
- `src/test/functions/initiate-call.test.js`

### Demo Page (new)
- `src/assets/callcenter.html` — Split-screen layout
- `src/assets/callcenter.js` — All demo logic (events, identity, call flow, transcript polling)
- `src/assets/callcenter.css` — Styles for split-screen layout

### E2E Tests (new)
- `src/test/e2e/callcenter.spec.js` — Playwright tests for callcenter page

### Conversation Relay (separate repo)
- Fork `/tmp/forge-cr/` → branch `sfbli-call-center`
- `src/server.js` — Add /context, /transcript, /status endpoints; modify WS handler for dynamic prompts and agent dispatch

### Flex Plugin (separate repo)
- `/Users/pheath/Development/one-ring-to-rule-them-all/projects/flex/demos/sfbli-call-center/`
- 4 panel components reading task attributes

### Config Changes
- `src/.env` — Add `VERIFY_SERVICE_SID`, `CRELAY_BASE_URL`

---

## Task 1: Twilio Functions — lookup.js

**Files:**
- Create: `src/functions/lookup.js`
- Create: `src/test/functions/lookup.test.js`

- [ ] **Step 1: Write failing test**

```javascript
// src/test/functions/lookup.test.js
global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/lookup').handler;

describe('lookup function', () => {
  let mockContext, mockCallback, mockClient;

  beforeEach(() => {
    mockClient = {
      lookups: { v2: { phoneNumbers: jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue({
          valid: true,
          callerName: { caller_name: 'Maria Santos' },
          lineTypeIntelligence: { type: 'mobile', carrier: { name: 'T-Mobile' } },
          phoneNumber: '+13125689550'
        })
      })}}
    };
    mockContext = { getTwilioClient: jest.fn(() => mockClient) };
    mockCallback = jest.fn();
  });

  test('returns lookup data for valid phone', async () => {
    await handler(mockContext, { phone: '+13125689550' }, mockCallback);
    expect(mockClient.lookups.v2.phoneNumbers).toHaveBeenCalledWith('+13125689550');
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: expect.objectContaining({
        valid: true,
        callerName: 'Maria Santos',
        lineType: 'mobile',
        isNonFixedVoip: false
      })
    }));
  });

  test('flags non-fixed VoIP numbers', async () => {
    mockClient.lookups.v2.phoneNumbers = jest.fn().mockReturnValue({
      fetch: jest.fn().mockResolvedValue({
        valid: true,
        callerName: null,
        lineTypeIntelligence: { type: 'nonFixedVoip', carrier: { name: 'Google Voice' } },
        phoneNumber: '+15551234567'
      })
    });
    await handler(mockContext, { phone: '+15551234567' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: expect.objectContaining({ isNonFixedVoip: true })
    }));
  });

  test('returns error when phone is missing', async () => {
    await handler(mockContext, {}, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 400
    }));
  });

  test('handles OPTIONS preflight', async () => {
    await handler(mockContext, { httpMethod: 'OPTIONS' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 200, _body: {}
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src && npx jest test/functions/lookup.test.js --verbose`
Expected: FAIL — cannot find module `../../functions/lookup`

- [ ] **Step 3: Write implementation**

```javascript
// src/functions/lookup.js
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

  const { phone } = event;
  if (!phone) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required field: phone' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const result = await client.lookups.v2.phoneNumbers(phone)
      .fetch({ fields: 'line_type_intelligence,caller_name' });

    const lineType = result.lineTypeIntelligence?.type || 'unknown';
    response.setStatusCode(200);
    response.setBody({
      valid: result.valid,
      callerName: result.callerName?.caller_name || null,
      lineType,
      carrier: result.lineTypeIntelligence?.carrier?.name || null,
      isNonFixedVoip: lineType === 'nonFixedVoip'
    });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src && npx jest test/functions/lookup.test.js --verbose`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/functions/lookup.js src/test/functions/lookup.test.js
git commit -m "feat: add lookup.js Twilio Function with Lookups v2"
```

---

## Task 2: Twilio Functions — verify-start.js

**Files:**
- Create: `src/functions/verify-start.js`
- Create: `src/test/functions/verify-start.test.js`

- [ ] **Step 1: Write failing test**

```javascript
// src/test/functions/verify-start.test.js
global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/verify-start').handler;

describe('verify-start function', () => {
  let mockContext, mockCallback, mockClient;

  let mockCreate;

  beforeEach(() => {
    mockCreate = jest.fn().mockResolvedValue({
      sid: 'VE1234567890', status: 'pending', channel: 'sms'
    });
    mockClient = {
      verify: { v2: { services: jest.fn().mockReturnValue({
        verifications: { create: mockCreate }
      })}}
    };
    mockContext = {
      VERIFY_SERVICE_SID: 'VA1234567890',
      getTwilioClient: jest.fn(() => mockClient)
    };
    mockCallback = jest.fn();
  });

  test('creates verification and returns sid', async () => {
    await handler(mockContext, { phone: '+13125689550' }, mockCallback);
    expect(mockClient.verify.v2.services).toHaveBeenCalledWith('VA1234567890');
    expect(mockCreate).toHaveBeenCalledWith({ to: '+13125689550', channel: 'sms' });
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { sid: 'VE1234567890', status: 'pending', channel: 'sms' }
    }));
  });

  test('uses specified channel', async () => {
    await handler(mockContext, { phone: '+13125689550', channel: 'whatsapp' }, mockCallback);
    expect(mockCreate).toHaveBeenCalledWith({ to: '+13125689550', channel: 'whatsapp' });
  });

  test('returns error when phone is missing', async () => {
    await handler(mockContext, {}, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 400
    }));
  });

  test('handles OPTIONS preflight', async () => {
    await handler(mockContext, { httpMethod: 'OPTIONS' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 200, _body: {}
    }));
  });
});
```

- [ ] **Step 2: Run test — expected FAIL**

- [ ] **Step 3: Write implementation**

```javascript
// src/functions/verify-start.js
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

  const { phone, channel } = event;
  if (!phone) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required field: phone' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const verification = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: channel || 'sms' });

    response.setStatusCode(200);
    response.setBody({ sid: verification.sid, status: verification.status, channel: verification.channel });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
```

- [ ] **Step 4: Run test — expected PASS**
- [ ] **Step 5: Commit**

```bash
git add src/functions/verify-start.js src/test/functions/verify-start.test.js
git commit -m "feat: add verify-start.js Twilio Function"
```

---

## Task 3: Twilio Functions — verify-check.js

**Files:**
- Create: `src/functions/verify-check.js`
- Create: `src/test/functions/verify-check.test.js`

- [ ] **Step 1: Write failing test**

```javascript
// src/test/functions/verify-check.test.js
global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/verify-check').handler;

describe('verify-check function', () => {
  let mockContext, mockCallback, mockClient;

  beforeEach(() => {
    mockClient = {
      verify: { v2: { services: jest.fn().mockReturnValue({
        verificationChecks: { create: jest.fn().mockResolvedValue({
          status: 'approved', valid: true
        })}
      })}}
    };
    mockContext = {
      VERIFY_SERVICE_SID: 'VA1234567890',
      getTwilioClient: jest.fn(() => mockClient)
    };
    mockCallback = jest.fn();
  });

  test('checks code and returns approved', async () => {
    await handler(mockContext, { phone: '+13125689550', code: '472918' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { valid: true, status: 'approved' }
    }));
  });

  test('returns error when phone or code missing', async () => {
    await handler(mockContext, { phone: '+13125689550' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 400
    }));
  });

  test('handles failed verification', async () => {
    mockClient.verify.v2.services = jest.fn().mockReturnValue({
      verificationChecks: { create: jest.fn().mockResolvedValue({
        status: 'pending', valid: false
      })}
    });
    await handler(mockContext, { phone: '+13125689550', code: '000000' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { valid: false, status: 'pending' }
    }));
  });

  test('handles OPTIONS preflight', async () => {
    await handler(mockContext, { httpMethod: 'OPTIONS' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 200, _body: {}
    }));
  });
});
```

- [ ] **Step 2: Run test — expected FAIL**
- [ ] **Step 3: Write implementation**

```javascript
// src/functions/verify-check.js
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

  const { phone, code } = event;
  if (!phone || !code) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required fields: phone, code' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const check = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });

    response.setStatusCode(200);
    response.setBody({ valid: check.valid, status: check.status });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
```

- [ ] **Step 4: Run test — expected PASS**
- [ ] **Step 5: Commit**

```bash
git add src/functions/verify-check.js src/test/functions/verify-check.test.js
git commit -m "feat: add verify-check.js Twilio Function"
```

---

## Task 4: Twilio Functions — initiate-call.js

**Files:**
- Create: `src/functions/initiate-call.js`
- Create: `src/test/functions/initiate-call.test.js`

- [ ] **Step 1: Write failing test**

```javascript
// src/test/functions/initiate-call.test.js
global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/initiate-call').handler;

describe('initiate-call function', () => {
  let mockContext, mockCallback, mockClient;

  beforeEach(() => {
    mockClient = {
      calls: { create: jest.fn().mockResolvedValue({
        sid: 'CA1234567890', status: 'queued'
      })}
    };
    mockContext = {
      TWILIO_PHONE_NUMBER: '+18005551234',
      CRELAY_BASE_URL: 'https://crelay.example.com',
      getTwilioClient: jest.fn(() => mockClient)
    };
    mockCallback = jest.fn();
  });

  test('creates call with recording notice TwiML and returns callSid', async () => {
    const event = { customerPhone: '+13125689550' };
    await handler(mockContext, event, mockCallback);

    // Verify call creation with TwiML containing recording notice + redirect
    expect(mockClient.calls.create).toHaveBeenCalledWith(expect.objectContaining({
      from: '+18005551234',
      to: '+13125689550',
      record: true,
      twiml: expect.stringContaining('recorded for quality'),
      statusCallback: 'https://crelay.example.com/status'
    }));

    // TwiML should redirect to CRelay /twiml
    const callArgs = mockClient.calls.create.mock.calls[0][0];
    expect(callArgs.twiml).toContain('<Redirect>https://crelay.example.com/twiml</Redirect>');

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { callSid: 'CA1234567890', status: 'queued' }
    }));
  });

  test('returns error when customerPhone missing', async () => {
    await handler(mockContext, {}, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 400
    }));
  });
    // Call should still be created
    expect(mockClient.calls.create).toHaveBeenCalled();
  });

  test('handles OPTIONS preflight', async () => {
    await handler(mockContext, { httpMethod: 'OPTIONS' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 200, _body: {}
    }));
  });
});
```

- [ ] **Step 2: Run test — expected FAIL**
- [ ] **Step 3: Write implementation**

Note: The CRelay context POST is done from the browser (`callcenter.js`) BEFORE calling this Function, since `fetch` is not reliably available in the Twilio Functions runtime. This Function only creates the call.

The call `url` points to a recording-notice TwiML that plays `<Say>` then redirects to CRelay `/twiml`. This satisfies the spec requirement that recording notice is separate from the AI conversation.

```javascript
// src/functions/initiate-call.js
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

  const { customerPhone } = event;
  if (!customerPhone) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required field: customerPhone' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const crelayBase = context.CRELAY_BASE_URL;

    // TwiML: recording notice then redirect to CRelay
    const twiml = `<Response><Say voice="Polly.Joanna">This call may be recorded for quality and training purposes.</Say><Redirect>${crelayBase}/twiml</Redirect></Response>`;

    const call = await client.calls.create({
      from: context.TWILIO_PHONE_NUMBER,
      to: customerPhone,
      twiml,
      record: true,
      statusCallback: `${crelayBase}/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
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

- [ ] **Step 4: Run test — expected PASS**
- [ ] **Step 5: Commit**

```bash
git add src/functions/initiate-call.js src/test/functions/initiate-call.test.js
git commit -m "feat: add initiate-call.js Twilio Function"
```

---

## Task 5: Environment Variables & Deploy Functions

**Files:**
- Modify: `src/.env` — add VERIFY_SERVICE_SID, CRELAY_BASE_URL

- [ ] **Step 1: Add env vars to .env**

Add to `src/.env`:
```
VERIFY_SERVICE_SID=
CRELAY_BASE_URL=
```

- [ ] **Step 2: Run all unit tests**

Run: `cd src && npx jest --verbose`
Expected: All tests pass (existing + 4 new test files)

- [ ] **Step 3: Deploy**

Run: `npx twilio serverless:deploy --service-name sfbli -p FLEX --override-existing-project`

- [ ] **Step 4: Commit**

```bash
git add src/functions/lookup.js src/functions/verify-start.js src/functions/verify-check.js src/functions/initiate-call.js src/test/functions/
git commit -m "feat: add 4 call center Twilio Functions (lookup, verify, initiate-call)"
```

---

## Task 6: Call Center Page — HTML Structure & CSS

**Files:**
- Create: `src/assets/callcenter.html`
- Create: `src/assets/callcenter.css`

- [ ] **Step 1: Create callcenter.css**

```css
/* src/assets/callcenter.css */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e5e7eb; height: 100vh; overflow: hidden; }

.cc-layout { display: grid; grid-template-columns: 1fr 380px; height: 100vh; }

/* Left Panel - SFBLI Site */
.cc-site { background: #f8f9fa; color: #1f2937; display: flex; flex-direction: column; overflow: hidden; }
.cc-site-nav { background: #004785; color: white; padding: 10px 20px; display: flex; align-items: center; gap: 16px; font-size: 13px; }
.cc-site-nav .logo { width: 28px; height: 28px; background: #0078D4; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
.cc-site-nav .nav-link { opacity: 0.7; cursor: pointer; padding: 4px 8px; }
.cc-site-nav .nav-link.active { opacity: 1; background: #0078D4; border-radius: 4px; padding: 4px 12px; }
.cc-site-content { flex: 1; padding: 24px; overflow-y: auto; }
.cc-site-screenshot { width: 100%; border-radius: 8px; margin-bottom: 16px; }

/* Overlays */
.cc-overlay { background: white; border-radius: 8px; padding: 20px; border: 2px solid #e5e7eb; margin-top: 16px; text-align: center; }
.cc-overlay.highlight { border-color: #0078D4; }
.cc-overlay.verify { border-color: #10b981; }
.cc-overlay h3 { margin-bottom: 8px; font-size: 16px; }
.cc-overlay p { color: #6b7280; font-size: 13px; margin-bottom: 12px; }
.cc-btn { padding: 10px 24px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; font-size: 14px; }
.cc-btn-primary { background: #0078D4; color: white; }
.cc-btn-success { background: #10b981; color: white; }
.cc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.cc-phone-input { padding: 10px 16px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; width: 240px; text-align: center; margin-bottom: 12px; }

.cc-otp-container { display: flex; gap: 6px; justify-content: center; margin-bottom: 12px; }
.cc-otp-digit { width: 40px; height: 48px; border: 2px solid #d1d5db; border-radius: 6px; text-align: center; font-size: 20px; font-weight: bold; }
.cc-otp-digit:focus { border-color: #10b981; outline: none; }

/* Right Panel - Event Stream */
.cc-events-panel { background: #1a1d23; display: flex; flex-direction: column; border-left: 1px solid #2d3139; }

.cc-profile-header { padding: 14px 16px; border-bottom: 1px solid #2d3139; }
.cc-profile-header .avatar { width: 32px; height: 32px; background: #374151; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #9ca3af; }
.cc-profile-header .name { font-weight: 600; font-size: 13px; }
.cc-profile-header .id { color: #6b7280; font-size: 11px; }
.cc-profile-badge { background: #374151; padding: 2px 8px; border-radius: 10px; font-size: 10px; display: inline-block; margin-right: 4px; }
.cc-profile-badge.identified { background: #052e16; color: #10b981; }

.cc-events-stream { flex: 1; overflow-y: auto; padding: 10px 16px; }
.cc-section-label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; margin-top: 16px; }
.cc-section-label:first-child { margin-top: 0; }

.cc-event-row { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: #1f2229; border-radius: 4px; margin-bottom: 4px; font-size: 12px; animation: fadeSlideIn 0.3s ease-out; }
.cc-event-row .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cc-event-row .dot.blue { background: #3b82f6; }
.cc-event-row .dot.purple { background: #8b5cf6; }
.cc-event-row .dot.green { background: #10b981; }
.cc-event-row .dot.amber { background: #f59e0b; }
.cc-event-row .dot.red { background: #ef4444; }
.cc-event-row .detail { color: #6b7280; margin-left: auto; font-size: 11px; }
.cc-event-row.identity { background: #052e16; border: 1px solid #166534; }

/* Transcript */
.cc-transcript-entry { padding: 8px 10px; background: #1f2229; border-radius: 4px; margin-bottom: 4px; border-left: 2px solid #374151; font-size: 12px; animation: fadeSlideIn 0.3s ease-out; }
.cc-transcript-entry .speaker { font-size: 10px; margin-bottom: 2px; font-weight: 600; }
.cc-transcript-entry.ai { border-left-color: #3b82f6; }
.cc-transcript-entry.ai .speaker { color: #3b82f6; }
.cc-transcript-entry.customer { border-left-color: #10b981; }
.cc-transcript-entry.customer .speaker { color: #10b981; }

/* Call Status Bar */
.cc-call-bar { padding: 10px 16px; border-top: 1px solid #2d3139; display: flex; align-items: center; gap: 8px; font-size: 12px; }
.cc-call-bar.idle { background: #1a1d23; }
.cc-call-bar.active { background: #052e16; border-top-color: #166534; }
.cc-call-bar .pulse { width: 8px; height: 8px; border-radius: 50%; }
.cc-call-bar.idle .pulse { background: #6b7280; }
.cc-call-bar.active .pulse { background: #10b981; animation: pulse 2s infinite; }
.cc-call-bar .status { font-weight: 600; }
.cc-call-bar.active .status { color: #10b981; }
.cc-call-bar .timer { color: #6b7280; margin-left: auto; }

.hidden { display: none !important; }

@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
```

- [ ] **Step 2: Create callcenter.html**

```html
<!-- src/assets/callcenter.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SFBLI — Call Center Demo</title>
  <link rel="stylesheet" href="callcenter.css">
</head>
<body>
  <div class="cc-layout">
    <!-- LEFT: SFBLI Site -->
    <div class="cc-site">
      <div class="cc-site-nav">
        <div class="logo">S</div>
        <span style="font-weight:600;">SFBLI</span>
        <span class="nav-link" data-page="home">Home</span>
        <span class="nav-link active" data-page="policies">Policies</span>
        <span class="nav-link" data-page="claims">Claims</span>
        <span class="nav-link" data-page="contact">Contact Us</span>
      </div>
      <div class="cc-site-content" id="site-content">
        <!-- Screenshot + overlays injected by JS -->
      </div>
    </div>

    <!-- RIGHT: Segment Events + Transcript -->
    <div class="cc-events-panel">
      <div class="cc-profile-header">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div class="avatar" id="profile-avatar">?</div>
          <div>
            <div class="name" id="profile-name">Anonymous Visitor</div>
            <div class="id" id="profile-id">ajs_anonymous...</div>
          </div>
        </div>
        <div id="profile-badges">
          <span class="cc-profile-badge">anonymous</span>
          <span class="cc-profile-badge">web</span>
        </div>
      </div>

      <div class="cc-events-stream" id="events-stream">
        <div class="cc-section-label">Live Events</div>
        <div id="event-list"></div>
        <div class="cc-section-label hidden" id="transcript-label">Live Transcript</div>
        <div id="transcript-list"></div>
      </div>

      <div class="cc-call-bar idle" id="call-bar">
        <div class="pulse"></div>
        <span class="status" id="call-status">No Active Call</span>
        <span class="timer" id="call-timer"></span>
      </div>
    </div>
  </div>

  <script src="callcenter.js"></script>
</body>
</html>
```

- [ ] **Step 3: Verify page loads in browser**

Run: `cd src/assets && npx http-server -p 3000` then open `http://localhost:3000/callcenter.html`
Expected: Split-screen layout renders — left panel with nav, right panel with dark event stream

- [ ] **Step 4: Commit**

```bash
git add src/assets/callcenter.html src/assets/callcenter.css
git commit -m "feat: add callcenter.html split-screen layout and styles"
```

---

## Task 7: Call Center Page — JavaScript Logic (callcenter.js)

**Files:**
- Create: `src/assets/callcenter.js`

This is the largest single file. It manages: page navigation, mocked Segment events, identity resolution, Lookup/Verify API calls, OTP UI, call initiation, and transcript polling.

- [ ] **Step 1: Create callcenter.js with state management and page rendering**

The file should be structured as an IIFE (matching app.js pattern) with these sections:

```javascript
// src/assets/callcenter.js
(function () {
  'use strict';

  // --- Configuration ---
  const FUNCTIONS_BASE = ''; // relative when deployed to Twilio Functions
  const CRELAY_BASE = ''; // set from env or manually

  // --- Customer Profiles (subset from app.js) ---
  // Profile resolution is page-keyed: Policies page → Maria Santos, Claims page → Amanda Foster.
  // This implements the spec's type === 'customer' filter + disambiguation rule.
  const CUSTOMERS = {
    policies: {
      id: 'cust_001', name: 'Maria Santos', email: 'pheath@twilio.com',
      phone: '+13125689550', policy_type: 'Homeowners',
      policy_number: 'HO-2024-08341', premium: '$2,400/yr',
      coverage: '$350,000', renewal: '2026-08-15', risk_score: 'Low',
      claim_count: 0, customer_since: '2021'
    },
    claims: {
      id: 'cust_007', name: 'Amanda Foster', email: 'pheath@twilio.com',
      phone: '+13125689550', policy_type: 'Auto',
      policy_number: 'AU-2022-27563', premium: '$2,100/yr',
      coverage: '$150,000', renewal: '2026-06-15', risk_score: 'High',
      claim_count: 3, customer_since: '2020',
      claims: [
        { number: 'CL-2025-0891', date: '2025-11-03', status: 'Under Review', amount: '$4,200' },
        { number: 'CL-2024-1456', date: '2024-06-22', status: 'Settled', amount: '$2,800' },
        { number: 'CL-2023-0234', date: '2023-02-15', status: 'Settled', amount: '$1,500' }
      ]
    }
  };

  // --- State ---
  const state = {
    currentPage: 'policies', // or 'claims'
    phase: 'browsing', // browsing → calling → verifying → connected → ended
    customer: null, // resolved customer profile
    events: [],
    transcript: [],
    callSid: null,
    callTimer: null,
    callSeconds: 0,
    transcriptPollInterval: null,
    otpAttempts: 0
  };

  // --- DOM Helpers ---
  function $(sel) { return document.querySelector(sel); }
  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  // --- Event Stream ---
  function addEvent(type, name, detail, dotColor) {
    const row = document.createElement('div');
    row.className = 'cc-event-row' + (type === 'identity' ? ' identity' : '');
    row.innerHTML = `<div class="dot ${dotColor}"></div><span>${name}</span><span class="detail">${detail}</span>`;
    $('#event-list').appendChild(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'end' });
    state.events.push({ type, name, detail, time: Date.now() });
  }

  // --- Transcript ---
  function addTranscript(role, text) {
    show($('#transcript-label'));
    const entry = document.createElement('div');
    entry.className = `cc-transcript-entry ${role}`;
    entry.innerHTML = `<div class="speaker">${role === 'ai' ? 'AI Assistant' : 'Customer'}</div><div>${text}</div>`;
    $('#transcript-list').appendChild(entry);
    entry.scrollIntoView({ behavior: 'smooth', block: 'end' });
    state.transcript.push({ role, text, time: Date.now() });
  }

  // --- Profile Resolution ---
  function resolveIdentity(phone) {
    const customer = CUSTOMERS[state.currentPage];
    if (customer && customer.phone === phone) {
      state.customer = customer;
      $('#profile-name').textContent = customer.name;
      $('#profile-id').textContent = customer.id;
      $('#profile-avatar').textContent = customer.name.charAt(0);
      $('#profile-badges').innerHTML =
        '<span class="cc-profile-badge identified">identified</span>' +
        '<span class="cc-profile-badge">web</span>' +
        `<span class="cc-profile-badge">${customer.policy_type}</span>`;
      addEvent('identity', 'identity_resolved', customer.name, 'green');
      return customer;
    }
    return null;
  }

  // --- API Calls ---
  async function callLookup(phone) {
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      const voipFlag = data.isNonFixedVoip ? '⚠ VoIP' : 'non-VoIP ✓';
      addEvent('lookup', 'lookup_complete', voipFlag, data.isNonFixedVoip ? 'red' : 'amber');
      return data;
    } catch (err) {
      addEvent('error', 'lookup_failed', err.message, 'red');
      return null;
    }
  }

  async function callVerifyStart(phone) {
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/verify-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      addEvent('verify', 'verify_sent', `OTP via ${data.channel}`, 'amber');
      return data;
    } catch (err) {
      addEvent('error', 'verify_failed', err.message, 'red');
      return null;
    }
  }

  async function callVerifyCheck(phone, code) {
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/verify-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      const data = await res.json();
      if (data.valid) {
        addEvent('verify', 'verify_approved', 'OTP confirmed', 'green');
      } else {
        addEvent('verify', 'verify_failed', 'Invalid code', 'red');
      }
      return data;
    } catch (err) {
      addEvent('error', 'verify_error', err.message, 'red');
      return { valid: false };
    }
  }

  // Context POST goes to CRelay directly from browser (not via Twilio Function)
  async function postContextToCRelay(context) {
    if (!CRELAY_BASE) return;
    try {
      await fetch(`${CRELAY_BASE}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
    } catch (e) {
      console.warn('CRelay context POST failed:', e.message);
    }
  }

  async function callInitiate(phone) {
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/initiate-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerPhone: phone })
      });
      const data = await res.json();
      state.callSid = data.callSid;
      addEvent('call', 'call_connected', 'CRelay', 'green');
      return data;
    } catch (err) {
      addEvent('error', 'call_failed', err.message, 'red');
      // Retry: re-show call overlay so presenter can try again
      show($('#call-overlay'));
      hide($('#connected-overlay'));
      state.phase = 'browsing';
      return null;
    }
  }

  // --- Disposition ---
  function recordDisposition(disposition) {
    addEvent('disposition', 'disposition_recorded', disposition, 'amber');
    state.disposition = disposition;
  }

  // --- Transcript Polling ---
  function startTranscriptPolling() {
    if (!CRELAY_BASE) return;
    let lastIndex = 0;
    state.transcriptPollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${CRELAY_BASE}/transcript?callSid=${state.callSid}&since=${lastIndex}`);
        const data = await res.json();
        if (data.entries) {
          data.entries.forEach(e => addTranscript(e.role, e.content));
          lastIndex += data.entries.length;
        }
      } catch (e) { /* polling failure is silent */ }
    }, 2000);
  }

  function stopTranscriptPolling() {
    if (state.transcriptPollInterval) {
      clearInterval(state.transcriptPollInterval);
      state.transcriptPollInterval = null;
    }
  }

  // --- Call Timer ---
  function startCallTimer() {
    const bar = $('#call-bar');
    bar.className = 'cc-call-bar active';
    $('#call-status').textContent = 'Call Active';
    state.callSeconds = 0;
    state.callTimer = setInterval(() => {
      state.callSeconds++;
      const m = String(Math.floor(state.callSeconds / 60)).padStart(2, '0');
      const s = String(state.callSeconds % 60).padStart(2, '0');
      $('#call-timer').textContent = `${m}:${s}`;
    }, 1000);
  }

  function stopCallTimer() {
    if (state.callTimer) {
      clearInterval(state.callTimer);
      state.callTimer = null;
    }
    const bar = $('#call-bar');
    bar.className = 'cc-call-bar idle';
    $('#call-status').textContent = 'Call Ended';
  }

  // --- Page Rendering ---
  function renderPage(page) {
    state.currentPage = page;
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${page}"]`).classList.add('active');

    const content = $('#site-content');
    if (page === 'policies') {
      content.innerHTML = `
        <div style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">My Policies</div>
        <div class="cc-overlay" style="text-align:left;border-color:#e5e7eb;">
          <h3 style="color:#004785;">My Policy — HO-2024-08341</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;color:#6b7280;margin-top:8px;">
            <div>Coverage: $350,000</div><div>Premium: $2,400/yr</div>
            <div>Type: Homeowners</div><div>Renewal: Aug 15, 2026</div>
          </div>
        </div>
        <div class="cc-overlay highlight" id="call-overlay">
          <h3>Need help with your policy?</h3>
          <p>Our agents are available 24/7</p>
          <button class="cc-btn cc-btn-primary" id="btn-call">Call Us Now</button>
        </div>
        <div class="cc-overlay highlight hidden" id="phone-overlay">
          <h3>Enter Your Phone Number</h3>
          <p>We'll verify your identity before connecting</p>
          <input type="tel" class="cc-phone-input" id="phone-input" placeholder="+1 (___) ___-____">
          <br>
          <button class="cc-btn cc-btn-primary" id="btn-submit-phone">Continue</button>
        </div>
        <div class="cc-overlay verify hidden" id="otp-overlay">
          <h3>Verify Your Identity</h3>
          <p>Enter the code sent to your phone</p>
          <div class="cc-otp-container" id="otp-container">
            <input class="cc-otp-digit" maxlength="1" data-idx="0">
            <input class="cc-otp-digit" maxlength="1" data-idx="1">
            <input class="cc-otp-digit" maxlength="1" data-idx="2">
            <input class="cc-otp-digit" maxlength="1" data-idx="3">
            <input class="cc-otp-digit" maxlength="1" data-idx="4">
            <input class="cc-otp-digit" maxlength="1" data-idx="5">
          </div>
          <div id="otp-error" class="hidden" style="color:#ef4444;font-size:13px;margin-bottom:8px;"></div>
          <button class="cc-btn cc-btn-success" id="btn-verify">Verify & Connect</button>
        </div>
        <div class="cc-overlay hidden" id="connected-overlay" style="border-color:#10b981;">
          <h3 style="color:#10b981;">✓ Connected</h3>
          <p>You are now speaking with our AI assistant</p>
          <button class="cc-btn" id="btn-end-call" style="background:#ef4444;color:white;">End Call</button>
        </div>`;
    } else if (page === 'claims') {
      content.innerHTML = `
        <div style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">My Claims</div>
        <div class="cc-overlay" style="text-align:left;border-color:#e5e7eb;">
          <h3 style="color:#004785;">Active Claims — AU-2022-27563</h3>
          <table style="width:100%;font-size:13px;margin-top:8px;border-collapse:collapse;">
            <tr style="color:#6b7280;border-bottom:1px solid #e5e7eb;">
              <th style="text-align:left;padding:4px 0;">Claim #</th><th>Date</th><th>Status</th><th>Amount</th>
            </tr>
            <tr><td style="padding:4px 0;">CL-2025-0891</td><td>Nov 3, 2025</td><td><span style="color:#f59e0b;">Under Review</span></td><td>$4,200</td></tr>
            <tr><td style="padding:4px 0;">CL-2024-1456</td><td>Jun 22, 2024</td><td><span style="color:#10b981;">Settled</span></td><td>$2,800</td></tr>
            <tr><td style="padding:4px 0;">CL-2023-0234</td><td>Feb 15, 2023</td><td><span style="color:#10b981;">Settled</span></td><td>$1,500</td></tr>
          </table>
        </div>
        <div class="cc-overlay highlight" id="call-overlay">
          <h3>Questions about your claim?</h3>
          <p>Speak with an agent about claim CL-2025-0891</p>
          <button class="cc-btn cc-btn-primary" id="btn-call">Call Us Now</button>
        </div>
        <div class="cc-overlay highlight hidden" id="phone-overlay">
          <h3>Enter Your Phone Number</h3>
          <p>We'll verify your identity before connecting</p>
          <input type="tel" class="cc-phone-input" id="phone-input" placeholder="+1 (___) ___-____">
          <br>
          <button class="cc-btn cc-btn-primary" id="btn-submit-phone">Continue</button>
        </div>
        <div class="cc-overlay verify hidden" id="otp-overlay">
          <h3>Verify Your Identity</h3>
          <p>Enter the code sent to your phone</p>
          <div class="cc-otp-container" id="otp-container">
            <input class="cc-otp-digit" maxlength="1" data-idx="0">
            <input class="cc-otp-digit" maxlength="1" data-idx="1">
            <input class="cc-otp-digit" maxlength="1" data-idx="2">
            <input class="cc-otp-digit" maxlength="1" data-idx="3">
            <input class="cc-otp-digit" maxlength="1" data-idx="4">
            <input class="cc-otp-digit" maxlength="1" data-idx="5">
          </div>
          <div id="otp-error" class="hidden" style="color:#ef4444;font-size:13px;margin-bottom:8px;"></div>
          <button class="cc-btn cc-btn-success" id="btn-verify">Verify & Connect</button>
        </div>
        <div class="cc-overlay hidden" id="connected-overlay" style="border-color:#10b981;">
          <h3 style="color:#10b981;">✓ Connected</h3>
          <p>You are now speaking with our AI assistant</p>
          <button class="cc-btn" id="btn-end-call" style="background:#ef4444;color:white;">End Call</button>
        </div>`;
    }
    addEvent('page', 'page_view', `/${page}`, 'blue');
    bindPageEvents();
  }

  // --- Event Bindings ---
  function bindPageEvents() {
    const btnCall = $('#btn-call');
    if (btnCall) btnCall.addEventListener('click', onClickToCall);

    const btnPhone = $('#btn-submit-phone');
    if (btnPhone) btnPhone.addEventListener('click', onSubmitPhone);

    const btnVerify = $('#btn-verify');
    if (btnVerify) btnVerify.addEventListener('click', onVerifyOtp);

    const btnEnd = $('#btn-end-call');
    if (btnEnd) btnEnd.addEventListener('click', onEndCall);

    // OTP digit auto-advance
    document.querySelectorAll('.cc-otp-digit').forEach(input => {
      input.addEventListener('input', (e) => {
        if (e.target.value && e.target.dataset.idx < 5) {
          document.querySelector(`.cc-otp-digit[data-idx="${+e.target.dataset.idx + 1}"]`).focus();
        }
      });
    });
  }

  // --- Flow Handlers ---
  function onClickToCall() {
    addEvent('click', 'button_click', 'Call Us Now', 'purple');
    hide($('#call-overlay'));
    show($('#phone-overlay'));
    state.phase = 'calling';
    $('#phone-input').focus();
  }

  async function onSubmitPhone() {
    const phone = $('#phone-input').value.trim();
    if (!phone) return;

    addEvent('input', 'phone_submitted', phone, 'purple');

    // Identity resolution
    resolveIdentity(phone);

    // Lookup
    await callLookup(phone);

    // Start Verify
    state.phase = 'verifying';
    await callVerifyStart(phone);

    hide($('#phone-overlay'));
    show($('#otp-overlay'));
    document.querySelector('.cc-otp-digit[data-idx="0"]').focus();
  }

  async function onVerifyOtp() {
    const digits = Array.from(document.querySelectorAll('.cc-otp-digit')).map(i => i.value).join('');
    if (digits.length !== 6) return;

    const phone = state.customer?.phone || $('#phone-input').value.trim();
    const result = await callVerifyCheck(phone, digits);

    if (result.valid) {
      hide($('#otp-overlay'));
      show($('#connected-overlay'));
      state.phase = 'connected';

      // POST context to CRelay directly from browser, then initiate call via Function
      const crelayContext = {
        customerId: state.customer?.id,
        customerName: state.customer?.name,
        policyNumber: state.customer?.policy_number,
        policyType: state.customer?.policy_type,
        browsingHistory: state.events.filter(e => e.type === 'page').map(e => e.detail),
        verificationStatus: 'approved'
      };
      await postContextToCRelay(crelayContext);
      await callInitiate(phone);
      startCallTimer();
      startTranscriptPolling();
    } else {
      state.otpAttempts++;
      const errEl = $('#otp-error');
      show(errEl);
      if (state.otpAttempts >= 3) {
        errEl.textContent = 'Too many attempts. Please try again.';
        $('#btn-verify').disabled = true;
      } else {
        errEl.textContent = `Invalid code. ${3 - state.otpAttempts} attempts remaining.`;
      }
      document.querySelectorAll('.cc-otp-digit').forEach(i => { i.value = ''; });
      document.querySelector('.cc-otp-digit[data-idx="0"]').focus();
    }
  }

  function onEndCall() {
    stopCallTimer();
    stopTranscriptPolling();
    state.phase = 'ended';
    addEvent('call', 'call_ended', `${$('#call-timer').textContent}`, 'amber');
    // Record disposition based on scenario
    const disposition = state.currentPage === 'policies'
      ? 'Policy Inquiry — Resolved'
      : 'Claim Inquiry — Escalated to Agent';
    recordDisposition(disposition);
  }

  // --- Init ---
  function init() {
    // Nav click handlers
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (state.phase !== 'browsing') return; // prevent nav during call
        renderPage(link.dataset.page);
      });
    });

    // Simulate initial browsing events
    addEvent('page', 'page_view', '/home', 'blue');
    setTimeout(() => renderPage('policies'), 800);
  }

  init();
})();
```

- [ ] **Step 2: Test page loads and click-to-call flow opens phone input**

Run browser test manually: click "Call Us Now" → phone overlay appears, event stream shows `button_click`

- [ ] **Step 3: Commit**

```bash
git add src/assets/callcenter.js
git commit -m "feat: add callcenter.js with event stream, identity resolution, and call flow"
```

---

## Task 8: Conversation Relay Extensions

**Repo:** `/tmp/forge-cr/` (branch `sfbli-call-center` from `cr-4-interruptions`)
**Files:**
- Modify: `src/server.js` — add /context, /transcript, /status endpoints; modify WS handler

- [ ] **Step 1: Create branch**

```bash
cd /tmp/forge-cr
git checkout cr-4-interruptions
git checkout -b sfbli-call-center
```

- [ ] **Step 2: Add /context endpoint**

Add POST `/context` route to `src/server.js` that stores session context in the existing `sessions` Map keyed by a temporary ID (callSid comes later):

```javascript
// Add after existing route registrations in server.js
server.post('/context', async (request, reply) => {
  const { customerId, customerName, policyNumber, policyType, browsingHistory, verificationStatus } = request.body;
  const sessionId = request.body.callSid || `pending_${Date.now()}`;
  sessions.set(sessionId, {
    context: { customerId, customerName, policyNumber, policyType, browsingHistory, verificationStatus },
    transcript: [],
    createdAt: Date.now()
  });
  reply.send({ sessionId, status: 'context_stored' });
});
```

- [ ] **Step 3: Add /transcript GET endpoint**

```javascript
server.get('/transcript', async (request, reply) => {
  const { callSid, since } = request.query;
  const session = sessions.get(callSid);
  if (!session) return reply.code(404).send({ error: 'Session not found' });
  const sinceIdx = parseInt(since) || 0;
  const entries = session.transcript.slice(sinceIdx);
  reply.send({ entries, total: session.transcript.length });
});
```

- [ ] **Step 4: Add /status POST endpoint**

```javascript
server.post('/status', async (request, reply) => {
  const { CallSid, CallStatus } = request.body;
  console.log(`Call ${CallSid} status: ${CallStatus}`);
  if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'canceled') {
    // Clean up session after a delay (allow final transcript polls)
    setTimeout(() => sessions.delete(CallSid), 30000);
  }
  reply.send({ status: 'ok' });
});
```

- [ ] **Step 5: Modify WebSocket handler for dynamic system prompt**

In the existing `setup` message handler, inject context into the system prompt:

```javascript
// In the WS connection handler, after receiving 'setup' message:
const callSid = data.callSid;
// Find context — check pending sessions
let sessionContext = null;
for (const [key, val] of sessions.entries()) {
  if (key.startsWith('pending_')) {
    sessionContext = val.context;
    sessions.delete(key);
    sessions.set(callSid, { ...val, callSid });
    break;
  }
}

const contextPrompt = sessionContext ? `
CUSTOMER CONTEXT:
- Name: ${sessionContext.customerName}
- Customer ID: ${sessionContext.customerId}
- Policy: ${sessionContext.policyNumber} (${sessionContext.policyType})
- Browsing: ${sessionContext.browsingHistory?.join(' → ')}
- Verification: ${sessionContext.verificationStatus}

INSTRUCTIONS:
1. This call is being recorded. The recording notice was already played.
2. Greet the customer and ask for their name to verify identity.
3. Once name confirmed, ask for their policy number.
4. Once policy verified, ask how you can help them today.
5. For policy questions, provide information from the context above.
6. If the customer asks to speak to a human agent, say "I'll transfer you to an agent now" and use the transferToAgent tool.
` : '';
```

- [ ] **Step 6: Add transcript recording to WS handler**

After each AI response and customer speech, push to session transcript:

```javascript
// After processing AI response:
const session = sessions.get(callSid);
if (session) {
  session.transcript.push({ role: 'ai', content: aiResponse, timestamp: Date.now() });
}

// After receiving customer speech:
if (session) {
  session.transcript.push({ role: 'customer', content: customerSpeech, timestamp: Date.now() });
}
```

- [ ] **Step 7: Test locally**

```bash
cd /tmp/forge-cr
npm start
# In another terminal:
curl -X POST http://localhost:3000/context -H 'Content-Type: application/json' -d '{"customerName":"Maria Santos","customerId":"cust_001","policyNumber":"HO-2024-08341","policyType":"Homeowners","browsingHistory":["/home","/policies"],"verificationStatus":"approved"}'
# Expected: {"sessionId":"pending_...","status":"context_stored"}
```

- [ ] **Step 8: Commit**

```bash
cd /tmp/forge-cr
git add src/server.js
git commit -m "feat: add context injection, transcript, and status endpoints for SFBLI call center"
```

---

## Task 9: Flex Plugin — Context Panels

**Repo:** `/Users/pheath/Development/one-ring-to-rule-them-all/`
**Files:**
- Create: `projects/flex/demos/sfbli-call-center/SfbliCallCenterPanel.jsx`

This task creates the Flex plugin panel that reads task attributes and renders 4 sections. The exact implementation depends on the existing plugin structure in one-ring-to-rule-them-all.

- [ ] **Step 1: Explore existing plugin structure**

```bash
ls -la /Users/pheath/Development/one-ring-to-rule-them-all/projects/flex/demos/
```

Understand how existing demos register panels, then follow the same pattern.

- [ ] **Step 2: Create SfbliCallCenterPanel component**

The panel reads `task.attributes` and renders 4 sections:

```jsx
// Pseudo-structure — adapt to match existing plugin patterns
const SfbliCallCenterPanel = ({ task }) => {
  const attrs = task?.attributes || {};
  const { customerName, customerPhone, policyNumber, policyType,
          premium, coverage, renewalDate, riskScore,
          browsingHistory, verificationStatus, transcriptSummary,
          claims } = attrs;

  return (
    <div className="sfbli-panel">
      {/* Section 1: Customer Context */}
      <Section title="Customer Context">
        <Field label="Name" value={customerName} />
        <Field label="Phone" value={customerPhone} />
        <Badge label="Verified" color={verificationStatus === 'approved' ? 'green' : 'gray'} />
        <Breadcrumb items={browsingHistory} />
        {transcriptSummary && <p>{transcriptSummary}</p>}
      </Section>

      {/* Section 2: Policy Information */}
      <Section title="Policy">
        <Field label="Number" value={policyNumber} />
        <Field label="Type" value={policyType} />
        <Field label="Premium" value={premium} />
        <Field label="Coverage" value={coverage} />
        <Field label="Renewal" value={renewalDate} />
        <Badge label={riskScore} />
      </Section>

      {/* Section 3: Claims */}
      {claims && claims.length > 0 && (
        <Section title="Claims">
          <ClaimsTable claims={claims} />
        </Section>
      )}

      {/* Section 4: Interaction History */}
      <Section title="Interaction History">
        <EventList events={browsingHistory} />
      </Section>
    </div>
  );
};
```

- [ ] **Step 3: Register panel in plugin config**

Follow the existing demo registration pattern to add the SFBLI panel to the CRM container.

- [ ] **Step 4: Test locally**

```bash
cd /Users/pheath/Development/one-ring-to-rule-them-all
# Follow existing dev workflow to test plugin locally
```

- [ ] **Step 5: Commit**

```bash
cd /Users/pheath/Development/one-ring-to-rule-them-all
git add projects/flex/demos/sfbli-call-center/
git commit -m "feat: add SFBLI call center context panels for Flex"
```

---

## Task 10: Playwright E2E Tests — Call Center Page

**Files:**
- Create: `src/test/e2e/callcenter.spec.js`

Note: Use `page.evaluate()` for DOM interactions and `waitForFunction()` for visibility checks per project testing patterns. Viewport is 1440x900.

- [ ] **Step 1: Write E2E tests**

```javascript
// src/test/e2e/callcenter.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Call Center Layout', () => {
  test('renders split-screen layout', async ({ page }) => {
    await page.goto('/callcenter.html');
    await expect(page.locator('.cc-layout')).toBeVisible();
    await expect(page.locator('.cc-site')).toBeVisible();
    await expect(page.locator('.cc-events-panel')).toBeVisible();
  });

  test('shows SFBLI nav with correct links', async ({ page }) => {
    await page.goto('/callcenter.html');
    await expect(page.locator('.cc-site-nav')).toContainText('SFBLI');
    await expect(page.locator('.nav-link')).toHaveCount(4);
  });

  test('starts on policies page with initial events', async ({ page }) => {
    await page.goto('/callcenter.html');
    // Wait for initial page_view events
    await page.waitForFunction(() =>
      document.querySelectorAll('.cc-event-row').length >= 2);
    await expect(page.locator('.cc-event-row')).toHaveCount(2, { timeout: 2000 });
  });

  test('profile starts as anonymous', async ({ page }) => {
    await page.goto('/callcenter.html');
    await expect(page.locator('#profile-name')).toContainText('Anonymous Visitor');
    await expect(page.locator('.cc-profile-badge')).toContainText('anonymous');
  });
});

test.describe('Call Center Flow', () => {
  test('click to call shows phone input', async ({ page }) => {
    await page.goto('/callcenter.html');
    await page.waitForFunction(() =>
      document.getElementById('btn-call') !== null);
    await page.evaluate(() =>
      document.getElementById('btn-call').click());
    await page.waitForFunction(() =>
      !document.getElementById('phone-overlay').classList.contains('hidden'));
    await expect(page.locator('#phone-overlay')).toBeVisible();
    // button_click event should appear
    await page.waitForFunction(() =>
      document.querySelectorAll('.cc-event-row').length >= 3);
  });

  test('nav links switch pages', async ({ page }) => {
    await page.goto('/callcenter.html');
    await page.waitForFunction(() =>
      document.querySelectorAll('.cc-event-row').length >= 2);
    await page.evaluate(() =>
      document.querySelector('.nav-link[data-page="claims"]').click());
    await page.waitForFunction(() =>
      document.querySelector('.nav-link[data-page="claims"]').classList.contains('active'));
    // Claims content should show
    await expect(page.locator('#site-content')).toContainText('Active Claims');
  });

  test('call bar starts idle', async ({ page }) => {
    await page.goto('/callcenter.html');
    await expect(page.locator('#call-bar')).toHaveClass(/idle/);
    await expect(page.locator('#call-status')).toContainText('No Active Call');
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd src && npx playwright test test/e2e/callcenter.spec.js --headed`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/test/e2e/callcenter.spec.js
git commit -m "test: add Playwright E2E tests for call center page"
```

---

## Task 11: Integration Testing & Screenshots

**Files:**
- Potentially modify: `src/assets/callcenter.js` — update FUNCTIONS_BASE with deployed URL
- Potentially modify: `src/assets/callcenter.html` — add screenshot images

- [ ] **Step 1: Capture SFBLI site screenshots**

Use Playwright to screenshot sfbli.com pages:
```bash
npx playwright screenshot --viewport-size=1024,768 "https://sfbli.com/policies" screenshots/policies.png
npx playwright screenshot --viewport-size=1024,768 "https://sfbli.com/claims" screenshots/claims.png
```

Or manually take screenshots and place in `src/assets/screenshots/`

- [ ] **Step 2: Update callcenter.js FUNCTIONS_BASE**

Set `FUNCTIONS_BASE` to the deployed Twilio Functions URL (from `.twiliodeployinfo`).
Set `CRELAY_BASE` to the ngrok or Fly.io URL.

- [ ] **Step 3: Test full flow manually**

1. Open `callcenter.html` on deployed Twilio Functions URL
2. Click "Call Us Now" → enter phone → receive OTP SMS → enter OTP → call connects
3. Verify Conversation Relay answers and transcript appears
4. Test Path A (policy question resolved) and Path B (transfer to Flex)

- [ ] **Step 4: Commit any adjustments**

```bash
git add -A
git commit -m "feat: integrate call center with deployed Functions and CRelay"
```

---

## Task 12: Deploy & Final Verification

- [ ] **Step 1: Deploy Twilio Functions**

```bash
npx twilio serverless:deploy --service-name sfbli -p FLEX --override-existing-project
```

- [ ] **Step 2: Deploy CRelay to Fly.io**

```bash
cd /tmp/forge-cr
fly deploy
```

- [ ] **Step 3: Update CRELAY_BASE_URL env var**

Update `src/.env` with the Fly.io URL, redeploy Functions.

- [ ] **Step 4: Run all tests**

```bash
cd src && npx jest --verbose && npx playwright test --headed
```

- [ ] **Step 5: Final commit and push**

```bash
git add -A
git commit -m "chore: final integration and deployment of call center demo"
git push
```
