import type { Transformer } from "src/lib/zendo/transformers";
import path from "path";

const renameMdToMdx = (): Transformer => {
  return async (filePath: string, content: string | Buffer) => {
    if (path.extname(filePath) === ".md") {
      const newPath = path.format({
        ...path.parse(filePath),
        base: undefined,
        ext: ".mdx",
      });

      return {
        path: newPath,
        content,
      };
    }

    return { path: filePath, content };
  };
};

export default renameMdToMdx;
