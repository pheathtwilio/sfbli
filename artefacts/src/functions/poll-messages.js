exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(200);
    response.setBody({});
    return callback(null, response);
  }

  const since = parseInt(event.since || '0', 10);

  try {
    const client = context.getTwilioClient();
    const syncService = client.sync.v1.services('default');

    let items = [];
    try {
      items = await syncService
        .syncLists('inbound_messages')
        .syncListItems.list({ limit: 50, order: 'desc' });
    } catch (e) {
      if (e.code === 20404) {
        // List doesn't exist yet — no messages
        response.setStatusCode(200);
        response.setBody({ messages: [] });
        return callback(null, response);
      }
      throw e;
    }

    const messages = items
      .map(item => item.data)
      .filter(msg => msg.timestamp > since);

    response.setStatusCode(200);
    response.setBody({ messages });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
