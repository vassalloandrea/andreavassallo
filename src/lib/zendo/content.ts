import { getCollection, type CollectionEntry } from "astro:content";
import config, { collectionIds as collectionIds } from "atlas.config";
import type { ZendoCollectionConfig } from "src/lib/zendo/config";

import entryIndex from "src/data/index.json";

export type ZendoCollectionId = (typeof collectionIds)[number];
export type ZendoCollectionEntry<T extends ZendoCollectionId = ZendoCollectionId> = CollectionEntry<T>;

export interface EntryLink {
  slug: string;
  type: string;
}

export interface EntryIndexRecord {
  ids: string[];
  slug: string;
  type: string;
  outboundLinks: EntryLink[];
  inboundLinks: EntryLink[];
}

export function sortEntries<T extends ZendoCollectionId>(
  entries: ZendoCollectionEntry<T>[]
): ZendoCollectionEntry<T>[] {
  return entries.sort(config.sortEntriesFn);
}

export function deduplicateEntries<T extends ZendoCollectionId>(
  entries: ZendoCollectionEntry<T>[]
): ZendoCollectionEntry<T>[] {
  return Array.from(new Set(entries.map((entry) => `${entry.collection}:${entry.id}`)))
    .map((key) => {
      const [collection, id] = key.split(":");
      return entries.find((entry) => entry.collection === collection && entry.id === id);
    })
    .filter((entry): entry is ZendoCollectionEntry<T> => entry !== undefined);
}

export async function getEntries<T extends ZendoCollectionId>(
  collections: T[] = [...collectionIds] as T[]
): Promise<ZendoCollectionEntry<T>[]> {
  const allEntries = await Promise.all(
    collections.map(async (collection) => {
      const entries = await getCollection(collection);
      return entries;
    })
  ).then((collections) => collections.flat());

  return sortEntries<T>(allEntries);
}

export async function getEntry<T extends ZendoCollectionId>(
  collectionId: T,
  entryId: string
): Promise<ZendoCollectionEntry | null> {
  const entries = await getCollection(collectionId);

  const entry = entries.find((entry) => entry.id === entryId);

  if (!entry) {
    return null;
  }

  return entry;
}

export function getEntryIndexRecord(entryId: string): EntryIndexRecord {
  const indexRecord = entryIndex.find((entry) => entry.slug === entryId || entry.ids.includes(entryId));

  if (!indexRecord) {
    throw new Error(`Index record not found for entry ${entryId}`);
  }

  return indexRecord;
}

export async function getRelatedEntries(entry: ZendoCollectionEntry): Promise<ZendoCollectionEntry[]> {
  const indexRecord = getEntryIndexRecord(entry.id);

  if (!indexRecord) {
    return [];
  }

  const { outboundLinks, inboundLinks } = indexRecord;

  const allLinks = [...outboundLinks, ...inboundLinks];
  const uniqueLinks = Array.from(new Set(allLinks.map((link) => link.slug)))
    .map((slug) => allLinks.find((link) => link.slug === slug))
    .filter((link) => link !== undefined);

  const relatedEntries = (
    await Promise.all(uniqueLinks.map((link) => getEntry(link.type as ZendoCollectionId, link.slug)))
  ).filter((entry): entry is ZendoCollectionEntry => entry !== null);

  return sortEntries(relatedEntries);
}

export function getCollectionConfig(entryTypeId: ZendoCollectionId): ZendoCollectionConfig {
  const entryTypeConfig = config.sources
    .flatMap((source) => source.entryTypes)
    .find((entryType) => entryType.id === entryTypeId);

  if (!entryTypeConfig) {
    throw new Error(`Entry type configuration not found for entry type ${entryTypeId}`);
  }

  return entryTypeConfig;
}
