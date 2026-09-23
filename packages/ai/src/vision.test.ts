import { describe, expect, it } from "vitest";
import { normalizeBox, parseVisionResult } from "./vision";

describe("vision response validation", () => {
  it("parses model boxes and maps coordinates to overlay percentages", () => {
    const result = parseVisionResult(
      '```json\n{"scene":"A shop sign","regions":[{"box_2d":[100,200,500,800],"text":"営業中","reading":"えいぎょうちゅう","translation":"Open","confidence":0.93}]}\n```',
    );
    expect(result.regions).toHaveLength(1);
    expect(normalizeBox(result.regions[0]!.box_2d)).toEqual({
      left: 20,
      top: 10,
      width: 60,
      height: 40,
    });
  });
  it("rejects out-of-range and reversed boxes", () => {
    expect(() =>
      parseVisionResult(
        '{"regions":[{"box_2d":[900,800,100,200],"text":"店"}]}',
      ),
    ).toThrow();
    expect(() =>
      parseVisionResult('{"regions":[{"box_2d":[0,0,1500,1000],"text":"店"}]}'),
    ).toThrow();
  });
});
