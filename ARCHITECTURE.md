# TASK SPECIFICATION: Build "コンゴ (kongo)" — 2026 AI Japanese Learning Platform

You are an expert Principal Full-Stack Engineer, Desktop Architect, and AI Systems Specialist.
Your mission is to scaffold, implement, test, and ship **コンゴ (kongo)**: a high-performance desktop and web Japanese learning application featuring a digital Sensei, RAG-grounded pedagogical flashcards (FSRS-5), automated testing, and unified vision-grounded Japanese OCR.

---

## 1. PROJECT OVERVIEW & VISUAL IDENTITY
- **App Name:** コンゴ (kongo)
- **Target Platform:** Desktop (Electron) with hybrid Web-ready architecture.
- **Visual Aesthetic:** "Matte Fox" (Kitsune / Inari-inspired).
  - Primary Accent: Matte Fox Orange (`#E06A3B` / `#D45D2C`).
  - Surfaces: Dark Charcoal Slate (`#18181B`, `#222226`) in dark mode; Warm Linen/Washi (`#F9F7F4`, `#F2ECE4`) in light mode.
  - UI Details: Matte borders (`border-fox-orange/20`), non-glossy elevation, subtle paper textures, and elegant Japanese typography (Shippori Mincho / Noto Sans JP).
  - Kitsune Mascot: Contextual fox avatar representing Sensei states (meditating, teaching, thinking, celebrating, sleeping).

---

## 2. TECH STACK SPECIFICATIONS (2026 Modern Standard)

1. **Runtime & Core Tooling:**
   - Runtime: `bun` (v1.2+) across the entire workspace.
   - Code Quality: `Biome` (`biome.json`) for zero-overhead linting, formatting, and import sorting.
   - Testing: `bun test` with mock factories for inference and vector retrieval.

2. **Frontend & Desktop Shell:**
   - Desktop Shell: `electron` with secure context bridges (`contextIsolation: true`, `sandbox: true`).
   - Renderer Framework: `React 19` + `TypeScript` + `Vite` (compatible with both Electron renderer and standalone web builds).
   - Component & Styling: `Tailwind CSS v4` + `shadcn/ui` (customized to the Matte Fox palette) + `lucide-react`.
   - Japanese Language Processing: WASM-based Japanese tokenizer (e.g., `kuromoji` or WebAssembly `vibrato`) for instant client-side furigana and lemma tagging.

3. **Backend, Database & Vector RAG:**
   - Database: PostgreSQL with `pgvector` extension.
   - ORM: `Drizzle ORM` with automated type-safe migrations.
   - RAG Pipeline: Vector embeddings for Japanese textbook chunks (Genki, Tae Kim, Dictionary of Basic/Intermediate/Advanced Japanese Grammar) using high-efficiency multilingual embeddings (e.g., `bge-m3` or `text-embedding-3`).

4. **Authentication:**
   - `better-auth` (supporting email/password and social OAuth) integrated with local session storage and Electron IPC state sharing.

5. **AI Inference & Local Model Architecture:**
   - Provide an abstracted inference client supporting local endpoints (Ollama / vLLM / llama.cpp) with fallback to OpenAI/Anthropic-compatible APIs (e.g., GPT-6 Astra, Claude 4.5/5, or Gemini 2.5 Flash).
   - **Text & Sensei Chat:** Default to **Qwen 2.5 7B-Instruct** (or **Qwen3 8B**). Support **DeepSeek-R1-Distill-Qwen-8B** for complex grammatical chain-of-thought breakdowns.
   - **Vision & Real-World OCR:** Default to **Qwen2.5-VL-7B-Instruct** (or **3B** for low-memory profiles).
     - Must leverage Qwen2.5-VL's native 2D bounding boxes (`{"box_2d": [ymin, xmin, ymax, xmax], "text": "...", "translation": "..."}`) to recognize horizontal and vertical Japanese text while synthesizing overall scene context.

---

## 3. CORE FUNCTIONAL MODULES

