import matter from "gray-matter";

import type { Transformer } from "src/lib/zendo/transformers";

const sanitizeContent = (): Transformer => {
  return async (originalPath: string, originalContent: string | Buffer) => {
    // Skip binary files
    if (Buffer.isBuffer(originalContent)) {
      return { path: originalPath, content: originalContent };
    }

    const { data, content } = matter(originalContent);

    // Split content into lines to handle nesting correctly
    const lines = content.split("\n");

    const processedLines = lines.map((line) => {
      // Check if the line is a list item (starts with -, *, + or 1.)
      const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+/);

      if (listMatch) {
        // It is a list item: indent any new sub-items found within it
        const currentIndent = listMatch[1];
        const subIndent = currentIndent + "  "; // Add 2 spaces for nesting

        // Replace bullets '•' with indented dash
        // We look for '•' preceded by whitespace
        let newLine = line.replace(/(\s+)•\s*/g, `\n${subIndent}- `);

        // Replace numbered lists '1.' with indented number
        // We look for digits followed by dot, preceded by whitespace
        newLine = newLine.replace(/(\s+)(\d+\.)\s+/g, `\n${subIndent}$2 `);

        return newLine;
      } else {
        // Not a list item: treat bullets/numbers as new root items
        // Handles '•' at start of line or inline
        let newLine = line.replace(/(?:^|\s+)•\s*/g, "\n- ");
        // Handles '1.' at start of line or inline
        newLine = newLine.replace(/(?:^|\s+)(\d+\.)\s+/g, "\n$1 ");
        return newLine;
      }
    });

    let newContent = processedLines.join("\n");

    // Clean up excessive spacing after list markers at the start of lines
    // e.g., "-      Item" becomes "- Item"
    newContent = newContent.replace(/^([-*+]|\d+\.)[ \t]{2,}/gm, "$1 ");

    // Remove multiple consecutive empty lines
    newContent = newContent.replace(/\n{3,}/g, "\n\n");

    // Trim whitespace
    newContent = newContent.trim();

    const processedContent = matter.stringify(newContent, data);

    return {
      path: originalPath,
      content: processedContent,
    };
  };
};

export default sanitizeContent;
