import { NextRequest, NextResponse } from "next/server";
import { spawn, type ChildProcessByStdio } from "child_process";
import type { Readable } from "stream";
import type { StreamAudioTrack, StreamProbeMetadata } from "@/types/xtream";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const streamMetadataCache = new Map<string, StreamProbeMetadata>();
const pendingMetadataWaiters = new Map<
  string,
  Array<(meta: StreamProbeMetadata) => void>
>();
const activeFfmpegCleanups = new Set<() => void>();

function killAllActiveFfmpegProcesses(): void {
  for (const cleanup of activeFfmpegCleanups) {
    try {
      cleanup();
    } catch {
      // Ignore cleanup errors
    }
  }
  activeFfmpegCleanups.clear();
}

function storeStreamMetadata(
  targetUrl: string,
  meta: StreamProbeMetadata
): void {
  const existing = streamMetadataCache.get(targetUrl);
  const merged: StreamProbeMetadata = {
    durationSeconds:
      meta.durationSeconds > 0
        ? meta.durationSeconds
        : existing?.durationSeconds ?? 0,
    videoCodec: meta.videoCodec || existing?.videoCodec,
    audioTracks:
      meta.audioTracks.length > 0
        ? meta.audioTracks
        : existing?.audioTracks ?? [],
  };

  if (merged.durationSeconds > 0 || merged.audioTracks.length > 0) {
    if (streamMetadataCache.size > 200) {
      const oldestKey = streamMetadataCache.keys().next().value;
      if (oldestKey) {
        streamMetadataCache.delete(oldestKey);
      }
    }
    streamMetadataCache.set(targetUrl, merged);
  }

  const waiters = pendingMetadataWaiters.get(targetUrl);
  if (waiters) {
    pendingMetadataWaiters.delete(targetUrl);
    for (const resolveWaiter of waiters) {
      resolveWaiter(merged);
    }
  }
}

function parseFfmpegStderrMetadata(
  stderrText: string
): StreamProbeMetadata {
  const mappingIndex = stderrText.indexOf("Stream mapping:");
  const outputIndex = stderrText.indexOf("Output #0");
  let cutoff = stderrText.length;
  if (mappingIndex !== -1) cutoff = Math.min(cutoff, mappingIndex);
  if (outputIndex !== -1) cutoff = Math.min(cutoff, outputIndex);

  const inputSection = stderrText.slice(0, cutoff);

  let durationSeconds = 0;
  const durationMatch = inputSection.match(
    /Duration:\s*(\d{2,}):(\d{2}):(\d{2}(?:\.\d+)?)/
  );
  if (durationMatch) {
    const hours = Number(durationMatch[1]);
    const minutes = Number(durationMatch[2]);
    const seconds = Number(durationMatch[3]);
    if (
      Number.isFinite(hours) &&
      Number.isFinite(minutes) &&
      Number.isFinite(seconds)
    ) {
      durationSeconds = Math.floor(hours * 3600 + minutes * 60 + seconds);
    }
  }

  let videoCodec: string | undefined;
  const audioTracks: StreamAudioTrack[] = [];

  const streamBlocks = inputSection.split(/\r?\n\s{2}Stream #0:/);
  for (let i = 1; i < streamBlocks.length; i++) {
    const block = streamBlocks[i];
    const headerMatch = block.match(
      /^(\d+)(?:\(([^)]+)\))?(?:\[[^\]]*\])?:\s*(Video|Audio|Subtitle):\s*([a-zA-Z0-9_]+)/
    );
    if (!headerMatch) continue;

    const lang = headerMatch[2]?.trim();
    const streamType = headerMatch[3];
    const codec = headerMatch[4]?.toLowerCase();

    if (streamType === "Video" && !videoCodec && codec) {
      videoCodec = codec;
    } else if (streamType === "Audio") {
      const titleMatch = block.match(/^\s+title\s*:\s*([^\r\n]+)/im);
      const title = titleMatch?.[1]?.trim();
      audioTracks.push({
        index: audioTracks.length,
        language: lang || undefined,
        title: title || undefined,
        codec: codec || undefined,
      });
    }
  }

  return {
    durationSeconds,
    videoCodec,
    audioTracks,
  };
}

function rewriteM3u8Manifest(manifest: string, baseUrl: string): string {
  return manifest
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
          try {
            const resolved = new URL(uri, baseUrl).toString();
            return `URI="/api/stream?url=${encodeURIComponent(resolved)}"`;
          } catch {
            return _match;
          }
        });
      }

      try {
        const resolved = new URL(trimmed, baseUrl).toString();
        return `/api/stream?url=${encodeURIComponent(resolved)}`;
      } catch {
        return line;
      }
    })
    .join("\n");
}

