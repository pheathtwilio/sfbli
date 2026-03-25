const sgMail = require('@sendgrid/mail');

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

  const { to, templateId, dynamicData } = event;
  const resolvedTemplateId = templateId || context.PROMO_EMAIL_TEMPLATE_ID;

  if (!to || !resolvedTemplateId) {
    response.setStatusCode(400);
    response.setBody({ error: 'Missing required fields: to, templateId (or set PROMO_EMAIL_TEMPLATE_ID env var)' });
    return callback(null, response);
  }

  try {
    sgMail.setApiKey(context.SENDGRID_API_KEY);
    const parsedData = dynamicData ? JSON.parse(dynamicData) : {};

    const [result] = await sgMail.send({
      to,
      from: context.SENDGRID_FROM_EMAIL,
      templateId: resolvedTemplateId,
      dynamicTemplateData: parsedData
    });

    response.setStatusCode(200);
    response.setBody({
      status: 'sent',
      messageId: result.headers['x-message-id'] || null
    });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
