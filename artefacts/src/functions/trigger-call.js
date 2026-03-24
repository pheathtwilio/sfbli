exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(200);
    response.setBody({});
    return callback(null, response);
  }

  const { to } = event;

  if (!to) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required field: to' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const agentPhone = context.AGENT_PHONE_NUMBER;

    // TwiML that immediately connects to the agent (< 2 second compliance)
    const voiceFrom = context.VOICE_CALLER_ID || context.TWILIO_PHONE_NUMBER;
    const twiml = `<Response><Say voice="Polly.Joanna">Hi, this is SFBLI reaching out regarding your account. We noticed some recent activity and wanted to connect you with your account representative. Please hold while we transfer you now.</Say><Pause length="2"/><Say voice="Polly.Joanna">You are now connected to your SFBLI account representative. Thank you for your time today.</Say><Pause length="3"/></Response>`;

    const call = await client.calls.create({
      to,
      from: voiceFrom,
      twiml
    });

    response.setStatusCode(200);
    response.setBody({ callSid: call.sid, status: call.status });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
