export type KnowledgeSource = {
  id: string;
  title: string;
  section: string;
  level: string;
  content: string;
  example: string;
  provenance: string;
};
export declare const knowledge: KnowledgeSource[];
export declare function retrieveKnowledge(
  query: string,
  limit?: number,
): KnowledgeSource[];