function buildFfmpegArgs(
  targetUrl: string,
  mode: "audio" | "full",
  startSeconds: number,
  audioTrackIndex: number
): string[] {
  const args: string[] = [
    "-hide_banner",
    "-loglevel",
    "info",
    "-user_agent",
    DEFAULT_USER_AGENT,
    "-reconnect",
    "1",
    "-reconnect_streamed",
    "1",
    "-reconnect_delay_max",
    "5",
    "-probesize",
    "1M",
    "-analyzeduration",
    "1M",
  ];

  if (startSeconds > 0) {
    args.push("-ss", String(startSeconds));
  } else {
    // Single sequential HTTP connection at t=0 for instant 0.5s startup
    args.push("-seekable", "0");
  }

  args.push(
    "-i",
    targetUrl,
    "-map",
    "0:v:0",
    "-map",
    `0:a:${audioTrackIndex}?`,
    "-sn",
    "-dn"
  );

  if (mode === "full") {
    args.push(
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p"
    );
  } else {
    args.push("-c:v", "copy");
  }

  args.push(
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ac",
    "2",
    "-avoid_negative_ts",
    "make_zero",
    "-f",
    "mp4",
    "-movflags",
    "frag_keyframe+empty_moov+default_base_moof",
    "pipe:1"
  );

  return args;
}

function createFfmpegReadableStream(
  targetUrl: string,
  mode: "audio" | "full",
  startSeconds: number,
  audioTrackIndex: number,
  abortSignal: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const args = buildFfmpegArgs(
      targetUrl,
      mode,
      startSeconds,
      audioTrackIndex
    );

    let proc: ChildProcessByStdio<null, Readable, Readable>;
    try {
      proc = spawn("ffmpeg", args, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (err) {
      reject(err);
      return;
    }

    let hasEmittedFirstChunk = false;
    let hasParsedMetadata = false;
    let stderrOutput = "";
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      activeFfmpegCleanups.delete(cleanup);
      try {
        proc.kill("SIGKILL");
      } catch {
        // Ignore kill errors
      }
    };

    activeFfmpegCleanups.add(cleanup);

    if (abortSignal.aborted) {
      cleanup();
      reject(new Error("Request aborted"));
      return;
    }

    abortSignal.addEventListener("abort", cleanup, { once: true });

    proc.stderr.on("data", (chunk: Buffer) => {
      if (stderrOutput.length < 16384) {
        stderrOutput += chunk.toString("utf8");
      }
      if (
        !hasParsedMetadata &&
        (stderrOutput.includes("Stream mapping:") ||
          stderrOutput.includes("Output #0"))
      ) {
        hasParsedMetadata = true;
        const meta = parseFfmpegStderrMetadata(stderrOutput);
        storeStreamMetadata(targetUrl, meta);
      }
    });

    proc.on("error", (err) => {
      if (!hasEmittedFirstChunk) {
        cleanup();
        reject(err);
      }
    });

    proc.on("close", (code) => {
      if (!hasParsedMetadata && stderrOutput) {
        hasParsedMetadata = true;
        const meta = parseFfmpegStderrMetadata(stderrOutput);
        storeStreamMetadata(targetUrl, meta);
      }
      if (!hasEmittedFirstChunk) {
        cleanup();
        reject(
          new Error(
            stderrOutput.trim().slice(-500) ||
              `FFmpeg exited with code ${code ?? "unknown"} before streaming`
          )
        );
      }
    });

    const onFirstData = (firstChunk: Buffer) => {
      hasEmittedFirstChunk = true;
      proc.stdout.removeListener("data", onFirstData);

      if (!hasParsedMetadata && stderrOutput) {
        hasParsedMetadata = true;
        const meta = parseFfmpegStderrMetadata(stderrOutput);
        storeStreamMetadata(targetUrl, meta);
      }

      const webStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(firstChunk));

          proc.stdout.on("data", (chunk: Buffer) => {
            try {
              controller.enqueue(new Uint8Array(chunk));
            } catch {
              cleanup();
            }
          });

          proc.stdout.on("end", () => {
            try {
              controller.close();
            } catch {
              // Stream already closed
            }
            cleanup();
          });

          proc.stdout.on("error", (err) => {
            try {
              controller.error(err);
            } catch {
              // Ignore
            }
            cleanup();
          });
        },
        cancel() {
          cleanup();
        },
      });

      resolve(webStream);
    };

    proc.stdout.on("data", onFirstData);
  });
}

