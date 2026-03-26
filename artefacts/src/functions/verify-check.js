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

  const { phone, code } = event;
  if (!phone || !code) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required fields: phone, code' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const check = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });

    response.setStatusCode(200);
    response.setBody({ valid: check.valid, status: check.status });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
