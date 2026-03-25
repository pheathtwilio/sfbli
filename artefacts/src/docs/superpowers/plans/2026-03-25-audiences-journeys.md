# Audiences & Journeys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive Audiences and Journeys wizards under Engage, with automated promotional outreach triggered by audience/journey creation.

**Architecture:** All state is client-side in-memory JS. Wizards render as sub-views within `#view-audiences` and `#view-journeys`, swapped via class toggling. Audience computation filters MOCK_PROFILES client-side. The `promotion_sent` event reuses existing `send-rcs`/`send-email` endpoints.

**Tech Stack:** Vanilla JS, HTML, CSS (existing stack), Playwright for E2E tests.

**Spec:** `docs/superpowers/specs/2026-03-25-audiences-journeys-design.md`

---

### Task 1: Update Profile Data & State

**Files:**
- Modify: `src/assets/app.js:599-606` (MOCK_PROFILES)
- Modify: `src/assets/app.js:13-23` (state object)
- Modify: `src/assets/app.js:676-700` (renderProfileTab traits)
- Modify: `src/assets/index.html:114-143` (Sources schema tags)
- Test: `src/test/e2e/dashboard.spec.js`

- [ ] **Step 1: Update Paul Heath profile data**

In `app.js` MOCK_PROFILES, change usr_001:
- `target_attainment: '45%'` → `target_attainment: '65%'`
- `region_rank: '12 of 15'` → `region_rank: '5 of 15'`

- [ ] **Step 2: Add preferred_channel to all profiles**

Add `preferred_channel` field to each profile in MOCK_PROFILES:
- usr_001 (Paul Heath): `preferred_channel: 'rcs_sms'`
- usr_002 (Carter Howard): `preferred_channel: 'rcs_sms'`
- usr_003 (James Okafor): `preferred_channel: 'email'`
- usr_004 (Emily Watson): `preferred_channel: 'sms'`
- usr_005 (Roberto Mendez): `preferred_channel: 'email'`
- usr_006 (Linda Park): `preferred_channel: 'sms'`

- [ ] **Step 3: Add new state fields**

In the `state` object at top of app.js, add:
```javascript
audiences: [],
journeys: [],
activeWizard: null,
wizardStep: 0
```

- [ ] **Step 4: Add preferred_channel to traits table**

In `renderProfileTab` traits section, add `'preferred_channel': profile.preferred_channel` to the traits object.

- [ ] **Step 5: Add preferred_channel to Sources schema tags**

In `index.html`, add `<span class="schema-tag">preferred_channel</span>` to the Attributes section of the SFBLI Data Warehouse source card.

- [ ] **Step 6: Run existing tests**

Run: `npx playwright test --reporter=line`
Expected: All 9 existing tests pass. The sidebar test checking for 2 section headers will need updating in Task 2 (Engage becomes a section).

- [ ] **Step 7: Commit**

```bash
git add src/assets/app.js src/assets/index.html
git commit -m "feat: update profile data, add preferred_channel trait and audience/journey state"
```

---

### Task 2: Sidebar — Engage Expandable Section

**Files:**
- Modify: `src/assets/index.html:69-72` (Engage sidebar item)
- Modify: `src/assets/app.js:527-532` (viewMap)
- Modify: `src/test/e2e/dashboard.spec.js:14` (sidebar section count)

- [ ] **Step 1: Replace Engage sidebar item with expandable section**

In `index.html`, replace the single `<li class="sidebar-item" data-view="engage">` block (lines 69-72) with an expandable section matching the Connections/Unify pattern:

```html
<li class="sidebar-section">
  <div class="sidebar-section-header" data-section="engage">
    <span class="sidebar-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 2H2v9h4l2 2 2-2h4V2zm-3 6H5V7h6v1zm0-3H5V4h6v1z"/></svg></span>
    <span class="sidebar-section-label">Engage</span>
    <span class="sidebar-chevron">&#9662;</span>
  </div>
  <ul class="sidebar-subnav open">
    <li class="sidebar-subitem" data-view="audiences">Audiences</li>
    <li class="sidebar-subitem" data-view="journeys">Journeys</li>
    <li class="sidebar-subitem" data-view="engage-settings">Engage settings</li>
  </ul>
</li>
```

- [ ] **Step 2: Update viewMap**

In `app.js`, update `viewMap`:
- Remove: `'engage': 'view-events'`
- Add: `'audiences': 'view-audiences'`
- Add: `'journeys': 'view-journeys'`

- [ ] **Step 3: Update sidebar test**

In `dashboard.spec.js`, update the sidebar section count test from `toHaveCount(2)` to `toHaveCount(3)` since Engage is now a third expandable section.

- [ ] **Step 4: Run tests**

