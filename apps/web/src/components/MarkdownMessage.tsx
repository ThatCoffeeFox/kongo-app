import React, { useLayoutEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { analyzeJapanese } from "../../../../packages/ai/src/japanese";

function renderJapanese(text: string) {
  return analyzeJapanese(text).map((token, index) =>
    token.reading ? (
      <ruby key={`${token.surface}-${index}`} title={token.meaning}>
        {token.surface}
        <rt>{token.reading}</rt>
      </ruby>
    ) : (
      <React.Fragment key={`${token.surface}-${index}`}>
        {token.surface}
      </React.Fragment>
    ),
  );
}

function renderMarkdownChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) =>
    typeof child === "string" ? renderJapanese(child) : child,
  );
}

const components = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p>{renderMarkdownChildren(children)}</p>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li>{renderMarkdownChildren(children)}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote>{renderMarkdownChildren(children)}</blockquote>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong>{renderMarkdownChildren(children)}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em>{renderMarkdownChildren(children)}</em>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1>{renderMarkdownChildren(children)}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2>{renderMarkdownChildren(children)}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3>{renderMarkdownChildren(children)}</h3>
  ),
};

export function MarkdownMessage({
  content,
  onRendered,
}: {
  content: string;
  onRendered?: () => void;
}) {
  useLayoutEffect(() => onRendered?.(), [content, onRendered]);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
