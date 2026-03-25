global.Twilio = {
  twiml: {
    MessagingResponse: class {
      constructor() { this._xml = '<Response/>'; }
      toString() { return this._xml; }
    }
  }
};

const handler = require('../../functions/webhook-inbound').handler;

describe('webhook-inbound function', () => {
  let mockContext, mockCallback, mockCreate, mockFetch;

  beforeEach(() => {
    mockCreate = jest.fn().mockResolvedValue({ index: 0 });
    mockFetch = jest.fn().mockResolvedValue({ uniqueName: 'inbound_messages' });
    const mockSyncService = {
      syncLists: jest.fn(() => ({
        fetch: mockFetch,
        syncListItems: { create: mockCreate }
      }))
    };
    mockContext = {
      getTwilioClient: jest.fn(() => ({
        sync: { v1: { services: jest.fn(() => mockSyncService) } }
      }))
    };
    mockCallback = jest.fn();
  });

  test('stores inbound message in Sync list', async () => {
    const event = { From: '+15559876543', Body: 'Thanks, I was busy last week', MessageSid: 'SM999' };
    await handler(mockContext, event, mockCallback);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        from: '+15559876543',
        body: 'Thanks, I was busy last week',
        messageSid: 'SM999',
        channel: 'sms'
      })
    });
  });

  test('returns TwiML response', async () => {
    const event = { From: '+15559876543', Body: 'Hello', MessageSid: 'SM999' };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.any(Object));
  });

  test('creates Sync list if it does not exist', async () => {
    mockFetch.mockRejectedValue({ code: 20404 });
    const mockSyncLists = mockContext.getTwilioClient().sync.v1.services().syncLists;
    mockSyncLists.create = jest.fn().mockResolvedValue({ uniqueName: 'inbound_messages' });

    const event = { From: '+1555111', Body: 'First', MessageSid: 'SM1' };
    await handler(mockContext, event, mockCallback);

    expect(mockSyncLists.create).toHaveBeenCalledWith({ uniqueName: 'inbound_messages' });
    expect(mockCallback).toHaveBeenCalled();
  });
});
