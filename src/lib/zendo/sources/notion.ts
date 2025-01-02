import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { writeFile, mkdir, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import slugify from "slugify";
import emojiRegex from "emoji-regex";
import matter from "gray-matter";
import fetch from "node-fetch";
import fse from "fs-extra";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

import type { Source } from "src/lib/zendo/sources";
import * as ui from "src/lib/zendo/cli/ui";

type NotionFilter = Parameters<typeof Client.prototype.dataSources.query>[0]["filter"];

type NotionConfiguration = {
  dataSourceId: string;
  apiToken: string;
  filter?: NotionFilter;
};

function normalizeEmojis(text: string): string {
  const regex = emojiRegex();
  return text.replace(regex, (emoji) => {
    const unicodeName = [...emoji].map((char) => char.codePointAt(0)?.toString(16)).join("-");
    return `emoji-${unicodeName}`;
  });
}

function slugifyTitle(title: string): string {
  const transformedEmojis = normalizeEmojis(title);
  return slugify(transformedEmojis, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });
}

function extractPageId(pageId: string): string {
  // Notion page IDs are UUIDs with dashes, remove dashes for filename
  return pageId.replace(/-/g, "");
}

function getFileExtensionFromUrl(url: string): string | null {
  try {
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath).toLowerCase();
    if (ext && [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext)) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  } catch {
    // Invalid URL
  }
  return null; // No valid extension found
}

function getFileExtensionFromContentType(contentType: string | null): string {
  if (!contentType) return ".jpg";

  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
  };

  return mimeToExt[contentType.toLowerCase()] || ".jpg";
}

async function downloadFile(url: string, filePath: string, index?: number): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      ui.warning(`Failed to download file from ${url}: ${response.statusText}`);
      return null;
    }

    const fileBuffer = await response.arrayBuffer();

    let ext = getFileExtensionFromUrl(url);
    if (!ext) {
      const contentType = response.headers.get("content-type");
      ext = getFileExtensionFromContentType(contentType);
    }

    // Save the file with index-based filename
    const filename = index !== undefined ? `${index}${ext}` : `0${ext}`;
    const fullPath = path.join(filePath, filename);
    await fse.writeFile(fullPath, Buffer.from(fileBuffer));

    return filename;
  } catch (error) {
    ui.warning(`Error downloading file from ${url}: ${error}`);
    return null;
  }
}

function convertPropertyToFrontmatterValue(property: PageObjectResponse["properties"][string]): unknown {
  switch (property.type) {
    case "title":
      return property.title.map((text) => text.plain_text).join("");
    case "rich_text":
      return property.rich_text.map((text) => text.plain_text).join("");
    case "number":
      return property.number;
    case "select":
      return property.select?.name ?? null;
    case "status":
      return property.status?.name ?? null;
    case "multi_select":
      return property.multi_select.map((select) => select.name);
    case "date":
      return property.date?.start ?? null;
    case "checkbox":
      return property.checkbox;
    case "url":
      return property.url;
    case "email":
      return property.email;
    case "phone_number":
      return property.phone_number;
    case "people":
      return property.people.map((person) => {
        if ("name" in person && person.name) {
          return person.name;
        }
        return person.id;
      });
    case "files":
      return property.files.map((file) => {
        if (file.type === "external") {
          return file.external.url;
        }
        return file.file.url;
      });
    case "relation":
      return property.relation.map((relation) => relation.id);
    case "formula":
      if (property.formula.type === "string") {
        return property.formula.string;
      }
      if (property.formula.type === "number") {
        return property.formula.number;
      }
      if (property.formula.type === "boolean") {
        return property.formula.boolean;
      }
      if (property.formula.type === "date") {
        return property.formula.date?.start ?? null;
      }
      return null;
    case "rollup":
      if (property.rollup.type === "number") {
        return property.rollup.number;
      }
      if (property.rollup.type === "date") {
        return property.rollup.date?.start ?? null;
      }
      if (property.rollup.type === "array") {
        return property.rollup.array.map((item) => {
          if (item.type === "title") {
            return item.title.map((text) => text.plain_text).join("");
          }
          return null;
        });
      }
      return null;
    case "created_time":
      return property.created_time;
    case "created_by":
      if ("name" in property.created_by && property.created_by.name) {
        return property.created_by.name;
      }
      return property.created_by.id;
    case "last_edited_time":
      return property.last_edited_time;
    case "last_edited_by":
      if ("name" in property.last_edited_by && property.last_edited_by.name) {
        return property.last_edited_by.name;
      }
      return property.last_edited_by.id;
    default:
      return null;
  }
}

