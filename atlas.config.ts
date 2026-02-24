import path from "path";
import matter from "gray-matter";

import { gitSource } from "src/lib/zendo/sources";
import {
  normalizeFilename,
  escapeMdx,
  addBasenameToAliases,
  removeFirstH1,
  removeSection,
  renameMdToMdx,
  addContentTypeToMetadata,
  removeDrafts,
  extractDataFromGPX,
  sanitizeContent,
} from "src/lib/zendo/transformers";
import type { Configuration } from "src/lib/zendo/config";
import type { ZendoCollectionEntry } from "src/lib/zendo/content";
import { collectionFilter, nameFilter, statusFilter, topicFilter, relatedToFilter } from "src/lib/filters";

const baseTransformers = [
  renameMdToMdx(),
  removeDrafts(),
  addBasenameToAliases(),
  normalizeFilename(),
  escapeMdx(),
  addContentTypeToMetadata(),
  sanitizeContent(),
];

const atlasTransformers = [removeFirstH1(), removeSection({ headingLevel: 2, title: "Metadata" }), ...baseTransformers];

const hikesTransformers = [...atlasTransformers, extractDataFromGPX()];

const config: Configuration = {
  // Where do we store the content?
  contentDir: path.join(process.cwd(), "src", "content"),

  // Available filters for search
  filters: await Promise.all([collectionFilter(), nameFilter(), statusFilter(), topicFilter(), relatedToFilter()]),

  // Sorting function for entries
  sortEntriesFn: (a: ZendoCollectionEntry, b: ZendoCollectionEntry): number => {
    const statusPriorities = {
      sketch: 0,
      surveying: 1,
      charted: 2,
    };

    const aUpdated = new Date(a.data.updatedAt!).getTime();
    const bUpdated = new Date(b.data.updatedAt!).getTime();
    const aCreated = new Date(a.data.createdAt!).getTime();
    const bCreated = new Date(b.data.createdAt!).getTime();

    const SIXTY_MINUTES = 60 * 60 * 1000;
    const isSameWindow = Math.abs(aUpdated - bUpdated) <= SIXTY_MINUTES;

    if (isSameWindow) {
      if (aCreated > bCreated) return -1;
      if (aCreated < bCreated) return 1;

      const statusPriorityA = statusPriorities[a.data.status];
      const statusPriorityB = statusPriorities[b.data.status];

      return statusPriorityA > statusPriorityB ? -1 : 1;
    }

    if (aUpdated > bUpdated) return -1;
    if (aUpdated < bUpdated) return 1;

    return 0;
  },

  // Where do we fetch the content from and what transformations do we want to apply?
  sources: [
    {
      id: "digital-garden",
      source: gitSource({
        repositoryUrl: "git@github.com:vassalloandrea/digital-garden.git",
      }),
      entryTypes: [
        {
          id: "assets",
          basePath: "assets",
          pattern: "**/*.{jpg,jpeg,png,gif,svg,webp,gpx}",
          destinationPath: "assets",
          transformers: [],
        },
        {
          id: "waypoints",
          basePath: "waypoints",
          pattern: "*.{md,mdx}",
          destinationPath: "waypoints",
          transformers: atlasTransformers,
          search: {
            label: "Waypoints",
            buildUrlFn: (slug: string) => `/waypoints/${slug}`,
            buildSearchResultFn: (entry: ZendoCollectionEntry) => ({
              id: entry.id,
              name: entry.data.title,
              type: "waypoints" as const,
              status: entry.data.status,
              topics: entry.data.topics,
            }),
          },
        },
        {
          id: "topics",
          basePath: "topics",
          pattern: "*.{md,mdx}",
          destinationPath: "topics",
          transformers: atlasTransformers,
          search: {
            label: "Topic",
            buildUrlFn: (slug: string) => `/topics/${slug}`,
            buildSearchResultFn: (entry: ZendoCollectionEntry) => ({
              id: entry.id,
              name: entry.data.title,
              type: "topics" as const,
            }),
          },
        },
        {
          id: "books" as const,
          basePath: "readwise/books",
          pattern: "*.{md,mdx}",
          destinationPath: "books",
          transformers: [
            ...atlasTransformers,

            // updatedAt is not updated when lastHighlightedOn is updated,
            // so we need to copy lastHighlightedOn into updatetAt for proper
            // sorting (assuming the former is greater than the latter)
            async (originalPath, originalContent) => {
              if (Buffer.isBuffer(originalContent)) {
                return { path: originalPath, content: originalContent };
              }

              const { data, content } = matter(originalContent);
              const lastHighlightedOn = new Date(data.lastHighlightedOn);
              data.updatedAt = lastHighlightedOn.toISOString();
              return { path: originalPath, content: matter.stringify(content, data) };
            },
          ],
          search: {
            label: "Book",
            buildUrlFn: (slug: string) => `/books/${slug}`,
            buildSearchResultFn: (entry: ZendoCollectionEntry) => {
              const book = entry as ZendoCollectionEntry<"books">;

              return {
                id: entry.id,
                name: entry.data.title,
                url: `/books/${entry.id}`,
                type: "books",
                completed: !!book.data.publishedOn,
                date: entry.data.updatedAt ? new Date(entry.data.updatedAt).toISOString() : undefined,
              };
            },
          },
        },
        {
          id: "writings",
          basePath: "writings",
          pattern: "*.{md,mdx}",
          destinationPath: "writings",
          transformers: atlasTransformers,
          search: {
            label: "Writings",
            buildUrlFn: (slug: string) => `/writings/${slug}`,
            buildSearchResultFn: (entry: ZendoCollectionEntry) => {
              const writing = entry as ZendoCollectionEntry<"writings">;

              return {
                id: writing.id,
                name: writing.data.title,
                type: "writings" as const,
                topics: writing.data.topics,
              };
            },
          },
        },
        {
          id: "hikes",
          basePath: "hikes",
          pattern: "*.{md,mdx}",
          destinationPath: "hikes",
          transformers: hikesTransformers,
          search: {
            label: "Hikes",
            buildUrlFn: (slug: string) => `/hikes/${slug}`,
            buildSearchResultFn: (entry: ZendoCollectionEntry) => {
              const writing = entry as ZendoCollectionEntry<"hikes">;

              return {
                id: writing.id,
                name: writing.data.title,
                type: "hikes" as const,
                topics: writing.data.topics,
              };
            },
          },
        },
        {
          id: "pages",
          pattern: "*.{md,mdx}",
          destinationPath: ".",
          transformers: atlasTransformers,
        },
      ],
    },
  ],
};

export const collectionIds = ["waypoints", "topics", "books", "writings", "hikes"] as const;

export default config as Configuration;