Run: `npx playwright test --reporter=line`
Expected: Tests pass (Audiences/Journeys views don't exist yet but sidebar navigation won't crash — switchView falls through to placeholder).

- [ ] **Step 5: Commit**

```bash
git add src/assets/index.html src/assets/app.js src/test/e2e/dashboard.spec.js
git commit -m "feat: convert Engage to expandable sidebar section with Audiences/Journeys"
```

---

### Task 3: Audiences & Journeys HTML Scaffolding

**Files:**
- Modify: `src/assets/index.html` (add view sections before `#view-events`)

- [ ] **Step 1: Add `#view-audiences` section**

Add after the `#view-profile-explorer` closing `</section>` and before `#view-events`:

```html
<!-- Audiences View -->
<section class="view-panel hidden" id="view-audiences">
  <!-- Audiences List (default sub-view) -->
  <div id="audiences-list-container">
    <div class="wizard-breadcrumb">Spaces / default / <strong>Audiences</strong></div>
    <div class="view-tabs">
      <span class="view-tab active">Audiences</span>
      <span class="view-tab">Profiles Explorer</span>
    </div>
    <div class="view-header">
      <h1>Audiences</h1>
    </div>
    <div class="audiences-promo">
      <div class="audiences-promo-text">
        <div class="audiences-promo-title">Introducing Product Recommendations, powered by AI</div>
        <p>Harness the power of AI to build an audience that is the most likely to purchase a certain product.</p>
        <button class="btn btn-sm btn-outline" disabled>Build a Product Based Audience</button>
      </div>
    </div>
    <div class="audiences-toolbar">
      <button class="btn btn-sm btn-outline" disabled>Predictive Audiences</button>
      <div class="audiences-toolbar-right">
        <input type="text" class="search-input" placeholder="Search audiences by name..." disabled>
        <button class="btn btn-primary btn-sm" id="btn-new-audience">+ New audience</button>
      </div>
    </div>
    <table class="data-table" id="audiences-table">
      <thead>
        <tr><th>Name</th><th>Status</th><th>Audience Size</th><th>Destinations</th></tr>
      </thead>
      <tbody id="audiences-table-body">
        <tr class="empty-row"><td colspan="4">You don't have any audiences or folders yet.</td></tr>
      </tbody>
    </table>
  </div>
  <!-- Audience Wizard (hidden until activated) -->
  <div id="audience-wizard" class="hidden"></div>
  <!-- Audience Detail (hidden until audience clicked) -->
  <div id="audience-detail" class="hidden"></div>
</section>
```

- [ ] **Step 2: Add `#view-journeys` section**

Add after `#view-audiences`:

```html
<!-- Journeys View -->
<section class="view-panel hidden" id="view-journeys">
  <!-- Journeys List -->
  <div id="journeys-list-container">
    <div class="wizard-breadcrumb">Spaces / default / <strong>Journeys</strong></div>
    <div class="view-header">
      <h1>Journeys</h1>
      <div class="view-header-links">
        <span class="header-link">Journeys docs</span>
        <span class="header-link">Example use-cases</span>
      </div>
    </div>
    <div class="journeys-tabs">
      <span class="view-tab active">All</span>
      <span class="view-tab">Published</span>
      <span class="view-tab">Drafts</span>
      <span class="view-tab">Archived</span>
    </div>
    <div class="audiences-toolbar">
      <div class="audiences-toolbar-right" style="margin-left:auto;">
        <input type="text" class="search-input" placeholder="Filter journeys by name..." disabled>
        <button class="btn btn-primary btn-sm" id="btn-new-journey">+ Create journey</button>
      </div>
    </div>
    <table class="data-table" id="journeys-table">
      <thead>
        <tr><th>Name</th><th>Status</th><th>Destinations</th><th>Created By</th><th>Last Modified</th></tr>
      </thead>
      <tbody id="journeys-table-body">
        <tr class="empty-row"><td colspan="5">
          <div class="empty-state-icon">&#128736;</div>
          <div class="empty-state-title">Create journeys</div>
          <p class="empty-state-text">Unify your customer experience across your marketing stack to build multi-step, outcomes-based journeys.</p>
          <button class="btn btn-primary btn-sm btn-new-journey-inline">+ Create journey</button>
        </td></tr>
      </tbody>
    </table>
  </div>
  <!-- Journey Wizard (hidden until activated) -->
  <div id="journey-wizard" class="hidden"></div>
</section>
```

- [ ] **Step 3: Verify views render**

Run: `npx playwright test --reporter=line`
Expected: All tests pass. The new views are hidden by default.

- [ ] **Step 4: Commit**

```bash
git add src/assets/index.html
git commit -m "feat: add Audiences and Journeys view HTML scaffolding"
```

