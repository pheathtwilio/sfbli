exports.handler = async function (context, event, callback) {
  const twiml = new Twilio.twiml.VoiceResponse();

  console.log('HANDOFF request:', JSON.stringify({
    CallSid: event.CallSid,
    HandoffData: event.HandoffData ? 'present' : 'absent'
  }));

  // Demo customer profiles — used to fill in fields CRelay doesn't forward
  const DEMO_PROFILES = {
    POLICY01: {
      customerName: 'Marco Santos',
      customerId: 'cust_001',
      customerPhone: '+13125689550',
      email: 'pheath@twilio.com',
      policyType: 'Whole Life',
      premium: '$2,400/yr',
      coverage: '$350,000',
      renewalDate: '2026-08-15',
      riskScore: 'Low',
      customerSince: 'August 2024',
      verificationStatus: 'Verified',
      sentiment: 'Neutral',
      claims: [
        { number: 'CL-2025-1247', date: '2025-11-03', status: 'Under Review', amount: '$8,500', description: 'Storm damage — roof and siding' },
        { number: 'CL-2024-0832', date: '2024-06-15', status: 'Settled', amount: '$3,200' }
      ],
      interactions: [
        { type: 'rcs', description: 'Property & Casualty Promotion sent via RCS', timestamp: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
        { type: 'web', description: 'Visited sfbli.com — Home and Policies pages', timestamp: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
        { type: 'call', description: 'Inbound call — AI Agent triage', timestamp: 'Just now' }
      ],
      verificationMethods: [
        { method: 'OTP', status: 'Verified', detail: 'SMS one-time passcode verified' },
        { method: 'Verbal', status: 'Verified', detail: 'AI Agent confirmed identity verbally' }
      ]
    },
    POLICY02: {
      customerName: 'Jill Barrientos',
      customerId: 'cust_003',
      customerPhone: '+17187100034',
      email: 'jbarrientos@twilio.com',
      policyType: 'Homeowners',
      premium: '$3,100/yr',
      coverage: '$475,000',
      renewalDate: '2026-11-20',
      riskScore: 'Medium',
      customerSince: 'January 2022',
      verificationStatus: 'Verified',
      sentiment: 'Neutral',
      claims: [
        { number: 'CL-2025-0291', date: '2025-09-12', status: 'Under Review', amount: '$12,000', description: 'Water damage — basement flooding' },
        { number: 'CL-2023-1105', date: '2023-04-20', status: 'Settled', amount: '$4,800' }
      ],
      interactions: [
        { type: 'rcs', description: 'Property & Casualty Promotion sent via RCS', timestamp: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
        { type: 'web', description: 'Visited sfbli.com — Home and Policies pages', timestamp: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
        { type: 'call', description: 'Inbound call — AI Agent triage', timestamp: 'Just now' }
      ],
      verificationMethods: [
        { method: 'OTP', status: 'Verified', detail: 'SMS one-time passcode verified' },
        { method: 'Verbal', status: 'Verified', detail: 'AI Agent confirmed identity verbally' }
      ]
    }
  };

  if (event.HandoffData) {
    let handoffData = {};
    try {
      handoffData = JSON.parse(event.HandoffData);
    } catch (e) {
      console.error('Failed to parse HandoffData:', e.message);
    }

    // Look up demo profile by policy number to fill gaps
    const policyNumber = handoffData.policyNumber || handoffData.policy_number || '';
    const profile = DEMO_PROFILES[policyNumber] || {};

    // Profile provides defaults, handoffData overrides for fields CRelay does forward
    const taskAttributes = JSON.stringify({
      type: 'inbound',
      name: handoffData.customerName || handoffData.customer_name || profile.customerName || 'Unknown',
      customerName: handoffData.customerName || handoffData.customer_name || profile.customerName || 'Unknown',
      customerId: handoffData.customerId || handoffData.customer_id || profile.customerId || '',
      customerPhone: profile.customerPhone || handoffData.customerPhone || handoffData.phone || '',
      email: profile.email || handoffData.email || '',
      policyNumber: policyNumber || '',
      policyType: profile.policyType || handoffData.policyType || '',
      premium: profile.premium || handoffData.premium || '',
      coverage: profile.coverage || handoffData.coverage || '',
      renewalDate: profile.renewalDate || handoffData.renewalDate || '',
      riskScore: profile.riskScore || handoffData.riskScore || '',
      customerSince: profile.customerSince || handoffData.customerSince || '',
      claims: profile.claims || handoffData.claims || [],
      browsingHistory: handoffData.browsingHistory || [],
      verificationStatus: profile.verificationStatus || handoffData.verificationStatus || 'Verified',
      transcriptSummary: handoffData.transcriptSummary || handoffData.transcript_summary || '',
      reason: handoffData.reason || 'live-agent-handoff',
      sentiment: profile.sentiment || handoffData.sentiment || 'Neutral',
      interactions: profile.interactions || handoffData.interactions || [],
      verificationMethods: profile.verificationMethods || handoffData.verificationMethods || []
    });

    console.log('HANDOFF -> Enqueuing to Flex:', taskAttributes);

    twiml.say({ voice: 'Polly.Joanna' }, 'Please hold while I connect you to a specialist.');
    twiml.enqueue({ workflowSid: context.FLEX_WORKFLOW_SID }).task({}, taskAttributes);
  } else {
    console.log('HANDOFF -> No HandoffData, hanging up');
    twiml.hangup();
  }

  callback(null, twiml);
};
