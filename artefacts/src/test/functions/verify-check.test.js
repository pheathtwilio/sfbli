global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/verify-check').handler;

describe('verify-check function', () => {
  let mockContext, mockCallback, mockClient;

  beforeEach(() => {
    mockClient = {
      verify: { v2: { services: jest.fn().mockReturnValue({
        verificationChecks: { create: jest.fn().mockResolvedValue({
          status: 'approved', valid: true
        })}
      })}}
    };
    mockContext = {
      VERIFY_SERVICE_SID: 'VA1234567890',
      getTwilioClient: jest.fn(() => mockClient)
    };
    mockCallback = jest.fn();
  });

  test('checks code and returns approved', async () => {
    await handler(mockContext, { phone: '+13125689550', code: '472918' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { valid: true, status: 'approved' }
    }));
  });

  test('returns error when phone or code missing', async () => {
    await handler(mockContext, { phone: '+13125689550' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 400
    }));
  });

  test('handles failed verification', async () => {
    mockClient.verify.v2.services = jest.fn().mockReturnValue({
      verificationChecks: { create: jest.fn().mockResolvedValue({
        status: 'pending', valid: false
      })}
    });
    await handler(mockContext, { phone: '+13125689550', code: '000000' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { valid: false, status: 'pending' }
    }));
  });

  test('handles OPTIONS preflight', async () => {
    await handler(mockContext, { httpMethod: 'OPTIONS' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _statusCode: 200, _body: {}
    }));
  });
});
