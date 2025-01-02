import type { Transformer } from ".";
import matter from "gray-matter";

const escapeMdx = (): Transformer => {
  return async (originalPath: string, originalContent: string | Buffer) => {
    // Skip binary files
    if (Buffer.isBuffer(originalContent)) {
      return { path: originalPath, content: originalContent };
    }

    const { data, content: markdownContent } = matter(originalContent);

    // Escape any MDX components and curly braces in the content
    const escapedContent = markdownContent.replace(/</g, "\\<").replace(/{/g, "\\{").replace(/}/g, "\\}");

    // Create new content
    const newContent = matter.stringify(escapedContent, data);

    return {
      path: originalPath,
      content: newContent,
    };
  };
};

export default escapeMdx;