---

### Task 4: Wizard & Audiences CSS

**Files:**
- Modify: `src/assets/style.css` (append new sections)

- [ ] **Step 1: Add wizard shared styles**

Append to `style.css`:

```css
/* ===== WIZARD SHARED ===== */
.wizard-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--brand-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wizard-title { font-size: 15px; font-weight: 500; color: var(--brand-text); }

.wizard-steps {
  display: flex;
  gap: 24px;
  font-size: 13px;
}

.wizard-step { color: #9ca3af; display: flex; align-items: center; gap: 4px; }
.wizard-step.active { color: #6c5ce7; font-weight: 600; }
.wizard-step.done { color: #10b981; }

.wizard-step-num {
  width: 18px; height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  background: #e5e7eb;
  color: #6b7280;
}

.wizard-step.active .wizard-step-num { background: #6c5ce7; color: #fff; }

.wizard-cancel { font-size: 13px; color: #6b7280; cursor: pointer; }
.wizard-cancel:hover { color: var(--brand-text); }

.wizard-progress { height: 3px; background: #e5e7eb; }
.wizard-progress-bar { height: 3px; background: #6c5ce7; transition: width 0.3s ease; }

.wizard-footer {
  padding: 12px 24px;
  border-top: 1px solid var(--brand-border);
  display: flex;
  justify-content: space-between;
}

.wizard-footer-right { display: flex; gap: 8px; }

.wizard-breadcrumb {
  padding: 12px 24px;
  font-size: 13px;
  color: #6b7280;
  border-bottom: 1px solid var(--brand-border);
}

.wizard-breadcrumb strong { color: var(--brand-text); }
```

- [ ] **Step 2: Add audiences-specific styles**

```css
/* ===== AUDIENCES ===== */
.audiences-promo {
  margin: 0 0 20px;
  padding: 20px;
  border: 1px solid var(--brand-border);
  border-radius: 8px;
}

.audiences-promo-title { font-size: 16px; font-weight: 500; margin-bottom: 4px; }
.audiences-promo p { font-size: 13px; color: #6b7280; margin: 0 0 12px; }

.audiences-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.audiences-toolbar-right { display: flex; gap: 12px; align-items: center; }

.search-input {
  padding: 8px 12px;
  border: 1px solid var(--brand-border);
  border-radius: 6px;
  font-size: 13px;
  width: 220px;
}

.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left;
  padding: 10px 8px;
  font-size: 11px;
  text-transform: uppercase;
  color: #6b7280;
  font-weight: 600;
  border-bottom: 1px solid var(--brand-border);
}
.data-table td { padding: 14px 8px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
.data-table .empty-row td { text-align: center; padding: 40px; color: #9ca3af; }

.view-tabs {
  display: flex;
  gap: 24px;
  padding: 0;
  border-bottom: 1px solid var(--brand-border);
  margin-bottom: 20px;
}

.view-tab {
  padding: 12px 0;
  font-size: 14px;
  color: #6b7280;
  cursor: default;
}

.view-tab.active {
  color: #6c5ce7;
  border-bottom: 2px solid #6c5ce7;
  font-weight: 500;
}

.audience-name-link { color: #6c5ce7; font-weight: 500; cursor: pointer; }
.audience-name-link:hover { text-decoration: underline; }

.status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
.status-enabled { color: #10b981; }
.status-draft { color: #6b7280; }
```

- [ ] **Step 3: Add condition builder and preview styles**

```css
/* ===== CONDITION BUILDER ===== */
.condition-builder {
  border: 1px solid var(--brand-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.condition-row select, .condition-row input {
  padding: 6px 10px;
  border: 1px solid var(--brand-border);
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
}

.condition-row select { min-width: 140px; }
.condition-row input[type="text"],
.condition-row input[type="number"] { width: 70px; }

.add-condition { font-size: 13px; color: #6c5ce7; cursor: pointer; border: none; background: none; padding: 0; }
.add-condition:hover { text-decoration: underline; }

.audience-preview {
  width: 280px;
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--brand-border);
  flex-shrink: 0;
}

.audience-preview-count { font-size: 32px; font-weight: 700; color: #6c5ce7; margin: 12px 0 4px; }
.audience-preview-label { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
.audience-preview-list { border-top: 1px solid var(--brand-border); padding-top: 12px; }
.audience-preview-item { font-size: 13px; color: #374151; padding: 4px 0; }
.audience-preview-item span { color: #9ca3af; }
```

- [ ] **Step 4: Add audience detail and empty state styles**

