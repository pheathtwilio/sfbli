# Script 2: Claims Inquiry — "Where's My Claim?"

**Scenario:** Jill Barrientos calls to follow up on a homeowners claim she filed nearly five months ago after storm damage. She's frustrated with the delay. The agent empathizes, provides a detailed status update, explains the remaining process, and confirms next steps.

**Participants:**
- **Jill Barrientos** (Customer) — Phone: +1 (718) 710-0034, Email: jbarrientos@twilio.com
- **Paul Heath** (Call Center Agent)

**Customer Profile:**
| Field | Value |
|-------|-------|
| Customer ID | cust_003 |
| Policy Number | POLICY02 |
| Policy Type | Homeowners |
| Premium | $3,100/yr |
| Coverage | $475,000 |
| Customer Since | 2018 |

**Claims History:**
| Claim Number | Date Filed | Status | Amount | Description |
|-------------|-----------|--------|--------|-------------|
| CL-2025-1247 | 2025-11-03 | Under Review | $8,500 | Storm damage — roof and gutter |
| CL-2024-0832 | 2024-06-15 | Settled | $3,200 | Water damage — burst pipe |

---

## Phase 1: AI Agent (≈30 seconds)

> The call connects. The AI agent has already played the recording notice.

**AI Agent:** Hello, thank you for calling SF Bay Life Insurance. My name is your virtual assistant. Can I get your name to verify your account?

**Jill:** Hi, it's Jill Barrientos.

**AI Agent:** Thank you, Jill. And can I have your policy number?

**Jill:** POLICY02.
<!-- 🏷️ CI: ENTITY — policy number "POLICY02", customer name "Jill Barrientos" -->

**AI Agent:** I've verified your account. How can I help you today?

**Jill:** I need to talk to someone about a claim. Can you transfer me to an agent?
<!-- 🔄 CI: TOPIC — "claim inquiry", "agent transfer request" -->

**AI Agent:** Absolutely, let me connect you with a claims specialist right away.

> *Handoff to Flex. Paul accepts the task in the Flex agent desktop.*

---

## Phase 2: Human Agent Conversation (≈5 minutes)

### Opening — Frustration Surfaces Immediately

**Paul:** Hi Jill, this is Paul with SF Bay Life Insurance claims support. I've got your account pulled up — policy POLICY02. I understand you're calling about a claim?
<!-- 🏷️ CI: ENTITY — policy number "POLICY02" -->

**Jill:** Yes, hi Paul. Look, I'm going to be honest with you — I'm really frustrated right now. I filed a claim back in November for storm damage to my roof, and it's been almost five months and it's still showing "under review." I don't understand what's taking so long.
<!-- 📊 CI: SENTIMENT — negative, frustrated -->
<!-- 🚨 CI: ESCALATION LANGUAGE — "really frustrated", "don't understand what's taking so long" -->
<!-- 🏷️ CI: ENTITY — claim filed "November", time elapsed "five months", damage type "storm damage", "roof" -->

**Paul:** Jill, I hear you, and I completely understand your frustration. Five months is a long time to wait, and you deserve a clear answer on where things stand. Let me pull up your claim right now and give you a full update — is that the claim ending in 1247?
<!-- 📊 CI: SENTIMENT — agent empathy, acknowledgment -->
<!-- 🏷️ CI: ENTITY — claim number "1247" -->

**Jill:** Yes, CL-2025-1247. Eight thousand five hundred dollars for the roof and gutter damage from that storm in late October.
<!-- 🏷️ CI: ENTITY — claim number "CL-2025-1247", amount "$8,500", damage "roof and gutter", event "storm", date "late October" -->

### Detailed Claim Status

**Paul:** Okay, I have your claim file open. Let me walk you through exactly where we are. So the claim was filed on November 3rd for storm-related damage — roof shingles, flashing, and gutter system. The initial amount submitted was $8,500 based on the contractor estimate you provided.
<!-- 🏷️ CI: ENTITY — filing date "November 3rd", damage details "roof shingles, flashing, gutter system", amount "$8,500" -->
<!-- 🏷️ CI: TOPIC — "claim status review" -->

**Jill:** Right, and my contractor said that was a fair estimate. So what's the holdup?

