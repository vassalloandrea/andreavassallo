import { Command } from "commander";
import fetchCommand from "./commands/fetch";
import reindexCommand from "./commands/reindex";
import buildCommand from "./commands/build";
import saveGlobalStats from "./commands/saveGlobalStats";
import * as ui from "./ui";

const program = new Command();

program.name("zendo").description(ui.colors.brand("Your digital garden toolkit")).version("0.1.0").configureHelp({
  helpWidth: 100,
  sortSubcommands: true,
});

// Register commands directly
program.command("fetch").description("Fetch all content from your sources").action(fetchCommand);

program.command("reindex").description("Rebuild the content index").action(reindexCommand);

program
  .command("build")
  .description("Fetch, reindex, and build your garden")
  .option("-v, --verbose", "Enable verbose logging")
  .action(buildCommand);

program.command("globalStats").description("Compute and save global statistics about hikes").action(saveGlobalStats);

export default program;
