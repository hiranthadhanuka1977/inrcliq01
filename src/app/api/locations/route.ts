import { NextResponse } from "next/server";
import { callBackend } from "@/lib/backend/client";
import { isLiveBackend } from "@/lib/backend/config";
import { FALLBACK_LOCATIONS, type LocationCountry } from "@/lib/constants/locations";

type LocationsPayload = { countries: LocationCountry[] };

/**
 * Countries and their states for the signup dropdowns.
 *
 * Live mode proxies the InrCliq API, which in turn proxies Decca's ISO 3166
 * reference data. Mock mode — and any live failure — falls back to the bundled
 * list, because a reference-data lookup must never be what stops someone signing
 * up.
 */
export async function GET() {
  if (!isLiveBackend()) {
    return NextResponse.json({ countries: FALLBACK_LOCATIONS, source: "fallback" });
  }

  const result = await callBackend<LocationsPayload>("/decca/locations?subdivisions=top");

  if (!result.ok || !Array.isArray(result.data?.countries) || result.data.countries.length === 0) {
    return NextResponse.json({ countries: FALLBACK_LOCATIONS, source: "fallback" });
  }

  return NextResponse.json(
    { countries: result.data.countries, source: "live" },
    // Reference data changes rarely; let the browser hold it for the session.
    { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
