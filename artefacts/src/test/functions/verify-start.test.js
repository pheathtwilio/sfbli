global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/verify-start').handler;

describe('verify-start function', () => {
  let mockContext, mockCallback, mockClient, mockCreate;

  beforeEach(() => {
    mockCreate = jest.fn().mockResolvedValue({
      sid: 'VE1234567890', status: 'pending', channel: 'sms'
    });
    mockClient = {
      verify: { v2: { services: jest.fn().mockReturnValue({
        verifications: { create: mockCreate }
      })}}
    };
    mockContext = {
      VERIFY_SERVICE_SID: 'VA1234567890',
      getTwilioClient: jest.fn(() => mockClient)
    };
    mockCallback = jest.fn();
  });

  test('creates verification and returns sid', async () => {
    await handler(mockContext, { phone: '+13125689550' }, mockCallback);
    expect(mockClient.verify.v2.services).toHaveBeenCalledWith('VA1234567890');
    expect(mockCreate).toHaveBeenCalledWith({ to: '+13125689550', channel: 'sms' });
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { sid: 'VE1234567890', status: 'pending', channel: 'sms' }
    }));
  });

  test('uses specified channel', async () => {
    await handler(mockContext, { phone: '+13125689550', channel: 'whatsapp' }, mockCallback);
    expect(mockCreate).toHaveBeenCalledWith({ to: '+13125689550', channel: 'whatsapp' });
  });

  test('returns error when phone is missing', async () => {
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
