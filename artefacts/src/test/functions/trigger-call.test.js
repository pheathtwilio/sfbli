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
  let mockContext, mockCallback, mockClient, mockCallsCreate;

  beforeEach(() => {
    mockCallsCreate = jest.fn().mockResolvedValue({
      sid: 'CA1234567890',
      status: 'queued'
    });
    mockClient = {
      calls: {
        create: mockCallsCreate
      }
    };
    mockContext = {
      TWILIO_PHONE_NUMBER: '+15551234567',
      AGENT_PHONE_NUMBER: '+15559999999',
      getTwilioClient: jest.fn(() => mockClient)
    };
    mockCallback = jest.fn();
  });

  test('creates call with TwiML that dials agent', async () => {
    const event = { to: '+15559876543' };

    await handler(mockContext, event, mockCallback);

    expect(mockCallsCreate).toHaveBeenCalledWith({
      to: '+15559876543',
      from: '+15551234567',
      twiml: expect.stringContaining('account representative')
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
    mockCallsCreate.mockRejectedValue(new Error('Invalid number'));
    const event = { to: '+15559876543' };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: 'Invalid number' }
    }));
  });
});
