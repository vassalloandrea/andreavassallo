import type { EntryLink, EntryIndexRecord } from "src/lib/zendo/content";
import { extractWikilinks } from "src/lib/zendo/utils/wikilink.mjs";

/**
 * Link extraction utilities
 */

/**
 * Normalizes a link path for matching
 */
function normalizeLinkPath(linkPath: string): string {
  return linkPath.replace(/\n/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Finds a matching entry by normalized link path
 */
export function findMatchingEntry(
  normalizedPath: string,
  allEntries: EntryIndexRecord[]
): EntryIndexRecord | undefined {
  return allEntries.find((entry) => entry.ids.some((id) => id.toLowerCase() === normalizedPath.toLowerCase()));
}

/**
 * Checks if a link is valid (not self-referencing and not duplicate)
 */
export function isValidLink(link: EntryLink, currentEntry: EntryIndexRecord, existingLinks: EntryLink[]): boolean {
  // Skip self-references
  if (link.slug === currentEntry.slug && link.type === currentEntry.type) {
    return false;
  }

  // Skip duplicates
  if (existingLinks.some((existing) => existing.slug === link.slug && existing.type === link.type)) {
    return false;
  }

  return true;
}

/**
 * Extracts outbound links from file content
 */
export function extractOutboundLinks(
  fileContent: string,
  currentEntry: EntryIndexRecord,
  allEntries: EntryIndexRecord[]
): EntryLink[] {
  const linkPaths = extractWikilinks(fileContent).map(({ linkDestination }) => linkDestination);
  const outboundLinks: EntryLink[] = [];

  for (const linkPath of linkPaths) {
    if (!linkPath) {
      continue;
    }

    const normalizedPath = normalizeLinkPath(linkPath);
    const match = findMatchingEntry(normalizedPath, allEntries);

    if (!match) {
      continue;
    }

    const link: EntryLink = {
      slug: match.slug,
      type: match.type,
    };

    if (isValidLink(link, currentEntry, outboundLinks)) {
      outboundLinks.push(link);
    }
  }

  return outboundLinks;
}

/**
 * Extracts inbound links by finding entries that link to the current entry
 */
export function extractInboundLinks(entry: EntryIndexRecord, allEntries: EntryIndexRecord[]): EntryLink[] {
  const inboundLinks: EntryLink[] = [];

  for (const otherEntry of allEntries) {
    // Check if other entry has an outbound link to this entry
    const hasLink = otherEntry.outboundLinks.some((link) => link.slug === entry.slug && link.type === entry.type);

    if (!hasLink) {
      continue;
    }

    const link: EntryLink = {
      slug: otherEntry.slug,
      type: otherEntry.type,
    };

    if (isValidLink(link, entry, inboundLinks)) {
      inboundLinks.push(link);
    }
  }

  return inboundLinks;
}
