export interface MusicPreset {
  videoId: string;
  title: string;
  tag: string;
}

export const MUSIC_PRESETS: MusicPreset[] = [
  {
    videoId: "lTRiuFIWV54",
    title: "1 A.M Study Session · Lofi Beats",
    tag: "1 giờ · Tua được",
  },
  {
    videoId: "jfKfPfyJRdk",
    title: "Lofi Hip Hop Radio · Relax/Study",
    tag: "Live 24/7",
  },
  {
    videoId: "4xDzrJKXOOY",
    title: "Synthwave Radio · Chill/Code",
    tag: "Live 24/7",
  },
];

export interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  loadVideoById: (options: { videoId: string; startSeconds?: number }) => void;
  cueVideoById: (options: { videoId: string; startSeconds?: number }) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getVideoData: () => { title?: string; video_id?: string };
  destroy: () => void;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (event: { target: YTPlayer }) => void;
        onStateChange?: (event: { data: number; target: YTPlayer }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      if (window.YT) {
        resolve(window.YT);
      } else {
        reject(new Error("YouTube IFrame API không khả dụng"));
      }
    };

    if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      )
    ) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () =>
        reject(new Error("Không tải được YouTube IFrame API"));
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

export function extractYouTubeVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host.endsWith("youtube.com")) {
      const vParam = url.searchParams.get("v");
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;

      const parts = url.pathname.split("/").filter(Boolean);
      const markerIdx = parts.findIndex((p) =>
        ["embed", "shorts", "live"].includes(p),
      );
      if (markerIdx !== -1) {
        const id = parts[markerIdx + 1];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hrs > 0
    ? `${hrs}:${pad(mins)}:${pad(secs)}`
    : `${pad(mins)}:${pad(secs)}`;
}
