global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/poll-messages').handler;

describe('poll-messages function', () => {
  let mockContext, mockCallback;

  function buildContext(items) {
    const mockList = jest.fn().mockResolvedValue(
      items.map((data, i) => ({ index: i, data }))
    );
    const mockSyncService = {
      syncLists: jest.fn(() => ({
        fetch: jest.fn().mockResolvedValue({ uniqueName: 'inbound_messages' }),
        syncListItems: { list: mockList }
      }))
    };
    return {
      getTwilioClient: jest.fn(() => ({
        sync: { v1: { services: jest.fn(() => mockSyncService) } }
      }))
    };
  }

  beforeEach(() => {
    mockCallback = jest.fn();
  });

  test('returns messages since given timestamp', async () => {
    const oldTime = Date.now() - 5000;
    mockContext = buildContext([
      { from: '+1555222', body: 'New msg', channel: 'sms', timestamp: Date.now() },
      { from: '+1555111', body: 'Old msg', channel: 'sms', timestamp: oldTime }
    ]);
    const event = { since: String(oldTime) };
    await handler(mockContext, event, mockCallback);
    const result = mockCallback.mock.calls[0][1]._body;
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].body).toBe('New msg');
  });

  test('returns empty array when no new messages', async () => {
    mockContext = buildContext([]);
    const event = { since: String(Date.now()) };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { messages: [] }
    }));
  });

  test('returns empty array when Sync list does not exist', async () => {
    const mockSyncService = {
      syncLists: jest.fn(() => ({
        syncListItems: { list: jest.fn().mockRejectedValue({ code: 20404 }) }
      }))
    };
    mockContext = {
      getTwilioClient: jest.fn(() => ({
        sync: { v1: { services: jest.fn(() => mockSyncService) } }
      }))
    };
    const event = { since: '0' };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { messages: [] }
    }));
  });
});
