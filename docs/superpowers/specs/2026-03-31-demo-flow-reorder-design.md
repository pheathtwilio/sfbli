# SFBLI Demo Flow Reorder — Design Spec

## Overview

Restructure the SFBLI Segment demo into a 3-step state machine that guides the presenter through a coherent narrative: cross-sell eligibility, customer journey outreach, and policy class change response. The right panel becomes profile-scoped, and abandoned form events move from the opening sequence to Step 3 where they belong narratively.

## Conventions

- **Profile name:** The customer profile is "Marco Santos" (no 's') matching the existing `MOCK_PROFILES` entry `cust_001`.
- **Profile identifiers:** `state.activeProfileId` uses the `id` field from `MOCK_PROFILES` (e.g., `'usr_001'`, `'cust_001'`). Conversation maps also use this `id` as the key.
- **"Show events statically"** means render all event DOM elements instantly with no `setTimeout` delays — same visual appearance, no animation.
- **Replay button:** Resets `demoStep` to `1`, clears `stepsPlayed`, clears all per-profile conversations, and replays from the beginning. Equivalent to a fresh page load without actually reloading.

## Demo Flow

### Step 1 — Cross-Sell Eligible Group (Paul Heath)

**Presenter actions:**
1. Navigate to Audiences, create/view audience
2. Create journey for the audience
3. Navigate to Profile Explorer, select Paul Heath
4. View Audiences tab to confirm cross-sell membership
5. Switch to Events tab — events auto-play

**Events (auto-play with delays):**

| Delay | Type | Label |
|-------|------|-------|
| 0ms | email_delivered | Email Delivered: Policy Renewal Reminder |
| 1500ms | email_opened | Email Opened: Policy Renewal Reminder |
| 3000ms | page_view | Viewed Auto Insurance Page |
| 4500ms | page_view | Viewed Get Quote |
| 6000ms | form_start | Started Quote Form |
| 7500ms | form_field | Entered Vehicle Type |

**After events complete:** All three outreach buttons enable (RCS/SMS, Email, Voice). No profile updates applied (status/engagement/churn changes are cosmetic and not needed for the demo narrative at this step).

**Step transition:** After any outreach is sent, `demoStep` advances to `2`.

### Step 2 — Customer Journey Outreach (Marco Santos)

**Presenter actions:**
1. View existing "Property & Casualty Promotion" audience
2. Create journey with this audience
3. Navigate to Profile Explorer, select Marco Santos
4. View Audiences tab to confirm membership
5. Switch to Events tab — promotion event auto-plays

**Events (auto-play):**

| Delay | Type | Label |
|-------|------|-------|
| 0ms | promotion_sent | Journey Triggered: Property & Casualty Promotion |

**After event:** RCS outreach auto-sends to Marco Santos using `JOURNEY_RCS_CONTENT_SID` template with variables `{ '1': profile.name }` (matching existing `triggerPromotionalOutreach` pattern). Outreach buttons enable. Right panel shows Marco Santos' conversation.

**Step transition:** After RCS auto-send completes (not just the promotion event), `demoStep` advances to `3`.

**Graceful degradation:** If `JOURNEY_RCS_CONTENT_SID` is not configured, skip the auto-send, log a console warning, and still advance the step. Outreach buttons still enable for manual use.

### Step 3 — Policy Class Change + Abandoned Form (Paul Heath)

**Presenter actions:**
1. Navigate back to Paul Heath in Profile Explorer
2. Switch to Events tab — Step 3 events auto-play (appending below Step 1 events)

**Events (auto-play with delays):**

| Delay | Type | Label |
|-------|------|-------|
| 0ms | policy_class_change | Policy Class Change Detected: Marco Santos |
| 2000ms | email_sent | Email Sent: Policy Review Required — Paul Heath |
| 5000ms | form_abandon | Form Abandoned: Quote Form (warning) |
| 7000ms | session_end | Session Ended (Abandoned) (warning) |

**Automated actions:**
- At `email_sent` event: actual email sent to pheath@twilio.com via SendGrid using `POLICY_CHANGE_EMAIL_TEMPLATE_ID` template with `dynamicData: { customer_name: 'Marco Santos', policy_type: 'Whole Life', agent_name: 'Paul Heath' }`
- After `session_end` event: RCS outreach auto-fires using existing `PROMO_CONTENT_SID` template with variables `{ '1': profile.name }`
- 2-way SMS/RCS conversation begins, visible in right panel
- Profile updates applied after Step 3 events complete: status → "At Risk", engagement_score → 45, predicted_churn → "High"

**Graceful degradation:** If `POLICY_CHANGE_EMAIL_TEMPLATE_ID` is not configured, skip the email send and log a console warning. If `PROMO_CONTENT_SID` is not configured, skip the RCS auto-send. Events still play regardless.

## State Management

