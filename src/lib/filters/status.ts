import type { ZendoCollectionEntry } from "../zendo/content";
import type { FilterConfig } from "../zendo/config";

export default async function statusFilter(): Promise<FilterConfig> {
  return {
    id: "status",
    style: "tertiary",
    ui: {
      getItems: async () => [
        { id: "sketch", label: "Sketch", icon: "lucide:pencil" },
        { id: "surveying", label: "Surveying", icon: "lucide:compass" },
        { id: "charted", label: "Charted", icon: "lucide:map-pinned" },
      ],
    },
    entryFilterFn: async (entries: ZendoCollectionEntry[], value: unknown): Promise<ZendoCollectionEntry[]> => {
      const selectedValues = value as string[] | undefined;

      if (!selectedValues || selectedValues.includes("all") || selectedValues.length === 0) {
        return entries;
      }

      return entries.filter((entry) => selectedValues.includes(entry.data.status));
    },
  };
}
