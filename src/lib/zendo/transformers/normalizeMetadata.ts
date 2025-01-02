import matter from "gray-matter";
import slugify from "slugify";
import emojiRegex from "emoji-regex";

import type { Transformer } from "src/lib/zendo/transformers";

export type NormalizeMetadataConfig = {
  normalizeKeysFor: string[];
  normalizeValuesFor: string[];
  keyMappings?: Record<string, string>;
  valueMappings?: Record<string, Record<string | number, unknown>>;
};

function normalizeEmojis(text: string): string {
  const regex = emojiRegex();
  return text.replace(regex, (emoji) => {
    const unicodeName = [...emoji].map((char) => char.codePointAt(0)?.toString(16)).join("-");
    return `emoji-${unicodeName}`;
  });
}

function remapValue(value: unknown, mappings: Record<string | number, unknown>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // Convert value to a lookup key (handle booleans by converting to string)
  const lookupKey: string | number | undefined =
    typeof value === "boolean"
      ? String(value)
      : typeof value === "string" || typeof value === "number"
        ? value
        : undefined;

  // Check if there's a mapping for this value
  if (lookupKey !== undefined && lookupKey in mappings) {
    return mappings[lookupKey];
  }

  // For arrays, remap each item
  if (Array.isArray(value)) {
    return value.map((item) => remapValue(item, mappings));
  }

  // No mapping found, return original value
  return value;
}

function slugifyValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    const transformedEmojis = normalizeEmojis(value);
    return slugify(transformedEmojis, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => slugifyValue(item));
  }

  // For other types (number, boolean, etc.), convert to string and slugify
  const transformedEmojis = normalizeEmojis(String(value));
  return slugify(transformedEmojis, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });
}

const normalizeMetadata = (config: NormalizeMetadataConfig): Transformer => {
  const { normalizeKeysFor, normalizeValuesFor, keyMappings = {}, valueMappings = {} } = config;

  return async (originalPath: string, originalContent: string | Buffer) => {
    // Skip binary files
    if (Buffer.isBuffer(originalContent)) {
      return { path: originalPath, content: originalContent };
    }

    const { data, content } = matter(originalContent);

    // Create new metadata object with slugified keys and values
    const normalizedData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Check if there's a key mapping first
      let finalKey = keyMappings[key] || key;

      // Only normalize the key if it's in the whitelist and not already mapped
      if (normalizeKeysFor.includes(key) && !keyMappings[key]) {
        const transformedEmojis = normalizeEmojis(key);
        finalKey = slugify(transformedEmojis, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@]/g,
        });
      }

      // Apply value remapping (pre-normalization) if mappings exist for this key
      let remappedValue = value;
      if (valueMappings[key]) {
        remappedValue = remapValue(value, valueMappings[key]);
      }

      // Only normalize the value if the original key is in the whitelist
      const finalValue = normalizeValuesFor.includes(key) ? slugifyValue(remappedValue) : remappedValue;

      normalizedData[finalKey] = finalValue;
    }

    const newContent = matter.stringify(content, normalizedData);

    return {
      path: originalPath,
      content: newContent,
    };
  };
};

export default normalizeMetadata;
