# SFBLI Segment Demo — Handover Document

This document describes everything that was mocked in the Twilio Segment UI for the SFBLI demo. The goal is to replicate this configuration in a live Segment instance as a backup demo environment. The live instance does not need working connections or live data pipelines — it just needs the structure, profiles, traits, audiences, and journeys defined so it looks realistic.

---

## 1. Workspace

| Field | Value |
|-------|-------|
| Workspace Name | **SFBLI** |
| Workspace Avatar | **S** |
| Default Space | `default` |

---

## 2. Sources

### Source 1: SFBLI Data Warehouse

| Field | Value |
|-------|-------|
| Name | SFBLI Data Warehouse |
| Type | Warehouse Import |
| Status | Connected |
| Events (24h) | 12,847 |
| Last sync | 2 min ago |
| Objects | 14 attributes, 9 events |

**Attributes (schema tags):**
- `agent_id`
- `email`
- `phone`
- `license_state`
- `region`
- `policies_sold_ytd`
- `sales_target_ytd`
- `target_attainment`
- `region_rank`
- `avg_policy_value`
- `book_of_business`
- `tenure_years`
- `appointment_status`
- `last_contacted`
- `preferred_channel`

**Events (schema tags):**
- `policy_app_submitted`
- `policy_issued`
- `underwriting_status_change`
- `underwriting_class_change`
- `email_delivered`
- `email_opened`
- `sms_delivered`
- `sms_opened`
- `sms_reply`

### Source 2: sfbli.com

| Field | Value |
|-------|-------|
| Name | sfbli.com |
| Type | Javascript |
| Status | Connected |
| Events (24h) | 3,421 |
| Last event | Just now |
| Category | Web analytics |

This source tracks website behavioral events (page views, form interactions, session events). No explicit schema tags were shown — it inherits standard JS source event types.

---

## 3. Destinations

### Destination: Send Interaction (PH Demo Space)

| Field | Value |
|-------|-------|
| Name | Send Interaction |
| Space | PH Demo Space |
| Status | Enabled |

This is the only destination configured. It appears in:
- The Audience wizard Step 3 (Select Destinations) as a pre-selected card
- Audience detail views showing "1 Connected Destination"
- Journey canvas as the action node ("Send via preferred channel")

---

## 4. Sidebar Navigation Structure

The Segment mock uses this sidebar layout:

```
Guided Setup
Home
Connections
  ├── Sources
  ├── Destinations
  └── Catalog
Privacy
Protocols
Unify
  ├── Profile explorer
  ├── Profiles Sync
  ├── Profiles Insights
  ├── Data Graph
  ├── Traits
  └── Unify settings
Engage
  ├── Audiences
  ├── Journeys
  └── Engage settings
Settings
```

Only **Sources**, **Profile Explorer**, **Home** (Events view), **Audiences**, and **Journeys** are functional views. All others show a placeholder when clicked.

---

## 5. Profiles

There are 16 profiles total: 6 Agents and 10 Customers.

### 5a. Agent Profiles

| ID | Name | Email | Phone | Region | Status | Engagement Score | Agent ID | License State | Last Contacted | Policies Sold YTD | Sales Target YTD | Target Attainment | Region Rank | Avg Policy Value | Book of Business | Tenure Years | Appointment Status | Preferred Channel |
|----|------|-------|-------|--------|--------|-----------------|----------|---------------|----------------|-------------------|------------------|-------------------|-------------|-----------------|-----------------|-------------|-------------------|-------------------|
| usr_001 | Paul Heath | pheath@twilio.com | +13125689550 | Southeast | At Risk | 45 | AGT-2847 | FL | 14 days ago | 18 | 40 | 65% | 5 of 15 | $4,200 | $1.2M | 3 | Active | rcs_sms |
| usr_002 | Carter Howard | cahoward@twilio.com | +14073047101 | West | Active | 89 | AGT-1923 | CA | 2 days ago | 34 | 40 | 85% | 3 of 22 | $6,800 | $3.8M | 7 | Active | rcs_sms |
| usr_003 | James Okafor | james.okafor@example.com | +1 (678) 555-0183 | Southeast | Active | 76 | AGT-3301 | GA | 5 days ago | 27 | 35 | 77% | 6 of 15 | $3,900 | $2.1M | 5 | Active | email |
| usr_004 | Emily Watson | emily.watson@example.com | +1 (214) 555-0321 | Central | Inactive | 23 | AGT-3102 | TX | 32 days ago | 4 | 30 | 13% | 18 of 18 | $2,100 | $420K | 1 | Under Review | sms |
| usr_005 | Roberto Mendez | roberto.mendez@example.com | +1 (305) 555-0456 | Southeast | Active | 91 | AGT-2890 | FL | 1 day ago | 42 | 40 | 105% | 1 of 15 | $7,500 | $5.4M | 10 | Active | email |
| usr_006 | Linda Park | linda.park@example.com | +1 (773) 555-0199 | Midwest | At Risk | 38 | AGT-4010 | IL | 21 days ago | 9 | 30 | 30% | 11 of 12 | $3,100 | $890K | 2 | Active | sms |