```css
/* ===== AUDIENCE DETAIL ===== */
.audience-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.audience-detail-title { font-size: 22px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
.audience-detail-meta { font-size: 13px; color: #6b7280; margin-top: 4px; }
.audience-detail-meta a { color: #6c5ce7; }

.audience-stats { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
.audience-stats td { padding: 14px 12px; }
.audience-stat-value { font-size: 24px; font-weight: 700; }
.audience-stat-label { font-size: 12px; color: #6b7280; }

.destination-card {
  border: 1px solid var(--brand-border);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.destination-icon {
  width: 36px; height: 36px;
  background: #f3f4f6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

/* ===== EMPTY STATES ===== */
.empty-state-icon { font-size: 48px; opacity: 0.2; margin-bottom: 12px; }
.empty-state-title { font-size: 16px; font-weight: 500; margin-bottom: 4px; }
.empty-state-text { font-size: 13px; color: #6b7280; max-width: 480px; margin: 0 auto 12px; }
```

- [ ] **Step 5: Commit**

```bash
git add src/assets/style.css
git commit -m "feat: add wizard, audiences, condition builder, and detail CSS styles"
```

---

### Task 5: Audience Wizard JS — Core Logic

**Files:**
- Modify: `src/assets/app.js` (add after PROFILE_LIVE_EVENTS section, before renderProfileTable)

This task implements the audience wizard rendering and step navigation. The wizard renders into `#audience-wizard`.

- [ ] **Step 1: Add numeric trait parser utility**

Add a `parseTraitValue(value)` function that extracts a number from trait strings:
- `'65%'` → `65`
- `'$4,200'` → `4200`
- `'$1.2M'` → `1200000`
- `'$420K'` → `420000`
- `'5 of 15'` → `5`
- `45` (already number) → `45`

- [ ] **Step 2: Add `computeAudienceMembers(conditions)` function**

Takes an array of conditions `[{ trait, operator, value }]` and filters `MOCK_PROFILES`. For each profile, parse the trait value using `parseTraitValue`, apply the operator (`greater than`, `less than`, `equals`), return matching profiles.

- [ ] **Step 3: Add `getNumericTraitKeys()` helper**

Returns the list of trait keys suitable for audience conditions: `['target_attainment', 'engagement_score', 'policies_sold_ytd', 'sales_target_ytd', 'tenure_years', 'avg_policy_value', 'book_of_business']`.

- [ ] **Step 4: Add `renderAudienceWizard(step)` function**

Renders the current wizard step into `#audience-wizard`. Handles steps 1-4:
- Step 1: Select Type — three cards, only Profiles audience clickable
- Step 2: Build — condition builder with trait/operator/value dropdowns + live preview panel
- Step 3: Select Destinations — Send Interaction card (pre-selected)
- Step 4: Review & Create — name/description inputs + right sidebar summary

Each step includes: wizard header with step indicator, progress bar, and footer with Back/Next buttons.

- [ ] **Step 5: Add `openAudienceWizard()` and `closeAudienceWizard()` functions**

`openAudienceWizard()`: sets `state.activeWizard = 'audience'`, `state.wizardStep = 1`, hides `#audiences-list-container`, shows `#audience-wizard`, calls `renderAudienceWizard(1)`.

`closeAudienceWizard()`: resets wizard state, hides `#audience-wizard`, shows `#audiences-list-container`.

- [ ] **Step 6: Add wizard step navigation**

Wire Next/Back buttons in each step:
- Next: increment `state.wizardStep`, call `renderAudienceWizard()`
- Back: decrement, re-render
- Cancel: call `closeAudienceWizard()`
- Step 2 Next: disabled until condition is added (check `state.wizardConditions.length > 0`)
- Step 4 "Create Audience": call `createAudience()` (Task 6)

- [ ] **Step 7: Add condition builder interactivity in Step 2**

When user selects trait/operator/enters value, compute matching profiles in real-time and update the preview panel. Store conditions in a temporary `state.wizardConditions` array. The `+ Add condition` link adds another condition row.

- [ ] **Step 8: Wire `#btn-new-audience` click handler**

In `setupEventListeners()` or a new `setupAudienceListeners()`, add click handler on `#btn-new-audience` that calls `openAudienceWizard()`.

- [ ] **Step 9: Expose new functions on window.__app**

Add `openAudienceWizard`, `closeAudienceWizard`, `computeAudienceMembers` to `window.__app` for Playwright testing.

- [ ] **Step 10: Commit**

```bash
git add src/assets/app.js
git commit -m "feat: implement audience wizard with 4-step flow and live preview"
```

---

### Task 6: Audience Creation & Detail View

**Files:**
- Modify: `src/assets/app.js` (add createAudience, renderAudienceDetail, renderAudiencesList)

- [ ] **Step 1: Add `createAudience()` function**

