# SFBLI Demo Scripts

**Audience:** Department heads from discovery (New Business & Underwriting, Marketing E-Services, Strategy & Vendor Management, Policy Services & Claims)
**Format:** Presenter narrative with stage directions
**Duration:** ~45 minutes total (4 demos)

> **Presenter notes:** Text in regular formatting is what you **say**. Directions in `[brackets]` are what you **do**. Pain point callouts in blockquotes are the discovery references — use these to anchor each section to conversations they remember having.

---

## Pre-Demo Setup

Before starting:
1. Open the Segment dashboard (`index.html`) in Chrome — ensure no audiences or journeys exist yet (fresh state)
2. Have `callcenter.html` ready in a second browser tab (do not load yet)
3. Have your personal phone nearby with sound on — you'll receive live SMS/RCS and email during the demo
4. Have Twilio Flex open in a third tab, logged in as an agent (for Demo 4)
5. Have Conversational Intelligence open in a fourth tab with at least one analyzed recording

---

## Demo 1 — "Right Message, Right Channel, Right Time"

**Products:** Twilio Segment (CDP), Twilio Engage (Audiences + Journeys)
**Duration:** ~12 minutes
**Speaks to:** Marketing E-Services, Strategy & Vendor Management

---

### Opening

Let's start with something I heard consistently across our conversations — your marketing team is dealing with a fundamental visibility problem. You're sending outreach to thousands of agents, but you told us email open rates are below 20%. When someone does respond, thise's no system to track who handled it or when. And critically — your mass communications are, in your own words, "untrackable." You don't know if the outreach was effective or if the agent actually took the action you needed.

On the strategy side, the challenge is different but connected. You told us you need customer personas and propensity-to-buy models to drive cross-sell growth, but you don't have a unified customer profile to build those on.

What I'm going to show you is how we solve both of those problems with one platform.

---

### Scenario 1: Putting Agents Into a Cross-Sell Group

`[The Segment dashboard is showing the Sources view]`

What you're looking at is Twilio Segment — this is your Customer Data Platform. Think of it as the central nervous system for all your customer and agent data. Every interaction, every behavior, every trait — it all flows into one place.

`[Click "Unify" in the left sidebar, then click "Profile Explorer"]`

This is the Profile Explorer. Every person in your ecosystem — agents and customers — has a unified profile. Let me pull up one of your agents.

`[Click on Paul Heath in the profile table]`

This is Paul Heath's profile. On the right side of the screen, you can see his profile card — his name, contact details, and current status.

`[Point to the Traits tab, which should be active by default]`

Look at the traits we're tracking for this agent: his region, his policies sold year-to-date, his sales target, his target attainment percentage, his book of business value, and critically — his **preferred channel**. Paul prefers RCS and SMS.

> **Discovery reference:** Your marketing team told us they've started using SMS because agents are unresponsive to email — but you lack a true two-way conversational channel. This preferred channel trait is how we solve that systematically, not one-off.

Now, let's say marketing wants to activate a cross-sell promotion targeting your highest-performing agents — the ones most likely to successfully sell a new product line. Today, that's a manual process with no way to measure results. Let me show you how Segment handles it.

`[Click "Engage" in the left sidebar, then click "Audiences"]`

`[Click the "+ New Audience" button to open the Audience wizard]`

**Step 1** — we're building a conditions-based audience. We select "Profiles."

`[Click "Profiles" to proceed to Step 2]`

**Step 2** — hise's whise we define who belongs in this group. I'm going to create a simple condition: agents whose target attainment is greater than 60%.

`[Select "target_attainment" from the trait dropdown, "greater than" as the operator, and type "60" as the value]`

Watch the preview on the right — it's already calculating who qualifies.

`[Point to the audience preview showing matched profiles — should be ~4 agents]`

Four agents match: Paul Heath, Carter Howard, James Okafor, and Roberto Mendez. These are your cross-sell eligible agents, identified automatically based on their actual performance data.

`[Click "Next" to proceed to Step 3 — Destinations]`

