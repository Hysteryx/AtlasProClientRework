"use client";

import { useState, useEffect } from "react";
import type { StreamAudioTrack, StreamProbeMetadata } from "@/types/xtream";
import { fetchStreamMetadata } from "@/utils/xtreamApi";

export interface UseStreamMetadataResult {
  probedDurationSeconds: number;
  audioTracks: StreamAudioTrack[];
  videoCodec?: string;
}

export function useStreamMetadata(
  directUrl: string,
  enabled: boolean
): UseStreamMetadataResult {
  const [probedMap, setProbedMap] = useState<
    Record<string, StreamProbeMetadata>
  >({});

  useEffect(() => {
    if (!enabled || !directUrl) return;

    const controller = new AbortController();
    let cancelled = false;

    const timer = setTimeout(() => {
      void fetchStreamMetadata(directUrl, controller.signal)
        .then((meta) => {
          if (
            !cancelled &&
            (meta.durationSeconds > 0 || meta.audioTracks.length > 0)
          ) {
            setProbedMap((prev) => ({
              ...prev,
              [directUrl]: meta,
            }));
          }
        })
        .catch(() => {
          // Ignore abort or network errors
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [directUrl, enabled]);

  const current = directUrl ? probedMap[directUrl] : undefined;

  return {
    probedDurationSeconds: current?.durationSeconds ?? 0,
    audioTracks: current?.audioTracks ?? [],
    videoCodec: current?.videoCodec,
  };
}