**Paul:** So here's what happened — and I apologize that this wasn't communicated to you better along the way. Your claim went through our standard initial review, which was completed in December. At that point, it was flagged for a field inspection because the damage exceeded our threshold for desk-only adjustments. For homeowners claims over $5,000, we require an independent adjuster to physically inspect the property. That's standard protocol, but I understand it adds time and I know that's frustrating.
<!-- 🏷️ CI: TOPIC — "field inspection requirement", "claims threshold", "$5,000 threshold" -->
<!-- 📊 CI: SENTIMENT — agent providing transparency -->

**Jill:** Okay, but nobody told me that. I've been sitting here thinking maybe there's a problem with my claim. It's stressful not knowing.
<!-- 📊 CI: SENTIMENT — negative, stressed, feeling uninformed -->
<!-- 🚨 CI: ESCALATION LANGUAGE — "nobody told me", "stressful" -->

**Paul:** You're absolutely right, and that's on us. You should have received an update when the field inspection was scheduled. I can see in the file that a letter was generated, but I want to make sure our communication process is better going forward. I'm going to make a note on your file to flag this as a communication gap so our team can address it.
<!-- 📊 CI: SENTIMENT — agent ownership, accountability -->
<!-- 🏷️ CI: TOPIC — "communication gap", "process improvement" -->

### Inspection Results & Timeline

**Jill:** I appreciate that, Paul. So where are we now? Has the inspection actually happened?

**Paul:** Yes — good news on that front. The independent adjuster completed the field inspection on March 12th. They've submitted their report, and the findings actually support your contractor's estimate. The adjuster assessed the damage at $8,200, which is within range of your $8,500 submission. So there's no dispute on the damage assessment.
<!-- 📊 CI: SENTIMENT — positive shift, relief -->
<!-- 🏷️ CI: ENTITY — inspection date "March 12th", adjuster amount "$8,200", original estimate "$8,500" -->
<!-- 🏷️ CI: TOPIC — "inspection completed", "damage assessment confirmed" -->

**Jill:** Oh — okay, that's actually good to hear. So if the adjuster agrees with the estimate, why hasn't it been approved yet?

**Paul:** Great question. After the field inspection, the report goes to our claims approval committee for final sign-off. For claims in this range, that committee meets weekly. Your claim is currently in the queue for final approval. Based on where it sits, I'd expect that approval to come through within the next 7 to 10 business days.
<!-- 🏷️ CI: ENTITY — timeline "7 to 10 business days" -->
<!-- 🏷️ CI: TOPIC — "approval committee", "claims approval process" -->

**Jill:** 7 to 10 business days. Okay. And then what happens after it's approved?
<!-- 📊 CI: SENTIMENT — cautiously optimistic -->

**Paul:** Once approved, you'll receive an approval letter by email and by mail within 48 hours. The letter will include the final approved amount and payment details. The payment itself is issued within 5 business days of approval — you can choose direct deposit or a check. So from where we are now, worst case, you're looking at about three weeks until you have the funds in hand.
<!-- 🏷️ CI: ENTITY — "48 hours" approval notification, "5 business days" payment, "three weeks" total timeline -->
<!-- 🏷️ CI: TOPIC — "payment process", "approval notification", "direct deposit" -->

### Addressing the "What If" — Denial Scenario

**Jill:** And what if it gets denied? I don't want to get my hopes up and then get blindsided.
<!-- 📊 CI: SENTIMENT — anxious, seeking reassurance -->

**Paul:** That's a smart question to ask. Honestly, Jill, based on what I'm seeing, denial is very unlikely in your case. The independent adjuster confirmed the damage, your documentation is solid, and storm damage is clearly covered under your homeowners policy. But if for any reason the committee came back with a partial approval or a denial, you'd have 60 days to file a formal appeal. During the appeal, you can submit additional documentation — additional contractor estimates, photos, weather reports from that date. And you'd be assigned a dedicated appeals adjuster who works directly with you.
<!-- 🏷️ CI: ENTITY — "60 days" appeal window -->
<!-- 🏷️ CI: TOPIC — "appeals process", "denial unlikely", "documentation" -->
<!-- 📊 CI: SENTIMENT — agent reassurance, transparent -->

**Jill:** Okay. And you said the adjuster agreed with the estimate, so that's a good sign?

**Paul:** It's a very good sign. The fact that the independent assessment came in at $8,200 — which is within 4% of your contractor's $8,500 estimate — tells me the documentation you submitted was thorough and accurate. That's exactly what the committee wants to see.
<!-- 📊 CI: SENTIMENT — positive, reassuring -->
<!-- 🏷️ CI: ENTITY — variance "4%", adjuster "$8,200", estimate "$8,500" -->