### Demo State Machine

```
state.demoStep = 1          // Current step (1, 2, 3)
state.stepsPlayed = new Set() // Which steps have animated
state.activeProfileId = null  // Currently viewed profile
state.conversations = {}      // Per-profile conversation map
```

- `demoStep` starts at `1`, resets on page refresh
- No localStorage/sessionStorage — full reset on refresh
- `stepsPlayed` prevents re-animation when revisiting Events tab

### Step Transitions

| From | To | Trigger |
|------|----|---------|
| 1 | 2 | Any outreach sent in Step 1 |
| 2 | 3 | RCS auto-send completes for Marco Santos |

## Right Panel — Profile-Scoped

### Conversation Storage

`state.conversations` is a map keyed by profile identifier:

```
state.conversations = {
  'usr_001': [ { type: 'outbound', channel: 'rcs', ... }, ... ],   // Paul Heath
  'cust_001': [ { type: 'outbound', channel: 'rcs', ... }, ... ]   // Marco Santos
}
```

### Switching Behavior

- Selecting a profile in Profile Explorer swaps the right panel to that profile's conversation
- Outbound messages stored against the currently active profile
- Inbound poll results routed to the profile that most recently had an outbound message sent (since Paul Heath and Marco Santos share the same phone number `+13125689550`, phone-based matching is ambiguous — last-outbound-profile wins)
- Conversation history persists within the session (survives profile switching, not page refresh)

### Button State

| Profile | Enabled when |
|---------|-------------|
| Paul Heath | After Step 1 events play; again during Step 3 |
| Marco Santos | After Step 2 promotion event |
| All others | Always disabled |

## Events Tab Trigger Logic

When the Events tab is selected on a profile:

1. Is this profile part of the demo flow? (Paul Heath or Marco Santos only)
2. What is the current `demoStep`?
3. Has this step already played? (check `stepsPlayed`)

**Decision matrix:**

| Profile | demoStep | stepsPlayed | Result |
|---------|----------|-------------|--------|
| Paul Heath | 1 | no | Play Step 1 events |
| Paul Heath | 1 | yes | Show Step 1 events statically |
| Marco Santos | 2 | no | Play Step 2 events |
| Marco Santos | 2 | yes | Show Step 2 events statically |
| Paul Heath | 3 | no | Append & play Step 3 events below Step 1 |
| Paul Heath | 3 | yes | Show all events statically |
| Any other | any | any | No demo events |

## Marco Santos Profile

Must be configured with:
- Phone: Paul Heath's actual phone number (already set)
- Email: Paul Heath's actual email (already set)
- Preferred channel: SMS
- Member of "Property & Casualty Promotion" default audience
- Policy type: Whole Life (existing)

## Environment Variables

| Env Var | Purpose | Status |
|---------|---------|--------|
| `PROMO_CONTENT_SID` | RCS after abandoned form (Step 3) | Existing |
| `JOURNEY_RCS_CONTENT_SID` | RCS to Marcos from journey (Step 2) | New, TBD |
| `POLICY_CHANGE_EMAIL_TEMPLATE_ID` | Email to Paul Heath for class change (Step 3) | New, TBD |

Code references these env vars. Presenter configures template IDs when ready.

## Implementation Notes

- **`playScenario` needs an append mode:** The current function clears `dom.eventList.innerHTML` before playing. Step 3 must append below Step 1 events. Add an `append` parameter (default `false`) that skips the clear when `true`.
- **Remove auto-play on view switch:** The current `switchView('home')` auto-plays the scenario. This must be removed — event playback is now gated by the Events tab trigger logic in Profile Explorer only.
- **Marco Santos preferred channel:** Must be changed from `'email'` to `'sms'` in `MOCK_PROFILES` to match the demo narrative.
- **Per-profile event storage:** Maintain `state.profileEvents[profileId]` to persist rendered events across tab switches, so revisiting shows them statically.

## Unchanged Components

- Audience creation wizard (UI and logic)
- Journey creation wizard (UI and logic)
- Call agent voice flow (trigger-call function, TwiML)
- Call center demo (callcenter.html, callcenter.js)
- All backend Twilio Functions (send-rcs, send-email, send-reply, poll-messages, etc.)
- Phone lookup and verification flows
- Brand configuration loading

## Files Affected

| File | Changes |
|------|---------|
| `artefacts/src/assets/app.js` | State machine, per-profile conversations, events tab trigger logic, step transitions, auto-outreach |
| `artefacts/src/assets/scenarios/default.json` | Split into step-specific scenarios (or replaced with step definitions) |
| `artefacts/src/assets/index.html` | Right panel needs profile context indicator (name/avatar of active profile) |
| `artefacts/src/.env` | Add `JOURNEY_RCS_CONTENT_SID`, `POLICY_CHANGE_EMAIL_TEMPLATE_ID` |
