import type {
  SavedMediaItem,
  FavoriteLiveChannel,
  WatchHistoryInput,
  WatchHistoryItem,
} from "@/types/xtream";

export const FAVORITE_SERIES_KEY = "atlas_favorite_series";
export const WATCH_LATER_KEY = "atlas_watch_later";
export const FAVORITE_LIVE_KEY = "atlas_favorite_live";
export const WATCH_HISTORY_KEY = "atlas_watch_history";
export const MEDIA_LISTS_UPDATED_EVENT = "atlas-media-lists-updated";

const MAX_HISTORY_ITEMS = 100;

const EMPTY_SAVED_LIST: SavedMediaItem[] = [];
const EMPTY_LIVE_LIST: FavoriteLiveChannel[] = [];
const EMPTY_HISTORY_LIST: WatchHistoryItem[] = [];

let cachedFavoritesRaw: string | null = null;
let cachedFavoritesList: SavedMediaItem[] = EMPTY_SAVED_LIST;

let cachedWatchLaterRaw: string | null = null;
let cachedWatchLaterList: SavedMediaItem[] = EMPTY_SAVED_LIST;

let cachedFavoriteLiveRaw: string | null = null;
let cachedFavoriteLiveList: FavoriteLiveChannel[] = EMPTY_LIVE_LIST;

let cachedHistoryRaw: string | null = null;
let cachedHistoryList: WatchHistoryItem[] = EMPTY_HISTORY_LIST;

function isValidSavedItem(item: unknown): item is SavedMediaItem {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.id === "number" &&
    (candidate.type === "vod" || candidate.type === "series") &&
    typeof candidate.title === "string" &&
    typeof candidate.poster === "string" &&
    typeof candidate.addedAt === "number"
  );
}

function isValidLiveChannel(item: unknown): item is FavoriteLiveChannel {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.streamId === "number" &&
    typeof candidate.name === "string" &&
    typeof candidate.icon === "string" &&
    typeof candidate.categoryId === "string" &&
    typeof candidate.addedAt === "number"
  );
}

function isValidHistoryItem(item: unknown): item is WatchHistoryItem {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.key === "string" &&
    typeof candidate.mediaId === "number" &&
    (candidate.type === "vod" || candidate.type === "series") &&
    typeof candidate.title === "string" &&
    typeof candidate.poster === "string" &&
    typeof candidate.containerExtension === "string" &&
    typeof candidate.progressSeconds === "number" &&
    typeof candidate.durationSeconds === "number" &&
    typeof candidate.updatedAt === "number"
  );
}

function parseSavedItems(raw: string | null): SavedMediaItem[] {
  if (!raw) return EMPTY_SAVED_LIST;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_SAVED_LIST;
    return parsed.filter(isValidSavedItem);
  } catch {
    return EMPTY_SAVED_LIST;
  }
}

function parseLiveChannels(raw: string | null): FavoriteLiveChannel[] {
  if (!raw) return EMPTY_LIVE_LIST;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_LIVE_LIST;
    return parsed.filter(isValidLiveChannel);
  } catch {
    return EMPTY_LIVE_LIST;
  }
}

function parseHistoryItems(raw: string | null): WatchHistoryItem[] {
  if (!raw) return EMPTY_HISTORY_LIST;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_HISTORY_LIST;
    return parsed.filter(isValidHistoryItem);
  } catch {
    return EMPTY_HISTORY_LIST;
  }
}

function emitMediaListsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MEDIA_LISTS_UPDATED_EVENT));
  }
}

export function getStoredFavoriteSeries(): SavedMediaItem[] {
  if (typeof window === "undefined") return EMPTY_SAVED_LIST;
  try {
    const raw = window.localStorage.getItem(FAVORITE_SERIES_KEY);
    if (raw === cachedFavoritesRaw) {
      return cachedFavoritesList;
    }
    cachedFavoritesRaw = raw;
    cachedFavoritesList = parseSavedItems(raw).filter(
      (item) => item.type === "series"
    );
    return cachedFavoritesList;
  } catch {
    return EMPTY_SAVED_LIST;
  }
}

