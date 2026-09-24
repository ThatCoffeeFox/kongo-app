import { expect, test } from "@playwright/test";

test("local tutor returns a Japanese-rich structured lesson with examples and a card link", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".model-pill")).toContainText("qwen3.5:9b");
  await page
    .getByPlaceholder("Ask Sensei anything… Try Japanese, English, or both")
    .fill(
      "At JLPT N5, teach me 「という」 in the name pattern. Explain mostly in Japanese, show how it connects to my saved card せっかく, include examples, and do not use romaji.",
    );
  await page.locator(".send-button").click();
  await expect(page.locator(".typing")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".typing")).toHaveCount(0, { timeout: 180000 });
  const turn = page.locator(".tutor-turn").last();
  await expect(turn.locator(".tutor-answer")).toContainText("という");
  await expect(turn.locator(".tutor-answer")).not.toContainText(
    "と」という言葉",
  );
  await expect(turn.locator(".tutor-example")).toHaveCount(3);
  expect(await turn.locator(".tutor-word").count()).toBeGreaterThanOrEqual(2);
  await expect(turn.locator(".tutor-followup").first()).toBeVisible();
  await expect(turn.locator(".tutor-followup").first()).toContainText(
    "今学んだ表現を使って",
  );
  await expect(turn.locator(".tutor-card-references")).toContainText(
    "せっかく",
  );
  await expect(turn).not.toContainText(/\{\s*"response"|to iu|romanization/i);
  const samples = await turn.locator(".tutor-example-japanese").allInnerTexts();
  const readings = await turn.locator(".tutor-example-reading").allInnerTexts();
  expect(
    samples.every((sample) => /[\u3040-\u30ff\u3400-\u9fff]/.test(sample)),
  ).toBe(true);
  expect(samples.join("\n")).not.toContain("日本語にほんご");
  expect(
    readings.every((reading) =>
      /^[\u3040-\u309f\u30fc\u3001。！？\s]+$/u.test(reading),
    ),
  ).toBe(true);
  console.log(
    "STRUCTURED SAMPLE",
    JSON.stringify({
      answer: await turn.locator(".tutor-answer").innerText(),
      examples: samples,
      readings,
      words: await turn.locator(".tutor-word-list").innerText(),
      followUp: await turn.locator(".tutor-followup-list").innerText(),
      cards: await turn.locator(".tutor-card-references").innerText(),
    }),
  );
});
