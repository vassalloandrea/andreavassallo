import fs from "fs-extra";
import path from "path";
import * as cheerio from "cheerio";
import matter from "gray-matter";
import { Buffer } from "buffer";
import type { Transformer } from "src/lib/zendo/transformers";

interface Point {
  lat: number;
  lon: number;
  ele: number;
  time: Date | null;
}

interface HikeStats {
  distance: string;
  gain: number;
  loss: number;
  maxEle: number;
  minEle: number;
  type: string;
  movingTime: string;
  totalTime: string;
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function haversine(point1: Point, point2: Point): number {
  const EARTH_RADIUS_KM = 6371; // km
  const deltaLatitude = degreesToRadians(point2.lat - point1.lat);
  const deltaLongitude = degreesToRadians(point2.lon - point1.lon);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(degreesToRadians(point1.lat)) *
      Math.cos(degreesToRadians(point2.lat)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function formatDuration(milliseconds: number): string {
  if (milliseconds <= 0) return "N/A";

  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function parsePoints(gpxContent: string): Point[] {
  const $ = cheerio.load(gpxContent, { xmlMode: true });
  const trackPoints: Point[] = [];

  $("trkpt").each((_, element) => {
    const el = $(element);
    const lat = parseFloat(el.attr("lat") || "0");
    const lon = parseFloat(el.attr("lon") || "0");
    const ele = parseFloat(el.find("ele").text() || "0");
    const timeText = el.find("time").text();
    const time = timeText ? new Date(timeText) : null;

    trackPoints.push({ lat, lon, ele, time });
  });

  return trackPoints;
}

/**
 * Smooth elevation data using a simple moving average to reduce GPS noise.
 * This prevents the naive point-to-point calculation from massively
 * overestimating elevation gain due to small random fluctuations.
 */
function smoothElevations(points: Point[], windowSize: number = 5): number[] {
  const half = Math.floor(windowSize / 2);
  return points.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(points.length, i + half + 1);
    const slice = points.slice(start, end);
    return slice.reduce((sum, p) => sum + p.ele, 0) / slice.length;
  });
}

function calculateStats(trackPoints: Point[]): HikeStats {
  let distance = 0;
  let gain = 0;
  let loss = 0;
  const firstPoint = trackPoints[0];
  if (!firstPoint) throw new Error("No track points");

  let minEle = firstPoint.ele;
  let maxEle = firstPoint.ele;
  let movingTime = 0;

  // Smooth elevations to filter out GPS noise before computing gain/loss.
  // A 5-point moving average combined with a 2m dead-band threshold
  // produces results very close to what Strava reports.
  const SMOOTHING_WINDOW = 5;
  const ELEVATION_THRESHOLD = 2; // meters
  const smoothed = smoothElevations(trackPoints, SMOOTHING_WINDOW);
  let accumulatedElevation = 0;

  for (let i = 1; i < trackPoints.length; i++) {
    const previousPoint = trackPoints[i - 1];
    const currentPoint = trackPoints[i];

    if (!previousPoint || !currentPoint) continue;

    const segmentDistance = haversine(previousPoint, currentPoint);
    distance += segmentDistance;

    // Use smoothed elevations for gain/loss with a dead-band threshold.
    // Small oscillations are accumulated and only counted once they
    // exceed the threshold, filtering out GPS jitter.
    const smoothedDiff = smoothed[i]! - smoothed[i - 1]!;
    accumulatedElevation += smoothedDiff;

    if (accumulatedElevation > ELEVATION_THRESHOLD) {
      gain += accumulatedElevation;
      accumulatedElevation = 0;
    } else if (accumulatedElevation < -ELEVATION_THRESHOLD) {
      loss += Math.abs(accumulatedElevation);
      accumulatedElevation = 0;
    }

    // Min/max use raw values to preserve the actual recorded extremes
    if (currentPoint.ele < minEle) minEle = currentPoint.ele;
    if (currentPoint.ele > maxEle) maxEle = currentPoint.ele;

    const timeDifference = (currentPoint.time?.getTime() ?? 0) - (previousPoint.time?.getTime() ?? 0); // ms
    if (timeDifference > 0) {
      const speed = (segmentDistance * 1000) / (timeDifference / 1000); // m/s
      // Filter out very slow speeds (stops) and very high speeds (GPS errors)
      if (speed > 0.5 && speed < 15) {
        // 0.5 m/s ~ 1.8km/h
        movingTime += timeDifference;
      }
    }
  }

  // Trail Type Heuristics
  const startPoint = trackPoints[0];
  const endPoint = trackPoints[trackPoints.length - 1];

  if (!startPoint || !endPoint) throw new Error("Incomplete track points");

  const distanceStartToEnd = haversine(startPoint, endPoint);
  let type = "A/R";

  // If start and end are very close regarding the total distance, it's a loop
  if (distanceStartToEnd < 0.5 || distanceStartToEnd < distance * 0.05) {
    type = "Loop";
  }

  const totalTime = (endPoint.time?.getTime() ?? 0) - (startPoint.time?.getTime() ?? 0);

  return {
    distance: distance.toFixed(2),
    gain: Math.round(gain),
    loss: Math.round(loss),
    maxEle: Math.round(maxEle),
    minEle: Math.round(minEle),
    movingTime: formatDuration(movingTime),
    totalTime: formatDuration(totalTime),
    type,
  };
}

// --- Map Generation Logic ---

function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  return (
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

async function fetchTileAsBase64(x: number, y: number, z: number): Promise<string | null> {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Zendo-Hike-Map-Generator/1.0 (info@andreavassallo.com)",
      },
    });
    if (!response.ok) {
      console.warn(`Failed to fetch tile ${url}: ${response.statusText}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (error) {
    console.warn(`Error fetching tile ${url}`, error);
    return null;
  }
}

async function generateSvgMapWithTiles(trackPoints: Point[]): Promise<string> {
  const width = 600;
  const height = 400;

  const latitudes = trackPoints.map((p) => p.lat);
  const longitudes = trackPoints.map((p) => p.lon);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);

  // 1. Calculate appropriate zoom level to fit bounds into width/height
  // Use World Coordinates (0..1)
  const worldMinX = (minLon + 180) / 360;
  const worldMaxX = (maxLon + 180) / 360;
  const worldMinY =
    (1 - Math.log(Math.tan((maxLat * Math.PI) / 180) + 1 / Math.cos((maxLat * Math.PI) / 180)) / Math.PI) / 2;
  const worldMaxY =
    (1 - Math.log(Math.tan((minLat * Math.PI) / 180) + 1 / Math.cos((minLat * Math.PI) / 180)) / Math.PI) / 2;

  const dx = worldMaxX - worldMinX;
  const dy = worldMaxY - worldMinY;

  // We want the bounding box to fit in roughly 80% of the image
  const padFactor = 1.2;
  const zoomX = Math.log2((width * padFactor) / (dx * 256));
  const zoomY = Math.log2((height * padFactor) / (dy * 256));
  const zoom = Math.floor(Math.min(zoomX, zoomY));

  // Cap zoom to avoid issues (OSM usually max 19)
  const finalZoom = Math.min(Math.max(zoom, 1), 18);

  // 2. Coordinate System: Global Pixels at finalZoom
  // Origin (0,0) is top-left of the world.
  // We want to define viewBox such that the track is centered.

  // Track bounds in pixels
  const pMinX = lon2tile(minLon, finalZoom) * 256;
  const pMaxX = lon2tile(maxLon, finalZoom) * 256;
  const pMinY = lat2tile(maxLat, finalZoom) * 256;
  const pMaxY = lat2tile(minLat, finalZoom) * 256;

  const trackWidth = pMaxX - pMinX;
  const trackHeight = pMaxY - pMinY;

  const centerX = (pMinX + pMaxX) / 2;
  const centerY = (pMinY + pMaxY) / 2;

  // ViewBox: centered, with fixed aspect ratio 600:400, covering the track + padding
  // Scale to fit
  const scaleX = trackWidth / (width * 0.8);
  const scaleY = trackHeight / (height * 0.8);
  const scale = Math.max(scaleX, scaleY);

  const viewWidth = width * scale;
  const viewHeight = height * scale;
  const viewMinX = centerX - viewWidth / 2;
  const viewMinY = centerY - viewHeight / 2;

  // 3. Identify Tiles covering the Viewport
  const tMinX = Math.floor(viewMinX / 256);
  const tMaxX = Math.floor((viewMinX + viewWidth) / 256);
  const tMinY = Math.floor(viewMinY / 256);
  const tMaxY = Math.floor((viewMinY + viewHeight) / 256);

  // 4. Fetch Tiles
  const tileImages: string[] = [];

  // Limit number of tiles to prevent overload
  if ((tMaxX - tMinX + 1) * (tMaxY - tMinY + 1) > 50) {
    console.warn("Too many tiles requested, skipping map background");
  } else {
    for (let x = tMinX; x <= tMaxX; x++) {
      for (let y = tMinY; y <= tMaxY; y++) {
        const base64 = await fetchTileAsBase64(x, y, finalZoom);
        if (base64) {
          const xPos = x * 256;
          const yPos = y * 256;
          // Use image href with base64
          tileImages.push(
            `<image x="${xPos}" y="${yPos}" width="256" height="256" href="data:image/png;base64,${base64}" />`
          );
        }
      }
    }
  }

  // 5. Build SVG Path
  // Points in global pixels
  const pointsData = trackPoints.map((p) => {
    const px = lon2tile(p.lon, finalZoom) * 256;
    const py = lat2tile(p.lat, finalZoom) * 256;
    return { x: px, y: py };
  });

  let pathD = "";
  const firstPoint = pointsData[0];
  if (firstPoint) {
    pathD = `M ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`;
    for (let i = 1; i < pointsData.length; i++) {
      const pt = pointsData[i];
      pathD += ` L ${pt?.x.toFixed(2)} ${pt?.y.toFixed(2)}`;
    }
  }

  // Construct SVG
  // Set explicit width/height to guide browser layout, viewBox for content
  // primary color from global.css is oklch(0.45 0.12 145)
  return `<svg width="${width}" height="${height}" viewBox="${viewMinX.toFixed(2)} ${viewMinY.toFixed(2)} ${viewWidth.toFixed(2)} ${viewHeight.toFixed(2)}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
      </filter>
      <filter id="grayscale">
        <feColorMatrix type="saturate" values="0"/>
      </filter>
    </defs>
    <g id="map-layer" filter="url(#grayscale)" opacity="0.8">
      ${tileImages.join("\n    ")}
    </g>
    <path d="${pathD}" stroke="oklch(0.45 0.12 145)" stroke-width="${4 * scale}" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#shadow)"/>
  </svg>`;
}

const extractDataFromGPX = (): Transformer => {
  return async (originalPath: string, originalContent: string | Buffer) => {
    // 1. Determine GPX path
    const dirname = path.dirname(originalPath);
    const stem = path.basename(originalPath, path.extname(originalPath));
    // we want .../src/content/assets/gpxs/foo.gpx
    // If we assume a standard structure, we can go up one level from 'hikes'
    const gpxPath = path.resolve(dirname, "./src/content/assets/gpxs", `${stem}.gpx`);

    if (!fs.existsSync(gpxPath)) {
      throw new Error(`GPX file not found for ${originalPath} at ${gpxPath}`);
    }

    // 2. Read and Parse GPX
    const gpxContent = await fs.readFile(gpxPath, "utf-8");
    const trackPoints = parsePoints(gpxContent);

    if (trackPoints.length === 0) {
      console.warn(`No track points found in ${gpxPath}`);
      return { path: originalPath, content: originalContent };
    }

    // 3. Calculate Stats
    const stats = calculateStats(trackPoints);

    // 4. Generate Map SVG with Tiles
    const svgContent = await generateSvgMapWithTiles(trackPoints);
    const mapFileName = `${stem}.svg`;

    // Save to src/content/assets/maps/
    const mapsDir = path.resolve(dirname, "./src/content/assets/maps");
    await fs.ensureDir(mapsDir);
    const mapPath = path.join(mapsDir, mapFileName);
    await fs.writeFile(mapPath, svgContent);

    // 5. Update Frontmatter
    const { data, content: markdownBody } = matter(originalContent);

    // Inject stats
    data.distance = stats.distance;
    data.gain = stats.gain;
    data.loss = stats.loss;
    data.maxEle = stats.maxEle;
    data.minEle = stats.minEle;
    data.type = stats.type;
    data.movingTime = stats.movingTime;
    data.totalTime = stats.totalTime;

    data.map = `./src/content/assets/maps/${mapFileName}`;

    const newContent = matter.stringify(markdownBody, data);

    return {
      path: originalPath,
      content: newContent,
    };
  };
};

export default extractDataFromGPX;
