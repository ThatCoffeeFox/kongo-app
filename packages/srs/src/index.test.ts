import { createEmptyCard } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import type { Card } from "../../../apps/web/src/domain/types";
import { scheduleReview } from "./index";

const card: Card = {
  id: "test-card",
  kanji: "大丈夫",
  kana: "だいじょうぶ",
  meaning: "okay",
  dueAt: 0,
  stability: 0,
  difficulty: 5,
  reps: 0,
  lapses: 0,
  createdAt: 0,
};
describe("FSRS-5 scheduling", () => {
  it("starts a new card and preserves the learner grade", () => {
    const result = scheduleReview(card, 3, 1_000_000);
    expect(result.reps).toBe(1);
    expect(result.stability).toBeGreaterThan(0);
    expect(result.difficulty).toBeGreaterThanOrEqual(1);
    expect(result.difficulty).toBeLessThanOrEqual(10);
    expect(result.dueAt).toBeGreaterThan(1_000_000);
  });
  it("records lapses after Again and applies the retry step", () => {
    const learned = scheduleReview(card, 3, 1_000_000);
    const result = scheduleReview(learned, 1, learned.dueAt);
    expect(result.lapses).toBe(1);
    expect(result.dueAt).toBeGreaterThan(learned.dueAt);
  });
  it("schedules Easy further out than Again", () => {
    const again = scheduleReview(card, 1, 1_000_000);
    const easy = scheduleReview(card, 4, 1_000_000);
    expect(easy.dueAt).toBeGreaterThan(again.dueAt);
  });
  it("uses a valid FSRS empty card shape", () => {
    const initial = createEmptyCard(new Date(0));
    expect(initial.state).toBeDefined();
  });
});
