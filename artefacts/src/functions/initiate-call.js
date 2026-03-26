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

  const { customerPhone } = event;
  if (!customerPhone) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required field: customerPhone' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const crelayBase = context.CRELAY_BASE_URL;

    // TwiML: recording notice then redirect to CRelay
    const twiml = `<Response><Say voice="Polly.Joanna">This call may be recorded for quality and training purposes.</Say><Redirect>${crelayBase}/twiml</Redirect></Response>`;

    const call = await client.calls.create({
      from: context.TWILIO_PHONE_NUMBER,
      to: customerPhone,
      twiml,
      record: true,
      statusCallback: `${crelayBase}/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
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