### A. Sensei Conversational Engine
- **Natural Discourse:** Sensei adapts to the user's JLPT level (N5–N1), outputting interactive tokenized Japanese text with clickable/hoverable ruby furigana.
- **Active Pedagogy:** Sensei isolates new vocabulary, idioms, and grammatical structures in each response, rendering them as interactive "Focus Badges".
- **Interactive Highlighting:** Selecting any Japanese text bubble prompts an inline action menu:
  - 🦊 *"Sensei, explain this grammar point"*
  - 📖 *"Add to Lesson Cards"*
  - 🔍 *"Breakdown breakdown (particles & conjugations)"*
- **RAG-Grounded References:** When explaining concepts, query `pgvector` to surface verifiable textbook citations and grammar rules in a slide-out drawer.

### B. Lesson Cards & Spaced Repetition (FSRS-5)
- **Automatic Card Extraction:** Sensei chat sessions generate lesson cards containing: Kanji, Kana, Pitch Accent notation, Part of Speech, Core Meaning, and Contextual Example.
- **FSRS-5 Scheduling Engine:** Implement the **FSRS-5** (Free Spaced Repetition Scheduler) algorithm (calculating Retrievability, Stability, and Difficulty) over legacy SM-2.
- **Revision Desk:**
  - Modern card-flipping UI with keyboard controls (Space to reveal, `1` Again, `2` Hard, `3` Good, `4` Easy).
  - Visual metrics: Retention curve, review streak, upcoming burden heatmap.

### C. Automated Knowledge Evaluation (Quizzes)
- Dynamically generate structured quizzes based on the user's due cards and recent Sensei interactions:
  - Particle placement (`は` vs `が`, `に` vs `で`).
  - Contextual Cloze / Fill-in-the-blank tests.
  - Kanji reading and listening/pitch-accent identification.
  - Cultural context and register evaluation (Keigo vs Casual).

### D. Vision & Manga/Real-World Japanese OCR Reader
- **Image Canvas:** Drag-and-drop support for manga pages, street signs, and food menus.
- **Contextual Vision Pipeline:** Qwen2.5-VL analyzes the image and returns:
  1. Full scene interpretation (atmosphere, setting, speaker emotions).
  2. Bounding box coordinates for each detected Japanese text bubble/sign.
  3. Interactive canvas overlays: Visual highlights bounding each Japanese string. Users can click any highlighted zone to open a Sensei dialogue thread explaining the slang, dialect, or nuance.

---

## 4. CODE QUALITY & CI/CD DIRECTIVES

1. **Repository Setup:**
   - Clone or initialize the repository in `kongo-app` using the GitHub CLI:
     ```bash
     gh repo view kongo-app || gh repo create kongo-app --public
     ```
   - Monorepo/workspace layout:
     ```text
     kongo-app/
     ├── apps/
     │   ├── desktop/       # Electron main, preload, IPC bindings
     │   └── web/           # React 19 UI, Vite config, routes
     ├── packages/
     │   ├── db/            # Drizzle ORM, pgvector schemas, migrations
     │   ├── ai/            # Ollama/vLLM clients, prompts, RAG retriever
     │   ├── srs/           # FSRS-5 algorithm implementation & tests
     │   └── ui/            # Matte Fox design system & tailwind configs
     ├── .github/
     │   └── workflows/ci.yml
     ├── biome.json
     └── package.json
     ```
2. **Linting & Type Safety:**
   - Zero-tolerance TypeScript configuration (`strict: true`, `noUncheckedIndexedAccess: true`).
   - Biome for formatting and linting (`bun run check`).
3. **Automated Testing:**
   - `bun test` unit test suite covering:
     - FSRS-5 state transitions and review date calculations.
     - Japanese text tokenization and furigana markup generation.
     - Bounding box coordinate scaling and normalization.
     - Better-auth session and IPC bridge security.
4. **CI Pipeline:**
   - `.github/workflows/ci.yml` running on pull requests and pushes to main:
     - Setup Bun environment.
     - Biome formatting and lint check.
     - Type-check via `tsc --noEmit`.
     - Unit test execution (`bun test`).
     - Electron bundle verification.

---

## 5. STEP-BY-STEP AGENT IMPLEMENTATION PLAN

