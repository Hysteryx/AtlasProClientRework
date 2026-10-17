import { NextRequest, NextResponse } from "next/server";

const XTREAM_BASE_URL = "http://atlaspro.to/player_api.php";
const XTREAM_PASSWORD = "1593574628";
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const username = searchParams.get("username")?.trim();
  const action = searchParams.get("action")?.trim();
  const vodId = searchParams.get("vod_id")?.trim();
  const seriesId = searchParams.get("series_id")?.trim();

  if (!username) {
    return NextResponse.json(
      { error: "Missing required query parameter: username" },
      { status: 400 }
    );
  }

  const upstreamUrl = new URL(XTREAM_BASE_URL);
  upstreamUrl.searchParams.set("username", username);
  upstreamUrl.searchParams.set("password", XTREAM_PASSWORD);

  if (action) {
    upstreamUrl.searchParams.set("action", action);
  }
  if (vodId) {
    upstreamUrl.searchParams.set("vod_id", vodId);
  }
  if (seriesId) {
    upstreamUrl.searchParams.set("series_id", seriesId);
  }

  try {
    const response = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Upstream Xtream server responded with status ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data: unknown = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reach Xtream API server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