export function toggleStoredFavoriteSeries(
  item: SavedMediaItem
): SavedMediaItem[] {
  if (typeof window === "undefined") return EMPTY_SAVED_LIST;

  const current = getStoredFavoriteSeries();
  if (item.type !== "series") {
    return current;
  }

  const exists = current.some(
    (existing) => existing.id === item.id && existing.type === "series"
  );

  const updated: SavedMediaItem[] = exists
    ? current.filter(
        (existing) => !(existing.id === item.id && existing.type === "series")
      )
    : [{ ...item, type: "series", addedAt: Date.now() }, ...current];

  try {
    const serialized = JSON.stringify(updated);
    window.localStorage.setItem(FAVORITE_SERIES_KEY, serialized);
    cachedFavoritesRaw = serialized;
    cachedFavoritesList = updated;
    emitMediaListsUpdated();
  } catch (err) {
    console.error("Failed to save favorite series:", err);
  }

  return updated;
}

export function getStoredWatchLater(): SavedMediaItem[] {
  if (typeof window === "undefined") return EMPTY_SAVED_LIST;
  try {
    const raw = window.localStorage.getItem(WATCH_LATER_KEY);
    if (raw === cachedWatchLaterRaw) {
      return cachedWatchLaterList;
    }
    cachedWatchLaterRaw = raw;
    cachedWatchLaterList = parseSavedItems(raw);
    return cachedWatchLaterList;
  } catch {
    return EMPTY_SAVED_LIST;
  }
}

export function toggleStoredWatchLater(item: SavedMediaItem): SavedMediaItem[] {
  if (typeof window === "undefined") return EMPTY_SAVED_LIST;

  const current = getStoredWatchLater();
  if (item.type !== "vod" && item.type !== "series") {
    return current;
  }

  const exists = current.some(
    (existing) => existing.id === item.id && existing.type === item.type
  );

  const updated: SavedMediaItem[] = exists
    ? current.filter(
        (existing) => !(existing.id === item.id && existing.type === item.type)
      )
    : [{ ...item, addedAt: Date.now() }, ...current];

  try {
    const serialized = JSON.stringify(updated);
    window.localStorage.setItem(WATCH_LATER_KEY, serialized);
    cachedWatchLaterRaw = serialized;
    cachedWatchLaterList = updated;
    emitMediaListsUpdated();
  } catch (err) {
    console.error("Failed to save watch later item:", err);
  }

  return updated;
}

export function getStoredFavoriteLiveChannels(): FavoriteLiveChannel[] {
  if (typeof window === "undefined") return EMPTY_LIVE_LIST;
  try {
    const raw = window.localStorage.getItem(FAVORITE_LIVE_KEY);
    if (raw === cachedFavoriteLiveRaw) {
      return cachedFavoriteLiveList;
    }
    cachedFavoriteLiveRaw = raw;
    cachedFavoriteLiveList = parseLiveChannels(raw);
    return cachedFavoriteLiveList;
  } catch {
    return EMPTY_LIVE_LIST;
  }
}

export function toggleStoredFavoriteLiveChannel(
  channel: Omit<FavoriteLiveChannel, "addedAt"> & { addedAt?: number }
): FavoriteLiveChannel[] {
  if (typeof window === "undefined") return EMPTY_LIVE_LIST;

  const current = getStoredFavoriteLiveChannels();
  const exists = current.some(
    (existing) => existing.streamId === channel.streamId
  );

  const updated: FavoriteLiveChannel[] = exists
    ? current.filter((existing) => existing.streamId !== channel.streamId)
    : [
        {
          streamId: channel.streamId,
          name: channel.name,
          icon: channel.icon,
          categoryId: channel.categoryId,
          addedAt: Date.now(),
        },
        ...current,
      ];

  try {
    const serialized = JSON.stringify(updated);
    window.localStorage.setItem(FAVORITE_LIVE_KEY, serialized);
    cachedFavoriteLiveRaw = serialized;
    cachedFavoriteLiveList = updated;
    emitMediaListsUpdated();
  } catch (err) {
    console.error("Failed to save favorite live channel:", err);
  }

  return updated;
}

export function getStoredWatchHistory(): WatchHistoryItem[] {
  if (typeof window === "undefined") return EMPTY_HISTORY_LIST;
  try {
    const raw = window.localStorage.getItem(WATCH_HISTORY_KEY);
    if (raw === cachedHistoryRaw) {
      return cachedHistoryList;
    }
    cachedHistoryRaw = raw;
    cachedHistoryList = parseHistoryItems(raw);
    return cachedHistoryList;
  } catch {
    return EMPTY_HISTORY_LIST;
  }
}

