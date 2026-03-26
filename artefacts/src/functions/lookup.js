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

  const { phone } = event;
  if (!phone) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required field: phone' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const result = await client.lookups.v2.phoneNumbers(phone)
      .fetch({ fields: 'line_type_intelligence,caller_name' });

    const lineType = result.lineTypeIntelligence?.type || 'unknown';
    response.setStatusCode(200);
    response.setBody({
      valid: result.valid,
      callerName: result.callerName?.caller_name || null,
      lineType,
      carrier: result.lineTypeIntelligence?.carrier?.name || null,
      isNonFixedVoip: lineType === 'nonFixedVoip'
    });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
