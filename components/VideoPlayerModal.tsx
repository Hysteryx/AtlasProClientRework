"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import type {
  PlayableMedia,
  WatchHistoryInput,
  StreamAudioTrack,
} from "@/types/xtream";
import { buildProxyStreamUrl } from "@/utils/xtreamApi";
import { formatDurationTimestamp } from "@/utils/mediaStorage";
import { useStreamMetadata } from "@/hooks/useStreamMetadata";

export interface VideoPlayerModalProps {
  media: PlayableMedia | null;
  onUpdateProgress?: (
    metadata: WatchHistoryInput,
    progressSeconds: number,
    durationSeconds: number
  ) => void;
  onClose: () => void;
}

type PlayerStreamMode = "proxy" | "audio" | "full" | "direct";

function getInitialStreamMode(media: PlayableMedia | null): PlayerStreamMode {
  if (!media) return "proxy";
  if (media.type === "live") return "proxy";

  const ext = (media.containerExtension ?? "").toLowerCase().replace(/^\.+/, "");
  const lowerUrl = media.directUrl.toLowerCase();

  if (
    ext === "avi" ||
    ext === "divx" ||
    ext === "wmv" ||
    ext === "flv" ||
    ext === "mpg" ||
    ext === "mpeg" ||
    lowerUrl.endsWith(".avi")
  ) {
    return "full";
  }

  if (ext === "mkv" || lowerUrl.endsWith(".mkv")) {
    return "audio";
  }

  return "proxy";
}

function formatAudioTrackLabel(track: StreamAudioTrack): string {
  const parts: string[] = [`#${track.index + 1}`];
  if (track.language) {
    parts.push(track.language.toUpperCase());
  }
  if (track.title) {
    parts.push(track.title);
  }
  if (track.codec) {
    parts.push(`(${track.codec.toUpperCase()})`);
  }
  return parts.join(" • ");
}

