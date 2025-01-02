import type { ZendoCollectionEntry, ZendoCollectionId } from "src/lib/zendo/content";
import type { FilterConfig } from "src/lib/zendo/config";

export default async function relatedToFilter(): Promise<FilterConfig> {
  return {
    id: "relatedTo",
    entryFilterFn: async (entries: ZendoCollectionEntry[], value: unknown): Promise<ZendoCollectionEntry[]> => {
      const { sortEntries } = await import("src/lib/zendo/content");
      const { getEntry, getRelatedEntries, getEntryIndexRecord, deduplicateEntries } = await import("../zendo/content");
      const relatedToId = value as string | undefined;

      if (!relatedToId) {
        return entries;
      }

      const indexRecord = getEntryIndexRecord(relatedToId);
      const entry = await getEntry(indexRecord.type as ZendoCollectionId, relatedToId);

      if (!entry) {
        return [];
      }

      const relatedEntries = await getRelatedEntries(entry);

      if (entry.collection === "topics") {
        const relatedEntriesByTopic = entries.filter(
          (e) => "topics" in e.data && e.data.topics?.some((t: { id: string }) => t.id === entry.id)
        );

        relatedEntries.push(...relatedEntriesByTopic);
      }

      const entryIds = new Set(entries.map((e) => `${e.collection}:${e.id}`));
      const result = deduplicateEntries(
        sortEntries(relatedEntries.filter((e) => entryIds.has(`${e.collection}:${e.id}`)))
      );

      return result;
    },
  };
}
