const placeholderPattern = /{{\s*([^}]+)\s*}}/g;

export function detectPlaceholders(content: string) {
  const matches = Array.from(content.matchAll(placeholderPattern));
  const placeholders = matches
    .map((match) => match[1].trim())
    .filter(Boolean);

  return Array.from(new Set(placeholders));
}

export function fillTemplateContent(
  content: string,
  variables: Record<string, string | null | undefined>
) {
  return content.replace(placeholderPattern, (_, key: string) => {
    const normalizedKey = key.trim();
    const value = variables[normalizedKey];
    if (value === undefined || value === null || String(value).length === 0) {
      return `[MISSING: ${normalizedKey}]`;
    }
    return String(value);
  });
}
