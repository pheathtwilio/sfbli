# Claims & Policy Call Center — Design Spec

**Date:** 2026-03-26
**Status:** Approved

## Overview

A split-screen demo page (`callcenter.html`) showcasing an end-to-end insurance call center experience: customer browses the SFBLI website, clicks to call, undergoes identity verification (Lookup + Verify), connects to a Conversation Relay AI agent, and either self-resolves or escalates to a Flex agent — all while a Segment-style event stream and live transcript update in real time.

## System Architecture

Three hosting environments, five components:

| Component | Host | Purpose |
|-----------|------|---------|
| `callcenter.html` + overlays | Twilio Functions | Split-screen demo UI |
| 4 new Twilio Functions | Twilio Functions | Lookup, Verify, call initiation |
| Conversation Relay server | Local + ngrok (dev) / Fly.io (prod) | AI voice agent with context injection |
| Flex plugin panels | Flex UI (localhost / cloud) | Agent context display |
| Customer profiles | `app.js` MOCK_PROFILES | Maria Santos (cust_001), Amanda Foster (cust_007) |

**Env vars to add:** `VERIFY_SERVICE_SID`, `CRELAY_BASE_URL`

## Demo Page Layout

**Left panel (60%):** Screenshots of sfbli.com pages with interactive HTML overlays:
- Top nav bar (SFBLI branding, Home / Policies / Claims / Contact Us)
- Policy/claims browsing content (swapped per scenario)
- "Call Us Now" button overlay → phone number input (blank, not pre-filled)
- OTP entry overlay (6-digit Verify code)

**Right panel (380px, dark theme):**
- Profile header (starts anonymous, resolves to identified customer)
- Live Segment event stream (page_view → button_click → identity_resolved → lookup_complete → verify_approved → call_connected)
- Live transcript panel (AI Assistant / Customer lines)
- Call status bar (idle / ringing / active with timer)

Everything resets on page refresh for repeatable demos.

## Demo Flow — Two Paths

### Phase 1: Browse & Identity (shared)

1. Customer browses SFBLI site pages — anonymous Segment events fire
2. Customer clicks "Call Us Now" → enters phone number
3. Phone number triggers **identity resolution** — anonymous profile merges with known customer
4. **Lookup v2** runs: line type intelligence (non-VoIP check), caller name
5. **Verify** sends OTP via SMS
6. Customer enters OTP on the page → verified
7. Call creation begins, recording notice via `<Say>`, then routes to Conversation Relay

### Phase 2a: Self-Resolution (Maria Santos — Path A)

- Browsing context: policies page, "My Policy" detail
- CRelay greets, asks for name → customer says "Maria Santos" → verified against profile
- CRelay asks for policy number → customer provides HO-2024-08341 → verified
- Customer asks policy question (e.g., "When does my policy renew?")
- CRelay resolves from profile data → answers question
- Call ends → disposition "Policy Inquiry — Resolved" recorded against profile

### Phase 2b: Flex Escalation (Amanda Foster — Path B)

- Browsing context: claims page, looking at active claims
- CRelay greets, asks for name → "Amanda Foster" → verified
- CRelay asks for policy number → AU-2022-27563 → verified
- Customer asks about claim status → then says "I want to speak to an agent"
- CRelay transfers to Flex via TaskRouter
- Flex agent sees 4 plugin panels with full context
- Disposition "Claim Inquiry — Escalated to Agent" recorded

## Conversation Relay Design

Fork from `forge-in-a-box-cr` repo, branch `sfbli-call-center` (based on `cr-4-interruptions`).

### New Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/context` | POST | Inject session context (customer profile, browsing history, verification status) before call connects |
| `/twiml` | POST | Returns ConversationRelay TwiML (existing, modified) |
| `/ws` | WS | WebSocket conversation handler (existing, modified) |
| `/transcript` | GET | Returns current transcript for polling |
| `/status` | POST | Call lifecycle events (ringing, in-progress, completed) |

### Context Injection Flow

1. `callcenter.html` POSTs to `/context` with: `{ callSid, customerId, customerName, policyNumber, policyType, browsingHistory, verificationStatus }`
2. CRelay stores in session Map
3. When WebSocket connects, dynamic system prompt includes all context
4. System prompt instructs AI to: greet by scenario, verify name, verify policy number, then handle query

### Agent Dispatch (Path B)

When customer requests an agent:
1. CRelay calls Twilio REST API to update the call — redirect to a TwiML that enqueues to Flex TaskRouter
2. Task attributes JSON includes: customer name, phone, policy number, policy type, browsing history, verification status, transcript summary, CRelay disposition
3. CRelay session cleaned up

### Transcript Streaming

- CRelay maintains transcript array in session: `[{ role, content, timestamp }]`
- `callcenter.html` polls `/transcript?callSid=xxx` every 2 seconds
- Returns new entries since last poll (tracked by index)

