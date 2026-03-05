const htmlTagPattern = /<\/?[a-z][\s\S]*>/i;
const blockedTagBlockPattern =
  /<(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link)\b[^>]*>[\s\S]*?<\/\1>/gi;
const blockedTagSelfClosingPattern =
  /<(script|style|iframe|object|embed|form|input|button|textarea|select|meta|link)\b[^>]*\/?>/gi;
const htmlCommentPattern = /<!--[\s\S]*?-->/g;
const eventHandlerAttributePattern = /\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;
const inlineStyleAttributePattern = /\sstyle\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;
const javascriptProtocolPattern =
  /\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi;

const sanitizeHtml = (value: string): string =>
  value
    .replace(htmlCommentPattern, "")
    .replace(blockedTagBlockPattern, "")
    .replace(blockedTagSelfClosingPattern, "")
    .replace(eventHandlerAttributePattern, "")
    .replace(inlineStyleAttributePattern, "")
    .replace(javascriptProtocolPattern, ' $1="#"');

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const convertPlainTextToHtml = (value: string): string => {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => {
      const escaped = escapeHtml(paragraph.trim()).replaceAll("\n", "<br />");
      return `<p>${escaped}</p>`;
    })
    .join("");
};

const enrichAnchorTags = (value: string): string =>
  value.replace(/<a\b([^>]*?)>/gi, (match, attributes) => {
    const hasHref = /\bhref\s*=/.test(attributes);
    if (!hasHref) {
      return match;
    }

    const withTarget = /\btarget\s*=/.test(attributes)
      ? attributes
      : `${attributes} target="_blank"`;
    const withRel = /\brel\s*=/.test(withTarget)
      ? withTarget
      : `${withTarget} rel="noreferrer noopener"`;

    return `<a${withRel}>`;
  });

export const formatArticleContent = (rawValue: string | null): string | null => {
  const content = rawValue?.trim();
  if (!content) {
    return null;
  }

  if (!htmlTagPattern.test(content)) {
    const plainTextHtml = convertPlainTextToHtml(content);
    return plainTextHtml.length > 0 ? plainTextHtml : null;
  }

  const sanitized = enrichAnchorTags(sanitizeHtml(content)).trim();
  return sanitized.length > 0 ? sanitized : null;
};
