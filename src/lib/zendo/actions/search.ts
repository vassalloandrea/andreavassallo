import { defineAction } from "astro:actions";
import { z } from "astro/zod";

import { getEntries, type ZendoCollectionEntry, type ZendoCollectionId } from "src/lib/zendo/content";
import config from "atlas.config";

import type { SearchResult, ZendoCollectionConfig } from "src/lib/zendo/config";

type SearchResultResponse = SearchResult & {
  url: string;
};

async function applyCollectionFilters(
  entryTypes: ZendoCollectionConfig[],
  params: Record<string, unknown>
): Promise<ZendoCollectionConfig[]> {
  if (!config.filters) {
    return [];
  }

  const filters = config.filters.filter((config) => config.collectionFilterFn !== undefined);

  let filteredEntryTypes = entryTypes;
  for (const filter of filters) {
    const paramValue = params[filter.id];
    if (paramValue !== undefined && filter.collectionFilterFn) {
      filteredEntryTypes = await filter.collectionFilterFn(filteredEntryTypes, paramValue);
    }
  }

  return filteredEntryTypes;
}

async function applyContentFilters(
  entries: ZendoCollectionEntry[],
  params: Record<string, unknown>
): Promise<ZendoCollectionEntry[]> {
  if (!config.filters) {
    return [];
  }

  const filters = config.filters.filter((config) => config.entryFilterFn !== undefined);

  let filteredEntries = entries;
  for (const filter of filters) {
    const paramValue = params[filter.id];
    if (paramValue !== undefined && filter.entryFilterFn) {
      filteredEntries = await filter.entryFilterFn(filteredEntries, paramValue);
    }
  }

  return filteredEntries;
}

export async function getResults(
  params: Record<string, unknown>,
  { limit }: { limit?: number }
): Promise<SearchResultResponse[]> {
  const searchableCollections = config.sources
    .flatMap((source) => source.entryTypes)
    .filter((entryType) => entryType.search);

  if (searchableCollections.length === 0) {
    return [];
  }

  if (!config.filters) {
    return [];
  }

  const collections = await applyCollectionFilters(searchableCollections, params);

  const searchResults: SearchResultResponse[] = await Promise.all(
    collections.map(async (collection) => {
      const entries = await getEntries([collection.id as ZendoCollectionId]);
      const filteredEntries = await applyContentFilters(entries, params);

      const transformedResults = filteredEntries.map((entry) => ({
        ...collection.search!.buildSearchResultFn(entry),
        url: collection.search!.buildUrlFn(entry.id),
      }));

      return transformedResults;
    })
  ).then((results) => results.flat());

  return searchResults.slice(0, limit);
}

export const search = defineAction({
  input: z
    .object({
      limit: z.number().optional(),
    })
    .passthrough(),
  handler: async (params) => {
    const { limit, ...filterParams } = params;

    const items = await getResults(filterParams, { limit });

    return { items };
  },
});