async function waitForStreamMetadata(
  targetUrl: string,
  timeoutMs: number
): Promise<StreamProbeMetadata> {
  const cached = streamMetadataCache.get(targetUrl);
  if (cached && (cached.durationSeconds > 0 || cached.audioTracks.length > 0)) {
    return cached;
  }

  return new Promise((resolve) => {
    let settled = false;
    const onResolved = (meta: StreamProbeMetadata) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(meta);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const list = pendingMetadataWaiters.get(targetUrl);
      if (list) {
        const next = list.filter((fn) => fn !== onResolved);
        if (next.length > 0) {
          pendingMetadataWaiters.set(targetUrl, next);
        } else {
          pendingMetadataWaiters.delete(targetUrl);
        }
      }
      resolve(
        streamMetadataCache.get(targetUrl) ?? {
          durationSeconds: 0,
          audioTracks: [],
        }
      );
    }, timeoutMs);

    const existingList = pendingMetadataWaiters.get(targetUrl) ?? [];
    existingList.push(onResolved);
    pendingMetadataWaiters.set(targetUrl, existingList);
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const targetUrlParam = searchParams.get("url")?.trim();
  const isMetaRequest = searchParams.get("meta") === "1";
  const transcodeParam = searchParams.get("transcode")?.trim();
  const startParam = Number(searchParams.get("start") ?? "0");
  const audioTrackParam = Number(searchParams.get("audioTrack") ?? "0");

  const startSeconds =
    Number.isFinite(startParam) && startParam > 0 ? Math.floor(startParam) : 0;
  const audioTrackIndex =
    Number.isFinite(audioTrackParam) && audioTrackParam >= 0
      ? Math.floor(audioTrackParam)
      : 0;

  if (!targetUrlParam) {
    return NextResponse.json(
      { error: "Missing required query parameter: url" },
      { status: 400 }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrlParam);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Invalid protocol in stream url" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Malformed stream url" },
      { status: 400 }
    );
  }

  const normalizedUrl = parsedUrl.toString();

  // Metadata endpoint (/api/stream?meta=1&url=...) returns duration & audio tracks parsed by FFmpeg
  if (isMetaRequest) {
    const meta = await waitForStreamMetadata(normalizedUrl, 4500);
    return NextResponse.json(meta, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const lowerPath = parsedUrl.pathname.toLowerCase();
  const isAviOrLegacy =
    lowerPath.endsWith(".avi") ||
    lowerPath.endsWith(".divx") ||
    lowerPath.endsWith(".wmv") ||
    lowerPath.endsWith(".flv") ||
    lowerPath.endsWith(".mpg") ||
    lowerPath.endsWith(".mpeg");
  const isMkv = lowerPath.endsWith(".mkv");

  let effectiveTranscode: "none" | "audio" | "full" = "none";
  if (
    transcodeParam === "full" ||
    transcodeParam === "audio" ||
    transcodeParam === "none"
  ) {
    effectiveTranscode = transcodeParam;
  } else if (isAviOrLegacy) {
    effectiveTranscode = "full";
  } else if (isMkv) {
    effectiveTranscode = "audio";
  }

  if (effectiveTranscode === "audio" || effectiveTranscode === "full") {
    // Terminate any previous FFmpeg process immediately to avoid concurrent connection limits on Xtream
    killAllActiveFfmpegProcesses();

    try {
      let webStream: ReadableStream<Uint8Array>;
      try {
        webStream = await createFfmpegReadableStream(
          normalizedUrl,
          effectiveTranscode,
          startSeconds,
          audioTrackIndex,
          request.signal
        );
      } catch (firstErr) {
        if (effectiveTranscode === "audio" && !request.signal.aborted) {
          killAllActiveFfmpegProcesses();
          webStream = await createFfmpegReadableStream(
            normalizedUrl,
            "full",
            startSeconds,
            audioTrackIndex,
            request.signal
          );
        } else {
          throw firstErr;
        }
      }

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": "inline",
          "Cache-Control": "no-store",
          "Accept-Ranges": "none",
        },
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "FFmpeg failed to process media stream";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  // Standard HTTP proxy for native .mp4 and Live .m3u8 streams
  const requestHeaders = new Headers({
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: "*/*",
  });

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    requestHeaders.set("Range", rangeHeader);
  }

  try {
    const upstreamResponse = await fetch(normalizedUrl, {
      method: "GET",
      headers: requestHeaders,
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
      return NextResponse.json(
        {
          error: `Upstream stream server responded with status ${upstreamResponse.status}`,
        },
        { status: upstreamResponse.status }
      );
    }

    const finalUrl = upstreamResponse.url || normalizedUrl;
    const upstreamContentType =
      upstreamResponse.headers.get("content-type")?.toLowerCase() ?? "";

    const isM3u8 =
      lowerPath.endsWith(".m3u8") ||
      finalUrl.includes(".m3u8") ||
      upstreamContentType.includes("mpegurl") ||
      upstreamContentType.includes("x-mpegurl");

    if (isM3u8) {
      const manifestText = await upstreamResponse.text();
      const rewritten = rewriteM3u8Manifest(manifestText, finalUrl);
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
        },
      });
    }

    const responseHeaders = new Headers();
    if (upstreamContentType && !upstreamContentType.includes("octet-stream")) {
      responseHeaders.set("Content-Type", upstreamContentType);
    } else {
      responseHeaders.set("Content-Type", "video/mp4");
    }

    responseHeaders.set("Content-Disposition", "inline");

    const contentLength = upstreamResponse.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    const contentRange = upstreamResponse.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    const acceptRanges = upstreamResponse.headers.get("accept-ranges");
    responseHeaders.set("Accept-Ranges", acceptRanges || "bytes");

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to proxy media stream";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
