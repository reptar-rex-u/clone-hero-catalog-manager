/** Normalize apostrophe/quote variants so typed `we're` matches stored `we’re`. */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u0060\u00B4]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();
}

/** SQLite expression that applies the same apostrophe normalization to a column. */
export function sqlNormalizeSearchCol(column: string): string {
  // Use char() codes so we never embed quote/backtick literals in this template.
  // 8217/8216 = curly singles, 700 = modifier apostrophe, 96 = grave, 180 = acute
  return (
    `replace(replace(replace(replace(replace(lower(${column}),` +
    ` char(8217), char(39)), char(8216), char(39)), char(700), char(39)),` +
    ` char(96), char(39)), char(180), char(39))`
  );
}
