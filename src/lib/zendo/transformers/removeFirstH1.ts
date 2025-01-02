import matter from "gray-matter";

import type { Transformer } from "src/lib/zendo/transformers";

const removeFirstH1 = (): Transformer => {
  return async (originalPath: string, originalContent: string | Buffer) => {
    // Skip binary files
    if (Buffer.isBuffer(originalContent)) {
      return { path: originalPath, content: originalContent };
    }

    const { data, content: markdownContent } = matter(originalContent);

    // Remove the first H1 heading and following newlines
    let processedContent = markdownContent.replace(/^#\s+[^\n]+\n+/, "").trim();

    // Find any H1 heading after frontmatter
    const h1Match = processedContent.match(/^\s*#\s+[^\n]+\n+/);
    if (h1Match) {
      processedContent = processedContent.slice(h1Match[0].length).trim();
    }

    // Remove any extra newlines that might have been created
    processedContent = processedContent.replace(/\n{3,}/g, "\n\n");

    const newContent = matter.stringify(processedContent, data);

    return {
      path: originalPath,
      content: newContent,
    };
  };
};

export default removeFirstH1;
