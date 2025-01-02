import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_KEY;

export interface Coordinates {
  lat: number;
  lng: number;
}

interface TrackingData {
  lat: number;
  lng: number;
  updated_at: string;
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function getElevation(latitude: string, longitude: string): Promise<number | null> {
  // 1. Get the latest coordinates from Supabase (if necessary overwrite input)
  // Note: in your original code you ALWAYS overwrote lat/long with those from getLatestCoordinates().
  // If this is intentional, fine. If you wanted to use the input parameters as a fallback, be careful with the logic.
  const coordinates = await getLatestCoordinates();

  if (coordinates) {
    latitude = coordinates.lat.toString();
    longitude = coordinates.lng.toString();
  }

  // 2. Call the external API (Open-Meteo)
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.elevation && data.elevation.length > 0) {
      return data.elevation[0];
    }

    console.warn(`Elevation warning: No elevation data found`);
    return null;
  } catch (error) {
    console.error("Error fetching elevation:", error);
    return null;
  }
}

async function getLatestCoordinates(): Promise<TrackingData | null> {
  const { data, error } = await supabase
    .from("tracking")
    .select("lat, lng, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching coordinates:", error.message);
    return null;
  }

  return data;
}
