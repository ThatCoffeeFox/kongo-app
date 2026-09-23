import type { Card, Message, ReviewLog } from "../domain/types";

const DB = "kongo-local-v1";
const stores = ["cards", "messages", "reviews"];
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      for (const name of stores)
        if (!request.result.objectStoreNames.contains(name))
          request.result.createObjectStore(name, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function all<T>(store: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}
async function put<T extends { id?: string }>(
  store: string,
  value: T,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(store, "readwrite")
      .objectStore(store)
      .put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
const starter: Omit<
  Card,
  "dueAt" | "stability" | "difficulty" | "reps" | "lapses" | "createdAt"
>[] = [
  {
    id: "v1",
    kanji: "よろしくお願いします",
    kana: "よろしくおねがいします",
    meaning: "Pleased to meet you; I look forward to working with you.",
    partOfSpeech: "expression",
    example: "これからよろしくお願いします。",
  },
  {
    id: "v2",
    kanji: "大丈夫",
    kana: "だいじょうぶ",
    meaning: "Okay; all right; no problem.",
    partOfSpeech: "な-adjective",
    example: "ここに座っても大丈夫ですか。",
  },
  {
    id: "v3",
    kanji: "見つける",
    kana: "みつける",
    meaning: "to find; to discover",
    partOfSpeech: "verb",
    example: "駅の近くでいい店を見つけました。",
  },
  {
    id: "v4",
    kanji: "急ぐ",
    kana: "いそぐ",
    meaning: "to hurry; to rush",
    partOfSpeech: "う-verb",
    example: "時間がないので、急ぎましょう。",
  },
  {
    id: "v5",
    kanji: "予約",
    kana: "よやく",
    meaning: "reservation; appointment",
    partOfSpeech: "noun / する-verb",
    example: "レストランを七時に予約しました。",
  },
  {
    id: "v6",
    kanji: "間に合う",
    kana: "まにあう",
    meaning: "to be in time; to make it",
    partOfSpeech: "う-verb",
    example: "急げば電車に間に合います。",
  },
  {
    id: "v7",
    kanji: "気になる",
    kana: "きになる",
    meaning: "to be curious about; to concern",
    partOfSpeech: "expression",
    example: "あの店の新しいメニューが気になります。",
  },
  {
    id: "v8",
    kanji: "せっかく",
    kana: "せっかく",
    meaning: "with effort; taking advantage of a special opportunity",
    partOfSpeech: "adverb",
    example: "せっかく日本に来たから、温泉に行きたい。",
  },
];
export const store = {
  async cards() {
    let cards = await all<Card>("cards");
    if (!cards.length) {
      const now = Date.now();
      cards = starter.map((card, i) => ({
        ...card,
        dueAt: now,
        stability: 0,
        difficulty: 5,
        reps: 0,
        lapses: 0,
        createdAt: now + i,
      }));
      for (const card of cards) await put("cards", card);
    }
    return cards.sort((a, b) => a.dueAt - b.dueAt);
  },
  async saveCard(card: Card) {
    await put("cards", card);
  },
  async messages() {
    return (await all<Message>("messages")).sort(
      (a, b) => a.createdAt - b.createdAt,
    );
  },
  async saveMessage(message: Message) {
    await put("messages", message);
  },
  async reviews() {
    return all<ReviewLog & { id: string }>("reviews");
  },
  async logReview(log: ReviewLog) {
    await put("reviews", { ...log, id: `${log.cardId}-${log.at}` });
  },
};
