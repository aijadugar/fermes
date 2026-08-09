import { Router } from 'express';
import multer from 'multer';
import { transcribeAudio, textToSpeech } from './sarvam.js';
import { handleMessage } from './orchestrator.js';
import { store } from './store.js';
import { ValidationError } from './errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export const agentRouter = Router();

agentRouter.post('/message', upload.single('audio'), async (req, res, next) => {
  try {
    const { session_id, text, language_code, respond_with_audio } = req.body;
    if (!session_id) throw new ValidationError('session_id is required');

    let userText = text;
    if (!userText && req.file) {
      const transcribed = await transcribeAudio(req.file.buffer, req.file.originalname, {
        languageCode: language_code,
      });
      userText = transcribed.text;
    }
    if (!userText) throw new ValidationError('Provide either text or an audio file');

    const history = await store.getHistory(session_id);
    const { reply, history: updatedHistory, toolTrace } = await handleMessage(history, userText);
    await store.saveHistory(session_id, updatedHistory);

    const response = { reply, transcript: userText, tool_trace: toolTrace };

    if (respond_with_audio === 'true') {
      response.audio_base64 = await textToSpeech(reply, {
        languageCode: language_code || 'en-IN',
      });
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
});
