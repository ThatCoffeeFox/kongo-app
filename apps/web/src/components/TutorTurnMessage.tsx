import type { ReactNode } from "react";
import type { Card, TutorTurn } from "../domain/types";

type CardReference = Pick<Card, "id" | "kanji" | "kana" | "meaning"> & {
  connection: string;
  isRecallPrompt?: boolean;
};

export function TutorTurnMessage({
  turn,
  cards,
  renderMarkdown,
  onFollowUp,
  onSaveWord,
  onOpenCards,
}: {
  turn: TutorTurn;
  cards: Card[];
  renderMarkdown: (content: string) => ReactNode;
  onFollowUp: (question: string) => void;
  onSaveWord: (word: string) => void;
  onOpenCards: () => void;
}) {
  const cardReferences: CardReference[] = turn.savedCardReferences.flatMap(
    (reference) => {
      const card = cards.find((item) => item.id === reference.cardId);
      return card
        ? [
            {
              ...card,
              connection: reference.connection,
              isRecallPrompt: reference.isRecallPrompt,
            },
          ]
        : [];
    },
  );

  return (
    <div className="tutor-turn">
      <section className="tutor-answer">
        <div className="tutor-section-label">Sensei explains</div>
        {renderMarkdown(turn.response)}
      </section>

      <section className="tutor-examples" aria-label="Japanese examples">
        <div className="tutor-section-heading">
          <h3>See it in Japanese</h3>
          <span>{turn.examples.length} examples</span>
        </div>
        <div className="tutor-example-list">
          {turn.examples.map((example, index) => (
            <article
              className="tutor-example"
              key={`${example.japanese}-${index}`}
            >
              <div className="tutor-example-number">0{index + 1}</div>
              <div className="tutor-example-content">
                <div className="tutor-example-japanese">
                  {renderMarkdown(example.japanese)}
                </div>
                {example.reading && (
                  <div className="tutor-example-reading">{example.reading}</div>
                )}
                <div className="tutor-example-translation">
                  {example.translation}
                </div>
                {example.teachingPoint && (
                  <div className="tutor-example-point">
                    {example.teachingPoint}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="tutor-words" aria-label="Words of interest">
        <div className="tutor-section-heading">
          <h3>Words to notice</h3>
        </div>
        <div className="tutor-word-list">
          {turn.wordsOfInterest.map((word) => (
            <article
              className="tutor-word"
              key={`${word.term}-${word.reading}`}
            >
              <div className="tutor-word-top">
                <button
                  className="tutor-word-term"
                  onClick={() => onSaveWord(word.term)}
                  title={`Save ${word.term} to lesson cards`}
                >
                  {word.term}
                </button>
                {word.reading && (
                  <span className="tutor-word-reading">{word.reading}</span>
                )}
              </div>
              <div className="tutor-word-meaning">{word.meaning}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="tutor-followups" aria-label="Continue learning">
        <div className="tutor-section-heading">
          <h3>Your turn</h3>
          <span>Choose a question to continue</span>
        </div>
        <div className="tutor-followup-list">
          {turn.followUpQuestions.map((question, index) => (
            <button
              className="tutor-followup"
              key={`${question.japanese}-${index}`}
              onClick={() => onFollowUp(question.japanese)}
            >
              <span className="tutor-followup-japanese">
                {question.japanese}
              </span>
              {question.reading && (
                <span className="tutor-followup-reading">
                  {question.reading}
                </span>
              )}
              <span className="tutor-followup-translation">
                {question.translation}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section
        className="tutor-card-references"
        aria-label="Saved lesson cards"
      >
        <div className="tutor-section-heading">
          <h3>From your lesson cards</h3>
          <button onClick={onOpenCards}>Open cards</button>
        </div>
        {cardReferences.length ? (
          <ul>
            {cardReferences.map((card) => (
              <li key={card.id}>
                {card.isRecallPrompt ? (
                  <strong>A saved card is due for review</strong>
                ) : (
                  <div>
                    <strong>{card.kanji}</strong>
                    {card.kana && <span>{card.kana}</span>}
                    <small>{card.meaning}</small>
                  </div>
                )}
                <p>{card.connection}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tutor-no-card-reference">
            No saved card connects directly to this lesson yet.
          </p>
        )}
      </section>
    </div>
  );
}
