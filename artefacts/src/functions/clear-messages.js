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

  try {
    const client = context.getTwilioClient();
    const syncService = client.sync.v1.services('default');

    try {
      await syncService.syncLists('inbound_messages').remove();
    } catch (e) {
      if (e.code !== 20404) throw e;
    }

    response.setStatusCode(200);
    response.setBody({ status: 'cleared' });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