Reads name/description from wizard Step 4 inputs, builds audience object:
```javascript
{
  name: nameInput.value,
  key: nameInput.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
  description: descInput.value,
  conditions: state.wizardConditions,
  destination: 'Send Interaction',
  members: computeAudienceMembers(state.wizardConditions).map(p => p.id)
}
```
Pushes to `state.audiences`, closes wizard, renders audience detail.

- [ ] **Step 2: Add `renderAudienceDetail(audience)` function**

Renders into `#audience-detail`:
- Breadcrumb with audience name
- Tabs (Overview active, others decorative)
- Stats: member count, 1 Connected Destination, Status Enabled
- Identifier Breakdown table (email/phone/user_id all 100%)
- Destinations card (Send Interaction, Enabled)
- Audience Explorer: searchable table of members from MOCK_PROFILES

- [ ] **Step 3: Add `renderAudiencesList()` function**

Updates `#audiences-table-body`:
- If `state.audiences.length === 0`: show empty row
- Otherwise: render a `<tr>` per audience with name (clickable link), status "Enabled", member count, destination

Clicking an audience name calls `showAudienceDetail(audience)` which hides list, shows `#audience-detail`.

- [ ] **Step 4: Add back navigation from detail to list**

Audience detail breadcrumb "Audiences" link and/or a back button closes detail, shows list.

- [ ] **Step 5: Call `renderAudiencesList()` after audience creation and on view switch**

Ensure the list refreshes when:
- `createAudience()` completes
- User navigates to audiences view via sidebar

- [ ] **Step 6: Commit**

```bash
git add src/assets/app.js
git commit -m "feat: add audience creation, detail view, and list rendering"
```

---

### Task 7: Journey Wizard JS

**Files:**
- Modify: `src/assets/app.js` (add journey wizard functions)
- Modify: `src/assets/style.css` (add journey canvas styles)

- [ ] **Step 1: Add journey canvas CSS**

Append to `style.css`:

```css
/* ===== JOURNEY CANVAS ===== */
.journey-canvas-layout { display: flex; min-height: 400px; }

.journey-widget-panel {
  width: 200px;
  background: #fff;
  border-right: 1px solid var(--brand-border);
  padding: 20px 16px;
}

.widget-section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #9ca3af;
  margin: 16px 0 8px;
}

.widget-item {
  padding: 8px 10px;
  border: 1px solid var(--brand-border);
  border-radius: 6px;
  font-size: 13px;
  color: #374151;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.journey-canvas {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #f9fafb;
}

.canvas-node {
  background: #fff;
  border: 2px solid var(--brand-border);
  border-radius: 8px;
  padding: 14px 24px;
  text-align: center;
}

.canvas-node-trigger { border-color: #6c5ce7; }
.canvas-node-destination { border-color: #10b981; }

.canvas-node-type {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 4px;
}

.canvas-node-label { font-size: 14px; font-weight: 500; }
.canvas-node-desc { font-size: 12px; color: #6b7280; }

.canvas-connector {
  width: 2px;
  height: 32px;
  background: #d1d5db;
  margin: 0 auto;
}

.canvas-arrow {
  width: 0; height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid #d1d5db;
  margin: 0 auto 4px;
}

/* ===== JOURNEY SETUP ===== */
.journey-form { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
.journey-form label { font-size: 13px; font-weight: 500; display: block; margin-bottom: 4px; }
.journey-form input, .journey-form textarea, .journey-form select {
  padding: 8px 12px;
  border: 1px solid var(--brand-border);
  border-radius: 6px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
}
.journey-form textarea { height: 70px; resize: vertical; font-size: 13px; }
.journey-form select { background: #fff; }

.trigger-option {
  border: 1px solid var(--brand-border);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.trigger-option.selected { border: 2px solid #6c5ce7; background: #faf9ff; }
.trigger-option.dimmed { opacity: 0.5; cursor: default; }

.trigger-description {
  background: #f9fafb;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid var(--brand-border);
}

.frequency-option {
  border: 1px solid var(--brand-border);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 10px;
}

.frequency-option.selected { border: 2px solid #6c5ce7; background: #faf9ff; }
.frequency-option.dimmed { opacity: 0.6; }

.journeys-tabs { display: flex; gap: 16px; margin-bottom: 20px; }
```

- [ ] **Step 2: Add `renderJourneyWizard(step)` function**

Renders into `#journey-wizard`. Handles steps 1-3:
- Step 1: Select Trigger — "Profile performs an event" (dimmed), "Profile enters an audience" (selected). Right panel shows description.
- Step 2: Set Up — Name, description, entry audience dropdown (from `state.audiences`), frequency selection (One time selected).
- Step 3: Build — Static canvas with widget panel on left, trigger → destination flow in center.

- [ ] **Step 3: Add `openJourneyWizard()` and `closeJourneyWizard()`**

