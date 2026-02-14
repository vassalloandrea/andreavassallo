import { getCollection } from "astro:content";

import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const site = "https://andreavassallo.it";

  const [waypoints, books, hikes, writings] = await Promise.all([
    getCollection("waypoints"),
    getCollection("books"),
    getCollection("hikes"),
    getCollection("writings"),
  ]);

  const urls = [
    // Pagine statiche (quelle che già c'erano)
    `${site}/`,
    `${site}/about/`,
    `${site}/atlas/`,
    `${site}/books/`,
    `${site}/hikes/`,
    `${site}/waypoints/`,
    `${site}/writings/`,
    `${site}/privacy/`,

    // Pagine dinamiche
    ...waypoints.map((w) => `${site}/waypoints/${w.id}/`),
    ...books.map((b) => `${site}/books/${b.id}/`),
    ...hikes.map((h) => `${site}/hikes/${h.id}/`),
    ...writings.map((w) => `${site}/writings/${w.id}/`),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls
  .map(
    (loc) => `  <url>
    <loc>${loc}</loc>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
};
