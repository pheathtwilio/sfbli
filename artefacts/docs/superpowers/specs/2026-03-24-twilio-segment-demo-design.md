# Twilio Segment Demo — Design Spec

## Overview

An interactive single-page dashboard that mocks Twilio Segment's UI to demonstrate behavioral signal detection and multi-channel outreach for an onsite technology demonstration. The demo showcases how Segment identifies insurance agent disengagement signals and triggers outreach via RCS/SMS (Twilio), email (SendGrid), and voice call escalation (Twilio Voice + Studio).

## Context

- **B2B use case:** SFBLI reaches out to its insurance agents (independent contractors who sell on SFBLI's behalf), not end customers.
- **Scenario:** An insurance agent visits the SFBLI website, browses resources or starts a quote flow, then abandons. Segment detects the behavioral signals and informs a multi-channel outreach strategy.
- **Demo recipient:** All outreach (SMS/RCS, email, voice) is sent to the presenter's own phone and email.
- **Segment is mocked.** All other Twilio/SendGrid API calls are real.

## Architecture

### System Components

```
Frontend (Twilio Asset)  -->  Twilio Functions (SFBLI Service)  -->  Twilio Services
   index.html                    /send-rcs                          Messaging API (RCS/SMS)
   style.css                     /send-email                        Content Templates
   app.js                        /trigger-call                      SendGrid
   brands/                       /webhook-inbound                   Voice + Studio Flow
                                 /poll-messages                     Your Phone
                                 /list-templates
```

### Frontend — Static HTML/CSS/JS (Twilio Asset)

A single-page Segment-inspired dashboard served as a Twilio Asset from the existing SFBLI Functions service.

**Three-panel layout:**

1. **Dark sidebar (left)** — Segment-style navigation. Unbranded. Nav items: Events, Profiles, Audiences, Connections. Visual decoration to establish the Segment look and feel.

2. **Event stream + agent profile (center):**
   - **Event stream:** Simulated real-time feed of behavioral signals. Events appear chronologically: page views (`/auto-insurance`, `/get-quote`), form interactions (`quote_form_started`), session events (`session_abandoned`). All data is mocked in a config object in the frontend.
   - **Agent profile card:** Configurable contact details (name, phone, email, region, engagement score, status). Editable in the UI before/during the demo. Fields: name, phone number, email address, region, agent status, engagement score.

3. **Outreach panel (right):**
   - **Channel controls:** Three action buttons, each triggering a real API call:
     - **Send RCS/SMS** (teal) — Opens template selector before sending
     - **Send Email** (blue) — Opens template selector before sending
     - **Trigger Voice Call** (red) — Initiates call immediately
   - **Status indicators:** Each channel shows delivery status after firing (Sending → Delivered → Read/Opened where available). Errors display inline.
   - **Conversation view:** Unified thread showing all channel activity:
     - RCS/SMS: Chat bubbles (outbound = right/branded color, inbound = left/gray)
     - Email: Card showing subject, recipient, delivery status
     - Voice: Status card (Initiating → Ringing → Connected → Ended with duration)
     - Timestamps and channel icons on each entry

### Backend — Twilio Functions (Existing SFBLI Service)

Six serverless functions deployed to the existing SFBLI Twilio Functions service:

#### `/send-rcs`
- **Input:** `{ to, contentSid, contentVariables }`
- **Behavior:** Sends message via Twilio Messaging API using Content Template. RCS-first with automatic SMS fallback (handled by Twilio).
- **Returns:** `{ messageSid, status }`

#### `/send-email`
- **Input:** `{ to, templateId, dynamicData }`
- **Behavior:** Sends email via SendGrid API using a Dynamic Template with variable substitution.
- **Returns:** `{ status, messageId }`

#### `/trigger-call`
- **Input:** `{ to }`
- **Behavior:** Creates outbound call via Twilio REST API. The call URL points to the Studio Flow, which connects to a human agent within 2 seconds (regulatory compliance for outbound calls).
- **Returns:** `{ callSid, status }`

#### `/webhook-inbound`
- **Input:** Twilio webhook payload (inbound SMS/RCS message)
- **Behavior:** Receives inbound replies from the presenter's phone. Stores the message in a simple in-memory or function-scoped data store for retrieval by the polling endpoint.
- **Returns:** TwiML (empty response or acknowledgment)

#### `/poll-messages`
- **Input:** `{ since }` (timestamp of last poll)
- **Behavior:** Returns any new inbound messages received since the given timestamp. Frontend polls this every 2-3 seconds.
- **Returns:** `{ messages: [{ from, body, timestamp, channel }] }`

#### `/list-templates`
- **Input:** `{ type }` (`content` or `sendgrid`)
- **Behavior:** Lists available Twilio Content Templates or SendGrid Dynamic Templates for the template selector dropdowns.
- **Returns:** `{ templates: [{ id, name, type, variables }] }`

### Message Storage

Inbound messages need to be stored between the webhook receiving them and the frontend polling for them. Options within Twilio Functions constraints:

- **Primary:** Use a module-scoped variable in the webhook function. Simple, works for a single-instance demo. Messages are lost on cold start, which is acceptable for demo purposes.
- **Fallback:** If persistence across cold starts is needed, use Twilio Sync as a lightweight store (write on webhook, read on poll). This adds latency but survives restarts.

For the demo, module-scoped storage is sufficient.

### Studio Flow

A Twilio Studio Flow for the voice call escalation:

1. Incoming call trigger (REST API)
2. `<Connect>` widget — connects to the human agent's phone number
3. Must complete connection within 2 seconds (outbound call compliance requirement)
4. The Studio Flow needs to be created as part of this project

## RCS/SMS Message Configuration

### Template Selector

When the presenter clicks "Send RCS/SMS," a template selector panel appears:

- **Dropdown** listing available Twilio Content Templates (fetched from `/list-templates` on page load)
- Each template shows: name, type (text/card/carousel), and channel compatibility
- **Variable fields** pre-populated from the agent profile (e.g., `{{name}}`, `{{policy_type}}`)
- **Send button** fires the selected template with substituted variables

### Supported RCS Content Types (via Twilio Content Templates)

- `twilio/text` — Plain text
- `twilio/media` — Images, video, documents
- `twilio/card` — Rich card (image + title + description + action buttons)
- `twilio/carousel` — Multiple swipeable cards

Templates are pre-created in the Twilio Console. The demo UI selects and sends them — it does not create templates.

### Automatic Fallback

Twilio's Content API handles channel fallback automatically. If RCS is unavailable for the recipient, the message degrades to the most complex format the channel supports (e.g., MMS or SMS).

## Email Configuration

### SendGrid Dynamic Templates

Same pattern as RCS/SMS:

- **Template selector** — Dropdown listing SendGrid Dynamic Templates (fetched from `/list-templates`)
- **Variable substitution** — Fields pre-populated from agent profile
- Templates are pre-created in the SendGrid Console

## 2-Way Messaging

### Conversation Flow

1. Presenter sends RCS/SMS from the UI → message appears in conversation view as outbound bubble
2. Presenter replies from their phone → Twilio webhook hits `/webhook-inbound`
3. Frontend polls `/poll-messages` every 2-3 seconds → picks up reply → shows as inbound bubble
4. Presenter can send follow-up messages from the UI

### Conversation View Design

- Unified thread showing all channels chronologically
- Each message has: channel icon, timestamp, direction indicator
- Outbound messages: right-aligned, teal/branded background
- Inbound messages: left-aligned, gray background
- Email entries: card format showing subject and status
- Voice entries: status card with call progression and duration

## Branding

### Current Phase — Unbranded

The Segment-style UI is intentionally unbranded. No logos, no brand colors beyond the neutral Segment aesthetic (dark sidebar, teal accents, white content area).

### Future Phase — Configurable Branding

Branding is handled by separate CSS and JSON files per brand, loaded via query parameter.

**CSS custom properties** define all brand-touchable styles:
- `--brand-primary` — Primary action color
- `--brand-sidebar-bg` — Sidebar background
- `--brand-logo-url` — Logo image URL
- `--brand-font-family` — Font override
- Additional properties as needed

**Brand files:**
```
assets/brands/
  default.css    — unbranded (current, Segment-neutral)
  default.json   — default config (company name, terminology, template IDs)
  sfbli.css      — SFBLI brand colors, logo
  sfbli.json     — SFBLI-specific config
```

**Brand JSON** contains non-style configuration:
```json
{
  "name": "SFBLI",
  "terminology": { "agent": "Producer" },
  "defaultContact": { "name": "...", "phone": "...", "email": "..." },
  "templateIds": { "rcs": "...", "email": "..." }
}
```

**Switching brands:** `?brand=sfbli` in the URL loads `brands/sfbli.css` and `brands/sfbli.json`. No code changes required.

**Adding a new brand:** Create a new `.css` + `.json` file pair, redeploy assets.

## Segment UI Design Language

The frontend mimics Segment's visual design:

- **Sidebar:** Dark navy/charcoal (`#1a1a2e` or similar), teal-green accent color (`#52BD94`)
- **Content area:** White/light gray background
- **Typography:** Clean sans-serif (system font stack or Inter)
- **Data tables:** Minimal borders, generous whitespace
- **Event stream:** Chronological list with event name, timestamp, expandable detail
- **Profile card:** Key-value traits, computed scores, status badges
- **Overall feel:** Clean, data-dense, professional SaaS dashboard

## Deployment

### File Structure

```
sfbli-functions-service/
  assets/
    index.html              — main dashboard
    style.css               — base + Segment-style UI
    app.js                  — frontend logic, polling, API calls
    brands/
      default.css           — unbranded theme
      default.json          — default config
  functions/
    send-rcs.js
    send-email.js
    trigger-call.js
    webhook-inbound.js
    poll-messages.js
    list-templates.js
  test/
    functions/              — unit tests for each function
    e2e/                    — Playwright visual + integration tests
```

### Hosting

- **Frontend:** Twilio Asset (served from the SFBLI Functions service URL)
- **Backend:** Twilio Functions (same service)
- **Single deployment** via Twilio CLI or Console

### Environment Variables (Twilio Functions)

- `TWILIO_PHONE_NUMBER` — Twilio phone number for SMS/RCS/Voice
- `SENDGRID_API_KEY` — SendGrid API key
- `SENDGRID_FROM_EMAIL` — Sender email address
- `STUDIO_FLOW_SID` — Studio Flow SID for voice escalation
- `AGENT_PHONE_NUMBER` — Human agent's phone number for voice transfer
- `DEFAULT_RECIPIENT_PHONE` — Presenter's phone (demo recipient)
- `DEFAULT_RECIPIENT_EMAIL` — Presenter's email (demo recipient)

## Testing

### Unit Tests (Functions)

Each Twilio Function gets unit tests verifying:
- Correct API calls are made with expected parameters
- Error handling (API failures, missing parameters)
- Webhook payload parsing
- Message storage and retrieval for polling

### E2E Tests (Playwright)

- **Visual fidelity:** Dashboard renders correctly, matches Segment aesthetic
- **Interaction flow:** Click channel buttons, verify API calls fire, conversation view updates
- **Template selector:** Templates load, variables populate, selection works
- **Contact editing:** Profile fields are editable, changes persist during session
- **Responsive behavior:** Dashboard works on presenter's laptop resolution
- **Brand switching:** `?brand=x` loads correct theme

### Playwright MCP Setup

A Playwright MCP server needs to be configured for visual testing. This will be set up as part of implementation.

## Demo Script (Presenter Guide)

1. Open the dashboard URL
2. (Optional) Edit the agent contact details to match your demo phone/email
3. Walk audience through the Segment event stream — "Here's what Segment sees when an agent visits the site and abandons"
4. Point out the profile card — engagement score dropping, at-risk status
5. Click **Send RCS/SMS** — select a Content Template (e.g., re-engagement card), send it
6. Show your phone receiving the RCS message
7. Reply from your phone — show the reply appearing in the conversation view
8. Click **Send Email** — select a SendGrid template, send it
9. Show the email arriving in your inbox
10. Click **Trigger Voice Call** — show the call initiating, phone ringing, Studio connecting to agent
11. Narrate the escalation story: behavioral signal → RCS → email → voice → human agent

## Out of Scope (Current Phase)

- Real Segment integration (all Segment functionality is mocked)
- Automated cascade timing (presenter manually triggers each step)
- Multiple simultaneous contacts
- Analytics or reporting
- Authentication/authorization on the demo app
- Branded UI (deferred to future phase, architecture supports it)