Same pattern as audience wizard — toggle visibility of `#journeys-list-container` and `#journey-wizard`.

- [ ] **Step 4: Add `createJourney()` function**

Reads name/description from Step 2 inputs, builds journey object:
```javascript
{
  name: nameInput.value,
  description: descInput.value,
  audience_key: selectedAudienceKey,
  trigger: 'new_promotion_published',
  destination: 'Send Interaction',
  status: 'Draft'
}
```
Pushes to `state.journeys`, closes wizard, renders journeys list.

- [ ] **Step 5: Add `renderJourneysList()` function**

Updates `#journeys-table-body`:
- If empty: show empty state with icon
- Otherwise: render rows with name, status "Draft", destination, "Paul Heath" as creator, "Just now"

- [ ] **Step 6: Wire `#btn-new-journey` and `.btn-new-journey-inline` click handlers**

Both call `openJourneyWizard()`.

- [ ] **Step 7: Expose journey functions on window.__app**

Add `openJourneyWizard`, `closeJourneyWizard`, `createJourney` to `window.__app`.

- [ ] **Step 8: Commit**

```bash
git add src/assets/app.js src/assets/style.css
git commit -m "feat: implement journey wizard with 3-step flow and static canvas"
```

---

### Task 8: Profile Tab Integration

**Files:**
- Modify: `src/assets/app.js:725-748` (renderProfileTab audiences/journeys cases)

- [ ] **Step 1: Update Audiences tab rendering**

Replace the hardcoded audiences tags in `renderProfileTab` (the `tabName === 'audiences'` branch) with dynamic logic:

```javascript
} else if (tabName === 'audiences') {
  const matching = state.audiences.filter(a => a.members.includes(profile.id));
  if (matching.length === 0) {
    container.innerHTML = '<div class="empty-tab">No audiences yet</div>';
  } else {
    container.innerHTML = '<div class="tag-list">' +
      matching.map(a => '<span class="tag-item">' + a.name + '</span>').join('') +
      '</div>';
  }
}
```

- [ ] **Step 2: Update Journeys tab rendering**

Replace the hardcoded journeys tags with dynamic logic:

```javascript
} else if (tabName === 'journeys') {
  const matchingJourneys = state.journeys.filter(j => {
    const audience = state.audiences.find(a => a.key === j.audience_key);
    return audience && audience.members.includes(profile.id);
  });
  if (matchingJourneys.length === 0) {
    container.innerHTML = '<div class="empty-tab">No journeys yet</div>';
  } else {
    container.innerHTML = '<div class="tag-list">' +
      matchingJourneys.map(j => '<span class="tag-item">' + j.name + '</span>').join('') +
      '</div>';
  }
}
```

- [ ] **Step 3: Add empty-tab CSS**

```css
.empty-tab { padding: 24px; text-align: center; color: #9ca3af; font-size: 14px; }
```

- [ ] **Step 4: Commit**

```bash
git add src/assets/app.js src/assets/style.css
git commit -m "feat: dynamic profile Audiences/Journeys tabs based on created state"
```

---

### Task 9: Automated Outreach on Events Tab

**Files:**
- Modify: `src/assets/app.js:702-723` (renderProfileTab events branch)

- [ ] **Step 1: Add promotion_sent to live events conditionally**

In the `tabName === 'events'` branch of `renderProfileTab`, after the existing `PROFILE_LIVE_EVENTS.forEach` block, add logic to check if the current profile qualifies for a journey:

```javascript
// Check if profile is in a journey audience
const qualifyingJourney = state.journeys.find(j => {
  const audience = state.audiences.find(a => a.key === j.audience_key);
  return audience && audience.members.includes(profile.id);
});

if (qualifyingJourney) {
  setTimeout(() => {
    if (!list.isConnected) return;
    const row = document.createElement('div');
    row.className = 'profile-event-row entering';
    row.innerHTML = '<span class="profile-event-dot dot-success"></span>' +
      '<span class="profile-event-name">promotion_sent</span>' +
      '<span class="profile-event-time">Just now</span>';
    list.prepend(row);
    setTimeout(() => row.classList.remove('entering'), 350);
    // Trigger actual outreach
    triggerPromotionalOutreach(profile);
  }, 8000);
}
```

- [ ] **Step 2: Add `triggerPromotionalOutreach(profile)` function**

