// Load shared message store — Runtime.getAssets() in Twilio, direct require in tests
let store;
try {
  const asset = Runtime.getAssets()['/message-store.js'];
  store = require(asset.path);
} catch (e) {
  store = require('../assets/message-store.private');
}

// Re-export for tests
exports._getMessages = store.getMessages;
exports._clearMessages = store.clearMessages;
exports.messageStore = store.messageStore;

exports.handler = async function (context, event, callback) {
  const { From, Body, MessageSid } = event;

  store.addMessage({
    from: From,
    body: Body,
    messageSid: MessageSid,
    channel: 'sms',
    timestamp: Date.now()
  });

  const twiml = new Twilio.twiml.MessagingResponse();
  return callback(null, twiml);
};
