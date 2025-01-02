import matter from "gray-matter";

import type { Transformer } from "src/lib/zendo/transformers";

interface RemoveSectionOptions {
  headingLevel: number;
  title: string;
}

const removeSection = ({ headingLevel, title }: RemoveSectionOptions): Transformer => {
  return async (originalPath: string, originalContent: string | Buffer) => {
    // Skip binary files
    if (Buffer.isBuffer(originalContent)) {
      return { path: originalPath, content: originalContent };
    }

    const { data, content: markdownContent } = matter(originalContent);

    // Create the heading pattern based on the level and title
    const headingMarker = "#".repeat(headingLevel);
    const sectionPattern = new RegExp(`${headingMarker}\\s+${title}[\\s\\S]*?(?=#{1,${headingLevel}}|$)`, "");

    // Remove the specified section and its content
    const processedContent = markdownContent.replace(sectionPattern, "").trim();

    const newContent = matter.stringify(processedContent, data);

    return {
      path: originalPath,
      content: newContent,
    };
  };
};

export default removeSection;
