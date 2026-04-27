const LEGACY_TURKISH_REPLACEMENTS = [
  ["Ã¼", "ü"],
  ["Ãœ", "Ü"],
  ["Ã¶", "ö"],
  ["Ã–", "Ö"],
  ["Ã§", "ç"],
  ["Ã‡", "Ç"],
  ["ÄŸ", "ğ"],
  ["Äž", "Ğ"],
  ["Ä±", "ı"],
  ["Ä°", "İ"],
  ["ÅŸ", "ş"],
  ["Åž", "Ş"],
  ["â€™", "'"],
  ["â€œ", "\""],
  ["â€", "\""],
  ["â€“", "-"],
  ["â€”", "-"],
  ["â€¦", "..."],
];

export const normalizeLegacyTurkishText = (value) => {
  if (typeof value !== "string" || !value) {
    return value;
  }

  let normalized = value;
  LEGACY_TURKISH_REPLACEMENTS.forEach(([broken, fixed]) => {
    normalized = normalized.replaceAll(broken, fixed);
  });

  return normalized;
};
