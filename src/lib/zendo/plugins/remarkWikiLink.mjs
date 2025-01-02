import { visit } from "unist-util-visit";

import entryIndex from "../../../data/index.json";
import { extractWikilinks } from "../utils/wikilink.mjs";

export function buildContentEntryUrl({ type, slug }) {
  // TODO: this should use urlBuilder from garden.config.ts

  return `/${type === "nows" ? "now" : type}/${slug}`;
}

export function remarkWikiLink() {
  return async (tree) => {
    const promises = [];

    visit(tree, "text", (node, index, parent) => {
      const wikilinks = extractWikilinks(node.value);

      if (!wikilinks.length) return;

      const processNode = async () => {
        const children = [];
        let lastIndex = 0;

        // Use matchAll to get all matches with their positions
        const matches = Array.from(node.value.matchAll(/(?<!!)(\[\[([^\]|]+)(?:\|([^\]]+))?\]\])/g));

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const wikilink = wikilinks[i];

          if (!match || !wikilink) continue;

          const startIndex = match.index;
          const endIndex = startIndex + match[0].length;

          // Add text before the wikilink
          if (startIndex > lastIndex) {
            children.push({
              type: "text",
              value: node.value.slice(lastIndex, startIndex),
            });
          }

          const indexRecord = entryIndex.find((record) =>
            record.ids.some((id) => id.toLowerCase() === wikilink.linkDestination.toLowerCase())
          );

          let newChild;

          if (indexRecord) {
            const url = buildContentEntryUrl(indexRecord);

            if (url) {
              newChild = {
                type: "mdxJsxFlowElement",
                name: "Link",
                attributes: [
                  {
                    type: "mdxJsxAttribute",
                    name: "href",
                    value: url,
                  },
                ],
                children: [
                  {
                    type: "text",
                    value: wikilink.displayText,
                  },
                ],
              };
            }
          }

          if (!newChild) {
            newChild = {
              type: "text",
              value: wikilink.displayText,
            };
          }

          children.push(newChild);
          lastIndex = endIndex;
        }

        // Add remaining text after the last wikilink
        if (lastIndex < node.value.length) {
          children.push({
            type: "text",
            value: node.value.slice(lastIndex),
          });
        }

        parent.children.splice(index, 1, ...children);
      };

      promises.push(processNode());
    });

    await Promise.all(promises);

    return tree;
  };
}
