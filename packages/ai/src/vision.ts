import { z } from "zod";

const box = z
  .tuple([
    z.number().min(0).max(1000),
    z.number().min(0).max(1000),
    z.number().min(0).max(1000),
    z.number().min(0).max(1000),
  ])
  .refine(
    ([y1, x1, y2, x2]) => y2 >= y1 && x2 >= x1,
    "Box coordinates must be ordered top-left to bottom-right.",
  );
export const visionResultSchema = z
  .object({
    scene: z.string().max(2000).default(""),
    regions: z
      .array(
        z.object({
          box_2d: box,
          text: z.string().min(1).max(1000),
          reading: z.string().max(500).optional(),
          translation: z.string().max(1000).optional(),
          confidence: z.number().min(0).max(1).optional(),
          writing_direction: z.enum(["horizontal", "vertical"]).optional(),
        }),
      )
      .max(100),
  })
  .strict();
export type VisionResult = z.infer<typeof visionResultSchema>;
export function parseVisionResult(raw: string): VisionResult {
  const candidate = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  return visionResultSchema.parse(JSON.parse(candidate));
}
export function normalizeBox([y1, x1, y2, x2]: [
  number,
  number,
  number,
  number,
]) {
  return {
    left: x1 / 10,
    top: y1 / 10,
    width: (x2 - x1) / 10,
    height: (y2 - y1) / 10,
  };
}
