import type { ZendoCollectionEntry } from "../zendo/content";
import type { FilterConfig } from "../zendo/config";

export default async function nameFilter(): Promise<FilterConfig> {
  return {
    id: "name",
    entryFilterFn: async (entries: ZendoCollectionEntry[], value: unknown): Promise<ZendoCollectionEntry[]> => {
      const name = value as string;

      if (name.length < 3) {
        return [];
      }

      return entries.filter((entry) => entry.data.title.toLowerCase().includes(name.toLowerCase()));
    },
  };
}
