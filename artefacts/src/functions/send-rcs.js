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

  const { to, contentSid, contentVariables } = event;

  if (!to || !contentSid) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required fields: to, contentSid' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const message = await client.messages.create({
      from: context.TWILIO_PHONE_NUMBER,
      to,
      contentSid,
      contentVariables: contentVariables || '{}'
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
