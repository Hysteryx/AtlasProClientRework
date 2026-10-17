"use client";

import { useState, type MouseEvent } from "react";
import type { CatalogType } from "@/types/xtream";
import { formatDurationTimestamp } from "@/utils/mediaStorage";

export interface MediaCardProps {
  id: number;
  type: CatalogType;
  title: string;
  subtitle?: string;
  poster: string;
  rating?: string | number;
  isFavorite?: boolean;
  isWatchLater?: boolean;
  progressSeconds?: number;
  durationSeconds?: number;
  onToggleFavorite?: () => void;
  onToggleWatchLater?: () => void;
  onRemoveHistory?: () => void;
  onSelect?: () => void;
  onPlay?: () => void;
}

export default function MediaCard({
  type,
  title,
  subtitle,
  poster,
  rating,
  isFavorite = false,
  isWatchLater = false,
  progressSeconds,
  durationSeconds,
  onToggleFavorite,
  onToggleWatchLater,
  onRemoveHistory,
  onSelect,
  onPlay,
}: MediaCardProps) {
  const [failedPosterUrl, setFailedPosterUrl] = useState<string | null>(null);

  const trimmedPoster = poster?.trim() ?? "";
  const hasValidPoster =
    Boolean(trimmedPoster) && failedPosterUrl !== trimmedPoster;

  const formattedRating =
    rating !== undefined &&
    rating !== null &&
    String(rating).trim() !== "" &&
    String(rating).trim() !== "0"
      ? String(rating).trim()
      : null;

  const isInteractive = Boolean(onSelect || onPlay);

  const progressPercentage =
    progressSeconds && progressSeconds > 0
      ? durationSeconds && durationSeconds > 0
        ? Math.min(100, Math.max(4, Math.round((progressSeconds / durationSeconds) * 100)))
        : 15
      : 0;

  const handleCardClick = () => {
    if (type === "live" && onPlay) {
      onPlay();
      return;
    }
    if (onSelect) {
      onSelect();
    } else if (onPlay) {
      onPlay();
    }
  };

  const handlePlayButtonClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onPlay?.();
  };

  const handleFavoriteClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if ((type === "series" || type === "live") && onToggleFavorite) {
      onToggleFavorite();
    }
  };

  const handleWatchLaterClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if ((type === "vod" || type === "series") && onToggleWatchLater) {
      onToggleWatchLater();
    }
  };

  const handleRemoveHistoryClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRemoveHistory?.();
  };

  return (
    <div
      onClick={handleCardClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={`group relative flex flex-col rounded-2xl bg-zinc-900/80 border border-zinc-800/90 overflow-hidden transition-all duration-300 ${
        isInteractive
          ? "hover:border-zinc-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 cursor-pointer"
          : "hover:border-zinc-700/80"
      }`}
    >
      {/* Poster / Thumbnail Container */}
      <div
        className={`relative w-full overflow-hidden bg-zinc-950 ${
          type === "live" ? "aspect-video" : "aspect-[2/3]"
        }`}
      >
        {hasValidPoster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmedPoster}
            alt={title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailedPosterUrl(trimmedPoster)}
            className={`w-full h-full transition-transform duration-500 group-hover:scale-105 ${
              type === "live" ? "object-contain p-4" : "object-cover"
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-zinc-600 bg-gradient-to-b from-zinc-900 to-zinc-950">
            {type === "live" ? (
              <svg
                className="w-10 h-10 mb-2 text-zinc-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            ) : (
              <svg
                className="w-10 h-10 mb-2 text-zinc-700"
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
            )}
            <span className="text-[11px] font-medium text-zinc-500 text-center line-clamp-2">
              {title}
            </span>
          </div>
        )}

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-black/30 opacity-80 group-hover:opacity-90 transition-opacity pointer-events-none" />

        {/* Quick Play Overlay Button */}
        {onPlay && (
          <button
            type="button"
            onClick={handlePlayButtonClick}
            title={
              progressSeconds && progressSeconds > 0
                ? `Reprendre à ${formatDurationTimestamp(progressSeconds)}`
                : `Lire ${title}`
            }
            aria-label={`Lire ${title}`}
            className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white flex items-center justify-center shadow-xl shadow-black/60 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 z-10 cursor-pointer"
          >
            <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}

        {/* Top-left badge (Rating or Live indicator) */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
          {type === "live" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Live
            </span>
          )}
          {formattedRating && type !== "live" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-950/80 text-amber-400 border border-zinc-800 text-[11px] font-bold backdrop-blur-md">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {formattedRating}
            </span>
          )}
        </div>

        {/* Top-right action buttons */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {/* Live TV channel favorite button (separate from series favorites) */}
          {type === "live" && onToggleFavorite && (
            <button
              type="button"
              onClick={handleFavoriteClick}
              title={
                isFavorite
                  ? "Retirer des chaînes favorites"
                  : "Ajouter aux chaînes favorites"
              }
              aria-label={
                isFavorite
                  ? "Retirer des chaînes favorites"
                  : "Ajouter aux chaînes favorites"
              }
              className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                isFavorite
                  ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/30"
                  : "bg-zinc-950/75 text-zinc-300 border-zinc-700/80 hover:bg-zinc-900 hover:text-amber-400 hover:border-amber-500/40"
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
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          )}

          {/* Series Favorite Heart Button */}
          {type === "series" && onToggleFavorite && (
            <button
              type="button"
              onClick={handleFavoriteClick}
              title={
                isFavorite
                  ? "Retirer des séries favorites"
                  : "Ajouter aux séries favorites"
              }
              aria-label={
                isFavorite
                  ? "Retirer des séries favorites"
                  : "Ajouter aux séries favorites"
              }
              className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                isFavorite
                  ? "bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30"
                  : "bg-zinc-950/75 text-zinc-300 border-zinc-700/80 hover:bg-zinc-900 hover:text-rose-400 hover:border-rose-500/40"
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
            </button>
          )}

          {/* Watch Later Button (VOD & Series) */}
          {(type === "vod" || type === "series") && onToggleWatchLater && (
            <button
              type="button"
              onClick={handleWatchLaterClick}
              title={
                isWatchLater
                  ? "Retirer de À regarder plus tard"
                  : "Ajouter à À regarder plus tard"
              }
              aria-label={
                isWatchLater
                  ? "Retirer de À regarder plus tard"
                  : "Ajouter à À regarder plus tard"
              }
              className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                isWatchLater
                  ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30"
                  : "bg-zinc-950/75 text-zinc-300 border-zinc-700/80 hover:bg-zinc-900 hover:text-blue-400 hover:border-blue-500/40"
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
            </button>
          )}

          {/* Optional Remove from History Button */}
          {onRemoveHistory && (
            <button
              type="button"
              onClick={handleRemoveHistoryClick}
              title="Retirer de l'historique"
              aria-label="Retirer de l'historique"
              className="p-2 rounded-xl border bg-zinc-950/75 text-zinc-400 border-zinc-700/80 hover:bg-rose-600 hover:text-white hover:border-rose-500 backdrop-blur-md transition-all cursor-pointer"
            >
              <svg
                className="w-4 h-4"
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
          )}
        </div>

        {/* Bottom Watch Progress Bar */}
        {progressSeconds !== undefined && progressSeconds > 0 && (
          <div className="absolute inset-x-0 bottom-0 z-10">
            <div className="px-2.5 pb-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-200 drop-shadow">
              <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm">
                ▶ {formatDurationTimestamp(progressSeconds)}
                {durationSeconds && durationSeconds > 0
                  ? ` / ${formatDurationTimestamp(durationSeconds)}`
                  : ""}
              </span>
              {durationSeconds && durationSeconds > 0 ? (
                <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-blue-400 font-bold">
                  {progressPercentage}%
                </span>
              ) : null}
            </div>
            <div className="w-full h-1.5 bg-zinc-800/90">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Card Footer Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between bg-zinc-900/90">
        <div>
          <h3
            className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-white line-clamp-2 leading-snug"
            title={title}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-blue-400 font-medium truncate mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
          <span>
            {type === "live" ? "Chaîne TV" : type === "vod" ? "Film" : "Série"}
          </span>
          {type === "live" && onPlay ? (
            <span className="text-rose-400 group-hover:text-rose-300 font-bold transition-colors">
              ▶ Direct
            </span>
          ) : progressSeconds && progressSeconds > 0 && onPlay ? (
            <button
              type="button"
              onClick={handlePlayButtonClick}
              className="text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider cursor-pointer"
            >
              ▶ Reprendre
            </button>
          ) : (
            onSelect && (
              <span className="text-zinc-400 group-hover:text-blue-400 transition-colors">
                Détails →
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
