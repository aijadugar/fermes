import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { agentRouter } from './agent.js';

const app = express();
app.use(cors()); // tighten this to your three.js frontend's origin before shipping
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/v1/agent', agentRouter);

app.listen(config.port, () => {
  console.log(`Agent backend listening on http://localhost:${config.port}`);
});
