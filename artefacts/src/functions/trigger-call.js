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
    const studioUrl = `https://webhooks.twilio.com/v1/Accounts/${context.ACCOUNT_SID}/Flows/${context.STUDIO_FLOW_SID}`;

    const call = await client.calls.create({
      from: context.TWILIO_PHONE_NUMBER,
      to,
      url: studioUrl
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