1. **Workspace Initialization:** Set up Bun workspace, TypeScript configurations, Biome, and git tracking.
2. **Database & Vector Schemas:** Scaffold PostgreSQL + `pgvector` schemas with Drizzle for users, cards, FSRS states, chat logs, and vector chunks.
3. **Core SRS & Language Logic:** Implement FSRS-5 scheduling and WASM Japanese tokenization with complete unit test coverage.
4. **AI Client & Vision Handler:** Build the unified inference layer for Qwen 2.5 (chat/RAG) and Qwen2.5-VL (bounding-box OCR + scene context).
5. **Matte Fox UI Design System:** Implement the warm charcoal, linen, and matte orange design system in Tailwind, including the interactive ruby/furigana text components.
6. **Chat & Interactive Reader Canvas:** Construct the Sensei chat window and the interactive image OCR viewer with canvas overlay selection.
7. **Electron Shell & IPC:** Wire secure IPC channels for database access, auth state, and native window management.
8. **CI/CD & Final Verification:** Commit clean code, verify GitHub Actions pass, and validate running tests.

Proceed autonomously. Start by auditing the workspace directory and scaffolding the architecture.

---

## 6. MODERNIZED ARCHITECTURE AND PRODUCT DIRECTION

The modules above remain first-release product scope: Sensei chat and selection actions, source-backed explanations, cards and FSRS-5, quizzes, Japanese image reading, and a secure desktop shell. The modernization below upgrades how they fit together; it does not move those learning experiences to a distant phase.

### Product and UX upgrades

- Make Sensei the home surface. The first screen opens the active conversation with the learner's JLPT level, response style, and model status visible. Deck review, quizzes, and image reading are reachable as study tools in the same workspace.
- Use a split learning workspace: conversation remains primary; a contextual side panel switches among explanation sources, focus vocabulary, cards, quiz questions, and image regions. On small screens, this panel becomes a sheet with preserved conversation context.
- Keep model behavior legible. Show when the local model is unavailable, whether a response used references, and when an answer is generated without evidence. Offer retry, switch-provider, and copy/export actions without losing the conversation.
- Make Japanese text selectable at phrase level, not just whole-message level. Use furigana on demand, keyboard-operable selection actions, and an explicit JLPT vocabulary/grammar focus. Do not overload every response with ruby.
- Let the learner correct OCR text and bounding boxes before asking Sensei. Keep original image, recognized text, and tutor interpretation visibly distinct.
- Present cards and quizzes as outcomes of conversation, with learner approval/editing before saving generated material. Track study progress without gamifying streaks as the only success signal.

### Application shape: secure modular monolith

Start as one deployable application with a typed React renderer, a small Node/Bun service layer, and a secure Electron host. Organize by product domain and enforce imports at boundaries; do not start with independently deployed microservices. Domains are `conversation`, `knowledge` (retrieval and citations), `study` (cards and scheduling), `assessment` (quizzes), `reader` (OCR), and `identity/settings`.

The renderer uses feature-level modules and design-system primitives. The main process owns OS integration and the preload exposes a narrow, typed, allowlisted bridge. The service layer owns persistence, AI provider calls, retrieval, validation, rate limits, and audit-safe telemetry. React never holds database credentials or unrestricted IPC. A web build can use the same renderer against the same service API.

Use ports-and-adapters boundaries for inference, embeddings, retrieval, OCR, storage, and Japanese analysis. Domain actions accept interfaces and validated input; providers translate to vendor-specific protocols. Prefer boring request/response flows for the first version. Add background jobs only for indexing, batch imports, or other operations that need retries and progress reporting.

### AI and model modernization

