import type { ZendoCollectionEntry } from "src/lib/zendo/content";
import type { FilterConfig } from "src/lib/zendo/config";

export default async function topicFilter(): Promise<FilterConfig> {
  return {
    id: "topics",
    style: "tertiary",
    ui: {
      getItems: async () => {
        const { getCollection } = await import("astro:content");
        const topics = await getCollection("topics");
        return topics.map((topic) => ({
          id: topic.id,
          label: topic.data.title,
        }));
      },
    },
    entryFilterFn: async (entries: ZendoCollectionEntry[], value: unknown): Promise<ZendoCollectionEntry[]> => {
      const selectedValues = value as string[] | undefined;

      if (!selectedValues || selectedValues.includes("all") || selectedValues.length === 0) {
        return entries;
      }

      return entries.filter((entry) => {
        if ("topics" in entry.data) {
          const entryTopics = (entry.data.topics ?? []).map((t: { id: string }) => t.id);
          return entryTopics.length > 0 && entryTopics.some((topicId: string) => selectedValues.includes(topicId));
        }

        return false;
      });
    },
  };
}
