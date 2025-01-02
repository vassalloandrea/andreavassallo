import { execAsync } from "src/lib/zendo/cli/utils/exec";
import { existsSync } from "fs";
import { join } from "path";

import type { Source } from "src/lib/zendo/sources";

type GitConfiguration = {
  repositoryUrl: string;
};

export default function gitSource(config: GitConfiguration): Source {
  return async (destination, context) => {
    const gitDir = join(destination, ".git");

    if (existsSync(gitDir)) {
      context.updateProgress("pulling repo...");

      await execAsync(`cd ${destination} && git pull`, {
        encoding: "utf8",
      });

      return {
        status: "success",
        message: "pulled repo",
      };
    } else {
      context.updateProgress("cloning repo...");

      await execAsync(`git clone ${config.repositoryUrl} ${destination}`, {
        encoding: "utf8",
      });

      return {
        status: "success",
        message: "cloned repo",
      };
    }
  };
}
