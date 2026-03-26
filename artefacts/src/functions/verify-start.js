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

  const { phone, channel } = event;
  if (!phone) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required field: phone' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const verification = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: channel || 'sms' });

    response.setStatusCode(200);
    response.setBody({ sid: verification.sid, status: verification.status, channel: verification.channel });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