### Referencing Previous Claim — Building Confidence

**Paul:** And I can also see that your previous claim, CL-2024-0832 for the burst pipe — that was filed in June 2024, approved, and settled for $3,200. That went smoothly, and having a clean claims history actually works in your favor here.
<!-- 🏷️ CI: ENTITY — prior claim "CL-2024-0832", date "June 2024", amount "$3,200", type "burst pipe" -->
<!-- 🏷️ CI: TOPIC — "claims history", "prior claim reference" -->

**Jill:** Yeah, that one was pretty painless actually. I think that's partly why this one caught me off guard — I expected it to be just as quick.
<!-- 📊 CI: SENTIMENT — understanding, less frustrated -->

**Paul:** Totally understandable. The difference is really just the dollar amount triggering that field inspection. Under $5,000 we can handle it as a desk adjustment, which is much faster. Over that threshold, the independent inspection adds 6 to 8 weeks to the timeline. But the good news is that step is done, and we're in the home stretch now.
<!-- 🏷️ CI: TOPIC — "claims process explanation", "threshold difference" -->
<!-- 📊 CI: SENTIMENT — educational, transparent -->

### Resolution & Next Steps

**Jill:** Okay, Paul. I feel a lot better about this now. I just wish someone had explained all of this to me sooner instead of leaving me in the dark.
<!-- 📊 CI: SENTIMENT — positive shift, relieved but noting the communication issue -->

**Paul:** You're 100% right, and I'm sorry about that. Here's what I'm going to do for you. First, I'm putting a priority flag on your claim file so that when it goes to the committee, it's noted that this has been an extended timeline. Second, I'm going to send you a summary email right now to jbarrientos@twilio.com with everything we discussed — the inspection results, the approval timeline, the payment process, and the appeal information, just so you have it all in writing. And third, I'm going to personally follow up with you next week to let you know the committee's decision. You won't have to call back in.
<!-- 🏷️ CI: ENTITY — email "jbarrientos@twilio.com" -->
<!-- 🏷️ CI: TOPIC — "priority flag", "email summary", "proactive follow-up" -->
<!-- 📊 CI: SENTIMENT — strong agent ownership, going above and beyond -->

**Jill:** Wow, that's — thank you, Paul. That really means a lot. I was honestly dreading making this call, but you've been incredibly helpful. I really appreciate you taking the time to explain everything.
<!-- 📊 CI: SENTIMENT — very positive, grateful -->
<!-- 🚨 CI: ESCALATION RESOLVED — frustration fully addressed -->

**Paul:** It's my pleasure, Jill. I know dealing with property damage is stressful enough without having to worry about the insurance side of it. You've been a loyal customer for eight years, and we want to make sure you feel taken care of. Is there anything else I can help you with today?
<!-- 📊 CI: SENTIMENT — empathy, loyalty acknowledgment -->

**Jill:** No, that covers everything. Thank you again, Paul. Have a good day.

**Paul:** You too, Jill. You'll hear from me next week. Take care.
<!-- 📊 CI: SENTIMENT — warm, positive close -->

> *Call ends. Recording submitted to Conversational Intelligence.*

---

## Conversational Intelligence Signals Summary

| Signal Type | Instances | Key Moments |
|------------|-----------|-------------|
| **Entities** | Claim #s, amounts, dates, policy #, email, timelines, damage types | 15+ distinct entities extracted |
| **Sentiment Arc** | Frustrated → Anxious → Relieved → Grateful | Dramatic negative-to-positive arc |
| **Escalation Language** | "really frustrated", "nobody told me", "stressful", "don't understand" | First 2 minutes — strong negative signals |
| **Agent Empathy** | "I hear you", "completely understand", "you're absolutely right", "that's on us" | Multiple empathy moments throughout |
| **Agent Ownership** | Priority flag, personal follow-up commitment, email summary | Resolution phase — going above and beyond |
| **Topics Detected** | Claim status, field inspection, approval process, appeals, payment timeline, communication gap, prior claims | 8+ distinct topic shifts |
| **Process Compliance** | Appeal rights explained, timeline documented, written confirmation offered | Mid-to-late call |
| **Resolution** | Claim on track for approval, proactive follow-up scheduled, email confirmation sent | Strong positive disposition |
| **Communication Issue** | Customer was not kept informed during process — flagged internally | Opportunity for process improvement |
