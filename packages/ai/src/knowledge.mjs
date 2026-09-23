export const knowledge = [
  {
    id: "topic-wa",
    title: "Kongo Grammar Notes",
    section: "Topic marker は",
    level: "N5",
    content:
      "は marks the topic: what the sentence is about. It can contrast the topic with other possibilities. The particle is written は but pronounced wa.",
    example: "私は学生です。— As for me, I am a student.",
    provenance: "Original Kongo beginner note",
  },
  {
    id: "subject-ga",
    title: "Kongo Grammar Notes",
    section: "Subject marker が",
    level: "N5",
    content:
      "が marks the grammatical subject and often introduces new, focused, or unknown information. It commonly answers “who?” or “what?”.",
    example: "だれが来ますか。田中さんが来ます。— Who is coming? Tanaka is.",
    provenance: "Original Kongo beginner note",
  },
  {
    id: "wa-ga",
    title: "Kongo Grammar Notes",
    section: "は and が together",
    level: "N5",
    content:
      "Use は to set a topic and が to identify the subject within that topic. The choice depends on what is already known and what the speaker wants to focus on.",
    example: "象は鼻が長いです。— As for elephants, their trunks are long.",
    provenance: "Original Kongo beginner note",
  },
  {
    id: "te-kudasai",
    title: "Kongo Grammar Notes",
    section: "Polite requests with 〜てください",
    level: "N5",
    content:
      "Attach ください to a verb’s て-form to make a polite request. It is suitable in many everyday situations, though it can sound direct depending on context.",
    example: "ここに名前を書いてください。— Please write your name here.",
    provenance: "Original Kongo beginner note",
  },
  {
    id: "ni-de",
    title: "Kongo Grammar Notes",
    section: "に and で for place",
    level: "N5",
    content:
      "に marks a destination or the location where something exists. で marks the place where an action takes place.",
    example:
      "学校にいます。 (exist at school) / 学校で勉強します。 (study at school)",
    provenance: "Original Kongo beginner note",
  },
  {
    id: "desu",
    title: "Kongo Grammar Notes",
    section: "です and polite statements",
    level: "N5",
    content:
      "です makes a nominal or adjective predicate polite. It follows nouns and な-adjectives directly; い-adjectives generally do not take です in the plain present affirmative form.",
    example:
      "学生です。静かです。おいしいです。— I am a student. It is quiet. It is delicious.",
    provenance: "Original Kongo beginner note",
  },
  {
    id: "te-form",
    title: "Kongo Grammar Notes",
    section: "The て-form",
    level: "N5",
    content:
      "The て-form connects actions and appears in requests, progressive forms, and permission/prohibition patterns. Conjugation depends on the verb group and ending.",
    example: "食べる → 食べて / 書く → 書いて / 話す → 話して",
    provenance: "Original Kongo beginner note",
  },
  {
    id: "wa-pronounce",
    title: "Kongo Grammar Notes",
    section: "は: spelling and pronunciation",
    level: "N5",
    content:
      "When は is used as the topic particle, it is pronounced wa. In other words, は is pronounced ha in words such as はな (flower), but wa in 私は (as for me).",
    example: "はな (hana) / 私は (watashi wa)",
    provenance: "Original Kongo beginner note",
  },
];
export function retrieveKnowledge(query, limit = 3) {
  const terms = query
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}ー]+/u)
    .filter((x) => x.length > 1 || /^[はがにでのをへとやも]$/u.test(x));
  if (!terms.length) return [];
  return knowledge
    .map((item) => ({
      item,
      score: terms.reduce(
        (n, t) =>
          n +
          (item.section.toLocaleLowerCase().includes(t) ? 4 : 0) +
          (item.content.toLocaleLowerCase().includes(t) ? 2 : 0) +
          (item.example.toLocaleLowerCase().includes(t) ? 1 : 0),
        0,
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}
