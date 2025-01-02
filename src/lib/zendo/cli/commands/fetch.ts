import * as fse from "fs-extra";
import path from "path";
import { glob } from "glob";

import type { ZendoCollectionConfig } from "src/lib/zendo/config";
import type { Source, SourceResult } from "src/lib/zendo/sources";

import config from "atlas.config";
import * as ui from "../ui";
import { cleanDirectory, readFileWithEncoding, writeFileWithEncoding } from "../utils/files";
import { getSourceCacheDir, getContentTypeBasePath, getDestinationPath } from "../utils/paths";
import { applyTransformers } from "src/lib/zendo/transformers";

/**
 * Fetches content from a source
 */
async function fetchContent(
  sourceId: string,
  source: Source,
  updateProgress: (text: string) => void
): Promise<{ cacheDir: string; result: SourceResult }> {
  const cacheDir = getSourceCacheDir(sourceId);
  await fse.mkdirp(cacheDir);
  const result = await source(cacheDir, { updateProgress });
  return { cacheDir, result };
}

/**
 * Gets files for a content type
 */
async function getFilesForContentType(contentType: ZendoCollectionConfig, basePath: string): Promise<string[]> {
  return glob(contentType.pattern, { cwd: basePath });
}

/**
 * Transforms a single file
 */
async function transformFile(
  file: string,
  basePath: string,
  contentType: ZendoCollectionConfig,
  contentDir: string
): Promise<boolean> {
  const sourcePath = path.join(basePath, file);
  const { content } = await readFileWithEncoding(sourcePath);

  const result = await applyTransformers(file, content, contentType);

  if (result === null) {
    return false;
  }

  const destinationPath = getDestinationPath(contentDir, contentType.destinationPath, result.path);
  await writeFileWithEncoding(destinationPath, result.content);
  return true;
}

/**
 * Transforms content for a content type
 */
async function transformContent(
  contentType: ZendoCollectionConfig,
  tmpPath: string,
  contentDir: string
): Promise<number> {
  const basePath = getContentTypeBasePath(tmpPath, contentType.basePath);
  const files = await getFilesForContentType(contentType, basePath);

  if (files.length === 0) {
    ui.warning(`No files found for ${contentType.id} (${contentType.pattern})`);
    return 0;
  }

  let processedCount = 0;

  await ui.withSpinnerAndItemProgress(
    `Transforming ${ui.colors.info(contentType.id)}`,
    files,
    async (file, index, updateProgress) => {
      const success = await transformFile(file, basePath, contentType, contentDir);
      if (success) {
        processedCount++;
      }
      updateProgress(index + 1, files.length);
      return success;
    },
    () => `Transformed ${ui.colors.success(contentType.id)} (${processedCount} files)`
  );

  return processedCount;
}

export default async function fetchAndTransformContent(): Promise<void> {
  await ui.withSpinner(
    `Cleaning content directory: ${config.contentDir}`,
    () => cleanDirectory(config.contentDir),
    `Cleaned content directory: ${config.contentDir}`
  );

  for (const sourceConfig of config.sources) {
    const baseText = `Fetching from source: ${ui.colors.brand(sourceConfig.id)}`;
    const { cacheDir: cachePath } = await ui.withSpinnerAndProgress(
      baseText,
      (updateText) => {
        // Wrap the updateText to format progress in parentheses
        const wrappedUpdateText = (progressText: string) => {
          updateText(`${baseText} (${progressText})`);
        };
        return fetchContent(sourceConfig.id, sourceConfig.source, wrappedUpdateText);
      },
      ({ result }) => `Fetched from source: ${ui.colors.brand(sourceConfig.id)} (${result.message})`
    );

    for (const contentType of sourceConfig.entryTypes) {
      await transformContent(contentType, cachePath, config.contentDir);
    }
  }

  ui.success(`Fetched content from ${config.sources.length} sources!`);
}