### 5b. Customer Profiles

| ID | Name | Email | Phone | Region | Status | Policy Type | Policy Number | Premium | Coverage | Claim Count | Customer Since | Renewal Date | Risk Score | Preferred Channel |
|----|------|-------|-------|--------|--------|-------------|---------------|---------|----------|-------------|----------------|-------------|------------|-------------------|
| cust_001 | Maria Santos | pheath@twilio.com | +13125689550 | Southeast | Active | Homeowners | POLICY01 | $2,400/yr | $350,000 | 0 | 2021 | 2026-08-15 | Low | email |
| cust_002 | David Chen | david.chen@outlook.com | +1 (415) 555-0298 | West | Active | Auto | AU-2023-15672 | $1,800/yr | $100,000 | 1 | 2019 | 2026-05-01 | Medium | rcs_sms |
| cust_003 | Sarah Johnson | sarah.j@yahoo.com | +1 (214) 555-0834 | Central | Active | Homeowners | HO-2022-29104 | $3,100/yr | $475,000 | 2 | 2018 | 2026-11-20 | Medium | sms |
| cust_004 | Marcus Rivera | marcus.rivera@gmail.com | +1 (786) 555-0445 | Southeast | Active | Auto | AU-2024-33218 | $1,200/yr | $75,000 | 0 | 2023 | 2026-07-10 | Low | rcs_sms |
| cust_005 | Jennifer Kim | jen.kim@icloud.com | +1 (312) 555-0167 | Midwest | At Risk | Renters | RE-2023-41057 | $600/yr | $30,000 | 0 | 2022 | 2026-04-01 | High | email |
| cust_006 | Thomas Wright | tom.wright@hotmail.com | +1 (678) 555-0523 | Southeast | Active | Homeowners | HO-2021-18945 | $4,200/yr | $620,000 | 1 | 2017 | 2026-09-30 | Low | sms |
| cust_007 | Amanda Foster | pheath@twilio.com | +13125689550 | Southeast | Active | Auto | POLICY02 | $2,100/yr | $150,000 | 3 | 2020 | 2026-06-15 | High | rcs_sms |
| cust_008 | Robert Patel | r.patel@gmail.com | +1 (713) 555-0334 | Central | Active | Life | LF-2020-09821 | $5,400/yr | $500,000 | 0 | 2016 | 2026-12-01 | Low | email |
| cust_009 | Lisa Nguyen | lisa.nguyen@outlook.com | +1 (510) 555-0776 | West | Active | Homeowners | HO-2023-52314 | $3,800/yr | $550,000 | 1 | 2019 | 2026-10-15 | Medium | sms |
| cust_010 | James Morrison | j.morrison@gmail.com | +1 (954) 555-0612 | Southeast | Active | Auto | AU-2024-44729 | $1,500/yr | $100,000 | 0 | 2024 | 2027-01-20 | Low | rcs_sms |

---

## 6. Traits

### Agent Traits

| Trait Key | Type | Example Values |
|-----------|------|----------------|
| agent_id | String | AGT-2847, AGT-1923 |
| email | String | pheath@twilio.com |
| phone | String | +13125689550 |
| region | String | Southeast, West, Central, Midwest |
| license_state | String | FL, CA, GA, TX, IL |
| status | String | Active, At Risk, Inactive |
| engagement_score | Number | 23–91 |
| appointment_status | String | Active, Under Review |
| last_contacted | String | 1 day ago, 14 days ago, 32 days ago |
| policies_sold_ytd | Number | 4–42 |
| sales_target_ytd | Number | 30–40 |
| target_attainment | Percentage String | 13%–105% |
| region_rank | Rank String | 1 of 15, 18 of 18 |
| avg_policy_value | Currency String | $2,100–$7,500 |
| book_of_business | Currency String | $420K–$5.4M |
| tenure_years | Number | 1–10 |
| preferred_channel | String | rcs_sms, email, sms |

