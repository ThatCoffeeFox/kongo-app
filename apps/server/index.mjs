import http from "node:http";
import { z } from "zod";
import { retrieveKnowledge } from "../../packages/ai/src/knowledge.mjs";

const webOrigins = new Set(
  (process.env.KONGO_WEB_ORIGINS || "http://127.0.0.1:5173")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean),
);
const port = Number(process.env.KONGO_PORT || 3210);
const base = (
  process.env.KONGO_MODEL_URL || "http://127.0.0.1:11434/v1"
).replace(/\/$/, "");
const model = process.env.KONGO_MODEL || "qwen3.5:9b";
const fallbackModel = "qwen3.5:4b";
const key = process.env.KONGO_MODEL_KEY || "";
const maxBody = 12 * 1024 * 1024;
let authHandler = null;
if (process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET) {
  const [
    { Pool },
    { drizzle },
    { betterAuth },
    { drizzleAdapter },
    { toNodeHandler },
    { authTables },
  ] = await Promise.all([
    import("pg"),
    import("drizzle-orm/node-postgres"),
    import("better-auth"),
    import("better-auth/adapters/drizzle"),
    import("better-auth/node"),
    import("../../packages/db/src/auth-schema.mjs"),
  ]);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const socialProviders = {};
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
    socialProviders.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  const auth = betterAuth({
    appName: "Kongo",
    baseURL: process.env.BETTER_AUTH_URL || "http://127.0.0.1:3210",
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [...webOrigins, "null"],
    database: drizzleAdapter(db, { provider: "pg", schema: authTables }),
    emailAndPassword: { enabled: true },
    socialProviders,
  });
  authHandler = toNodeHandler(auth);
}
const messageSchema = z
  .object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.union([
      z.string().max(15000),
      z
        .array(
          z
            .object({
              type: z.enum(["text", "image_url"]),
              text: z.string().max(10000).optional(),
              image_url: z
                .object({ url: z.string().max(10_500_000) })
                .optional(),
            })
            .strict(),
        )
        .max(16),
    ]),
  })
  .strict();