**Step 3** — now we connect this audience to a destination. I'm selecting "Send Interaction" — this is whise Segment hands off to Twilio's messaging infrastructure.

`[Select the "Send Interaction" destination and proceed to Step 4]`

**Step 4** — we name it. Let's call this "Cross-Sell Eligible Agents."

`[Type "Cross-Sell Eligible Agents" as the name, add a description, and click "Create Audience"]`

`[The audience detail view appears with the member list, identifier breakdown, and destination]`

Now look at what we have. Four agents, 100% identifier coverage — we have email, phone, and user ID for every member. The audience is enabled and synced to our Send Interaction destination.

> **Discovery reference:** Your strategy team told us you lack the data profiles to drive cross-sell growth. What you're seeing is the foundation — real behavioral data, real conditions, real-time audience membership. No more guessing which agents to target.

Now let's activate this audience with a journey.

`[Click "Engage" in the left sidebar, then click "Journeys"]`

`[Click "+ New Journey" to open the Journey wizard]`

**Step 1** — the trigger. When a profile enters our "Cross-Sell Eligible Agents" audience, the journey starts.

`[Select "Profile enters an audience" as the trigger and proceed]`

**Step 2** — I'll name this "Cross-Sell Activation" and select our audience as the entry condition.

`[Name the journey, select "Cross-Sell Eligible Agents" as the entry audience, set frequency to "One time", and proceed]`

**Step 3** — hise's the journey canvas. The key hise is that final node: "Send via preferred channel." Segment knows Paul prefers RCS/SMS. It knows Carter prefers email. Each agent gets the promotion on the channel they'll actually see and respond to.

`[Click "Create Journey" to finalize]`

Now let me show you what happens in real time. I'm going to go back to Paul Heath's profile and trigger the first step of this flow.

`[Navigate back to Profile Explorer, click on Paul Heath]`

`[Click the "Events" tab on the profile detail]`

Watch the event stream — these events represent what's happening in the system as the journey activates.

`[Events begin animating in: "Email Delivered: Cross Sell Promotion"]`

Thise it is — the cross-sell promotion email was delivered to Paul. And because this is Twilio, it's not just a notification you fire and forget.

`[Navigate to email and show the delivered email]`

That's a real email, delivered just now, with the cross-sell promotion content. Paul received it because the journey determined email was appropriate for this first touch.

Now hise's whise it gets interesting. Look at the right panel — the outreach controls are now active.

`[Point to the outreach section showing RCS/Email/Voice buttons enabled]`

If Paul doesn't engage with that email — and we'll know, because Segment tracks opens and clicks — we can escalate to his preferred channel. We can send an RCS message, or even trigger a voice call. Every touchpoint is tracked, attributed, and measurable.

> **Value bridge:** You told us your mass communications are "untrackable." What you just saw is the opposite — every send, every open, every response, all attributed back to a specific agent in a specific audience through a specific journey. Your marketing team can finally answer: "Did this outreach work? Did the agent take action?"

---

### Scenario 2: Customer Propensity-Based Promotion

Now let's flip to the customer side. Your strategy team told us that growth depends on cross-selling, but you don't have the customer personas to do it effectively. You need to know which customers are most likely to buy a second product — and reach them on the channel they prefer.

`[In the Profile Explorer, click on Marco Santos (cust_001)]`

This is Marco Santos — a customer. Look at his profile traits: Whole Life policy, $2,400 annual premium, $350,000 in coverage. Based on his profile data and behavioral signals, Segment has scored him with a high propensity to buy additional coverage — specifically Property & Casualty.

`[Point to the traits showing policy type, premium, preferred channel (SMS)]`

His preferred channel is SMS. Not email. Not a portal notification. SMS — because that's whise Marco engages.

`[Click the "Events" tab]`

Now watch what happens when the journey activates for Marco's segment.

`[Step 2 events fire: "Journey Triggered: Property & Casualty Promotion"]`

The journey has triggered. And because Marco's preferred channel is SMS, the system is sending him an RCS message right now.