async function extractFrontmatter(
  page: PageObjectResponse,
  destination: string,
  slugifiedTitle: string
): Promise<Record<string, unknown>> {
  const frontmatter: Record<string, unknown> = {};

  for (const [key, property] of Object.entries(page.properties)) {
    if (property.type === "files") {
      const files = property.files;

      const slugifiedPropertyName = slugifyTitle(key);
      const filesDir = path.join(destination, "files", slugifiedTitle, slugifiedPropertyName);
      await fse.mkdirp(filesDir);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        let fileUrl: string | null = null;
        if (file.type === "external") {
          fileUrl = file.external.url;
        } else {
          fileUrl = file.file.url;
        }

        if (fileUrl && fileUrl.startsWith("http")) {
          await downloadFile(fileUrl, filesDir, i);
        }
      }
    } else {
      const value = convertPropertyToFrontmatterValue(property);
      frontmatter[key] = value;
    }
  }

  frontmatter.createdAt = page.created_time;
  frontmatter.updatedAt = page.last_edited_time;

  frontmatter.aliases = [page.id, page.id.replace(/-/g, "")];

  return frontmatter;
}

async function getAllPages(
  notion: Client,
  databaseId: string,
  { filter }: { filter?: NotionFilter }
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let nextCursor: string | undefined = undefined;

  do {
    const queryParams: Parameters<typeof notion.dataSources.query>[0] = {
      data_source_id: databaseId,
    };

    if (nextCursor) {
      queryParams.start_cursor = nextCursor;
    }

    if (filter) {
      queryParams.filter = filter as Parameters<typeof notion.dataSources.query>[0]["filter"];
    }

    const response = await notion.dataSources.query(queryParams);

    for (const page of response.results) {
      if ("properties" in page) {
        pages.push(page as PageObjectResponse);
      }
    }

    nextCursor = response.next_cursor ?? undefined;
  } while (nextCursor);

  return pages;
}

async function getPageTitle(page: PageObjectResponse): Promise<string> {
  for (const [, property] of Object.entries(page.properties)) {
    if (property.type === "title") {
      const title = property.title.map((text) => text.plain_text).join("");
      if (title) {
        return title;
      }
    }
  }

  return extractPageId(page.id);
}

async function processPage(
  page: PageObjectResponse,
  destination: string,
  n2m: NotionToMarkdown
): Promise<{ success: boolean; filename?: string; error?: unknown }> {
  try {
    const title = await getPageTitle(page);
    const slugifiedTitle = slugifyTitle(title || "untitled");
    const pageId = extractPageId(page.id);

    const filename = slugifiedTitle ? `${slugifiedTitle}.md` : `${pageId}.md`;

    const frontmatter = await extractFrontmatter(page, destination, slugifiedTitle);

    const mdBlocks = await n2m.pageToMarkdown(page.id);
    const markdownContentResult = n2m.toMarkdownString(mdBlocks);
    const markdownContent = (markdownContentResult["parent"] as string) ?? "";

    const fileContent = matter.stringify(markdownContent, frontmatter);

    const filePath = path.join(destination, filename);
    await writeFile(filePath, fileContent, "utf-8");

    return { success: true, filename };
  } catch (error) {
    return { success: false, error };
  }
}

export default function notionSource(config: NotionConfiguration): Source {
  return async (destination, context) => {
    const notion = new Client({
      auth: config.apiToken,
    });

    const n2m = new NotionToMarkdown({ notionClient: notion });

    if (existsSync(destination)) {
      await rm(destination, { recursive: true, force: true });
    }

    await mkdir(destination, { recursive: true });

    context.updateProgress("fetching pages...");

    const pages = await getAllPages(notion, config.dataSourceId, { filter: config.filter });

    if (pages.length === 0) {
      return {
        status: "warning",
        message: "no pages found",
      };
    }

    context.updateProgress(`found ${pages.length} pages`);

    let completedCount = 0;

    await Promise.allSettled(
      pages.map(async (page) => {
        await processPage(page, destination, n2m);

        completedCount++;
        context.updateProgress(`fetching page ${completedCount}/${pages.length}`);
      })
    );

    return {
      status: "success",
      message: `fetched ${completedCount} pages`,
    };
  };
}
