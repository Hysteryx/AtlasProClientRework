"use client";

import { useState, useMemo, type ChangeEvent } from "react";
import type {
  CatalogType,
  XtreamCategory,
  XtreamLiveStream,
  XtreamVodStream,
  XtreamSeries,
  SavedMediaItem,
  FavoriteLiveChannel,
  WatchHistoryItem,
} from "@/types/xtream";
import MediaCard from "@/components/MediaCard";

const PAGE_SIZE = 60;
const FAV_LIVE_CATEGORY_ID = "__FAVORITE_LIVE__";

export interface SelectedMediaSummary {
  id: number;
  type: "vod" | "series";
  title: string;
  poster: string;
  rating?: string;
  containerExtension?: string;
}

interface NormalizedCatalogItem {
  id: number;
  type: CatalogType;
  title: string;
  poster: string;
  rating?: string;
  categoryId: string;
  containerExtension?: string;
}

export interface CatalogBrowserProps {
  catalogType: CatalogType;
  categories: XtreamCategory[];
  liveStreams: XtreamLiveStream[];
  vodStreams: XtreamVodStream[];
  seriesList: XtreamSeries[];
  isLoading: boolean;
  error: string | null;
  onReload: () => void;
  isFavoriteSeries: (seriesId: number) => boolean;
  isInWatchLater: (id: number, type: "vod" | "series") => boolean;
  isFavoriteLiveChannel?: (streamId: number) => boolean;
  favoriteLiveCount?: number;
  getVodProgress?: (vodId: number) => WatchHistoryItem | undefined;
  getLastSeriesProgress?: (seriesId: number) => WatchHistoryItem | undefined;
  onToggleFavoriteSeries: (item: SavedMediaItem) => void;
  onToggleWatchLater: (item: SavedMediaItem) => void;
  onToggleFavoriteLive?: (
    channel: Omit<FavoriteLiveChannel, "addedAt">
  ) => void;
  onSelectMedia: (item: SelectedMediaSummary) => void;
  onPlayLive?: (streamId: number, title: string, poster: string) => void;
  onPlayVod?: (
    streamId: number,
    containerExtension: string,
    title: string,
    poster: string,
    rating?: string
  ) => void;
}

