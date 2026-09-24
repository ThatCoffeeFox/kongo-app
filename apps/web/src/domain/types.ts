export type Rating = 1 | 2 | 3 | 4;
export type Card = {
  id: string;
  kanji: string;
  kana: string;
  meaning: string;
  pitch?: string;
  partOfSpeech?: string;
  example?: string;
  dueAt: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  createdAt: number;
  lastReviewAt?: number;
  fsrsState?: "New" | "Learning" | "Review" | "Relearning";
  scheduledDays?: number;
};
export type Citation = {
  id: string;
  title: string;
  section: string;
  level: string;
  content: string;
  example: string;
  provenance: string;
};
export type TutorTurn = {
  response: string;
  wordsOfInterest: {
    term: string;
    reading: string;
    meaning: string;
  }[];
  examples: {
    japanese: string;
    reading: string;
    translation: string;
    teachingPoint: string;
  }[];
  followUpQuestions: {
    japanese: string;
    reading: string;
    translation: string;
  }[];
  savedCardReferences: {
    cardId: string;
    connection: string;
    isRecallPrompt?: boolean;
  }[];
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  image?: string;
  citations?: Citation[];
  tutorTurn?: TutorTurn;
  scene?: string;
  regions?: {
    box_2d: [number, number, number, number];
    text: string;
    reading?: string;
    translation?: string;
    confidence?: number;
    writing_direction?: string;
  }[];
};
export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};
export type ReviewLog = {
  cardId: string;
  rating: Rating;
  at: number;
  intervalDays: number;
};
