"use client";

import { useState } from "react";
import type {
  XtreamVodInfo,
  XtreamSeriesInfo,
  XtreamEpisode,
  WatchHistoryItem,
} from "@/types/xtream";
import {
  formatDurationTimestamp,
  parseDurationToSeconds,
} from "@/utils/mediaStorage";

export interface MediaDetailsModalProps {
  isOpen: boolean;
  mediaType: "vod" | "series" | null;
  mediaId: number | null;
  fallbackTitle?: string;
  fallbackPoster?: string;
  fallbackRating?: string;
  fallbackContainerExtension?: string;
  vodInfo: XtreamVodInfo | null;
  seriesInfo: XtreamSeriesInfo | null;
  isLoading: boolean;
  error?: string | null;
  isFavorite: boolean;
  isWatchLater: boolean;
  vodProgress?: WatchHistoryItem;
  lastSeriesProgress?: WatchHistoryItem;
  getEpisodeProgress?: (
    seriesId: number,
    episodeId: string | number
  ) => WatchHistoryItem | undefined;
  onToggleFavorite: () => void;
  onToggleWatchLater: () => void;
  onPlayVod?: (
    streamId: number,
    containerExtension: string,
    title: string,
    poster: string,
    rating?: string,
    initialTimeSeconds?: number,
    durationSeconds?: number
  ) => void;
  onPlayEpisode?: (
    episode: XtreamEpisode,
    seriesId: number,
    seriesTitle: string,
    seasonNumber: string,
    poster: string,
    rating?: string,
    initialTimeSeconds?: number,
    durationSeconds?: number
  ) => void;
  onClose: () => void;
}

