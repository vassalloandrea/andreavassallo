// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import icon from "astro-icon";

import { remarkReadingTime } from "./src/lib/zendo/plugins/remarkReadingTime.mjs";
import { remarkWikiLink } from "./src/lib/zendo/plugins/remarkWikiLink.mjs";
import { remarkWikiImage } from "./src/lib/zendo/plugins/remarkWikiImage.mjs";

import mdx from "@astrojs/mdx";

import tailwindcss from "@tailwindcss/vite";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",

  site: "https://andreavassallo.it",

  integrations: [icon(), mdx()],

  markdown: {
    remarkPlugins: [remarkReadingTime, remarkWikiLink, [remarkWikiImage, { assetsPath: "../assets" }]],
  },

  server: {
    host: true,
  },

  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: "Inter",
        cssVariable: "--font-sans",
        weights: [400, 500, 600, 700],
      },
      {
        provider: fontProviders.google(),
        name: "Nunito Sans",
        cssVariable: "--font-serif",
        weights: [400, 500, 600, 700],
      },
      {
        provider: fontProviders.google(),
        name: "Geist Mono",
        cssVariable: "--font-mono",
        weights: [400, 500, 600, 700],
      },
    ],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: node({
    mode: "standalone",
  }),
});
