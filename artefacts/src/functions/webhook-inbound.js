// Module-scoped message store — persists across warm invocations
const messageStore = [];

function _getMessages(since) {
  return messageStore.filter(m => m.timestamp > since);
}

function _clearMessages() {
  messageStore.length = 0;
}

exports._getMessages = _getMessages;
exports._clearMessages = _clearMessages;
exports.messageStore = messageStore;

exports.handler = async function (context, event, callback) {
  const { From, Body, MessageSid } = event;

  messageStore.push({
    from: From,
    body: Body,
    messageSid: MessageSid,
    channel: 'sms',
    timestamp: Date.now()
  });

  const twiml = new Twilio.twiml.MessagingResponse();
  return callback(null, twiml);
};
