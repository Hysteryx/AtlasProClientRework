"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type {
  CatalogType,
  SavedMediaItem,
  PlayableMedia,
  XtreamEpisode,
  WatchHistoryItem,
  WatchHistoryInput,
} from "@/types/xtream";
import {
  buildLiveStreamUrl,
  buildVodStreamUrl,
  buildSeriesEpisodeStreamUrl,
} from "@/utils/xtreamApi";
import { useXtreamCatalog } from "@/hooks/useXtreamCatalog";
import { useXtreamDetails } from "@/hooks/useXtreamDetails";
import { useMediaLists } from "@/hooks/useMediaLists";
import CatalogBrowser, {
  type SelectedMediaSummary,
} from "@/components/CatalogBrowser";
import MediaCard from "@/components/MediaCard";
import MediaDetailsModal from "@/components/MediaDetailsModal";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import Footer from "@/components/Footer";

interface HubViewProps {
  identifier: string;
}

type HubTab =
  | CatalogType
  | "favorites"
  | "watch_later"
  | "history"
  | null;

export default function HubView({ identifier }: HubViewProps) {
  const [activeTab, setActiveTab] = useState<HubTab>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [selectedMedia, setSelectedMedia] =
    useState<SelectedMediaSummary | null>(null);
  const [playingMedia, setPlayingMedia] = useState<PlayableMedia | null>(null);

  const activeCatalog: CatalogType | null =
    activeTab === "live" || activeTab === "vod" || activeTab === "series"
      ? activeTab
      : null;

  const {
    categories,
    liveStreams,
    vodStreams,
    seriesList,
    isLoading,
    error,
    reload,
  } = useXtreamCatalog(identifier, activeCatalog);

  const {
    vodInfo,
    seriesInfo,
    isLoadingDetails,
    detailsError,
    fetchVodDetails,
    fetchSeriesDetails,
    clearDetails,
  } = useXtreamDetails(identifier);

  const {
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
  } = useMediaLists();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenMediaDetails = (item: SelectedMediaSummary) => {
    setSelectedMedia(item);
    if (item.type === "vod") {
      void fetchVodDetails(item.id);
    } else if (item.type === "series") {
      void fetchSeriesDetails(item.id);
    }
  };

  const handleCloseMediaDetails = () => {
    setSelectedMedia(null);
    clearDetails();
  };

  const handlePlayLive = (streamId: number, title: string, poster: string) => {
    const directUrl = buildLiveStreamUrl(identifier, streamId, "m3u8");
    const fallbackDirectUrl = buildLiveStreamUrl(identifier, streamId, "ts");
    setPlayingMedia({
      title,
      subtitle: "Diffusion en direct",
      type: "live",
      directUrl,
      fallbackDirectUrl,
      containerExtension: "m3u8",
      poster,
    });
  };

  const handlePlayVod = (
    streamId: number,
    containerExtension: string,
    title: string,
    poster: string,
    rating?: string,
    initialTimeSeconds?: number,
    durationSeconds?: number
  ) => {
    const ext = containerExtension || "mp4";
    const directUrl = buildVodStreamUrl(identifier, streamId, ext);
    const existingProgress = getVodProgress(streamId);
    const startAt =
      initialTimeSeconds !== undefined
        ? initialTimeSeconds
        : existingProgress?.progressSeconds ?? 0;
    const knownDuration =
      durationSeconds && durationSeconds > 0
        ? durationSeconds
        : existingProgress?.durationSeconds ?? 0;

    const historyMetadata: WatchHistoryInput = {
      key: `vod:${streamId}`,
      mediaId: streamId,
      type: "vod",
      title,
      poster,
      rating,
      containerExtension: ext,
    };

    // Record immediately in watch history so it appears in Historique
    updateWatchProgress(historyMetadata, startAt, knownDuration);

    setPlayingMedia({
      title,
      subtitle: "Film / VOD",
      type: "vod",
      directUrl,
      containerExtension: ext,
      poster,
      initialTimeSeconds: startAt,
      durationSeconds: knownDuration,
      historyMetadata,
    });
  };

  const handlePlayEpisode = (
    episode: XtreamEpisode,
    seriesId: number,
    seriesTitle: string,
    seasonNumber: string,
    poster: string,
    rating?: string,
    initialTimeSeconds?: number,
    durationSeconds?: number
  ) => {
    const ext = episode.container_extension || "mkv";
    const directUrl = buildSeriesEpisodeStreamUrl(identifier, episode.id, ext);
    const epTitle = episode.title || `Épisode ${episode.episode_num}`;
    const existingProgress = getEpisodeProgress(seriesId, episode.id);
    const startAt =
      initialTimeSeconds !== undefined
        ? initialTimeSeconds
        : existingProgress?.progressSeconds ?? 0;
    const knownDuration =
      durationSeconds && durationSeconds > 0
        ? durationSeconds
        : existingProgress?.durationSeconds ?? 0;

    const historyMetadata: WatchHistoryInput = {
      key: `series:${seriesId}:ep:${episode.id}`,
      mediaId: seriesId,
      episodeId: String(episode.id),
      seasonNumber,
      episodeNumber: episode.episode_num,
      episodeTitle: epTitle,
      type: "series",
      title: seriesTitle,
      poster,
      rating,
      containerExtension: ext,
    };

    updateWatchProgress(historyMetadata, startAt, knownDuration);

    setPlayingMedia({
      title: seriesTitle,
      subtitle: `Saison ${seasonNumber} • Ép. ${episode.episode_num} — ${epTitle}`,
      type: "series",
      directUrl,
      containerExtension: ext,
      poster: episode.info?.movie_image || poster,
      initialTimeSeconds: startAt,
      durationSeconds: knownDuration,
      historyMetadata,
    });
  };

  const handleResumeHistoryItem = (item: WatchHistoryItem) => {
    if (item.type === "vod") {
      handlePlayVod(
        item.mediaId,
        item.containerExtension,
        item.title,
        item.poster,
        item.rating,
        item.progressSeconds,
        item.durationSeconds
      );
      return;
    }

    if (item.type === "series" && item.episodeId) {
      const syntheticEpisode: XtreamEpisode = {
        id: item.episodeId,
        episode_num: item.episodeNumber ?? 1,
        title: item.episodeTitle || `Épisode ${item.episodeNumber ?? 1}`,
        container_extension: item.containerExtension || "mkv",
      };
      handlePlayEpisode(
        syntheticEpisode,
        item.mediaId,
        item.title,
        item.seasonNumber || "1",
        item.poster,
        item.rating,
        item.progressSeconds,
        item.durationSeconds
      );
    }
  };

  const maskedId =
    identifier.length > 4
      ? "•••• " + identifier.slice(-4)
      : "•••• " + identifier;

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab(null)}
            className="flex items-center gap-3 text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 font-black text-white text-lg tracking-wider group-hover:scale-105 transition-transform">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-xl text-white">
                  ATLAS
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wider uppercase">
                  Hub
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Personal Media Client
              </p>
            </div>
          </button>
        </div>

        {/* Quick Section Tabs */}
        <nav className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab(null)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === null
                ? "bg-zinc-800 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            Accueil
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("live")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "live"
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "text-zinc-400 hover:text-rose-400 hover:bg-zinc-900"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Live TV
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vod")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "vod"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900"
            }`}
          >
            Films / VOD
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("series")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "series"
                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                : "text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900"
            }`}
          >
            Séries
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("favorites")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "favorites"
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "text-zinc-400 hover:text-rose-400 hover:bg-zinc-900"
            }`}
          >
            <svg
              className="w-3.5 h-3.5 text-rose-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>Séries Favorites</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">
              {favoriteSeries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("watch_later")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "watch_later"
                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                : "text-zinc-400 hover:text-blue-400 hover:bg-zinc-900"
            }`}
          >
            <svg
              className="w-3.5 h-3.5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>À regarder plus tard</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">
              {watchLater.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "history"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900"
            }`}
          >
            <svg
              className="w-3.5 h-3.5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Historique</span>
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">
              {watchHistory.length}
            </span>
          </button>
        </nav>

        {/* Status / Clock */}
        <div className="flex items-center gap-4">
          {currentTime && (
            <span className="font-mono text-sm text-zinc-400 font-medium hidden xl:inline-block">
              {currentTime}
            </span>
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 animate-pulse" />
            <span className="font-mono tracking-wider text-zinc-400">
              {maskedId}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-6 py-8 flex-1 space-y-10">
        {/* 4 Interactive Modern Hub Tiles */}
        {activeTab === null && (
          <>
            <div className="text-center sm:text-left space-y-2">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Choose your experience
              </h1>
              <p className="text-zinc-400 text-sm sm:text-base max-w-2xl">
                Sélectionnez un catalogue (Live TV, Films, Séries), reprenez
                votre lecture ou gérez vos listes personnelles.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* 1. LIVE BUTTON */}
              <button
                type="button"
                onClick={() => setActiveTab("live")}
                className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800/80 hover:border-rose-500/50 hover:shadow-2xl hover:shadow-rose-500/10 hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 text-left cursor-pointer overflow-hidden min-h-[220px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-500 -mr-10 -mt-10" />

                <div className="flex items-center justify-between w-full z-10">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-7 h-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    Live
                  </span>
                </div>

                <div className="mt-8 z-10">
                  <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-rose-400 transition-colors">
                    Live
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Stream live channels, real-time broadcasts & events.
                  </p>
                </div>
              </button>

              {/* 2. MOVIE BUTTON */}
              <button
                type="button"
                onClick={() => setActiveTab("vod")}
                className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800/80 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 text-left cursor-pointer overflow-hidden min-h-[220px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-500 -mr-10 -mt-10" />

                <div className="flex items-center justify-between w-full z-10">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black transition-all duration-300 shadow-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-7 h-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                      />
                    </svg>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                    VOD
                  </span>
                </div>

                <div className="mt-8 z-10">
                  <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                    Movie
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Discover blockbuster cinema, indie films & on-demand
                    releases.
                  </p>
                </div>
              </button>

              {/* 3. SERIES BUTTON */}
              <button
                type="button"
                onClick={() => setActiveTab("series")}
                className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800/80 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 text-left cursor-pointer overflow-hidden min-h-[220px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500 -mr-10 -mt-10" />

                <div className="flex items-center justify-between w-full z-10">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-7 h-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Shows
                  </span>
                </div>

                <div className="mt-8 z-10">
                  <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">
                    Series
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Explore complete seasons, episodes & trending serials.
                  </p>
                </div>
              </button>

              {/* 4. SETTINGS BUTTON */}
              <Link
                href="/settings"
                className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800/80 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 text-left overflow-hidden min-h-[220px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500 -mr-10 -mt-10" />

                <div className="flex items-center justify-between w-full z-10">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-300 shadow-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-7 h-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    Config
                    <svg
                      className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </div>

                <div className="mt-8 z-10">
                  <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                    Settings
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Manage your device, session and clear your identifier.
                  </p>
                </div>
              </Link>
            </div>

            {/* Quick Access Cards for Personal Lists (Favorites, Watch Later, History) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("favorites")}
                className="group p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-rose-500/40 transition-all flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-rose-400 transition-colors">
                      Séries Favorites
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Vos séries coup de cœur sauvegardées.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-200 text-xs font-bold">
                  {favoriteSeries.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("watch_later")}
                className="group p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-blue-500/40 transition-all flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                      À regarder plus tard
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Films et séries mis de côté.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-200 text-xs font-bold">
                  {watchLater.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className="group p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 hover:border-emerald-500/40 transition-all flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-colors shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                      Historique & Reprise
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Reprenez vos films et épisodes là où vous étiez.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-200 text-xs font-bold">
                  {watchHistory.length}
                </span>
              </button>
            </div>

            {/* Continue Watching Shelf on Home if History is not empty */}
            {watchHistory.length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Reprendre la lecture
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    Voir tout l&apos;historique ({watchHistory.length}) →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {watchHistory.slice(0, 5).map((item) => (
                    <MediaCard
                      key={`home-hist-${item.key}`}
                      id={item.mediaId}
                      type={item.type}
                      title={item.title}
                      subtitle={
                        item.type === "series" && item.seasonNumber
                          ? `S${item.seasonNumber} • Ép. ${item.episodeNumber} — ${
                              item.episodeTitle || ""
                            }`
                          : undefined
                      }
                      poster={item.poster}
                      rating={item.rating}
                      isFavorite={
                        item.type === "series"
                          ? isFavoriteSeries(item.mediaId)
                          : false
                      }
                      isWatchLater={isInWatchLater(item.mediaId, item.type)}
                      progressSeconds={item.progressSeconds}
                      durationSeconds={item.durationSeconds}
                      onRemoveHistory={() => removeHistoryItem(item.key)}
                      onSelect={() =>
                        handleOpenMediaDetails({
                          id: item.mediaId,
                          type: item.type,
                          title: item.title,
                          poster: item.poster,
                          rating: item.rating,
                          containerExtension: item.containerExtension,
                        })
                      }
                      onPlay={() => handleResumeHistoryItem(item)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Active Catalog Browser (Live, VOD, Series) */}
        {activeCatalog && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Retour à l'accueil"
                >
                  ←
                </button>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">
                    {activeCatalog === "live"
                      ? "Catalogue Live TV"
                      : activeCatalog === "vod"
                      ? "Catalogue Films / VOD"
                      : "Catalogue Séries"}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {activeCatalog === "live"
                      ? "Cliquez sur l'étoile ★ d'une chaîne pour l'épingler dans vos Favoris Live."
                      : "Parcourez les catégories, recherchez un titre ou lancez la lecture directement."}
                  </p>
                </div>
              </div>
            </div>

            <CatalogBrowser
              key={activeCatalog}
              catalogType={activeCatalog}
              categories={categories}
              liveStreams={liveStreams}
              vodStreams={vodStreams}
              seriesList={seriesList}
              isLoading={isLoading}
              error={error}
              onReload={reload}
              isFavoriteSeries={isFavoriteSeries}
              isInWatchLater={isInWatchLater}
              isFavoriteLiveChannel={isFavoriteLiveChannel}
              favoriteLiveCount={favoriteLiveChannels.length}
              getVodProgress={getVodProgress}
              getLastSeriesProgress={getLastSeriesProgress}
              onToggleFavoriteSeries={toggleFavoriteSeries}
              onToggleWatchLater={toggleWatchLater}
              onToggleFavoriteLive={toggleFavoriteLive}
              onSelectMedia={handleOpenMediaDetails}
              onPlayLive={handlePlayLive}
              onPlayVod={handlePlayVod}
            />
          </section>
        )}

        {/* Section: Mes Séries Favorites */}
        {activeTab === "favorites" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Retour à l'accueil"
                >
                  ←
                </button>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">
                    Mes Séries Favorites
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Séries enregistrées localement dans vos favoris (
                    {favoriteSeries.length}).
                  </p>
                </div>
              </div>
            </div>

            {favoriteSeries.length === 0 ? (
              <div className="w-full py-16 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 text-center space-y-3">
                <p className="text-sm font-semibold text-zinc-300">
                  Aucune série favorite pour le moment
                </p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Explorez le catalogue des séries et cliquez sur l&apos;icône
                  cœur pour retrouver vos séries préférées ici.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("series")}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Explorer les Séries
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {favoriteSeries.map((item: SavedMediaItem) => {
                  const seriesProg = getLastSeriesProgress(item.id);
                  return (
                    <MediaCard
                      key={`fav-${item.type}-${item.id}`}
                      id={item.id}
                      type="series"
                      title={item.title}
                      subtitle={
                        seriesProg?.seasonNumber
                          ? `S${seriesProg.seasonNumber} • Ép. ${seriesProg.episodeNumber}`
                          : undefined
                      }
                      poster={item.poster}
                      rating={item.rating}
                      isFavorite={isFavoriteSeries(item.id)}
                      isWatchLater={isInWatchLater(item.id, "series")}
                      progressSeconds={seriesProg?.progressSeconds}
                      durationSeconds={seriesProg?.durationSeconds}
                      onToggleFavorite={() => toggleFavoriteSeries(item)}
                      onToggleWatchLater={() => toggleWatchLater(item)}
                      onSelect={() =>
                        handleOpenMediaDetails({
                          id: item.id,
                          type: "series",
                          title: item.title,
                          poster: item.poster,
                          rating: item.rating,
                        })
                      }
                      onPlay={
                        seriesProg
                          ? () => handleResumeHistoryItem(seriesProg)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Section: À regarder plus tard */}
        {activeTab === "watch_later" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Retour à l'accueil"
                >
                  ←
                </button>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">
                    À regarder plus tard
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Films et séries sauvegardés pour plus tard (
                    {watchLater.length}).
                  </p>
                </div>
              </div>
            </div>

            {watchLater.length === 0 ? (
              <div className="w-full py-16 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 text-center space-y-3">
                <p className="text-sm font-semibold text-zinc-300">
                  Votre liste &quot;À regarder plus tard&quot; est vide
                </p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Ajoutez des films ou des séries à l&apos;aide du bouton
                  horloge sur chaque carte ou dans les détails d&apos;un titre.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("vod")}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition cursor-pointer"
                  >
                    Parcourir les Films
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("series")}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Parcourir les Séries
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {watchLater.map((item: SavedMediaItem) => {
                  const prog =
                    item.type === "vod"
                      ? getVodProgress(item.id)
                      : getLastSeriesProgress(item.id);
                  return (
                    <MediaCard
                      key={`wl-${item.type}-${item.id}`}
                      id={item.id}
                      type={item.type}
                      title={item.title}
                      subtitle={
                        item.type === "series" && prog?.seasonNumber
                          ? `S${prog.seasonNumber} • Ép. ${prog.episodeNumber}`
                          : undefined
                      }
                      poster={item.poster}
                      rating={item.rating}
                      isFavorite={
                        item.type === "series"
                          ? isFavoriteSeries(item.id)
                          : false
                      }
                      isWatchLater={isInWatchLater(item.id, item.type)}
                      progressSeconds={prog?.progressSeconds}
                      durationSeconds={prog?.durationSeconds}
                      onToggleFavorite={
                        item.type === "series"
                          ? () => toggleFavoriteSeries(item)
                          : undefined
                      }
                      onToggleWatchLater={() => toggleWatchLater(item)}
                      onSelect={() =>
                        handleOpenMediaDetails({
                          id: item.id,
                          type: item.type,
                          title: item.title,
                          poster: item.poster,
                          rating: item.rating,
                        })
                      }
                      onPlay={
                        item.type === "vod"
                          ? () =>
                              handlePlayVod(
                                item.id,
                                prog?.containerExtension || "mp4",
                                item.title,
                                item.poster,
                                item.rating,
                                prog?.progressSeconds
                              )
                          : prog
                          ? () => handleResumeHistoryItem(prog)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Section: Historique & Reprise */}
        {activeTab === "history" && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Retour à l'accueil"
                >
                  ←
                </button>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">
                    Historique de lecture
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Reprenez vos films et épisodes exactement là où vous vous
                    êtes arrêté ({watchHistory.length}).
                  </p>
                </div>
              </div>

              {watchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition cursor-pointer"
                >
                  Vider l&apos;historique
                </button>
              )}
            </div>

            {watchHistory.length === 0 ? (
              <div className="w-full py-16 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 text-center space-y-3">
                <p className="text-sm font-semibold text-zinc-300">
                  Aucun historique de lecture
                </p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Dès que vous regardez un film ou un épisode de série, votre
                  avancement est enregistré automatiquement ici.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("vod")}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition cursor-pointer"
                  >
                    Explorer les Films
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("series")}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Explorer les Séries
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {watchHistory.map((item) => (
                  <MediaCard
                    key={`hist-${item.key}`}
                    id={item.mediaId}
                    type={item.type}
                    title={item.title}
                    subtitle={
                      item.type === "series" && item.seasonNumber
                        ? `S${item.seasonNumber} • Ép. ${item.episodeNumber} — ${
                            item.episodeTitle || ""
                          }`
                        : undefined
                    }
                    poster={item.poster}
                    rating={item.rating}
                    isFavorite={
                      item.type === "series"
                        ? isFavoriteSeries(item.mediaId)
                        : false
                    }
                    isWatchLater={isInWatchLater(item.mediaId, item.type)}
                    progressSeconds={item.progressSeconds}
                    durationSeconds={item.durationSeconds}
                    onRemoveHistory={() => removeHistoryItem(item.key)}
                    onSelect={() =>
                      handleOpenMediaDetails({
                        id: item.mediaId,
                        type: item.type,
                        title: item.title,
                        poster: item.poster,
                        rating: item.rating,
                        containerExtension: item.containerExtension,
                      })
                    }
                    onPlay={() => handleResumeHistoryItem(item)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Media Details Modal */}
      <MediaDetailsModal
        isOpen={Boolean(selectedMedia)}
        mediaType={selectedMedia?.type ?? null}
        mediaId={selectedMedia?.id ?? null}
        fallbackTitle={selectedMedia?.title}
        fallbackPoster={selectedMedia?.poster}
        fallbackRating={selectedMedia?.rating}
        fallbackContainerExtension={selectedMedia?.containerExtension}
        vodInfo={vodInfo}
        seriesInfo={seriesInfo}
        isLoading={isLoadingDetails}
        error={detailsError}
        isFavorite={
          selectedMedia?.type === "series"
            ? isFavoriteSeries(selectedMedia.id)
            : false
        }
        isWatchLater={
          selectedMedia
            ? isInWatchLater(selectedMedia.id, selectedMedia.type)
            : false
        }
        vodProgress={
          selectedMedia?.type === "vod"
            ? getVodProgress(selectedMedia.id)
            : undefined
        }
        lastSeriesProgress={
          selectedMedia?.type === "series"
            ? getLastSeriesProgress(selectedMedia.id)
            : undefined
        }
        getEpisodeProgress={getEpisodeProgress}
        onToggleFavorite={() => {
          if (selectedMedia && selectedMedia.type === "series") {
            toggleFavoriteSeries({
              id: selectedMedia.id,
              type: "series",
              title: selectedMedia.title,
              poster: selectedMedia.poster,
              rating: selectedMedia.rating,
              addedAt: Date.now(),
            });
          }
        }}
        onToggleWatchLater={() => {
          if (selectedMedia) {
            toggleWatchLater({
              id: selectedMedia.id,
              type: selectedMedia.type,
              title: selectedMedia.title,
              poster: selectedMedia.poster,
              rating: selectedMedia.rating,
              addedAt: Date.now(),
            });
          }
        }}
        onPlayVod={handlePlayVod}
        onPlayEpisode={handlePlayEpisode}
        onClose={handleCloseMediaDetails}
      />

      {/* Video Player Modal */}
      <VideoPlayerModal
        key={playingMedia?.directUrl ?? "closed"}
        media={playingMedia}
        onUpdateProgress={updateWatchProgress}
        onClose={() => setPlayingMedia(null)}
      />

      {/* Reusable Footer */}
      <Footer />
    </div>
  );
}
