import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { getContainerRenderer as mdxContainerRenderer } from "@astrojs/mdx";
import { render } from "astro:content";
import { loadRenderers } from "astro:container";
import * as cheerio from "cheerio";
import Link from "@components/ui/Link.astro";
import type { AnyEntryMap, CollectionEntry } from "astro:content";

export async function renderToString(entry: CollectionEntry<keyof AnyEntryMap>): Promise<string> {
  const renderers = await loadRenderers([mdxContainerRenderer()]);
  const container = await AstroContainer.create({
    renderers,
  });

  const { Content } = await render(entry);
  const entryHtml = await container.renderToString(Content, {
    props: { components: getMdxComponents() },
  });

  return entryHtml;
}

export function getHtmlText(html: string): string {
  return cheerio.load(html).text();
}

export function getMdxComponents() {
  return {
    a: Link,
    Link: Link,
  };
}
