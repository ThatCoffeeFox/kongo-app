import { expect, test } from "@playwright/test";

const answer = (page: import("@playwright/test").Page) =>
  page.locator(".message-row.assistant .bubble").last();

test("guest completes the local Japanese learning loop", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Learn through conversation." }),
  ).toBeVisible();
  await expect(page.locator(".model-pill")).toContainText("qwen3.5:9b");

  await page
    .getByPlaceholder("Ask Sensei anything… Try Japanese, English, or both")
    .fill(
      "At JLPT N5 level, explain は versus が in three short sentences with a simple Japanese example.",
    );
  await page.locator(".send-button").click();
  await expect(answer(page)).not.toHaveText("");
  await expect(answer(page)).not.toContainText("Sensei is thinking");
  await expect(answer(page)).toContainText(/[\u3040-\u30ff\u3400-\u9fff]/);

  const cardCountBefore = Number(await page.locator(".nav-count").innerText());
  await page
    .locator(".message-row.assistant .message-tools")
    .last()
    .getByRole("button", { name: "Save to cards" })
    .click();
  await expect(
    page.getByRole("heading", { name: "New lesson card" }),
  ).toBeVisible();
  await page.getByLabel("Japanese", { exact: true }).fill("日本語");
  await page.getByLabel("Reading", { exact: true }).fill("にほんご");
  await page.getByLabel("Meaning", { exact: true }).fill("Japanese language");
  await page.getByRole("button", { name: /Save to lesson cards/ }).click();

  await expect(page.locator(".nav-count")).toHaveText(
    String(cardCountBefore + 1),
  );
  await page.locator(".nav-item").filter({ hasText: "Lesson cards" }).click();
  await expect(
    page.getByRole("heading", { name: "Revision desk" }),
  ).toBeVisible();
  await expect(page.locator(".session-stat b").first()).toHaveText(
    String(cardCountBefore + 1),
  );
  await expect(page.locator(".card-kanji")).not.toBeEmpty();
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.locator(".rating-row")).toBeVisible();
  await page.getByRole("button", { name: /Good/ }).click();
  await expect(page.locator(".due-chip")).toContainText(
    `${cardCountBefore} due today`,
  );

  await page.locator(".nav-item").filter({ hasText: "Quick quiz" }).click();
  await expect(page.getByRole("heading", { name: "Quick quiz" })).toBeVisible();
  await page.getByRole("button", { name: /Begin quiz/ }).click();
  await expect(page.locator(".question-card h2")).toBeVisible();
  await page.locator(".answer-list button").first().click();
  await expect(page.locator(".answer-feedback")).toBeVisible();

  await page.locator(".nav-item").filter({ hasText: "Image reader" }).click();
  await expect(
    page.getByRole("heading", { name: "Read the world around you." }),
  ).toBeVisible();
  const imageUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 240;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#111";
    context.font = '72px "Yu Gothic", "Meiryo", sans-serif';
    context.fillText("日本語", 60, 150);
    return canvas.toDataURL("image/png");
  });
  await page.locator(".reader-page input[type=file]").setInputFiles({
    name: "japanese-sign.png",
    mimeType: "image/png",
    buffer: Buffer.from(imageUrl.split(",")[1], "base64"),
  });
  await expect(page.getByText("IMAGE READY")).toBeVisible();
  await expect(page.locator(".ocr-loading")).toHaveCount(0, {
    timeout: 180_000,
  });
  await expect(page.locator(".ocr-answer")).not.toContainText(
    "Waiting for Sensei",
  );
  await expect(page.locator(".ocr-answer")).not.toContainText(
    "The model returned an unstructured reading",
  );
  await expect(page.locator(".ocr-region-row").first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});
