import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { getSocket } from "../../services/socket";
import { useAuth } from "../auth/AuthContext";
import {
  extractYouTubeVideoId,
  formatTime,
  loadYouTubeApi,
  MUSIC_PRESETS,
  type YTPlayer,
} from "./youtubeApi";
import "./music.css";

interface RemoteMusicState {
  videoId: string;
  title: string;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
  updatedBy?: string;
}

interface MusicStateEvent {
  roomId: number;
  state: RemoteMusicState;
}

const DEFAULT_PRESET = MUSIC_PRESETS[0];

export default function MusicPanel({ roomId }: { roomId: number }) {
  const { user } = useAuth();
  const userName = user?.name || "Thành viên";

  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pendingStateRef = useRef<RemoteMusicState | null>(null);
  const suppressUntilRef = useRef(0);

  const [videoId, setVideoId] = useState(DEFAULT_PRESET.videoId);
  const [title, setTitle] = useState(DEFAULT_PRESET.title);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(60);
  const [updatedBy, setUpdatedBy] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [inputError, setInputError] = useState("");

  const stateRef = useRef({ videoId, title, isPlaying });
  useEffect(() => {
    stateRef.current = { videoId, title, isPlaying };
  }, [videoId, title, isPlaying]);

  const suppressRemoteEcho = useCallback((ms = 700) => {
    suppressUntilRef.current = Date.now() + ms;
  }, []);

  const emitMusicSync = useCallback(
    (next: {
      videoId: string;
      title: string;
      isPlaying: boolean;
      currentTime: number;
    }) => {
      const socket = getSocket();
      if (!socket.connected) return;
      socket.emit("music:sync", {
        roomId,
        videoId: next.videoId,
        title: next.title,
        isPlaying: next.isPlaying,
        currentTime: next.currentTime,
        updatedBy: userName,
      });
      setUpdatedBy(userName);
    },
    [roomId, userName],
  );

  const applyRemoteState = useCallback(
    (remote: RemoteMusicState) => {
      setVideoId(remote.videoId);
      setTitle(remote.title);
      setIsPlaying(remote.isPlaying);
      setCurrentTime(remote.currentTime);
      if (remote.updatedBy) setUpdatedBy(remote.updatedBy);

      const player = playerRef.current;
      if (!player) {
        pendingStateRef.current = remote;
        return;
      }

      suppressRemoteEcho(900);
      const currentVideo = player.getVideoData()?.video_id;

      if (currentVideo !== remote.videoId) {
        if (remote.isPlaying) {
          player.loadVideoById({
            videoId: remote.videoId,
            startSeconds: Math.floor(remote.currentTime),
          });
        } else {
          player.cueVideoById({
            videoId: remote.videoId,
            startSeconds: Math.floor(remote.currentTime),
          });
        }
        return;
      }

      const localTime = player.getCurrentTime() || 0;
      if (Math.abs(localTime - remote.currentTime) > 1.5) {
        player.seekTo(remote.currentTime, true);
      }

      if (remote.isPlaying) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    },
    [suppressRemoteEcho],
  );

  // Khoi tao YouTube IFrame Player
  useEffect(() => {
    let cancelled = false;
    let createdPlayer: YTPlayer | null = null;

    void loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;

        const hostEl = document.createElement("div");
        mountRef.current.innerHTML = "";
        mountRef.current.appendChild(hostEl);

        createdPlayer = new YT.Player(hostEl, {
          videoId: DEFAULT_PRESET.videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              playerRef.current = e.target;
              e.target.setVolume(60);
              setDuration(e.target.getDuration() || 0);
              setIsReady(true);

              if (pendingStateRef.current) {
                const pending = pendingStateRef.current;
                pendingStateRef.current = null;
                applyRemoteState(pending);
              }
            },
            onStateChange: (e) => {
              if (cancelled) return;
              const dur = e.target.getDuration() || 0;
              setDuration(dur);

              const ytTitle = e.target.getVideoData()?.title;
              if (ytTitle) setTitle(ytTitle);

              if (Date.now() < suppressUntilRef.current) return;

              const curTime = e.target.getCurrentTime() || 0;
              const activeId =
                e.target.getVideoData()?.video_id || stateRef.current.videoId;
              const activeTitle = ytTitle || stateRef.current.title;

              if (e.data === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setCurrentTime(curTime);
                emitMusicSync({
                  videoId: activeId,
                  title: activeTitle,
                  isPlaying: true,
                  currentTime: curTime,
                });
              } else if (e.data === YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                setCurrentTime(curTime);
                emitMusicSync({
                  videoId: activeId,
                  title: activeTitle,
                  isPlaying: false,
                  currentTime: curTime,
                });
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setInputError("Không tải được trình phát YouTube.");
      });

    return () => {
      cancelled = true;
      playerRef.current = null;
      createdPlayer?.destroy();
    };
  }, [applyRemoteState, emitMusicSync]);

  // Lang nghe dong bo qua Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("room:join", { roomId });
      socket.emit("music:get-state", { roomId });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleMusicState = (payload: MusicStateEvent) => {
      if (payload.roomId !== roomId || !payload.state) return;
      applyRemoteState(payload.state);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("music:state", handleMusicState);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("music:state", handleMusicState);
    };
  }, [roomId, applyRemoteState]);

  // Cap nhat thanh thoi gian moi giay khi dang phat
  useEffect(() => {
    if (!isPlaying || !isReady) return;
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setCurrentTime(player.getCurrentTime() || 0);
      const dur = player.getDuration() || 0;
      if (dur > 0) setDuration(dur);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPlaying, isReady]);

  function handleTogglePlay() {
    const player = playerRef.current;
    if (!player || !isReady) return;

    suppressRemoteEcho(700);
    const nextPlaying = !isPlaying;
    const curTime = player.getCurrentTime() || 0;

    if (nextPlaying) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }

    setIsPlaying(nextPlaying);
    setCurrentTime(curTime);
    emitMusicSync({
      videoId,
      title,
      isPlaying: nextPlaying,
      currentTime: curTime,
    });
  }

  function handleSeek(nextSec: number) {
    const player = playerRef.current;
    if (!player || !isReady) return;

    suppressRemoteEcho(700);
    player.seekTo(nextSec, true);
    setCurrentTime(nextSec);
    emitMusicSync({
      videoId,
      title,
      isPlaying,
      currentTime: nextSec,
    });
  }

  function handleVolumeChange(nextVol: number) {
    setVolume(nextVol);
    playerRef.current?.setVolume(nextVol);
  }

  function switchTrack(nextVideoId: string, nextTitle: string) {
    const player = playerRef.current;
    setVideoId(nextVideoId);
    setTitle(nextTitle);
    setCurrentTime(0);
    setIsPlaying(true);

    if (player && isReady) {
      suppressRemoteEcho(900);
      player.loadVideoById({ videoId: nextVideoId, startSeconds: 0 });
    }

    emitMusicSync({
      videoId: nextVideoId,
      title: nextTitle,
      isPlaying: true,
      currentTime: 0,
    });
  }

  function handleSubmitUrl(e: FormEvent) {
    e.preventDefault();
    const extracted = extractYouTubeVideoId(urlInput);
    if (!extracted) {
      setInputError("Link hoặc mã video YouTube không hợp lệ.");
      return;
    }

    setInputError("");
    setUrlInput("");
    switchTrack(extracted, `YouTube · ${extracted}`);
  }

  return (
    <div className="music-panel">
      <div className="music-player-box">
        <div ref={mountRef} />
      </div>

      <div className="music-meta">
        <div className="music-title" title={title}>
          {title}
        </div>
        <div className="music-sub">
          <span className="music-badge">
            <span className={`music-dot ${isConnected ? "online" : ""}`} />
            {isConnected ? "Đang đồng bộ phòng" : "Đang kết nối…"}
          </span>
          {updatedBy && <span>Bởi {updatedBy}</span>}
        </div>
      </div>

      <div className="music-controls">
        {duration > 0 && (
          <div className="music-seek-row">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={Math.floor(duration)}
              value={Math.min(Math.floor(currentTime), Math.floor(duration))}
              onChange={(e) => handleSeek(Number(e.target.value))}
              aria-label="Tua thời gian"
            />
            <span>{formatTime(duration)}</span>
          </div>
        )}

        <div className="music-btn-row">
          <button
            type="button"
            className="primary"
            disabled={!isReady}
            onClick={handleTogglePlay}
          >
            {isPlaying ? "⏸ Tạm dừng" : "▶ Phát nhạc"}
          </button>

          <label className="music-volume">
            🔊
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label="Âm lượng cá nhân"
            />
          </label>
        </div>
      </div>

      <form className="music-form" onSubmit={handleSubmitUrl}>
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Dán link YouTube để phát chung…"
        />
        <button type="submit" disabled={!urlInput.trim()}>
          Phát
        </button>
      </form>
      {inputError && <p className="music-error">{inputError}</p>}

      <div className="music-presets">
        <h4>Gợi ý nhạc học tập</h4>
        <div className="music-preset-list">
          {MUSIC_PRESETS.map((item) => (
            <button
              key={item.videoId}
              type="button"
              className={`music-preset-btn ${videoId === item.videoId ? "active" : ""}`}
              onClick={() => switchTrack(item.videoId, item.title)}
            >
              <span className="music-preset-name">{item.title}</span>
              <span className="music-preset-tag">{item.tag}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
