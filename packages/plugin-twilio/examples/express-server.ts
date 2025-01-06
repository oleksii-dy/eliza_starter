import express from 'express';
import { twilioPlugin } from '@elizaos/plugin-twilio';
import { Runtime } from '@elizaos/core';

const app = express();
app.use(express.json());

// Initialize runtime with plugin
const runtime = new Runtime({
  plugins: [twilioPlugin]
});

// Handle incoming SMS webhooks
app.post('/webhook/sms', async (req, res) => {
  const { From, Body } = req.body;

  try {
    // Process message through Eliza's main logic
    const elizaResponse = await runtime.processMessage(Body);

    // Send response via SMS
    await runtime.triggerAction('SEND_SMS', {
      to: From,
      message: elizaResponse
    });

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling SMS:', error);
    res.sendStatus(500);
  }
});

// Handle voice calls
app.post('/webhook/voice', async (req, res) => {
  try {
    const { audioBuffer } = req.body;

    // Transcribe incoming audio
    const transcribeResult = await runtime.triggerAction('TRANSCRIBE_AUDIO', {
      audioBuffer
    });

    if (!transcribeResult.success) {
      throw new Error(transcribeResult.error);
    }

    // Process transcribed text through Eliza
    const elizaResponse = await runtime.processMessage(transcribeResult.transcript);

    // Convert Eliza's response to speech
    const speechResult = await runtime.triggerAction('TEXT_TO_SPEECH', {
      text: elizaResponse
    });

    if (!speechResult.success) {
      throw new Error(speechResult.error);
    }

    // Return audio response
    res.send(speechResult.audioBuffer);
  } catch (error) {
    console.error('Error handling voice call:', error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});