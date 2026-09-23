import { describe, expect, it } from "vitest";
import { analyzeJapanese } from "./japanese";

describe("Japanese token spans", () => {
  it("recognizes known vocabulary and preserves exact surface text", () => {
    expect(
      analyzeJapanese("今日は電車で行く。")
        .map((x) => x.surface)
        .join(""),
    ).toBe("今日は電車で行く。");
    expect(analyzeJapanese("大丈夫です")[0]).toMatchObject({
      surface: "大丈夫",
      reading: "だいじょうぶ",
    });
  });
  it("keeps punctuation and unknown text without losing offsets", () => {
    const input = "は、どこ？";
    expect(
      analyzeJapanese(input)
        .map((t) => t.surface)
        .join(""),
    ).toBe(input);
  });
});
