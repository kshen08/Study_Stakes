// Thin client for a local Ollama server, using JSON-schema structured output.
export const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
export const MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';

export async function ollamaStatus() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!res.ok) return { running: false, model: MODEL, modelInstalled: false };
    const { models = [] } = await res.json();
    const names = models.map((m) => m.name);
    const modelInstalled = names.some((n) => n === MODEL || n === `${MODEL}:latest`);
    return { running: true, model: MODEL, modelInstalled, available: names };
  } catch {
    return { running: false, model: MODEL, modelInstalled: false };
  }
}

/** Ask the model for JSON matching `schema`. Returns the parsed object. */
export async function chatJSON({ system, user, schema, temperature = 0.4, maxTokens = 3000, timeoutMs = 180_000 }) {
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      think: false,
      format: schema,
      options: { temperature, num_ctx: 8192, num_predict: maxTokens, repeat_penalty: 1.1 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama error ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data.message?.content ?? '';
  try {
    return JSON.parse(content);
  } catch {
    // Some models wrap JSON in prose or code fences despite the schema; salvage the object.
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Model did not return valid JSON');
  }
}
