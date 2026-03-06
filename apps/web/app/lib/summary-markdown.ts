const headingPattern = /^(#{1,4})\s+(.*)$/;
const unorderedListPattern = /^[-*+]\s+(.*)$/;
const orderedListPattern = /^\d+\.\s+(.*)$/;
const blockquotePattern = /^>\s?(.*)$/;
const codeFencePattern = /^```/;
const tokenPattern = /@@MD_TOKEN_(\d+)@@/g;
const markdownLinkPattern = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const inlineCodePattern = /`([^`\n]+)`/g;

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const sanitizeHref = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "#";
  }

  const lowerCaseHref = trimmed.toLowerCase();
  if (
    lowerCaseHref.startsWith("javascript:") ||
    lowerCaseHref.startsWith("data:")
  ) {
    return "#";
  }

  return trimmed;
};

const createInlineMarkdownFormatter = () => {
  const tokens: string[] = [];
  const createToken = (html: string) => {
    const token = `@@MD_TOKEN_${tokens.length}@@`;
    tokens.push(html);
    return token;
  };

  const format = (value: string): string => {
    let normalized = value;

    normalized = normalized.replace(inlineCodePattern, (_, code: string) =>
      createToken(`<code>${escapeHtml(code)}</code>`)
    );

    normalized = normalized.replace(
      markdownLinkPattern,
      (_, label: string, href: string) => {
        const safeHref = escapeHtml(sanitizeHref(href));
        const safeLabel = escapeHtml(label);

        return createToken(
          `<a href="${safeHref}" target="_blank" rel="noreferrer noopener">${safeLabel}</a>`
        );
      }
    );

    normalized = escapeHtml(normalized)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
      .replace(/_([^_\n]+)_/g, "<em>$1</em>");

    return normalized.replace(tokenPattern, (_, index: string) => {
      const tokenIndex = Number.parseInt(index, 10);
      return tokens[tokenIndex] ?? "";
    });
  };

  return {
    format,
  };
};

const readCodeFence = (lines: string[], startIndex: number) => {
  const blockLines: string[] = [];
  let currentIndex = startIndex + 1;

  while (currentIndex < lines.length && !codeFencePattern.test(lines[currentIndex])) {
    blockLines.push(lines[currentIndex]);
    currentIndex += 1;
  }

  return {
    html: `<pre><code>${escapeHtml(blockLines.join("\n"))}</code></pre>`,
    nextIndex: currentIndex < lines.length ? currentIndex + 1 : currentIndex,
  };
};

const readListBlock = (
  lines: string[],
  startIndex: number,
  linePattern: RegExp,
  tagName: "ul" | "ol",
  formatInline: (value: string) => string
) => {
  const items: string[] = [];
  let currentIndex = startIndex;

  while (currentIndex < lines.length) {
    const match = lines[currentIndex]?.match(linePattern);
    if (!match) {
      break;
    }

    items.push(`<li>${formatInline(match[1]?.trim() ?? "")}</li>`);
    currentIndex += 1;
  }

  return {
    html: `<${tagName}>${items.join("")}</${tagName}>`,
    nextIndex: currentIndex,
  };
};

const readBlockquote = (
  lines: string[],
  startIndex: number,
  formatInline: (value: string) => string
) => {
  const quoteLines: string[] = [];
  let currentIndex = startIndex;

  while (currentIndex < lines.length) {
    const match = lines[currentIndex]?.match(blockquotePattern);
    if (!match) {
      break;
    }

    quoteLines.push(formatInline(match[1]?.trim() ?? ""));
    currentIndex += 1;
  }

  return {
    html: `<blockquote><p>${quoteLines.join("<br />")}</p></blockquote>`,
    nextIndex: currentIndex,
  };
};

const readParagraph = (
  lines: string[],
  startIndex: number,
  formatInline: (value: string) => string
) => {
  const paragraphLines: string[] = [];
  let currentIndex = startIndex;

  while (currentIndex < lines.length) {
    const value = lines[currentIndex];

    if (
      !value ||
      codeFencePattern.test(value) ||
      headingPattern.test(value) ||
      unorderedListPattern.test(value) ||
      orderedListPattern.test(value) ||
      blockquotePattern.test(value)
    ) {
      break;
    }

    paragraphLines.push(formatInline(value.trim()));
    currentIndex += 1;
  }

  return {
    html: paragraphLines.length > 0 ? `<p>${paragraphLines.join("<br />")}</p>` : "",
    nextIndex: currentIndex,
  };
};

export const formatSummaryMarkdown = (rawValue: string): string => {
  const normalized = rawValue.replace(/\r\n/g, "\n").trim();
  if (normalized.length === 0) {
    return "";
  }

  const lines = normalized.split("\n");
  const blocks: string[] = [];
  const inlineFormatter = createInlineMarkdownFormatter();

  let index = 0;
  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";

    if (!line) {
      index += 1;
      continue;
    }

    if (codeFencePattern.test(line)) {
      const codeFenceBlock = readCodeFence(lines, index);
      blocks.push(codeFenceBlock.html);
      index = codeFenceBlock.nextIndex;
      continue;
    }

    const headingMatch = line.match(headingPattern);
    if (headingMatch) {
      const headingLevel = Math.min(headingMatch[1]?.length ?? 1, 4);
      const headingText = inlineFormatter.format((headingMatch[2] ?? "").trim());
      blocks.push(`<h${headingLevel}>${headingText}</h${headingLevel}>`);
      index += 1;
      continue;
    }

    if (unorderedListPattern.test(line)) {
      const unorderedListBlock = readListBlock(
        lines,
        index,
        unorderedListPattern,
        "ul",
        inlineFormatter.format
      );
      blocks.push(unorderedListBlock.html);
      index = unorderedListBlock.nextIndex;
      continue;
    }

    if (orderedListPattern.test(line)) {
      const orderedListBlock = readListBlock(
        lines,
        index,
        orderedListPattern,
        "ol",
        inlineFormatter.format
      );
      blocks.push(orderedListBlock.html);
      index = orderedListBlock.nextIndex;
      continue;
    }

    if (blockquotePattern.test(line)) {
      const blockquoteBlock = readBlockquote(lines, index, inlineFormatter.format);
      blocks.push(blockquoteBlock.html);
      index = blockquoteBlock.nextIndex;
      continue;
    }

    const paragraphBlock = readParagraph(lines, index, inlineFormatter.format);
    if (paragraphBlock.html) {
      blocks.push(paragraphBlock.html);
    }
    index = paragraphBlock.nextIndex;
  }

  return blocks.join("");
};
