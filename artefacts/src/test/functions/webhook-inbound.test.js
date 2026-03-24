global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  },
  twiml: {
    MessagingResponse: class {
      constructor() { this._xml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'; }
      toString() { return this._xml; }
    }
  }
};

const webhookHandler = require('../../functions/webhook-inbound').handler;
const { _getMessages, _clearMessages } = require('../../functions/webhook-inbound');

describe('webhook-inbound function', () => {
  let mockContext, mockCallback;

  beforeEach(() => {
    _clearMessages();
    mockContext = {};
    mockCallback = jest.fn();
  });

  test('stores inbound message from Twilio webhook payload', async () => {
    const event = { From: '+15559876543', Body: 'Thanks, I was busy last week', MessageSid: 'SM999' };
    await webhookHandler(mockContext, event, mockCallback);
    const messages = _getMessages(0);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      from: '+15559876543',
      body: 'Thanks, I was busy last week',
      channel: 'sms'
    });
    expect(messages[0].timestamp).toBeDefined();
  });

  test('returns TwiML response', async () => {
    const event = { From: '+15559876543', Body: 'Hello', MessageSid: 'SM999' };
    await webhookHandler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Object));
  });

  test('stores multiple messages in order', async () => {
    await webhookHandler(mockContext, { From: '+1555111', Body: 'First', MessageSid: 'SM1' }, jest.fn());
    await webhookHandler(mockContext, { From: '+1555222', Body: 'Second', MessageSid: 'SM2' }, jest.fn());
    const messages = _getMessages(0);
    expect(messages).toHaveLength(2);
    expect(messages[0].body).toBe('First');
    expect(messages[1].body).toBe('Second');
  });
});
