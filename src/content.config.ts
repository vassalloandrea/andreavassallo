import { z, defineCollection, reference } from "astro:content";
import { file, glob } from "astro/loaders";

const baseSchema = z.object({
  title: z.string(),
  status: z.enum(["sketch", "surveying", "charted"]),
  createdAt: z.coerce.date().optional().default(new Date()),
  updatedAt: z.coerce.date().optional().default(new Date()),
});

const obsidianSchema = baseSchema.extend(
  z.object({
    topics: z.array(reference("topics")).optional(),
    draft: z
      .preprocess((val) => {
        if (typeof val === "string") {
          if (val.toLowerCase() === "true") return true;
          if (val.toLowerCase() === "false") return false;
        }
        return val;
      }, z.boolean())
      .optional()
      .default(false),
  }).shape
);

const readwiseSchema = obsidianSchema.extend(
  z.object({
    author: z.string(),
    publishedOn: z.coerce.date(),
    lastHighlightedOn: z.coerce.date(),
    url: z.string().nullable(),
  }).shape
);

export const collections = {
  socials: defineCollection({
    schema: z.object({
      name: z.string(),
      icon: z.string(),
      url: z.string().url(),
    }),
    loader: file("src/data/socials.json"),
  }),

  topics: defineCollection({
    schema: obsidianSchema,
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/topics" }),
  }),

  waypoints: defineCollection({
    schema: obsidianSchema,
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/waypoints" }),
  }),

  books: defineCollection({
    schema: readwiseSchema.extend(
      z.object({
        completed: z.boolean().optional().default(false),
      }).shape
    ),
    loader: glob({
      pattern: "**/*.{md,mdx}",
      base: "./src/content/books",
    }),
  }),

  writings: defineCollection({
    schema: obsidianSchema
      .extend({
        linked: z.boolean().default(false),
        readingTime: z.number().nullable().optional(),
        url: z.string().url().nullable().optional(),
        publishedOn: z.coerce.date(),
      })
      .superRefine((data, ctx) => {
        if (data.linked) {
          if (!data.url) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "URL is required when linked is true",
              path: ["url"],
            });
          }
          if (!data.readingTime) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Read time is required when linked is true",
              path: ["readingTime"],
            });
          }
        } else {
          if (data.url) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "URL must be null/empty when linked is false",
              path: ["url"],
            });
          }
          if (data.readingTime) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Read time must be null/empty when linked is false",
              path: ["readingTime"],
            });
          }
        }
      }),
    loader: glob({
      pattern: "**/*.{md,mdx}",
      base: "./src/content/writings",
    }),
  }),

  hikes: defineCollection({
    schema: obsidianSchema.extend(
      z.object({
        route: z.string(),
        publishedOn: z.coerce.date(),
        count: z.number().int().min(1),
        difficulty: z.enum(["Easy", "Medium", "Hard"]),
        feedback: z.number().int().min(1).max(5),
        url: z.string().url().nullable().optional(),
        slept: z.boolean().optional().default(false),
        ferrata: z.boolean().optional().default(false),
        mountaineering: z.boolean().optional().default(false),
        region: z.string().optional(),

        // Auto generated stats
        distance: z.string().optional(),
        gain: z.number().optional(),
        loss: z.number().optional(),
        type: z.string().optional(),
        movingTime: z.string().optional(),
        totalTime: z.string().optional(),
      }).shape
    ),
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/hikes" }),
  }),
};
