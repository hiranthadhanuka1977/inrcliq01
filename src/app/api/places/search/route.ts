import { NextResponse } from "next/server";

export type PlaceSuggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  provider: "google" | "osm";
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type GooglePrediction = {
  place_id: string;
  description: string;
};

type GoogleDetailsResult = {
  result?: {
    geometry?: {
      location?: { lat: number; lng: number };
    };
    formatted_address?: string;
    name?: string;
  };
  status: string;
};

function getGoogleKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

async function searchGoogle(query: string): Promise<PlaceSuggestion[]> {
  const key = getGoogleKey();
  if (!key) return [];

  const autocompleteUrl = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  autocompleteUrl.searchParams.set("input", query);
  autocompleteUrl.searchParams.set("key", key);

  const autocompleteRes = await fetch(autocompleteUrl.toString(), {
    next: { revalidate: 0 },
  });
  if (!autocompleteRes.ok) return [];

  const autocompleteJson = (await autocompleteRes.json()) as {
    predictions?: GooglePrediction[];
    status: string;
  };
  if (!autocompleteJson.predictions?.length) return [];

  const top = autocompleteJson.predictions.slice(0, 6);
  const detailed = await Promise.all(
    top.map(async (prediction): Promise<PlaceSuggestion | null> => {
      const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      detailsUrl.searchParams.set("place_id", prediction.place_id);
      detailsUrl.searchParams.set("fields", "geometry,formatted_address,name");
      detailsUrl.searchParams.set("key", key);
      const detailsRes = await fetch(detailsUrl.toString(), { next: { revalidate: 0 } });
      if (!detailsRes.ok) return null;
      const detailsJson = (await detailsRes.json()) as GoogleDetailsResult;
      const location = detailsJson.result?.geometry?.location;
      if (!location) return null;
      const label =
        detailsJson.result?.formatted_address ||
        detailsJson.result?.name ||
        prediction.description;
      return {
        id: prediction.place_id,
        label,
        lat: location.lat,
        lng: location.lng,
        provider: "google",
      };
    }),
  );

  return detailed.filter((item): item is PlaceSuggestion => item !== null);
}

async function searchOsm(query: string): Promise<PlaceSuggestion[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("limit", "6");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "INRCLIQ-SpecialRequests/1.0 (location search)",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as NominatimResult[];
  return json.map((item) => ({
    id: `osm-${item.place_id}`,
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
    provider: "osm" as const,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  if (query.length < 2) {
    return NextResponse.json({ results: [] as PlaceSuggestion[], provider: "none" });
  }

  try {
    if (getGoogleKey()) {
      const results = await searchGoogle(query);
      if (results.length) {
        return NextResponse.json({ results, provider: "google" });
      }
    }

    const results = await searchOsm(query);
    return NextResponse.json({ results, provider: "osm" });
  } catch {
    return NextResponse.json(
      { results: [] as PlaceSuggestion[], provider: "error", error: "Place search failed" },
      { status: 500 },
    );
  }
}
