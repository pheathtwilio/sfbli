global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const { messageStore, _clearMessages } = require('../../functions/webhook-inbound');
const handler = require('../../functions/poll-messages').handler;

describe('poll-messages function', () => {
  let mockContext, mockCallback;

  beforeEach(() => {
    _clearMessages();
    mockContext = {};
    mockCallback = jest.fn();
  });

  test('returns messages since given timestamp', async () => {
    const oldTime = Date.now() - 5000;
    messageStore.push(
      { from: '+1555111', body: 'Old msg', channel: 'sms', timestamp: oldTime },
      { from: '+1555222', body: 'New msg', channel: 'sms', timestamp: Date.now() }
    );
    const event = { since: String(oldTime) };
    await handler(mockContext, event, mockCallback);
    const result = mockCallback.mock.calls[0][1]._body;
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].body).toBe('New msg');
  });

  test('returns empty array when no new messages', async () => {
    const event = { since: String(Date.now()) };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { messages: [] }
    }));
  });

  test('returns all messages when since is 0', async () => {
    messageStore.push(
      { from: '+1555111', body: 'Msg 1', channel: 'sms', timestamp: Date.now() },
      { from: '+1555222', body: 'Msg 2', channel: 'sms', timestamp: Date.now() + 1 }
    );
    const event = { since: '0' };
    await handler(mockContext, event, mockCallback);
    const result = mockCallback.mock.calls[0][1]._body;
    expect(result.messages).toHaveLength(2);
  });
});
