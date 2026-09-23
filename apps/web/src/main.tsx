import { createAuthClient } from "better-auth/react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  FileImage,
  Flame,
  HelpCircle,
  ImagePlus,
  Library,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { analyzeJapanese } from "../../../packages/ai/src/japanese";
import { parseVisionResult } from "../../../packages/ai/src/vision";
import { scheduleReview } from "../../../packages/srs/src/index";
import { store } from "./data/store";
import type { Card, Conversation, Message, Rating } from "./domain/types";
import "./styles.css";

const API_PREFIX = window.kongoHost?.desktop ? "http://127.0.0.1:3210" : "";
const authClient = createAuthClient({
  baseURL: API_PREFIX || window.location.origin,
  fetchOptions: {
    credentials: "include",
    headers: window.kongoHost?.apiToken
      ? { "x-kongo-token": window.kongoHost.apiToken }
      : undefined,
  },
});
function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (window.kongoHost?.apiToken)
    headers.set("x-kongo-token", window.kongoHost.apiToken);
  return fetch(`${API_PREFIX}${path}`, { ...init, headers });
}

type AccountSession = {
  user: { id: string; name: string; email: string };
  session?: { id: string };
};
type View = "chat" | "cards" | "quiz" | "reader";
type Tab = "references" | "focus" | "cards";
function renderJapanese(text: string) {
  return analyzeJapanese(text).map((token, index) =>
    token.reading ? (
      <ruby key={`${token.surface}-${index}`} title={token.meaning}>
        {token.surface}
        <rt>{token.reading}</rt>
      </ruby>
    ) : (
      <React.Fragment key={`${token.surface}-${index}`}>
        {token.surface}
      </React.Fragment>
    ),
  );
}
const greeting: Message = {
  id: "welcome",
  role: "assistant",
  createdAt: 0,
  content:
    "こんにちは！今日も一緒に日本語を勉強しましょう。\n\n何について話したいですか？最近気になっていることでも、日本語で言ってみたい一文でも大丈夫です。",
};
const vocab: [string, string, string][] = [
  ["大丈夫", "だいじょうぶ", "okay; all right"],
  ["見つける", "みつける", "to find"],
  ["予約", "よやく", "reservation"],
  ["急ぐ", "いそぐ", "to hurry"],
  ["間に合う", "まにあう", "to be in time"],
  ["気になる", "きになる", "to be curious about"],
];
function App() {
  const [view, setView] = useState<View>("chat"),
    [tab, setTab] = useState<Tab>("references"),
    [messages, setMessages] = useState<Message[]>([]),
    [conversations, setConversations] = useState<Conversation[]>([]),
    [activeConversationId, setActiveConversationId] = useState("default"),
    [mobileContextOpen, setMobileContextOpen] = useState(false),
    [cards, setCards] = useState<Card[]>([]),
    [input, setInput] = useState(""),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [modelReady, setModelReady] = useState(false),
    [runnerAvailable, setRunnerAvailable] = useState(false),
    [modelInstalled, setModelInstalled] = useState(false),
    [modelName, setModelName] = useState("Checking local model…"),
    [settings, setSettings] = useState(false),
    [authAvailable, setAuthAvailable] = useState(false),
    [authProviders, setAuthProviders] = useState<string[]>([]),
    [accountOpen, setAccountOpen] = useState(false),
    [accountMode, setAccountMode] = useState<"signin" | "signup">("signin"),
    [account, setAccount] = useState<AccountSession | null>(null),
    [authName, setAuthName] = useState(""),
    [authEmail, setAuthEmail] = useState(""),
    [authPassword, setAuthPassword] = useState(""),
    [authBusy, setAuthBusy] = useState(false),
    [authError, setAuthError] = useState(""),
    [revealed, setRevealed] = useState(false),
    [quizStarted, setQuizStarted] = useState(false),
    [quizFinished, setQuizFinished] = useState(false),
    [quizAnswer, setQuizAnswer] = useState<number | null>(null),
    [quizScore, setQuizScore] = useState(0),
    [quizIndex, setQuizIndex] = useState(0),
    [quizLoading, setQuizLoading] = useState(false),
    [generatedQuiz, setGeneratedQuiz] = useState<
      {
        prompt: string;
        answer: string;
        choices: string[];
        explanation?: string;
      }[]
    >([]),
    [level, setLevel] = useState(
      () => localStorage.getItem("kongo-level") || "N5",
    ),
    [image, setImage] = useState(""),
    [ocrBusy, setOcrBusy] = useState(false),
    [ocrRegions, setOcrRegions] = useState<
      {
        box_2d: [number, number, number, number];
        text: string;
        reading?: string;
        translation?: string;
        confidence?: number;
        writing_direction?: string;
      }[]
    >([]),
    [sceneSummary, setSceneSummary] = useState(""),
    [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1 }),
    [pendingCard, setPendingCard] = useState<Card | null>(null),
    [draftBusy, setDraftBusy] = useState(false),
    [notice, setNotice] = useState("");
  const bottom = useRef<HTMLDivElement>(null),
    file = useRef<HTMLInputElement>(null),
    inputRef = useRef<HTMLTextAreaElement>(null);
  const contextToggleRef = useRef<HTMLButtonElement>(null),
    contextCloseRef = useRef<HTMLButtonElement>(null),
    contextPanelRef = useRef<HTMLElement>(null),
    contextWasOpenRef = useRef(false);
  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator)
      void navigator.serviceWorker.register("./sw.js");
    void Promise.all([store.cards(), store.conversations()]).then(
      async ([c, chats]) => {
        setCards(c);
        setConversations(chats);
        const preferred = localStorage.getItem("kongo-conversation");
        const active =
          chats.find((conversation) => conversation.id === preferred) ||
          chats[0];
        if (!active) return;
        setActiveConversationId(active.id);
        localStorage.setItem("kongo-conversation", active.id);
        const m = await store.messages(active.id);
        setMessages(m.length ? m : [greeting]);
        if (active.title === "Your first conversation") {
          const firstPrompt = m.find(
            (message) => message.role === "user",
          )?.content;
          if (firstPrompt) {
            const title = firstPrompt.replace(/\s+/g, " ").slice(0, 42);
            await store.updateConversation(active.id, { title });
            setConversations((items) =>
              items.map((conversation) =>
                conversation.id === active.id
                  ? { ...conversation, title }
                  : conversation,
              ),
            );
          }
        }
      },
    );
    void apiFetch("/api/status")
      .then((r) => r.json())
      .then((x) => {
        setModelReady(Boolean(x.ready));
        setRunnerAvailable(Boolean(x.runnerAvailable));
        setModelInstalled(Boolean(x.installed));
        setAuthAvailable(Boolean(x.authAvailable));
        setAuthProviders(Array.isArray(x.authProviders) ? x.authProviders : []);
        if (x.authAvailable)
          void authClient
            .getSession()
            .then((r) => setAccount((r.data as AccountSession | null) || null));
        setModelName(
          x.installed
            ? x.model
            : x.runnerAvailable
              ? `${x.model} not installed`
              : "Ollama not installed",
        );
      })
      .catch(() => {
        setModelName("Model bridge offline");
      });
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);
  useEffect(() => {
    if (mobileContextOpen) {
      contextWasOpenRef.current = true;
      contextCloseRef.current?.focus();
    } else if (contextWasOpenRef.current) {
      contextWasOpenRef.current = false;
      contextToggleRef.current?.focus();
    }
  }, [mobileContextOpen]);
  const due = useMemo(
    () => cards.filter((c) => c.dueAt <= Date.now()),
    [cards],
  );
  const activeCitations =
    messages.filter((m) => m.citations?.length).at(-1)?.citations || [];
  const current = due[0];
  function pushNotice(text: string) {
    setNotice(text);
    setTimeout(() => setNotice(""), 3200);
  }
  function focusPhrase(text: string) {
    setSelected(text);
    setTab("focus");
  }
  async function startConversation() {
    const conversation = await store.createConversation();
    setConversations((items) => [conversation, ...items]);
    setActiveConversationId(conversation.id);
    localStorage.setItem("kongo-conversation", conversation.id);
    setMessages([greeting]);
    setView("chat");
    setMobileContextOpen(false);
  }
  async function openConversation(conversation: Conversation) {
    setActiveConversationId(conversation.id);
    localStorage.setItem("kongo-conversation", conversation.id);
    const saved = await store.messages(conversation.id);
    setMessages(saved.length ? saved : [greeting]);
    setView("chat");
    setMobileContextOpen(false);
  }
  async function addCardFromPhrase(phrase: string) {
    const clean = phrase.trim().replace(/[。！？、,.]+$/, "");
    if (!clean) return;
    const existing = cards.find((c) => c.kanji === clean || c.kana === clean);
    if (existing) {
      pushNotice("Already in your lesson cards.");
      setTab("cards");
      return;
    }
    const now = Date.now(),
      match = vocab.find((v) => v[0] === clean || v[1] === clean);
    let draft: Partial<Card> = {
      kanji: match?.[0] || clean,
      kana: match?.[1] || "",
      meaning: match?.[2] || "",
      partOfSpeech: "",
      pitch: "",
      example: "",
    };
    if (modelReady && !match) {
      setDraftBusy(true);
      try {
        const response = await apiFetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mode: "extract-card",
            messages: [
              {
                role: "system",
                content: `Create one accurate Japanese study card for a ${level} learner. Return JSON only with fields kanji,kana,meaning,pitch,partOfSpeech,example. Use null for pitch accent if uncertain. Do not guess readings.`,
              },
              {
                role: "user",
                content: JSON.stringify({
                  phrase: clean,
                  recentContext: messages.slice(-4).map((m) => m.content),
                }),
              },
            ],
          }),
        });
        const data = await response.json();
        if (response.ok) {
          const parsed = JSON.parse(
            data.content.replace(/^```(?:json)?\s*|\s*```$/g, ""),
          );
          if (
            typeof parsed.kanji === "string" &&
            typeof parsed.meaning === "string"
          )
            draft = {
              ...draft,
              kanji: parsed.kanji,
              kana: typeof parsed.kana === "string" ? parsed.kana : "",
              meaning: parsed.meaning,
              pitch: typeof parsed.pitch === "string" ? parsed.pitch : "",
              partOfSpeech:
                typeof parsed.partOfSpeech === "string"
                  ? parsed.partOfSpeech
                  : "",
              example: typeof parsed.example === "string" ? parsed.example : "",
            };
        }
      } catch {
        pushNotice(
          "Sensei could not extract this card yet. You can fill it in yourself.",
        );
      } finally {
        setDraftBusy(false);
      }
    }
    setPendingCard({
      id: `c${now}`,
      kanji: draft.kanji || clean,
      kana: draft.kana || "",
      meaning: draft.meaning || "",
      partOfSpeech: draft.partOfSpeech || "",
      pitch: draft.pitch || "",
      example: draft.example || "",
      dueAt: now,
      stability: 0,
      difficulty: 5,
      reps: 0,
      lapses: 0,
      createdAt: now,
    });
  }
  function saveDraftCard() {
    if (!pendingCard?.kanji.trim() || !pendingCard.meaning.trim())
      return pushNotice("Add a Japanese term and meaning to save this card.");
    void store.saveCard(pendingCard);
    setCards((x) => [...x, pendingCard]);
    setPendingCard(null);
    setTab("cards");
    pushNotice("Lesson card saved.");
  }

  async function send(text = input, extraImage?: string) {
    if ((!text.trim() && !extraImage) || busy) return;
    const user: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content:
        text.trim() || "Please read this image and explain the Japanese.",
      createdAt: Date.now(),
      ...(extraImage ? { image: extraImage } : {}),
    };
    const next = [...messages.filter((m) => m.id !== "welcome"), user];
    const botId = crypto.randomUUID();
    setMessages([
      ...next,
      ...(!extraImage
        ? [
            {
              id: botId,
              role: "assistant" as const,
              content: "",
              createdAt: Date.now(),
            },
          ]
        : []),
    ]);
    setInput("");
    setBusy(true);
    const activeConversation = conversations.find(
      (c) => c.id === activeConversationId,
    );
    if (
      !activeConversation ||
      activeConversation.title === "New conversation" ||
      activeConversation.title === "Your first conversation"
    ) {
      const title =
        user.content.replace(/\s+/g, " ").slice(0, 42) || "Image reading";
      void store.updateConversation(activeConversationId, {
        title,
        updatedAt: Date.now(),
      });
      setConversations((items) =>
        items.map((c) =>
          c.id === activeConversationId
            ? { ...c, title, updatedAt: Date.now() }
            : c,
        ),
      );
    }
    void store.saveMessage(user, activeConversationId).then(() => {
      setConversations((items) =>
        items
          .map((conversation) =>
            conversation.id === activeConversationId
              ? { ...conversation, updatedAt: Date.now() }
              : conversation,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
    });
    try {
      const system = `You are Kongo's warm, precise Japanese Sensei. Teach naturally at JLPT ${level} level unless asked otherwise. Reply mostly in Japanese with brief English support as useful. Keep Japanese phrases intact and add readings in parentheses only when useful. Be careful about uncertainty; do not invent textbook citations. By default, answer in a few clear sentences; for grammar, give a short rule, one useful contrast, and one natural example. Expand when the learner asks for detail. If an image is included, transcribe Japanese, give readings and translation, and note visual/context uncertainty. Never claim external sources were consulted.`;
      const history = next.slice(-12).map((m, i) => ({
        role: m.role,
        content:
          m.image && i === next.length - 1
            ? [
                { type: "text", text: m.content },
                { type: "image_url", image_url: { url: m.image } },
              ]
            : m.content,
      }));
      const response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: system }, ...history],
          imageMode: Boolean(extraImage),
          stream: !extraImage,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Model request failed");
      }
      let answer = "",
        citations: Message["citations"] = [],
        regions: Message["regions"],
        scene = "";
      if (extraImage) {
        const data = await response.json();
        answer = data.content;
        citations = data.citations || [];
      } else if (response.body) {
        const reader = response.body.getReader(),
          decoder = new TextDecoder();
        let buffered = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffered += decoder.decode(value, { stream: true });
          const lines = buffered.split("\n");
          buffered = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            try {
              const event = JSON.parse(line.slice(5).trim());
              if (event.type === "delta" && typeof event.content === "string") {
                answer += event.content;
                setMessages((items) =>
                  items.map((item) =>
                    item.id === botId ? { ...item, content: answer } : item,
                  ),
                );
              } else if (event.type === "done")
                citations = event.citations || [];
            } catch {
              /* Ignore an incomplete event; the next stream chunk completes it. */
            }
          }
        }
      } else throw new Error("Sensei returned no response stream.");
      if (extraImage) {
        try {
          const parsed = parseVisionResult(answer);
          regions = parsed.regions;
          scene = parsed.scene;
          setOcrRegions(regions || []);
          setSceneSummary(scene);
          answer =
            [
              scene ? `Scene: ${scene}` : "",
              ...(regions || []).map(
                (r, i) =>
                  `${i + 1}. ${r.text}${r.reading ? `（${r.reading}）` : ""}${r.translation ? ` — ${r.translation}` : ""}${typeof r.confidence === "number" && r.confidence < 0.55 ? " [uncertain]" : ""}`,
              ),
            ]
              .filter(Boolean)
              .join("\n") || "No Japanese text was detected.";
        } catch {
          answer = `The model returned an unstructured reading. You can still select Japanese text in the conversation.\n\n${answer}`;
        }
      }
      const bot: Message = {
        id: botId,
        role: "assistant",
        content: answer,
        createdAt: Date.now(),
        citations,
        ...(extraImage ? { regions, scene } : {}),
      };
      setMessages((items) =>
        items.map((item) => (item.id === botId ? bot : item)),
      );
      void store.saveMessage(bot, activeConversationId).then(async () => {
        setConversations(await store.conversations());
      });
      const json = answer.match(/\{[\s\S]*"cards"\s*:[\s\S]*\}/);
      if (json && !extraImage) {
        try {
          const result = JSON.parse(json[0]);
          if (Array.isArray(result.cards))
            for (const x of result.cards.slice(0, 4))
              addCardFromPhrase(String(x.kanji || x.front || ""));
        } catch {}
      }
    } catch (e) {
      setMessages((items) => items.filter((item) => item.id !== botId));
      pushNotice(e instanceof Error ? e.message : "Could not reach Sensei.");
    } finally {
      setBusy(false);
    }
  }
  async function beginQuiz() {
    setQuizLoading(true);
    try {
      const recent = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-8)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      const response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "quiz",
          messages: [
            {
              role: "system",
              content: `Create Japanese practice questions for a JLPT ${level} learner based only on supplied material. Return valid JSON.`,
            },
            {
              role: "user",
              content: JSON.stringify({
                cards: cards
                  .filter((c) => c.dueAt <= Date.now())
                  .slice(0, 12)
                  .map((c) => ({
                    kanji: c.kanji,
                    kana: c.kana,
                    meaning: c.meaning,
                    example: c.example,
                  })),
                recentConversation: recent,
              }),
            },
          ],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Quiz generation failed");
      const parsed = JSON.parse(
        data.content.replace(/^```(?:json)?\s*|\s*```$/g, ""),
      );
      const items = parsed.questions;
      if (!Array.isArray(items) || items.length < 3)
        throw new Error("Sensei returned an incomplete quiz.");
      const valid = items
        .slice(0, 5)
        .filter(
          (x: any) =>
            typeof x.prompt === "string" &&
            typeof x.answer === "string" &&
            Array.isArray(x.choices) &&
            x.choices.length >= 2 &&
            x.choices.includes(x.answer),
        )
        .map((x: any) => ({
          prompt: x.prompt,
          answer: x.answer,
          choices: x.choices.slice(0, 4),
          explanation: typeof x.explanation === "string" ? x.explanation : "",
        }));
      if (valid.length < 3)
        throw new Error("Sensei returned invalid quiz questions.");
      setGeneratedQuiz(valid);
    } catch (e) {
      pushNotice(
        e instanceof Error
          ? `${e.message} Using a card-based quiz instead.`
          : "Using a card-based quiz instead.",
      );
      setGeneratedQuiz([]);
    } finally {
      setQuizLoading(false);
      setQuizStarted(true);
      setQuizFinished(false);
      setQuizScore(0);
      setQuizIndex(0);
      setQuizAnswer(null);
    }
  }

  async function submitAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      const result =
        accountMode === "signup"
          ? await authClient.signUp.email({
              name: authName,
              email: authEmail,
              password: authPassword,
            })
          : await authClient.signIn.email({
              email: authEmail,
              password: authPassword,
            });
      if (result.error)
        throw new Error(result.error.message || "Account request failed.");
      const session = await authClient.getSession();
      setAccount(session.data || null);
      setAccountOpen(false);
      setAuthPassword("");
      pushNotice(
        accountMode === "signup"
          ? "Your Kongo account is ready."
          : "Signed in to Kongo.",
      );
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Account request failed.",
      );
    } finally {
      setAuthBusy(false);
    }
  }
  async function signInWith(provider: string) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: window.location.href,
      });
      if (result.error)
        throw new Error(result.error.message || "Provider sign-in failed.");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Provider sign-in failed.",
      );
      setAuthBusy(false);
    }
  }
  async function signOutAccount() {
    await authClient.signOut();
    setAccount(null);
    setAccountOpen(false);
    pushNotice("Signed out. Local study data stays on this device.");
  }
  function handleSelection() {
    const text = window.getSelection()?.toString().trim();
    if (text && /[\u3040-\u30ff\u3400-\u9fff]/.test(text)) focusPhrase(text);
  }
  function rate(rating: Rating) {
    if (!current) return;
    const updated = scheduleReview(current, rating);
    void store.saveCard(updated);
    void store.logReview({
      cardId: current.id,
      rating,
      at: Date.now(),
      intervalDays: (updated.dueAt - Date.now()) / 86400000,
    });
    const nextCards = cards.map((c) => (c.id === current.id ? updated : c));
    setCards(nextCards);
    setRevealed(false);
    if (due.length <= 1) {
      pushNotice(
        rating === 1
          ? "We’ll revisit this one soon."
          : "Nice work. Review complete!",
      );
    }
  }
  const quizItems = generatedQuiz.length
    ? generatedQuiz
    : cards.slice(0, 5).map((c) => ({
        prompt: `What does 「${c.kanji}」 mean?`,
        answer: c.meaning,
        choices: [
          c.meaning,
          ...cards
            .filter((x) => x.id !== c.id)
            .slice(0, 3)
            .map((x) => x.meaning),
        ].sort((a, b) => a.localeCompare(b)),
        explanation: "",
      }));
  const q = quizItems[quizIndex];
  async function readImage(img: string) {
    setImage(img);
    setOcrRegions([]);
    setSceneSummary("");
    setView("reader");
    setOcrBusy(true);
    await send(
      "Read this image and return the required structured OCR result.",
      img,
    );
    setOcrBusy(false);
  }
  function onFile(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/"))
      return pushNotice("Choose an image file.");
    if (f.size > 7 * 1024 * 1024)
      return pushNotice("Images must be under 7 MB.");
    const reader = new FileReader();
    reader.onload = () => void readImage(String(reader.result));
    reader.readAsDataURL(f);
  }
  useEffect(() => {
    function keys(e: KeyboardEvent) {
      if (view === "cards" && due.length) {
        if (e.code === "Space" && !revealed) {
          e.preventDefault();
          setRevealed(true);
        }
        if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
          e.preventDefault();
          rate(Number(e.key) as Rating);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        void startConversation();
      }
      if (e.key === "Escape") setMobileContextOpen(false);
      if (mobileContextOpen && e.key === "Tab") {
        const focusable =
          contextPanelRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
          );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  });
  const title = {
    chat: "Sensei chat",
    cards: "Lesson cards",
    quiz: "Quick quiz",
    reader: "Image reader",
  }[view];
  return (
    <div className="app-shell">
      <nav className="rail" aria-label="Primary study tools">
        <div className="brand-mark" aria-hidden="true">
          狐
        </div>
        <div className="rail-sep" />
        <button
          className={`rail-button ${view === "chat" ? "active" : ""}`}
          title="Sensei"
          aria-label="Sensei conversation"
          aria-current={view === "chat" ? "page" : undefined}
          onClick={() => setView("chat")}
        >
          <MessageCircle />
        </button>
        <button
          className={`rail-button ${view === "cards" ? "active" : ""}`}
          title="Lesson cards"
          aria-label="Lesson cards"
          aria-current={view === "cards" ? "page" : undefined}
          onClick={() => setView("cards")}
        >
          <Library />
        </button>
        <button
          className={`rail-button ${view === "quiz" ? "active" : ""}`}
          title="Quick quiz"
          aria-label="Quick quiz"
          aria-current={view === "quiz" ? "page" : undefined}
          onClick={() => setView("quiz")}
        >
          <Compass />
        </button>
        <button
          className={`rail-button ${view === "reader" ? "active" : ""}`}
          title="Image reader"
          aria-label="Image reader"
          aria-current={view === "reader" ? "page" : undefined}
          onClick={() => setView("reader")}
        >
          <FileImage />
        </button>
        <div className="rail-grow" />
        <button
          className="rail-button"
          title="Settings"
          aria-label="Settings"
          onClick={() => setSettings(true)}
        >
          <Settings />
        </button>
        <div className="avatar-small">K</div>
      </nav>
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="brand-word">
            kongo<span>コンゴ</span>
          </div>
          <button
            className="icon-button sm"
            onClick={() => setSettings(true)}
            aria-label="Settings"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
        <button className="new-chat" onClick={() => void startConversation()}>
          <Plus size={16} /> New conversation{" "}
          <span>
            {navigator.platform.toLowerCase().includes("mac")
              ? "⌘ K"
              : "Ctrl K"}
          </span>
        </button>
        <div className="nav-label">LEARN</div>
        <button
          className={`nav-item ${view === "chat" ? "selected" : ""}`}
          onClick={() => setView("chat")}
        >
          <MessageCircle size={16} /> Sensei <span className="nav-dot" />
        </button>
        <button
          className={`nav-item ${view === "cards" ? "selected" : ""}`}
          onClick={() => {
            setView("cards");
            setRevealed(false);
          }}
        >
          <Library size={16} /> Lesson cards{" "}
          <span className="nav-count">{due.length}</span>
        </button>
        <button
          className={`nav-item ${view === "quiz" ? "selected" : ""}`}
          onClick={() => {
            setView("quiz");
            setQuizStarted(false);
          }}
        >
          <Compass size={16} /> Quick quiz
        </button>
        <button
          className={`nav-item ${view === "reader" ? "selected" : ""}`}
          onClick={() => setView("reader")}
        >
          <FileImage size={16} /> Image reader
        </button>
        <div className="sidebar-rule" />
        <div className="nav-label recent-label">RECENT CONVERSATIONS</div>
        {conversations.slice(0, 4).map((conversation) => (
          <button
            key={conversation.id}
            className={`recent-item ${conversation.id === activeConversationId ? "current" : ""}`}
            onClick={() => void openConversation(conversation)}
            title={conversation.title}
          >
            <span className="recent-bullet" /> {conversation.title}
          </button>
        ))}
        {!conversations.length && (
          <p className="recent-empty">Your conversations will appear here.</p>
        )}
        <div className="sidebar-bottom">
          <div className="study-card">
            <div className="study-card-top">
              <span>DAILY PRACTICE</span>
              <Flame size={15} />
            </div>
            <div className="study-progress">
              <span
                style={{
                  width: `${Math.min(100, Math.round(((8 - due.length) / 8) * 100))}%`,
                }}
              />
            </div>
            <p>
              {due.length === 8
                ? "Your study desk is ready."
                : `${8 - due.length} of 8 cards reviewed today`}
            </p>
            <button
              onClick={() => {
                setView("cards");
              }}
            >
              Continue session <ArrowRight size={13} />
            </button>
          </div>
          <button
            className="profile-row profile-action"
            onClick={() => setAccountOpen(true)}
          >
            <div className="avatar-user">
              {account?.user.name?.[0]?.toUpperCase() || "G"}
            </div>
            <div>
              <b>{account?.user.name || "Guest learner"}</b>
              <small>
                {account?.user.email || `JLPT ${level} · Local study`}
              </small>
            </div>
            <ChevronDown size={15} className="profile-chevron" />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="crumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>{title}</b>
          </div>
          <div className="top-actions">
            <button
              className={`model-pill ${modelReady ? "" : "offline"}`}
              onClick={() => setSettings(true)}
              aria-label={`Model status: ${modelName}. Open settings.`}
            >
              <span className="status-dot" />
              {modelName}
              <ChevronDown size={13} />
            </button>
            <button
              className="icon-button"
              aria-label="Help"
              onClick={() =>
                pushNotice("Select Japanese text in chat for Sensei actions.")
              }
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </header>
        {view === "chat" && (
          <div className="workspace">
            <section className="conversation">
              <div className="chat-heading">
                <div>
                  <div className="eyebrow">
                    <span className="sparkle-dot" /> YOUR JAPANESE SENSEI
                  </div>
                  <h1>Learn through conversation.</h1>
                  <p>
                    Ask anything, practice naturally, and let curiosity lead.
                  </p>
                </div>
                <button
                  className="level-select"
                  onClick={() => setSettings(true)}
                  aria-label={`JLPT level ${level}. Change level in settings.`}
                >
                  <span>JLPT LEVEL</span>
                  {level} Beginner
                  <ChevronDown size={14} />
                </button>
                <button
                  className="context-toggle"
                  ref={contextToggleRef}
                  onClick={() => setMobileContextOpen(true)}
                  aria-label="Open study companion"
                  aria-expanded={mobileContextOpen}
                  aria-controls="study-companion-panel"
                >
                  <Sparkles size={16} /> Study companion
                </button>
                <button
                  className="new-conversation-compact"
                  onClick={() => void startConversation()}
                  aria-label="Start a new conversation"
                >
                  <Plus size={15} /> New chat
                </button>
              </div>
              <div className="chat-scroll">
                <div className="date-divider">
                  <span /> TODAY <span />
                </div>
                {messages.map((m, i) => (
                  <div key={m.id} className={`message-row ${m.role}`}>
                    <div className={`message-avatar ${m.role}`}>
                      {m.role === "assistant" ? "狐" : "A"}
                    </div>
                    <div className="message-content">
                      <div className="message-meta">
                        <b>{m.role === "assistant" ? "Sensei" : "You"}</b>
                        <span>
                          {i === 0
                            ? "Just now"
                            : new Date(m.createdAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                        </span>
                        {m.role === "assistant" && (
                          <button
                            className="tiny-icon"
                            title="Listen"
                            aria-label="Read response aloud in Japanese"
                            onClick={() => {
                              const utterance = new SpeechSynthesisUtterance(
                                m.content,
                              );
                              utterance.lang = "ja-JP";
                              window.speechSynthesis?.speak(utterance);
                            }}
                          >
                            <Volume2 size={13} />
                          </button>
                        )}
                      </div>
                      {m.image && (
                        <img
                          className="chat-image"
                          src={m.image}
                          alt="Uploaded Japanese text"
                        />
                      )}
                      <div
                        className="bubble"
                        onMouseUp={
                          m.role === "assistant" ? handleSelection : undefined
                        }
                      >
                        {m.content.split("\n").map((line, j) => (
                          <span className="bubble-line" key={j}>
                            {renderJapanese(line)}
                            <br />
                          </span>
                        ))}
                      </div>
                      {m.role === "assistant" &&
                        m.citations &&
                        m.citations.length > 0 && (
                          <div className="message-citations">
                            <ShieldCheck size={12} /> Supported by{" "}
                            {m.citations.map((c) => c.section).join(" · ")}
                          </div>
                        )}
                      {m.role === "assistant" && i > 0 && (
                        <div className="focus-badges">
                          {[
                            ...new Set(
                              [
                                ...m.content.matchAll(
                                  /[\u3040-\u30ff\u3400-\u9fff]{2,12}/g,
                                ),
                              ].map((x) => x[0]),
                            ),
                          ]
                            .slice(0, 4)
                            .map((term) => (
                              <button
                                key={term}
                                onClick={() => focusPhrase(term)}
                              >
                                <span>{term}</span>
                                <small>
                                  {vocab.find(
                                    (v) => v[0] === term || v[1] === term,
                                  )?.[2] || "Explore phrase"}
                                </small>
                              </button>
                            ))}
                        </div>
                      )}
                      {m.role === "assistant" && i > 0 && (
                        <div className="message-tools">
                          <button
                            onClick={() =>
                              focusPhrase(
                                m.content.split(/[。！？\n]/)[0] || m.content,
                              )
                            }
                          >
                            <Sparkles size={13} /> Explain
                          </button>
                          <button
                            onClick={() =>
                              addCardFromPhrase(
                                m.content.match(
                                  /[\u3040-\u30ff\u3400-\u9fff]{2,}/,
                                )?.[0] || m.content.slice(0, 14),
                              )
                            }
                          >
                            <BookOpen size={13} /> Save to cards
                          </button>
                          <button
                            onClick={() =>
                              navigator.clipboard?.writeText(m.content)
                            }
                          >
                            <Copy size={13} /> Copy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!messages.some((m) => m.role === "user") && (
                  <div
                    className="starter-prompts"
                    aria-label="Try a first question"
                  >
                    <p>Start with a question like…</p>
                    <button
                      onClick={() =>
                        void send(
                          "Can you explain the difference between は and が?",
                        )
                      }
                    >
                      Explain a grammar point
                    </button>
                    <button
                      onClick={() =>
                        void send(
                          "Let’s practise ordering a coffee in Japanese.",
                        )
                      }
                    >
                      Practise a short conversation
                    </button>
                    <button onClick={() => setView("reader")}>
                      Read Japanese from an image
                    </button>
                  </div>
                )}
                {busy && (
                  <div className="message-row assistant">
                    <div className="message-avatar assistant thinking">狐</div>
                    <div className="typing">
                      <i />
                      <i />
                      <i />
                      <span>Sensei is thinking</span>
                    </div>
                  </div>
                )}
                <div ref={bottom} />
              </div>
              <div className="composer-wrap">
                <div className="composer">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder="Ask Sensei anything… Try Japanese, English, or both"
                    rows={1}
                  />
                  <div className="composer-bottom">
                    <div className="composer-tools">
                      <button
                        className="tool-button"
                        onClick={() => file.current?.click()}
                      >
                        <ImagePlus size={15} />
                        <span>Add image</span>
                      </button>
                      <input
                        ref={file}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => onFile(e.target.files?.[0])}
                      />
                      <span className="composer-hint">
                        Shift + Enter for a new line
                      </span>
                    </div>
                    <button
                      className="send-button"
                      disabled={busy || !input.trim()}
                      onClick={() => void send()}
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
                <div className="privacy-note">
                  <ShieldCheck size={12} />
                  {modelReady
                    ? "Conversation stays on your configured model."
                    : "Connect your model in settings to start a conversation."}
                </div>
              </div>
            </section>
            {mobileContextOpen && (
              <button
                className="context-backdrop"
                aria-label="Close study companion"
                onClick={() => setMobileContextOpen(false)}
              />
            )}
            <aside
              id="study-companion-panel"
              ref={contextPanelRef}
              role={mobileContextOpen ? "dialog" : undefined}
              aria-modal={mobileContextOpen ? true : undefined}
              aria-label={mobileContextOpen ? "Study companion" : undefined}
              className={`context-panel ${mobileContextOpen ? "mobile-open" : ""}`}
            >
              <div className="context-head">
                <div className="context-title">
                  <Sparkles size={16} />
                  <span>Study companion</span>
                </div>
                <button
                  className="icon-button sm context-close"
                  ref={contextCloseRef}
                  onClick={() => setMobileContextOpen(false)}
                  aria-label="Close study companion"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="context-tabs">
                <button
                  className={tab === "references" ? "active" : ""}
                  onClick={() => setTab("references")}
                >
                  References
                </button>
                <button
                  className={tab === "focus" ? "active" : ""}
                  onClick={() => setTab("focus")}
                >
                  Focus{selected && <i />}
                </button>
                <button
                  className={tab === "cards" ? "active" : ""}
                  onClick={() => setTab("cards")}
                >
                  Cards <span>{due.length}</span>
                </button>
              </div>
              <div className="context-body">
                {tab === "references" && (
                  <>
                    <div className="panel-intro">
                      <div className="source-icon">
                        <BookOpen size={16} />
                      </div>
                      <div>
                        <b>Grammar shelf</b>
                        <small>Curated learning notes</small>
                      </div>
                      <button className="tiny-icon">
                        <Search size={14} />
                      </button>
                    </div>
                    <div className="source-status">
                      <span /> Grounded reference notes
                    </div>
                    {activeCitations.length ? (
                      activeCitations.map((r, i) => (
                        <article className="reference-card" key={r.id}>
                          <div className="reference-source">
                            <span className="source-number">0{i + 1}</span>
                            {r.provenance}
                            <ChevronRight size={13} />
                          </div>
                          <h3>{r.section}</h3>
                          <p>{r.content}</p>
                          <div className="reference-example">{r.example}</div>
                          <span className="citation-link">
                            Verified source · {r.level}
                          </span>
                        </article>
                      ))
                    ) : (
                      <div className="no-citations">
                        <BookOpen size={17} />
                        <b>No matching reference notes yet</b>
                        <span>
                          Sensei will show source notes here when they support
                          your question. Other answers are labeled as general
                          language help.
                        </span>
                      </div>
                    )}
                    <button
                      className="all-sources"
                      onClick={() =>
                        pushNotice(
                          "Grammar shelf includes original beginner reference notes.",
                        )
                      }
                    >
                      Browse grammar shelf <ArrowRight size={14} />
                    </button>
                  </>
                )}
                {tab === "focus" && (
                  <>
                    <div className="focus-intro">
                      <div className="focus-icon">あ</div>
                      <span>SELECTED PHRASE</span>
                      <button
                        className="tiny-icon"
                        onClick={() => setSelected("")}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="selected-phrase">
                      {selected ||
                        "Select Japanese text in the conversation to explore it here."}
                    </div>
                    {selected && (
                      <>
                        <div className="focus-reading">
                          {vocab.find(
                            (v) => v[0] === selected || v[1] === selected,
                          )?.[1] || "Phrase reading"}
                        </div>
                        <div className="focus-actions">
                          <button
                            onClick={() =>
                              void send(
                                `Explain the grammar and nuance of 「${selected}」 with a breakdown of particles and conjugations.`,
                              )
                            }
                          >
                            <Sparkles size={14} /> Explain grammar
                          </button>
                          <button
                            onClick={() =>
                              void send(
                                `Break down 「${selected}」 token by token. Give readings, meanings, particles and conjugation.`,
                              )
                            }
                          >
                            <Search size={14} /> Word breakdown
                          </button>
                          <button onClick={() => addCardFromPhrase(selected)}>
                            <BookOpen size={14} /> Add lesson card
                          </button>
                        </div>
                        <div className="focus-note">
                          Select a phrase in Sensei's response to ask about it
                          in context.
                        </div>
                      </>
                    )}
                  </>
                )}
                {tab === "cards" && (
                  <>
                    <div className="panel-intro">
                      <div className="source-icon orange">
                        <Library size={16} />
                      </div>
                      <div>
                        <b>Today's lesson cards</b>
                        <small>{due.length} ready to review</small>
                      </div>
                    </div>
                    {cards.slice(0, 5).map((c) => (
                      <div className="mini-card" key={c.id}>
                        <div>
                          <b>{c.kanji}</b>
                          <small>{c.kana}</small>
                        </div>
                        <button
                          onClick={() => {
                            setView("cards");
                          }}
                        >
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      className="all-sources"
                      onClick={() => {
                        setView("cards");
                      }}
                    >
                      Open revision desk <ArrowRight size={14} />
                    </button>
                  </>
                )}
              </div>
              <div className="companion-footer">
                <div className="fox-stamp">狐</div>
                <div>
                  <b>Small steps add up.</b>
                  <span>A little practice today goes a long way.</span>
                </div>
                <button onClick={() => setView("quiz")}>
                  <ArrowRight size={15} />
                </button>
              </div>
            </aside>
          </div>
        )}
        {view === "cards" && (
          <section className="feature-page">
            <div className="feature-heading">
              <div>
                <div className="eyebrow">
                  <span className="sparkle-dot" /> SPACED REPETITION
                </div>
                <h1>Revision desk</h1>
                <p>Remember more with a little review at the right time.</p>
              </div>
              <div className="due-chip">
                <Flame size={15} />
                {due.length} due today
              </div>
            </div>
            {current ? (
              <div className="review-layout">
                <div className="review-main">
                  <div className="review-progress">
                    <span>DAILY REVIEW</span>
                    <span>
                      {1} <i /> {due.length}
                    </span>
                  </div>
                  <div
                    className={`flash-card ${revealed ? "revealed" : ""}`}
                    onClick={() => setRevealed(true)}
                  >
                    <div className="card-label">
                      {revealed ? "MEANING" : "WORD · TAP TO REVEAL"}
                    </div>
                    <div className="card-kanji">
                      {revealed ? current.meaning : current.kanji}
                    </div>
                    {revealed && (
                      <>
                        <div className="card-kana">
                          {current.kana}
                          {current.pitch && <span> · {current.pitch}</span>}
                        </div>
                        <div className="card-example">
                          <span>EXAMPLE</span>
                          {current.example ||
                            "Try using this in a sentence with Sensei."}
                        </div>
                        <div className="card-pos">
                          {current.partOfSpeech || "Japanese"}
                        </div>
                      </>
                    )}
                    <div className="flip-hint">
                      {revealed
                        ? "Rate how well you remembered"
                        : "Press Space to reveal"}{" "}
                      <span>SPACE</span>
                    </div>
                  </div>
                  {!revealed ? (
                    <button
                      className="reveal-button"
                      onClick={() => setRevealed(true)}
                    >
                      Show answer <ArrowRight size={15} />
                    </button>
                  ) : (
                    <div className="rating-row">
                      {(["Again", "Hard", "Good", "Easy"] as const).map(
                        (label, i) => (
                          <button
                            className={`rating rate-${i + 1}`}
                            key={label}
                            onClick={() => rate((i + 1) as Rating)}
                          >
                            <span>{i + 1}</span>
                            {label}
                            <small>
                              {i === 0
                                ? "<10m"
                                : i === 1
                                  ? "1d"
                                  : i === 2
                                    ? "3d"
                                    : `${Math.max(4, Math.round(current.stability || 7))}d`}
                            </small>
                          </button>
                        ),
                      )}
                    </div>
                  )}
                  <div className="keyboard-help">
                    <span>1–4</span> rate card <i /> <span>Space</span> reveal
                  </div>
                </div>
                <aside className="review-side">
                  <div className="review-side-title">
                    <Sparkles size={15} /> SESSION NOTES
                  </div>
                  <div className="session-stat">
                    <b>{cards.length}</b>
                    <span>total lesson cards</span>
                  </div>
                  <div className="session-stat">
                    <b>{cards.reduce((n, c) => n + c.reps, 0)}</b>
                    <span>reviews completed</span>
                  </div>
                  <div className="session-note">
                    <div>狐</div>
                    <p>
                      Take your time. Remembering is a skill you build one
                      review at a time.
                    </p>
                  </div>
                  <button
                    className="text-action"
                    onClick={() => setView("chat")}
                  >
                    Ask Sensei for help <ArrowRight size={14} />
                  </button>
                </aside>
              </div>
            ) : (
              <div className="completion-card">
                <div className="completion-icon">
                  <Check size={24} />
                </div>
                <div className="eyebrow">SESSION COMPLETE</div>
                <h2>お疲れさまでした！</h2>
                <p>
                  You've reviewed today's cards. Your next session is already
                  scheduled.
                </p>
                <div className="completion-actions">
                  <button
                    className="primary-action"
                    onClick={() => {
                      setView("chat");
                      setInput(
                        "Can you help me practice the words I reviewed today?",
                      );
                    }}
                  >
                    Practice with Sensei <ArrowRight size={15} />
                  </button>
                  <button
                    className="secondary-action"
                    onClick={() => setView("quiz")}
                  >
                    Try a quick quiz
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
        {view === "quiz" && (
          <section className="feature-page">
            <div className="feature-heading">
              <div>
                <div className="eyebrow">
                  <span className="sparkle-dot" /> ACTIVE RECALL
                </div>
                <h1>Quick quiz</h1>
                <p>A few thoughtful questions based on your lesson cards.</p>
              </div>
              <div className="due-chip">
                <Compass size={15} /> Japanese · N5
              </div>
            </div>
            {!quizStarted && !quizFinished ? (
              <div className="quiz-start">
                <div className="quiz-illustration">
                  <div className="quiz-sun" />
                  <span>学</span>
                  <i>あ</i>
                  <b>文</b>
                </div>
                <div className="eyebrow">A MOMENT TO PRACTICE</div>
                <h2>Make it stick.</h2>
                <p>
                  Sensei made a short vocabulary check from your saved lesson
                  cards. Take your time and learn from every answer.
                </p>
                <div className="quiz-facts">
                  <span>
                    <BookOpen size={15} />
                    {Math.min(5, cards.length)} questions
                  </span>
                  <span>
                    <Sparkles size={15} />
                    Vocabulary focus
                  </span>
                  <span>
                    <ShieldCheck size={15} />
                    No pressure
                  </span>
                </div>
                <button
                  className="primary-action"
                  disabled={quizLoading}
                  onClick={() => void beginQuiz()}
                >
                  {quizLoading
                    ? "Sensei is preparing questions…"
                    : "Begin quiz"}{" "}
                  {!quizLoading && <ArrowRight size={15} />}
                </button>
              </div>
            ) : q && quizScore < quizItems.length ? (
              <div className="quiz-question">
                <div className="quiz-progress">
                  <span>
                    QUESTION {quizIndex + 1} OF {quizItems.length}
                  </span>
                  <div>
                    {quizItems.map((_, i) => (
                      <i
                        key={i}
                        className={
                          i < quizIndex
                            ? "done"
                            : i === quizIndex
                              ? "current"
                              : ""
                        }
                      />
                    ))}
                  </div>
                </div>
                <div className="question-card">
                  <div className="question-type">VOCABULARY · MEANING</div>
                  <h2>{q.prompt}</h2>
                  <div className="answer-list">
                    {q.choices.map((c, i) => (
                      <button
                        key={i}
                        className={`${quizAnswer === i ? (c === q.answer ? "correct" : "incorrect") : ""} ${quizAnswer !== null && c === q.answer ? "show-correct" : ""}`}
                        disabled={quizAnswer !== null}
                        onClick={() => {
                          setQuizAnswer(i);
                          if (c === q.answer) setQuizScore((s) => s + 1);
                        }}
                      >
                        <span>{String.fromCharCode(65 + i)}</span>
                        {c}
                        {quizAnswer !== null && c === q.answer && (
                          <Check size={17} />
                        )}
                      </button>
                    ))}
                  </div>
                  {quizAnswer !== null && (
                    <div
                      className={`answer-feedback ${q.choices[quizAnswer] === q.answer ? "positive" : ""}`}
                    >
                      <b>
                        {q.choices[quizAnswer] === q.answer
                          ? "そうです！ Correct."
                          : "Not quite — here’s the answer."}
                      </b>
                      <span>{q.answer}</span>
                      {q.explanation && <small>{q.explanation}</small>}
                    </div>
                  )}
                </div>
                {quizAnswer !== null && (
                  <button
                    className="primary-action next-question"
                    onClick={() => {
                      setQuizAnswer(null);
                      if (quizIndex >= quizItems.length - 1) {
                        setQuizStarted(false);
                        setQuizFinished(true);
                      } else setQuizIndex((i) => i + 1);
                    }}
                  >
                    Continue <ArrowRight size={15} />
                  </button>
                )}
              </div>
            ) : (
              <div className="quiz-result">
                <div className="completion-icon">
                  <Check size={24} />
                </div>
                <div className="eyebrow">NICE WORK</div>
                <h2>
                  {quizScore} of {quizItems.length} correct.
                </h2>
                <p>
                  Practice makes progress. Review the words you missed, or ask
                  Sensei to use them in a conversation.
                </p>
                <button
                  className="primary-action"
                  onClick={() => setView("chat")}
                >
                  Practice with Sensei <ArrowRight size={15} />
                </button>
              </div>
            )}
          </section>
        )}
        {view === "reader" && (
          <section className="feature-page reader-page">
            <div className="feature-heading">
              <div>
                <div className="eyebrow">
                  <span className="sparkle-dot" /> VISION-GROUNDED READING
                </div>
                <h1>Read the world around you.</h1>
                <p>
                  Upload a menu, sign, or manga panel and explore Japanese in
                  context.
                </p>
              </div>
              <button
                className="secondary-action"
                onClick={() => file.current?.click()}
              >
                <ImagePlus size={15} /> Add image
              </button>
            </div>
            <input
              ref={file}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <div className="reader-grid">
              <div className="upload-panel">
                {image ? (
                  <div className="image-preview">
                    <div
                      className="image-stage"
                      style={{
                        aspectRatio: `${imageDimensions.width}/${imageDimensions.height}`,
                      }}
                    >
                      <img
                        src={image}
                        alt="Japanese text to read"
                        onLoad={(e) =>
                          setImageDimensions({
                            width: e.currentTarget.naturalWidth,
                            height: e.currentTarget.naturalHeight,
                          })
                        }
                      />
                      {ocrRegions.map((r, i) => {
                        const [y1, x1, y2, x2] = r.box_2d;
                        return (
                          <button
                            key={i}
                            className="ocr-box"
                            style={{
                              left: `${x1 / 10}%`,
                              top: `${y1 / 10}%`,
                              width: `${(x2 - x1) / 10}%`,
                              height: `${(y2 - y1) / 10}%`,
                            }}
                            onClick={() =>
                              void send(
                                `Explain this text from the image: 「${r.text}」${r.reading ? ` (${r.reading})` : ""}. Translation: ${r.translation || "unknown"}. Explain nuance in this scene.`,
                              )
                            }
                            title={r.translation || r.text}
                          >
                            <span>{i + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="vision-badge">
                      <span /> IMAGE READY
                    </div>
                  </div>
                ) : (
                  <button
                    className="dropzone"
                    onClick={() => file.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      onFile(e.dataTransfer.files[0]);
                    }}
                  >
                    <div className="upload-icon">
                      <ImagePlus size={23} />
                    </div>
                    <b>Drop an image to get started</b>
                    <span>Menus, signs, manga panels · JPG, PNG or WEBP</span>
                    <small>Up to 7 MB</small>
                    <span className="browse-button">Browse files</span>
                  </button>
                )}
                <div className="reader-disclaimer">
                  <ShieldCheck size={14} />
                  <span>
                    Images are sent to the model configured for Sensei. Local
                    models keep them on this device.
                  </span>
                </div>
              </div>
              <div className="ocr-panel">
                <div className="ocr-panel-head">
                  <div className="context-title">
                    <Sparkles size={16} /> Reading with Sensei
                  </div>
                  <span
                    className={`vision-status ${modelReady ? "" : "offline"}`}
                  >
                    <i />
                    {modelReady ? "Model connected" : "Model offline"}
                  </span>
                </div>
                {!image ? (
                  <div className="ocr-empty">
                    <div>あ</div>
                    <b>Your reading notes will appear here.</b>
                    <span>
                      Sensei will transcribe the Japanese, explain useful
                      phrases, and tell you when something is uncertain.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="ocr-content">
                      {sceneSummary && (
                        <div className="scene-context">
                          <b>Scene context</b>
                          <span>{sceneSummary}</span>
                        </div>
                      )}
                      {ocrBusy ? (
                        <div className="ocr-loading">
                          <i />
                          <i />
                          <i />
                          <span>Sensei is reading the image…</span>
                        </div>
                      ) : (
                        <div className="ocr-answer">
                          {messages.filter((m) => m.role === "assistant").at(-1)
                            ?.content || "Waiting for Sensei…"}
                        </div>
                      )}
                    </div>
                    {!ocrBusy && ocrRegions.length > 0 && (
                      <div className="ocr-region-list">
                        {ocrRegions.map((r, i) => (
                          <div key={i} className="ocr-region-row">
                            <span>{i + 1}</span>
                            <div>
                              <input
                                aria-label={`OCR text ${i + 1}`}
                                value={r.text}
                                onChange={(e) =>
                                  setOcrRegions((rs) =>
                                    rs.map((x, j) =>
                                      j === i
                                        ? { ...x, text: e.target.value }
                                        : x,
                                    ),
                                  )
                                }
                              />
                              <small>
                                {r.reading || "Reading pending"} ·{" "}
                                {r.translation || "Translation pending"}
                                {typeof r.confidence === "number"
                                  ? ` · ${Math.round(r.confidence * 100)}%`
                                  : ""}
                              </small>
                            </div>
                            <button
                              className="tiny-icon"
                              onClick={() =>
                                void send(
                                  `Explain this text from the image: 「${r.text}」${r.reading ? ` (${r.reading})` : ""}. Translation: ${r.translation || "unknown"}. Explain nuance in this scene.`,
                                )
                              }
                            >
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {!ocrBusy && (
                      <div className="ocr-actions">
                        <button
                          className="secondary-action"
                          onClick={() =>
                            pushNotice(
                              "Select a highlighted region to ask Sensei about it.",
                            )
                          }
                        >
                          Select a region to explore <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      {draftBusy && (
        <div className="toast">
          <Sparkles size={15} /> Sensei is preparing a card…
        </div>
      )}
      {pendingCard && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPendingCard(null);
          }}
        >
          <section className="settings-modal card-editor">
            <header>
              <div>
                <div className="eyebrow">REVIEW BEFORE SAVING</div>
                <h2>New lesson card</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setPendingCard(null)}
              >
                <X size={17} />
              </button>
            </header>
            <div className="card-editor-fields">
              {(
                [
                  ["kanji", "Japanese"],
                  ["kana", "Reading"],
                  ["meaning", "Meaning"],
                  ["partOfSpeech", "Part of speech"],
                  ["pitch", "Pitch accent (optional)"],
                  ["example", "Example sentence"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    value={pendingCard[key] || ""}
                    onChange={(e) =>
                      setPendingCard((c) =>
                        c ? { ...c, [key]: e.target.value } : c,
                      )
                    }
                    placeholder={
                      key === "pitch" ? "Leave blank if unknown" : ""
                    }
                  />
                </label>
              ))}
            </div>
            <div className="card-editor-actions">
              <button
                className="secondary-action"
                onClick={() => setPendingCard(null)}
              >
                Cancel
              </button>
              <button className="primary-action" onClick={saveDraftCard}>
                Save to lesson cards <BookOpen size={14} />
              </button>
            </div>
          </section>
        </div>
      )}
      {notice && (
        <div className="toast">
          <Check size={15} />
          {notice}
          <button onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {accountOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAccountOpen(false);
          }}
        >
          <section className="settings-modal account-modal">
            <header>
              <div>
                <div className="eyebrow">KONGO ACCOUNT</div>
                <h2>
                  {account?.user
                    ? "Your account"
                    : accountMode === "signin"
                      ? "Welcome back"
                      : "Create your account"}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setAccountOpen(false)}
              >
                <X size={17} />
              </button>
            </header>
            {account?.user ? (
              <div className="account-signed-in">
                <div className="avatar-user">
                  {account.user.name?.[0]?.toUpperCase() || "K"}
                </div>
                <b>{account.user.name}</b>
                <span>{account.user.email}</span>
                <p>
                  Local study data stays on this device. Cloud sync is a
                  separate setting.
                </p>
                <button
                  className="secondary-action"
                  onClick={() => void signOutAccount()}
                >
                  Sign out
                </button>
              </div>
            ) : !authAvailable ? (
              <div className="auth-unavailable">
                <div className="privacy-row">
                  <ShieldCheck size={17} />
                  <span>Guest study is ready and stored locally.</span>
                  <Check size={15} />
                </div>
                <p>
                  Account sign-in is available when you configure PostgreSQL and
                  Better Auth.
                </p>
                <div className="settings-hint">
                  Set <code>DATABASE_URL</code> and{" "}
                  <code>BETTER_AUTH_SECRET</code>, then run{" "}
                  <code>docker compose up -d postgres</code>. OAuth can use
                  Google or GitHub client credentials.
                </div>
              </div>
            ) : (
              <form className="auth-form" onSubmit={submitAccount}>
                {accountMode === "signup" && (
                  <label>
                    Your name
                    <input
                      autoComplete="name"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      required
                    />
                  </label>
                )}
                <label>
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    autoComplete={
                      accountMode === "signin"
                        ? "current-password"
                        : "new-password"
                    }
                    minLength={8}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                  />
                </label>
                {authError && (
                  <div className="auth-error" role="alert">
                    {authError}
                  </div>
                )}
                <button
                  className="primary-action full-button"
                  disabled={authBusy}
                >
                  {authBusy
                    ? "Please wait…"
                    : accountMode === "signin"
                      ? "Sign in"
                      : "Create account"}
                </button>
                {authProviders.length > 0 && (
                  <>
                    <div className="auth-divider">OR CONTINUE WITH</div>
                    <div className="oauth-buttons">
                      {authProviders.map((provider) => (
                        <button
                          type="button"
                          className="secondary-action"
                          key={provider}
                          disabled={authBusy}
                          onClick={() => void signInWith(provider)}
                        >
                          {provider === "google" ? "Google" : "GitHub"}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <button
                  type="button"
                  className="auth-switch"
                  onClick={() => {
                    setAccountMode(
                      accountMode === "signin" ? "signup" : "signin",
                    );
                    setAuthError("");
                  }}
                >
                  {accountMode === "signin"
                    ? "New to Kongo? Create an account"
                    : "Already have an account? Sign in"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
      {settings && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSettings(false);
          }}
        >
          <section className="settings-modal">
            <header>
              <div>
                <div className="eyebrow">YOUR STUDY SPACE</div>
                <h2>Settings</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSettings(false)}
              >
                <X size={17} />
              </button>
            </header>
            <div className="settings-section">
              <div className="settings-label">
                <b>Sensei model</b>
                <span>Configured on the local model bridge</span>
              </div>
              <div className="connection-card">
                <div
                  className={`connection-icon ${modelReady ? "" : "offline"}`}
                >
                  <Sparkles size={17} />
                </div>
                <div>
                  <b>{modelName}</b>
                  <span>
                    {modelReady
                      ? "Local model connected"
                      : runnerAvailable
                        ? "Ollama is running. Pull the recommended model to chat."
                        : "Start Ollama to use the configured local model."}
                  </span>
                </div>
                <div
                  className={`connection-dot ${modelReady ? "" : "offline"}`}
                />
              </div>
              <div className="settings-hint">
                Recommended for this PC: Qwen3.5 9B Q4 (6.6 GB) shares one
                multimodal model across tutoring and image reading. With 8 GB
                VRAM, use a 4K context; switch to Qwen3.5 4B (3.4 GB) if memory
                runs tight. Your browser only talks to the local bridge.
              </div>
              {!runnerAvailable ? (
                <a
                  className="secondary-action full-button"
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noreferrer"
                >
                  Install Ollama for Windows <ArrowRight size={14} />
                </a>
              ) : !modelInstalled ? (
                <button
                  className="secondary-action full-button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(
                      "ollama pull qwen3.5:9b",
                    );
                    pushNotice("Copied: ollama pull qwen3.5:9b");
                  }}
                >
                  Copy model install command <Copy size={13} />
                </button>
              ) : (
                <button
                  className="secondary-action full-button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(
                      "ollama pull qwen3.5:4b",
                    );
                    pushNotice("Copied fallback: ollama pull qwen3.5:4b");
                  }}
                >
                  Copy smaller fallback command <Copy size={13} />
                </button>
              )}
              <button
                className="secondary-action full-button"
                onClick={() =>
                  void apiFetch("/api/status")
                    .then((r) => r.json())
                    .then((x) => {
                      setModelReady(Boolean(x.ready));
                      setRunnerAvailable(Boolean(x.runnerAvailable));
                      setModelInstalled(Boolean(x.installed));
                      setModelName(
                        x.installed
                          ? x.model
                          : x.runnerAvailable
                            ? `${x.model} not installed`
                            : "Ollama not installed",
                      );
                      pushNotice(
                        x.ready
                          ? "Local model is ready."
                          : x.runnerAvailable
                            ? "Ollama is running; install the recommended model."
                            : "Install Ollama to connect Sensei.",
                      );
                    })
                    .catch(() =>
                      pushNotice("Start npm run bridge to connect Sensei."),
                    )
                }
              >
                Check connection <ArrowRight size={14} />
              </button>
            </div>
            <div className="settings-section">
              <div className="settings-label">
                <b>Learning level</b>
                <span>Sensei will adapt language and explanations</span>
              </div>
              <select
                className="setting-select"
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value);
                  localStorage.setItem("kongo-level", e.target.value);
                }}
              >
                {["N5", "N4", "N3", "N2", "N1"].map((l) => (
                  <option key={l} value={l}>
                    JLPT {l} ·{" "}
                    {
                      (
                        {
                          N5: "Beginner",
                          N4: "Elementary",
                          N3: "Intermediate",
                          N2: "Upper intermediate",
                          N1: "Advanced",
                        } as Record<string, string>
                      )[l]
                    }
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-section">
              <div className="settings-label">
                <b>Data & privacy</b>
                <span>
                  Your study data is saved in this browser on this device.
                </span>
              </div>
              <div className="privacy-row">
                <ShieldCheck size={17} />
                <span>Local-first storage</span>
                <Check size={15} />
              </div>
            </div>
            <button
              className="settings-done"
              onClick={() => setSettings(false)}
            >
              Done
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
