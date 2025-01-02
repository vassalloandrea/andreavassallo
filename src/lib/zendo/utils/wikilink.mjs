/**
 * Extracts wikilinks from text content
 * @param {string} content - The text content to extract wikilinks from
 * @returns {Array<{linkDestination: string, displayText: string}>} - Array of extracted wikilinks
 */
export function extractWikilinks(content) {
  if (!content) return [];

  const matches = Array.from(content.matchAll(/\[\[(.*?)(?:\|(.*?))?\]\]/g));

  return matches.map((match) => {
    const [, linkDestination, displayText] = match;
    return {
      linkDestination: linkDestination.trim(),
      displayText: (displayText || linkDestination).trim(),
    };
  });
}