export default function VideoPlayerModal({
  media,
  onUpdateProgress,
  onClose,
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const hasAppliedInitialSeekRef = useRef<boolean>(false);
  const lastSavedTimestampRef = useRef<number>(0);

  const [streamMode, setStreamMode] = useState<PlayerStreamMode>(() =>
    getInitialStreamMode(media)
  );
  const [startOffsetSeconds, setStartOffsetSeconds] = useState<number>(() =>
    media?.initialTimeSeconds && media.initialTimeSeconds > 3
      ? Math.floor(media.initialTimeSeconds)
      : 0
  );
  const [localVideoTime, setLocalVideoTime] = useState<number>(0);
  const [bufferedLocalEnd, setBufferedLocalEnd] = useState<number>(0);
  const [nativeDurationSeconds, setNativeDurationSeconds] = useState<number>(0);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubTimeSeconds, setScrubTimeSeconds] = useState<number>(0);
  const [hoverTimeSeconds, setHoverTimeSeconds] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);

  const [audioTrack, setAudioTrack] = useState<number>(0);
  const [useFallbackUrl, setUseFallbackUrl] = useState<boolean>(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const isFfmpegMode = streamMode === "audio" || streamMode === "full";

  const activeDirectUrl =
    useFallbackUrl && media?.fallbackDirectUrl
      ? media.fallbackDirectUrl
      : media?.directUrl ?? "";

  const { probedDurationSeconds, audioTracks } = useStreamMetadata(
    activeDirectUrl,
    Boolean(media && media.type !== "live")
  );

  const effectiveStreamUrl = activeDirectUrl
    ? streamMode === "direct"
      ? activeDirectUrl
      : buildProxyStreamUrl(activeDirectUrl, {
          transcode:
            streamMode === "audio"
              ? "audio"
              : streamMode === "full"
              ? "full"
              : "none",
          startSeconds: isFfmpegMode ? startOffsetSeconds : 0,
          audioTrack: isFfmpegMode ? audioTrack : 0,
        })
    : "";

  const isHlsStream =
    media?.type === "live" &&
    streamMode === "proxy" &&
    activeDirectUrl.toLowerCase().endsWith(".m3u8");

  const currentRealTime = isFfmpegMode
    ? startOffsetSeconds + localVideoTime
    : localVideoTime;

  const bufferedRealEnd = isFfmpegMode
    ? startOffsetSeconds + bufferedLocalEnd
    : bufferedLocalEnd;

  const effectiveDurationSeconds =
    probedDurationSeconds > 0
      ? probedDurationSeconds
      : media?.durationSeconds && media.durationSeconds > 0
      ? media.durationSeconds
      : !isFfmpegMode && nativeDurationSeconds > 0
      ? nativeDurationSeconds
      : 0;

  const timelineMaxSeconds =
    effectiveDurationSeconds > 0
      ? Math.max(effectiveDurationSeconds, Math.ceil(currentRealTime + 1))
      : Math.max(7200, Math.ceil(currentRealTime + 600));

  const displayedTimeSeconds = isScrubbing ? scrubTimeSeconds : currentRealTime;

  const scheduleControlsHide = useCallback(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    setShowControls(true);
    hideControlsTimerRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused && !isScrubbing) {
        setShowControls(false);
      }
    }, 3200);
  }, [isScrubbing]);

  // Commit seek to any timestamp in the film/episode
  const commitSeek = useCallback(
    (targetSecondsRaw: number) => {
      const video = videoRef.current;
      const maxAllowed =
        effectiveDurationSeconds > 5 ? effectiveDurationSeconds - 2 : 86400;
      const clampedTarget = Math.max(
        0,
        Math.min(Math.floor(targetSecondsRaw), maxAllowed)
      );

      setPlayerError(null);

      if (!isFfmpegMode) {
        if (video) {
          video.currentTime = clampedTarget;
          setLocalVideoTime(clampedTarget);
          void video.play().catch(() => {});
        }
      } else {
        const localOffset = clampedTarget - startOffsetSeconds;
        // If target is already inside the buffered RAM window of the current FFmpeg stream, seek in 0ms!
        if (
          video &&
          localOffset >= 0 &&
          bufferedLocalEnd > 2 &&
          localOffset <= bufferedLocalEnd - 1.5
        ) {
          video.currentTime = localOffset;
          setLocalVideoTime(localOffset);
          void video.play().catch(() => {});
        } else {
          // Otherwise, restart FFmpeg stream with -ss <clampedTarget>
          setIsBuffering(true);
          setLocalVideoTime(0);
          setBufferedLocalEnd(0);
          setStartOffsetSeconds(clampedTarget);
        }
      }

      if (media?.historyMetadata && onUpdateProgress) {
        onUpdateProgress(
          media.historyMetadata,
          clampedTarget,
          effectiveDurationSeconds
        );
      }
    },
    [
      effectiveDurationSeconds,
      isFfmpegMode,
      startOffsetSeconds,
      bufferedLocalEnd,
      media,
      onUpdateProgress,
    ]
  );

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      void container.requestFullscreen().catch(() => {});
    } else {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts (Space, ArrowLeft, ArrowRight, M, F)
  useEffect(() => {
    if (!media) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (e.code === "Space" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        togglePlayPause();
        scheduleControlsHide();
      } else if (e.code === "ArrowRight" && media.type !== "live") {
        e.preventDefault();
        commitSeek(currentRealTime + 15);
        scheduleControlsHide();
      } else if (e.code === "ArrowLeft" && media.type !== "live") {
        e.preventDefault();
        commitSeek(currentRealTime - 15);
        scheduleControlsHide();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    media,
    currentRealTime,
    commitSeek,
    togglePlayPause,
    toggleFullscreen,
    toggleMute,
    scheduleControlsHide,
  ]);

  const effectiveDurationRef = useRef<number>(0);

  useEffect(() => {
    effectiveDurationRef.current = effectiveDurationSeconds;
  }, [effectiveDurationSeconds]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!media || !videoElement || !effectiveStreamUrl) return;

    let hls: Hls | null = null;

    if (isHlsStream && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(effectiveStreamUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void videoElement.play().catch(() => {
          // Autoplay might require user interaction
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setPlayerError(
                "Erreur réseau lors du chargement du flux Live HLS. Essayez de basculer le format (.ts) ou le mode."
              );
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              setPlayerError(
                "Impossible de décoder ce flux en direct dans le navigateur."
              );
              hls?.destroy();
              break;
          }
        }
      });
    } else {
      videoElement.src = effectiveStreamUrl;
      void videoElement.play().catch(() => {
        // Autoplay may be blocked until user clicks play
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      if (videoElement) {
        if (
          media.historyMetadata &&
          onUpdateProgress &&
          videoElement.currentTime > 1
        ) {
          const currentPos = isFfmpegMode
            ? startOffsetSeconds + videoElement.currentTime
            : videoElement.currentTime;
          onUpdateProgress(
            media.historyMetadata,
            currentPos,
            effectiveDurationRef.current
          );
        }
        videoElement.pause();
        videoElement.removeAttribute("src");
        videoElement.load();
      }
    };
  }, [
    media,
    effectiveStreamUrl,
    isHlsStream,
    isFfmpegMode,
    startOffsetSeconds,
    onUpdateProgress,
  ]);

  if (!media) return null;

  const updateBufferedRange = (video: HTMLVideoElement) => {
    try {
      if (video.buffered && video.buffered.length > 0) {
        const end = video.buffered.end(video.buffered.length - 1);
        if (Number.isFinite(end)) {
          setBufferedLocalEnd(end);
        }
      }
    } catch {
      // Ignore buffered range read error
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    setIsBuffering(false);
    setVolume(video.volume);
    setIsMuted(video.muted);

    if (!isFfmpegMode && Number.isFinite(video.duration) && video.duration > 0) {
      setNativeDurationSeconds(Math.floor(video.duration));
    }

    // In non-FFmpeg mode (standard MP4), seek via video.currentTime
    if (
      !isFfmpegMode &&
      !hasAppliedInitialSeekRef.current &&
      startOffsetSeconds > 3
    ) {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (duration === 0 || startOffsetSeconds < duration - 10) {
        video.currentTime = startOffsetSeconds;
        setLocalVideoTime(startOffsetSeconds);
      }
      hasAppliedInitialSeekRef.current = true;
    }

    updateBufferedRange(video);

    if (media.historyMetadata && onUpdateProgress) {
      const currentPos = isFfmpegMode
        ? startOffsetSeconds + video.currentTime
        : video.currentTime;
      const knownDur =
        effectiveDurationSeconds > 0
          ? effectiveDurationSeconds
          : !isFfmpegMode && Number.isFinite(video.duration)
          ? Math.floor(video.duration)
          : 0;
      onUpdateProgress(media.historyMetadata, currentPos, knownDur);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setLocalVideoTime(video.currentTime);
    updateBufferedRange(video);

    if (!media.historyMetadata || !onUpdateProgress) return;

    const now = Date.now();
    if (now - lastSavedTimestampRef.current >= 3000 && video.currentTime > 1) {
      lastSavedTimestampRef.current = now;
      const currentPos = isFfmpegMode
        ? startOffsetSeconds + video.currentTime
        : video.currentTime;
      onUpdateProgress(
        media.historyMetadata,
        currentPos,
        effectiveDurationSeconds
      );
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
    const video = videoRef.current;
    if (!video || !media.historyMetadata || !onUpdateProgress) return;
    if (video.currentTime > 1) {
      const currentPos = isFfmpegMode
        ? startOffsetSeconds + video.currentTime
        : video.currentTime;
      onUpdateProgress(
        media.historyMetadata,
        currentPos,
        effectiveDurationSeconds
      );
    }
  };

  const handleVideoError = () => {
    setIsBuffering(false);
    // Automatic progressive fallback: proxy -> audio (AAC remux) -> full (H.264 + AAC transcode)
    if (media.type !== "live") {
      if (streamMode === "proxy") {
        setPlayerError(null);
        setIsBuffering(true);
        setStreamMode("audio");
        return;
      }
      if (streamMode === "audio") {
        setPlayerError(null);
        setIsBuffering(true);
        setStreamMode("full");
        return;
      }
    }

    setPlayerError(
      "Le flux n'a pas pu être décodé dans ce mode. Essayez le mode 'Complet (AVI/HEVC)' ou ouvrez le flux dans VLC ci-dessous."
    );
  };

  const handleRestartFromBeginning = () => {
    hasAppliedInitialSeekRef.current = true;
    commitSeek(0);
  };

  const handleSelectAudioTrack = (nextTrackIndex: number) => {
    if (nextTrackIndex === audioTrack) return;
    const currentPos = Math.floor(currentRealTime);
    if (isFfmpegMode && currentPos > 2) {
      setLocalVideoTime(0);
      setBufferedLocalEnd(0);
      setStartOffsetSeconds(currentPos);
    }
    setIsBuffering(true);
    setPlayerError(null);
    setAudioTrack(nextTrackIndex);
  };

  const handleChangeMode = (nextMode: PlayerStreamMode) => {
    if (nextMode === streamMode) return;
    const currentPos = Math.floor(currentRealTime);
    if (currentPos > 2) {
      setLocalVideoTime(0);
      setBufferedLocalEnd(0);
      setStartOffsetSeconds(currentPos);
    }
    setIsBuffering(true);
    setPlayerError(null);
    setStreamMode(nextMode);
  };

  const handleVolumeSliderChange = (nextVol: number) => {
    const video = videoRef.current;
    const clamped = Math.max(0, Math.min(1, nextVol));
    setVolume(clamped);
    if (video) {
      video.volume = clamped;
      if (clamped > 0 && video.muted) {
        video.muted = false;
      }
    }
  };

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = timelineRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    setHoverPercent(ratio * 100);
    setHoverTimeSeconds(Math.floor(ratio * timelineMaxSeconds));
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(activeDirectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const playedPercent =
    timelineMaxSeconds > 0
      ? Math.min(100, Math.max(0, (displayedTimeSeconds / timelineMaxSeconds) * 100))
      : 0;

  const bufferedPercent =
    timelineMaxSeconds > 0
      ? Math.min(100, Math.max(0, (bufferedRealEnd / timelineMaxSeconds) * 100))
      : 0;

  const availableTracks: StreamAudioTrack[] =
    audioTracks.length > 0
      ? audioTracks
      : [
          { index: 0, title: "Piste 1" },
          { index: 1, title: "Piste 2" },
          { index: 2, title: "Piste 3" },
        ];

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-zinc-950/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                  media.type === "live"
                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                    : media.type === "vod"
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                }`}
              >
                {media.type === "live"
                  ? "Direct Live"
                  : media.type === "vod"
                  ? "Film"
                  : "Série"}
              </span>
              {media.containerExtension && (
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-mono uppercase">
                  .{media.containerExtension}
                </span>
              )}
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {media.title}
              </h3>
            </div>
            {media.subtitle && (
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {media.subtitle}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {media.type !== "live" && currentRealTime > 10 && (
              <button
                type="button"
                onClick={handleRestartFromBeginning}
                className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-xs font-semibold transition cursor-pointer"
                title="Recommencer la lecture à 0:00"
              >
                ↺ Recommencer à 0:00
              </button>
            )}

            {/* Audio Track Selector in FFmpeg modes */}
            {media.type !== "live" && isFfmpegMode && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                <span className="font-semibold">🔊 Audio :</span>
                <select
                  value={audioTrack}
                  onChange={(e) => handleSelectAudioTrack(Number(e.target.value))}
                  className="bg-transparent text-emerald-300 font-semibold text-xs focus:outline-none cursor-pointer"
                >
                  {availableTracks.map((t) => (
                    <option
                      key={t.index}
                      value={t.index}
                      className="bg-zinc-900 text-zinc-100"
                    >
                      {formatAudioTrackLabel(t)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode Selector for VOD & Series */}
            {media.type !== "live" ? (
              <div className="inline-flex items-center rounded-xl bg-zinc-900 border border-zinc-700 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => handleChangeMode("audio")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    streamMode === "audio"
                      ? "bg-blue-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  title="Copie la vidéo originale et convertit le son AC3/DTS en AAC stéréo (idéal pour MKV)"
                >
                  Audio AAC (MKV)
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeMode("full")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    streamMode === "full"
                      ? "bg-blue-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  title="Transcode la vidéo en H.264 et l'audio en AAC (idéal pour AVI, DivX et HEVC)"
                >
                  Complet (AVI/HEVC)
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeMode("proxy")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    streamMode === "proxy"
                      ? "bg-blue-600 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  title="Flux natif sans transcodage (MP4 standard)"
                >
                  Natif
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  handleChangeMode(streamMode === "proxy" ? "full" : "proxy")
                }
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer"
              >
                Mode :{" "}
                {streamMode === "full"
                  ? "Transcodage FFmpeg"
                  : "Proxy HLS Standard"}
              </button>
            )}

            {media.fallbackDirectUrl && (
              <button
                type="button"
                onClick={() => {
                  setPlayerError(null);
                  setIsBuffering(true);
                  setUseFallbackUrl((prev) => !prev);
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer"
              >
                Format : {useFallbackUrl ? ".ts" : ".m3u8"}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le lecteur"
              className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-rose-600 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video Container with Custom Full-Duration Player Controls */}
        <div
          ref={playerContainerRef}
          onMouseMove={scheduleControlsHide}
          onMouseLeave={() => {
            setHoverTimeSeconds(null);
            if (isPlaying && !isScrubbing) {
              setShowControls(false);
            }
          }}
          className="relative w-full aspect-video bg-black flex items-center justify-center select-none overflow-hidden group"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            poster={media.poster}
            onClick={togglePlayPause}
            onDoubleClick={toggleFullscreen}
            onLoadStart={() => setIsBuffering(true)}
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={() => setIsBuffering(false)}
            onPlaying={() => {
              setIsBuffering(false);
              setIsPlaying(true);
            }}
            onPlay={() => setIsPlaying(true)}
            onWaiting={() => setIsBuffering(true)}
            onTimeUpdate={handleTimeUpdate}
            onProgress={(e) => updateBufferedRange(e.currentTarget)}
            onVolumeChange={(e) => {
              setVolume(e.currentTarget.volume);
              setIsMuted(e.currentTarget.muted);
            }}
            onPause={handlePause}
            onError={handleVideoError}
            className="w-full h-full max-h-[75vh] bg-black cursor-pointer"
          />

          {/* Buffering / Seeking Indicator */}
          {isBuffering && !playerError && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[2px] gap-3">
              <div className="w-12 h-12 rounded-full border-3 border-zinc-600 border-t-blue-500 animate-spin" />
              <span className="px-3 py-1 rounded-full bg-zinc-950/85 border border-zinc-800 text-xs font-mono text-zinc-200 shadow-lg">
                {currentRealTime > 3
                  ? `Chargement à ${formatDurationTimestamp(currentRealTime)}...`
                  : "Préparation du flux..."}
              </span>
            </div>
          )}

          {/* Center Play Button Overlay when Paused */}
          {!isPlaying && !isBuffering && !playerError && (
            <button
              type="button"
              onClick={togglePlayPause}
              aria-label="Lire"
              className="absolute w-16 h-16 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white flex items-center justify-center shadow-2xl shadow-blue-600/40 transition transform hover:scale-105 cursor-pointer"
            >
              <svg className="w-8 h-8 fill-current ml-1" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}

          {/* Error Banner */}
          {playerError && (
            <div className="absolute inset-x-4 bottom-24 mx-auto max-w-xl p-4 rounded-2xl bg-zinc-950/95 border border-rose-500/40 text-center space-y-3 shadow-2xl backdrop-blur-md z-20">
              <p className="text-xs text-rose-300 leading-relaxed">
                {playerError}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {streamMode !== "full" && (
                  <button
                    type="button"
                    onClick={() => handleChangeMode("full")}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Activer Transcodage Complet (AVI/MKV)
                  </button>
                )}
                <a
                  href={`vlc://${activeDirectUrl}`}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition"
                >
                  Ouvrir dans VLC
                </a>
              </div>
            </div>
          )}

          {/* Custom Bottom Control Bar (Full-Duration Seekbar + Transport Controls) */}
          <div
            className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-10 pb-3.5 px-4 sm:px-6 transition-opacity duration-300 ${
              showControls || !isPlaying || isScrubbing
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Full-Duration Interactive Timeline Bar for VOD & Series */}
            {media.type !== "live" && (
              <div
                ref={timelineRef}
                onMouseMove={handleTimelineMouseMove}
                onMouseLeave={() => setHoverTimeSeconds(null)}
                className="relative w-full h-6 flex items-center cursor-pointer group/slider mb-2"
              >
                {/* Hover Timestamp Preview Tooltip */}
                {hoverTimeSeconds !== null && (
                  <div
                    className="pointer-events-none absolute -top-8 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-zinc-900/95 border border-zinc-700 text-[11px] font-mono font-bold text-white shadow-lg whitespace-nowrap"
                    style={{
                      left: `${Math.min(96, Math.max(4, hoverPercent))}%`,
                    }}
                  >
                    {formatDurationTimestamp(hoverTimeSeconds)}
                  </div>
                )}

                {/* Track Background */}
                <div className="relative w-full h-1.5 group-hover/slider:h-2.5 bg-zinc-700/80 rounded-full overflow-hidden transition-all">
                  {/* Buffered Bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-zinc-400/40 rounded-full transition-all duration-150"
                    style={{ width: `${bufferedPercent}%` }}
                  />
                  {/* Played Progress Bar */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${
                      media.type === "vod" ? "bg-amber-500" : "bg-indigo-500"
                    }`}
                    style={{ width: `${playedPercent}%` }}
                  />
                </div>

                {/* Playhead Thumb Dot */}
                <div
                  className={`pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full shadow-md transition-transform group-hover/slider:scale-125 ${
                    media.type === "vod" ? "bg-amber-400" : "bg-indigo-400"
                  }`}
                  style={{ left: `${playedPercent}%` }}
                />

                {/* Native Range Input Covering the Entire Movie Duration */}
                <input
                  type="range"
                  min={0}
                  max={timelineMaxSeconds}
                  step={1}
                  value={Math.min(
                    timelineMaxSeconds,
                    Math.floor(displayedTimeSeconds)
                  )}
                  aria-label="Barre de progression du film"
                  onPointerDown={() => {
                    setIsScrubbing(true);
                    setScrubTimeSeconds(Math.floor(currentRealTime));
                  }}
                  onChange={(e) => {
                    const nextVal = Number(e.target.value);
                    setIsScrubbing(true);
                    setScrubTimeSeconds(nextVal);
                  }}
                  onPointerUp={(e) => {
                    const finalVal = Number(e.currentTarget.value);
                    setIsScrubbing(false);
                    commitSeek(finalVal);
                  }}
                  onKeyUp={(e) => {
                    if (
                      e.key === "ArrowLeft" ||
                      e.key === "ArrowRight" ||
                      e.key === "Home" ||
                      e.key === "End"
                    ) {
                      const finalVal = Number(e.currentTarget.value);
                      setIsScrubbing(false);
                      commitSeek(finalVal);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
                />
              </div>
            )}

            {/* Bottom Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left Group: Play/Pause, -15s, +30s, Volume, Time */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Play / Pause */}
                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? "Pause" : "Lecture"}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Quick Seek Buttons for VOD / Series */}
                {media.type !== "live" && (
                  <>
                    <button
                      type="button"
                      onClick={() => commitSeek(currentRealTime - 15)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-200 text-xs font-mono transition cursor-pointer"
                      title="Reculer de 15 secondes (←)"
                    >
                      -15s
                    </button>
                    <button
                      type="button"
                      onClick={() => commitSeek(currentRealTime + 30)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-200 text-xs font-mono transition cursor-pointer"
                      title="Avancer de 30 secondes (→)"
                    >
                      +30s
                    </button>
                  </>
                )}

                {/* Volume Mute + Slider */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Activer le son" : "Couper le son"}
                    className="w-8 h-8 rounded-lg hover:bg-white/10 text-zinc-200 flex items-center justify-center transition cursor-pointer"
                  >
                    {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    aria-label="Volume"
                    onChange={(e) =>
                      handleVolumeSliderChange(Number(e.target.value))
                    }
                    className="w-16 sm:w-20 h-1 accent-blue-500 bg-zinc-700 rounded-lg cursor-pointer hidden sm:block"
                  />
                </div>

                {/* Timestamp or Live Badge */}
                {media.type === "live" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold uppercase">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    En direct
                  </span>
                ) : (
                  <div className="text-xs font-mono text-zinc-200 pl-1">
                    <span className="font-bold text-white">
                      {formatDurationTimestamp(displayedTimeSeconds)}
                    </span>
                    <span className="text-zinc-500 mx-1.5">/</span>
                    <span className="text-zinc-300">
                      {effectiveDurationSeconds > 0
                        ? formatDurationTimestamp(effectiveDurationSeconds)
                        : "Calcul..."}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Group: Quick Jump -5m/+5m + Fullscreen */}
              <div className="flex items-center gap-2">
                {media.type !== "live" && (
                  <div className="hidden md:flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => commitSeek(currentRealTime - 300)}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 text-[11px] font-mono transition cursor-pointer"
                      title="Reculer de 5 minutes"
                    >
                      -5m
                    </button>
                    <button
                      type="button"
                      onClick={() => commitSeek(currentRealTime + 300)}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 text-[11px] font-mono transition cursor-pointer"
                      title="Avancer de 5 minutes"
                    >
                      +5m
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label="Plein écran"
                  title="Plein écran (F)"
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                >
                  {isFullscreen ? "🗗" : "⛶"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Direct Link & VLC Bar */}
        <div className="p-4 sm:px-6 bg-zinc-950/90 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                Lien de flux Xtream généré
              </span>
              <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300 truncate select-all">
                {activeDirectUrl}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-end">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition cursor-pointer"
              >
                {copied ? "✓ Lien copié" : "Copier le lien"}
              </button>

              <a
                href={`vlc://${activeDirectUrl}`}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-semibold transition"
                title="Lancer directement dans VLC Media Player"
              >
                Ouvrir dans VLC
              </a>

              <a
                href={activeDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
              >
                Flux direct ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
