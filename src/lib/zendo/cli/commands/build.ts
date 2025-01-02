import fetchContent from "./fetch";
import indexContent from "./reindex";
import saveGlobalStats from "./saveGlobalStats";
import * as ui from "../ui";
import { execAsync } from "../utils/exec";

const BUILD_COMMAND = "npm run build";

async function buildSite(): Promise<void> {
  await ui.withSpinner(
    "Building Astro site...",
    async () => {
      return execAsync(BUILD_COMMAND);
    },
    "Astro site built"
  );
}

async function buildGlobalStats(): Promise<void> {
  await ui.withSpinner(
    "Saving global stats...",
    async () => {
      return saveGlobalStats();
    },
    "Global stats saved"
  );
}

/**
 * Main function to update content: fetch, index, build, and commit
 */
export default async function buildCommand(): Promise<void> {
  await fetchContent();
  await buildGlobalStats();
  await indexContent();
  await buildSite();

  ui.success("All steps completed!");
}