- Replace named-model defaults with capability profiles: `tutor-chat`, `reasoning-explanation`, `vision-reading`, and `embedding`. Each profile resolves to a configured local or hosted adapter based on availability, latency, context length, image support, and privacy preference.
- Support OpenAI-compatible chat and embedding APIs as a useful interoperability baseline, plus a first-class Ollama adapter for local models. Keep provider-specific features behind adapter capabilities. Never assume every chat endpoint supports vision, JSON schema, or embeddings.
- Parse structured responses against runtime schemas (for example, Zod) and return a repair/error state when invalid. Stream chat tokens where supported; keep cancellation and partial-response recovery. Use bounded timeouts, small retry budgets for transient failures, and no automatic retry for user-caused validation errors.
- Use explicit prompt versions and a task router. Tutor, grammar explanation, card extraction, quiz generation, and OCR have separate schemas, instructions, and model requirements. Conversation history is summarized or trimmed by token budget, not sent without bounds.
- Treat model output and retrieved passages as untrusted data. Defend against prompt injection in user images and source text; do not let content invoke tools or access secrets. The model has no tools by default. If future tools are enabled, use explicit per-action confirmation and narrow arguments.
- Keep provider secrets in the service/main process or OS credential store, never renderer local storage. Clearly label remote processing and ask before uploading private conversations or images. Provide local-only mode and a way to clear local history.
- Add a small, versioned evaluation set for Japanese naturalness, level appropriateness, grammar accuracy, citation support, card quality, and OCR transcription/box alignment. Compare model/provider changes against this set before changing recommended profiles. Do not market chain-of-thought; request concise learner-facing reasoning and examples instead.

### Knowledge and data architecture

Use PostgreSQL as the durable source of truth for multi-user records and pgvector as one retrieval index, not as the only storage format. Keep source documents, chunk metadata, embeddings, and retrieval strategy replaceable. Use Drizzle migrations and explicit transactions for card creation/review and conversation-derived study artifacts. Record provenance and licensing for every indexed source; exclude copyrighted books unless licensed or user-provided under an allowed workflow.

Represent conversations as messages with stable IDs, timestamps, role, content parts, prompt version, provider/model metadata, and optional evidence links. Store image references separately from large binary payloads. Normalize cards and review events; review events are append-only so scheduling state can be rebuilt after an algorithm upgrade. Persist scheduler version, parameters, and timezone assumptions. Avoid storing hidden model reasoning.

Use pgvector only after an ingestion/evaluation path exists. Start with a small allowed corpus and hybrid retrieval (lexical plus vector) with metadata filters. Return citations with source ID, title, edition, page/section, and exact supporting excerpt. A citation is displayed only if its source record and excerpt resolve; generation alone cannot create a citation. Keep retrieval metrics and a “not enough evidence” outcome.

For desktop-first use, design offline behavior explicitly. Cache recent conversations and cards locally, queue review events safely, and resolve sync conflicts with append-only review events and deterministic message IDs. Do not introduce bidirectional sync until server identity and conflict semantics exist. PostgreSQL remains the server store; local data uses an encrypted, versioned local store appropriate to the selected Electron platform. Export/import provides user-controlled portability.

### Japanese processing and vision

Put Japanese tokenization behind a `JapaneseAnalyzer` interface that can run locally. Return token spans with surface, reading, lemma, and part of speech; preserve exact offsets so furigana and selection actions map back to source text. Treat tokenizer dictionaries as versioned assets and degrade to plain selectable text if loading fails.

The vision adapter returns validated structured data: scene summary, detected strings, normalized boxes, optional reading/translation, confidence, and writing direction. Document one coordinate convention (normalized 0..1, origin at top-left), validate ranges and image dimensions, and test overlays at different aspect ratios and device pixel ratios. Keep OCR transcription editable and distinguish machine confidence from tutor explanation.

### Security, reliability, and operations

Electron uses `contextIsolation: true`, `sandbox: true`, a restrictive Content Security Policy, no renderer Node integration, navigation restrictions, and allowlisted IPC with runtime schema validation. Web requests validate origin, payload size, image MIME/type limits, and provider configuration. Use parameterized database access and least-privilege credentials. Authentication is required for shared cloud accounts, but local desktop study can remain usable without an account; avoid forcing a remote identity dependency into the core loop.

Add structured, redacted logs with correlation IDs. Never log API keys, full private prompts, or raw images by default. Record provider latency, failure categories, token counts when available, and retrieval/evaluation outcomes. Add health/readiness checks and user-facing diagnostics for database, model, and OCR capability status.

### Revised end-to-end implementation plan

