import type { ZendoCollectionConfig } from "src/lib/zendo/config";

import addBasenameToAliases from "src/lib/zendo/transformers/addBasenameToAliases";
import normalizeFilename from "src/lib/zendo/transformers/normalizeFilename";
import escapeMdx from "src/lib/zendo/transformers/escapeMdx";
import removeFirstH1 from "src/lib/zendo/transformers/removeFirstH1";
import removeSection from "src/lib/zendo/transformers/removeSection";
import renameMdToMdx from "src/lib/zendo/transformers/renameMdToMdx";
import addContentTypeToMetadata from "src/lib/zendo/transformers/addContentTypeToMetadata";
import removeDrafts from "src/lib/zendo/transformers/removeDrafts";
import demoteHeadings from "src/lib/zendo/transformers/demoteHeadings";
import normalizeMetadata from "src/lib/zendo/transformers/normalizeMetadata";
import convertNotionLinksToWikilinks from "src/lib/zendo/transformers/convertNotionLinksToWikilinks";
import extractDataFromGPX from "./extractDataFromGPX";
import sanitizeContent from "./sanitizeContent";

export type TransformerResult = {
  path: string;
  content: string | Buffer;
} | null;

export type Transformer = (
  originalPath: string,
  originalContent: string | Buffer,
  contentType: ZendoCollectionConfig
) => Promise<TransformerResult>;

export async function applyTransformers(
  path: string,
  content: string | Buffer,
  contentType: ZendoCollectionConfig
): Promise<TransformerResult> {
  let currentResult: TransformerResult = {
    path,
    content,
  };

  for (const transformer of contentType.transformers) {
    if (currentResult === null) {
      return null;
    }

    currentResult = await transformer(currentResult.path, currentResult.content, contentType);
  }

  return currentResult;
}

export {
  addBasenameToAliases,
  normalizeFilename,
  escapeMdx,
  removeFirstH1,
  removeSection,
  renameMdToMdx,
  addContentTypeToMetadata,
  removeDrafts,
  demoteHeadings,
  normalizeMetadata,
  convertNotionLinksToWikilinks,
  extractDataFromGPX,
  sanitizeContent,
};