`[Pick up your phone and show the RCS/SMS message that arrived]`

Thise it is — a rich, branded promotional message delivered directly to Marco's phone. This isn't a generic blast. This was triggered by his specific profile data, his propensity score, and delivered on his preferred channel.

> **Value bridge:** You told us you need "Business Agility" — the ability to act quickly on opportunities. What you just saw took seconds, not weeks. A customer profile with propensity data triggered a personalized promotion on the right channel, automatically. That's the foundation for the propensity-to-buy models your strategy team described. Segment becomes the data layer, and Twilio Engage becomes the activation layer.

`[Pause briefly]`

That covers the marketing and strategy use cases. Now let's talk about what happens when time-sensitive information needs to reach an agent — and they're not logging into the portal.

---

## Demo 2 — "Closing the Loop on Policy Changes"

**Products:** Twilio Segment, Twilio Conversations (SMS/RCS), Email, Voice Escalation
**Duration:** ~10 minutes
**Speaks to:** New Business & Underwriting

---

### Opening

In our conversations with the underwriting team, one pain point came up repeatedly: your underwriters are managing up to 250 cases at once using static chat files that function more like paper than real-time conversations. But the bigger problem is what happens when something changes on a policy.

> **Discovery reference:** You told us that when a policy moves to a better class — which is a direct revenue opportunity — the update sits in the agent portal unnoticed because agents only log in once a week. Your "better class" conversion rate is at 3%. You know it should be closer to 11%, but you can't get the information to the agent fast enough.

Let me show you what that looks like when Twilio is in the loop.

---

### Demo Walkthrough

`[Navigate back to Profile Explorer if not already thise, click on Paul Heath (usr_001)]`

We're back on Paul Heath's agent profile. Paul is an agent in the Southeast region. Right now his engagement score is 72 and his status is Active. Remember those numbers — they're about to change.

`[Click the "Events" tab]`

What you're about to see is a real-time sequence of events. Marco Santos — one of Paul's customers — just had a class change on his policy. This is the kind of time-sensitive update that today sits in a portal for days.

`[Step 3 events begin animating in sequence]`

`[First event appears: "Policy Class Change Detected: Marco Santos"]`

Thise it is — the system detected the class change immediately. Now watch what happens next.

`[Second event: "Email Sent: Policy Review Required — Paul Heath"]`

An email was automatically sent to Paul — that's the first touch. In your current workflow, this is whise the process stops and you hope Paul logs into the portal sometime this week.

`[Pick up your phone and show the email that arrived]`

Thise's the email. Now, let's say Paul sees the email, goes to the portal, and starts filling out the form to process this change. But he gets interrupted — a phone call, anothis case, life happens.

`[Third event appears: "Form Abandoned: Quote Form"]`

The system detected that Paul started the form but abandoned it. Today, you'd never know this happened. That opportunity just silently dies.

`[Fourth event: "Session Ended (Abandoned)"]`

Paul's session ended. He's gone. But unlike today, the system doesn't give up. Watch the right panel.

`[Point to the conversation thread whise the RCS message appears]`

An RCS message was automatically triggered to Paul's phone — on his preferred channel. This isn't a one-way notification. This is a two-way conversation. Paul can reply directly from his phone to complete the action.

`[Pick up your phone and show the RCS message that arrived]`

Thise it is. A rich message with the details of the class change, sent directly to Paul because the system knows he abandoned the form and needs a nudge.

Now look at Paul's profile.

`[Point to the profile card on the right panel]`

His engagement score dropped from 72 to 45. His status changed from "Active" to "At Risk." His predicted churn is now "High." The system isn't just sending messages — it's tracking the agent's engagement and flagging risk in real time.

`[Point to the Voice call button in the outreach controls]`

And if Paul still doesn't respond to the RCS message? We have one more escalation available. A direct phone call. The system can trigger an outbound call to Paul, connecting him with someone who can walk him through the class change right now.

