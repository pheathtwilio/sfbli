# Audiences & Journeys Scenario — Design Spec

## Overview

Add Audiences and Journeys functionality under the Engage sidebar section, enabling a live demo flow where the user:
1. Creates an audience of agents matching a trait condition (e.g., `target_attainment > 60%`)
2. Creates a journey triggered by audience entry that sends promotions via the agent's preferred channel
3. Views the audience membership on a profile's Audiences tab
4. Sees a `promotion_sent` event animate on the Events tab, which triggers a real RCS/SMS or email send

Everything resets on page refresh so the demo can be repeated.

## Data Model Changes

### Profile Updates

**Paul Heath (usr_001):**
- `target_attainment`: `'45%'` → `'65%'`
- `region_rank`: `'12 of 15'` → `'5 of 15'`

**New trait on all profiles — `preferred_channel`:**
| Profile | preferred_channel |
|---|---|
| Paul Heath | `rcs_sms` |
| Carter Howard | `rcs_sms` |
| James Okafor | `email` |
| Emily Watson | `sms` |
| Roberto Mendez | `email` |
| Linda Park | `sms` |

Add `preferred_channel` to:
- Sources card schema tags in `index.html`
- Traits table rendering in `renderProfileTab('traits', ...)`

### New State Fields

```javascript
state.audiences = [];      // { name, key, description, conditions, destination, members }
state.journeys = [];       // { name, description, audience_key, trigger, destination, status }
state.activeWizard = null; // 'audience' | 'journey' | null
state.wizardStep = 0;      // Current step in active wizard
```

All state resets on page refresh (in-memory only, no persistence).

### Audience Computation

When the user adds a condition in the audience builder (e.g., `target_attainment > 60`), filter `MOCK_PROFILES` client-side:
- Parse numeric values from string traits (strip `%`, `$`, `K`, `M` suffixes, handle `X of Y` format for `region_rank`)
- Apply operator (`greater than`, `less than`, `equals`)
- Store matching profile IDs in `audience.members`

With current data and `target_attainment > 60`, 4 of 6 profiles match:
- Paul Heath (65%), Carter Howard (85%), James Okafor (77%), Roberto Mendez (105%)

## Sidebar Changes

Replace the single "Engage" item with an expandable section:

```
Engage (expandable section)
  ├── Audiences   → view-audiences
  ├── Journeys    → view-journeys
  └── Engage settings → placeholder
```

Remove the `'engage': 'view-events'` mapping from `viewMap`. Add:
```javascript
'audiences': 'view-audiences',
'journeys': 'view-journeys'
```

The sidebar HTML follows the same pattern as Connections and Unify sections.

## Audiences View

### List Page (`#view-audiences`)

**Empty state (before any audience created):**
- Breadcrumb: `Spaces / default / Audiences`
- Tabs: Audiences (active), Profiles Explorer
- AI promo banner (decorative, static)
- Search input + `+ New audience` button
- Table with columns: Name, Status, Audience Size, Destinations
- Empty row: "You don't have any audiences or folders yet."

**Populated state (after audience created):**
- Table shows created audience row with name (clickable), status ("Enabled"), audience size (computed count), destination name

**Clicking an audience name** opens the Audience Detail view.

### Audience Wizard (4 Steps)

Wizard replaces the list view in the center panel (full-page, not a modal). Step indicator at top with progress bar.

**Step 1 — Select Audience Type:**
- Three cards: Profiles audience (selectable), Product Based audience (grayed out), Linked audience (grayed out)
- Only Profiles audience is clickable
- Next button advances to Step 2

**Step 2 — Build (Configure and Preview):**
- Condition builder: "All users who [have a trait] [trait dropdown] [operator] [value]"
- Trait dropdown populated from MOCK_PROFILES keys: `target_attainment`, `engagement_score`, `policies_sold_ytd`, `sales_target_ytd`, `tenure_years`, `region_rank`, `avg_policy_value`
- Operator dropdown: `greater than`, `less than`, `equals`
- Value input field (numeric)
- "And who..." section with `+ Add condition` (functional but optional)
- Right panel: live preview showing match count and list of matching profile names with their values
- Preview updates in real-time as conditions change
- Next button enabled only when at least one condition is added
- Decorative elements (Include Anonymous Users, historical event data checkboxes) visible but non-functional

**Step 3 — Select Destinations:**
- Search input (decorative)
- Single destination card: "Send Interaction (PH Demo Space)" with "Enabled" status
- Card is pre-selected (highlighted border)
- Next button advances to Step 4

**Step 4 — Review & Create:**
- Audience Name input (user types freely, e.g., "Cross-Sell")
- Audiences key auto-generated from name (e.g., `cross_sell`)
- Description textarea (user types freely)
- Add to Folder input (decorative, disabled)
- Right panel: Audience Size (computed count), "Who's in the audience" text, Destinations summary
- "Create Audience" button finalizes — pushes to `state.audiences`, returns to detail view

### Audience Detail View

Shown after "Create Audience" is clicked:
- Breadcrumb: `Spaces / default / Audiences / [Audience Name]`
- Tabs: Overview (active), Builder, Consumers, Settings, Alerts (only Overview functional)
- Enable Audience toggle (decorative, shown as enabled)
- Audience stats: Users in Audience (computed count), Connected Destinations (1), Status (Enabled)
- Identifier Breakdown: email 100%, phone 100%, user_id 100%
- Destinations: Send Interaction card with Enabled status
- Audience Explorer: searchable table of matching profiles (Name, Email, First Activity, Last Activity)

## Journeys View

### List Page (`#view-journeys`)

**Empty state:**
- Breadcrumb: `Spaces / default / Journeys`
- Journeys docs + Example use-cases links (decorative)
- Tabs: All (active), Published, Drafts, Archived
- Search input + `+ Create journey` button
- Empty state with icon and "Create journeys" text + `+ Create journey` button

