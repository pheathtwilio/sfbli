exports.handler = function (context, event, callback) {
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

  response.setStatusCode(200);
  response.setBody({
    promoContentSid: context.PROMO_CONTENT_SID || '',
    journeyRcsContentSid: context.JOURNEY_RCS_CONTENT_SID || '',
    policyChangeEmailTemplateId: context.POLICY_CHANGE_EMAIL_TEMPLATE_ID || '',
    promoEmailTemplateId: context.PROMO_EMAIL_TEMPLATE_ID || ''
  });
  return callback(null, response);
};
