import { type Card as FsrsCard, fsrs, Rating, State } from "ts-fsrs";
import type {
  Rating as AppRating,
  Card,
} from "../../../apps/web/src/domain/types";

// FSRS-5 published default parameters, passed to the pinned FSRS-5 implementation.
const FSRS5_DEFAULT_WEIGHTS = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655,
  0.6621,
] as const;
const scheduler = fsrs({
  w: [...FSRS5_DEFAULT_WEIGHTS],
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: false,
  enable_short_term: false,
});
const ratingMap: Record<AppRating, Rating> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
};

export function scheduleReview(
  card: Card,
  rating: AppRating,
  now = Date.now(),
): Card {
  const state: FsrsCard = {
    due: new Date(card.dueAt),
    stability: card.stability,
    difficulty: card.reps === 0 ? 0 : card.difficulty,
    elapsed_days: card.lastReviewAt
      ? Math.max(0, (now - card.lastReviewAt) / 86_400_000)
      : 0,
    scheduled_days: card.scheduledDays ?? card.stability,
    reps: card.reps,
    lapses: card.lapses,
    state: card.fsrsState
      ? State[card.fsrsState]
      : card.reps === 0
        ? State.New
        : State.Review,
    ...(card.lastReviewAt ? { last_review: new Date(card.lastReviewAt) } : {}),
  };
  const result = scheduler.repeat(state, new Date(now))[
    ratingMap[rating] as Exclude<Rating, Rating.Manual>
  ];
  return {
    ...card,
    dueAt: result.card.due.getTime(),
    stability: result.card.stability,
    difficulty: result.card.difficulty,
    reps: result.card.reps,
    lapses: result.card.lapses,
    lastReviewAt: now,
    fsrsState: State[result.card.state] as Card["fsrsState"],
    scheduledDays: result.card.scheduled_days,
  };
}
