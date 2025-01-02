import path from "path";
import slugify from "slugify";
import emojiRegex from "emoji-regex";

import type { Transformer } from "src/lib/zendo/transformers";

function limitFilenameLength(fileName: string, maxLength: number): string {
  const extension = path.extname(fileName);
  const name = fileName.slice(0, -extension.length);

  if (name.length <= maxLength) {
    return name + extension;
  }

  return name.slice(0, maxLength) + extension;
}

function normalizeEmojis(text: string): string {
  const regex = emojiRegex();

  return text.replace(regex, (emoji) => {
    const unicodeName = [...emoji].map((char) => char.codePointAt(0)?.toString(16)).join("-");
    return `emoji-${unicodeName}`;
  });
}

const normalizeFilename = (): Transformer => {
  return async (originalPath: string, originalContent: string | Buffer) => {
    const parsedPath = path.parse(originalPath);

    const transformedEmojis = normalizeEmojis(parsedPath.name);
    const newBasename = slugify(transformedEmojis, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
    const newName = limitFilenameLength(newBasename + parsedPath.ext, 100);
    const newPath = path.join(parsedPath.dir, newName);

    return {
      path: newPath,
      content: originalContent,
    };
  };
};

export default normalizeFilename;
