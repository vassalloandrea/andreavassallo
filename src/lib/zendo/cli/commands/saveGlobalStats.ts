import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import matter from "gray-matter";

interface HikeData {
  title: string;
  date: Date;
  slept: boolean;
  slug: string;
  distance: number;
  gain: number;
  movingTime: number; // in minutes
}

interface BookData {
  completed: boolean;
  highlightCount: number;
}

interface WaypointData {
  status: string;
}

interface WaypointStats {
  total: number;
  sketch: number;
  surveying: number;
  charted: number;
}

interface BookStats {
  total: number;
  completed: number;
  reading: number;
  highlights: number;
}

interface WritingStats {
  total: number;
}

interface HikeStats {
  total: number;
  distance: string;
  elevation: string;
  time: string;
}

function parseTime(timeStr: string): number {
  if (!timeStr) return 0;
  const hoursMatch = timeStr.match(/(\d+)h/);
  const minutesMatch = timeStr.match(/(\d+)m/);

  const hours = hoursMatch ? parseInt(hoursMatch[1] || "0", 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1] || "0", 10) : 0;

  return hours * 60 + minutes;
}

async function getWritingsStats(): Promise<WritingStats> {
  const cwd = process.cwd();
  const writingsDir = path.join(cwd, "src/content/writings");
  const files = await glob(path.join(writingsDir, "*.mdx"));

  return {
    total: files.length,
  };
}

async function getHikeStats() {
  const cwd = process.cwd();
  const hikesDir = path.join(cwd, "src/content/hikes");
  const files = await glob(path.join(hikesDir, "*.mdx"));

  const hikes = await Promise.all(
    files.map(async (filePath): Promise<HikeData> => {
      const content = await fs.readFile(filePath, "utf-8");
      const { data } = matter(content);
      return {
        title: data.title,
        date: new Date(data.publishedOn),
        slept: data.slept === true,
        slug: path.basename(filePath, ".mdx"),
        distance: parseFloat(data.distance) || 0,
        gain: Number(data.gain) || 0,
        movingTime: parseTime(data.movingTime),
      };
    })
  );

  // Sort by date descending (latest first)
  hikes.sort((a, b) => b.date.getTime() - a.date.getTime());

  const latestHike = hikes[0];
  const sleptCount = hikes.filter((h) => h.slept).length;

  const totalDistance = Math.round(hikes.reduce((acc, curr) => acc + curr.distance, 0));
  const totalElevation = hikes.reduce((acc, curr) => acc + curr.gain, 0);
  const totalTime = hikes.reduce((acc, curr) => acc + curr.movingTime, 0);

  const stats: HikeStats = {
    total: hikes.length,
    distance: `${totalDistance} km`,
    elevation: `${totalElevation.toLocaleString()} m`,
    time: `${Math.floor(totalTime / 60)}h ${totalTime % 60}m`,
  };

  return {
    latestHike: latestHike
      ? {
          title: latestHike.title,
          date: latestHike.date,
          slug: latestHike.slug,
        }
      : null,
    sleptNights: sleptCount + 3,
    hikes: stats,
  };
}

async function getBookStats(): Promise<BookStats> {
  const cwd = process.cwd();
  const booksDir = path.join(cwd, "src/content/books");
  const files = await glob(path.join(booksDir, "*.mdx"));

  const books = await Promise.all(
    files.map(async (filePath): Promise<BookData> => {
      const fileContent = await fs.readFile(filePath, "utf-8");
      const { data, content } = matter(fileContent);

      const highlightCount = content.split("\n").filter((line) => line.trim().startsWith("- ")).length;

      return {
        completed: data.completed || false,
        highlightCount,
      };
    })
  );

  return {
    total: books.length,
    completed: books.filter((b) => b.completed).length,
    reading: books.filter((b) => !b.completed).length,
    highlights: books.reduce((acc, curr) => acc + curr.highlightCount, 0),
  };
}

async function getWaypointStats(): Promise<WaypointStats> {
  const cwd = process.cwd();
  const waypointsDir = path.join(cwd, "src/content/waypoints");
  const waypointFiles = await glob(path.join(waypointsDir, "*.mdx"));

  const waypoints = await Promise.all(
    waypointFiles.map(async (filePath): Promise<WaypointData> => {
      const content = await fs.readFile(filePath, "utf-8");
      const { data } = matter(content);
      return {
        status: data.status,
      };
    })
  );

  const waypointsTotal = waypoints.length;
  const waypointsSketch = waypoints.filter((w) => w.status === "sketch").length;
  const waypointsSurveying = waypoints.filter((w) => w.status === "surveying").length;
  const waypointsCharted = waypoints.filter((w) => w.status === "charted").length;

  return {
    total: waypointsTotal,
    sketch: waypointsSketch,
    surveying: waypointsSurveying,
    charted: waypointsCharted,
  };
}

export default async function saveGlobalStats(): Promise<void> {
  const cwd = process.cwd();

  const [hikeStats, bookStats, writingsStats, waypointsStats] = await Promise.all([
    getHikeStats(),
    getBookStats(),
    getWritingsStats(),
    getWaypointStats(),
  ]);

  const stats = {
    ...hikeStats,
    books: bookStats,
    writings: writingsStats,
    waypoints: waypointsStats,
  };

  const assetsDir = path.join(cwd, "src/content/assets");
  await fs.ensureDir(assetsDir);

  const outputPath = path.join(assetsDir, "global_state.json");
  await fs.writeJson(outputPath, stats, { spaces: 2 });
}