function send(res, status, body, origin = "http://127.0.0.1:5173") {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-credentials": "true",
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "content-type, x-kongo-token",
    "access-control-allow-methods": "POST, GET, OPTIONS",
  });
  res.end(JSON.stringify(body));
}
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  const desktopPreflight =
    origin === "null" &&
    req.method === "OPTIONS" &&
    /\bx-kongo-token\b/i.test(
      req.headers["access-control-request-headers"] || "",
    );
  const trusted =
    webOrigins.has(origin) ||
    desktopPreflight ||
    (origin === "null" &&
      process.env.KONGO_API_TOKEN &&
      req.headers["x-kongo-token"] === process.env.KONGO_API_TOKEN);
  if (!trusted)
    return send(
      res,
      403,
      { error: "This local API only accepts requests from the Kongo app." },
      "null",
    );
  if (
    origin === "null" &&
    req.method !== "OPTIONS" &&
    req.headers["x-kongo-token"] !== process.env.KONGO_API_TOKEN
  )
    return send(res, 403, { error: "Invalid desktop session." }, "null");
  if (req.method === "OPTIONS") return send(res, 204, {}, origin);
  if (req.url?.startsWith("/api/auth/")) {
    if (!authHandler)
      return send(
        res,
        503,
        {
          error:
            "Cloud account sign-in is disabled. Set DATABASE_URL and BETTER_AUTH_SECRET.",
        },
        origin,
      );
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("access-control-allow-credentials", "true");
    res.setHeader(
      "access-control-allow-headers",
      "content-type, x-kongo-token",
    );
    res.setHeader(
      "access-control-allow-methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.setHeader("vary", "Origin");
    return authHandler(req, res);
  }
  if (req.method === "GET" && req.url === "/api/status") {
    let installed = false,
      runnerAvailable = false;
    try {
      const tags = await fetch("http://127.0.0.1:11434/api/tags", {
        signal: AbortSignal.timeout(1200),
      }).then((r) => r.json());
      runnerAvailable = true;
      installed = (tags.models || []).some(
        (x) => x.name === model || x.name.startsWith(model + ":"),
      );
    } catch {}
    return send(
      res,
      200,
      {
        ready: runnerAvailable && installed,
        authAvailable: Boolean(authHandler),
        authProviders: [
          ...(process.env.GOOGLE_CLIENT_ID ? ["google"] : []),
          ...(process.env.GITHUB_CLIENT_ID ? ["github"] : []),
        ],
        bridge: true,
        runnerAvailable,
        endpoint: base,
        model,
        fallbackModel,
        installed,
        setupCommand: `ollama pull ${model}`,
        fallbackCommand: `ollama pull ${fallbackModel}`,
        local: /localhost|127\.0\.0\.1/.test(base),
      },
      origin,
    );
  }
  if (req.method !== "POST" || req.url !== "/api/chat")
    return send(res, 404, { error: "Not found" }, origin);
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > maxBody)
      return send(
        res,
        413,
        { error: "Request is too large. Try a smaller image." },
        origin,
      );
  }
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return send(res, 400, { error: "Invalid request." }, origin);
  }
  if (!Array.isArray(payload.messages) || payload.messages.length > 40)
    return send(
      res,
      400,
      { error: "Messages must be an array of at most 40 items." },
      origin,
    );
  const validated = payload.messages.map((m) => messageSchema.safeParse(m));
  if (validated.some((r) => !r.success))
    return send(
      res,
      400,
      { error: "A message has an invalid role or content shape." },
      origin,
    );
  try {
    const promptText = payload.messages
      .filter((m) => m.role === "user")
      .map((m) =>
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
            ? m.content
                .filter((p) => p.type === "text")
                .map((p) => p.text)
                .join(" ")
            : "",
      )
      .join(" ");
    const retrieved = retrieveKnowledge(promptText, 3);
    const evidence = retrieved.length
      ? `\n\nRetrieved Kongo reference notes (use only passages that directly support the answer; cite a used passage inline with its [number]):\n${retrieved.map((s, i) => `[${i + 1}] ${s.title} — ${s.section} (${s.level}): ${s.content} Example: ${s.example}`).join("\n")}`
      : "\n\nNo verified reference note matches this turn. Do not provide textbook citations; say when you are answering from general language knowledge.";
    const quizInstructions =
      payload.mode === "quiz"
        ? `\n\nThis is quiz-generation mode. Produce JSON only with this exact structure: {"questions":[{"prompt":"...","answer":"...","choices":["...","...","...","..."],"explanation":"..."}]}. Make five distinct JLPT-level questions from the supplied cards and conversation: vary vocabulary, a natural cloze, particles when the context supports them, reading, and register. Ensure exactly one choice is correct and answer exactly matches a choice. Do not invent source citations.`
        : "";
    const imageInstructions = payload.imageMode
      ? `\n\nThis is an image reading task. Inspect Japanese text carefully, keep the scene interpretation separate, and return ONLY valid JSON with this shape: {"scene":"brief visual context","regions":[{"box_2d":[ymin,xmin,ymax,xmax],"text":"exact Japanese text","reading":"kana reading","translation":"natural meaning","confidence":0.0,"writing_direction":"horizontal or vertical"}]}. Coordinates are integers from 0 to 1000 relative to image height/width, origin top left. Include each text region. If no Japanese text is visible, return an empty regions array. Do not guess unreadable characters; set confidence low.`
      : "";
    const messages = payload.messages.map((m, i) =>
      i === 0 && m.role === "system"
        ? {
            ...m,
            content:
              m.content + evidence + quizInstructions + imageInstructions,
          }
        : m,
    );
    const shouldStream = payload.stream === true && !payload.imageMode;
    const upstream = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(key ? { authorization: `Bearer ${key}` } : {}),
      },
      signal: AbortSignal.timeout(180000),
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.55,
        reasoning_effort: "none",
        max_tokens: payload.imageMode ? 1800 : 1200,
        stream: shouldStream,
      }),
    });
    if (!upstream.ok) {
      let errorBody = {};
      try {
        errorBody = await upstream.json();
      } catch {}
      return send(
        res,
        upstream.status,
        {
          error:
            errorBody?.error?.message ||
            `Model endpoint returned ${upstream.status}.`,
          model,
          fallbackModel,
        },
        origin,
      );
    }
    if (shouldStream && upstream.body) {
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
        "access-control-allow-origin": origin,
        "access-control-allow-headers": "content-type, x-kongo-token",
        "access-control-allow-methods": "POST, GET, OPTIONS",
      });
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let pending = "",
        content = "";
      const sendDelta = (part) => {
        if (part) {
          content += part;
          res.write(
            `data: ${JSON.stringify({ type: "delta", content: part })}\n\n`,
          );
        }
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split("\n");
        pending = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const event = JSON.parse(data);
            const part = event.choices?.[0]?.delta?.content;
            if (typeof part === "string") sendDelta(part);
            else if (Array.isArray(part))
              for (const piece of part)
                if (piece.type === "text" && typeof piece.text === "string")
                  sendDelta(piece.text);
          } catch {}
        }
      }
      const citedNumbers = new Set(
        [...content.matchAll(/\[(\d+)\]/g)]
          .map((m) => Number(m[1]) - 1)
          .filter((i) => Number.isInteger(i) && i >= 0 && i < retrieved.length),
      );
      const citations = [...citedNumbers].map((i) => retrieved[i]);
      res.write(
        `data: ${JSON.stringify({ type: "done", model, citations })}\n\n`,
      );
      return res.end();
    }
    const result = await upstream.json();
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== "string")
      return send(
        res,
        502,
        { error: "The model returned an unexpected response." },
        origin,
      );
    const citedNumbers = new Set(
      [...content.matchAll(/\[(\d+)\]/g)]
        .map((m) => Number(m[1]) - 1)
        .filter((i) => Number.isInteger(i) && i >= 0 && i < retrieved.length),
    );
    const citations = [...citedNumbers].map((i) => retrieved[i]);
    return send(
      res,
      200,
      { content, model, usage: result.usage || null, citations },
      origin,
    );
  } catch (error) {
    return send(
      res,
      503,
      {
        error: `Cannot reach ${base}. Install Ollama, run \`${model}\`, or update KONGO_MODEL_URL.`,
        detail: String(error?.message || error),
        model,
        fallbackModel,
      },
      origin,
    );
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Kongo model bridge listening on http://127.0.0.1:${port}`),
);
