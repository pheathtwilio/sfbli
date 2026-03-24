// Mock Twilio.Response for unit tests
global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

const handler = require('../../functions/send-rcs').handler;

describe('send-rcs function', () => {
  let mockContext, mockCallback, mockClient;

  beforeEach(() => {
    mockClient = {
      messages: {
        create: jest.fn().mockResolvedValue({
          sid: 'SM1234567890',
          status: 'queued'
        })
      }
    };
    mockContext = {
      TWILIO_PHONE_NUMBER: '+15551234567',
      MESSAGING_SERVICE_SID: 'MG1234567890',
      getTwilioClient: jest.fn(() => mockClient)
    };
    mockCallback = jest.fn();
  });

  test('sends message with content template and returns messageSid', async () => {
    const event = {
      to: '+15559876543',
      contentSid: 'HX1234567890',
      contentVariables: JSON.stringify({ '1': 'Marcus Rivera' })
    };

    await handler(mockContext, event, mockCallback);

    expect(mockClient.messages.create).toHaveBeenCalledWith({
      messagingServiceSid: 'MG1234567890',
      to: '+15559876543',
      contentSid: 'HX1234567890',
      contentVariables: JSON.stringify({ '1': 'Marcus Rivera' })
    });

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { messageSid: 'SM1234567890', status: 'queued' }
    }));
  });

  test('returns error when to is missing', async () => {
    const event = { contentSid: 'HX1234567890' };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: 'Missing required fields: to, contentSid' }
    }));
  });

  test('returns error when contentSid is missing', async () => {
    const event = { to: '+15559876543' };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: 'Missing required fields: to, contentSid' }
    }));
  });

  test('handles Twilio API errors gracefully', async () => {
    mockContext.getTwilioClient = jest.fn(() => ({
      messages: {
        create: jest.fn().mockRejectedValue(new Error('Invalid phone number'))
      }
    }));

    const event = {
      to: '+15559876543',
      contentSid: 'HX1234567890',
      contentVariables: '{}'
    };

    await handler(mockContext, event, mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: 'Invalid phone number' }
    }));
  });
});
