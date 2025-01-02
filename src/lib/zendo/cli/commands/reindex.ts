import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

import config from "atlas.config";
import type { EntryIndexRecord } from "src/lib/zendo/content";
import * as ui from "../ui";
import { getMarkdownFiles, writeJsonFile, getIndexFilePath } from "../utils/files";
import { extractOutboundLinks, extractInboundLinks } from "../utils/links";

interface FileData {
  content: string;
  slug: string;
  title: string;
  aliases?: string[];
  type: string;
}

/**
 * Processes a single markdown file to extract its data
 */
async function parseMarkdownFile(filePath: string, fileName: string): Promise<FileData | null> {
  try {
    const fileContent = await fs.readFile(filePath, "utf8");
    const { content, data } = matter(fileContent);

    const slug = data.slug || path.parse(path.basename(fileName)).name;
    const { title, aliases, contentType } = data;

    if (!contentType) {
      ui.warning(`Missing contentType in ${filePath}`);
      return null;
    }

    return {
      content,
      slug,
      title,
      aliases,
      type: contentType,
    };
  } catch (error) {
    ui.warning(`Error processing file ${filePath}: ${error}`);
    return null;
  }
}

/**
 * Gets all garden entry data
 */
async function parseAllMarkdownFiles(): Promise<FileData[]> {
  const files = await getMarkdownFiles(config.contentDir);

  if (files.length === 0) {
    return [];
  }

  const entries = await ui.withSpinnerAndItemProgress(
    "Scanning markdown files",
    files,
    async (file, index, updateProgress) => {
      const entry = await parseMarkdownFile(path.join(config.contentDir, file), file);
      updateProgress(index + 1, files.length);
      return entry;
    },
    (results) => `Found ${results.filter((e): e is FileData => e !== null).length} files to process`
  );

  return entries.filter((entry): entry is FileData => entry !== null);
}

/**
 * Creates a garden entry from entry data
 */
function buildGardenIndexEntry(entryData: FileData): EntryIndexRecord {
  return {
    ids: [...new Set([entryData.title, ...(entryData.aliases || []), entryData.slug])],
    slug: entryData.slug,
    type: entryData.type,
    outboundLinks: [],
    inboundLinks: [],
  };
}

/**
 * Processes outbound links for a garden entry
 */
function processOutboundLinks(
  fileData: FileData,
  entry: EntryIndexRecord,
  allEntries: EntryIndexRecord[]
): EntryIndexRecord {
  const outboundLinks = extractOutboundLinks(fileData.content, entry, allEntries);

  return {
    ...entry,
    outboundLinks,
  };
}

/**
 * Processes inbound links for a garden entry
 */
function processInboundLinks(entry: EntryIndexRecord, allEntries: EntryIndexRecord[]): EntryIndexRecord {
  const inboundLinks = extractInboundLinks(entry, allEntries);

  return {
    ...entry,
    inboundLinks,
  };
}

/**
 * Main function to generate the garden index
 */
export default async function indexContent(): Promise<void> {
  const filesData = await parseAllMarkdownFiles();

  if (filesData.length === 0) {
    ui.warning("No markdown files found to index");
    return;
  }

  const indexEntries = filesData.map(buildGardenIndexEntry);

  const indexEntriesWithOutboundLinks = await ui.withSpinner(
    "Extracting outbound links",
    async () => {
      return indexEntries.map((entry) => {
        const fileData = filesData.find((f) => f.slug === entry.slug);
        if (!fileData) {
          ui.warning(`No file data found for entry: ${entry.slug}`);
          return entry;
        }
        return processOutboundLinks(fileData, entry, indexEntries);
      });
    },
    `Extracted outbound links (${indexEntries.length} entries)`
  );

  const indexEntriesWithAllLinks = await ui.withSpinner(
    "Extracting inbound links",
    async () => {
      return indexEntriesWithOutboundLinks.map((entry) => processInboundLinks(entry, indexEntriesWithOutboundLinks));
    },
    `Extracted inbound links (${indexEntriesWithOutboundLinks.length} entries)`
  );

  await writeJsonFile(getIndexFilePath(), indexEntriesWithAllLinks);

  ui.success(`Index rebuilt for ${indexEntriesWithAllLinks.length} entries!`);
}
