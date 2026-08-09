import { Router } from 'express';
import multer from 'multer';
import { transcribeAudio, textToSpeech } from './sarvam.js';
import { handleMessage } from './orchestrator.js';
import { getHistory, saveHistory } from './store.js';

const upload = multer({ storage: multer.memoryStorage() });
export const agentRouter = Router();

/**
 * POST /v1/agent/message
 * multipart/form-data fields:
 *   session_id   (required)
 *   text         (optional — text input)
 *   audio        (optional file — voice input, used if text is absent)
 *   language_code (optional, for STT hinting, e.g. "hi-IN")
 *   respond_with_audio ("true" to also return synthesized speech)
 */
agentRouter.post('/message', upload.single('audio'), async (req, res) => {
  try {
    const { session_id, text, language_code, respond_with_audio } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id is required' });

    let userText = text;
    if (!userText && req.file) {
      const transcribed = await transcribeAudio(req.file.buffer, req.file.originalname, { languageCode: language_code });
      userText = transcribed.text;
    }
    if (!userText) return res.status(400).json({ error: 'Provide either text or an audio file' });

    const history = getHistory(session_id);
    const { reply, history: updatedHistory, toolTrace } = await handleMessage(history, userText);
    saveHistory(session_id, updatedHistory);

    const response = { reply, transcript: userText, tool_trace: toolTrace };

    if (respond_with_audio === 'true') {
      response.audio_base64 = await textToSpeech(reply, { languageCode: language_code || 'en-IN' });
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
