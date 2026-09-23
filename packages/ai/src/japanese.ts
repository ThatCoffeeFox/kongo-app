export type JapaneseToken = {
  surface: string;
  reading: string;
  meaning: string;
};
const dictionary: JapaneseToken[] = [
  {
    surface: "よろしくお願いします",
    reading: "よろしくおねがいします",
    meaning: "polite greeting/request",
  },
  { surface: "大丈夫", reading: "だいじょうぶ", meaning: "okay; all right" },
  { surface: "見つける", reading: "みつける", meaning: "to find" },
  { surface: "予約", reading: "よやく", meaning: "reservation" },
  { surface: "急ぐ", reading: "いそぐ", meaning: "to hurry" },
  { surface: "間に合う", reading: "まにあう", meaning: "to be in time" },
  { surface: "気になる", reading: "きになる", meaning: "to be curious about" },
  { surface: "学生", reading: "がくせい", meaning: "student" },
  { surface: "勉強", reading: "べんきょう", meaning: "study" },
  { surface: "電車", reading: "でんしゃ", meaning: "train" },
  { surface: "学校", reading: "がっこう", meaning: "school" },
  { surface: "日本語", reading: "にほんご", meaning: "Japanese language" },
  { surface: "今日", reading: "きょう", meaning: "today" },
  { surface: "一緒", reading: "いっしょ", meaning: "together" },
  { surface: "食べる", reading: "たべる", meaning: "to eat" },
  { surface: "行く", reading: "いく", meaning: "to go" },
];
const longestFirst = [...dictionary].sort(
  (a, b) => b.surface.length - a.surface.length,
);
export function analyzeJapanese(text: string): JapaneseToken[] {
  const tokens: JapaneseToken[] = [];
  let i = 0;
  while (i < text.length) {
    const match = longestFirst.find((entry) =>
      text.startsWith(entry.surface, i),
    );
    if (match) {
      tokens.push(match);
      i += match.surface.length;
      continue;
    }
    const start = i;
    const isJp = /[\u3040-\u30ff\u3400-\u9fff]/.test(text[i] || "");
    i++;
    while (
      i < text.length &&
      !longestFirst.some((entry) => text.startsWith(entry.surface, i)) &&
      /[\u3040-\u30ff\u3400-\u9fff]/.test(text[i] || "") === isJp
    )
      i++;
    tokens.push({ surface: text.slice(start, i), reading: "", meaning: "" });
  }
  return tokens;
}
