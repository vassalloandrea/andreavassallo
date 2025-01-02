import gitSource from "src/lib/zendo/sources/git";
import notionSource from "src/lib/zendo/sources/notion";

export type SourceResult = {
  status: "success" | "warning";
  message: string;
};

export type Source = (
  destination: string,
  context: { updateProgress: (text: string) => void }
) => Promise<SourceResult>;

export { gitSource, notionSource };
