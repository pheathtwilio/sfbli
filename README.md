# SFBLI - San Francisco Bay Life Insurance Demo

A Twilio demo application showcasing how to build a modern customer experience platform combining CDP (Segment), multi-channel messaging, identity verification, AI agents, and contact center operations — all for a fictional insurance company.

## What This Demonstrates

The demo runs as a 45-minute presentation with 4 progressive scenarios, each layering Twilio products to solve real insurance industry problems.

### Demo 1: Right Message, Right Channel, Right Time
**Products:** Segment (CDP), Engage (Audiences + Journeys)

- Creates conditions-based audiences (e.g., agents with `target_attainment > 60%`)
- Builds journeys that send cross-sell promotions via each person's preferred channel
- Shows customer propensity scoring and personalized SMS/RCS outreach

### Demo 2: Closing the Loop on Policy Changes
**Products:** Segment, Conversations (SMS/RCS), Email, Voice Escalation

- Real-time policy change detection triggers multi-touch escalation
- Email first → form abandonment detection → RCS escalation → voice call option
- Tracks agent engagement and detects "At Risk" status

### Demo 3: From Anonymous to Known in 60 Seconds
**Products:** Verify (OTP), Lookup (Line Type Intelligence), Conversation Relay (AI Agent)

- Customer clicks "Call Now" on the website
- Lookup validates phone number, Verify confirms identity via OTP
- AI agent connects with full customer context — eliminates info-gathering overhead

### Demo 4: The Human Handoff & Intelligence Layer
**Products:** Flex (Contact Center), Conversational Intelligence

- AI detects complex inquiry, escalates to human agent with full context
- Agent sees claim history, previous AI transcript, browsing context in Flex
- Call transcribed and analyzed for sentiment, entities, and churn signals
- Analysis flows back into Segment for ongoing profile enrichment

## Architecture

```
Frontend (Twilio Assets)
├── index.html         → Segment Dashboard mock (3-panel layout)
├── callcenter.html    → Customer-facing insurance website mock
├── app.js / callcenter.js → Vanilla JS application logic
└── scenarios/         → Demo event sequence data

Backend (Twilio Functions)
├── Identity:    verify-start, verify-check, lookup
├── Messaging:   send-rcs, send-email, send-reply, clear-messages
├── Voice:       initiate-call, trigger-call, handoff, recording-handler
└── Config:      config, get-config, list-templates, save-context

External Services
├── Twilio Verify, Lookup, Messaging, Conversations
├── Conversation Relay (AI agent + call handling)
├── Flex (contact center), Studio (IVR)
├── Conversational Intelligence (recording analysis)
└── SendGrid (email)
```

## Setup

### Prerequisites

- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart) with Serverless plugin
- A Twilio account with Messaging, Verify, Flex, and Conversation Relay configured
- SendGrid account for email

### Environment Variables

Create a `.env` file in `artefacts/src/`:

```bash
ACCOUNT_SID=
AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
STUDIO_FLOW_SID=
AGENT_PHONE_NUMBER=
VOICE_CALLER_ID=
MESSAGING_SERVICE_SID=
VERIFY_SERVICE_SID=
PROMO_CONTENT_SID=
PROMO_EMAIL_TEMPLATE_ID=
```

### Deploy

```bash
cd artefacts/src
twilio serverless:deploy
```

The app will be available at:
- **Dashboard:** `https://<your-domain>.twil.io/index.html`
- **Customer site:** `https://<your-domain>.twil.io/callcenter.html`

### Local Development

```bash
cd artefacts/src
twilio serverless:start
# Visit http://localhost:3000/index.html
```

### Testing

```bash
cd artefacts
npm test            # Jest unit tests
npm run test:e2e    # Playwright end-to-end tests
```

## Project Structure

```
artefacts/
├── src/
│   ├── assets/          # Frontend HTML, JS, CSS, images
│   │   ├── brands/      # Branding configurations
│   │   └── scenarios/   # Demo event sequence data
│   ├── functions/       # 17 Twilio serverless functions
│   └── .env             # Environment config (not committed)
├── docs/
│   ├── demo-scripts.md  # Detailed presenter guide
│   └── segment-handover.md
├── scripts/             # Test shell scripts for each scenario
└── test-results/        # Playwright screenshot results
```

## Key Value Propositions

1. **Untrackable mass communications** → fully attributed, channel-aware outreach
2. **Slow time-sensitive updates** → instant multi-touch escalation with fallback
3. **25% of call time on basic info gathering** → instant identity resolution + AI context
