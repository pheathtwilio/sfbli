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
    const execution = await client.studio
      .v2.flows(context.STUDIO_FLOW_SID)
      .executions.create({
        to,
        from: context.TWILIO_PHONE_NUMBER,
        parameters: JSON.stringify({
          agent_phone: context.AGENT_PHONE_NUMBER
        })
      });

    response.setStatusCode(200);
    response.setBody({ callSid: execution.sid, status: execution.status });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