### Customer Traits

| Trait Key | Type | Example Values |
|-----------|------|----------------|
| email | String | pheath@twilio.com |
| phone | String | +13125689550 |
| region | String | Southeast, West, Central, Midwest |
| status | String | Active, At Risk |
| policy_type | String | Homeowners, Auto, Renters, Life |
| policy_number | String | POLICY01, AU-2023-15672 |
| premium_amount | Currency String | $600/yr–$5,400/yr |
| coverage_amount | Currency String | $30,000–$620,000 |
| claim_count | Number | 0–3 |
| customer_since | Year String | 2016–2024 |
| renewal_date | Date String | 2026-04-01 – 2027-01-20 |
| risk_score | String | Low, Medium, High |
| preferred_channel | String | rcs_sms, email, sms |

### Profile Identity Resolution

Each profile also has these identity fields shown in the **Identities** tab:
- `anonymous_id` — randomly generated `ajs_*` value
- `user_id` — the profile's customer_id
- `email`
- `phone`

---

## 7. Events

### Historical Events (shown on profile Events tab)

These appear immediately when opening a profile's Events tab:

| Event Name | Timestamp |
|------------|-----------|
| email_opened | 1 hour ago |
| sms_delivered | 2 hours ago |
| policy_app_submitted | 3 days ago |
| underwriting_status_change | 5 days ago |

### Live Events (animated in on profile Events tab)

These animate in sequentially to simulate real-time activity:

| Event Name | Delay | Notes |
|------------|-------|-------|
| page_view | 1.5s | |
| form_start | 3.5s | |
| form_abandon | 6.0s | Warning styling, enables outreach buttons |

### Scenario Events (main event stream)

The default "Website Abandon" scenario plays these events:

| Event Type | Label | Delay |
|------------|-------|-------|
| email_delivered | Email Delivered: Policy Renewal Reminder | 0ms |
| email_opened | Email Opened: Policy Renewal Reminder | 1500ms |
| page_view | Viewed Auto Insurance Page | 3000ms |
| page_view | Viewed Get Quote | 4500ms |
| form_start | Started Quote Form | 6000ms |
| form_field | Entered Vehicle Type | 7500ms |
| form_abandon | Abandoned Quote Form | 9500ms |
| session_end | Session Ended (Abandoned) | 11000ms |

**Profile updates after scenario completes:**
- Status: "At Risk"
- Engagement Score: 72 → 45
- Predicted Churn: "High"

### Automated Event (Journey trigger)

| Event Name | Delay | Condition |
|------------|-------|-----------|
| promotion_sent | 8.0s after Events tab opens | Only if profile qualifies for an audience with an active journey |

---

## 8. Audiences

Audiences are created dynamically during the demo via a 4-step wizard. They are not pre-configured — the presenter builds them live. Here is the intended demo audience:

### Demo Audience: "Cross-Sell" (or similar name)

| Field | Value |
|-------|-------|
| Type | Profiles |
| Condition | `target_attainment` greater than `60` |
| Destination | Send Interaction (PH Demo Space) |
| Status | Enabled |

**Expected Members (4 of 6 agents):**

| Profile | target_attainment | Why Included |
|---------|-------------------|-------------|
| Paul Heath (usr_001) | 65% | > 60 |
| Carter Howard (usr_002) | 85% | > 60 |
| James Okafor (usr_003) | 77% | > 60 |
| Roberto Mendez (usr_005) | 105% | > 60 |

**Excluded:**
- Emily Watson (usr_004) — 13%
- Linda Park (usr_006) — 30%

Note: Customer profiles do not have the `target_attainment` trait, so they are excluded from this audience.

### Audience Wizard Steps

1. **Select Type** — Choose "Profiles" (Computed Traits and SQL are shown but grayed out)
2. **Configure** — Build condition using trait dropdown, operator, and value. Live preview shows matching profiles.
3. **Destinations** — "Send Interaction (PH Demo Space)" is pre-selected
4. **Review & Create** — Enter name, description, auto-generated key, confirm audience size

