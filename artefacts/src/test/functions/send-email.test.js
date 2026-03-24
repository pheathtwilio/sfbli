global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202, headers: { 'x-message-id': 'msg_123' } }])
}));

const sgMail = require('@sendgrid/mail');
const handler = require('../../functions/send-email').handler;

describe('send-email function', () => {
  let mockContext, mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      SENDGRID_API_KEY: 'SG.test_key',
      SENDGRID_FROM_EMAIL: 'demo@example.com'
    };
    mockCallback = jest.fn();
  });

  test('sends email with dynamic template and returns status', async () => {
    const event = {
      to: 'agent@example.com',
      templateId: 'd-abc123',
      dynamicData: JSON.stringify({ name: 'Marcus Rivera', region: 'Southeast' })
    };

    await handler(mockContext, event, mockCallback);

    expect(sgMail.setApiKey).toHaveBeenCalledWith('SG.test_key');
    expect(sgMail.send).toHaveBeenCalledWith({
      to: 'agent@example.com',
      from: 'demo@example.com',
      templateId: 'd-abc123',
      dynamicTemplateData: { name: 'Marcus Rivera', region: 'Southeast' }
    });

    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { status: 'sent', messageId: 'msg_123' }
    }));
  });

  test('returns error when to is missing', async () => {
    const event = { templateId: 'd-abc123' };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: expect.any(String) }
    }));
  });

  test('returns error when templateId is missing', async () => {
    const event = { to: 'agent@example.com' };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: expect.any(String) }
    }));
  });

  test('handles SendGrid API errors gracefully', async () => {
    sgMail.send.mockRejectedValue(new Error('Unauthorized'));
    const event = {
      to: 'agent@example.com',
      templateId: 'd-abc123',
      dynamicData: '{}'
    };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: 'Unauthorized' }
    }));
  });
});
