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

  const { to, body } = event;

  if (!to || !body) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required fields: to, body' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const message = await client.messages.create({
      messagingServiceSid: context.MESSAGING_SERVICE_SID,
      to,
      body
    });

    response.setStatusCode(200);
    response.setBody({ messageSid: message.sid, status: message.status });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
