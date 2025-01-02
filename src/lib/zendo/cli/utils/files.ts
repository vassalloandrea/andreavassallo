import fs from "fs/promises";
import * as fse from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Text file extensions
 */
const TEXT_FILE_EXTENSIONS = [".md", ".mdx"] as const;

/**
 * Checks if a file is a text file based on its extension
 */
export function isTextFile(filePath: string): boolean {
  const fileExtension = path.extname(filePath).toLowerCase();
  return TEXT_FILE_EXTENSIONS.includes(fileExtension as ".md" | ".mdx");
}

/**
 * Reads a file with automatic encoding detection
 */
export async function readFileWithEncoding(filePath: string): Promise<{ content: string | Buffer; isText: boolean }> {
  const isText = isTextFile(filePath);
  const content = isText ? await fs.readFile(filePath, "utf8") : await fs.readFile(filePath);
  return { content, isText };
}

/**
 * Writes a file with automatic encoding handling
 */
export async function writeFileWithEncoding(filePath: string, content: string | Buffer): Promise<void> {
  await fse.mkdirp(path.dirname(filePath));

  if (Buffer.isBuffer(content)) {
    await fs.writeFile(filePath, content);
  } else {
    await fs.writeFile(filePath, content, "utf8");
  }
}

/**
 * Cleans a directory, removing all contents
 * Silently handles ENOENT errors (directory doesn't exist)
 */
export async function cleanDirectory(dir: string): Promise<void> {
  try {
    await fse.remove(dir);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Gets all markdown files from a directory recursively
 */
export async function getMarkdownFiles(dir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dir, { recursive: true });
    return files.filter((file) => file.endsWith(".md") || file.endsWith(".mdx"));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code !== "ENOENT") {
      return [];
    }

    throw error;
  }
}

/**
 * Writes JSON data to a file
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Gets the path to the data directory index file
 */
export function getIndexFilePath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, "../../../../data/index.json");
}
