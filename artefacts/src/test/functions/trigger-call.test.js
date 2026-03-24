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
  let mockContext, mockCallback, mockClient, mockExecutionsCreate;

  beforeEach(() => {
    mockExecutionsCreate = jest.fn().mockResolvedValue({
      sid: 'FN1234567890',
      status: 'active'
    });
    mockClient = {
      studio: {
        v2: {
          flows: jest.fn(() => ({
            executions: {
              create: mockExecutionsCreate
            }
          }))
        }
      }
    };
    mockContext = {
      TWILIO_PHONE_NUMBER: '+15551234567',
      STUDIO_FLOW_SID: 'FW1234567890',
      ACCOUNT_SID: 'AC1234567890',
      AGENT_PHONE_NUMBER: '+15559999999',
      getTwilioClient: jest.fn(() => mockClient)
    };
    mockCallback = jest.fn();
  });

  test('creates Studio execution with agent_phone parameter', async () => {
    const event = { to: '+15559876543' };

    await handler(mockContext, event, mockCallback);

    expect(mockClient.studio.v2.flows).toHaveBeenCalledWith('FW1234567890');
    expect(mockExecutionsCreate).toHaveBeenCalledWith({
      to: '+15559876543',
      from: '+15551234567',
      parameters: JSON.stringify({ agent_phone: '+15559999999' })
    });

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { callSid: 'FN1234567890', status: 'active' }
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
    mockExecutionsCreate.mockRejectedValue(new Error('Invalid number'));
    const event = { to: '+15559876543' };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: 'Invalid number' }
    }));
  });
});
