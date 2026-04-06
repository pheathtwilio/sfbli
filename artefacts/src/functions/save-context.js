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

  const phone = event.phone;
  if (!phone) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing phone' });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();
    const syncService = client.sync.v1.services('default');
    const mapName = 'sfbli-call-context';

    // Ensure map exists
    try {
      await syncService.syncMaps(mapName).fetch();
    } catch (e) {
      if (e.code === 20404) {
        await syncService.syncMaps.create({ uniqueName: mapName });
      } else {
        throw e;
      }
    }

    // Store context keyed by phone (sanitize + for key)
    const key = phone.replace(/\+/g, 'p');
    const data = JSON.parse(event.contextData || '{}');

    try {
      await syncService.syncMaps(mapName).syncMapItems(key).update({ data });
    } catch (e) {
      if (e.code === 20404) {
        await syncService.syncMaps(mapName).syncMapItems.create({ key, data });
      } else {
        throw e;
      }
    }

    response.setStatusCode(200);
    response.setBody({ success: true });
    return callback(null, response);
  } catch (err) {
    console.error('save-context error:', err);
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
