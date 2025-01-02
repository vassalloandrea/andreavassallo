import matter from "gray-matter";

import type { Transformer } from "src/lib/zendo/transformers";
import type { ZendoCollectionConfig } from "../config";

const addContentTypeToMetadata = (): Transformer => {
  return async (originalPath: string, originalContent: string | Buffer, contentType: ZendoCollectionConfig) => {
    // Skip binary files
    if (Buffer.isBuffer(originalContent)) {
      return { path: originalPath, content: originalContent };
    }

    const { data, content } = matter(originalContent);

    // Add the content type ID to the metadata
    data.contentType = contentType.id;

    const newContent = matter.stringify(content, data);

    return {
      path: originalPath,
      content: newContent,
    };
  };
};

export default addContentTypeToMetadata;
