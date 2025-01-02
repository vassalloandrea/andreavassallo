import { visit } from "unist-util-visit";

const WIKILINK_IMAGE_REGEX = /!\[\[([^|\]]+)(?:\|([^|\]]+))?\]\]/g;
const MARKDOWN_IMAGE_REGEX = /!\[([^|\]]+)(?:\|([^|\]]+))?\]\(([^)]+)\)/g;

function isRemoteUrl(url) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function resolveImagePath(imagePath, altText, assetsPath) {
  if (isRemoteUrl(imagePath)) {
    return {
      path: imagePath,
      alt: altText || imagePath.split("/").pop(),
    };
  }

  if (imagePath.includes("/")) {
    return {
      path: `${assetsPath}/${imagePath}`,
      alt: altText || imagePath.split("/").pop(),
    };
  }

  return {
    path: `${assetsPath}/${imagePath}`,
    alt: altText || imagePath,
  };
}

export function remarkWikiImage(options) {
  const { assetsPath } = options;

  return async (tree) => {
    const promises = [];

    visit(tree, "text", (node, index, parent) => {
      const wikilinkMatches = [...node.value.matchAll(WIKILINK_IMAGE_REGEX)];
      const markdownMatches = [...node.value.matchAll(MARKDOWN_IMAGE_REGEX)];

      if (!wikilinkMatches.length && !markdownMatches.length) return;

      const processNode = async () => {
        const children = [];
        let lastIndex = 0;

        for (const match of wikilinkMatches) {
          const [fullMatch, imagePath, altText] = match;
          const startIndex = match.index;
          const endIndex = startIndex + fullMatch.length;

          if (startIndex > lastIndex) {
            children.push({
              type: "text",
              value: node.value.slice(lastIndex, startIndex),
            });
          }

          const { path: imageUrl, alt } = resolveImagePath(imagePath, altText, assetsPath);

          children.push({
            type: "image",
            url: imageUrl,
            alt: alt || "",
            title: null,
          });

          lastIndex = endIndex;
        }

        for (const match of markdownMatches) {
          const [fullMatch, alt, url] = match;
          const startIndex = match.index;
          const endIndex = startIndex + fullMatch.length;

          if (startIndex > lastIndex) {
            children.push({
              type: "text",
              value: node.value.slice(lastIndex, startIndex),
            });
          }

          const { path: imageUrl, alt: resolvedAlt } = resolveImagePath(url, alt, assetsPath);

          children.push({
            type: "image",
            url: imageUrl,
            alt: resolvedAlt || "",
            title: null,
          });

          lastIndex = endIndex;
        }

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
