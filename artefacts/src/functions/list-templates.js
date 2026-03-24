const sgClient = require('@sendgrid/client');

async function listTwilioContentTemplates(context) {
  const client = context.getTwilioClient();
  const contents = await client.content.v1.contents.list();
  return contents.map(c => ({
    id: c.sid,
    name: c.friendlyName,
    type: Object.keys(c.types || {})[0] || 'unknown',
    variables: c.variables || {}
  }));
}

async function listSendGridTemplates(context) {
  sgClient.setApiKey(context.SENDGRID_API_KEY);
  const [response] = await sgClient.request({
    method: 'GET',
    url: '/v3/templates',
    qs: { generations: 'dynamic', page_size: 20 }
  });
  return (response.body.result || []).map(t => ({
    id: t.id,
    name: t.name,
    type: 'email'
  }));
}

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

  const { type } = event;

  if (!type || !['content', 'sendgrid'].includes(type)) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing or invalid type. Use "content" or "sendgrid".' });
    return callback(null, response);
  }

  try {
    let templates;
    if (type === 'content') {
      templates = await listTwilioContentTemplates(context);
    } else {
      templates = await listSendGridTemplates(context);
    }

    response.setStatusCode(200);
    response.setBody({ templates });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