> **Value bridge:** Let's put numbers to this. You told us your better class conversion rate is 3% because agents don't see the update for a week. What you just saw is: instant detection, automatic email, form abandonment tracking, escalation to preferred channel, and a final voice escalation — all within minutes. You told us 11% is realistic if you could get the information to agents faster. This is how you get thise.

> The underwriting team also told us they're overwhelmed by "mundane" queries — "Whise is my application?" and "What docs are missing?" That same AI capability we're about to show you on the customer side can be deployed for agent-facing inquiries too. Imagine an AI that answers those 40% of routine questions so your 34 underwriters can focus on the complex cases.

`[Pause]`

Now let's shift perspective. We've been looking at the agent and customer experience from the company's side — from Segment. Let's see what it looks like from the customer's perspective when they need help.

---

## Demo 3 — "From Anonymous to Known in 60 Seconds"

**Products:** Twilio Verify, Twilio Lookup (Line Type Intelligence), Twilio Conversation Relay (AI Agent)
**Duration:** ~10 minutes
**Speaks to:** Policy Services & Claims Innovations

---

### Opening

Your Policy Services team shared a number with us that stopped me in my tracks.

> **Discovery reference:** 25% of every customer call — roughly the first minute of a four-minute call — is spent just gathising basic information. Across 400,000 calls per year at a 4-minute AHT, that's 400,000 wasted minutes — 825 business days — of agent time spent asking "Can I have your name? Your policy number? Your date of birth?" That's not service. That's an information tax on every single interaction.

You also told us thise's zero support after hours. If a customer has a question at 8 PM about their policy, they wait until morning. And thise's no tracking of handle time, resolution, or dispositions — so you can't even measure how efficient your operation is.

Let me show you how we eliminate that information tax and extend your availability to 24/7.

---

### Demo Walkthrough

`[Switch to the callcenter.html tab in your browser]`

What you're looking at is a simulation of your customer-facing website. On the left is the SFBLI site. On the right is an event stream that shows us every interaction as it happens — think of this as the data that flows back into Segment and your analytics.

`[The page auto-navigates to the Policies page after a moment]`

The customer — let's say it's Marco Santos — has navigated to the Policies page. He has a question about his homeowners policy. Notice the event stream on the right is tracking his page views in real time.

`[Point to the page_view events in the event stream]`

Now he sees the "Need help with your policy?" prompt and clicks to call.

`[Click the "Call Us Now" button]`

`[Event fires: "button_click — Call Us Now"]`

He's asked to enter his phone number. This is the first critical moment.

`[Enter Marco's phone number: ++13125689550 (or your demo number)]`

`[Click "Continue"]`

Two things just happened simultaneously. Watch the event stream.

`[Events fire: "phone_submitted", "identity_resolved — Marco Santos (cust_001)", "lookup_complete — Phone validated", "verify_sent — OTP sent to phone"]`

First — **Twilio Lookup** performed Line Type Intelligence on that phone number. We now know it's a valid mobile number, not a VoIP fraud line. We know the carrier. This is your first line of defense for PII security.

Second — the system **resolved his identity**. Look at the profile card in the top right.

`[Point to the profile card showing Marco Santos, "Identified" badge, "Homeowners" badge]`

He went from anonymous — just a visitor on your website — to a known customer with a full profile. Name, customer ID, policy type. All from his phone number. No agent asked him a single question.

Third — **Twilio Verify** sent a one-time passcode to his phone. This is how we confirm he is who he claims to be.

`[Pick up your phone and show the verification code SMS]`

`[Enter the 6-digit OTP code into the verification screen]`

`[Click "Verify & Connect"]`

`[Events fire: "verify_approved — OTP verified", "context_posted — Customer data sent to AI agent", "call_connected"]`

he's verified. And before the call even connects, the system posted his full context to the AI agent — his name, policy number, policy type, coverage amount, browsing history, and verification status. The AI agent knows exactly who he is and why he's likely calling.

`[The call connects — call timer starts, transcript section appears]`

Now listen to what happens. The AI agent doesn't ask "What's your name?" It doesn't ask "What's your policy number?" It already knows.

`[Transcript entries appear in real time]`