export default function MediaDetailsModal({
  isOpen,
  mediaType,
  mediaId,
  fallbackTitle = "",
  fallbackPoster = "",
  fallbackRating,
  fallbackContainerExtension,
  vodInfo,
  seriesInfo,
  isLoading,
  error,
  isFavorite,
  isWatchLater,
  vodProgress,
  lastSeriesProgress,
  getEpisodeProgress,
  onToggleFavorite,
  onToggleWatchLater,
  onPlayVod,
  onPlayEpisode,
  onClose,
}: MediaDetailsModalProps) {
  const [customSeasonKey, setCustomSeasonKey] = useState<string | null>(null);
  const [failedPosterUrl, setFailedPosterUrl] = useState<string | null>(null);

  if (!isOpen || !mediaType || mediaId === null) return null;

  const title =
    mediaType === "vod"
      ? vodInfo?.info?.name ||
        vodInfo?.movie_data?.name ||
        vodInfo?.info?.o_name ||
        fallbackTitle
      : seriesInfo?.info?.name || fallbackTitle;

  const rawPoster =
    mediaType === "vod"
      ? vodInfo?.info?.cover_big ||
        vodInfo?.info?.movie_image ||
        fallbackPoster
      : seriesInfo?.info?.cover || fallbackPoster;

  const poster = rawPoster?.trim() ?? "";
  const hasValidPoster = Boolean(poster) && failedPosterUrl !== poster;

  const plot =
    mediaType === "vod"
      ? vodInfo?.info?.plot || vodInfo?.info?.description || ""
      : seriesInfo?.info?.plot || "";

  const cast =
    mediaType === "vod"
      ? vodInfo?.info?.cast || vodInfo?.info?.actors || ""
      : seriesInfo?.info?.cast || "";

  const director =
    mediaType === "vod"
      ? vodInfo?.info?.director || ""
      : seriesInfo?.info?.director || "";

  const genre =
    mediaType === "vod"
      ? vodInfo?.info?.genre || ""
      : seriesInfo?.info?.genre || "";

  const releaseDate =
    mediaType === "vod"
      ? vodInfo?.info?.releasedate || vodInfo?.info?.release_date || ""
      : seriesInfo?.info?.releaseDate || "";

  const duration =
    mediaType === "vod"
      ? vodInfo?.info?.duration || ""
      : seriesInfo?.info?.episode_run_time
      ? `${seriesInfo.info.episode_run_time} min / ép.`
      : "";

  const rawRating =
    mediaType === "vod"
      ? vodInfo?.info?.rating ?? fallbackRating
      : seriesInfo?.info?.rating ?? fallbackRating;

  const rating =
    rawRating !== undefined &&
    rawRating !== null &&
    String(rawRating).trim() !== "" &&
    String(rawRating).trim() !== "0"
      ? String(rawRating).trim()
      : undefined;

  const vodStreamId = vodInfo?.movie_data?.stream_id ?? mediaId;
  const vodContainerExt =
    vodInfo?.movie_data?.container_extension ||
    fallbackContainerExtension ||
    "mp4";
  const vodDurationSeconds =
    parseDurationToSeconds(
      vodInfo?.info?.duration_secs,
      vodInfo?.info?.duration
    ) ||
    (vodProgress?.durationSeconds ?? 0);

  const getEpisodeDuration = (
    ep: XtreamEpisode,
    epProg?: WatchHistoryItem
  ): number => {
    return (
      parseDurationToSeconds(
        ep.info?.duration_secs,
        ep.info?.duration || seriesInfo?.info?.episode_run_time
      ) ||
      (epProg?.durationSeconds ?? 0)
    );
  };

  // Determine available seasons for Series
  const episodesMap: Record<string, XtreamEpisode[]> =
    mediaType === "series" && seriesInfo?.episodes ? seriesInfo.episodes : {};

  const seasonKeys = Object.keys(episodesMap).sort(
    (a, b) => Number(a) - Number(b)
  );

  const defaultSeasonKey =
    lastSeriesProgress?.seasonNumber &&
    seasonKeys.includes(lastSeriesProgress.seasonNumber)
      ? lastSeriesProgress.seasonNumber
      : seasonKeys[0] ?? null;

  const activeSeasonKey =
    customSeasonKey && seasonKeys.includes(customSeasonKey)
      ? customSeasonKey
      : defaultSeasonKey;

  const activeEpisodes: XtreamEpisode[] =
    activeSeasonKey && episodesMap[activeSeasonKey]
      ? episodesMap[activeSeasonKey]
      : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-y-auto text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la modale"
          className="sticky top-4 float-right mr-4 mt-4 z-20 w-10 h-10 rounded-full bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-6 sm:p-8 clear-both">
          {/* Main Info Header */}
          <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
            {/* Poster / Cover */}
            <div className="w-44 sm:w-56 shrink-0 mx-auto md:mx-0">
              <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-xl">
                {hasValidPoster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poster}
                    alt={title}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedPosterUrl(poster)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-zinc-600">
                    <svg
                      className="w-12 h-12 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                      />
                    </svg>
                    <span className="text-xs text-center text-zinc-500">
                      Aucun poster
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata & Actions */}
            <div className="flex-1 space-y-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                      mediaType === "vod"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    }`}
                  >
                    {mediaType === "vod" ? "Film / VOD" : "Série"}
                  </span>

                  {rating && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                      ★ {rating}
                    </span>
                  )}

                  {releaseDate && (
                    <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium">
                      {releaseDate}
                    </span>
                  )}

                  {duration && (
                    <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium">
                      ⏱ {duration}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {title}
                </h2>

                {genre && (
                  <p className="text-xs font-medium text-blue-400">{genre}</p>
                )}
              </div>

              {/* Action Buttons: Play/Resume + Favorites (Series only) + Watch Later (VOD + Series) */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {mediaType === "vod" && vodStreamId && onPlayVod && (
                  <>
                    {vodProgress && vodProgress.progressSeconds > 3 ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            onPlayVod(
                              vodStreamId,
                              vodContainerExt,
                              title,
                              poster,
                              rating,
                              vodProgress.progressSeconds,
                              vodDurationSeconds
                            )
                          }
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-black transition shadow-lg shadow-amber-500/25 cursor-pointer"
                        >
                          <svg
                            className="w-4 h-4 fill-current"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          Reprendre (
                          {formatDurationTimestamp(vodProgress.progressSeconds)}
                          )
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onPlayVod(
                              vodStreamId,
                              vodContainerExt,
                              title,
                              poster,
                              rating,
                              0,
                              vodDurationSeconds
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer"
                        >
                          ↺ Recommencer
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onPlayVod(
                            vodStreamId,
                            vodContainerExt,
                            title,
                            poster,
                            rating,
                            0,
                            vodDurationSeconds
                          )
                        }
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-black transition shadow-lg shadow-amber-500/25 cursor-pointer"
                      >
                        <svg
                          className="w-4 h-4 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Lire le film (.{vodContainerExt})
                      </button>
                    )}
                  </>
                )}

                {mediaType === "series" &&
                  activeSeasonKey &&
                  activeEpisodes.length > 0 &&
                  onPlayEpisode && (
                    <button
                      type="button"
                      onClick={() => {
                        if (lastSeriesProgress && lastSeriesProgress.episodeId) {
                          const targetSeason =
                            lastSeriesProgress.seasonNumber || activeSeasonKey;
                          const seasonEps = episodesMap[targetSeason] || [];
                          const matchedEp = seasonEps.find(
                            (ep) =>
                              String(ep.id) === lastSeriesProgress.episodeId
                          );
                          if (matchedEp) {
                            onPlayEpisode(
                              matchedEp,
                              mediaId,
                              title,
                              targetSeason,
                              poster,
                              rating,
                              lastSeriesProgress.progressSeconds,
                              getEpisodeDuration(matchedEp, lastSeriesProgress)
                            );
                            return;
                          }
                        }
                        const firstEp = activeEpisodes[0];
                        const firstEpProg = getEpisodeProgress?.(
                          mediaId,
                          firstEp.id
                        );
                        onPlayEpisode(
                          firstEp,
                          mediaId,
                          title,
                          activeSeasonKey,
                          poster,
                          rating,
                          firstEpProg?.progressSeconds ?? 0,
                          getEpisodeDuration(firstEp, firstEpProg)
                        );
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/25 cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4 fill-current"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      {lastSeriesProgress && lastSeriesProgress.episodeId
                        ? `Reprendre S${lastSeriesProgress.seasonNumber} Ép. ${lastSeriesProgress.episodeNumber}` +
                          (lastSeriesProgress.progressSeconds > 0
                            ? ` (${formatDurationTimestamp(
                                lastSeriesProgress.progressSeconds
                              )})`
                            : "")
                        : `Lire S${activeSeasonKey} Ép. ${activeEpisodes[0].episode_num}`}
                    </button>
                  )}

                {mediaType === "series" && (
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition border cursor-pointer ${
                      isFavorite
                        ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-600/20"
                        : "bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill={isFavorite ? "currentColor" : "none"}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    {isFavorite ? "Dans vos Favoris" : "Ajouter aux Favoris"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onToggleWatchLater}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition border cursor-pointer ${
                    isWatchLater
                      ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-600/20"
                      : "bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill={isWatchLater ? "currentColor" : "none"}
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
                  {isWatchLater
                    ? "Dans À regarder plus tard"
                    : "À regarder plus tard"}
                </button>
              </div>

              {/* Loading / Error State for Details */}
              {isLoading && (
                <div className="flex items-center gap-3 py-4 text-zinc-400">
                  <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-xs font-mono">
                    Chargement des informations détaillées...
                  </span>
                </div>
              )}

              {error && !isLoading && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {/* Synopsis & Credits */}
              {!isLoading && (
                <div className="space-y-4 pt-1">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Synopsis
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {plot || "Aucun synopsis disponible pour ce titre."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
                    {director && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                          Réalisateur
                        </span>
                        <span className="text-xs text-zinc-200 mt-0.5 block">
                          {director}
                        </span>
                      </div>
                    )}

                    {cast && (
                      <div className="sm:col-span-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                          Casting
                        </span>
                        <span className="text-xs text-zinc-300 mt-0.5 block leading-relaxed">
                          {cast}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Series Seasons & Episodes Section */}
          {mediaType === "series" && !isLoading && (
            <div className="mt-8 pt-6 border-t border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white">
                  Saisons & Épisodes
                </h3>

                {seasonKeys.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {seasonKeys.map((seasonNum) => {
                      const isActive = seasonNum === activeSeasonKey;
                      return (
                        <button
                          key={seasonNum}
                          type="button"
                          onClick={() => setCustomSeasonKey(seasonNum)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            isActive
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                              : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                          }`}
                        >
                          Saison {seasonNum}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {seasonKeys.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4">
                  Aucun épisode répertorié pour cette série.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {activeEpisodes.map((episode) => {
                    const epProgress = getEpisodeProgress?.(
                      mediaId,
                      episode.id
                    );
                    const hasProgress = Boolean(
                      epProgress && epProgress.progressSeconds > 0
                    );
                    const pct =
                      epProgress &&
                      epProgress.progressSeconds > 0 &&
                      epProgress.durationSeconds > 0
                        ? Math.min(
                            100,
                            Math.max(
                              5,
                              Math.round(
                                (epProgress.progressSeconds /
                                  epProgress.durationSeconds) *
                                  100
                              )
                            )
                          )
                        : hasProgress
                        ? 15
                        : 0;

                    return (
                      <div
                        key={episode.id}
                        onClick={() => {
                          if (activeSeasonKey && onPlayEpisode) {
                            onPlayEpisode(
                              episode,
                              mediaId,
                              title,
                              activeSeasonKey,
                              poster,
                              rating,
                              epProgress?.progressSeconds ?? 0,
                              getEpisodeDuration(episode, epProgress)
                            );
                          }
                        }}
                        className="group relative overflow-hidden p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-indigo-500/50 hover:bg-zinc-900 flex items-center justify-between gap-3 transition cursor-pointer"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold">
                              Ép. {episode.episode_num}
                            </span>
                            {episode.container_extension && (
                              <span className="text-[10px] text-zinc-500 font-mono uppercase">
                                .{episode.container_extension}
                              </span>
                            )}
                            {episode.info?.duration && (
                              <span className="text-[11px] text-zinc-500 font-mono">
                                {episode.info.duration}
                              </span>
                            )}
                            {hasProgress && epProgress && (
                              <span className="text-[10px] font-mono text-blue-400 font-semibold">
                                • Vu{" "}
                                {formatDurationTimestamp(
                                  epProgress.progressSeconds
                                )}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                            {episode.title || `Épisode ${episode.episode_num}`}
                          </h4>
                          {episode.info?.plot && (
                            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                              {episode.info.plot}
                            </p>
                          )}
                        </div>

                        {onPlayEpisode && activeSeasonKey && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayEpisode(
                                episode,
                                mediaId,
                                title,
                                activeSeasonKey,
                                poster,
                                rating,
                                epProgress?.progressSeconds ?? 0,
                                getEpisodeDuration(episode, epProgress)
                              );
                            }}
                            className="shrink-0 px-3 py-2 rounded-xl bg-indigo-600/20 group-hover:bg-indigo-600 text-indigo-300 group-hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <svg
                              className="w-3.5 h-3.5 fill-current"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            {hasProgress ? "Reprendre" : "Lire"}
                          </button>
                        )}

                        {hasProgress && (
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-800">
                            <div
                              className="h-full bg-indigo-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
