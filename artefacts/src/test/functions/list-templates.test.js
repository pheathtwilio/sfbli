global.Twilio = {
  Response: class {
    constructor() { this._statusCode = 200; this._headers = {}; this._body = null; }
    setStatusCode(code) { this._statusCode = code; }
    appendHeader(key, value) { this._headers[key] = value; }
    setBody(body) { this._body = body; }
  }
};

jest.mock('@sendgrid/client', () => ({
  setApiKey: jest.fn(),
  request: jest.fn().mockResolvedValue([{
    statusCode: 200,
    body: {
      result: [
        { id: 'd-abc123', name: 'Re-engagement', updated_at: '2026-01-01' },
        { id: 'd-def456', name: 'Policy Update', updated_at: '2026-02-01' }
      ]
    }
  }])
}));

const handler = require('../../functions/list-templates').handler;

describe('list-templates function', () => {
  let mockContext, mockCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      SENDGRID_API_KEY: 'SG.test_key',
      getTwilioClient: jest.fn(() => ({
        content: {
          v1: {
            contents: {
              list: jest.fn().mockResolvedValue([
                { sid: 'HX111', friendlyName: 'Welcome Card', types: { 'twilio/card': {} } },
                { sid: 'HX222', friendlyName: 'Promo Carousel', types: { 'twilio/carousel': {} } }
              ])
            }
          }
        }
      }))
    };
    mockCallback = jest.fn();
  });

  test('returns Twilio content templates when type is content', async () => {
    const event = { type: 'content' };
    await handler(mockContext, event, mockCallback);
    const result = mockCallback.mock.calls[0][1]._body;
    expect(result.templates).toHaveLength(2);
    expect(result.templates[0]).toMatchObject({ id: 'HX111', name: 'Welcome Card' });
  });

  test('returns SendGrid templates when type is sendgrid', async () => {
    const event = { type: 'sendgrid' };
    await handler(mockContext, event, mockCallback);
    const result = mockCallback.mock.calls[0][1]._body;
    expect(result.templates).toHaveLength(2);
    expect(result.templates[0]).toMatchObject({ id: 'd-abc123', name: 'Re-engagement' });
  });

  test('returns error for invalid type', async () => {
    const event = { type: 'invalid' };
    await handler(mockContext, event, mockCallback);
    expect(mockCallback).toHaveBeenCalledWith(null, expect.objectContaining({
      _body: { error: expect.any(String) }
    }));
  });
});
