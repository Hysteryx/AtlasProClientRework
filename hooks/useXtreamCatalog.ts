import { useState, useEffect, useCallback } from "react";
import type {
  CatalogType,
  XtreamCategory,
  XtreamLiveStream,
  XtreamVodStream,
  XtreamSeries,
} from "@/types/xtream";
import {
  getLiveCategories,
  getLiveStreams,
  getVodCategories,
  getVodStreams,
  getSeriesCategories,
  getSeries,
} from "@/utils/xtreamApi";

interface CatalogDataState {
  completedKey: string | null;
  categories: XtreamCategory[];
  liveStreams: XtreamLiveStream[];
  vodStreams: XtreamVodStream[];
  seriesList: XtreamSeries[];
  error: string | null;
}

const INITIAL_STATE: CatalogDataState = {
  completedKey: null,
  categories: [],
  liveStreams: [],
  vodStreams: [],
  seriesList: [],
  error: null,
};

export function useXtreamCatalog(
  identifier: string,
  activeCatalog: CatalogType | null
) {
  const [reloadNonce, setReloadNonce] = useState<number>(0);
  const [state, setState] = useState<CatalogDataState>(INITIAL_STATE);

  const requestKey =
    identifier && activeCatalog
      ? `${identifier}:${activeCatalog}:${reloadNonce}`
      : null;

  useEffect(() => {
    if (!identifier || !activeCatalog || !requestKey) {
      return;
    }

    let isCancelled = false;

    async function loadCatalogData() {
      try {
        if (activeCatalog === "live") {
          const [categories, liveStreams] = await Promise.all([
            getLiveCategories(identifier),
            getLiveStreams(identifier),
          ]);
          if (!isCancelled) {
            setState((prev) => ({
              ...prev,
              completedKey: requestKey,
              categories,
              liveStreams,
              error: null,
            }));
          }
        } else if (activeCatalog === "vod") {
          const [categories, vodStreams] = await Promise.all([
            getVodCategories(identifier),
            getVodStreams(identifier),
          ]);
          if (!isCancelled) {
            setState((prev) => ({
              ...prev,
              completedKey: requestKey,
              categories,
              vodStreams,
              error: null,
            }));
          }
        } else if (activeCatalog === "series") {
          const [categories, seriesList] = await Promise.all([
            getSeriesCategories(identifier),
            getSeries(identifier),
          ]);
          if (!isCancelled) {
            setState((prev) => ({
              ...prev,
              completedKey: requestKey,
              categories,
              seriesList,
              error: null,
            }));
          }
        }
      } catch (err) {
        if (!isCancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Impossible de charger le catalogue Xtream.";
          setState((prev) => ({
            ...prev,
            completedKey: requestKey,
            categories: [],
            error: message,
          }));
        }
      }
    }

    void loadCatalogData();

    return () => {
      isCancelled = true;
    };
  }, [identifier, activeCatalog, requestKey]);

  const reload = useCallback(() => {
    setReloadNonce((prev) => prev + 1);
  }, []);

  const isLoading = Boolean(requestKey && state.completedKey !== requestKey);

  return {
    categories: state.categories,
    liveStreams: state.liveStreams,
    vodStreams: state.vodStreams,
    seriesList: state.seriesList,
    isLoading,
    error: isLoading ? null : state.error,
    reload,
  };
}