export default function CatalogBrowser({
  catalogType,
  categories,
  liveStreams,
  vodStreams,
  seriesList,
  isLoading,
  error,
  onReload,
  isFavoriteSeries,
  isInWatchLater,
  isFavoriteLiveChannel,
  favoriteLiveCount = 0,
  getVodProgress,
  getLastSeriesProgress,
  onToggleFavoriteSeries,
  onToggleWatchLater,
  onToggleFavoriteLive,
  onSelectMedia,
  onPlayLive,
  onPlayVod,
}: CatalogBrowserProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Ensure selectedCategoryId is valid for the current category list
  const effectiveCategoryId = useMemo(() => {
    if (selectedCategoryId === "ALL") return "ALL";
    if (
      catalogType === "live" &&
      selectedCategoryId === FAV_LIVE_CATEGORY_ID
    ) {
      return FAV_LIVE_CATEGORY_ID;
    }
    const exists = categories.some(
      (cat) => String(cat.category_id) === selectedCategoryId
    );
    return exists ? selectedCategoryId : "ALL";
  }, [categories, catalogType, selectedCategoryId]);

  // Normalize items across Live, VOD, and Series
  const normalizedItems = useMemo<NormalizedCatalogItem[]>(() => {
    if (catalogType === "live") {
      return liveStreams.map((stream) => ({
        id: Number(stream.stream_id),
        type: "live",
        title: stream.name || `Chaîne #${stream.stream_id}`,
        poster: stream.stream_icon || "",
        categoryId: String(stream.category_id ?? ""),
      }));
    }

    if (catalogType === "vod") {
      return vodStreams.map((vod) => ({
        id: Number(vod.stream_id),
        type: "vod",
        title: vod.name || `Film #${vod.stream_id}`,
        poster: vod.stream_icon || "",
        rating:
          vod.rating !== undefined && vod.rating !== null
            ? String(vod.rating)
            : undefined,
        categoryId: String(vod.category_id ?? ""),
        containerExtension: vod.container_extension || "mp4",
      }));
    }

    return seriesList.map((series) => ({
      id: Number(series.series_id),
      type: "series",
      title: series.name || `Série #${series.series_id}`,
      poster: series.cover || "",
      rating:
        series.rating !== undefined && series.rating !== null
          ? String(series.rating)
          : undefined,
      categoryId: String(series.category_id ?? ""),
    }));
  }, [catalogType, liveStreams, vodStreams, seriesList]);

  // Filter items by category (or Live Favorites) and instant text search
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return normalizedItems.filter((item) => {
      if (effectiveCategoryId === FAV_LIVE_CATEGORY_ID) {
        if (!isFavoriteLiveChannel || !isFavoriteLiveChannel(item.id)) {
          return false;
        }
      } else if (
        effectiveCategoryId !== "ALL" &&
        item.categoryId !== effectiveCategoryId
      ) {
        return false;
      }

      if (query && !item.title.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [
    normalizedItems,
    effectiveCategoryId,
    searchQuery,
    isFavoriteLiveChannel,
  ]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount]
  );

  const hasMore = visibleCount < filteredItems.length;

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setVisibleCount(PAGE_SIZE);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setVisibleCount(PAGE_SIZE);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  if (isLoading) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center gap-4 text-zinc-400">
        <div className="w-10 h-10 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-xs font-mono tracking-wider">
          Chargement du catalogue{" "}
          {catalogType === "live"
            ? "Live TV"
            : catalogType === "vod"
            ? "Films / VOD"
            : "Séries"}
          ...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-16 px-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-base font-bold text-white">
            Erreur de chargement du catalogue
          </h3>
          <p className="text-xs text-zinc-400">{error}</p>
        </div>
        <button
          type="button"
          onClick={onReload}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Category Sidebar (Desktop) & Horizontal Scrollbar (Mobile) */}
      <aside className="w-full lg:w-64 shrink-0 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3">
        <div className="px-2 py-1.5 mb-2 flex items-center justify-between border-b border-zinc-800/80">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Catégories
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            {categories.length}
          </span>
        </div>

        <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto lg:max-h-[65vh] pb-1 lg:pb-0 pr-0 lg:pr-1">
          {/* Special Live TV Favorites filter inside Live tab only */}
          {catalogType === "live" && (
            <button
              type="button"
              onClick={() => handleCategoryChange(FAV_LIVE_CATEGORY_ID)}
              className={`shrink-0 text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer border ${
                effectiveCategoryId === FAV_LIVE_CATEGORY_ID
                  ? "bg-amber-500 text-black border-amber-400 shadow-sm"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span>★</span>
                <span>Chaînes Favorites</span>
              </span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  effectiveCategoryId === FAV_LIVE_CATEGORY_ID
                    ? "bg-black/20 text-black"
                    : "bg-zinc-900 text-amber-400"
                }`}
              >
                {favoriteLiveCount}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleCategoryChange("ALL")}
            className={`shrink-0 text-left px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              effectiveCategoryId === "ALL"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
            }`}
          >
            Toutes les catégories ({normalizedItems.length})
          </button>

          {categories.map((cat) => {
            const catId = String(cat.category_id);
            const isActive = effectiveCategoryId === catId;
            return (
              <button
                key={catId}
                type="button"
                onClick={() => handleCategoryChange(catId)}
                className={`shrink-0 text-left px-3 py-2 rounded-xl text-xs font-medium transition truncate cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
                }`}
                title={cat.category_name}
              >
                {cat.category_name}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area: Search Bar + Media Grid + Pagination */}
      <div className="flex-1 w-full min-w-0 space-y-5">
        {/* Search & Counter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5">
          <div className="relative flex-1">
            <svg
              className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Rechercher par titre..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setVisibleCount(PAGE_SIZE);
                }}
                aria-label="Effacer la recherche"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-zinc-400 px-1">
            <span>
              <strong className="text-zinc-200">{filteredItems.length}</strong>{" "}
              résultat{filteredItems.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Grid */}
        {visibleItems.length === 0 ? (
          <div className="w-full py-16 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-center space-y-2">
            <p className="text-sm font-semibold text-zinc-300">
              {effectiveCategoryId === FAV_LIVE_CATEGORY_ID
                ? "Aucune chaîne favorite enregistrée"
                : "Aucun contenu trouvé"}
            </p>
            <p className="text-xs text-zinc-500">
              {effectiveCategoryId === FAV_LIVE_CATEGORY_ID
                ? "Cliquez sur l'étoile ★ en haut à droite d'une chaîne Live pour l'ajouter à vos favoris Live."
                : "Essayez de modifier votre recherche ou de changer de catégorie."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {visibleItems.map((item) => {
                const isFav =
                  item.type === "series"
                    ? isFavoriteSeries(item.id)
                    : item.type === "live" && isFavoriteLiveChannel
                    ? isFavoriteLiveChannel(item.id)
                    : false;

                const isWL =
                  item.type === "vod" || item.type === "series"
                    ? isInWatchLater(item.id, item.type)
                    : false;

                const historyEntry =
                  item.type === "vod"
                    ? getVodProgress?.(item.id)
                    : item.type === "series"
                    ? getLastSeriesProgress?.(item.id)
                    : undefined;

                const subtitle =
                  item.type === "series" &&
                  historyEntry?.seasonNumber &&
                  historyEntry?.episodeNumber
                    ? `S${historyEntry.seasonNumber} • Ép. ${historyEntry.episodeNumber}`
                    : undefined;

                return (
                  <MediaCard
                    key={`${item.type}-${item.id}`}
                    id={item.id}
                    type={item.type}
                    title={item.title}
                    subtitle={subtitle}
                    poster={item.poster}
                    rating={item.rating}
                    isFavorite={isFav}
                    isWatchLater={isWL}
                    progressSeconds={historyEntry?.progressSeconds}
                    durationSeconds={historyEntry?.durationSeconds}
                    onToggleFavorite={
                      item.type === "series"
                        ? () =>
                            onToggleFavoriteSeries({
                              id: item.id,
                              type: "series",
                              title: item.title,
                              poster: item.poster,
                              rating: item.rating,
                              addedAt: Date.now(),
                            })
                        : item.type === "live" && onToggleFavoriteLive
                        ? () =>
                            onToggleFavoriteLive({
                              streamId: item.id,
                              name: item.title,
                              icon: item.poster,
                              categoryId: item.categoryId,
                            })
                        : undefined
                    }
                    onToggleWatchLater={
                      item.type === "vod" || item.type === "series"
                        ? () =>
                            onToggleWatchLater({
                              id: item.id,
                              type: item.type as "vod" | "series",
                              title: item.title,
                              poster: item.poster,
                              rating: item.rating,
                              addedAt: Date.now(),
                            })
                        : undefined
                    }
                    onSelect={
                      item.type === "vod" || item.type === "series"
                        ? () =>
                            onSelectMedia({
                              id: item.id,
                              type: item.type as "vod" | "series",
                              title: item.title,
                              poster: item.poster,
                              rating: item.rating,
                              containerExtension: item.containerExtension,
                            })
                        : undefined
                    }
                    onPlay={
                      item.type === "live" && onPlayLive
                        ? () => onPlayLive(item.id, item.title, item.poster)
                        : item.type === "vod" && onPlayVod
                        ? () =>
                            onPlayVod(
                              item.id,
                              item.containerExtension || "mp4",
                              item.title,
                              item.poster,
                              item.rating
                            )
                        : undefined
                    }
                  />
                );
              })}
            </div>

            {hasMore && (
              <div className="pt-4 flex flex-col items-center gap-2">
                <p className="text-xs text-zinc-500">
                  Affichage de {visibleItems.length} sur {filteredItems.length}
                </p>
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer shadow-sm"
                >
                  Afficher plus (+{PAGE_SIZE})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
