import matter from "gray-matter";

import type { Transformer } from "src/lib/zendo/transformers";

const demoteHeadings = (): Transformer => {
  return async (originalPath: string, originalContent: string | Buffer) => {
    // Skip binary files
    if (Buffer.isBuffer(originalContent)) {
      return { path: originalPath, content: originalContent };
    }

    const { data, content: markdownContent } = matter(originalContent);

    // Demote all headings by one level (H1 → H2, H2 → H3, etc.)
    // Match lines starting with 1-6 # characters, preserving leading whitespace
    const demotedContent = markdownContent.replace(/^(\s*)(#{1,6})\s+(.+)$/gm, (_, whitespace, hashes, text) => {
      // Add one more # to demote the heading
      return `${whitespace}#${hashes} ${text}`;
    });

    const newContent = matter.stringify(demotedContent, data);

    return {
      path: originalPath,
      content: newContent,
    };
  };
};

export default demoteHeadings;