export function saveWatchProgress(
  input: WatchHistoryInput,
  progressSeconds: number,
  durationSeconds: number
): WatchHistoryItem[] {
  if (typeof window === "undefined") return EMPTY_HISTORY_LIST;

  const current = getStoredWatchHistory();
  const existing = current.find((item) => item.key === input.key);

  const safeProgress =
    progressSeconds > 0
      ? Math.floor(progressSeconds)
      : existing?.progressSeconds ?? 0;

  const safeDuration =
    durationSeconds > 0
      ? Math.floor(durationSeconds)
      : existing?.durationSeconds ?? 0;

  const newEntry: WatchHistoryItem = {
    ...input,
    progressSeconds: safeProgress,
    durationSeconds: safeDuration,
    updatedAt: Date.now(),
  };

  const filtered = current.filter((item) => item.key !== input.key);
  const updated: WatchHistoryItem[] = [newEntry, ...filtered].slice(
    0,
    MAX_HISTORY_ITEMS
  );

  try {
    const serialized = JSON.stringify(updated);
    window.localStorage.setItem(WATCH_HISTORY_KEY, serialized);
    cachedHistoryRaw = serialized;
    cachedHistoryList = updated;
    emitMediaListsUpdated();
  } catch (err) {
    console.error("Failed to save watch progress:", err);
  }

  return updated;
}

export function removeStoredWatchHistoryItem(key: string): WatchHistoryItem[] {
  if (typeof window === "undefined") return EMPTY_HISTORY_LIST;

  const current = getStoredWatchHistory();
  const updated = current.filter((item) => item.key !== key);

  try {
    const serialized = JSON.stringify(updated);
    window.localStorage.setItem(WATCH_HISTORY_KEY, serialized);
    cachedHistoryRaw = serialized;
    cachedHistoryList = updated;
    emitMediaListsUpdated();
  } catch (err) {
    console.error("Failed to remove watch history item:", err);
  }

  return updated;
}

export function clearStoredWatchHistory(): WatchHistoryItem[] {
  if (typeof window === "undefined") return EMPTY_HISTORY_LIST;
  try {
    window.localStorage.removeItem(WATCH_HISTORY_KEY);
    cachedHistoryRaw = null;
    cachedHistoryList = EMPTY_HISTORY_LIST;
    emitMediaListsUpdated();
  } catch (err) {
    console.error("Failed to clear watch history:", err);
  }
  return EMPTY_HISTORY_LIST;
}

export function formatDurationTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function parseDurationToSeconds(
  durationSecsRaw?: number | string,
  durationText?: string | number
): number {
  if (durationSecsRaw !== undefined && durationSecsRaw !== null) {
    const numericSecs = Number(durationSecsRaw);
    if (Number.isFinite(numericSecs) && numericSecs > 0) {
      return Math.floor(numericSecs);
    }
  }

  if (durationText === undefined || durationText === null) return 0;
  const raw = String(durationText).trim();
  if (!raw) return 0;

  // Format HH:MM:SS or MM:SS
  if (raw.includes(":")) {
    const parts = raw.split(":").map((part) => Number(part.trim()));
    if (parts.every((n) => Number.isFinite(n) && n >= 0)) {
      if (parts.length === 3) {
        return Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]);
      }
      if (parts.length === 2) {
        return Math.floor(parts[0] * 60 + parts[1]);
      }
    }
  }

  // Format "105 min" or plain minutes
  const minMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minutes)?$/i);
  if (minMatch) {
    const val = Number(minMatch[1]);
    if (Number.isFinite(val) && val > 0) {
      // If <= 300, treat as minutes (e.g. episode_run_time = "48" or "105 min")
      return val <= 360 ? Math.floor(val * 60) : Math.floor(val);
    }
  }

  return 0;
}


export function getServerMediaSnapshot(): SavedMediaItem[] {
  return EMPTY_SAVED_LIST;
}

export function getServerLiveSnapshot(): FavoriteLiveChannel[] {
  return EMPTY_LIVE_LIST;
}

export function getServerHistorySnapshot(): WatchHistoryItem[] {
  return EMPTY_HISTORY_LIST;
}

export function subscribeToMediaLists(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(MEDIA_LISTS_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MEDIA_LISTS_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
