exports.handler = function (context, event, callback) {
  const twiml = new Twilio.twiml.VoiceResponse();

  console.log('HANDOFF request:', JSON.stringify({
    CallSid: event.CallSid,
    HandoffData: event.HandoffData ? 'present' : 'absent'
  }));

  if (event.HandoffData) {
    let handoffData = {};
    try {
      handoffData = JSON.parse(event.HandoffData);
    } catch (e) {
      console.error('Failed to parse HandoffData:', e.message);
    }

    const taskAttributes = JSON.stringify({
      type: 'inbound',
      name: handoffData.customerName || 'Unknown',
      customerName: handoffData.customerName || 'Unknown',
      customerId: handoffData.customerId || '',
      policyNumber: handoffData.policyNumber || '',
      reason: handoffData.reason || 'live-agent-handoff',
      transcriptSummary: handoffData.transcriptSummary || ''
    });

    console.log('HANDOFF -> Enqueuing to Flex:', taskAttributes);

    twiml.say({ voice: 'Polly.Joanna' }, 'Please hold while I connect you to a specialist.');
    twiml.enqueue({ workflowSid: 'REDACTED_FLEX_WORKFLOW_SID' }).task({}, taskAttributes);
  } else {
    console.log('HANDOFF -> No HandoffData, hanging up');
    twiml.hangup();
  }

  callback(null, twiml);
};