### Audience Detail View

After creation, shows:
- Users in Audience: (computed count)
- Connected Destinations: 1
- Status: Enabled
- Identifier Breakdown: email 100%, phone 100%, user_id 100%
- Audience Explorer: searchable table of matching profiles

### Available Traits for Audience Conditions

These traits are available in the condition builder dropdown:
- `target_attainment`
- `engagement_score`
- `policies_sold_ytd`
- `sales_target_ytd`
- `tenure_years`
- `avg_policy_value`
- `book_of_business`

Operators: `greater than`, `less than`, `equals`

---

## 9. Journeys

Journeys are also created dynamically during the demo. Here is the intended demo journey:

### Demo Journey: "Promotional Outreach" (or similar name)

| Field | Value |
|-------|-------|
| Trigger | Profile enters an audience |
| Entry Audience | (the audience created in step 8) |
| Entry Frequency | One time |
| Destination | Send Interaction |
| Action | Send via preferred channel |
| Status | Draft |

### Journey Wizard Steps

1. **Select Trigger** — Choose "Profile enters an audience" (the "Profile performs an event" option is dimmed)
2. **Set Up** — Enter name, description, select entry audience from dropdown (populated from created audiences), entry frequency "One time"
3. **Build** — Static canvas showing: Trigger node → Arrow → Destination node ("Send Interaction / Send via preferred channel"). Widget sidebar with decorative flow controls (Delay, Hold until, Data split, Randomized split, Send to destination) — all non-functional

### Journey Trigger Behavior

When a journey exists targeting an audience a profile belongs to:
1. User opens the qualifying profile's **Events** tab
2. Historical and live events play as normal
3. After ~8 seconds, a `promotion_sent` event animates in
4. The system checks the profile's `preferred_channel`:
   - `rcs_sms` → sends RCS/SMS via existing `/send-rcs` endpoint
   - `email` → sends email via existing `/send-email` endpoint
   - `sms` → sends SMS via existing `/send-rcs` endpoint
5. The outreach message appears in the right-hand Conversation pane

---

## 10. Profile Detail Tabs

When clicking a profile in the Profile Explorer, the detail view has 5 tabs:

| Tab | Content |
|-----|---------|
| **Traits** | Key-value table of all profile traits (different fields for Agent vs Customer) |
| **Events** | Historical events + animated live events + optional `promotion_sent` |
| **Audiences** | Tags showing which audiences the profile belongs to (dynamically computed) |
| **Journeys** | Tags showing which journeys the profile qualifies for (dynamically computed) |
| **Identities** | anonymous_id, user_id, email, phone |

---

## 11. Event Stream (Home View)

The Home / Events view in the center panel shows a real-time event stream driven by the scenario configuration. Events appear chronologically with:
- Event icon (type-specific)
- Event label
- Event type metadata
- Warning styling for `form_abandon` and `session_end` events

The right panel shows:
- **Agent profile card** with editable fields (name, phone, email, region, engagement score, status)
- **Outreach controls** (Send RCS/SMS, Send Email, Trigger Voice Call) — disabled until form_abandon event
- **Conversation view** showing all channel activity

---

## 12. Summary for Live Segment Setup

To replicate this in a live Segment instance, your colleague should:

1. **Create the workspace** named "SFBLI"
2. **Add 2 Sources:**
   - "SFBLI Data Warehouse" (Warehouse type) with the 15 attributes and 9 events listed above
   - "sfbli.com" (JavaScript source)
3. **Add 1 Destination:**
   - "Send Interaction" in a space called "PH Demo Space"
4. **Create 16 profiles** (6 agents + 10 customers) with all traits as specified in Section 5
5. **Pre-build 1 Audience** (optional — can also be created live):
   - Name: "Cross-Sell" or similar
   - Condition: `target_attainment > 60`
   - Destination: Send Interaction
6. **Pre-build 1 Journey** (optional — can also be created live):
   - Trigger: Profile enters the Cross-Sell audience
   - Action: Send to destination (Send Interaction)
7. **Verify** the Profile Explorer shows all 16 profiles with correct traits, and that the Audience shows the expected 4 members
