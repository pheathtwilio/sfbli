global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/trigger-call').handler;

describe('trigger-call function', () => {
  let mockContext, mockCallback, mockClient;

  beforeEach(() => {
    mockClient = {
      calls: {
        create: jest.fn().mockResolvedValue({
          sid: 'CA1234567890',
          status: 'queued'
        })
      }
    };
    mockContext = {
      TWILIO_PHONE_NUMBER: '+15551234567',
      STUDIO_FLOW_SID: 'FW1234567890',
      ACCOUNT_SID: 'AC1234567890',
      getTwilioClient: jest.fn(() => mockClient)
    };
    mockCallback = jest.fn();
  });

  test('creates outbound call pointing to Studio flow', async () => {
    const event = { to: '+15559876543' };

    await handler(mockContext, event, mockCallback);

    expect(mockClient.calls.create).toHaveBeenCalledWith({
      from: '+15551234567',
      to: '+15559876543',
      url: expect.stringContaining('FW1234567890')
    });

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { callSid: 'CA1234567890', status: 'queued' }
    }));
  });

  test('returns error when to is missing', async () => {
    const event = {};
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: expect.any(String) }
    }));
  });

  test('handles Twilio API errors gracefully', async () => {
    mockContext.getTwilioClient = jest.fn(() => ({
      calls: {
        create: jest.fn().mockRejectedValue(new Error('Invalid number'))
      }
    }));
    const event = { to: '+15559876543' };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: 'Invalid number' }
    }));
  });
});
