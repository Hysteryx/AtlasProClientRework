import type {
  XtreamAction,
  XtreamCategory,
  XtreamLiveStream,
  XtreamVodStream,
  XtreamVodInfo,
  XtreamSeries,
  XtreamSeriesInfo,
  StreamProbeMetadata,
} from "@/types/xtream";


interface XtreamQueryParams {
  username: string;
  action: XtreamAction;
  vod_id?: string | number;
  series_id?: string | number;
}

interface ApiErrorPayload {
  error?: string;
}

async function fetchXtream<T>(params: XtreamQueryParams): Promise<T> {
  const searchParams = new URLSearchParams({
    username: params.username,
    action: params.action,
  });

  if (params.vod_id !== undefined) {
    searchParams.set("vod_id", String(params.vod_id));
  }
  if (params.series_id !== undefined) {
    searchParams.set("series_id", String(params.series_id));
  }

  const response = await fetch(`/api/xtream?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = `Erreur API (${response.status})`;
    try {
      const errBody = (await response.json()) as ApiErrorPayload;
      if (errBody && typeof errBody.error === "string") {
        errorMessage = errBody.error;
      }
    } catch {
      // Ignore JSON parsing failure on error body
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as T;
  return data;
}

function ensureArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function getLiveCategories(
  username: string
): Promise<XtreamCategory[]> {
  const data = await fetchXtream<unknown>({
    username,
    action: "get_live_categories",
  });
  return ensureArray<XtreamCategory>(data);
}

export async function getLiveStreams(
  username: string
): Promise<XtreamLiveStream[]> {
  const data = await fetchXtream<unknown>({
    username,
    action: "get_live_streams",
  });
  return ensureArray<XtreamLiveStream>(data);
}

export async function getVodCategories(
  username: string
): Promise<XtreamCategory[]> {
  const data = await fetchXtream<unknown>({
    username,
    action: "get_vod_categories",
  });
  return ensureArray<XtreamCategory>(data);
}

export async function getVodStreams(
  username: string
): Promise<XtreamVodStream[]> {
  const data = await fetchXtream<unknown>({
    username,
    action: "get_vod_streams",
  });
  return ensureArray<XtreamVodStream>(data);
}

export async function getVodInfo(
  username: string,
  vodId: number | string
): Promise<XtreamVodInfo> {
  return fetchXtream<XtreamVodInfo>({
    username,
    action: "get_vod_info",
    vod_id: vodId,
  });
}

export async function getSeriesCategories(
  username: string
): Promise<XtreamCategory[]> {
  const data = await fetchXtream<unknown>({
    username,
    action: "get_series_categories",
  });
  return ensureArray<XtreamCategory>(data);
}

export async function getSeries(username: string): Promise<XtreamSeries[]> {
  const data = await fetchXtream<unknown>({
    username,
    action: "get_series",
  });
  return ensureArray<XtreamSeries>(data);
}

export async function getSeriesInfo(
  username: string,
  seriesId: number | string
): Promise<XtreamSeriesInfo> {
  return fetchXtream<XtreamSeriesInfo>({
    username,
    action: "get_series_info",
    series_id: seriesId,
  });
}

const XTREAM_STREAM_BASE_URL = "http://atlaspro.to";
const XTREAM_STREAM_PASSWORD = "1593574628";

function sanitizeExtension(ext: string | undefined, fallback: string): string {
  const cleaned = (ext ?? "").trim().replace(/^\.+/, "");
  return cleaned || fallback;
}

export function buildLiveStreamUrl(
  username: string,
  streamId: number | string,
  extension: "m3u8" | "ts" = "m3u8"
): string {
  return `${XTREAM_STREAM_BASE_URL}/live/${encodeURIComponent(
    username.trim()
  )}/${XTREAM_STREAM_PASSWORD}/${encodeURIComponent(String(streamId))}.${extension}`;
}

export function buildVodStreamUrl(
  username: string,
  streamId: number | string,
  containerExtension?: string
): string {
  const ext = sanitizeExtension(containerExtension, "mp4");
  return `${XTREAM_STREAM_BASE_URL}/movie/${encodeURIComponent(
    username.trim()
  )}/${XTREAM_STREAM_PASSWORD}/${encodeURIComponent(String(streamId))}.${ext}`;
}

export function buildSeriesEpisodeStreamUrl(
  username: string,
  episodeId: number | string,
  containerExtension?: string
): string {
  const ext = sanitizeExtension(containerExtension, "mkv");
  return `${XTREAM_STREAM_BASE_URL}/series/${encodeURIComponent(
    username.trim()
  )}/${XTREAM_STREAM_PASSWORD}/${encodeURIComponent(String(episodeId))}.${ext}`;
}

export type StreamTranscodeMode = "none" | "audio" | "full";

export interface ProxyStreamOptions {
  transcode?: StreamTranscodeMode;
  startSeconds?: number;
  audioTrack?: number;
}

export function buildProxyStreamUrl(
  directUrl: string,
  options?: ProxyStreamOptions
): string {
  const params = new URLSearchParams({
    url: directUrl,
  });
  if (options?.transcode && options.transcode !== "none") {
    params.set("transcode", options.transcode);
  }
  if (options?.startSeconds && options.startSeconds > 0) {
    params.set("start", String(Math.floor(options.startSeconds)));
  }
  if (options?.audioTrack !== undefined && options.audioTrack > 0) {
    params.set("audioTrack", String(options.audioTrack));
  }
  return `/api/stream?${params.toString()}`;
}

export async function fetchStreamMetadata(
  directUrl: string,
  signal?: AbortSignal
): Promise<StreamProbeMetadata> {
  const params = new URLSearchParams({
    url: directUrl,
    meta: "1",
  });
  const response = await fetch(`/api/stream?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    return {
      durationSeconds: 0,
      audioTracks: [],
    };
  }

  const data = (await response.json()) as Partial<StreamProbeMetadata>;
  return {
    durationSeconds:
      typeof data.durationSeconds === "number" &&
      Number.isFinite(data.durationSeconds)
        ? Math.floor(data.durationSeconds)
        : 0,
    videoCodec: typeof data.videoCodec === "string" ? data.videoCodec : undefined,
    audioTracks: Array.isArray(data.audioTracks) ? data.audioTracks : [],
  };
}




