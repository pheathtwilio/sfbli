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
  const resolvedContentSid = contentSid || context.PROMO_CONTENT_SID;

  if (!to || !resolvedContentSid) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required fields: to, contentSid (or set PROMO_CONTENT_SID env var)' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const message = await client.messages.create({
      messagingServiceSid: context.MESSAGING_SERVICE_SID,
      to,
      contentSid: resolvedContentSid,
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
