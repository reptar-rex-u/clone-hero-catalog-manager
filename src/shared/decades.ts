/** Decade start year as string, e.g. "1990", "2000". */
export type DecadeValue = string;

export function parseSongYear(raw: string): number | null {
  const text = raw?.trim() ?? '';
  if (!text) return null;
  const four = text.match(/(?:19|20)\d{2}/);
  if (four) {
    const y = Number(four[0]);
    return Number.isFinite(y) ? y : null;
  }
  if (/^\d{2}$/.test(text)) {
    const n = Number(text);
    // 40–99 → 1940–1999; 00–39 → 2000–2039
    return n >= 40 ? 1900 + n : 2000 + n;
  }
  return null;
}

export function decadeStartFromYear(year: number): number {
  return Math.floor(year / 10) * 10;
}

/** Labels like 80's, 90's, 2000's, 2010's. */
export function formatDecadeLabel(decadeStart: number): string {
  if (decadeStart >= 2000) return `${decadeStart}'s`;
  if (decadeStart >= 1900 && decadeStart < 2000) {
    return `${String(decadeStart).slice(2)}'s`;
  }
  return `${decadeStart}'s`;
}

export function decadeOption(decadeStart: number): { value: DecadeValue; label: string } {
  return {
    value: String(decadeStart),
    label: formatDecadeLabel(decadeStart),
  };
}
