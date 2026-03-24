// Load shared message store — Runtime.getAssets() in Twilio, direct require in tests
let store;
try {
  const asset = Runtime.getAssets()['/message-store.js'];
  store = require(asset.path);
} catch (e) {
  store = require('../assets/message-store.private');
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

  const since = parseInt(event.since || '0', 10);
  const messages = store.getMessages(since);

  response.setStatusCode(200);
  response.setBody({ messages });
  return callback(null, response);
};
