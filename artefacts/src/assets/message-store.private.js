// Shared message store for webhook-inbound and poll-messages functions
// Deployed as a private Twilio Asset, accessed via Runtime.getAssets()

const messageStore = [];

function getMessages(since) {
  return messageStore.filter(m => m.timestamp > since);
}

function addMessage(msg) {
  messageStore.push(msg);
}

function clearMessages() {
  messageStore.length = 0;
}

module.exports = { messageStore, getMessages, addMessage, clearMessages };
