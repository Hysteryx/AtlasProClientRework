import { useCallback, useSyncExternalStore } from "react";
import type {
  SavedMediaItem,
  FavoriteLiveChannel,
  WatchHistoryInput,
  WatchHistoryItem,
} from "@/types/xtream";
import {
  getStoredFavoriteSeries,
  getStoredWatchLater,
  getStoredFavoriteLiveChannels,
  getStoredWatchHistory,
  getServerMediaSnapshot,
  getServerLiveSnapshot,
  getServerHistorySnapshot,
  subscribeToMediaLists,
  toggleStoredFavoriteSeries,
  toggleStoredWatchLater,
  toggleStoredFavoriteLiveChannel,
  saveWatchProgress,
  removeStoredWatchHistoryItem,
  clearStoredWatchHistory,
} from "@/utils/mediaStorage";

export function useMediaLists() {
  const favoriteSeries = useSyncExternalStore(
    subscribeToMediaLists,
    getStoredFavoriteSeries,
    getServerMediaSnapshot
  );

  const watchLater = useSyncExternalStore(
    subscribeToMediaLists,
    getStoredWatchLater,
    getServerMediaSnapshot
  );

  const favoriteLiveChannels = useSyncExternalStore(
    subscribeToMediaLists,
    getStoredFavoriteLiveChannels,
    getServerLiveSnapshot
  );

  const watchHistory = useSyncExternalStore(
    subscribeToMediaLists,
    getStoredWatchHistory,
    getServerHistorySnapshot
  );

  const toggleFavoriteSeries = useCallback((item: SavedMediaItem) => {
    return toggleStoredFavoriteSeries(item);
  }, []);

  const toggleWatchLater = useCallback((item: SavedMediaItem) => {
    return toggleStoredWatchLater(item);
  }, []);

  const toggleFavoriteLive = useCallback(
    (channel: Omit<FavoriteLiveChannel, "addedAt"> & { addedAt?: number }) => {
      return toggleStoredFavoriteLiveChannel(channel);
    },
    []
  );

  const updateWatchProgress = useCallback(
    (
      input: WatchHistoryInput,
      progressSeconds: number,
      durationSeconds: number
    ) => {
      return saveWatchProgress(input, progressSeconds, durationSeconds);
    },
    []
  );

  const removeHistoryItem = useCallback((key: string) => {
    return removeStoredWatchHistoryItem(key);
  }, []);

  const clearHistory = useCallback(() => {
    return clearStoredWatchHistory();
  }, []);

  const isFavoriteSeries = useCallback(
    (seriesId: number): boolean => {
      return favoriteSeries.some(
        (item) => item.id === seriesId && item.type === "series"
      );
    },
    [favoriteSeries]
  );

  const isInWatchLater = useCallback(
    (id: number, type: "vod" | "series"): boolean => {
      return watchLater.some((item) => item.id === id && item.type === type);
    },
    [watchLater]
  );

  const isFavoriteLiveChannel = useCallback(
    (streamId: number): boolean => {
      return favoriteLiveChannels.some((item) => item.streamId === streamId);
    },
    [favoriteLiveChannels]
  );

  const getVodProgress = useCallback(
    (vodId: number): WatchHistoryItem | undefined => {
      return watchHistory.find(
        (item) => item.type === "vod" && item.mediaId === vodId
      );
    },
    [watchHistory]
  );

  const getEpisodeProgress = useCallback(
    (
      seriesId: number,
      episodeId: string | number
    ): WatchHistoryItem | undefined => {
      const targetEpId = String(episodeId);
      return watchHistory.find(
        (item) =>
          item.type === "series" &&
          item.mediaId === seriesId &&
          item.episodeId === targetEpId
      );
    },
    [watchHistory]
  );

  const getLastSeriesProgress = useCallback(
    (seriesId: number): WatchHistoryItem | undefined => {
      return watchHistory.find(
        (item) => item.type === "series" && item.mediaId === seriesId
      );
    },
    [watchHistory]
  );

  return {
    favoriteSeries,
    watchLater,
    favoriteLiveChannels,
    watchHistory,
    toggleFavoriteSeries,
    toggleWatchLater,
    toggleFavoriteLive,
    updateWatchProgress,
    removeHistoryItem,
    clearHistory,
    isFavoriteSeries,
    isInWatchLater,
    isFavoriteLiveChannel,
    getVodProgress,
    getEpisodeProgress,
    getLastSeriesProgress,
  };
}