**Populated state:**
- Table shows created journey with columns: Name, Status ("Draft"), Destinations, Created By ("Paul Heath"), Last Modified ("Just now")

### Journey Wizard (3 Steps)

Full-page wizard replacing the list view. Step indicator at top.

**Step 1 — Select Trigger:**
- Two options: "Profile performs an event" (dimmed/unselectable), "Profile enters an audience" (selectable, pre-selected)
- Right panel: description of selected trigger type
- Next button advances

**Step 2 — Set Up:**
- Name input (free-form, user enters journey name)
- Description textarea (free-form)
- Entry audience dropdown (populated from `state.audiences` — shows created audiences)
- Include anonymous profiles checkbox (decorative, disabled)
- Entry frequency: "One time" (selected), "Re-enter after exiting" (dimmed)
- "Build journey" button advances to Step 3

**Step 3 — Build (Static Canvas):**
- Left panel: widget sidebar with Flow control (Delay, Hold until, Data split, Randomized split) and Actions (Send to destination) — all decorative, non-draggable
- Center canvas: static flow diagram showing:
  - Trigger node: `new_promotion_published` / "When profile enters [audience name]"
  - Arrow connector
  - Destination node: "Send Interaction" / "Send via preferred channel"
- "Save" button finalizes — pushes to `state.journeys`, returns to journeys list

## Profile Detail Integration

### Audiences Tab

**Before any audience created:** "No audiences yet" empty state.

**After audience created:** Dynamically checks `state.audiences` — for each audience, if the current profile's ID is in `audience.members`, show it as a tag. Only audiences the profile qualifies for appear.

Replaces the current hardcoded tags (High Value Customers, Southeast Region, Churn Risk, Cross-sell Eligible).

### Journeys Tab

**Before any journey created:** "No journeys yet" empty state.

**After journey created:** Dynamically checks `state.journeys` — for each journey, resolve the linked audience from `state.audiences`, check if the current profile is a member. Show matching journeys as tags.

Replaces the current hardcoded tags (Onboarding Complete, Re-engagement Campaign, Policy Renewal).

### Events Tab — Automated Outreach Trigger

When a journey exists that targets an audience the current profile belongs to:

1. User opens Events tab on a qualifying profile
2. Historical events appear immediately (existing behavior)
3. Existing live events animate in (page_view → form_start → form_abandon) as they do now
4. After form_abandon (~6s), a `promotion_sent` event animates in (~8s delay)
5. `promotion_sent` triggers:
   - Check `profile.preferred_channel`
   - If `rcs_sms`: call existing `send-rcs` function with promotional RCS/SMS template
   - If `email`: call existing `send-email` function with promotional email template
   - Message appears in right-hand Conversation pane
   - Outreach buttons become enabled (already happens from form_abandon)

Templates for both channels will be provided separately by the user.

### Events Tab — Non-qualifying Profiles

If the current profile is NOT a member of any audience with a journey, the Events tab behaves exactly as it does today (page_view → form_start → form_abandon only, no promotion_sent).

## Views and Routing Summary

| Sidebar Item | View ID | Content |
|---|---|---|
| Audiences | `view-audiences` | List + wizard + detail (all in same view, swapped via JS) |
| Journeys | `view-journeys` | List + wizard (all in same view, swapped via JS) |

Each view manages its own sub-views internally (list ↔ wizard ↔ detail) without adding new entries to `viewMap`.

## Reset Behavior

On page refresh:
- `state.audiences` and `state.journeys` clear (in-memory)
- Audiences and Journeys list views revert to empty states
- Profile Audiences/Journeys tabs revert to empty states
- No `promotion_sent` events fire until audiences and journeys are recreated
- Existing clear-messages call on init clears the Conversation pane

## Testing

### Playwright E2E Tests

New test suites:

**Audiences:**
- Audiences list shows empty state on load
- `+ New audience` opens wizard
- Wizard step navigation (Next/Back)
- Selecting Profiles audience type enables Next
- Adding a condition shows preview with correct match count
- Completing wizard creates audience in list
- Audience detail shows correct member count
- Creating audience updates profile Audiences tab

**Journeys:**
- Journeys list shows empty state on load
- `+ Create journey` opens wizard
- Selecting "Profile enters an audience" enables Next
- Entry audience dropdown populated from created audiences
- Completing wizard creates journey in list with user-entered name
- Journey list shows correct name, status, destination

**End-to-end scenario:**
- Create audience → create journey → navigate to qualifying profile → Events tab → promotion_sent appears → outreach fires
- Non-qualifying profile does NOT show promotion_sent
- Page refresh clears all state — audiences and journeys lists empty again

### Unit Tests

No new Twilio Functions needed — the automation uses existing `send-rcs` and `send-email` endpoints. Existing unit tests cover those.

## Files Modified

- `src/assets/app.js` — bulk of changes (state, wizards, audience computation, profile tab updates, automation trigger)
- `src/assets/index.html` — Engage sidebar section, new view sections (`#view-audiences`, `#view-journeys`), Sources schema tags update
- `src/assets/style.css` — wizard styles, step indicator, condition builder, canvas, audience detail
- `src/test/e2e/dashboard.spec.js` — new test suites for audiences, journeys, and end-to-end scenario

## Out of Scope

- Drag-and-drop journey builder canvas (static display only)
- Widget panel functionality (decorative only)
- Multiple conditions with AND/OR logic (single condition sufficient for demo)
- Audience tabs beyond Overview (Builder, Consumers, Settings, Alerts are tab labels only)
- Journey status transitions (Draft → Published — stays as Draft for demo)
- Customer profile type (mentioned as future scenario, not part of this spec)
