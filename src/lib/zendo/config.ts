import type { Transformer } from "src/lib/zendo/transformers";
import type { Source } from "src/lib/zendo/sources";
import type { ZendoCollectionEntry } from "./content";
import type { ZendoCollectionId } from "./content";

export interface SearchResult {
  id: string;
  name: string;
  type: ZendoCollectionId;
  completed?: boolean;
  date?: string;
  status?: "sketch" | "surveying" | "charted";
}

export type EntryFilterFn = (entries: ZendoCollectionEntry[], value: unknown) => Promise<ZendoCollectionEntry[]>;
export type CollectionFilterFn = (
  collections: ZendoCollectionConfig[],
  value: unknown
) => Promise<ZendoCollectionConfig[]>;

export interface FilterConfig {
  id: string;
  style?: "default" | "secondary" | "tertiary";
  ui?: {
    getItems: () => Promise<Array<{ id: string; label: string; icon?: string }>>;
  };
  entryFilterFn?: EntryFilterFn;
  collectionFilterFn?: CollectionFilterFn;
}

export interface ZendoCollectionConfig {
  id: string;
  basePath?: string;
  pattern: string;
  destinationPath: string;
  transformers: Transformer[];
  search?: {
    label: string;
    buildSearchResultFn: <T extends ZendoCollectionId>(entry: ZendoCollectionEntry<T>) => SearchResult;
    buildUrlFn: (slug: string) => string;
  };
}

export interface SourceConfig {
  id: string;
  source: Source;
  entryTypes: ZendoCollectionConfig[];
}

export type SortEntriesFn = (a: ZendoCollectionEntry, b: ZendoCollectionEntry) => number;

export interface Configuration {
  contentDir: string;
  sources: SourceConfig[];
  filters?: FilterConfig[];
  sortEntriesFn: SortEntriesFn;
}
