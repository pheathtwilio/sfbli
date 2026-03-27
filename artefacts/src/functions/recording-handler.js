// Twilio Function: recording-handler
// Receives recordingStatusCallback events and submits completed recordings
// to Conversational Intelligence for transcription and analysis.

const INTELLIGENCE_SERVICE_SID = 'REDACTED_INTELLIGENCE_SERVICE_SID';

exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');

  const { RecordingSid, RecordingStatus, CallSid } = event;

  console.log(`Recording ${RecordingSid} status: ${RecordingStatus} (call: ${CallSid})`);

  // Only process completed recordings
  if (RecordingStatus !== 'completed') {
    response.setStatusCode(200);
    response.setBody({ status: 'skipped', reason: `status=${RecordingStatus}` });
    return callback(null, response);
  }

  try {
    const client = context.getTwilioClient();

    // Submit recording to Conversational Intelligence
    // The Twilio SDK uses form-encoded params; Channel must be a JSON string
    const transcript = await client.intelligence.v2.transcripts.create({
      serviceSid: INTELLIGENCE_SERVICE_SID,
      channel: JSON.stringify({
        media_properties: {
          source_sid: RecordingSid
        },
        participants: [
          {
            channel_participant: 1,
            role: 'agent',
            full_name: 'AI Agent'
          },
          {
            channel_participant: 2,
            role: 'customer',
            full_name: 'Customer'
          }
        ]
      })
    });

    console.log(`Transcript created: ${transcript.sid} for recording ${RecordingSid}`);

    response.setStatusCode(200);
    response.setBody({
      status: 'submitted',
      transcriptSid: transcript.sid,
      recordingSid: RecordingSid
    });
    return callback(null, response);
  } catch (err) {
    console.error('Intelligence submission error:', err.message);
    response.setStatusCode(200); // Don't fail the callback
    response.setBody({ status: 'error', error: err.message });
    return callback(null, response);
  }
};