```javascript
function triggerPromotionalOutreach(profile) {
  const channel = profile.preferred_channel;
  if (channel === 'rcs_sms' || channel === 'sms') {
    // Use existing sendRCS function with promotional template
    // Template ID will be configured — for now call send-rcs endpoint
    fetch(`${CONFIG.functionsBaseUrl}/send-rcs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: profile.phone })
      // Template details to be added when user provides them
    }).then(r => r.json()).then(result => {
      addConversationMessage('Promotional RCS/SMS sent to ' + profile.name, 'outbound');
    }).catch(err => console.error('Promo send failed:', err));
  } else if (channel === 'email') {
    fetch(`${CONFIG.functionsBaseUrl}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: profile.email })
      // Template details to be added when user provides them
    }).then(r => r.json()).then(result => {
      addConversationMessage('Promotional email sent to ' + profile.name, 'outbound');
    }).catch(err => console.error('Promo email failed:', err));
  }
}
```

Note: The template IDs/content for both RCS and email will be provided by the user and plugged in later. The function structure is ready.

- [ ] **Step 3: Add dot-success CSS class**

```css
.profile-event-dot.dot-success { background: #10b981; }
```

- [ ] **Step 4: Add `addConversationMessage` helper if not existing**

Check if a function exists to add messages to the conversation thread. If not, add one that appends to `#conversation-thread`:

```javascript
function addConversationMessage(text, direction) {
  const thread = dom.conversationThread;
  const empty = thread.querySelector('.conversation-empty');
  if (empty) empty.remove();
  const msg = document.createElement('div');
  msg.className = 'conversation-message ' + direction;
  msg.innerHTML = text;
  thread.appendChild(msg);
  thread.scrollTop = thread.scrollHeight;
}
```

- [ ] **Step 5: Expose triggerPromotionalOutreach on window.__app**

- [ ] **Step 6: Commit**

```bash
git add src/assets/app.js src/assets/style.css
git commit -m "feat: add promotion_sent event and automated outreach trigger"
```

---

### Task 10: Playwright E2E Tests

**Files:**
- Modify: `src/test/e2e/dashboard.spec.js`

- [ ] **Step 1: Add Audiences test suite**

```javascript
test.describe('Audiences', () => {
  test('audiences list shows empty state', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('audiences'));
    await expect(page.locator('#audiences-table-body .empty-row')).toBeVisible();
  });

  test('new audience button opens wizard', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('audiences'));
    await page.evaluate(() => document.getElementById('btn-new-audience').click());
    await page.waitForFunction(() =>
      !document.getElementById('audience-wizard').classList.contains('hidden'));
    await expect(page.locator('#audience-wizard')).toBeVisible();
  });

  test('completing wizard creates audience in list', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('audiences'));
    await page.evaluate(() => window.__app.openAudienceWizard());

    // Step 1: Select type (Profiles audience pre-selected) → Next
    await page.evaluate(() =>
      document.querySelector('.wizard-footer .btn-primary').click());

    // Step 2: Add condition and advance
    await page.evaluate(() => {
      // Select target_attainment, greater than, 60
      const selects = document.querySelectorAll('.condition-row select');
      if (selects[1]) { selects[1].value = 'target_attainment'; selects[1].dispatchEvent(new Event('change')); }
      if (selects[2]) { selects[2].value = 'greater than'; selects[2].dispatchEvent(new Event('change')); }
      const input = document.querySelector('.condition-row input[type="number"]');
      if (input) { input.value = '60'; input.dispatchEvent(new Event('input')); }
    });
    // Check preview shows 4 matches
    await expect(page.locator('.audience-preview-count')).toContainText('4');
    // Next
    await page.evaluate(() =>
      document.querySelector('.wizard-footer .btn-primary').click());

    // Step 3: Destinations (pre-selected) → Next
    await page.evaluate(() =>
      document.querySelector('.wizard-footer .btn-primary').click());

    // Step 4: Enter name and create
    await page.fill('[data-field="audience-name"]', 'Cross-Sell');
    await page.evaluate(() =>
      document.querySelector('.wizard-footer .btn-primary').click());

    // Should show audience detail
    await expect(page.locator('#audience-detail')).toBeVisible();
  });
});
```

- [ ] **Step 2: Add Journeys test suite**

```javascript
test.describe('Journeys', () => {
  test('journeys list shows empty state', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('journeys'));
    await expect(page.locator('#journeys-table-body .empty-row')).toBeVisible();
  });

  test('create journey button opens wizard', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.__app.switchView('journeys'));
    await page.evaluate(() => document.getElementById('btn-new-journey').click());
    await page.waitForFunction(() =>
      !document.getElementById('journey-wizard').classList.contains('hidden'));
  });
});
```

- [ ] **Step 3: Add end-to-end scenario test**

```javascript
test.describe('End-to-End Scenario', () => {
  test('audience + journey triggers promotion_sent on qualifying profile', async ({ page }) => {
    await page.goto('/');

    // Create audience via JS API
    await page.evaluate(() => {
      const members = window.__app.computeAudienceMembers([
        { trait: 'target_attainment', operator: 'greater than', value: 60 }
      ]);
      window.__app.state.audiences.push({
        name: 'Cross-Sell', key: 'cross_sell',
        description: 'Test', conditions: [],
        destination: 'Send Interaction',
        members: members.map(p => p.id)
      });
      window.__app.state.journeys.push({
        name: 'Send Promotion', description: 'Test',
        audience_key: 'cross_sell',
        trigger: 'new_promotion_published',
        destination: 'Send Interaction', status: 'Draft'
      });
    });

    // Navigate to Paul Heath profile events tab
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await page.waitForFunction(() =>
      document.querySelectorAll('#profile-table-body tr').length === 6);
    await page.evaluate(() =>
      document.querySelector('#profile-table-body tr:first-child').click());
    await page.waitForFunction(() =>
      !document.getElementById('profile-detail').classList.contains('hidden'));
    await page.evaluate(() =>
      document.querySelector('.profile-tab[data-tab="events"]').click());

    // Wait for promotion_sent event (8s delay + buffer)
    await expect(page.locator('.profile-event-row')).toHaveCount(8, { timeout: 12000 });
  });

  test('non-qualifying profile does not get promotion_sent', async ({ page }) => {
    await page.goto('/');

    // Create audience with high threshold — Emily Watson (13%) won't qualify
    await page.evaluate(() => {
      window.__app.state.audiences.push({
        name: 'Test', key: 'test', description: '',
        conditions: [], destination: 'Send Interaction',
        members: ['usr_001', 'usr_002', 'usr_003', 'usr_005']
      });
      window.__app.state.journeys.push({
        name: 'Test Journey', description: '',
        audience_key: 'test', trigger: 'new_promotion_published',
        destination: 'Send Interaction', status: 'Draft'
      });
    });

    // Navigate to Emily Watson (usr_004, row 4)
    await page.evaluate(() => window.__app.switchView('profile-explorer'));
    await page.waitForFunction(() =>
      document.querySelectorAll('#profile-table-body tr').length === 6);
    await page.evaluate(() =>
      document.querySelectorAll('#profile-table-body tr')[3].click());
    await page.waitForFunction(() =>
      !document.getElementById('profile-detail').classList.contains('hidden'));
    await page.evaluate(() =>
      document.querySelector('.profile-tab[data-tab="events"]').click());

    // Should only have 7 events (4 history + 3 live), no promotion_sent
    await expect(page.locator('.profile-event-row')).toHaveCount(7, { timeout: 10000 });
  });

  test('page refresh clears audiences and journeys', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.__app.state.audiences.push({ name: 'Test', key: 'test' });
    });
    await page.reload();
    await page.waitForSelector('#view-sources', { state: 'visible' });
    await page.evaluate(() => window.__app.switchView('audiences'));
    await expect(page.locator('#audiences-table-body .empty-row')).toBeVisible();
  });
});
```

- [ ] **Step 4: Update existing sidebar test**

The sidebar section count changed in Task 2. Verify the test at line 14 now expects `toHaveCount(3)`.

- [ ] **Step 5: Run all tests**

Run: `npx playwright test --reporter=line`
Expected: All tests pass (existing 9 + new audiences/journeys/e2e tests).

- [ ] **Step 6: Commit**

```bash
git add src/test/e2e/dashboard.spec.js
git commit -m "test: add Playwright E2E tests for audiences, journeys, and end-to-end scenario"
```

---

### Task 11: Final Integration & Deploy

**Files:**
- All files from previous tasks

- [ ] **Step 1: Run full test suite**

```bash
npx jest --no-coverage && npx playwright test --reporter=line
```
Expected: All unit tests (20) and E2E tests pass.

- [ ] **Step 2: Manual smoke test checklist**

Verify in browser at localhost:
- [ ] Sidebar shows Engage section with Audiences, Journeys, Engage settings
- [ ] Audiences list empty on load
- [ ] New audience wizard completes all 4 steps
- [ ] Audience preview shows 4 profiles for target_attainment > 60
- [ ] Created audience appears in list
- [ ] Audience detail shows correct data
- [ ] Journeys list empty on load
- [ ] Create journey wizard completes all 3 steps with user-entered name
- [ ] Journey appears in list with entered name
- [ ] Paul Heath profile Audiences tab shows cross_sell
- [ ] Paul Heath Events tab shows promotion_sent after live events
- [ ] Page refresh clears everything

- [ ] **Step 3: Deploy to Twilio Functions**

```bash
npx twilio serverless:deploy --service-name sfbli -p FLEX --override-existing-project
```

- [ ] **Step 4: Verify on live site**

Open `https://sfbli-2271-dev.twil.io/index.html` and run through the demo flow.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: integration fixes from smoke testing"
```