## Twilio Functions (4 new)

### `lookup.js`
- Input: `phone` (E.164)
- Calls Lookups v2 with `lineTypeIntelligence` package
- Returns: `{ valid, callerName, lineType, carrier, isNonFixedVoip }`
- Used to flag potential fraud (non-fixed VoIP numbers)

### `verify-start.js`
- Input: `phone` (E.164), `channel` (sms, default sms)
- Creates Verify verification using `VERIFY_SERVICE_SID`
- Returns: `{ sid, status, channel }`
- Note: Verify sends OTP via SMS (not RCS — Verify does not support RCS natively)

### `verify-check.js`
- Input: `phone` (E.164), `code` (6-digit string)
- Checks verification code
- Returns: `{ valid, status }`

### `initiate-call.js`
- Input: `customerPhone` (E.164), `customerContext` (JSON object)
- POSTs context to CRelay `/context` endpoint
- Creates outbound call via Calls API:
  - `from`: SFBLI Twilio number (env var `TWILIO_PHONE_NUMBER`)
  - `to`: customer phone or conference/SIP target
  - `url`: CRelay `/twiml` endpoint (returns ConversationRelay TwiML)
  - `record`: true
  - `statusCallback`: CRelay `/status` endpoint
- Returns: `{ callSid, status }`

## Flex Plugin Design

New panels added to the existing `one-ring-to-rule-them-all` Flex plugin repo, under a new demo folder for SFBLI call center.

### 4 Panels (rendered in Flex CRM container)

1. **Customer Context Panel**
   - Customer name, phone, verification status (badge)
   - Browsing breadcrumb trail (pages visited)
   - Transcript summary from CRelay conversation
   - Call duration, recording link

2. **Policy Information Panel**
   - Policy number, type, status
   - Premium amount, coverage amount
   - Renewal date, customer since
   - Risk score badge

3. **Claims Panel**
   - Table of active claims (mock data from profile)
   - Claim number, date, status, amount
   - For Amanda Foster: 3 claims shown

4. **Interaction History Panel**
   - Web browsing events (from Segment mock)
   - CRelay conversation entries
   - Prior RCS/email messages sent

### Data Source
All panel data comes from **task attributes** JSON set during CRelay → Flex handoff. No additional API calls needed.

## Data Flow & Profile Mapping

```
Browser (callcenter.html)
  → Twilio Functions (lookup, verify, initiate-call)
    → Conversation Relay (context injection, AI conversation)
      → Flex TaskRouter (task attributes with full context)
        → Flex Plugin (reads task attributes, renders panels)
```

### Profile Resolution
- `callcenter.html` uses MOCK_PROFILES from `app.js` (or duplicated subset)
- Phone number entry triggers profile lookup by phone match, filtered to `type === 'customer'` only (excludes agent profiles)
- Maria Santos and Amanda Foster both use `+13125689550` / `pheath@twilio.com`
- **Disambiguation rule:** The current page determines which profile is selected. If the left panel shows the Policies page, select `cust_001` (Maria Santos). If it shows the Claims page, select `cust_007` (Amanda Foster). The page context sets a `currentScenario` variable that drives profile selection.

**Note:** The new `initiate-call.js` is separate from the existing `trigger-call.js` (used for outbound promo calls). They serve different flows.

### Reset Behavior
- Page refresh clears all state (events, transcript, call status)
- No persistent server-side state needed for the demo page
- CRelay sessions clean up on call end

## Demo Presentation Mode

- **Presenter plays customer solo** — speakerphone on, live transcript visible on screen
- Audience sees the split-screen page throughout
- Left panel shows what the "customer" sees on the SFBLI site
- Right panel shows what Segment captures + live AI conversation
- For Path B, presenter switches to Flex desktop to show agent view with plugin panels

## Key Design Decisions

1. Phone input is **blank** (not pre-filled) — typing triggers identity resolution
2. Recording notice via TwiML `<Say>` before CRelay connects (not part of AI conversation)
3. CRelay natural language determines path — simple questions self-resolve, "speak to an agent" escalates
4. Context passed to Flex entirely via task attributes JSON (no separate API)
5. Real Twilio API calls for: Lookup, Verify, voice call, Conversation Relay
6. Mocked: Segment event tracking, Flex claims/policy data display
7. `callcenter.html` is a separate standalone page (not embedded in `index.html`)

## Error Handling (Demo Recovery)

- **Lookup flags non-fixed VoIP:** Show warning badge in event stream but proceed with the flow
- **Verify send fails:** Show error in event stream, allow retry
- **Wrong OTP entered:** Show "Invalid code" message, allow retry (up to 3 attempts)
- **CRelay `/context` POST fails:** Proceed with call — AI will ask all verification questions from scratch (no context injection)
- **Call creation fails:** Show error status in call bar, allow retry via "Call Us Now" button
