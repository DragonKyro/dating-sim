// Gemini REST wrapper. Pure transport — no game logic here.
// Player's API key is passed in per call (loaded from state by callers).

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Send a chat completion request to Gemini.
 *
 * @param {object} opts
 * @param {string} opts.apiKey      - Player BYOK key.
 * @param {string} opts.model       - e.g. "gemini-2.5-flash".
 * @param {string} opts.system      - System prompt text.
 * @param {Array<{role: "user"|"model", text: string}>} opts.messages - Conversation history.
 * @param {number} [opts.temperature=0.85]
 * @param {object} [opts.responseSchema] - Optional JSON schema for structured output.
 * @returns {Promise<string>} The text of the model's reply.
 */
export async function chat({ apiKey, model, system, messages, temperature = 0.85, responseSchema }) {
  if (!apiKey) throw new Error("missing API key");
  if (!model) throw new Error("missing model");

  const url = `${ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { temperature },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (responseSchema) {
    body.generationConfig.responseMimeType = "application/json";
    body.generationConfig.responseSchema = responseSchema;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

/** Validate that an API key works by sending a 1-token ping. */
export async function validateKey({ apiKey, model }) {
  try {
    await chat({
      apiKey,
      model,
      system: "",
      messages: [{ role: "user", text: "hi" }],
      temperature: 0,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
