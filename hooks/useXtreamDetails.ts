import { useState, useCallback, useRef } from "react";
import type { XtreamVodInfo, XtreamSeriesInfo } from "@/types/xtream";
import { getVodInfo, getSeriesInfo } from "@/utils/xtreamApi";

export function useXtreamDetails(identifier: string) {
  const [vodInfo, setVodInfo] = useState<XtreamVodInfo | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<XtreamSeriesInfo | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  const fetchVodDetails = useCallback(
    async (vodId: number | string) => {
      if (!identifier) return;
      const requestId = ++activeRequestIdRef.current;
      setIsLoadingDetails(true);
      setDetailsError(null);
      setVodInfo(null);
      setSeriesInfo(null);

      try {
        const data = await getVodInfo(identifier, vodId);
        if (activeRequestIdRef.current === requestId) {
          setVodInfo(data);
        }
      } catch (err) {
        if (activeRequestIdRef.current === requestId) {
          const message =
            err instanceof Error
              ? err.message
              : "Impossible de charger les détails du film.";
          setDetailsError(message);
        }
      } finally {
        if (activeRequestIdRef.current === requestId) {
          setIsLoadingDetails(false);
        }
      }
    },
    [identifier]
  );

  const fetchSeriesDetails = useCallback(
    async (seriesId: number | string) => {
      if (!identifier) return;
      const requestId = ++activeRequestIdRef.current;
      setIsLoadingDetails(true);
      setDetailsError(null);
      setVodInfo(null);
      setSeriesInfo(null);

      try {
        const data = await getSeriesInfo(identifier, seriesId);
        if (activeRequestIdRef.current === requestId) {
          setSeriesInfo(data);
        }
      } catch (err) {
        if (activeRequestIdRef.current === requestId) {
          const message =
            err instanceof Error
              ? err.message
              : "Impossible de charger les détails de la série.";
          setDetailsError(message);
        }
      } finally {
        if (activeRequestIdRef.current === requestId) {
          setIsLoadingDetails(false);
        }
      }
    },
    [identifier]
  );

  const clearDetails = useCallback(() => {
    activeRequestIdRef.current++;
    setVodInfo(null);
    setSeriesInfo(null);
    setIsLoadingDetails(false);
    setDetailsError(null);
  }, []);

  return {
    vodInfo,
    seriesInfo,
    isLoadingDetails,
    detailsError,
    fetchVodDetails,
    fetchSeriesDetails,
    clearDetails,
  };
}

