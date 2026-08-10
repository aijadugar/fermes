import { chatCompletion } from './sarvam.js';
import { executeTool, toolSchemas } from './tools.js';

const SYSTEM_PROMPT = `You are a growing/farming assistant. You help anyone growing something —
backyard gardener, smallholder, or commercial grower — with:
1. Whether a specific site is suitable to grow in (soil, flood risk, elevation, climate).
2. Finding nearby suppliers, warehouses, dealers, or buyers.
Only the US and Canada have full data coverage; say so plainly if asked about elsewhere
instead of guessing. Always pass through the citations/sources tools give you — never
state a land fact without its source. Keep answers short, concrete, and in plain language.
If you don't have the person's coordinates yet, call resolve_location first.`;

const MAX_TOOL_ROUNDS = 4;

export async function handleMessage(history, userText) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: userText }];
  const toolTrace = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await chatCompletion({ messages, tools: toolSchemas });
    const choice = completion.choices[0];
    const message = choice.message;

    if (!message.tool_calls?.length) {
      const updatedHistory = [...history, { role: 'user', content: userText }, { role: 'assistant', content: message.content }];
      return { reply: message.content, history: updatedHistory, toolTrace };
    }

    messages.push(message);
    for (const call of message.tool_calls) {
      const args = JSON.parse(call.function.arguments || '{}');
      let result;
      try {
        result = await executeTool(call.function.name, args);
      } catch (err) {
        result = { error: err.message };
      }
      toolTrace.push({ tool: call.function.name, args, result });
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  throw new Error('Agent exceeded max tool-call rounds without producing a final answer.');
}
