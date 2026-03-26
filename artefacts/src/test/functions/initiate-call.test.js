global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/initiate-call').handler;

describe('initiate-call function', () => {
  let mockContext, mockCallback, mockClient;

  beforeEach(() => {
    mockClient = {
      calls: { create: jest.fn().mockResolvedValue({
        sid: 'CA1234567890', status: 'queued'
      })}
    };
    mockContext = {
      TWILIO_PHONE_NUMBER: '+18005551234',
      CRELAY_BASE_URL: 'https://crelay.example.com',
      getTwilioClient: jest.fn(() => mockClient)
    };
    mockCallback = jest.fn();
  });

  test('creates call with recording notice TwiML and returns callSid', async () => {
    const event = { customerPhone: '+13125689550' };
    await handler(mockContext, event, mockCallback);

    expect(mockClient.calls.create).toHaveBeenCalledWith(expect.objectContaining({
      from: '+18005551234',
      to: '+13125689550',
      record: true,
      twiml: expect.stringContaining('recorded for quality'),
      statusCallback: 'https://crelay.example.com/status'
    }));

    // TwiML should redirect to CRelay /twiml
    const callArgs = mockClient.calls.create.mock.calls[0][0];
    expect(callArgs.twiml).toContain('<Redirect>https://crelay.example.com/twiml</Redirect>');

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { callSid: 'CA1234567890', status: 'queued' }
    }));
  });

  test('returns error when customerPhone missing', async () => {
    await handler(mockContext, {}, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 400
    }));
  });

  test('handles OPTIONS preflight', async () => {
    await handler(mockContext, { httpMethod: 'OPTIONS' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 200, _body: {}
    }));
  });
});
