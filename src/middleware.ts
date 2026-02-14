import { defineMiddleware } from "astro:middleware";
import fs from "fs-extra";
import path from "path";

import { getElevation } from "./lib/utils/location";

export const onRequest = defineMiddleware(async (context, next) => {
  let currentElevation = (await getElevation("41.54149017019486", "12.959058265624265")) || 17;

  // Add random offset between -10m and +10m for privacy around home location
  currentElevation += Math.floor(Math.random() * 21) - 10;

  let latestHike = "Monte Terminillo";
  let peakSleeps = 10;
  let waypoints = {
    total: 0,
    sketch: 0,
    surveying: 0,
    charted: 0,
  };
  let books = {
    total: 0,
    completed: 0,
    reading: 0,
    highlights: 0,
  };
  let writings = {
    total: 0,
  }
  let hikes = {
    total: 0,
    distance: '0 km',
    elevation: '0 m',
    time: '0h 0m',
  };


  try {
    const globalStatePath = path.join(process.cwd(), "src/content/assets/global_state.json");

    if (await fs.pathExists(globalStatePath)) {
      const data = await fs.readJson(globalStatePath);

      if (data.latestHike?.title) {
        latestHike = data.latestHike.title;
      }

      if (typeof data.sleptNights === "number") {
        peakSleeps = data.sleptNights;
      }

      if (data.waypoints) {
        waypoints = data.waypoints;
      }

      if (data.books) {
        books = data.books;
      }

      if (data.writings) {
        writings = data.writings;
      }

      if (data.hikes) {
        hikes = data.hikes;
      }
    }
  } catch (error) {
    console.error("Error reading global state:", error);
  }

  const globalState = {
    elevation: currentElevation,
    latestHike,
    peakSleeps,
    waypoints,
    books,
    writings,
    hikes,
  };

  context.locals.globalState = globalState;

  return next();
});
