exports.handler = async function (context, event, callback) {
  const { From, Body, MessageSid } = event;

  try {
    const client = context.getTwilioClient();
    const syncService = client.sync.v1.services('default');

    // Ensure the SyncList exists
    try {
      await syncService.syncLists('inbound_messages').fetch();
    } catch (e) {
      if (e.code === 20404) {
        await syncService.syncLists.create({ uniqueName: 'inbound_messages' });
      }
    }

    await syncService.syncLists('inbound_messages').syncListItems.create({
      data: {
        from: From,
        body: Body,
        messageSid: MessageSid,
        channel: 'sms',
        timestamp: Date.now()
      }
    });
  } catch (err) {
    console.error('Failed to store inbound message:', err.message);
  }

  const twiml = new Twilio.twiml.MessagingResponse();
  return callback(null, twiml);
};
