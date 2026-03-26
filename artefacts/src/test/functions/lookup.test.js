global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/lookup').handler;

describe('lookup function', () => {
  let mockContext, mockCallback, mockClient;

  beforeEach(() => {
    mockClient = {
      lookups: { v2: { phoneNumbers: jest.fn().mockReturnValue({
        fetch: jest.fn().mockResolvedValue({
          valid: true,
          callerName: { caller_name: 'Maria Santos' },
          lineTypeIntelligence: { type: 'mobile', carrier: { name: 'T-Mobile' } },
          phoneNumber: '+13125689550'
        })
      })}}
    };
    mockContext = { getTwilioClient: jest.fn(() => mockClient) };
    mockCallback = jest.fn();
  });

  test('returns lookup data for valid phone', async () => {
    await handler(mockContext, { phone: '+13125689550' }, mockCallback);
    expect(mockClient.lookups.v2.phoneNumbers).toHaveBeenCalledWith('+13125689550');
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: expect.objectContaining({
        valid: true,
        callerName: 'Maria Santos',
        lineType: 'mobile',
        isNonFixedVoip: false
      })
    }));
  });

  test('flags non-fixed VoIP numbers', async () => {
    mockClient.lookups.v2.phoneNumbers = jest.fn().mockReturnValue({
      fetch: jest.fn().mockResolvedValue({
        valid: true,
        callerName: null,
        lineTypeIntelligence: { type: 'nonFixedVoip', carrier: { name: 'Google Voice' } },
        phoneNumber: '+15551234567'
      })
    });
    await handler(mockContext, { phone: '+15551234567' }, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: expect.objectContaining({ isNonFixedVoip: true })
    }));
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
