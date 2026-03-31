# Script 1: Policy Inquiry — "Am I Paying Too Much?"

**Scenario:** Jill Barrientos calls about her Homeowners policy renewal and premium concerns. She's been shopping around and mentions a competitor quote. The agent reassures her, highlights her coverage value, and offers a policy review.

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
| Renewal Date | November 20, 2026 |
| Risk Score | Medium |
| Customer Since | 2018 |
| Claims | 2 (1 settled, 1 under review) |

---

## Phase 1: AI Agent (≈30 seconds)

> The call connects. The AI agent has already played the recording notice.

**AI Agent:** Hello, thank you for calling SF Bay Life Insurance. My name is your virtual assistant. Can I get your name to verify your account?

**Jill:** Hi, yes — my name is Jill Barrientos.

**AI Agent:** Thank you, Jill. And can I have your policy number, please?

**Jill:** Sure, it's POLICY02.
<!-- 🏷️ CI: ENTITY — policy number "POLICY02", customer name "Jill Barrientos" -->

**AI Agent:** Great, I've verified your account. How can I help you today?

**Jill:** I'd like to speak to an agent about my policy, please.

**AI Agent:** Of course, let me transfer you to a policy specialist right now. One moment please.
<!-- 🔄 CI: TOPIC — "agent transfer request" -->

> *Handoff to Flex. Paul accepts the task in the Flex agent desktop.*

---

## Phase 2: Human Agent Conversation (≈4 minutes)

### Opening & Verification

**Paul:** Hi Jill, this is Paul with SF Bay Life Insurance. I can see you were just speaking with our virtual assistant. I have your account pulled up here — policy POLICY02, your homeowners coverage. How can I help you today?
<!-- 🏷️ CI: ENTITY — policy number "POLICY02", policy type "homeowners" -->

**Jill:** Hi Paul, thanks for taking my call. So I've had my homeowners policy with you all since 2018, and my renewal is coming up. I wanted to ask a few questions about what's happening with my premium.
<!-- 📊 CI: SENTIMENT — neutral/slightly concerned -->
<!-- 🏷️ CI: ENTITY — renewal date, customer tenure "2018" -->

### Policy Details Discussion

**Paul:** Absolutely, happy to help. So your policy renews on November 20th of this year. Your current premium is $3,100 per year for $475,000 in coverage on your property. That includes your dwelling coverage, personal property, liability, and additional living expenses if something were to happen to your home.
<!-- 🏷️ CI: ENTITY — renewal date "November 20", premium "$3,100", coverage "$475,000" -->

**Jill:** Right, and that's gone up since last year, hasn't it? I feel like I'm paying more than I used to.

**Paul:** Let me take a look at your history... Yes, your premium did increase about 8% at your last renewal. That's primarily driven by two factors — rising replacement costs for building materials in the Bay Area, and the regional risk adjustments we've had to make due to wildfire exposure. It's something that's affected most of our homeowners policyholders in Northern California, unfortunately.
<!-- 🏷️ CI: TOPIC — "premium increase", "replacement costs", "wildfire risk" -->

**Jill:** Yeah, I figured it was something like that. But here's the thing, Paul — I've been shopping around a little bit, and I got a quote from another carrier for about $2,600 a year for similar coverage. That's a pretty big difference.
<!-- 📊 CI: SENTIMENT — shifting to concerned/dissatisfied -->
<!-- 🚨 CI: CHURN SIGNAL — "shopping around", "another carrier", "quote", "$2,600" -->
<!-- 🏷️ CI: ENTITY — competitor quote "$2,600" -->

### Agent Empathy & Retention

**Paul:** I completely understand, Jill, and I appreciate you being upfront about that. A $500 difference is definitely worth looking into. Before you make any decisions, though, can I walk you through what's actually included in your coverage? Because not all policies are created equal, and I want to make sure you're comparing apples to apples.
<!-- 📊 CI: SENTIMENT — agent empathy response -->
<!-- 🏷️ CI: TOPIC — "retention", "coverage comparison" -->

**Jill:** Sure, go ahead.

**Paul:** So right now, your POLICY02 includes guaranteed replacement cost coverage — that means if your home is completely destroyed, we cover the full cost to rebuild it, even if construction costs have gone up beyond your coverage limit. A lot of carriers cap that at the policy limit, which can leave you significantly underinsured. You also have $100,000 in personal property coverage, $300,000 in personal liability, and 24 months of additional living expenses. That ALE coverage alone is huge — if you had to relocate for two years while your home was rebuilt, that could easily run $80,000 to $100,000.
<!-- 🏷️ CI: ENTITY — "guaranteed replacement cost", "$100,000 personal property", "$300,000 liability", "24 months ALE" -->
<!-- 🏷️ CI: TOPIC — "coverage details", "replacement cost guarantee" -->