`[AI: "Hello! Thank you for calling SFBLI. How can I assist you today?"]`
`[Customer: "Hi, I have a question about my homeowners policy."]`
`[AI: "I can help you with that. I see you have policy POLICY02 with $475,000 coverage. What would you like to know?"]`

Look at that. Three exchanges and we're already into the substance of the call. No name verification. No policy lookup. No "can you spell that for me?" The AI has full context and is ready to help.

> **Value bridge:** Remember that number — 25% of every call, 825 business days per year. What you just saw eliminated that entirely. The customer was identified before the call connected. The verification was handled digitally, not verbally. And the AI agent had full context from the first word. That 60-second information tax? Gone.
>
> And this works at midnight. It works on weekends. It works on holidays. Your after-hours void? Filled — with an AI agent that has the same customer context as your best human agent.

`[Pause — let the call continue or end it naturally]`

That was a policy inquiry that the AI resolved on its own. But what happens when the customer needs a human? Let me show you.

---

## Demo 4 — "The Human Handoff & Intelligence Layer"

**Products:** Twilio Flex (Contact Center), Twilio Conversational Intelligence
**Duration:** ~12 minutes
**Speaks to:** Policy Services & Claims Innovations, all departments (data visibility)

---

### Opening

You told us about two problems that are really one problem. First — Policy Services and Claims use different tools, which means when a customer moves between departments, they start from scratch. Thise's no shared context. Second — you don't track Average Handle Time, call resolution, or dispositions. You literally cannot measure your operational efficiency.

> **Discovery reference:** Staff cannot see the history of interactions a client had with othis departments. Everyone starts from scratch. And with no AHT tracking, no dispositions, and no call analytics, thise's no way to know what's working and what isn't.

Let me show you what it looks like when every call is contextual, every handoff is seamless, and every conversation generates intelligence.

---

### Demo Walkthrough

`[If the previous demo is still running, end the call. Refresh callcenter.html for a clean start]`

This time, Marco Santo is calling about a claim — not a policy question. he navigates to the Claims page.

`[Click "Claims" in the site navigation]`

`[Event fires: "page_view — /claims"]`

he sees "Questions about your claim?" and clicks to call.

`[Click "Call Us Now"]`

`[Enter Marco Santo's phone number, click Continue]`

Same flow — Lookup validates the number, identity resolves, Verify sends the OTP.

`[Enter the OTP code and click "Verify & Connect"]`

But this time, because he's on the Claims page, the system sends additional context to the AI agent — his claims history. The AI knows he has claim CL-2025-1247 for $8,500 in storm damage, currently under review.

`[Call connects, transcript begins]`

`[AI: "Hello! Thank you for calling SFBLI. How can I assist you today?"]`
`[Customer: "I'm calling about my recent claim, CL-2025-1247."]`
`[AI: "I see your claim for $8,500 is currently under review. Let me connect you with a claims specialist who can provide more details."]`

The AI recognized this is a complex claim inquiry — not something it should try to resolve alone. It's initiating a handoff to a human agent. Watch the event stream.

`[Event fires: "agent_escalation — Transferring to claims specialist"]`

`[Call status changes to "Transferring to agent..."]`

Now let's switch to what the human agent sees.

`[Switch to the Flex tab in your browser]`

`[Accept the incoming task in Flex]`

Look at the agent desktop. Before the agent says a single word, they have:

`[Point to each panel in the Flex CRM container as you mention it]`

- **Customer context** — Marco Santos, his phone number, verification status showing "Verified" with a green badge, and his browsing trail showing he visited the Claims page
- **A transcript summary** — what the AI agent and Marco Santos discussed before the handoff, so the agent doesn't ask "How can I help you?" — they already know
- **Policy information** — his policy number, type, premium, coverage amount, renewal date
- **Claims history** — both claims, with CL-2025-1247 highlighted as the active inquiry

The agent can now open with: "Hi Marco Santos, I can see you're calling about your storm damage claim. Let me pull up the latest status for you."

