# Kongo コンゴ

A Japanese-learning workspace centered on Sensei conversation. Chat, phrase-level grammar help, lesson cards, FSRS reviews, quizzes, and image reading share one learning space.

## Local development

Requires Node.js 22.12+ and npm (this machine has Node 24.13). Bun 1.2+ is used in CI and can run the same workspace scripts. Electron is included in the workspace.

1. Install dependencies: `npm install`
2. Optional: start Postgres/pgvector: `docker compose up -d postgres`
3. Install [Ollama](https://ollama.com/download) and pull the local multimodal model: `ollama pull qwen3.5:9b`
4. Start the app: `npm run dev` (web) or `npm run desktop:dev` (Electron).
5. For a full UI + local-model smoke test, run `npm run test:e2e` (requires Ollama and the model to be running).

This PC has an RTX 3070 (8 GB VRAM), 16 GB RAM, and an i5-12400F. Kongo defaults to `qwen3.5:9b` (Q4, about 6.6 GB) as one model for Japanese tutoring and vision. Keep context at 4K for headroom. If the model is slow or the GPU runs out of memory, use `ollama pull qwen3.5:4b` and start Kongo with `KONGO_MODEL=qwen3.5:4b`. The runner/model is a local dependency; install is not attempted silently.

For the production web service, add the public site origin to `KONGO_WEB_ORIGINS` as a comma-separated exact-origin allowlist. Electron uses a per-launch API token.

For an OpenAI-compatible remote endpoint, set `KONGO_MODEL_URL`, `KONGO_MODEL`, and `KONGO_MODEL_KEY` in the environment before starting `npm run bridge`. Credentials stay in the local bridge process. Do not put secrets in Vite environment variables.

## Architecture

- `apps/web`: React + TypeScript renderer, responsive in web and Electron.
- `apps/desktop`: Electron main/preload with context isolation, sandbox, and no Node in the renderer.
- `apps/server`: local model adapter and service API.
- `packages/srs`: FSRS-5 scheduling with published default weights using `ts-fsrs`.
- `packages/db`: Drizzle PostgreSQL schema and pgvector migration.
- Local browser study records use IndexedDB, so the learning loop works without accounts or a database. PostgreSQL is the shared-service/RAG persistence boundary as the local service grows.

The starter grammar shelf contains original beginner notes, not textbook excerpts. Source references are only shown for these notes; the tutor prompt is instructed not to fabricate citations.
