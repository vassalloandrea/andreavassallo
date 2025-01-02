import path from "path";

/**
 * Gets the cache directory path for a source
 */
export function getSourceCacheDir(sourceId: string): string {
  const baseCacheDir = path.join(process.cwd(), ".garden-source");
  return path.join(baseCacheDir, sourceId);
}

/**
 * Gets the base path for a content type
 */
export function getContentTypeBasePath(tmpPath: string, basePath?: string): string {
  return path.join(tmpPath, basePath || "");
}

/**
 * Gets the destination path for a transformed file
 */
export function getDestinationPath(contentDir: string, destinationPath: string, filePath: string): string {
  return path.join(contentDir, destinationPath, filePath);
}