1. **Foundation and contracts:** set up the workspace, strict TypeScript, React/Vite, Biome, app shell, domain package boundaries, shared runtime schemas, environment configuration, and local development commands. Add a Compose development stack for PostgreSQL/pgvector and migrations.
2. **Secure desktop/web host:** establish the web renderer and Electron main/preload boundary, typed API/IPC contracts, CSP, provider settings, and credential handling. Keep the same renderer usable in web mode.
3. **Persistence and knowledge:** implement migrations for users/settings, conversations/messages, source documents/chunks, cards, review events, and quiz attempts. Add seedable, properly licensed reference material and retrieval with resolvable citations.
4. **Sensei-first interaction:** build the responsive Matte Fox workspace and chat; add JLPT/personality controls, streaming provider adapters, furigana/token spans, focus badges, phrase selection actions, grammar/particle breakdowns, and reference panel. Support local and hosted compatible providers with capability-aware fallbacks.
5. **Learning loop:** add model-assisted card extraction with learner review/editing, complete card metadata, FSRS-5 scheduling and append-only review events, keyboard-first revision desk, and progress/retention views.
6. **Evaluation:** generate validated quiz types from recent conversation and cards, support answer feedback/explanations, persist attempts, and show why an answer is correct with supporting source material where available.
7. **Vision reader:** add image upload/drop, capability check for vision models, scene/context summary, Japanese text and normalized bounding boxes, overlay selection, editable OCR, and handoff into Sensei conversations.
8. **Quality and release:** add automated unit/integration coverage for scheduler, token spans/furigana, citation validity, schema validation, OCR normalization, persistence/migrations, and IPC restrictions. Run typecheck/lint/tests/build; document model/database setup, local-only privacy mode, and known limits. Add CI for the same checks and Electron bundle verification.

### First-version completion criteria

The first version is ready when a learner can configure a local or hosted model, have a level-aware Japanese conversation, select a phrase for a sourced or clearly uncited explanation, create and review an editable lesson card on FSRS-5, take a generated quiz, and upload an image to a compatible vision model and interact with validated text-region overlays. The web renderer and secure Electron shell both run; database migrations and retrieval work; all unavailable-provider states explain a next step. Evaluation and security checks run in CI. Optional account/OAuth features must not prevent local desktop study.

### Local development model profile for this workstation

This workstation reports an RTX 3070 with 8 GB VRAM, 16 GB system RAM, and an i5-12400F. Use one multimodal model for tutoring and image reading to avoid keeping separate text and vision weights resident: **Ollama `qwen3.5:9b` (Q4, listed at 6.6 GB)**. Ollama selects a 4K runtime context for this VRAM profile, leaving headroom for the desktop GPU. If generation is slow or Ollama offloads too much to system RAM, use **`qwen3.5:4b` (listed at 3.4 GB)**. The 9B profile accepts both text and images, so it serves the two main model capabilities without a second large download. See the [Ollama Qwen3.5 model profile and tags](https://ollama.com/library/qwen3.5/tags).

The local bridge defaults to this 9B model, checks whether Ollama and the model are installed, and offers a setup link/commands when they are missing. Model selection remains environment-configurable for future hardware or providers. This recommendation is specific to the inspected workstation; reevaluate it when the device or model catalog changes.

### MVP implementation notes

The implemented first vertical release keeps the requested product order: Sensei conversation is the landing surface, and cards/review, quizzes, and image reading are companion actions within the same workspace. The local starter knowledge corpus contains original beginner notes with provenance; it does not bundle copyrighted textbook excerpts. The local RAG adapter performs lexical retrieval over those notes and only displays citations explicitly returned by the tutor against retrieved note IDs. PostgreSQL/pgvector schema and Compose are scaffolded for corpus growth and shared-service evolution; the offline study path currently persists browser data in IndexedDB.

The working MVP includes the web renderer and development Electron shell, OpenAI-compatible inference through the local bridge, the PC-specific Ollama profile, local cards/messages/review events, FSRS-5 scheduling, model-generated quiz JSON with validation, and validated OCR region overlays. Email/password account endpoints and optional Google/GitHub OAuth are wired through Better Auth when PostgreSQL and secrets are configured; guest study remains available without that optional cloud setup. A populated licensed vector corpus, cross-device study-data sync, and packaging/release signing remain follow-on delivery items.
