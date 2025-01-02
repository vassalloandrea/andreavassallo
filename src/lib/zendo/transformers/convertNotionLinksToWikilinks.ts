import type { Transformer } from ".";
import matter from "gray-matter";

const convertNotionLinksToWikilinks = (): Transformer => {
  return async (originalPath: string, originalContent: string | Buffer) => {
    // Skip binary files
    if (Buffer.isBuffer(originalContent)) {
      return { path: originalPath, content: originalContent };
    }

    const { data, content: markdownContent } = matter(originalContent);

    const notionLinkPattern = /\[([^\]]+)\]\(https:\/\/www\.notion\.so\/([a-f0-9]{32})(?:\?[^\s)]*)?(?:\s+)?\)/gi;

    const convertedContent = markdownContent.replace(notionLinkPattern, (_, label, pageId) => {
      return `[[${pageId}|${label}]]`;
    });

    const newContent = matter.stringify(convertedContent, data);

    return {
      path: originalPath,
      content: newContent,
    };
  };
};

export default convertNotionLinksToWikilinks;
