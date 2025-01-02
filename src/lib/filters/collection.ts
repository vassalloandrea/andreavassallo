import type { ZendoCollectionConfig, FilterConfig } from "../zendo/config";
import type { ZendoCollectionId } from "../zendo/content";

export default async function collectionFilter(): Promise<FilterConfig> {
  return {
    id: "collections",
    style: "tertiary",
    ui: {
      getItems: async () => [
        { id: "books", label: "Books" },
        { id: "waypoints", label: "Waypoints" },
        { id: "writings", label: "Writings" },
        { id: "hikes", label: "Hikes" },
      ],
    },
    collectionFilterFn: async (
      entryTypes: ZendoCollectionConfig[],
      value: unknown
    ): Promise<ZendoCollectionConfig[]> => {
      const selectedCollections = value as ZendoCollectionId[] | undefined;

      if (!selectedCollections || selectedCollections.length === 0) {
        return entryTypes;
      }

      return entryTypes.filter((entryType) => selectedCollections.includes(entryType.id as ZendoCollectionId));
    },
  };
}