**Jill:** Hmm, I didn't realize the replacement cost was guaranteed. The other quote definitely had a cap on it.

**Paul:** That's really common. The other thing I'd want you to check is their claims process. You've been with us since 2018, and you've filed two claims — both handled smoothly. Your settled claim from last year was processed in under 30 days. That kind of track record matters when something actually goes wrong.
<!-- 🏷️ CI: TOPIC — "claims process", "claims history" -->
<!-- 📊 CI: SENTIMENT — customer beginning to reconsider -->

### Offering Solutions

**Jill:** That's a fair point. I was pretty happy with how the last claim went. So is there anything we can do about the premium, though? Because even understanding all of that, $3,100 is a lot.

**Paul:** There are a few things I can do. First, I'd like to schedule a full policy review — we can look at your deductible options. Right now you're at a $1,000 deductible. If we moved that to $2,500, we could bring your premium down by around 12 to 15%, which would put you closer to that $2,600 to $2,700 range. We can also look at bundling discounts if you have an auto policy, and there's a loyalty discount for customers who've been with us over five years — which you qualify for.
<!-- 🏷️ CI: ENTITY — deductible "$1,000", proposed deductible "$2,500", discount "12 to 15%" -->
<!-- 🏷️ CI: TOPIC — "deductible adjustment", "bundling discount", "loyalty discount" -->
<!-- 📊 CI: SENTIMENT — positive shift, solutions offered -->

**Jill:** Oh, I didn't know about the loyalty discount. That's interesting. And the deductible change — so my premium would go down to around $2,650 or so?
<!-- 📊 CI: SENTIMENT — interested, warming up -->

**Paul:** That's the ballpark, yes. I'd need to run the exact numbers, which I can do during the policy review. I can also check if you're eligible for any protective device credits — do you have a security system or smart home monitoring?

**Jill:** We do, actually. We put in a Ring system last year.

**Paul:** Perfect, that could get you an additional 5% discount on top of everything else. So we might be able to get you down to around $2,500 to $2,550 with the adjusted deductible, loyalty discount, and protective device credit combined.
<!-- 🏷️ CI: ENTITY — "Ring security system", "5% discount", projected premium "$2,500 to $2,550" -->
<!-- 🏷️ CI: TOPIC — "protective device credit" -->

### Resolution & Next Steps

**Jill:** Wow, that's actually better than the other quote, and I'd keep the guaranteed replacement cost. Okay, yeah — let's do the policy review.
<!-- 📊 CI: SENTIMENT — positive, satisfied, decision made -->
<!-- 🚨 CI: CHURN SIGNAL RESOLVED — customer retained -->

**Paul:** Excellent. I'm really glad we could work through this together, Jill. Here's what I'm going to do — I'll schedule that policy review for this week. I'll run all the numbers with the deductible adjustment, the loyalty discount, and the protective device credit, and I'll send you a detailed comparison to your email at jbarrientos@twilio.com. You'll see exactly what your new premium would be and what coverage you're keeping. Does that work for you?
<!-- 🏷️ CI: ENTITY — email "jbarrientos@twilio.com" -->
<!-- 🏷️ CI: TOPIC — "next steps", "policy review scheduled", "email follow-up" -->

**Jill:** That sounds perfect, Paul. Thank you so much — I was honestly ready to switch, but you've really helped me understand what I'd be giving up.
<!-- 📊 CI: SENTIMENT — very positive, grateful -->

**Paul:** That means a lot, Jill. We value your loyalty — eight years is a long time, and we want to make sure you're getting the best value for your coverage. You'll hear from me by end of week. Is there anything else I can help you with today?

**Jill:** No, that's everything. Thanks again, Paul.

**Paul:** Thank you, Jill. Have a great rest of your day.
<!-- 📊 CI: SENTIMENT — positive close -->

> *Call ends. Recording submitted to Conversational Intelligence.*

---

## Conversational Intelligence Signals Summary

| Signal Type | Instances | Key Moments |
|------------|-----------|-------------|
| **Entities** | Policy #, premium amounts, coverage, dates, email, competitor quote, deductible, discounts | Throughout — rich entity extraction |
| **Sentiment Arc** | Neutral → Concerned → Interested → Satisfied | Clear negative-to-positive progression |
| **Churn Indicators** | "shopping around", "another carrier", "quote for $2,600" | Mid-call — resolved by end |
| **Agent Empathy** | "I completely understand", "I appreciate you being upfront" | After churn signal detected |
| **Topics Detected** | Premium increase, coverage comparison, deductible options, loyalty discount, policy review | 6+ distinct topic shifts |
| **Resolution** | Policy review scheduled, customer retained | Positive disposition |
| **Compliance** | Next steps confirmed, email follow-up documented | Call close |