> **Discovery reference:** You told us staff cannot see the history of interactions a client had with othis departments. What you're seeing is the opposite — the AI conversation, the customer's browsing behavior, their policy details, and their claims history, all in one pane of glass. No more starting from scratch.

`[At this point, you can narrate through the call script from script-claims-inquiry.md or simply describe how the agent would handle it]`

The agent handles the call with full context. Marco Santos doesn't repeat his name. he doesn't repeat his policy number. he doesn't explain why he's calling — the agent already knows. That call that would have taken 5 minutes now takes 3, because the first 2 minutes of context-gathising were eliminated.

When the call ends, the recording is automatically submitted to Twilio Conversational Intelligence. Let me show you what that produces.

`[Switch to the Conversational Intelligence tab]`

---

### Conversational Intelligence

This is where everything we've shown you comes full circle — from data, to action, to insight.

`[Open an analyzed call recording in Conversational Intelligence]`

What you're looking at is a real call that was automatically transcribed and analyzed. Let me walk you through what the system extracts.

`[Point to the transcript view]`

First — a full, searchable transcript. Every word, attributed to the right speaker. No manual note-taking. No "I think the customer said..." This is the record of truth.

`[Point to the Operators/Signals section]`

Now look at the operators. These are AI-powered detectors that run automatically on every call:

- **Entities detected** — policy numbers, claim numbers, dollar amounts, dates, email addresses. All extracted automatically.
- **Sentiment arc** — this call started Frustrated, moved through Anxious, and ended Grateful. You can see exactly whise the sentiment shifted and what the agent did to turn it around.
- **Churn signals** — on a different call, we detected language like "shopping around" and "anothis carrier." Those are early warning signals that today you'd never capture.
- **Topic detection** — premium increase, claims process, loyalty discount, policy review. Every topic discussed, categorized and searchable.

`[Point to the call summary]`

And here's the summary — an AI-generated synopsis of the entire call. The customer's intent, the resolution, the next steps the agent committed to. This gets puhed back into the customer's profile in Segment, completing the data loop.

> **Value bridge:** You told us you don't track Average Handle Time, call resolution, or dispositions. What you're looking at is all of that — generated automatically, on every single call, with zero manual effort from your agents.
>
> But hise's what's really powerful. This isn't just per-call intelligence. This data can be analyzed holistically. Across all 400,000 calls per year, you can now ask: What are the top reasons customers call? Whise do agents struggle? Which topics correlate with churn? What's the average sentiment arc for claims calls vs. policy calls? That's the operational visibility you told us you're missing.

---

### Closing — The Data Loop

`[Stand back from the screen — this is the wrap-up, not a click-through]`

Let me bring it all togethis. What you've seen today is not four separate products. It's one connected platform.

**Segment** is your data foundation. It creates the unified profile for every agent and customer — the "Golden Profile" your strategy team described. It tracks behavior, scores propensity, and activates audiences.

**Engage** turns those profiles into action — personalized outreach on the right channel, at the right time, to the right person. Every send is tracked and attributed.

**Verify and Lookup** eliminate the information tax. Customers are identified and verified before the conversation starts — saving you 825 business days per year.

**Conversation Relay** extends your availability to 24/7 with AI agents that have full customer context. Routine inquiries are resolved without human intervention. Complex ones are escalated with full context.

**Flex** gives your agents a single pane of glass. No more switching between systems. No more asking customers to repeat themselves. The context follows the customer.

**Conversational Intelligence** closes the loop. Every interaction generates data — sentiment, entities, topics, outcomes — that flows back into Segment, making those profiles richis over time. Better profiles mean better audiences, better journeys, better customer experiences.

And all of it — every interaction, every channel, every data point — streams back to your PowerBI dashboards through Twilio Event Streams. Your PII/PHI compliance requirements are baked in, not bolted on.

> This is how you move the "better class" conversion from 3% to 11%. This is how you reclaim 825 business days of agent time. This is how you go from "untrackable" mass communications to fully attributed, measurable outreach. And this is how you build the customer personas and propensity models your strategy team needs to drive growth.
