import matter from "gray-matter";

import type { Transformer } from "src/lib/zendo/transformers";

const removeDrafts = (): Transformer => {
  return async (originalPath: string, originalContent: string | Buffer) => {
    // Skip binary files
    if (Buffer.isBuffer(originalContent)) {
      return { path: originalPath, content: originalContent };
    }

    const { data } = matter(originalContent);

    if (data.draft === true || data.draft === "true") {
      return null;
    }

    return { path: originalPath, content: originalContent };
  };
};

export default removeDrafts;
